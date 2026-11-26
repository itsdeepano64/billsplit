"use client";

import {
  format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, subYears,
} from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Expense, ExpenseItem, ExpenseTab, Payer } from "@/lib/types";

// ─── Date filter ──────────────────────────────────────────────────────────────

export type RangePreset =
  | "all" | "this_month" | "last_month" | "last_3_months" | "ytd" | "last_year" | "custom";

export const RANGE_PRESETS: { value: RangePreset; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "last_3_months", label: "Last 3 months" },
  { value: "ytd", label: "Year to date" },
  { value: "last_year", label: "Last year" },
  { value: "custom", label: "Custom range" },
];

export interface DateRange {
  preset: RangePreset;
  start: string | null; // yyyy-MM-dd inclusive
  end: string | null;   // yyyy-MM-dd inclusive
}

export const ALL_TIME: DateRange = { preset: "all", start: null, end: null };

const ymd = (d: Date) => format(d, "yyyy-MM-dd");

export function rangeForPreset(preset: RangePreset, custom?: { start?: string; end?: string }): DateRange {
  const now = new Date();
  switch (preset) {
    case "this_month": return { preset, start: ymd(startOfMonth(now)), end: ymd(endOfMonth(now)) };
    case "last_month": {
      const lm = subMonths(now, 1);
      return { preset, start: ymd(startOfMonth(lm)), end: ymd(endOfMonth(lm)) };
    }
    case "last_3_months": return { preset, start: ymd(startOfMonth(subMonths(now, 2))), end: ymd(endOfMonth(now)) };
    case "ytd": return { preset, start: ymd(startOfYear(now)), end: ymd(now) };
    case "last_year": {
      const ly = subYears(now, 1);
      return { preset, start: ymd(startOfYear(ly)), end: ymd(endOfYear(ly)) };
    }
    case "custom": return { preset, start: custom?.start || null, end: custom?.end || null };
    default: return ALL_TIME;
  }
}

export function rangeLabel(r: DateRange): string {
  if (r.preset === "custom") {
    if (r.start && r.end) return `${fmt(r.start)} – ${fmt(r.end)}`;
    if (r.start) return `Since ${fmt(r.start)}`;
    if (r.end) return `Through ${fmt(r.end)}`;
    return "All time";
  }
  return RANGE_PRESETS.find(p => p.value === r.preset)?.label ?? "All time";
}

function fmt(s: string) {
  return format(new Date(s + "T12:00:00"), "MMM d, yyyy");
}

export function inRange(e: Expense, r: DateRange) {
  if (r.start && e.expense_date < r.start) return false;
  if (r.end && e.expense_date > r.end) return false;
  return true;
}

// ─── Current user & visibility (app-level; both people share one login) ──────

export function getCurrentUser(): Payer {
  if (typeof window === "undefined") return "Deepen";
  const v = localStorage.getItem("current_user");
  return v === "DeShea" ? "DeShea" : "Deepen";
}

export function isTabShared(tab: ExpenseTab | undefined | null) {
  return !!tab && tab.owner === "shared";
}

/** Tabs a user can see. Deepen sees everything; DeShea sees shared tabs and her own. */
export function visibleTabs(tabs: ExpenseTab[], user: Payer) {
  if (user === "Deepen") return tabs;
  return tabs.filter(t => t.owner === "shared" || t.owner === "DeShea");
}

/** Deepen sees everything. DeShea sees her own, anything marked shared, and anything in a shared/DeShea tab. */
export function canSee(e: Expense, tabsById: Map<string, ExpenseTab>, user: Payer) {
  if (user === "Deepen") return true;
  if (e.paid_by === "DeShea") return true;
  if (e.shared) return true;
  const tab = e.tab_id ? tabsById.get(e.tab_id) : undefined;
  return !!tab && (tab.owner === "shared" || tab.owner === "DeShea");
}

// ─── Writes that survive a missing migration ─────────────────────────────────

const NEW_COLUMNS = [
  "shared", "vendor", "source", "source_ref", "receipt_path",
  "items", "thumbnail_url", "order_number", "store", "subtotal", "tax",
] as const;

