"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { Bill } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { LogOut, Download, Sprout, ChevronRight, RefreshCw } from "lucide-react";

export default function SettingsClient({
  user,
  bills,
}: {
  user: any;
  bills: Bill[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  async function handleSeed() {
    if (!confirm("This will add the default 16 bills if they don't already exist. Continue?")) return;
    setSeeding(true);
    setSeedMsg(null);
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      const data = await res.json();
      setSeedMsg(data.message ?? "Done");
      router.refresh();
    } catch {
      setSeedMsg("Error seeding bills");
    } finally {
      setSeeding(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const { data: payments } = await supabase
        .from("payments")
        .select("*, bill:bills(name, category)")
        .order("paid_date", { ascending: false });

      if (!payments?.length) { alert("No payments to export"); return; }

      const rows = [
        ["Date", "Bill", "Category", "Amount", "Paid By", "Notes"],
        ...payments.map((p) => [
          p.paid_date,
          p.bill?.name ?? "",
          p.bill?.category ?? "",
          p.amount_paid.toFixed(2),
          p.paid_by,
          p.notes ?? "",
        ]),
      ];

      const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `billsplit-export-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
    } finally {
      setExporting(false);
    }
  }

  async function updateDefaultPaidBy(billId: string, value: string) {
    await supabase
      .from("bills")
      .update({ default_paid_by: value || null })
      .eq("id", billId);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Account */}
      <Section title="Account">
        <div className="px-4 py-3">
          <p className="text-xs text-muted-foreground">Signed in as</p>
          <p className="font-semibold text-sm mt-0.5 truncate">{user?.email}</p>
        </div>
        <Divider />
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-4 py-4 text-destructive touch-target"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm font-medium">Sign Out</span>
        </button>
      </Section>

      {/* Default Paid By */}
      <Section title="Default Paid By">
        <p className="px-4 pt-3 pb-1 text-xs text-muted-foreground">
          Set who usually pays each bill. This is just a default — you can always choose the other person when marking paid.
        </p>
        <div className="divide-y divide-border">
          {bills.map((bill) => (
            <div key={bill.id} className="flex items-center justify-between px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{bill.name}</p>
                <p className="text-xs text-muted-foreground">{formatCurrency(bill.amount)}</p>
              </div>
              <select
                defaultValue={bill.default_paid_by ?? ""}
                onChange={(e) => updateDefaultPaidBy(bill.id, e.target.value)}
                className="bg-muted border border-border rounded-lg text-xs px-2 py-1.5 text-foreground focus:outline-none ml-3 flex-shrink-0"
              >
                <option value="">None</option>
                <option value="DeShea">DeShea</option>
                <option value="Deepen">Deepen</option>
              </select>
            </div>
          ))}
        </div>
      </Section>

      {/* Data */}
      <Section title="Data">
        <button
          onClick={handleSeed}
          disabled={seeding}
          className="w-full flex items-center gap-3 px-4 py-4 touch-target disabled:opacity-50"
        >
          <Sprout className="w-4 h-4 text-emerald-400" />
          <div className="flex-1 text-left">
            <p className="text-sm font-medium">Seed Initial Bills</p>
            <p className="text-xs text-muted-foreground">Import the 16 default household bills</p>
          </div>
          {seeding ? <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </button>
        {seedMsg && (
          <p className="px-4 pb-3 text-xs text-emerald-400">{seedMsg}</p>
        )}
        <Divider />
        <button
          onClick={handleExport}
          disabled={exporting}
          className="w-full flex items-center gap-3 px-4 py-4 touch-target disabled:opacity-50"
        >
          <Download className="w-4 h-4 text-primary" />
          <div className="flex-1 text-left">
            <p className="text-sm font-medium">Export Payments CSV</p>
            <p className="text-xs text-muted-foreground">Download full payment history</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
      </Section>

      <p className="text-center text-xs text-muted-foreground pb-2">BillSplit · Free forever 💚</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2 px-1">{title}</h2>
      <div className="bg-card rounded-2xl border border-border overflow-hidden divide-y divide-border">
        {children}
      </div>
    </div>
  );
}

function Divider() {
  return <div className="border-t border-border" />;
}
