"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import PaymentHistoryClient from "./PaymentHistoryClient";
import TransfersClient from "./TransfersClient";
import StatsClient from "./StatsClient";
import type { Transfer } from "@/lib/types";

type Tab = "payments" | "transfers" | "stats";

interface Props {
  initialTab: Tab;
  payments: any[];
  bills: { id: string; name: string }[];
  months: { value: string; label: string }[];
  filters: { month?: string; payer?: string; bill?: string };
  transfers: Transfer[];
  monthlyData: { month: string; label: string; total: number; deshea: number; deepen: number }[];
  categoryBreakdown: { name: string; value: number }[];
  thisMonthTotal: number;
  thisMonthByDeShea: number;
  thisMonthByDeepen: number;
}

const TABS: { key: Tab; label: string; emoji: string }[] = [
  { key: "payments",  label: "Payments",  emoji: "🧾" },
  { key: "transfers", label: "Transfers", emoji: "💸" },
  { key: "stats",     label: "Stats",     emoji: "📊" },
];

export default function HistoryTabsClient({
  initialTab,
  payments,
  bills,
  months,
  filters,
  transfers,
  monthlyData,
  categoryBreakdown,
  thisMonthTotal,
  thisMonthByDeShea,
  thisMonthByDeepen,
}: Props) {
  const [tab, setTab] = useState<Tab>(initialTab);

  // Update URL silently — no router.push, no server re-render, instant switching
  function switchTab(t: Tab) {
    setTab(t);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", t);
    window.history.replaceState(null, "", url.toString());
  }

  const totalPayments = payments.reduce((s, p) => s + p.amount_paid, 0);

  return (
    <div className="space-y-4">
      {/* Sub-tab bar */}
      <div className="flex bg-muted rounded-2xl p-1 gap-1">
        {TABS.map(({ key, label, emoji }) => (
          <button
            key={key}
            onClick={() => switchTab(key)}
            className={[
              "flex-1 flex flex-col items-center gap-0.5 py-2.5 rounded-xl text-xs font-semibold",
              tab === key
                ? "bg-card border border-border text-foreground shadow-sm"
                : "text-muted-foreground",
            ].join(" ")}
          >
            <span className="text-base leading-none">{emoji}</span>
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Tab panels — all rendered, only the active one is visible.
          This avoids remounting on every tab switch (no layout flash, no recharts re-init). */}
      <div className={tab === "payments" ? undefined : "hidden"}>
        <p className="text-sm text-muted-foreground mb-4">
          {payments.length} payments · {formatCurrency(totalPayments)}
        </p>
        <PaymentHistoryClient
          payments={payments}
          bills={bills}
          months={months}
          filters={filters}
        />
      </div>

      <div className={tab === "transfers" ? undefined : "hidden"}>
        <p className="text-sm text-muted-foreground mb-4">
          {transfers.length} transfer{transfers.length !== 1 ? "s" : ""} logged
        </p>
        <TransfersClient transfers={transfers} />
      </div>

      <div className={tab === "stats" ? undefined : "hidden"}>
        <StatsClient
          monthlyData={monthlyData}
          categoryBreakdown={categoryBreakdown}
          thisMonthTotal={thisMonthTotal}
          thisMonthByDeShea={thisMonthByDeShea}
          thisMonthByDeepen={thisMonthByDeepen}
        />
      </div>
    </div>
  );
}
