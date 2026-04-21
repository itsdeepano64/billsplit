"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate, getCategoryEmoji } from "@/lib/utils";
import type { Payment } from "@/lib/types";
import { Trash2, Pencil, ChevronDown, X } from "lucide-react";

interface Props {
  payments: any[];
  bills: { id: string; name: string }[];
  months: { value: string; label: string }[];
  filters: { month?: string; payer?: string; bill?: string };
}

export default function PaymentHistoryClient({ payments, bills, months, filters }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [editPayment, setEditPayment] = useState<any>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editPaidBy, setEditPaidBy] = useState("");

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(window.location.search);
    if (value) params.set(key, value); else params.delete(key);
    router.push(`/history?${params.toString()}`);
  }

  function clearFilters() {
    router.push("/history");
  }

  async function handleDelete(id: string, billId: string) {
    if (!confirm("Delete this payment? This will reverse the bill back to unpaid.")) return;

    // 1. Get the bill to find its current next_due_date and frequency
    const { data: bill } = await supabase
      .from("bills")
      .select("next_due_date, frequency, due_day")
      .eq("id", billId)
      .single();

    // 2. Delete the payment record
    await supabase.from("payments").delete().eq("id", id);

    // 3. Roll back the next_due_date by one period so bill reappears on dashboard
    if (bill) {
      const { parseISO, subMonths, subQuarters, subYears, setDate, format } = await import("date-fns");
      const current = parseISO(bill.next_due_date);
      let prev: Date;
      if (bill.frequency === "monthly")    prev = subMonths(current, 1);
      else if (bill.frequency === "quarterly") prev = subQuarters(current, 1);
      else                                  prev = subYears(current, 1);
      // Set to the correct due day
      const daysInMonth = new Date(prev.getFullYear(), prev.getMonth() + 1, 0).getDate();
      const safeDay = Math.min(bill.due_day, daysInMonth);
      prev.setDate(safeDay);
      await supabase.from("bills").update({
        next_due_date: format(prev, "yyyy-MM-dd")
      }).eq("id", billId);
    }

    router.refresh();
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    await supabase.from("payments").update({
      amount_paid: parseFloat(editAmount),
      paid_by: editPaidBy,
      notes: editNotes || null,
    }).eq("id", editPayment.id);
    setEditPayment(null);
    router.refresh();
  }

  function openEdit(p: any) {
    setEditPayment(p);
    setEditAmount(p.amount_paid.toString());
    setEditNotes(p.notes ?? "");
    setEditPaidBy(p.paid_by);
  }

  const hasFilters = filters.month || filters.payer || filters.bill;

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="space-y-2">
        <button
          onClick={() => setFiltersOpen((v) => !v)}
          className="w-full flex items-center justify-between bg-card border border-border rounded-xl px-4 py-3 text-sm"
        >
          <span className="text-muted-foreground">
            {hasFilters ? "Filters active" : "Filter payments"}
          </span>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${filtersOpen ? "rotate-180" : ""}`} />
        </button>

        {filtersOpen && (
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground uppercase tracking-wide">Month</label>
              <select
                className={selCls}
                value={filters.month ?? ""}
                onChange={(e) => updateFilter("month", e.target.value)}
              >
                <option value="">All months</option>
                {months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground uppercase tracking-wide">Paid By</label>
              <select
                className={selCls}
                value={filters.payer ?? ""}
                onChange={(e) => updateFilter("payer", e.target.value)}
              >
                <option value="">Anyone</option>
                <option value="DeShea">DeShea</option>
                <option value="Deepen">Deepen</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground uppercase tracking-wide">Bill</label>
              <select
                className={selCls}
                value={filters.bill ?? ""}
                onChange={(e) => updateFilter("bill", e.target.value)}
              >
                <option value="">All bills</option>
                {bills.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>

            {hasFilters && (
              <button onClick={clearFilters} className="text-xs text-muted-foreground flex items-center gap-1">
                <X className="w-3 h-3" /> Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Payment list */}
      {payments.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-10 text-center space-y-2">
          <p className="text-3xl">🧾</p>
          <p className="font-semibold">No payments found</p>
          <p className="text-sm text-muted-foreground">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="space-y-2">
          {payments.map((p) => (
            <div key={p.id} className="bg-card rounded-2xl border border-border px-4 py-3 flex items-center gap-3">
              <div className="text-xl flex-shrink-0">{getCategoryEmoji(p.bill?.category ?? "")}</div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{p.bill?.name ?? "Unknown bill"}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    p.paid_by === "DeShea"
                      ? "bg-indigo-500/20 text-indigo-400"
                      : "bg-emerald-500/20 text-emerald-400"
                  }`}>
                    {p.paid_by}
                  </span>
                  <p className="text-xs text-muted-foreground">{formatDate(p.paid_date)}</p>
                </div>
                {p.notes && <p className="text-[11px] text-muted-foreground mt-0.5">{p.notes}</p>}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <p className="font-bold text-sm">{formatCurrency(p.amount_paid)}</p>
                <button onClick={() => openEdit(p)} className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleDelete(p.id, p.bill_id)} className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit payment modal */}
      {editPayment && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditPayment(null)} />
          <div className="relative w-full max-w-lg bg-card rounded-t-3xl border-t border-x border-border p-5 pb-8 animate-fade-in">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold">Edit Payment</h2>
              <button onClick={() => setEditPayment(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-muted">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleEdit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground uppercase tracking-wide">Amount</label>
                <input type="number" step="0.01" required value={editAmount} onChange={(e) => setEditAmount(e.target.value)} className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground uppercase tracking-wide">Paid By</label>
                <select value={editPaidBy} onChange={(e) => setEditPaidBy(e.target.value)} className={inputCls}>
                  <option value="DeShea">DeShea</option>
                  <option value="Deepen">Deepen</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground uppercase tracking-wide">Notes</label>
                <input value={editNotes} onChange={(e) => setEditNotes(e.target.value)} className={inputCls} placeholder="Optional" />
              </div>
              <button type="submit" className="w-full bg-primary text-primary-foreground rounded-xl py-4 font-semibold touch-target">
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const selCls = "w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50";
const inputCls = "w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50";
