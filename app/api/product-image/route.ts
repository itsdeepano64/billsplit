import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Best-effort product photo lookup for expense line items.
 *   ?url=<product page or image link>  → the image itself, or the page's og:image / twitter:image
 *   ?q=<name, SKU or model>            → first web search hit's og:image (may fail; big retailers often block bots)
 * Signed-in users only. Returns { image: string | null }.
 */

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36";

function safeUrl(raw: string | null): URL | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    const h = u.hostname.toLowerCase();
    // No local / private-network targets.
    if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal")) return null;
    if (/^\d+\.\d+\.\d+\.\d+$/.test(h) || h.includes(":")) return null;
    return u;
  } catch {
    return null;
  }
}

async function fetchText(url: URL, ms = 6000): Promise<{ type: string; text: string } | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { headers: { "user-agent": UA, accept: "text/html,image/*;q=0.9,*/*;q=0.8" }, signal: ctrl.signal, redirect: "follow" });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "";
    if (type.startsWith("image/")) return { type, text: "" };
    const text = (await res.text()).slice(0, 600_000);
    return { type, text };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function metaImage(html: string, base: URL): string | null {
  const patterns = [
    /<meta[^>]+(?:property|name)=["']og:image(?::secure_url)?["'][^>]*content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']og:image["']/i,
    /<meta[^>]+(?:property|name)=["']twitter:image["'][^>]*content=["']([^"']+)["']/i,
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m?.[1]) {
      try {
        const src = m[1].replace(/&amp;/g, "&");
        return new URL(src, base).toString();
      } catch {}
    }
  }
  return null;
}

async function imageFromUrl(u: URL): Promise<string | null> {
  if (/\.(png|jpe?g|webp|gif|avif)(\?|$)/i.test(u.pathname)) return u.toString();
  const page = await fetchText(u);
  if (!page) return null;
  if (page.type.startsWith("image/")) return u.toString();
  return metaImage(page.text, u);
}

async function imageFromQuery(q: string): Promise<string | null> {
  const search = new URL("https://html.duckduckgo.com/html/");
  search.searchParams.set("q", q);
  const page = await fetchText(search);
  if (!page) return null;
  const links = Array.from(page.text.matchAll(/class="result__a"[^>]*href="([^"]+)"/g))
    .map(m => m[1].replace(/&amp;/g, "&"))
    .map(h => {
      try {
        const u = new URL(h, "https://duckduckgo.com");
        const target = u.searchParams.get("uddg");
        return safeUrl(target ?? u.toString());
      } catch { return null; }
    })
    .filter((u): u is URL => !!u)
    .slice(0, 4);
  for (const link of links) {
    const img = await imageFromUrl(link);
    if (img) return img;
  }
  return null;
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ image: null, error: "Not logged in" }, { status: 401 });

  const url = safeUrl(req.nextUrl.searchParams.get("url"));
  const q = req.nextUrl.searchParams.get("q")?.trim().slice(0, 200);

  let image: string | null = null;
  if (url) image = await imageFromUrl(url);
  if (!image && q) image = await imageFromQuery(q);
  return NextResponse.json({ image });
}
