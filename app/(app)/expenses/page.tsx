"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";
import { format, endOfMonth, subMonths } from "date-fns";
import {
  Trash2, RefreshCw, Plus, X, Camera, Image as ImageIcon,
  ChevronRight, Eye, Check, Pencil, MoreHorizontal,
} from "lucide-react";
import type { ExpenseTab, Expense, Payer } from "@/lib/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const EXPENSE_CATEGORIES = [
  "Groceries", "Gas", "Dining Out", "Home & Supplies",
  "Medical", "Personal", "Entertainment", "Clothing", "Other",
];

const CATEGORY_EMOJIS: Record<string, string> = {
  "Groceries": "🛒", "Gas": "⛽", "Dining Out": "🍽️",
  "Home & Supplies": "🏠", "Medical": "💊", "Personal": "👤",
  "Entertainment": "🎬", "Clothing": "👕", "Other": "📦",
};

// Synthetic "All" tab id
const ALL_TAB_ID = "__all__";
const ALL_TAB: ExpenseTab = {
  id: ALL_TAB_ID, user_id: "", name: "All", owner: "shared", position: -1, created_at: "",
};

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function ExpensesPage() {
  const supabase = createClient();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [tabs, setTabs] = useState<ExpenseTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>(ALL_TAB_ID);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [currentUser, setCurrentUser] = useState<Payer>("DeShea");
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddTab, setShowAddTab] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [showTabMenu, setShowTabMenu] = useState<string | null>(null);

  const months = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(new Date(), i);
    return { value: format(d, "yyyy-MM"), label: format(d, "MMMM yyyy") };
  });

  useEffect(() => {
    const u = (localStorage.getItem("current_user") ?? "DeShea") as Payer;
    setCurrentUser(u);
  }, []);

  const fetchTabs = useCallback(async () => {
    const { data } = await supabase
      .from("expense_tabs")
      .select("*")
      .order("position", { ascending: true })
      .order("created_at", { ascending: true });
    setTabs(data ?? []);
  }, []);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    const [year, month] = selectedMonth.split("-");
    const start = `${year}-${month}-01`;
    const end = format(endOfMonth(new Date(parseInt(year), parseInt(month) - 1)), "yyyy-MM-dd");

    let q = supabase
      .from("expenses")
      .select("*")
      .gte("expense_date", start)
      .lte("expense_date", end)
      .order("expense_date", { ascending: false });

    if (activeTabId !== ALL_TAB_ID) {
      q = q.eq("tab_id", activeTabId);
    }

    const { data } = await q;
    setExpenses((data ?? []) as Expense[]);
    setLoading(false);
  }, [selectedMonth, activeTabId]);

  useEffect(() => { fetchTabs(); }, [fetchTabs]);
  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this expense?")) return;
    await supabase.from("expenses").delete().eq("id", id);
    fetchExpenses();
  }

  async function handleDeleteTab(tabId: string) {
    if (!confirm("Delete this tab? Expenses in it will be moved to 'All'.")) return;
    await supabase.from("expense_tabs").delete().eq("id", tabId);
    if (activeTabId === tabId) setActiveTabId(ALL_TAB_ID);
    fetchTabs();
    fetchExpenses();
  }

  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const byDeshea = expenses.filter(e => e.paid_by === "DeShea").reduce((s, e) => s + e.amount, 0);
  const byDeepen = expenses.filter(e => e.paid_by === "Deepen").reduce((s, e) => s + e.amount, 0);

  const allDisplayTabs = [ALL_TAB, ...tabs];
  const activeTab = allDisplayTabs.find(t => t.id === activeTabId) ?? ALL_TAB;

  return (
    <div className="pb-4 max-w-lg mx-auto">

      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-background pt-6 pb-3 px-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold tracking-tight">Expenses</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchExpenses}
              disabled={loading}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-muted text-muted-foreground disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={() => setShowAddExpense(true)}
              className="flex items-center gap-2 bg-primary/15 border border-primary/30 text-primary rounded-xl px-4 py-2.5 text-sm font-semibold active:scale-[0.97] transition-all"
            >
              <Plus className="w-4 h-4" strokeWidth={2.5} />
              Add
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
          {allDisplayTabs.map((tab) => (
            <div key={tab.id} className="relative flex-shrink-0">
              <button
                onClick={() => setActiveTabId(tab.id)}
                className={[
                  "px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all",
                  activeTabId === tab.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground",
                ].join(" ")}
              >
                {tab.name}
              </button>
              {tab.id !== ALL_TAB_ID && activeTabId === tab.id && (
                <button
                  onClick={() => setShowTabMenu(showTabMenu === tab.id ? null : tab.id)}
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-muted border border-border flex items-center justify-center"
                >
                  <MoreHorizontal className="w-3 h-3 text-muted-foreground" />
                </button>
              )}
              {showTabMenu === tab.id && (
                <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-xl shadow-xl z-30 overflow-hidden min-w-[140px]">
                  <button
                    onClick={() => { handleDeleteTab(tab.id); setShowTabMenu(null); }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Tab
                  </button>
                </div>
              )}
            </div>
          ))}
          <button
            onClick={() => setShowAddTab(true)}
            className="flex-shrink-0 px-3 py-2 rounded-xl text-sm font-semibold text-muted-foreground bg-muted/50 border border-dashed border-border whitespace-nowrap"
          >
            + Tab
          </button>
        </div>
      </div>

      {/* Click-away for tab menu */}
      {showTabMenu && (
        <div className="fixed inset-0 z-20" onClick={() => setShowTabMenu(null)} />
      )}

      <div className="px-4 space-y-4 pt-2">
        {/* Month selector */}
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          {months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>

        {/* Summary */}
        {expenses.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-card rounded-2xl p-3 border border-border col-span-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                {activeTab.name} · Total
              </p>
              <p className="text-2xl font-bold">{formatCurrency(total)}</p>
            </div>
            <div className="bg-card rounded-2xl p-3 border border-indigo-500/20 bg-indigo-500/5">
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-2 h-2 rounded-full bg-indigo-400" />
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">DeShea</p>
              </div>
              <p className="text-base font-bold text-indigo-400">{formatCurrency(byDeshea)}</p>
            </div>
            <div className="bg-card rounded-2xl p-3 border border-emerald-500/20 bg-emerald-500/5">
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Deepen</p>
              </div>
              <p className="text-base font-bold text-emerald-400">{formatCurrency(byDeepen)}</p>
            </div>
            <div className="bg-card rounded-2xl p-3 border border-border">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Count</p>
              <p className="text-base font-bold">{expenses.length}</p>
            </div>
          </div>
        )}

        {/* Expense list */}
        {loading ? (
          <div className="flex justify-center py-10">
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : expenses.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border p-10 text-center space-y-3">
            <p className="text-4xl">🛒</p>
            <p className="font-semibold">No expenses this month</p>
            <p className="text-sm text-muted-foreground">Tap Add to record one</p>
          </div>
        ) : (
          <div className="space-y-2">
            {expenses.map((exp) => (
              <ExpenseRow
                key={exp.id}
                expense={exp}
                tabs={tabs}
                onDelete={() => handleDelete(exp.id)}
                onEdit={() => setEditingExpense(exp)}
                onPreviewReceipt={() => exp.receipt_url && setPreviewUrl(exp.receipt_url)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showAddExpense && (
        <ExpenseSheet
          tabs={tabs}
          currentUser={currentUser}
          defaultTabId={activeTabId !== ALL_TAB_ID ? activeTabId : undefined}
          onClose={() => setShowAddExpense(false)}
          onSaved={fetchExpenses}
        />
      )}

      {editingExpense && (
        <ExpenseSheet
          tabs={tabs}
          currentUser={currentUser}
          editing={editingExpense}
          onClose={() => setEditingExpense(null)}
          onSaved={fetchExpenses}
        />
      )}

      {showAddTab && (
        <AddTabSheet
          currentUser={currentUser}
          onClose={() => setShowAddTab(false)}
          onSaved={() => { fetchTabs(); setShowAddTab(false); }}
        />
      )}

      {previewUrl && (
        <ReceiptPreview url={previewUrl} onClose={() => setPreviewUrl(null)} />
      )}
    </div>
  );
}

// ─── Expense Row ──────────────────────────────────────────────────────────────

function ExpenseRow({
  expense: exp, tabs, onDelete, onEdit, onPreviewReceipt,
}: {
  expense: Expense;
  tabs: ExpenseTab[];
  onDelete: () => void;
  onEdit: () => void;
  onPreviewReceipt: () => void;
}) {
  const tabName = tabs.find(t => t.id === exp.tab_id)?.name;
  return (
    <div className="bg-card rounded-2xl border border-border px-4 py-3 flex items-center gap-3">
      {/* Receipt thumbnail or category emoji */}
      <button
        onClick={exp.receipt_url ? onPreviewReceipt : undefined}
        className={`flex-shrink-0 w-11 h-11 rounded-xl overflow-hidden flex items-center justify-center text-2xl ${
          exp.receipt_url ? "bg-muted" : ""
        }`}
      >
        {exp.receipt_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={exp.receipt_url}
            alt="Receipt"
            className="w-full h-full object-cover"
          />
        ) : (
          CATEGORY_EMOJIS[exp.category] ?? "📦"
        )}
      </button>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate">{exp.description}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
            exp.paid_by === "DeShea" ? "bg-indigo-500/20 text-indigo-400" : "bg-emerald-500/20 text-emerald-400"
          }`}>{exp.paid_by}</span>
          <p className="text-xs text-muted-foreground">{exp.category}</p>
          <p className="text-xs text-muted-foreground">
            {format(new Date(exp.expense_date + "T12:00:00"), "MMM d")}
          </p>
          {tabName && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{tabName}</span>
          )}
        </div>
        {exp.notes && <p className="text-xs text-muted-foreground mt-0.5 truncate">{exp.notes}</p>}
        {exp.receipt_url && (
          <button onClick={onPreviewReceipt} className="flex items-center gap-1 mt-0.5 text-[10px] text-primary">
            <Eye className="w-3 h-3" /> View receipt
          </button>
        )}
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        <p className="font-bold text-sm">{formatCurrency(exp.amount)}</p>
        <button
          onClick={onEdit}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onDelete}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Add/Edit Expense Sheet ───────────────────────────────────────────────────

function ExpenseSheet({
  tabs, currentUser, defaultTabId, editing, onClose, onSaved,
}: {
  tabs: ExpenseTab[];
  currentUser: Payer;
  defaultTabId?: string;
  editing?: Expense;
  onClose: () => void;
  onSaved: () => void;
}) {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    paid_by: editing?.paid_by ?? currentUser,
    amount: editing ? String(editing.amount) : "",
    description: editing?.description ?? "",
    category: editing?.category ?? "Groceries",
    expense_date: editing?.expense_date ?? format(new Date(), "yyyy-MM-dd"),
    notes: editing?.notes ?? "",
    tab_id: editing?.tab_id ?? defaultTabId ?? null as string | null,
    receipt_url: editing?.receipt_url ?? null as string | null,
  });

  function set(field: string, value: any) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleReceiptUpload(file: File) {
    if (!file) return;
    setUploadingReceipt(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `receipts/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("receipts")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("receipts").getPublicUrl(path);
      set("receipt_url", urlData.publicUrl);
    } catch (e: any) {
      setError("Receipt upload failed: " + (e?.message ?? "Unknown"));
    } finally {
      setUploadingReceipt(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0) { setError("Enter a valid amount"); return; }
    if (!form.description.trim()) { setError("Enter a description"); return; }

    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      const payload = {
        paid_by: form.paid_by,
        amount: amt,
        description: form.description.trim(),
        category: form.category,
        expense_date: form.expense_date,
        notes: form.notes.trim() || null,
        tab_id: form.tab_id || null,
        receipt_url: form.receipt_url || null,
      };

      if (editing) {
        const { error: e } = await supabase.from("expenses").update(payload).eq("id", editing.id);
        if (e) throw e;
      } else {
        const { error: e } = await supabase.from("expenses").insert({ ...payload, user_id: user.id });
        if (e) throw e;
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card rounded-t-3xl border-t border-x border-border p-5 pb-10 max-h-[92vh] overflow-y-auto animate-fade-in">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">{editing ? "Edit Expense" : "Add Expense"}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-muted">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Who paid */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Paid By</label>
            <div className="grid grid-cols-2 gap-2">
              {(["DeShea", "Deepen"] as const).map((person) => (
                <button key={person} type="button" onClick={() => set("paid_by", person)}
                  className={`py-3 rounded-xl text-sm font-bold border-2 transition-all ${
                    form.paid_by === person
                      ? person === "DeShea"
                        ? "bg-indigo-500/20 border-indigo-500 text-indigo-300"
                        : "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                      : "bg-muted border-border text-muted-foreground"
                  }`}>
                  {person === "DeShea" ? "💜 DeShea" : "💚 Deepen"}
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Amount</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">$</span>
              <input
                type="number" step="0.01" min="0" required
                value={form.amount} onChange={e => set("amount", e.target.value)}
                placeholder="0.00"
                className="w-full bg-muted border border-border rounded-xl pl-8 pr-4 py-4 text-foreground text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Description</label>
            <input type="text" required value={form.description} onChange={e => set("description", e.target.value)}
              placeholder="e.g. Walmart grocery run..."
              className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Category</label>
            <div className="grid grid-cols-3 gap-2">
              {EXPENSE_CATEGORIES.map(cat => (
                <button key={cat} type="button" onClick={() => set("category", cat)}
                  className={`py-2.5 px-1 rounded-xl text-xs font-semibold border flex flex-col items-center gap-1 transition-all ${
                    form.category === cat
                      ? "bg-primary/20 border-primary text-primary"
                      : "bg-muted border-border text-muted-foreground"
                  }`}>
                  <span className="text-lg">{CATEGORY_EMOJIS[cat]}</span>
                  <span className="leading-tight text-center">{cat}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tab */}
          {tabs.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tab</label>
              <select
                value={form.tab_id ?? ""}
                onChange={e => set("tab_id", e.target.value || null)}
                className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">No tab (All)</option>
                {tabs.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          )}

          {/* Date */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Date</label>
            <input type="date" value={form.expense_date} onChange={e => set("expense_date", e.target.value)}
              className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Receipt */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Receipt (optional)</label>
            {form.receipt_url ? (
              <div className="relative rounded-xl overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.receipt_url} alt="Receipt preview" className="w-full max-h-48 object-cover rounded-xl" />
                <button
                  type="button"
                  onClick={() => set("receipt_url", null)}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center"
                >
                  <X className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {/* Hidden file inputs */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleReceiptUpload(f); }}
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleReceiptUpload(f); }}
                />
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={uploadingReceipt}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl bg-muted border border-border text-sm text-muted-foreground font-medium disabled:opacity-50"
                >
                  <Camera className="w-4 h-4" />
                  Camera
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingReceipt}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl bg-muted border border-border text-sm text-muted-foreground font-medium disabled:opacity-50"
                >
                  {uploadingReceipt ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <ImageIcon className="w-4 h-4" />
                  )}
                  {uploadingReceipt ? "Uploading…" : "Library"}
                </button>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Notes (optional)</label>
            <input type="text" value={form.notes} onChange={e => set("notes", e.target.value)}
              placeholder="Any extra details..."
              className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {error && <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-4 py-2">{error}</p>}

          <button
            type="submit" disabled={loading || uploadingReceipt}
            className="w-full bg-primary text-primary-foreground rounded-xl py-4 font-bold text-base disabled:opacity-50 active:scale-[0.98] transition-all"
          >
            {loading ? "Saving…" : editing ? "Save Changes" : "Save Expense"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Add Tab Sheet ────────────────────────────────────────────────────────────

function AddTabSheet({
  currentUser, onClose, onSaved,
}: {
  currentUser: Payer;
  onClose: () => void;
  onSaved: () => void;
}) {
  const supabase = createClient();
  const [name, setName] = useState("");
  const [owner, setOwner] = useState<"shared" | "DeShea" | "Deepen">("shared");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    await supabase.from("expense_tabs").insert({
      user_id: user.id,
      name: name.trim(),
      owner,
      position: 999,
    });
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card rounded-t-3xl border-t border-x border-border p-5 pb-10 animate-fade-in">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">New Tab</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-muted">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tab Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Spark Delivery, Shared, Household…"
              autoFocus
              className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Visibility</label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { value: "shared", label: "Shared 👫" },
                { value: "DeShea", label: "💜 DeShea" },
                { value: "Deepen", label: "💚 Deepen" },
              ] as const).map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setOwner(opt.value)}
                  className={`py-2.5 rounded-xl text-xs font-semibold border-2 transition-all ${
                    owner === opt.value
                      ? "bg-primary/20 border-primary text-primary"
                      : "bg-muted border-border text-muted-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="w-full bg-primary text-primary-foreground rounded-xl py-4 font-bold disabled:opacity-50 transition-all"
          >
            {saving ? "Creating…" : "Create Tab"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Receipt Preview ──────────────────────────────────────────────────────────

function ReceiptPreview({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90" onClick={onClose}>
      <button
        onClick={onClose}
        className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
      >
        <X className="w-5 h-5 text-white" />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt="Receipt"
        className="max-w-full max-h-[85vh] object-contain rounded-2xl"
        onClick={e => e.stopPropagation()}
      />
    </div>
  );
}
