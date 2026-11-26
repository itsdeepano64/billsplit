"use client";

import { useState } from "react";
import { CalendarRange, ChevronDown, X } from "lucide-react";
import { RANGE_PRESETS, rangeForPreset, rangeLabel, ALL_TIME, type DateRange, type RangePreset } from "@/lib/expenses";

export default function RangeFilter({ value, onChange }: { value: DateRange; onChange: (r: DateRange) => void }) {
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState(value.preset === "custom" ? value.start ?? "" : "");
  const [end, setEnd] = useState(value.preset === "custom" ? value.end ?? "" : "");
  const active = value.preset !== "all";

  function pick(p: RangePreset) {
    if (p === "custom") return; // wait for dates
    onChange(rangeForPreset(p));
    setOpen(false);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className={`flex-1 flex items-center justify-between gap-2 rounded-xl px-4 py-3 text-sm border transition-all ${
            active ? "bg-primary/15 border-primary/40 text-primary" : "bg-card border-border text-foreground"
          }`}
        >
          <span className="flex items-center gap-2">
            <CalendarRange className="w-4 h-4" />
            <span className="font-semibold">{rangeLabel(value)}</span>
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            Filter <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
          </span>
        </button>
        {active && (
          <button
            type="button"
            onClick={() => { onChange(ALL_TIME); setStart(""); setEnd(""); setOpen(false); }}
            className="w-11 h-11 flex items-center justify-center rounded-xl bg-muted text-muted-foreground"
            aria-label="Clear filter"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {open && (
        <div className="bg-card border border-border rounded-2xl p-3 space-y-3 animate-fade-in">
          <div className="grid grid-cols-3 gap-2">
            {RANGE_PRESETS.filter(p => p.value !== "custom").map(p => (
              <button
                key={p.value}
                type="button"
                onClick={() => pick(p.value)}
                className={`py-2 px-1 rounded-xl text-xs font-semibold border ${
                  value.preset === p.value ? "bg-primary/20 border-primary text-primary" : "bg-muted border-border text-muted-foreground"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Custom range</p>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={start} onChange={e => setStart(e.target.value)}
                className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm" aria-label="Start date" />
              <input type="date" value={end} onChange={e => setEnd(e.target.value)}
                className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm" aria-label="End date" />
            </div>
            <button
              type="button"
              disabled={!start && !end}
              onClick={() => { onChange(rangeForPreset("custom", { start, end })); setOpen(false); }}
              className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-bold disabled:opacity-50"
            >
              Apply range
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
