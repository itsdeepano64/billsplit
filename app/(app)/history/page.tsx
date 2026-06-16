import { createClient } from "@/lib/supabase/server";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import HistoryTabsClient from "@/components/HistoryTabsClient";

export const dynamic = "force-dynamic";

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; month?: string; payer?: string; bill?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  // ─── Payments data ───────────────────────────────────────────
  let paymentsQuery = supabase
    .from("payments")
    .select("*, bill:bills(name, category)")
    .order("paid_date", { ascending: false })
    .limit(200);

  if (params.payer) paymentsQuery = paymentsQuery.eq("paid_by", params.payer);
  if (params.month) {
    const [year, month] = params.month.split("-");
    const start = `${year}-${month}-01`;
    const end = new Date(parseInt(year), parseInt(month), 0).toISOString().split("T")[0];
    paymentsQuery = paymentsQuery.gte("paid_date", start).lte("paid_date", end);
  }
  if (params.bill) paymentsQuery = paymentsQuery.eq("bill_id", params.bill);

  const { data: payments } = await paymentsQuery;
  const { data: bills } = await supabase.from("bills").select("id, name").order("name");

  // ─── Transfers data ───────────────────────────────────────────
  const { data: transfers } = await supabase
    .from("transfers")
    .select("*")
    .order("transfer_date", { ascending: false })
    .limit(200);

  // ─── Stats data ───────────────────────────────────────────────
  // Last 6 months of payments
  const sixMonthsAgo = format(subMonths(new Date(), 5), "yyyy-MM-dd");
  const { data: allPayments } = await supabase
    .from("payments")
    .select("paid_date, amount_paid, paid_by, bill:bills(category)")
    .gte("paid_date", sixMonthsAgo)
    .order("paid_date", { ascending: true });

  // Build monthly data
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(new Date(), 5 - i);
    const monthKey = format(d, "yyyy-MM");
    const monthPayments = (allPayments ?? []).filter((p) => p.paid_date.startsWith(monthKey));
    return {
      month: format(d, "MMM"),
      label: format(d, "MMMM yyyy"),
      total: monthPayments.reduce((s, p) => s + p.amount_paid, 0),
      deshea: monthPayments.filter((p) => p.paid_by === "DeShea").reduce((s, p) => s + p.amount_paid, 0),
      deepen: monthPayments.filter((p) => p.paid_by === "Deepen").reduce((s, p) => s + p.amount_paid, 0),
    };
  });

  // This month category breakdown
  const thisMonthKey = format(new Date(), "yyyy-MM");
  const thisMonthPayments = (allPayments ?? []).filter((p) => p.paid_date.startsWith(thisMonthKey));
  const categoryMap = new Map<string, number>();
  for (const p of thisMonthPayments) {
    const cat = (p.bill as any)?.category ?? "Other";
    categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + p.amount_paid);
  }
  const categoryBreakdown = Array.from(categoryMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const thisMonthTotal = thisMonthPayments.reduce((s, p) => s + p.amount_paid, 0);
  const thisMonthByDeShea = thisMonthPayments.filter((p) => p.paid_by === "DeShea").reduce((s, p) => s + p.amount_paid, 0);
  const thisMonthByDeepen = thisMonthPayments.filter((p) => p.paid_by === "Deepen").reduce((s, p) => s + p.amount_paid, 0);

  // ─── Filter helpers ───────────────────────────────────────────
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = subMonths(new Date(), i);
    return { value: format(d, "yyyy-MM"), label: format(d, "MMMM yyyy") };
  });

  return (
    <div className="px-4 pt-6 pb-4 space-y-5 max-w-lg mx-auto animate-fade-in">
      <h1 className="text-2xl font-bold tracking-tight">History</h1>

      <HistoryTabsClient
        initialTab={(params.tab as any) ?? "payments"}
        payments={payments ?? []}
        bills={bills ?? []}
        months={months}
        filters={params}
        transfers={transfers ?? []}
        monthlyData={monthlyData}
        categoryBreakdown={categoryBreakdown}
        thisMonthTotal={thisMonthTotal}
        thisMonthByDeShea={thisMonthByDeShea}
        thisMonthByDeepen={thisMonthByDeepen}
      />
    </div>
  );
}
