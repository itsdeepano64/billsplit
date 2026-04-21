"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { advanceDueDate, formatCurrency } from "@/lib/utils";
import type { Bill, Payer } from "@/lib/types";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, X } from "lucide-react";
import { format, addWeeks } from "date-fns";

const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

export default function QuickPayButtons({ bill }: { bill: Bill }) {
  const [sheet, setSheet] = useState<Payer | null>(null);
  const [justPaid, setJustPaid] = useState(false);

  if (justPaid) {
    return (
      <div className="px-4 pb-4 pt-1">
        <div className="flex items-center justify-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl py-3 text-emerald-400 text-sm font-semibold">
          <CheckCircle2 className="w-4 h-4" />
          Payment recorded!
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="px-4 pb-4 pt-1 grid grid-cols-2 gap-2">
        <button onClick={() => setSheet("DeShea")}
          className="min-h-[48px] flex items-center justify-center gap-1.5 border rounded-xl py-3 px-2 text-xs font-bold uppercase tracking-wide active:scale-[0.97] bg-indigo-500/15 border-indigo-500/30 text-indigo-300">
          <span className="text-base">💜</span>
          <span className="text-[11px] leading-tight">PAID BY DeShea</span>
        </button>
        <button onClick={() => setSheet("Deepen")}
          className="min-h-[48px] flex items-center justify-center gap-1.5 border rounded-xl py-3 px-2 text-xs font-bold uppercase tracking-wide active:scale-[0.97] bg-emerald-500/15 border-emerald-500/30 text-emerald-300">
          <span className="text-base">💚</span>
          <span className="text-[11px] leading-tight">PAID BY Deepen</span>
        </button>
      </div>
      {sheet && (
        <PaySheet bill={bill} payer={sheet}
          onClose={() => setSheet(null)}
          onSuccess={() => { setSheet(null); setJustPaid(true); }} />
      )}
    </>
  );
}

function PaySheet({ bill, payer, onClose, onSuccess }: {
  bill: Bill; payer: Payer; onClose: () => void; onSuccess: () => void;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [amount, setAmount] = useState(bill.amount.toString());
  const [notes, setNotes] = useState("");
  const [split, setSplit] = useState(false);
  const [weeks, setWeeks] = useState(4);
  const [startDay, setStartDay] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isIndigo = payer === "DeShea";

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    try {
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) throw new Error("Enter a valid amount");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (split) {
        const weeklyAmount = Math.round((parsedAmount / weeks) * 100) / 100;
        const splitGroupId = crypto.randomUUID();
        const payments = Array.from({ length: weeks }, (_, i) => ({
          user_id: user.id,
          bill_id: bill.id,
          paid_by: payer,
          paid_date: format(addWeeks(today, i), "yyyy-MM-dd"),
          amount_paid: weeklyAmount,
          notes: notes || null,
          weekly_split: true,
          split_group_id: splitGroupId,
        }));
        const { error: e } = await supabase.from("payments").insert(payments);
        if (e) throw e;
      } else {
        const { error: e } = await supabase.from("payments").insert({
          user_id: user.id,
          bill_id: bill.id,
          paid_by: payer,
          paid_date: format(today, "yyyy-MM-dd"),
          amount_paid: parsedAmount,
          notes: notes || null,
          weekly_split: false,
          split_group_id: null,
        });
        if (e) throw e;
      }

      const nextDue = advanceDueDate(bill.next_due_date, bill.frequency);
      await supabase.from("bills").update({ next_due_date: nextDue }).eq("id", bill.id);
      router.refresh();
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    // Portal-style: fixed inset-0, sheet positioned bottom with padding for nav bar
    <div className="fixed inset-0 z-[200]" style={{ isolation: "isolate" }}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      {/* Sheet — sits above nav bar (nav is ~65px + safe area) */}
      <div
        className="absolute left-0 right-0 bottom-0 bg-[#1c1c1e] rounded-t-3xl border-t border-x border-white/10"
        style={{ paddingBottom: "calc(80px + env(safe-area-inset-bottom, 0px))" }}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3">
          <div>
            <h2 className="text-lg font-bold text-white">{isIndigo ? "💜" : "💚"} Paid by {payer}</h2>
            <p className="text-sm text-white/50">{bill.name}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Scrollable form body */}
        <div className="overflow-y-auto px-5 space-y-4" style={{ maxHeight: "55vh" }}>

          {/* Amount */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-white/40 uppercase tracking-wider">Amount Paid</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 font-semibold text-lg">$</span>
              <input
                type="number" step="0.01" min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-white/10 border border-white/10 rounded-xl pl-9 pr-4 py-4 text-white text-xl font-bold focus:outline-none focus:border-white/30"
              />
            </div>
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-white/40 uppercase tracking-wider">Note (optional)</label>
            <input
              type="text" value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Paid early, partial..."
              className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-white/30 placeholder:text-white/25"
            />
          </div>

          {/* Weekly split */}
          <div className="bg-white/5 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">Split into weekly payments</p>
                <p className="text-xs text-white/40">Creates separate records each week</p>
              </div>
              <button
                onClick={() => setSplit(!split)}
                className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0 ${split ? (isIndigo ? "bg-indigo-500" : "bg-emerald-500") : "bg-white/20"}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${split ? "translate-x-6" : "translate-x-0.5"}`} />
              </button>
            </div>
            {split && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-white/40 uppercase tracking-wider">Weeks</label>
                  <div className="flex gap-2">
                    {[2,3,4,6,8].map((w) => (
                      <button key={w} onClick={() => setWeeks(w)}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${weeks === w ? (isIndigo ? "bg-indigo-500 text-white" : "bg-emerald-500 text-white") : "bg-white/10 text-white/50"}`}>
                        {w}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-white/40 uppercase tracking-wider">Payment Day</label>
                  <select value={startDay} onChange={(e) => setStartDay(parseInt(e.target.value))}
                    className="w-full bg-white/10 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none">
                    {DAY_NAMES.map((d, i) => <option key={i} value={i}>{d}</option>)}
                  </select>
                </div>
                <p className="text-xs text-white/40">{formatCurrency(parseFloat(amount||"0")/weeks)} × {weeks} weeks</p>
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-400 bg-red-500/10 rounded-xl px-4 py-3">{error}</p>}

          {/* Confirm button inside scroll area, above padding */}
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={`w-full py-4 rounded-xl font-bold text-white text-base mb-2 disabled:opacity-50 active:scale-[0.98] transition-all ${isIndigo ? "bg-indigo-500" : "bg-emerald-500"}`}
          >
            {loading
              ? <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              : `Confirm Payment · ${formatCurrency(parseFloat(amount||"0"))}`
            }
          </button>
        </div>
      </div>
    </div>
  );
}
