"use client";

import { useState, useRef, useEffect } from "react";
import {
  MoreVertical, Pencil, Trash2, CalendarDays, DollarSign,
  Clock, X, Loader2, CheckCircle2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { Bill } from "@/lib/types";
import { BillModal } from "./AddBillButton";
import { formatCurrency, formatDate } from "@/lib/utils";
import { format, parseISO } from "date-fns";

export default function BillActions({ bill }: { bill: Bill }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [modal, setModal] = useState<"edit" | "due-date" | "balance" | "history" | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = createClient();

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    function handle(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [menuOpen]);

  function open(m: typeof modal) {
    setModal(m);
    setMenuOpen(false);
  }

  async function handleDelete() {
    if (!confirm(`Delete "${bill.name}"? This won't delete payment history.`)) return;
    setMenuOpen(false);
    await supabase.from("bills").delete().eq("id", bill.id);
    router.refresh();
  }

  const MENU_ITEMS = [
    { label: "Edit Bill", icon: Pencil, action: () => open("edit"), color: "" },
    { label: "Edit Due Date", icon: CalendarDays, action: () => open("due-date"), color: "" },
    { label: "Update Balance", icon: DollarSign, action: () => open("balance"), color: "" },
    { label: "Payment History", icon: Clock, action: () => open("history"), color: "" },
    { label: "Delete Bill", icon: Trash2, action: handleDelete, color: "text-destructive" },
  ];

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="w-8 h-8 flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted active:bg-muted transition-colors"
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-9 z-50 bg-popover border border-border rounded-2xl shadow-xl overflow-hidden min-w-[180px]">
            {MENU_ITEMS.map(({ label, icon: Icon, action, color }, i) => (
              <button
                key={label}
                onClick={action}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-accent transition-colors ${color} ${
                  i < MENU_ITEMS.length - 1 ? "border-b border-border/50" : ""
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0 opacity-70" />
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {modal === "edit" && (
        <BillModal existing={bill} onClose={() => setModal(null)} />
      )}
      {modal === "due-date" && (
        <EditDueDateModal bill={bill} onClose={() => setModal(null)} />
      )}
      {modal === "balance" && (
        <UpdateBalanceModal bill={bill} onClose={() => setModal(null)} />
      )}
      {modal === "history" && (
        <BillHistoryModal bill={bill} onClose={() => setModal(null)} />
      )}
    </>
  );
}

// ─── Edit Due Date Modal ──────────────────────────────────────────────────────

function EditDueDateModal({ bill, onClose }: { bill: Bill; onClose: () => void }) {
  const supabase = createClient();
  const router = useRouter();
  const [date, setDate] = useState(bill.next_due_date);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!date) { setError("Please select a date"); return; }
    setLoading(true);
    setError(null);
    try {
      const { error: e } = await supabase
        .from("bills")
        .update({ next_due_date: date })
        .eq("id", bill.id);
      if (e) throw e;
      router.refresh();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet title="Edit Due Date" subtitle={bill.name} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-xs text-white/50 leading-relaxed">
          This is a one-time change for the current cycle only. After this bill is paid,
          it will return to the usual due day ({bill.due_day}{ordinal(bill.due_day)} of each month).
        </p>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-white/40 uppercase tracking-wider">
            New Due Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-white/30"
          />
        </div>
        {error && <p className="text-sm text-red-400 bg-red-500/10 rounded-xl px-4 py-3">{error}</p>}
        <SheetButton onClick={handleSave} loading={loading} color="bg-primary">
          Save Due Date
        </SheetButton>
      </div>
    </Sheet>
  );
}

// ─── Update Balance Modal ─────────────────────────────────────────────────────

function UpdateBalanceModal({ bill, onClose }: { bill: Bill; onClose: () => void }) {
  const supabase = createClient();
  const router = useRouter();
  const [balance, setBalance] = useState(
    bill.current_balance != null ? bill.current_balance.toString() : ""
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    const parsed = parseFloat(balance);
    if (isNaN(parsed) || parsed < 0) { setError("Enter a valid balance (0 or more)"); return; }
    setLoading(true);
    setError(null);
    try {
      const { error: e } = await supabase
        .from("bills")
        .update({ current_balance: parsed })
        .eq("id", bill.id);
      if (e) throw e;
      router.refresh();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleClear() {
    setLoading(true);
    await supabase.from("bills").update({ current_balance: null }).eq("id", bill.id);
    router.refresh();
    onClose();
  }

  return (
    <Sheet title="Update Balance" subtitle={bill.name} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-xs text-white/50 leading-relaxed">
          Set the current outstanding balance. Useful for credit cards that change throughout the month.
        </p>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-white/40 uppercase tracking-wider">
            Current Balance
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 font-semibold text-lg">$</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              placeholder="0.00"
              className="w-full bg-white/10 border border-white/10 rounded-xl pl-9 pr-4 py-4 text-white text-xl font-bold focus:outline-none focus:border-white/30"
            />
          </div>
        </div>
        {error && <p className="text-sm text-red-400 bg-red-500/10 rounded-xl px-4 py-3">{error}</p>}
        <SheetButton onClick={handleSave} loading={loading} color="bg-primary">
          Save Balance
        </SheetButton>
        {bill.current_balance != null && (
          <button
            onClick={handleClear}
            className="w-full py-3 rounded-xl text-sm text-white/40 hover:text-white/60 transition-colors"
          >
            Clear balance
          </button>
        )}
      </div>
    </Sheet>
  );
}

// ─── Bill Payment History Modal ───────────────────────────────────────────────

function BillHistoryModal({ bill, onClose }: { bill: Bill; onClose: () => void }) {
  const supabase = createClient();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("payments")
      .select("*")
      .eq("bill_id", bill.id)
      .order("paid_date", { ascending: false })
      .limit(10)
      .then(({ data }) => {
        setPayments(data ?? []);
        setLoading(false);
      });
  }, [bill.id]);

  return (
    <Sheet title="Payment History" subtitle={bill.name} onClose={onClose}>
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-white/40" />
        </div>
      ) : payments.length === 0 ? (
        <div className="text-center py-8 text-white/40 text-sm">No payments recorded yet</div>
      ) : (
        <div className="space-y-2">
          {payments.map((p) => (
            <div key={p.id} className="bg-white/5 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">
                  {p.paid_by === "DeShea" ? "💜" : "💚"} {p.paid_by}
                </p>
                <p className="text-xs text-white/40 mt-0.5">
                  {format(parseISO(p.paid_date), "MMM d, yyyy")}
                  {p.notes ? ` · ${p.notes}` : ""}
                </p>
              </div>
              <p className="font-bold text-white flex-shrink-0">{formatCurrency(p.amount_paid)}</p>
            </div>
          ))}
        </div>
      )}
    </Sheet>
  );
}

// ─── Shared Sheet + Button Primitives ────────────────────────────────────────

function Sheet({
  title, subtitle, onClose, children,
}: {
  title: string; subtitle: string; onClose: () => void; children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[200]" style={{ isolation: "isolate" }}>
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div
        className="absolute left-0 right-0 bottom-0 bg-[#1c1c1e] rounded-t-3xl border-t border-x border-white/10"
        style={{ paddingBottom: "calc(80px + env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </div>
        <div className="flex items-center justify-between px-5 py-3">
          <div>
            <h2 className="text-lg font-bold text-white">{title}</h2>
            <p className="text-sm text-white/50">{subtitle}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 pb-2 space-y-4" style={{ maxHeight: "55vh" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function SheetButton({
  onClick, loading, color, children,
}: {
  onClick: () => void; loading: boolean; color: string; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`w-full py-4 rounded-xl font-bold text-white text-base disabled:opacity-50 active:scale-[0.98] transition-all ${color}`}
    >
      {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : children}
    </button>
  );
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