function isMissingColumn(err: { code?: string; message?: string } | null) {
  if (!err) return false;
  return err.code === "PGRST204" || err.code === "42703" || /column .* (does not exist|could not find)/i.test(err.message ?? "")
    || /Could not find the '.*' column/i.test(err.message ?? "");
}

function stripNew<T extends Record<string, unknown>>(row: T): T {
  const copy = { ...row };
  for (const c of NEW_COLUMNS) delete (copy as Record<string, unknown>)[c];
  return copy;
}


export async function insertExpenses(supabase: SupabaseClient, rows: Record<string, unknown>[]) {
  let { error } = await supabase.from("expenses").insert(rows);
  if (isMissingColumn(error)) {
    ({ error } = await supabase.from("expenses").insert(rows.map(stripNew)));
  }
  return { error };
}

export async function updateExpense(supabase: SupabaseClient, id: string, patch: Record<string, unknown>) {
  let { error } = await supabase.from("expenses").update(patch).eq("id", id);
  if (isMissingColumn(error)) {
    const stripped = stripNew(patch);
    if (Object.keys(stripped).length === 0) {
      return { error: { message: "Sharing needs the database update (migration) applied first." } };
    }
    ({ error } = await supabase.from("expenses").update(stripped).eq("id", id));
  }
  return { error };
}

// ─── Receipts ────────────────────────────────────────────────────────────────

export function isPdf(url: string | null | undefined) {
  return !!url && /\.pdf($|\?)/i.test(url);
}

export async function uploadReceipt(supabase: SupabaseClient, file: File) {
  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
  const path = `receipts/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from("receipts").upload(path, file, {
    contentType: file.type || (ext === "pdf" ? "application/pdf" : "image/jpeg"),
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("receipts").getPublicUrl(path);
  return { url: data.publicUrl, path };
}

// ─── Line items & thumbnails ─────────────────────────────────────────────────

export function itemsOf(e: Expense): ExpenseItem[] {
  return Array.isArray(e.items) ? e.items : [];
}

export function isImageUrl(url: string | null | undefined) {
  return !!url && !isPdf(url);
}

/** Row thumbnail: stored thumbnail → first item photo → receipt image (not PDF) → null (icon). */
export function thumbOf(e: Expense): string | null {
  if (e.thumbnail_url) return e.thumbnail_url;
  const first = itemsOf(e).find(i => i.image_url && !i.excluded);
  if (first?.image_url) return first.image_url;
  if (isImageUrl(e.receipt_url)) return e.receipt_url!;
  return null;
}

/** Thumbnail to store when saving items: first included item with a photo, else null (UI falls back to receipt). */
export function thumbnailForItems(items: ExpenseItem[]): string | null {
  return items.find(i => i.image_url && !i.excluded)?.image_url ?? null;
}

/** Best-effort product photo lookup via /api/product-image (product link, image link, or name/SKU). */
export async function lookupProductImage(input: { url?: string; q?: string }): Promise<string | null> {
  const params = new URLSearchParams();
  if (input.url) params.set("url", input.url);
  if (input.q) params.set("q", input.q);
  try {
    const res = await fetch(`/api/product-image?${params}`, { cache: "no-store" });
    if (!res.ok) return null;
    const j = await res.json();
    return typeof j.image === "string" ? j.image : null;
  } catch { return null; }
}

// ─── Stats helpers ───────────────────────────────────────────────────────────

export function sum(list: Expense[]) {
  return list.reduce((s, e) => s + Number(e.amount), 0);
}

export function vendorOf(e: Expense) {
  return (e.vendor && e.vendor.trim()) || e.description.split(/[-–—:(]/)[0].trim() || "Unknown";
}

export function toCsv(rows: Expense[], tabsById: Map<string, ExpenseTab>) {
  const head = ["date", "tab", "paid_by", "vendor", "description", "category", "amount", "shared", "notes", "receipt_url"];
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = rows.map(e => [
    e.expense_date, e.tab_id ? tabsById.get(e.tab_id)?.name ?? "" : "", e.paid_by, vendorOf(e),
    e.description, e.category, Number(e.amount).toFixed(2), e.shared ? "yes" : "no", e.notes ?? "", e.receipt_url ?? "",
  ].map(esc).join(","));
  return [head.join(","), ...lines].join("\n");
}
