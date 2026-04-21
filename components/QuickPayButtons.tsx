"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { advanceDueDate } from "@/lib/utils";
import type { Bill, Payer } from "@/lib/types";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";

interface QuickPayButtonsProps {
  bill: Bill;
}

export default function QuickPayButtons({ bill }: QuickPayButtonsProps) {
  const [paying, setPaying] = useState<Payer | null>(null);
  const [justPaid, setJustPaid] = useState<Payer | null>(null);
  const router = useRouter();
  const supabase = createClient();

  async function markPaid(payer: Payer) {
    if (paying) return;
    setPaying(payer);

    try {
      const today = new Date().toISOString().split("T")[0];
      const nextDue = advanceDueDate(bill.next_due_date, bill.frequency);

      // Insert payment record
      const { error: payError } = await supabase.from("payments").insert({
        bill_id: bill.id,
        paid_by: payer,
        paid_date: today,
        amount_paid: bill.amount,
        notes: null,
      });

      if (payError) throw payError;

      // Advance bill's next_due_date
      const { error: billError } = await supabase
        .from("bills")
        .update({ next_due_date: nextDue })
        .eq("id", bill.id);

      if (billError) throw billError;

      setJustPaid(payer);
      setTimeout(() => {
        setJustPaid(null);
        router.refresh();
      }, 1500);
    } catch (err) {
      console.error("Payment error:", err);
    } finally {
      setPaying(null);
    }
  }

  if (justPaid) {
    return (
      <div className="px-4 pb-4 pt-1">
        <div className="flex items-center justify-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl py-3 text-emerald-400 text-sm font-semibold">
          <CheckCircle2 className="w-4 h-4" />
          Paid by {justPaid}!
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pb-4 pt-1 grid grid-cols-2 gap-2">
      <PayButton
        label="PAID BY DeShea"
        payer="DeShea"
        loading={paying === "DeShea"}
        disabled={!!paying}
        color="indigo"
        onClick={() => markPaid("DeShea")}
      />
      <PayButton
        label="PAID BY Deepen"
        payer="Deepen"
        loading={paying === "Deepen"}
        disabled={!!paying}
        color="emerald"
        onClick={() => markPaid("Deepen")}
      />
    </div>
  );
}

function PayButton({
  label,
  payer,
  loading,
  disabled,
  color,
  onClick,
}: {
  label: string;
  payer: Payer;
  loading: boolean;
  disabled: boolean;
  color: "indigo" | "emerald";
  onClick: () => void;
}) {
  const colorClasses =
    color === "indigo"
      ? "bg-indigo-500/15 border-indigo-500/30 text-indigo-300 active:bg-indigo-500/25"
      : "bg-emerald-500/15 border-emerald-500/30 text-emerald-300 active:bg-emerald-500/25";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        touch-target flex items-center justify-center gap-1.5
        border rounded-xl py-3 px-2
        text-xs font-bold uppercase tracking-wide
        transition-all active:scale-[0.97]
        disabled:opacity-50 disabled:cursor-not-allowed
        ${colorClasses}
      `}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <>
          <span className="text-base leading-none">{color === "indigo" ? "💜" : "💚"}</span>
          <span className="leading-tight text-[11px]">{label}</span>
        </>
      )}
    </button>
  );
}
