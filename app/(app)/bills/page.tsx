import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatShortDate, getDueDateBadge, daysUntilDue, getCategoryEmoji } from "@/lib/utils";
import type { Bill } from "@/lib/types";
import AddBillButton from "@/components/AddBillButton";
import BillActions from "@/components/BillActions";

export const dynamic = "force-dynamic";

export default async function BillsPage() {
  const supabase = await createClient();
  const { data: bills } = await supabase
    .from("bills")
    .select("*")
    .order("next_due_date", { ascending: true });

  const allBills: Bill[] = bills ?? [];

  // Group by category
  const grouped = allBills.reduce<Record<string, Bill[]>>((acc, bill) => {
    if (!acc[bill.category]) acc[bill.category] = [];
    acc[bill.category].push(bill);
    return acc;
  }, {});

  const totalMonthly = allBills.reduce((s, b) => {
    if (b.frequency === "monthly") return s + b.amount;
    if (b.frequency === "quarterly") return s + b.amount / 3;
    if (b.frequency === "yearly") return s + b.amount / 12;
    return s;
  }, 0);

  return (
    <div className="px-4 pt-6 pb-4 space-y-6 max-w-lg mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bills</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {allBills.length} bills · {formatCurrency(totalMonthly)}/mo
          </p>
        </div>
        <AddBillButton />
      </div>

      {/* Bill groups by category */}
      {Object.entries(grouped).map(([category, categoryBills]) => (
        <section key={category}>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
            <span>{getCategoryEmoji(category)}</span>
            {category}
          </h2>
          <div className="space-y-2">
            {categoryBills.map((bill) => {
              const days = daysUntilDue(bill.next_due_date);
              const badge = getDueDateBadge(days);
              return (
                <div
                  key={bill.id}
                  className="bg-card rounded-2xl border border-border px-4 py-3 flex items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm truncate">{bill.name}</p>
                      {bill.default_paid_by && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                          bill.default_paid_by === "DeShea"
                            ? "bg-indigo-500/20 text-indigo-400"
                            : "bg-emerald-500/20 text-emerald-400"
                        }`}>
                          {bill.default_paid_by}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-muted-foreground">Due {formatShortDate(bill.next_due_date)}</p>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${badge.className}`}>
                        {badge.label}
                      </span>
                    </div>
                    {bill.notes && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{bill.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <p className="font-bold text-sm">{formatCurrency(bill.amount)}</p>
                    <BillActions bill={bill} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {allBills.length === 0 && (
        <div className="bg-card rounded-2xl border border-border p-10 text-center space-y-2">
          <p className="text-3xl">📋</p>
          <p className="font-semibold">No bills yet</p>
          <p className="text-sm text-muted-foreground">Tap + to add your first bill</p>
        </div>
      )}
    </div>
  );
}
