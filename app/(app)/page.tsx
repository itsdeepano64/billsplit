import { createClient } from "@/lib/supabase/server";
import {
  formatCurrency,
  formatShortDate,
  daysUntilDue,
  isOverdue,
  getDueDateBadge,
  getCategoryEmoji,
  currentMonthBounds,
} from "@/lib/utils";
import type { Bill, Payment } from "@/lib/types";
import QuickPayButtons from "@/components/QuickPayButtons";
import { parseISO, format } from "date-fns";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch all bills ordered by next_due_date
  const { data: bills } = await supabase
    .from("bills")
    .select("*")
    .order("next_due_date", { ascending: true });

  // Fetch this month's payments
  const { start, end } = currentMonthBounds();
  const { data: monthPayments } = await supabase
    .from("payments")
    .select("*, bill:bills(name)")
    .gte("paid_date", start)
    .lte("paid_date", end);

  const allBills: Bill[] = bills ?? [];
  const payments: Payment[] = monthPayments ?? [];

  // Categorize bills
  const today = new Date();
  const in30Days = new Date(today);
  in30Days.setDate(today.getDate() + 30);

  const overdueBills = allBills.filter((b) => isOverdue(b.next_due_date));
  const upcomingBills = allBills.filter((b) => {
    const d = daysUntilDue(b.next_due_date);
    return d >= 0 && d <= 30;
  });

  // Monthly summary
  const totalPaid = payments.reduce((s, p) => s + p.amount_paid, 0);
  const paidByDeshea = payments.filter((p) => p.paid_by === "DeShea").reduce((s, p) => s + p.amount_paid, 0);
  const paidByDeepen = payments.filter((p) => p.paid_by === "Deepen").reduce((s, p) => s + p.amount_paid, 0);
  const balance = paidByDeshea - paidByDeepen; // positive = DeShea paid more

  const monthLabel = format(today, "MMMM yyyy");

  return (
    <div className="px-4 pt-6 pb-4 space-y-6 max-w-lg mx-auto animate-fade-in">
      {/* Header */}
      <div>
        <p className="text-muted-foreground text-sm">{format(today, "EEEE, MMMM d")}</p>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
      </div>

      {/* Month Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card rounded-2xl p-4 border border-border">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">This Month</p>
          <p className="text-2xl font-bold">{formatCurrency(totalPaid)}</p>
          <p className="text-xs text-muted-foreground mt-1">{payments.length} bills paid</p>
        </div>

        <div className="bg-card rounded-2xl p-4 border border-border">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Balance</p>
          <p className={`text-2xl font-bold ${balance > 0 ? "text-indigo-400" : balance < 0 ? "text-emerald-400" : "text-foreground"}`}>
            {formatCurrency(Math.abs(balance))}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {balance > 0 ? "DeShea paid more" : balance < 0 ? "Deepen paid more" : "Even"}
          </p>
        </div>

        <div className="bg-card rounded-2xl p-4 border border-border col-span-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
            <p className="text-xs text-muted-foreground uppercase tracking-wide">DeShea</p>
          </div>
          <p className="text-xl font-semibold text-indigo-400">{formatCurrency(paidByDeshea)}</p>
        </div>

        <div className="bg-card rounded-2xl p-4 border border-border col-span-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Deepen</p>
          </div>
          <p className="text-xl font-semibold text-emerald-400">{formatCurrency(paidByDeepen)}</p>
        </div>
      </div>

      {/* Overdue Bills */}
      {overdueBills.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-red-400 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            Overdue ({overdueBills.length})
          </h2>
          <div className="space-y-3">
            {overdueBills.map((bill) => (
              <BillCard key={bill.id} bill={bill} />
            ))}
          </div>
        </section>
      )}

      {/* Upcoming Bills */}
      <section>
        <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
          <span className="text-muted-foreground">Upcoming</span>
          <span className="text-xs text-muted-foreground font-normal">next 30 days</span>
        </h2>
        {upcomingBills.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border p-6 text-center">
            <p className="text-muted-foreground text-sm">No bills due in the next 30 days 🎉</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingBills.map((bill) => (
              <BillCard key={bill.id} bill={bill} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function BillCard({ bill }: { bill: Bill }) {
  const days = daysUntilDue(bill.next_due_date);
  const badge = getDueDateBadge(days);
  const emoji = getCategoryEmoji(bill.category);

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      {/* Bill info */}
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

      {/* Quick pay buttons */}
      <QuickPayButtons bill={bill} />
    </div>
  );
}
