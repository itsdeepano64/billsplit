"use client";

import { useState, useEffect } from "react";
import { Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

const EXPENSE_CATEGORIES = [
  "Groceries", "Gas", "Dining Out", "Home & Supplies",
  "Medical", "Personal", "Entertainment", "Clothing", "Other"
];

const CATEGORY_EMOJIS: Record<string, string> = {
  "Groceries": "🛒", "Gas": "⛽", "Dining Out": "🍽️",
  "Home & Supplies": "🏠", "Medical": "💊", "Personal": "👤",
  "Entertainment": "🎬", "Clothing": "👕", "Other": "📦"
};

export default function AddExpenseButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-primary/15 border border-primary/30 text-primary rounded-xl px-4 py-2.5 text-sm font-semibold active:scale-[0.97] transition-all"
      >
        <Plus className="w-4 h-4" strokeWidth={2.5} />
        Add Expense
      </button>
      {open && <ExpenseSheet onClose={() => setOpen(false)} />}
    </>
  );
}

function ExpenseSheet({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<"DeShea" | "Deepen">("DeShea");

  const [form, setForm] = useState({
    paid_by: "DeShea" as "DeShea" | "Deepen",
    amount: "",
    description: "",
    category: "Groceries",
    expense_date: format(new Date(), "yyyy-MM-dd"),
    notes: "",
  });

  useEffect(() => {
    const user = (localStorage.getItem("current_user") ?? "DeShea") as "DeShea" | "Deepen";
    setCurrentUser(user);
    setForm((f) => ({ ...f, paid_by: user }));
  }, []);

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0) { setError("Enter a valid amount"); return; }
    if (!form.description.trim()) { setError("Enter a description"); return; }

    setLoading(true);
    setError(null);
    try {
      const { error: insertError } = await supabase.from("expenses").insert({
        paid_by: form.paid_by,
        amount: amt,
        description: form.description.trim(),
        category: form.category,
        expense_date: form.expense_date,
        notes: form.notes || null,
      });
      if (insertError) throw insertError;
      router.refresh();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card rounded-t-3xl border-t border-x border-border p-5 pb-10 max-h-[90vh] overflow-y-auto animate-fade-in">

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">Add Expense</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-muted">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Who paid */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Paid By</label>
            <div className="grid grid-cols-2 gap-2">
              {(["DeShea", "Deepen"] as const).map((person) => (
                <button
                  key={person}
                  type="button"
                  onClick={() => set("paid_by", person)}
                  className={`py-3 rounded-xl text-sm font-bold transition-all border-2 ${
                    form.paid_by === person
                      ? person === "DeShea"
                        ? "bg-indigo-500/20 border-indigo-500 text-indigo-300"
                        : "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                      : "bg-muted border-border text-muted-foreground"
                  }`}
                >
                  {person === "DeShea" ? "💜 DeShea" : "💚 Deepen"}
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Amount</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={form.amount}
                onChange={(e) => set("amount", e.target.value)}
                placeholder="0.00"
                className="w-full bg-muted border border-border rounded-xl pl-8 pr-4 py-4 text-foreground text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Description</label>
            <input
              type="text"
              required
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="e.g. Walmart grocery run, Costco haul..."
              className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Category</label>
            <div className="grid grid-cols-3 gap-2">
              {EXPENSE_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => set("category", cat)}
                  className={`py-2.5 px-1 rounded-xl text-xs font-semibold transition-all border flex flex-col items-center gap-1 ${
                    form.category === cat
                      ? "bg-primary/20 border-primary text-primary"
                      : "bg-muted border-border text-muted-foreground"
                  }`}
                >
                  <span className="text-lg">{CATEGORY_EMOJIS[cat]}</span>
                  <span className="leading-tight text-center">{cat}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Date</label>
            <input
              type="date"
              value={form.expense_date}
              onChange={(e) => set("expense_date", e.target.value)}
              className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Notes (optional)</label>
            <input
              type="text"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Any extra details..."
              className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {error && <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-4 py-2">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground rounded-xl py-4 font-bold text-base disabled:opacity-50 active:scale-[0.98] transition-all"
          >
            {loading ? "Saving..." : "Save Expense"}
          </button>
        </form>
      </div>
    </div>
  );
}
