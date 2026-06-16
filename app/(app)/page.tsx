"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  formatCurrency, formatShortDate, daysUntilDue,
  isOverdue, getDueDateBadge, getCategoryEmoji, currentMonthBounds,
} from "@/lib/utils";
import type { Bill, Message } from "@/lib/types";
import QuickPayButtons from "@/components/QuickPayButtons";
import { format } from "date-fns";
import { RefreshCw, X } from "lucide-react";

export default function DashboardPage() {
  const supabase = createClient();
  const [bills, setBills] = useState<Bill[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [message, setMessage] = useState<Message | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<string>("there");
  const [messageDismissed, setMessageDismissed] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const cu = localStorage.getItem("current_user") ?? "there";
      setCurrentUser(cu);
      setMessageDismissed(!!sessionStorage.getItem(`msg_dismissed_${cu}`));
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const cu = localStorage.getItem("current_user") ?? "";
    const { start, end } = currentMonthBounds();
    const [billsRes, paymentsRes, messagesRes] = await Promise.all([
      supabase.from("bills").select("*").order("next_due_date", { ascending: true }),
      supabase.from("payments").select("*").gte("paid_date", start).lte("paid_date", end),
      // Fetch the message addressed to the current user
      supabase.from("messages").select("*").eq("for_user", cu).order("updated_at", { ascending: false }).limit(1),
    ]);
    setBills(billsRes.data ?? []);
    setPayments(paymentsRes.data ?? []);
    setMessage(messagesRes.data?.[0] ?? null);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  function dismissMessage() {
    setMessageDismissed(true);
    sessionStorage.setItem(`msg_dismissed_${currentUser}`, "1");
  }

  const today = new Date();
  const overdueBills = bills.filter((b) => isOverdue(b.next_due_date));
  const upcomingBills = bills.filter((b) => { const d = daysUntilDue(b.next_due_date); return d >= 0 && d <= 30; });
  const allClear = overdueBills.length === 0 && upcomingBills.length === 0;
  const totalPaid = payments.reduce((s, p) => s + p.amount_paid, 0);
  const totalUpcoming = upcomingBills.reduce((s, b) => s + b.amount, 0);

  const showMessage = message && !messageDismissed;
  // Determine who the message is from (the other person)
  const messageFrom = currentUser === "DeShea" ? "Deepen" : "DeShea";
  const messageFromEmoji = messageFrom === "DeShea" ? "💜" : "💚";
  const bannerAccent = messageFrom === "DeShea" ? "bg-indigo-500/10 border-indigo-500/25" : "bg-emerald-500/10 border-emerald-500/25";
  const bannerLabel = messageFrom === "DeShea" ? "text-indigo-300" : "text-emerald-300";

  return (
    <div className="px-4 pt-6 pb-4 space-y-5 max-w-lg mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-muted-foreground text-sm">{format(today, "EEEE, MMMM d")}</p>
          <h1 className="text-2xl font-bold tracking-tight">
            Hey {currentUser === "there" ? "there" : currentUser.split(" ")[0]} 👋
          </h1>
        </div>
        <button onClick={fetchData} disabled={loading}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-muted text-muted-foreground disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Message banner */}
      {showMessage && (
        <div className={`border rounded-2xl px-4 py-3 flex items-start gap-3 ${bannerAccent}`}>
          <span className="text-xl flex-shrink-0 mt-0.5">{messageFromEmoji}</span>
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-semibold uppercase tracking-wide mb-0.5 ${bannerLabel}`}>
              Note from {messageFrom}
            </p>
            <p className="text-sm text-foreground leading-relaxed">{message!.content}</p>
          </div>
          <button onClick={dismissMessage}
            className="w-6 h-6 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground flex-shrink-0 mt-0.5">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card rounded-2xl p-4 border border-border col-span-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Paid This Month</p>
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
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Due (30d)</p>
          <p className="text-2xl font-bold">{upcomingBills.length}</p>
          {totalUpcoming > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">{formatCurrency(totalUpcoming)}</p>
          )}
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
            {bill.current_balance != null && (
              <p className="text-[11px] text-amber-400/80 mt-0.5">
                Balance: {formatCurrency(bill.current_balance)}
              </p>
            )}
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
