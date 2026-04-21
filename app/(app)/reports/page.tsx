import { createClient } from "@/lib/supabase/server";
import { formatCurrency, monthBounds } from "@/lib/utils";
import ReportsClient from "@/components/ReportsClient";
import { format, subMonths, startOfMonth } from "date-fns";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const supabase = await createClient();

  // Build last 6 months of data
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(new Date(), i);
    return {
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      label: format(d, "MMM yyyy"),
      short: format(d, "MMM"),
    };
  }).reverse();

  // Fetch all payments in the last 6 months
  const sixMonthsAgo = format(subMonths(startOfMonth(new Date()), 5), "yyyy-MM-dd");
  const { data: payments } = await supabase
    .from("payments")
    .select("*, bill:bills(name, category)")
    .gte("paid_date", sixMonthsAgo)
    .order("paid_date", { ascending: true });

  // Fetch category totals for current month
  const { start, end } = monthBounds(new Date().getFullYear(), new Date().getMonth() + 1);
  const { data: thisMonthPayments } = await supabase
    .from("payments")
    .select("*, bill:bills(name, category)")
    .gte("paid_date", start)
    .lte("paid_date", end);

  // Build monthly chart data
  const monthlyData = months.map(({ year, month, label, short }) => {
    const { start, end } = monthBounds(year, month);
    const monthPays = (payments ?? []).filter(
      (p) => p.paid_date >= start && p.paid_date <= end
    );
    return {
      month: short,
      label,
      total: monthPays.reduce((s, p) => s + p.amount_paid, 0),
      deshea: monthPays.filter((p) => p.paid_by === "DeShea").reduce((s, p) => s + p.amount_paid, 0),
      deepen: monthPays.filter((p) => p.paid_by === "Deepen").reduce((s, p) => s + p.amount_paid, 0),
    };
  });

  // Category breakdown for current month
  const categoryData: Record<string, number> = {};
  (thisMonthPayments ?? []).forEach((p) => {
    const cat = p.bill?.category ?? "Other";
    categoryData[cat] = (categoryData[cat] ?? 0) + p.amount_paid;
  });
  const categoryBreakdown = Object.entries(categoryData)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Running totals
  const allTime = {
    deshea: (payments ?? []).filter((p) => p.paid_by === "DeShea").reduce((s, p) => s + p.amount_paid, 0),
    deepen: (payments ?? []).filter((p) => p.paid_by === "Deepen").reduce((s, p) => s + p.amount_paid, 0),
  };

  return (
    <div className="px-4 pt-6 pb-4 space-y-6 max-w-lg mx-auto animate-fade-in">
      <h1 className="text-2xl font-bold tracking-tight">Reports</h1>

      {/* All-time summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card rounded-2xl border border-border p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
            <p className="text-xs text-muted-foreground uppercase tracking-wide">DeShea (6mo)</p>
          </div>
          <p className="text-xl font-bold text-indigo-400">{formatCurrency(allTime.deshea)}</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Deepen (6mo)</p>
          </div>
          <p className="text-xl font-bold text-emerald-400">{formatCurrency(allTime.deepen)}</p>
        </div>
      </div>

      <ReportsClient
        monthlyData={monthlyData}
        categoryBreakdown={categoryBreakdown}
      />
    </div>
  );
}
