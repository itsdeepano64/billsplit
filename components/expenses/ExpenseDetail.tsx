"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { X, Eye, Pencil, ExternalLink, Package, Users, Lock } from "lucide-react";
import type { Expense, ExpenseTab } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { itemsOf, vendorOf, isPdf, thumbOf } from "@/lib/expenses";

/** Product photo with a graceful fallback when the image is missing or fails to load. */
export function ItemImage({ src, alt, className }: { src?: string | null; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [src]);
  if (!src || failed) {
    return (
      <div className={`flex items-center justify-center bg-muted text-muted-foreground ${className ?? ""}`}>
        <Package className="w-1/3 h-1/3 max-w-8 max-h-8" />
      </div>
    );
  }
  return (
    // Plain <img> so external store images load without next/image remote patterns.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} loading="lazy" referrerPolicy="no-referrer"
      className={`object-contain bg-white ${className ?? ""}`} onError={() => setFailed(true)} />
  );
}

export default function ExpenseDetail({ expense: e, tabs, onClose, onEdit, onPreviewReceipt }: {
  expense: Expense;
  tabs: ExpenseTab[];
  onClose: () => void;
  onEdit: () => void;
  onPreviewReceipt: () => void;
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (ev: KeyboardEvent) => { if (ev.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [onClose]);

  const items = itemsOf(e);
  const included = items.filter(i => !i.excluded);
  const excluded = items.filter(i => i.excluded);
  const itemCount = included.reduce((n, i) => n + (Number(i.qty) || 1), 0);
  const tabName = tabs.find(t => t.id === e.tab_id)?.name;
  const hero = thumbOf(e);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="Expense details">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-lg bg-card rounded-t-3xl sm:rounded-3xl border border-border flex flex-col animate-fade-in"
        style={{ maxHeight: "min(92dvh, 92vh)" }}
      >
        <div className="flex items-start gap-3 px-5 pt-5 pb-3 flex-shrink-0">
          <div className="w-10 h-1 bg-white/20 rounded-full absolute top-3 left-1/2 -translate-x-1/2 sm:hidden" />
          <div className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0 border border-border">
            <ItemImage src={hero} alt={vendorOf(e)} className="w-full h-full" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{vendorOf(e)}</p>
            <h2 className="text-lg font-bold leading-tight">{formatCurrency(e.amount)}</h2>
            <p className="text-xs text-muted-foreground">
              {format(new Date(e.expense_date + "T12:00:00"), "EEE, MMM d, yyyy")}
              {items.length > 0 && ` · ${itemCount} item${itemCount === 1 ? "" : "s"}`}
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 flex items-center justify-center rounded-full bg-muted flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 space-y-4" style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))", overscrollBehavior: "contain" }}>
          {/* Order facts */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {e.store && <Fact label="Store" value={e.store} wide />}
            {e.order_number && <Fact label="Order / Txn" value={e.order_number} wide />}
            <Fact label="Paid by" value={e.paid_by} />
            <Fact label="Category" value={e.category} />
            {tabName && <Fact label="Tab" value={tabName} />}
            {e.paid_by === "Deepen" && (
              <div className="bg-muted rounded-xl px-3 py-2 flex items-center gap-1.5">
                {e.shared ? <Users className="w-3.5 h-3.5 text-indigo-400" /> : <Lock className="w-3.5 h-3.5 text-muted-foreground" />}
                <span>{e.shared ? "Shared with DeShea" : "Private"}</span>
              </div>
            )}
          </div>

          {/* Items */}
          {items.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Items</p>
              <div className="grid grid-cols-2 gap-2">
                {included.map((it, idx) => <ItemCard key={`i${idx}`} item={it} />)}
              </div>
              {excluded.length > 0 && (
                <>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-2">Not counted</p>
                  <div className="grid grid-cols-2 gap-2 opacity-50">
                    {excluded.map((it, idx) => <ItemCard key={`x${idx}`} item={it} />)}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="bg-muted rounded-xl px-4 py-3 text-sm">
              <p className="font-semibold">{e.description}</p>
              <p className="text-xs text-muted-foreground mt-0.5">No item breakdown. Tap Edit to add items.</p>
            </div>
          )}

          {/* Totals */}
          <div className="bg-muted rounded-xl px-4 py-3 text-sm space-y-1">
            {e.subtotal != null && <Row label="Subtotal" value={formatCurrency(Number(e.subtotal))} />}
            {e.tax != null && <Row label="Tax" value={formatCurrency(Number(e.tax))} />}
            <Row label="Total" value={formatCurrency(e.amount)} bold />
            {excluded.length > 0 && (
              <p className="text-[11px] text-muted-foreground pt-1">
                Excludes {excluded.map(i => i.name).join(", ")} ({formatCurrency(excluded.reduce((s, i) => s + Number(i.line_total), 0))} before tax).
              </p>
            )}
          </div>

          {e.notes && <p className="text-xs text-muted-foreground whitespace-pre-wrap">{e.notes}</p>}

          <div className="grid grid-cols-2 gap-2">
            {e.receipt_url ? (
              <button onClick={onPreviewReceipt}
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">
                <Eye className="w-4 h-4" /> View receipt{isPdf(e.receipt_url) ? " (PDF)" : ""}
              </button>
            ) : (
              <div className="flex items-center justify-center py-3 rounded-xl bg-muted text-xs text-muted-foreground">No receipt file</div>
            )}
            <button onClick={onEdit}
              className="flex items-center justify-center gap-2 py-3 rounded-xl bg-muted border border-border text-sm font-semibold">
              <Pencil className="w-4 h-4" /> Edit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Fact({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={`bg-muted rounded-xl px-3 py-2 min-w-0 ${wide ? "col-span-2" : ""}`}>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="font-medium break-words">{value}</p>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-bold pt-1 border-t border-border" : "text-muted-foreground"}`}>
      <span>{label}</span><span>{value}</span>
    </div>
  );
}

function ItemCard({ item }: { item: ReturnType<typeof itemsOf>[number] }) {
  const qty = Number(item.qty) || 1;
  const body = (
    <>
      <div className="aspect-square w-full rounded-lg overflow-hidden bg-white">
        <ItemImage src={item.image_url} alt={item.name} className="w-full h-full p-1" />
      </div>
      <p className="text-xs font-medium leading-snug mt-2 line-clamp-3">{item.name}</p>
      {(item.model || item.sku) && (
        <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
          {item.model ? `Model ${item.model}` : ""}{item.model && item.sku ? " · " : ""}{item.sku ? (item.sku.startsWith("UPC") ? item.sku : `SKU ${item.sku}`) : ""}
        </p>
      )}
      <div className="flex items-end justify-between mt-1">
        <span className="text-[11px] text-muted-foreground">{qty > 1 ? `${qty} × ${formatCurrency(Number(item.unit_price))}` : "Qty 1"}</span>
        <span className="text-sm font-bold">{formatCurrency(Number(item.line_total))}</span>
      </div>
      {item.product_url && (
        <span className="mt-1 inline-flex items-center gap-1 text-[10px] text-primary"><ExternalLink className="w-3 h-3" /> Product page</span>
      )}
    </>
  );
  return item.product_url ? (
    <a href={item.product_url} target="_blank" rel="noopener noreferrer" className="bg-muted/60 border border-border rounded-xl p-2 flex flex-col">{body}</a>
  ) : (
    <div className="bg-muted/60 border border-border rounded-xl p-2 flex flex-col">{body}</div>
  );
}
