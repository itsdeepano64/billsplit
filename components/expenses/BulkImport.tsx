"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, Upload, FileText, Trash2, RefreshCw, CheckCircle2, AlertCircle, Users, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";
import type { ExpenseTab, Payer } from "@/lib/types";
import { getCurrentUser, visibleTabs, uploadReceipt, insertExpenses } from "@/lib/expenses";

interface Row {
  key: string;
  fileName: string;
  previewUrl: string | null; // local object URL for images
  isPdf: boolean;
  status: "uploading" | "ready" | "error";
  error?: string;
  receipt_url?: string;
  receipt_path?: string;
  expense_date: string;
  vendor: string;
  description: string;
  amount: string;
}

const inputCls = "w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50";
const labelCls = "text-[10px] font-medium text-muted-foreground uppercase tracking-wide";

export default function BulkImport() {
  const supabase = createClient();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [tabs, setTabs] = useState<ExpenseTab[]>([]);
  const [tabId, setTabId] = useState<string>("");
  const [paidBy, setPaidBy] = useState<Payer>("Deepen");
  const [category, setCategory] = useState("Tools");
  const [shared, setShared] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const user = getCurrentUser();
    (async () => {
      const { data } = await supabase.from("expense_tabs").select("*").order("position").order("created_at");
      const list = visibleTabs((data ?? []) as ExpenseTab[], user);
      setTabs(list);
      const tools = list.find(t => /tool/i.test(t.name));
      setTabId(tools?.id ?? "");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => rows.forEach(r => r.previewUrl && URL.revokeObjectURL(r.previewUrl)), []); // eslint-disable-line react-hooks/exhaustive-deps

  function patch(key: string, p: Partial<Row>) {
    setRows(list => list.map(r => (r.key === key ? { ...r, ...p } : r)));
  }

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    const added: { row: Row; file: File }[] = Array.from(files).map(file => {
      const pdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
      const guess = file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
      return {
        file,
        row: {
          key: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          fileName: file.name,
          previewUrl: pdf ? null : URL.createObjectURL(file),
          isPdf: pdf,
          status: "uploading",
          expense_date: format(file.lastModified ? new Date(file.lastModified) : new Date(), "yyyy-MM-dd"),
          vendor: "",
          description: /^(img|image|scan|photo|receipt|ereceipt|pxl|dsc)\s*\d*/i.test(guess) ? "" : guess,
          amount: "",
        },
      };
    });
    setRows(list => [...list, ...added.map(a => a.row)]);
    await Promise.all(added.map(async ({ row, file }) => {
      try {
        const { url, path } = await uploadReceipt(supabase, file);
        patch(row.key, { status: "ready", receipt_url: url, receipt_path: path });
      } catch (e: unknown) {
        patch(row.key, { status: "error", error: e instanceof Error ? e.message : "Upload failed" });
      }
    }));
    if (fileRef.current) fileRef.current.value = "";
  }

  const ready = rows.filter(r => r.status === "ready");
  const valid = ready.filter(r => parseFloat(r.amount) > 0 && (r.description.trim() || r.vendor.trim()));
  const total = useMemo(() => valid.reduce((s, r) => s + parseFloat(r.amount), 0), [valid]);
  const uploading = rows.some(r => r.status === "uploading");

  async function saveAll() {
    setError(null);
    if (!valid.length) { setError("Add an amount and a description or store to at least one receipt."); return; }
    if (valid.length < ready.length && !confirm(`${ready.length - valid.length} receipt(s) are missing an amount or description and will be skipped. Continue?`)) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");
      const payload = valid.map(r => ({
        user_id: user.id,
        paid_by: paidBy,
        amount: Math.round(parseFloat(r.amount) * 100) / 100,
        description: r.description.trim() || r.vendor.trim(),
        vendor: r.vendor.trim() || null,
        category,
        expense_date: r.expense_date,
        notes: null,
        tab_id: tabId || null,
        receipt_url: r.receipt_url ?? null,
        receipt_path: r.receipt_path ?? null,
        shared,
        source: "bulk_upload",
      }));
      const { error: e } = await insertExpenses(supabase, payload);
      if (e) throw e;
      router.push("/expenses");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : (e as { message?: string })?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="pb-8 max-w-lg mx-auto">
      <div className="sticky top-0 z-20 bg-background pt-6 pb-3 px-4 flex items-center gap-2">
        <Link href="/expenses" aria-label="Back" className="w-9 h-9 flex items-center justify-center rounded-full bg-muted">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Import Receipts</h1>
      </div>

      <div className="px-4 space-y-4">
        {/* Defaults applied to every receipt */}
        <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Applies to all receipts</p>
          <div className="space-y-1">
            <label className={labelCls}>Tab</label>
            <select value={tabId} onChange={e => setTabId(e.target.value)} className={inputCls}>
              <option value="">No tab (All)</option>
              {tabs.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className={labelCls}>Paid by</label>
              <div className="grid grid-cols-2 gap-1.5">
                {(["Deepen", "DeShea"] as const).map(p => (
                  <button key={p} type="button" onClick={() => setPaidBy(p)}
                    className={`py-2 rounded-xl text-xs font-bold border-2 ${paidBy === p
                      ? p === "DeShea" ? "bg-indigo-500/20 border-indigo-500 text-indigo-300" : "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                      : "bg-muted border-border text-muted-foreground"}`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Category</label>
              <input value={category} onChange={e => setCategory(e.target.value)} className={inputCls} />
            </div>
          </div>
          <button type="button" onClick={() => setShared(s => !s)}
            className="w-full flex items-center justify-between bg-muted border border-border rounded-xl px-3 py-2.5 text-sm">
            <span className="flex items-center gap-2">
              {shared ? <Users className="w-4 h-4 text-indigo-400" /> : <Lock className="w-4 h-4 text-muted-foreground" />}
              Share with DeShea
            </span>
            <span className={`relative inline-flex h-5 w-9 rounded-full ${shared ? "bg-primary" : "bg-muted-foreground/30"}`}>
              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${shared ? "left-[18px]" : "left-0.5"}`} />
            </span>
          </button>
        </div>

        {/* Picker */}
        <input ref={fileRef} type="file" multiple accept="image/*,application/pdf" className="hidden"
          onChange={e => addFiles(e.target.files)} />
        <button type="button" onClick={() => fileRef.current?.click()}
          className="w-full border-2 border-dashed border-border rounded-2xl py-8 flex flex-col items-center gap-2 text-muted-foreground active:scale-[0.99]">
          <Upload className="w-6 h-6" />
          <span className="font-semibold text-foreground">Choose receipts</span>
          <span className="text-xs">Photos or PDFs · pick as many as you want</span>
        </button>

        {rows.map(r => (
          <div key={r.key} className="bg-card rounded-2xl border border-border p-3 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-muted overflow-hidden flex items-center justify-center flex-shrink-0">
                {r.previewUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={r.previewUrl} alt="" className="w-full h-full object-cover" />
                  : <FileText className="w-6 h-6 text-muted-foreground" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{r.fileName}</p>
                <p className="text-[11px] flex items-center gap-1">
                  {r.status === "uploading" && <><RefreshCw className="w-3 h-3 animate-spin" /> Uploading…</>}
                  {r.status === "ready" && <><CheckCircle2 className="w-3 h-3 text-emerald-400" /> Uploaded</>}
                  {r.status === "error" && <><AlertCircle className="w-3 h-3 text-destructive" /> {r.error}</>}
                </p>
              </div>
              <button type="button" aria-label="Remove"
                onClick={() => setRows(list => list.filter(x => x.key !== r.key))}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className={labelCls}>Amount</label>
                <input type="number" inputMode="decimal" step="0.01" min="0" placeholder="0.00" value={r.amount}
                  onChange={e => patch(r.key, { amount: e.target.value })} className={inputCls} />
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Date</label>
                <input type="date" value={r.expense_date} onChange={e => patch(r.key, { expense_date: e.target.value })} className={inputCls} />
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Store</label>
                <input placeholder="Home Depot" value={r.vendor} onChange={e => patch(r.key, { vendor: e.target.value })} className={inputCls} />
              </div>
              <div className="space-y-1">
                <label className={labelCls}>What</label>
                <input placeholder="Tube cutter" value={r.description} onChange={e => patch(r.key, { description: e.target.value })} className={inputCls} />
              </div>
            </div>
          </div>
        ))}

        {error && <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-4 py-2">{error}</p>}

        {rows.length > 0 && (
          <button type="button" onClick={saveAll} disabled={saving || uploading || !valid.length}
            className="w-full bg-primary text-primary-foreground rounded-xl py-4 font-bold text-base disabled:opacity-50 active:scale-[0.98]">
            {saving ? "Saving…" : uploading ? "Uploading…" : `Save ${valid.length} expense${valid.length === 1 ? "" : "s"} · ${formatCurrency(total)}`}
          </button>
        )}
      </div>
    </div>
  );
}
