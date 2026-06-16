"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Transfer } from "@/lib/types";
import { Plus, X, ArrowRight, Trash2 } from "lucide-react";

interface Props { transfers: Transfer[]; }

const METHODS = ["OnePay", "Bank Transfer", "Apple Pay", "Cash"] as const;

export default function TransfersClient({ transfers }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [direction, setDirection] = useState<"DeShea→Deepen" | "Deepen→DeShea">("DeShea→Deepen");
  const [method, setMethod] = useState<typeof METHODS[number]>("OnePay");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("transfers").insert({
        user_id: user.id, amount: parseFloat(amount), transfer_date: date,
        direction, method, notes: notes.trim() || null,
      });
      setShowForm(false);
      setAmount(""); setDate(new Date().toISOString().split("T")[0]);
      setDirection("DeShea→Deepen"); setMethod("OnePay"); setNotes("");
      router.refresh();
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this transfer?")) return;
    await supabase.from("transfers").delete().eq("id", id);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => setShowForm(true)}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm transition-all active:scale-[0.98]"
      >
        <Plus className="w-5 h-5" /> Log Transfer
      </button>

      {transfers.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-10 text-center space-y-2">
          <p className="text-3xl">💸</p>
          <p className="font-semibold">No transfers yet</p>
          <p className="text-sm text-muted-foreground">Log money moving between you two</p>
        </div>
      ) : (
        <div className="space-y-2">
          {transfers.map((t) => {
            const [from, to] = t.direction.split("→");
            const isDeShea = from === "DeShea";
            return (
              <div key={t.id} className="bg-card rounded-2xl border border-border px-4 py-3 flex items-center gap-3">
                <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-lg ${isDeShea ? "bg-indigo-500/15" : "bg-emerald-500/15"}`}>
                  {isDeShea ? "💜" : "💚"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs font-bold ${isDeShea ? "text-indigo-400" : "text-emerald-400"}`}>{from}</span>
                    <ArrowRight className="w-3 h-3 text-muted-foreground" />
                    <span className={`text-xs font-bold ${to === "DeShea" ? "text-indigo-400" : "text-emerald-400"}`}>{to}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">{t.method}</span>
                    <span className="text-xs text-muted-foreground">{formatDate(t.transfer_date)}</span>
                  </div>
                  {t.notes && <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{t.notes}</p>}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <p className="font-bold text-sm">{formatCurrency(t.amount)}</p>
                  <button onClick={() => handleDelete(t.id)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Log Transfer Modal — keyboard-safe sheet */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div
            className="relative w-full max-w-lg bg-card rounded-t-3xl border-t border-x border-border flex flex-col animate-fade-in"
            style={{ maxHeight: "92dvh" }}
          >
            {/* Handle + header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
              <div className="w-10 h-1 bg-white/20 rounded-full absolute top-3 left-1/2 -translate-x-1/2" />
              <h2 className="text-lg font-bold">Log Transfer</h2>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-muted">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable form body */}
            <div className="overflow-y-auto px-5 flex-1" style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}>
              <form onSubmit={handleSubmit} className="space-y-4 pb-2">
                {/* Amount */}
                <div className="space-y-1.5">
                  <label className={labelCls}>Amount</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">$</span>
                    <input type="number" step="0.01" min="0.01" required value={amount}
                      onChange={(e) => setAmount(e.target.value)} placeholder="0.00"
                      className="w-full bg-muted border border-border rounded-xl pl-8 pr-4 py-4 text-foreground text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                </div>

                {/* Direction */}
                <div className="space-y-1.5">
                  <label className={labelCls}>Direction</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["DeShea→Deepen", "Deepen→DeShea"] as const).map((d) => {
                      const [from, to] = d.split("→");
                      const active = direction === d;
                      const isFromDeShea = from === "DeShea";
                      return (
                        <button key={d} type="button" onClick={() => setDirection(d)}
                          className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-semibold transition-all ${
                            active
                              ? isFromDeShea ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-300" : "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
                              : "bg-muted border-border text-muted-foreground"
                          }`}>
                          <div className="flex items-center gap-1">
                            <span>{isFromDeShea ? "💜" : "💚"}</span>
                            <ArrowRight className="w-3 h-3" />
                            <span>{isFromDeShea ? "💚" : "💜"}</span>
                          </div>
                          <span>{from} → {to}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Date */}
                <div className="space-y-1.5">
                  <label className={labelCls}>Date</label>
                  <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
                </div>

                {/* Method */}
                <div className="space-y-1.5">
                  <label className={labelCls}>Method</label>
                  <select value={method} onChange={(e) => setMethod(e.target.value as typeof METHODS[number])} className={inputCls}>
                    {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <label className={labelCls}>Notes / Reason</label>
                  <input value={notes} onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Splitting rent this month" className={inputCls} />
                </div>

                <button type="submit" disabled={saving}
                  className="w-full bg-primary text-primary-foreground rounded-xl py-4 font-semibold disabled:opacity-50 transition-all active:scale-[0.98]">
                  {saving ? "Saving…" : "Log Transfer"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const labelCls = "text-xs font-medium text-muted-foreground uppercase tracking-wide";
const inputCls = "w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50";
