// receipt-import: attach a receipt FILE to an expense by design.
// Takes a receipt file + expense data, uploads to the public `receipts` bucket with the service role
// (injected by Supabase at runtime, never exposed to the client), and inserts/updates the expense
// (keyed by source_ref) with receipt_url + receipt_path set. Deployed with verify_jwt=false; the function
// authenticates callers itself with a shared secret (header `x-import-secret`), checked against a SHA-256
// hash stored in public.import_secrets (RLS on, no policies → service role only).
//
// POST multipart/form-data:  file=<pdf|png|jpg>  expense=<JSON string>
// or  POST application/json: { file_base64, file_name, content_type, expense: {...} }
// expense: { source_ref (required), expense_date (YYYY-MM-DD), amount, vendor, description, category?,
//            tab_id | tab_name, paid_by?, shared?, notes?, source?, items?, thumbnail_url?, order_number?,
//            store?, subtotal?, tax? }
import { createClient } from "jsr:@supabase/supabase-js@2";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

async function sha256Hex(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

const EXT: Record<string, string> = {
  "application/pdf": "pdf", "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/heic": "heic",
};
const BASE_COLS = ["expense_date", "amount", "vendor", "description", "category", "paid_by", "shared", "notes",
  "items", "thumbnail_url", "order_number", "store", "subtotal", "tax"];

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(url, key, { auth: { persistSession: false } });

  // ── auth (shared secret) ──
  const provided = req.headers.get("x-import-secret") ?? "";
  if (!provided) return json({ error: "Missing x-import-secret" }, 401);
  const { data: row } = await sb.from("import_secrets").select("secret_sha256").eq("name", "receipt-import").maybeSingle();
  if (!row || !timingSafeEqual(await sha256Hex(provided), row.secret_sha256)) return json({ error: "Unauthorized" }, 401);

  // ── parse ──
  let file: Uint8Array | null = null;
  let fileName = "receipt";
  let contentType = "application/pdf";
  let exp: Record<string, any>;
  try {
    const ct = req.headers.get("content-type") ?? "";
    if (ct.includes("multipart/form-data")) {
      const form = await req.formData();
      const f = form.get("file");
      if (f instanceof File) { file = new Uint8Array(await f.arrayBuffer()); fileName = f.name; contentType = f.type || contentType; }
      exp = JSON.parse(String(form.get("expense") ?? "{}"));
    } else {
      const body = await req.json();
      if (body.file_base64) {
        file = Uint8Array.from(atob(body.file_base64), c => c.charCodeAt(0));
        fileName = body.file_name ?? fileName; contentType = body.content_type ?? contentType;
      }
      exp = body.expense ?? {};
    }
  } catch (e) {
    return json({ error: "Bad request: " + (e as Error).message }, 400);
  }

  // The whole point: no file, no import.
  if (!file || file.length === 0) return json({ error: "A receipt file is required" }, 400);
  if (!exp.source_ref) return json({ error: "expense.source_ref is required (e.g. the Gmail message id)" }, 400);
  const ext = EXT[contentType] ?? (fileName.split(".").pop() ?? "pdf").toLowerCase();
  if (!["pdf", "png", "jpg", "jpeg", "webp", "heic"].includes(ext)) return json({ error: "Unsupported file type" }, 400);

  // ── find existing row / owner ──
  const { data: existing } = await sb.from("expenses").select("id,user_id,tab_id,receipt_path").eq("source_ref", exp.source_ref).maybeSingle();

  let tabId: string | null = exp.tab_id ?? existing?.tab_id ?? null;
  let ownerId: string | null = existing?.user_id ?? null;
  if (!tabId && exp.tab_name) {
    const { data: tab } = await sb.from("expense_tabs").select("id,user_id").ilike("name", exp.tab_name).limit(1).maybeSingle();
    if (tab) { tabId = tab.id; ownerId = ownerId ?? tab.user_id; }
  } else if (tabId && !ownerId) {
    const { data: tab } = await sb.from("expense_tabs").select("user_id").eq("id", tabId).maybeSingle();
    ownerId = tab?.user_id ?? null;
  }
  if (!existing) {
    if (!ownerId) return json({ error: "Could not resolve owner: pass a valid tab_id or tab_name" }, 400);
    for (const f of ["expense_date", "amount"]) if (exp[f] == null) return json({ error: `expense.${f} is required for a new expense` }, 400);
    if (!exp.description && !exp.vendor) return json({ error: "expense.description or vendor is required" }, 400);
  }

  // ── upload (same path convention as the app: receipts/<ts>-<rand>.<ext>) ──
  const path = `receipts/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  const up = await sb.storage.from("receipts").upload(path, file, {
    contentType: ext === "pdf" ? "application/pdf" : contentType, upsert: false,
  });
  if (up.error) return json({ error: "Upload failed: " + up.error.message }, 500);
  const receipt_url = sb.storage.from("receipts").getPublicUrl(path).data.publicUrl;

  // ── write expense ──
  const patch: Record<string, unknown> = { receipt_url, receipt_path: path };
  for (const c of BASE_COLS) if (exp[c] !== undefined) patch[c] = exp[c];
  if (tabId) patch.tab_id = tabId;

  let id = existing?.id as string | undefined;
  if (existing) {
    const { error } = await sb.from("expenses").update(patch).eq("id", existing.id);
    if (error) { await sb.storage.from("receipts").remove([path]); return json({ error: error.message }, 500); }
    if (existing.receipt_path && existing.receipt_path !== path) await sb.storage.from("receipts").remove([existing.receipt_path]);
  } else {
    const insert = {
      category: "Tools", paid_by: "Deepen", shared: false, ...patch,
      description: exp.description ?? exp.vendor, user_id: ownerId, source: exp.source ?? "email", source_ref: exp.source_ref,
    };
    const { data, error } = await sb.from("expenses").insert(insert).select("id").single();
    if (error) { await sb.storage.from("receipts").remove([path]); return json({ error: error.message }, 500); }
    id = data.id;
  }
  return json({ ok: true, expense_id: id, created: !existing, receipt_url, receipt_path: path });
});
