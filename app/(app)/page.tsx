"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  formatCurrency, formatShortDate, daysUntilDue,
  isOverdue, getDueDateBadge, getCategoryEmoji, currentMonthBounds,
} from "@/lib/utils";
import type { Bill } from "@/lib/types";
import QuickPayButtons from "@/components/QuickPayButtons";
import AddExpenseButton from "@/components/AddExpenseButton";
import { format } from "date-fns";
import { RefreshCw, ChevronDown, ChevronUp, Trash2 } from "lucide-react";

const EXPENSE_EMOJIS: Record<string, string> = {
  "Groceries": "🛒", "Gas": "⛽", "Dining Out": "🍽️",
  "Home & Supplies": "🏠", "Medical": "💊", "Personal": "👤",
  "Entertainment": "🎬", "Clothing": "👕", "Other": "📦"
};

export default function DashboardPage() {
  const supabase = createClient();
  const [bills, setBills] = useState<Bill[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expensesOpen, setExpensesOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<string>("there");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentUser(localStorage.getItem("current_user") ?? "there");
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { start, end } = currentMonthBounds();
    const [billsRes, paymentsRes, expensesRes] = await Promise.all([
      supabase.from("bills").select("*").order("next_due_date", { ascending: true }),
      supabase.from("payments").select("*").gte("paid_date", start).lte("paid_date", end),
      supabase.from("expenses").select("*").gte("expense_date", start).lte("expense_date", end).order("expense_date", { ascending: false }),
    ]);
    setBills(billsRes.data ?? []);
    setPayments(paymentsRes.data ?? []);
    setExpenses(expensesRes.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function deleteExpense(id: string) {
    await supabase.from("expenses").delete().eq("id", id);
    fetchData();
  }

  const today = new Date();
  const overdueBills = bills.filter((b) => isOverdue(b.next_due_date));
  const upcomingBills = bills.filter((b) => { const d = daysUntilDue(b.next_due_date); return d >= 0 && d <= 30; });
  const allClear = overdueBills.length === 0 && upcomingBills.length === 0;

  const totalBillsPaid = payments.reduce((s, p) => s + p.amount_paid, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const totalMonth = totalBillsPaid + totalExpenses;

  return (
    <div className="px-4 pt-6 pb-4 space-y-6 max-w-lg mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-muted-foreground text-sm">{format(today, "EEEE, MMMM d")}</p>
          <h1 className="text-2xl font-bold tracking-tight">Hey {currentUser} 👋</h1>
        </div>
        <button onClick={fetchData} disabled={loading} className="w-9 h-9 flex items-center justify-center rounded-full bg-muted text-muted-foreground disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Summary — clean, no comparison */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card rounded-2xl p-4 border border-border col-span-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">This Month</p>
          <p className="text-3xl font-bold">{formatCurrency(totalMonth)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {payments.length} bill {payments.length === 1 ? "payment" : "payments"} · {expenses.length} {expenses.length === 1 ? "expense" : "expenses"}
          </p>
        </div>

        <div className="bg-card rounded-2xl p-4 border border-border">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Bills Paid</p>
          <p className="text-xl font-bold">{formatCurrency(totalBillsPaid)}</p>
        </div>

        <div className="bg-card rounded-2xl p-4 border border-border">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Expenses</p>
          <p className="text-xl font-bold">{formatCurrency(totalExpenses)}</p>
        </div>
      </div>

      {/* All clear */}
      {allClear && !loading && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 text-center space-y-2">
          <p className="text-3xl">🎉</p>
          <p className="font-bold text-emerald-400">All caught up!</p>
          <p className="text-sm text-muted-foreground">No bills due in the next 30 days</p>
        </div>
      )}

      {/* Overdue */}
      {overdueBills.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-red-400 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            Overdue ({overdueBills.length})
          </h2>
          <div className="space-y-3">
            {overdueBills.map((bill) => <BillCard key={bill.id} bill={bill} onPaid={fetchData} />)}
          </div>
        </section>
      )}

      {/* Upcoming */}
      {upcomingBills.length > 0 && (
        <section>
          <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
            <span className="text-muted-foreground">Upcoming</span>
            <span className="text-xs text-muted-foreground font-normal">next 30 days</span>
          </h2>
          <div className="space-y-3">
            {upcomingBills.map((bill) => <BillCard key={bill.id} bill={bill} onPaid={fetchData} />)}
          </div>
        </section>
      )}

      {/* Expenses — collapsible section */}
      <section>
        <button
          onClick={() => setExpensesOpen((v) => !v)}
          className="w-full flex items-center justify-between py-2"
        >
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold">Recent Expenses</h2>
            {expenses.length > 0 && (
              <span className="text-xs font-semibold bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                {expenses.length}
              </span>
            )}
          </div>
          {expensesOpen
            ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
            : <ChevronDown className="w-4 h-4 text-muted-foreground" />
          }
        </button>

        {expensesOpen && (
          <div className="mt-3 space-y-3">
            <AddExpenseButton />

            {expenses.length === 0 ? (
              <div className="bg-card rounded-2xl border border-border p-6 text-center">
                <p className="text-muted-foreground text-sm">No expenses this month yet</p>
              </div>
            ) : (
              expenses.map((exp) => (
                <div key={exp.id} className="bg-card rounded-2xl border border-border px-4 py-3 flex items-center gap-3">
                  <span className="text-2xl flex-shrink-0">{EXPENSE_EMOJIS[exp.category] ?? "📦"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{exp.description}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        exp.paid_by === "DeShea"
                          ? "bg-indigo-500/20 text-indigo-400"
                          : "bg-emerald-500/20 text-emerald-400"
                      }`}>
                        {exp.paid_by}
                      </span>
                      <p className="text-xs text-muted-foreground">{exp.category}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(exp.expense_date + "T12:00:00"), "MMM d")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <p className="font-bold text-sm">{formatCurrency(exp.amount)}</p>
                    <button
                      onClick={() => deleteExpense(exp.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {!expensesOpen && expenses.length === 0 && (
          <div className="mt-2">
            <AddExpenseButton />
          </div>
        )}
      </section>

      {loading && (
        <div className="flex items-center justify-center py-10">
          <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

function BillCard({ bill, onPaid }: { bill: Bill; onPaid: () => void }) {
  const days = daysUntilDue(bill.next_due_date);
  const badge = getDueDateBadge(days);
  const emoji = getCategoryEmoji(bill.category);

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <span className="text-2xl flex-shrink-0 mt-0.5">{emoji}</span>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{bill.name}</p>
            <p className="text-xs text-muted-foreground">{formatShortDate(bill.next_due_date)}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <p className="font-bold text-base">{formatCurrency(bill.amount)}</p>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badge.className}`}>
            {badge.label}
          </span>
        </div>
      </div>
      <QuickPayButtons bill={bill} />
    </div>
  );
}
