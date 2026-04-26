"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { Trash2, RefreshCw } from "lucide-react";
import AddExpenseButton from "@/components/AddExpenseButton";
import { useRouter } from "next/navigation";

const EXPENSE_EMOJIS: Record<string, string> = {
  "Groceries": "🛒", "Gas": "⛽", "Dining Out": "🍽️",
  "Home & Supplies": "🏠", "Medical": "💊", "Personal": "👤",
  "Entertainment": "🎬", "Clothing": "👕", "Other": "📦"
};

export default function ExpensesPage() {
  const supabase = createClient();
  const router = useRouter();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));

  const months = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(new Date(), i);
    return { value: format(d, "yyyy-MM"), label: format(d, "MMMM yyyy") };
  });

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    const [year, month] = selectedMonth.split("-");
    const start = `${year}-${month}-01`;
    const end = format(endOfMonth(new Date(parseInt(year), parseInt(month) - 1)), "yyyy-MM-dd");

    const { data } = await supabase
      .from("expenses")
      .select("*")
      .gte("expense_date", start)
      .lte("expense_date", end)
      .order("expense_date", { ascending: false });

    setExpenses(data ?? []);
    setLoading(false);
  }, [selectedMonth]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this expense?")) return;
    await supabase.from("expenses").delete().eq("id", id);
    fetchExpenses();
  }

  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const byDeshea = expenses.filter(e => e.paid_by === "DeShea").reduce((s, e) => s + e.amount, 0);
  const byDeepen = expenses.filter(e => e.paid_by === "Deepen").reduce((s, e) => s + e.amount, 0);

  // Group by category
  const byCategory: Record<string, number> = {};
  expenses.forEach(e => { byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount; });
  const topCategories = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);

  return (
    <div className="px-4 pt-6 pb-4 space-y-5 max-w-lg mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Expenses</h1>
        <div className="flex items-center gap-2">
          <button onClick={fetchExpenses} disabled={loading}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-muted text-muted-foreground disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <AddExpenseButton onSaved={fetchExpenses} />
        </div>
      </div>

      {/* Month selector */}
      <select
        value={selectedMonth}
        onChange={(e) => setSelectedMonth(e.target.value)}
        className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
      >
        {months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
      </select>

      {/* Summary */}
      {expenses.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card rounded-2xl p-3 border border-border col-span-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total</p>
            <p className="text-2xl font-bold">{formatCurrency(total)}</p>
          </div>
          <div className="bg-card rounded-2xl p-3 border border-border">
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-2 h-2 rounded-full bg-indigo-400" />
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">DeShea</p>
            </div>
            <p className="text-base font-bold text-indigo-400">{formatCurrency(byDeshea)}</p>
          </div>
          <div className="bg-card rounded-2xl p-3 border border-border">
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Deepen</p>
            </div>
            <p className="text-base font-bold text-emerald-400">{formatCurrency(byDeepen)}</p>
          </div>
          <div className="bg-card rounded-2xl p-3 border border-border">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Count</p>
            <p className="text-base font-bold">{expenses.length}</p>
          </div>
        </div>
      )}

      {/* Top categories */}
      {topCategories.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">By Category</p>
          <div className="space-y-2">
            {topCategories.map(([cat, amt]) => (
              <div key={cat} className="flex items-center gap-3">
                <span className="text-lg w-7 text-center flex-shrink-0">{EXPENSE_EMOJIS[cat] ?? "📦"}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium truncate">{cat}</p>
                    <p className="text-sm font-bold ml-2 flex-shrink-0">{formatCurrency(amt)}</p>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${(amt / total) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expense list */}
      {loading ? (
        <div className="flex justify-center py-10">
          <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : expenses.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-10 text-center space-y-3">
          <p className="text-4xl">🛒</p>
          <p className="font-semibold">No expenses this month</p>
          <p className="text-sm text-muted-foreground">Tap + Add Expense to record one</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">All Expenses</p>
          {expenses.map((exp) => (
            <div key={exp.id} className="bg-card rounded-2xl border border-border px-4 py-3 flex items-center gap-3">
              <span className="text-2xl flex-shrink-0">{EXPENSE_EMOJIS[exp.category] ?? "📦"}</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{exp.description}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    exp.paid_by === "DeShea" ? "bg-indigo-500/20 text-indigo-400" : "bg-emerald-500/20 text-emerald-400"
                  }`}>{exp.paid_by}</span>
                  <p className="text-xs text-muted-foreground">{exp.category}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(exp.expense_date + "T12:00:00"), "MMM d")}
                  </p>
                </div>
                {exp.notes && <p className="text-xs text-muted-foreground mt-0.5 truncate">{exp.notes}</p>}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <p className="font-bold text-sm">{formatCurrency(exp.amount)}</p>
                <button onClick={() => handleDelete(exp.id)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
