"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
  PieChart,
  Pie,
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
  "#6366f1", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#06b6d4", "#f97316", "#ec4899",
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

export default function ReportsClient({
  monthlyData,
  categoryBreakdown,
}: {
  monthlyData: MonthlyData[];
  categoryBreakdown: CategoryData[];
}) {
  return (
    <div className="space-y-6">
      {/* Monthly bar chart */}
      <div className="bg-card rounded-2xl border border-border p-4">
        <h2 className="text-sm font-semibold mb-4">Monthly Breakdown</h2>
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
            <Bar dataKey="deshea" name="DeShea" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Bar dataKey="deepen" name="Deepen" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Category breakdown */}
      {categoryBreakdown.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-4">
          <h2 className="text-sm font-semibold mb-4">This Month by Category</h2>

          {/* Pie chart */}
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={categoryBreakdown}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={75}
                innerRadius={40}
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

          {/* Category list */}
          <div className="space-y-2 mt-3">
            {categoryBreakdown.map((cat, i) => (
              <div key={cat.name} className="flex items-center gap-3">
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
                />
                <p className="text-sm flex-1 text-muted-foreground">{cat.name}</p>
                <p className="text-sm font-semibold">{formatCurrency(cat.value)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {categoryBreakdown.length === 0 && (
        <div className="bg-card rounded-2xl border border-border p-8 text-center">
          <p className="text-3xl mb-2">📊</p>
          <p className="text-sm text-muted-foreground">No payments recorded this month yet</p>
        </div>
      )}
    </div>
  );
}
