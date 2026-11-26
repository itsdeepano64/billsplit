"use client";

import { useState } from "react";
import { Plus, Trash2, Search, RefreshCw, EyeOff, Eye } from "lucide-react";
import type { ExpenseItem } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { lookupProductImage } from "@/lib/expenses";
import { ItemImage } from "@/components/expenses/ExpenseDetail";

const field = "w-full bg-background border border-border rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50";

export function blankItem(): ExpenseItem {
  return { name: "", qty: 1, unit_price: 0, line_total: 0, image_url: null, product_url: null };
}

/** Optional line items for an expense: name, qty, price, and a photo (pasted link or best-effort lookup). */
export default function ItemsEditor({ items, onChange }: { items: ExpenseItem[]; onChange: (items: ExpenseItem[]) => void }) {
  const [busy, setBusy] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  function update(i: number, patch: Partial<ExpenseItem>) {
    const next = items.map((it, idx) => {
      if (idx !== i) return it;
      const merged = { ...it, ...patch };
      const qty = Number(merged.qty) || 1;
      const unit = Number(merged.unit_price) || 0;
      return { ...merged, qty, unit_price: unit, line_total: Math.round(qty * unit * 100) / 100 };
    });
    onChange(next);
  }

  async function findPhoto(i: number) {
    const it = items[i];
    const link = (it.product_url || "").trim();
    const q = [it.name, it.model, it.sku].filter(Boolean).join(" ").trim();
    if (!link && !q) { setMsg("Add a name, SKU or product link first."); return; }
    setBusy(i); setMsg(null);
    const img = await lookupProductImage({ url: link || undefined, q: q || undefined });
    setBusy(null);
    if (img) update(i, { image_url: img });
    else setMsg("Couldn't find a photo. Paste a product page or image link instead. The receipt photo is used as the thumbnail meanwhile.");
  }

  const total = items.filter(i => !i.excluded).reduce((s, i) => s + Number(i.line_total || 0), 0);

  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className={`bg-muted border border-border rounded-xl p-2.5 space-y-2 ${it.excluded ? "opacity-60" : ""}`}>
          <div className="flex gap-2">
            <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 border border-border">
              <ItemImage src={it.image_url} alt={it.name || "Item"} className="w-full h-full" />
            </div>
            <div className="flex-1 min-w-0 space-y-1.5">
              <input value={it.name} onChange={e => update(i, { name: e.target.value })} placeholder="Item name" className={field} />
              <div className="grid grid-cols-[3.5rem_1fr_auto] gap-1.5 items-center">
                <input type="number" min="1" step="1" value={it.qty} onChange={e => update(i, { qty: Number(e.target.value) })}
                  aria-label="Quantity" className={field} />
                <input type="number" min="0" step="0.01" value={it.unit_price || ""} onChange={e => update(i, { unit_price: Number(e.target.value) })}
                  placeholder="Unit price" aria-label="Unit price" className={field} />
                <span className="text-xs font-semibold w-16 text-right">{formatCurrency(Number(it.line_total || 0))}</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <input value={it.model ?? it.sku ?? ""} onChange={e => update(i, { model: e.target.value || null })}
              placeholder="SKU / model (optional)" className={field} />
            <input value={it.product_url ?? ""} onChange={e => update(i, { product_url: e.target.value || null })}
              placeholder="Product link (optional)" className={field} />
          </div>
          <input value={it.image_url ?? ""} onChange={e => update(i, { image_url: e.target.value || null })}
            placeholder="Photo link (optional)" className={field} />
          <div className="flex gap-1.5">
            <button type="button" onClick={() => findPhoto(i)} disabled={busy !== null}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-background border border-border text-xs font-medium disabled:opacity-50">
              {busy === i ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />} Find photo
            </button>
            <button type="button" onClick={() => update(i, { excluded: !it.excluded })} title={it.excluded ? "Count this item" : "Don't count this item"}
              className="px-3 flex items-center justify-center rounded-lg bg-background border border-border text-xs">
              {it.excluded ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>
            <button type="button" onClick={() => onChange(items.filter((_, idx) => idx !== i))} aria-label="Remove item"
              className="px-3 flex items-center justify-center rounded-lg bg-background border border-border text-xs text-destructive">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ))}
      {msg && <p className="text-xs text-muted-foreground">{msg}</p>}
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => onChange([...items, blankItem()])}
          className="flex items-center gap-1.5 text-sm text-primary font-medium py-1">
          <Plus className="w-4 h-4" /> Add item
        </button>
        {items.length > 0 && <span className="text-xs text-muted-foreground">Items total {formatCurrency(total)} (before tax)</span>}
      </div>
    </div>
  );
}
