"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

interface MonthlyData {
  month: string;
  label: string;
  total: number;
  deshea: number;
  deepen: number;
}

interface CategoryData {
  name: string;
  value: number;
}

const CATEGORY_COLORS = [
  "#818cf8", "#34d399", "#fbbf24", "#f87171",
  "#a78bfa", "#22d3ee", "#fb923c", "#f472b6",
];

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  );
}

export default function StatsClient({
  monthlyData,
  categoryBreakdown,
  thisMonthTotal,
  thisMonthByDeShea,
  thisMonthByDeepen,
}: {
  monthlyData: MonthlyData[];
  categoryBreakdown: CategoryData[];
  thisMonthTotal: number;
  thisMonthByDeShea: number;
  thisMonthByDeepen: number;
}) {
  const currentMonthLabel = monthlyData[monthlyData.length - 1]?.label ?? "";

  return (
    <div className="space-y-4">

      {/* This month summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card rounded-2xl border border-border p-3 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Total</p>
          <p className="text-base font-black">{formatCurrency(thisMonthTotal)}</p>
        </div>
        <div className="bg-card rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-3 text-center">
          <p className="text-[10px] text-indigo-400/70 uppercase tracking-wide mb-1">💜 DeShea</p>
          <p className="text-base font-black text-indigo-300">{formatCurrency(thisMonthByDeShea)}</p>
        </div>
        <div className="bg-card rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-center">
          <p className="text-[10px] text-emerald-400/70 uppercase tracking-wide mb-1">💚 Deepen</p>
          <p className="text-base font-black text-emerald-300">{formatCurrency(thisMonthByDeepen)}</p>
        </div>
      </div>

      {/* Monthly bar chart */}
      <div className="bg-card rounded-2xl border border-border p-4">
        <h2 className="text-sm font-semibold mb-1">6-Month Breakdown</h2>
        <p className="text-xs text-muted-foreground mb-4">Bill payments by person</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={monthlyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="month"
              tick={{ fill: "#71717a", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#71717a", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `$${Math.round(v / 100) * 100}`}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
            <Legend
              formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>}
            />
            <Bar dataKey="deshea" name="DeShea" fill="#818cf8" radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Bar dataKey="deepen" name="Deepen" fill="#34d399" radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Category breakdown */}
      {categoryBreakdown.length > 0 ? (
        <div className="bg-card rounded-2xl border border-border p-4">
          <h2 className="text-sm font-semibold mb-1">This Month by Category</h2>
          <p className="text-xs text-muted-foreground mb-4">{currentMonthLabel}</p>

          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={categoryBreakdown}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={75}
                innerRadius={42}
                paddingAngle={3}
              >
                {categoryBreakdown.map((_, i) => (
                  <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{
                  background: "hsl(240 6% 10%)",
                  border: "1px solid hsl(240 6% 16%)",
                  borderRadius: "12px",
                  fontSize: "12px",
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          <div className="space-y-2 mt-3">
            {categoryBreakdown.map((cat, i) => (
              <div key={cat.name} className="flex items-center gap-3">
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
                />
                <p className="text-sm flex-1 text-muted-foreground">{cat.name}</p>
                <p className="text-sm font-semibold">{formatCurrency(cat.value)}</p>
                <p className="text-xs text-muted-foreground w-10 text-right">
                  {thisMonthTotal > 0 ? Math.round((cat.value / thisMonthTotal) * 100) : 0}%
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border p-8 text-center">
          <p className="text-3xl mb-2">📊</p>
          <p className="text-sm text-muted-foreground">No payments recorded this month yet</p>
        </div>
      )}
    </div>
  );
}
