"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  formatCurrency, formatShortDate, daysUntilDue,
  isOverdue, getDueDateBadge, getCategoryEmoji, currentMonthBounds,
} from "@/lib/utils";
import type { Bill } from "@/lib/types";
import QuickPayButtons from "@/components/QuickPayButtons";
import { format } from "date-fns";
import { RefreshCw } from "lucide-react";

export default function DashboardPage() {
  const supabase = createClient();
  const [bills, setBills] = useState<Bill[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<string>("there");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentUser(localStorage.getItem("current_user") ?? "there");
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { start, end } = currentMonthBounds();
    const [billsRes, paymentsRes] = await Promise.all([
      supabase.from("bills").select("*").order("next_due_date", { ascending: true }),
      supabase.from("payments").select("*").gte("paid_date", start).lte("paid_date", end),
    ]);
    setBills(billsRes.data ?? []);
    setPayments(paymentsRes.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const today = new Date();
  const overdueBills = bills.filter((b) => isOverdue(b.next_due_date));
  const upcomingBills = bills.filter((b) => { const d = daysUntilDue(b.next_due_date); return d >= 0 && d <= 30; });
  const allClear = overdueBills.length === 0 && upcomingBills.length === 0;
  const totalPaid = payments.reduce((s, p) => s + p.amount_paid, 0);

  return (
    <div className="px-4 pt-6 pb-4 space-y-6 max-w-lg mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-muted-foreground text-sm">{format(today, "EEEE, MMMM d")}</p>
          <h1 className="text-2xl font-bold tracking-tight">Hey {currentUser} 👋</h1>
        </div>
        <button onClick={fetchData} disabled={loading}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-muted text-muted-foreground disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card rounded-2xl p-4 border border-border col-span-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Bills Paid This Month</p>
          <p className="text-3xl font-bold">{formatCurrency(totalPaid)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {payments.length} {payments.length === 1 ? "payment" : "payments"} recorded
          </p>
        </div>
        <div className="bg-card rounded-2xl p-4 border border-border">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Overdue</p>
          <p className={`text-2xl font-bold ${overdueBills.length > 0 ? "text-red-400" : "text-muted-foreground"}`}>
            {overdueBills.length}
          </p>
        </div>
        <div className="bg-card rounded-2xl p-4 border border-border">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Upcoming</p>
          <p className="text-2xl font-bold">{upcomingBills.length}</p>
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
