"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { format, parseISO } from "date-fns";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { ArrowLeft, Download, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";
import type { Expense, ExpenseTab, Payer } from "@/lib/types";
import RangeFilter from "@/components/expenses/RangeFilter";
import {
  ALL_TIME, type DateRange, rangeLabel, inRange, getCurrentUser, visibleTabs, canSee, sum, vendorOf, toCsv,
} from "@/lib/expenses";

const COLORS = ["#818cf8", "#34d399", "#fbbf24", "#f87171", "#a78bfa", "#22d3ee", "#fb923c", "#f472b6", "#94a3b8"];
const ALL = "__all__";

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color?: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 text-xs shadow-xl">
      {label && <p className="font-semibold mb-1">{label}</p>}
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {formatCurrency(Number(p.value))}</p>
      ))}
    </div>
  );
}

function Card({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">{title}</p>
        {right}
      </div>
      {children}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-3 min-w-0">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
      <p className="text-base font-bold truncate">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground truncate">{sub}</p>}
    </div>
  );
}

export default function ExpenseStats() {
  const supabase = createClient();
  const params = useSearchParams();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [tabs, setTabs] = useState<ExpenseTab[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<Payer>("Deepen");
  const [tabId, setTabId] = useState<string>(params.get("tab") ?? ALL);
  const [range, setRange] = useState<DateRange>(ALL_TIME);

  useEffect(() => {
    setUser(getCurrentUser());
    (async () => {
      setLoading(true);
      const [{ data: t }, { data: e }] = await Promise.all([
        supabase.from("expense_tabs").select("*").order("position").order("created_at"),
        supabase.from("expenses").select("*").order("expense_date", { ascending: true }),
      ]);
      setTabs((t ?? []) as ExpenseTab[]);
      setExpenses(((e ?? []) as Expense[]).map(x => ({ ...x, amount: Number(x.amount) })));
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tabsById = useMemo(() => new Map(tabs.map(t => [t.id, t])), [tabs]);
  const myTabs = useMemo(() => visibleTabs(tabs, user), [tabs, user]);
  const visible = useMemo(() => expenses.filter(e => canSee(e, tabsById, user)), [expenses, tabsById, user]);
  const scoped = useMemo(() => tabId === ALL ? visible : visible.filter(e => e.tab_id === tabId), [visible, tabId]);
  const rows = useMemo(() => scoped.filter(e => inRange(e, range)), [scoped, range]);

  const total = sum(rows);
  const count = rows.length;
  const avg = count ? total / count : 0;

  const months = useMemo(() => {
    const m = new Map<string, { key: string; label: string; Deepen: number; DeShea: number }>();
    for (const e of rows) {
      const key = e.expense_date.slice(0, 7);
      if (!m.has(key)) m.set(key, { key, label: format(parseISO(key + "-01"), "MMM yy"), Deepen: 0, DeShea: 0 });
      m.get(key)![e.paid_by] += e.amount;
    }
    return Array.from(m.values()).sort((a, b) => a.key.localeCompare(b.key))
      .map(r => ({ ...r, Deepen: +r.Deepen.toFixed(2), DeShea: +r.DeShea.toFixed(2) }));
  }, [rows]);
  const avgPerMonth = months.length ? total / months.length : 0;

  const group = (keyFn: (e: Expense) => string) => {
    const m = new Map<string, { name: string; value: number; count: number }>();
    for (const e of rows) {
      const k = keyFn(e);
      const cur = m.get(k) ?? { name: k, value: 0, count: 0 };
      cur.value += e.amount; cur.count += 1;
      m.set(k, cur);
    }
    return Array.from(m.values()).map(r => ({ ...r, value: +r.value.toFixed(2) })).sort((a, b) => b.value - a.value);
  };
  const byCategory = useMemo(() => group(e => e.category || "Other"), [rows]); // eslint-disable-line react-hooks/exhaustive-deps
  const byVendor = useMemo(() => group(vendorOf).slice(0, 10), [rows]); // eslint-disable-line react-hooks/exhaustive-deps
  const byTab = useMemo(() => group(e => (e.tab_id && tabsById.get(e.tab_id)?.name) || "No tab"), [rows, tabsById]); // eslint-disable-line react-hooks/exhaustive-deps
  const byPerson = useMemo(() => group(e => e.paid_by), [rows]); // eslint-disable-line react-hooks/exhaustive-deps
  const biggest = useMemo(() => [...rows].sort((a, b) => b.amount - a.amount).slice(0, 10), [rows]);

  // Tax cards: YTD and last year for the 1099 and Tools tabs (name match).
  const year = new Date().getFullYear();
  const taxTabs = myTabs.filter(t => /1099|tool/i.test(t.name));
  const taxRows = taxTabs.map(t => {
    const list = visible.filter(e => e.tab_id === t.id);
    return {
      tab: t,
      ytd: sum(list.filter(e => e.expense_date.startsWith(String(year)))),
      lastYear: sum(list.filter(e => e.expense_date.startsWith(String(year - 1)))),
      count: list.filter(e => e.expense_date.startsWith(String(year))).length,
    };
  });

  function exportCsv() {
    const csv = toCsv(rows, tabsById);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const tabName = tabId === ALL ? "all" : (tabsById.get(tabId)?.name ?? "tab");
    a.href = url;
    a.download = `expenses-${tabName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="pb-6 max-w-lg mx-auto">
      <div className="sticky top-0 z-20 bg-background pt-6 pb-3 px-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/expenses" aria-label="Back" className="w-9 h-9 flex items-center justify-center rounded-full bg-muted">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-2xl font-bold tracking-tight">Expense Stats</h1>
          </div>
          <button onClick={exportCsv} disabled={!rows.length}
            className="flex items-center gap-1.5 bg-muted rounded-xl px-3 py-2 text-xs font-semibold disabled:opacity-50">
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {[{ id: ALL, name: "All" }, ...myTabs].map(t => (
            <button key={t.id} onClick={() => setTabId(t.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap ${tabId === t.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              {t.name}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 space-y-4">
        <RangeFilter value={range} onChange={setRange} />

        {loading ? (
          <div className="flex justify-center py-10"><RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            <div className="bg-card rounded-2xl border border-border p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total · {rangeLabel(range)}</p>
              <p className="text-3xl font-bold">{formatCurrency(total)}</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Purchases" value={String(count)} />
              <Stat label="Avg / purchase" value={formatCurrency(avg)} />
              <Stat label="Avg / month" value={formatCurrency(avgPerMonth)} sub={`${months.length} mo`} />
            </div>

            {taxRows.length > 0 && (
              <Card title={`Tax view · ${year}`}>
                <div className="space-y-2">
                  {taxRows.map(r => (
                    <div key={r.tab.id} className="flex items-center justify-between gap-3 text-sm">
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{r.tab.name}</p>
                        <p className="text-[11px] text-muted-foreground">{r.count} this year · {year - 1}: {formatCurrency(r.lastYear)}</p>
                      </div>
                      <p className="font-bold whitespace-nowrap">{formatCurrency(r.ytd)} <span className="text-[10px] text-muted-foreground font-normal">YTD</span></p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {count === 0 ? (
              <div className="bg-card rounded-2xl border border-border p-10 text-center text-sm text-muted-foreground">
                No expenses in this view.
              </div>
            ) : (
              <>
                <Card title="Spend over time">
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={months} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                        <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                        <Bar dataKey="Deepen" stackId="a" fill="#34d399" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="DeShea" stackId="a" fill="#818cf8" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <Card title="By category">
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={byCategory} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>
                          {byCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip content={<ChartTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                {tabId === ALL && byTab.length > 1 && (
                  <Card title="By tab"><BarList items={byTab} total={total} /></Card>
                )}

                <Card title="Top stores / vendors"><BarList items={byVendor} total={total} showCount /></Card>

                <Card title="By person"><BarList items={byPerson} total={total} showCount /></Card>

                <Card title="Biggest purchases">
                  <div className="divide-y divide-border">
                    {biggest.map(e => (
                      <div key={e.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{e.description}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {format(parseISO(e.expense_date), "MMM d, yyyy")} · {e.paid_by}
                          </p>
                        </div>
                        <p className="font-bold whitespace-nowrap">{formatCurrency(e.amount)}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function BarList({ items, total, showCount }: { items: { name: string; value: number; count: number }[]; total: number; showCount?: boolean }) {
  return (
    <div className="space-y-2.5">
      {items.map((it, i) => (
        <div key={it.name} className="space-y-1">
          <div className="flex justify-between gap-3 text-xs">
            <span className="truncate">{it.name}{showCount ? <span className="text-muted-foreground"> · {it.count}</span> : null}</span>
            <span className="font-semibold whitespace-nowrap">{formatCurrency(it.value)}</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${total ? (it.value / total) * 100 : 0}%`, background: COLORS[i % COLORS.length] }} />
          </div>
        </div>
      ))}
    </div>
  );
}
