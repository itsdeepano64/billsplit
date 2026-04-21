import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Payment } from "@/lib/types";
import PaymentHistoryClient from "@/components/PaymentHistoryClient";
import { format, subMonths } from "date-fns";

export const dynamic = "force-dynamic";

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; payer?: string; bill?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  // Fetch all payments with bill info
  let query = supabase
    .from("payments")
    .select("*, bill:bills(name, category)")
    .order("paid_date", { ascending: false })
    .limit(200);

  if (params.payer) query = query.eq("paid_by", params.payer);
  if (params.month) {
    const [year, month] = params.month.split("-");
    const start = `${year}-${month}-01`;
    const end = new Date(parseInt(year), parseInt(month), 0).toISOString().split("T")[0];
    query = query.gte("paid_date", start).lte("paid_date", end);
  }
  if (params.bill) query = query.eq("bill_id", params.bill);

  const { data: payments } = await query;

  // Fetch bills for filter dropdown
  const { data: bills } = await supabase.from("bills").select("id, name").order("name");

  // Generate last 12 months for filter
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = subMonths(new Date(), i);
    return { value: format(d, "yyyy-MM"), label: format(d, "MMMM yyyy") };
  });

  const totalAmount = (payments ?? []).reduce((s, p) => s + p.amount_paid, 0);

  return (
    <div className="px-4 pt-6 pb-4 space-y-5 max-w-lg mx-auto animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">History</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {(payments ?? []).length} payments · {formatCurrency(totalAmount)}
        </p>
      </div>

      <PaymentHistoryClient
        payments={payments ?? []}
        bills={bills ?? []}
        months={months}
        filters={params}
      />
    </div>
  );
}
