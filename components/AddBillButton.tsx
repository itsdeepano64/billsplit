"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { computeNextDueDate } from "@/lib/utils";
import type { Frequency, Payer } from "@/lib/types";
import { useRouter } from "next/navigation";

const CATEGORIES = ["Housing", "Utilities", "Phone", "Auto", "Home", "Credit", "Business", "Other"];
const FREQUENCIES: Frequency[] = ["monthly", "quarterly", "yearly"];

export default function AddBillButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/25 active:scale-95 transition-transform"
      >
        <Plus className="w-5 h-5" strokeWidth={2.5} />
      </button>
      {open && <BillModal onClose={() => setOpen(false)} />}
    </>
  );
}

export function BillModal({
  onClose,
  existing,
}: {
  onClose: () => void;
  existing?: any;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: existing?.name ?? "",
    amount: existing?.amount?.toString() ?? "",
    due_day: existing?.due_day?.toString() ?? "1",
    frequency: (existing?.frequency ?? "monthly") as Frequency,
    category: existing?.category ?? "Housing",
    notes: existing?.notes ?? "",
    default_paid_by: (existing?.default_paid_by ?? "") as Payer | "",
  });

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        name: form.name,
        amount: parseFloat(form.amount),
        due_day: parseInt(form.due_day),
        frequency: form.frequency,
        category: form.category,
        notes: form.notes || null,
        default_paid_by: form.default_paid_by || null,
        next_due_date: existing?.next_due_date ?? computeNextDueDate(parseInt(form.due_day), form.frequency),
      };

      if (existing) {
        await supabase.from("bills").update(payload).eq("id", existing.id);
      } else {
        await supabase.from("bills").insert(payload);
      }

      router.refresh();
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card rounded-t-3xl border-t border-x border-border p-5 pb-8 max-h-[90vh] overflow-y-auto animate-fade-in">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">{existing ? "Edit Bill" : "Add Bill"}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-muted text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Bill Name">
            <input
              required
              className={inputCls}
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Mortgage"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Amount ($)">
              <input
                required
                type="number"
                step="0.01"
                min="0"
                className={inputCls}
                value={form.amount}
                onChange={(e) => set("amount", e.target.value)}
                placeholder="0.00"
              />
            </Field>
            <Field label="Due Day (1-31)">
              <input
                required
                type="number"
                min="1"
                max="31"
                className={inputCls}
                value={form.due_day}
                onChange={(e) => set("due_day", e.target.value)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Frequency">
              <select className={inputCls} value={form.frequency} onChange={(e) => set("frequency", e.target.value)}>
                {FREQUENCIES.map((f) => (
                  <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>
                ))}
              </select>
            </Field>
            <Field label="Category">
              <select className={inputCls} value={form.category} onChange={(e) => set("category", e.target.value)}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Default Paid By">
            <select className={inputCls} value={form.default_paid_by} onChange={(e) => set("default_paid_by", e.target.value)}>
              <option value="">No default</option>
              <option value="DeShea">DeShea</option>
              <option value="Deepen">Deepen</option>
            </select>
          </Field>

          <Field label="Notes (optional)">
            <input
              className={inputCls}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="e.g. Balance: $1,000"
            />
          </Field>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground rounded-xl py-4 font-semibold touch-target disabled:opacity-50 mt-2"
          >
            {loading ? "Saving..." : existing ? "Save Changes" : "Add Bill"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50";
