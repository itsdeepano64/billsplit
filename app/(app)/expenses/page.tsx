"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import {
  Trash2, RefreshCw, Plus, X, Camera, Image as ImageIcon,
  Eye, Pencil, MoreHorizontal, Users, Lock, BarChart3, Upload, FileText,
} from "lucide-react";
import type { ExpenseTab, Expense, ExpenseItem, Payer, TabAccess } from "@/lib/types";
import ExpenseDetail, { ItemImage } from "@/components/expenses/ExpenseDetail";
import ItemsEditor from "@/components/expenses/ItemsEditor";
import RangeFilter from "@/components/expenses/RangeFilter";
import {
  ALL_TIME, type DateRange, rangeLabel, inRange, getCurrentUser, visibleTabs, canSee,
  isTabShared, updateExpense, insertExpenses, uploadReceipt, isPdf, sum,
  itemsOf, thumbOf, thumbnailForItems, vendorOf,
  ACCESS_OPTIONS, tabAccess, accessLabel, canAddToTab, addableTabs, canModifyExpense, setTabAccess,
} from "@/lib/expenses";

const EXPENSE_CATEGORIES = [
  "Groceries", "Gas", "Dining Out", "Home & Supplies",
  "Medical", "Personal", "Entertainment", "Clothing", "Tools", "Other",
];

const CATEGORY_EMOJIS: Record<string, string> = {
  "Groceries": "🛒", "Gas": "⛽", "Dining Out": "🍽️",
  "Home & Supplies": "🏠", "Medical": "💊", "Personal": "👤",
  "Entertainment": "🎬", "Clothing": "👕", "Tools": "🔧", "Other": "📦",
};

const ALL_TAB_ID = "__all__";
const ALL_TAB: ExpenseTab = {
  id: ALL_TAB_ID, user_id: "", name: "All", owner: "shared", position: -1, created_at: "",
};

export default function ExpensesPage() {
  const supabase = createClient();
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [allTabs, setAllTabs] = useState<ExpenseTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>(ALL_TAB_ID);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<DateRange>(ALL_TIME);
  const [currentUser, setCurrentUser] = useState<Payer>("Deepen");
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddTab, setShowAddTab] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [detailExpense, setDetailExpense] = useState<Expense | null>(null);
  const [showTabMenu, setShowTabMenu] = useState<string | null>(null);
  const [accessTab, setAccessTab] = useState<ExpenseTab | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => { setCurrentUser(getCurrentUser()); }, []);

  const fetchTabs = useCallback(async () => {
    const { data } = await supabase
      .from("expense_tabs")
      .select("*")
      .order("position", { ascending: true })
      .order("created_at", { ascending: true });
    setAllTabs((data ?? []) as ExpenseTab[]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("expenses")
      .select("*")
      .order("expense_date", { ascending: false })
      .order("created_at", { ascending: false });
    setAllExpenses(((data ?? []) as Expense[]).map(e => ({ ...e, amount: Number(e.amount) })));
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fetchTabs(); }, [fetchTabs]);
  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  const tabsById = useMemo(() => new Map(allTabs.map(t => [t.id, t])), [allTabs]);
  const tabs = useMemo(() => visibleTabs(allTabs, currentUser), [allTabs, currentUser]);
  const visible = useMemo(
    () => allExpenses.filter(e => canSee(e, tabsById, currentUser)),
    [allExpenses, tabsById, currentUser],
  );
  const inTab = useMemo(
    () => activeTabId === ALL_TAB_ID ? visible : visible.filter(e => e.tab_id === activeTabId),
    [visible, activeTabId],
  );
  const expenses = useMemo(() => inTab.filter(e => inRange(e, range)), [inTab, range]);

  useEffect(() => {
    if (activeTabId !== ALL_TAB_ID && !tabs.some(t => t.id === activeTabId)) setActiveTabId(ALL_TAB_ID);
  }, [tabs, activeTabId]);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  async function handleDelete(id: string) {
    const target = allExpenses.find(e => e.id === id);
    if (target && !canModifyExpense(target, tabsById, currentUser)) { flash("You don't have permission to delete this"); return; }
    if (!confirm("Delete this expense?")) return;
    await supabase.from("expenses").delete().eq("id", id);
    fetchExpenses();
  }

  async function handleToggleShare(exp: Expense) {
    const next = !exp.shared;
    setAllExpenses(list => list.map(e => e.id === exp.id ? { ...e, shared: next } : e));
    const { error } = await updateExpense(supabase, exp.id, { shared: next });
    if (error) {
      setAllExpenses(list => list.map(e => e.id === exp.id ? { ...e, shared: !next } : e));
      flash(error.message ?? "Couldn't update sharing");
    } else {
      flash(next ? "Shared with DeShea" : "Hidden from DeShea");
    }
  }

  async function handleSetAccess(tab: ExpenseTab, access: TabAccess) {
    if (currentUser !== "Deepen") return;
    const prev = allTabs;
    setAllTabs(list => list.map(t => t.id === tab.id ? { ...t, deshea_access: access, owner: t.owner === "DeShea" ? "DeShea" : access === "hidden" ? "Deepen" : "shared" } : t));
    setAccessTab(t => (t && t.id === tab.id ? { ...t, deshea_access: access } : t));
    const { error } = await setTabAccess(supabase, tab, access);
    if (error) { setAllTabs(prev); flash(error.message ?? "Couldn't change access"); }
    else flash(`DeShea access to "${tab.name}": ${accessLabel(access)}`);
    fetchTabs();
  }

  async function handleDeleteTab(tabId: string) {
    if (!confirm("Delete this tab? Expenses in it will be moved to 'All'.")) return;
    await supabase.from("expenses").update({ tab_id: null }).eq("tab_id", tabId);
    await supabase.from("expense_tabs").delete().eq("id", tabId);
    if (activeTabId === tabId) setActiveTabId(ALL_TAB_ID);
    fetchTabs();
    fetchExpenses();
  }

  const total = sum(expenses);
  const byDeshea = sum(expenses.filter(e => e.paid_by === "DeShea"));
  const byDeepen = sum(expenses.filter(e => e.paid_by === "Deepen"));
  const avg = expenses.length ? total / expenses.length : 0;
  const biggest = expenses.reduce<Expense | null>((m, e) => (!m || e.amount > m.amount ? e : m), null);
  const ytdStart = format(new Date(), "yyyy") + "-01-01";
  const ytd = sum(inTab.filter(e => e.expense_date >= ytdStart));
  const thisMonthStart = format(new Date(), "yyyy-MM") + "-01";
  const thisMonth = sum(inTab.filter(e => e.expense_date >= thisMonthStart));
  const byCategory = Object.entries(
    expenses.reduce<Record<string, number>>((m, e) => { m[e.category] = (m[e.category] ?? 0) + e.amount; return m; }, {}),
  ).sort((a, b) => b[1] - a[1]);

  const allDisplayTabs = [ALL_TAB, ...tabs];
  const activeTab = allDisplayTabs.find(t => t.id === activeTabId) ?? ALL_TAB;
  const formTabs = useMemo(() => addableTabs(tabs, currentUser), [tabs, currentUser]);
  // Can the current person add to the tab they're looking at? ("All" is always fine: the form only offers tabs she can add to.)
  const canAddHere = activeTabId === ALL_TAB_ID || canAddToTab(activeTab, currentUser);
  const statsHref = `/expenses/stats${activeTabId !== ALL_TAB_ID ? `?tab=${activeTabId}` : ""}`;

  return (
    <div className="pb-4 max-w-lg mx-auto">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-background pt-6 pb-3 px-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold tracking-tight">Expenses</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { fetchTabs(); fetchExpenses(); }}
              disabled={loading}
              aria-label="Refresh"
              className="w-9 h-9 flex items-center justify-center rounded-full bg-muted text-muted-foreground disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <Link href={statsHref} aria-label="Stats"
              className="w-9 h-9 flex items-center justify-center rounded-full bg-muted text-muted-foreground">
              <BarChart3 className="w-4 h-4" />
            </Link>
            <Link href="/expenses/import" aria-label="Bulk import receipts"
              className="w-9 h-9 flex items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Upload className="w-4 h-4" />
            </Link>
            <button
              onClick={() => (canAddHere ? setShowAddExpense(true) : flash("This tab is view only for you"))}
              disabled={!canAddHere}
              className="flex items-center gap-2 disabled:opacity-40 bg-primary/15 border border-primary/30 text-primary rounded-xl px-4 py-2.5 text-sm font-semibold active:scale-[0.97] transition-all"
            >
              <Plus className="w-4 h-4" strokeWidth={2.5} />
              Add
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-2 overflow-x-auto pb-1 pt-1 -mx-1 px-1 scrollbar-none">
          {allDisplayTabs.map((tab) => (
            <div key={tab.id} className="relative flex-shrink-0">
              <button
                onClick={() => setActiveTabId(tab.id)}
                className={[
                  "px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-1.5",
                  activeTabId === tab.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground",
                ].join(" ")}
              >
                {tab.name}
                {tab.id !== ALL_TAB_ID && currentUser === "Deepen" && tab.owner !== "DeShea" && tabAccess(tab) !== "hidden" && <Users className="w-3 h-3 opacity-80" />}
              </button>
              {tab.id !== ALL_TAB_ID && activeTabId === tab.id && (
                <button
                  onClick={() => setShowTabMenu(showTabMenu === tab.id ? null : tab.id)}
                  aria-label="Tab options"
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-muted border border-border flex items-center justify-center"
                >
                  <MoreHorizontal className="w-3 h-3 text-muted-foreground" />
                </button>
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

        {/* DeShea access control: obvious, one tap */}
        {activeTabId !== ALL_TAB_ID && currentUser === "Deepen" && activeTab.owner !== "DeShea" && (
          <button
            onClick={() => setAccessTab(activeTab)}
            className="mt-2 w-full flex items-center justify-between gap-2 bg-muted/60 border border-border rounded-xl px-3 py-2 text-xs"
            aria-label={`DeShea access: ${accessLabel(tabAccess(activeTab))}. Tap to change`}
          >
            <span className="flex items-center gap-2 min-w-0">
              {tabAccess(activeTab) === "hidden" ? <Lock className="w-3.5 h-3.5 text-muted-foreground" /> : <Users className="w-3.5 h-3.5 text-indigo-400" />}
              <span className="truncate">DeShea access: <span className="font-semibold">{accessLabel(tabAccess(activeTab))}</span></span>
            </span>
            <span className="text-primary font-semibold flex-shrink-0">Change</span>
          </button>
        )}
        {activeTabId !== ALL_TAB_ID && currentUser === "DeShea" && activeTab.owner !== "DeShea" && (
          <p className="mt-2 text-[11px] text-muted-foreground flex items-center gap-1.5">
            <Users className="w-3 h-3" /> Shared with you by Deepen · {tabAccess(activeTab) === "edit" ? "you can add expenses" : "view only"}
          </p>
        )}
      </div>

      {showTabMenu && (() => {
        const tab = tabs.find(t => t.id === showTabMenu);
        if (!tab) return null;
        return (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setShowTabMenu(null)} />
            <div className="fixed left-1/2 -translate-x-1/2 top-32 z-40 bg-card border border-border rounded-2xl shadow-xl overflow-hidden w-[min(90vw,320px)]">
              <p className="px-4 pt-3 pb-2 text-xs text-muted-foreground truncate">{tab.name}</p>
              {currentUser === "Deepen" && (
                <button
                  onClick={() => { setAccessTab(tab); setShowTabMenu(null); }}
                  className="w-full flex items-center justify-between gap-2 px-4 py-3 text-sm border-t border-border"
                >
                  <span className="flex items-center gap-2"><Users className="w-4 h-4" /> DeShea access</span>
                  <span className="text-xs text-muted-foreground">{accessLabel(tabAccess(tab))}</span>
                </button>
              )}
              {currentUser === "Deepen" && <button
                onClick={() => { handleDeleteTab(tab.id); setShowTabMenu(null); }}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm text-destructive border-t border-border"
              >
                <Trash2 className="w-4 h-4" />
                Delete Tab
              </button>}
            </div>
          </>
        );
      })()}

      <div className="px-4 space-y-4 pt-2">
        <RangeFilter value={range} onChange={setRange} />

        {inTab.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-card rounded-2xl p-4 border border-border col-span-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1 truncate">
                {activeTab.name} · {rangeLabel(range)}
              </p>
              <p className="text-3xl font-bold">{formatCurrency(total)}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                <span>YTD <span className="text-foreground font-semibold">{formatCurrency(ytd)}</span></span>
                <span>This month <span className="text-foreground font-semibold">{formatCurrency(thisMonth)}</span></span>
              </div>
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
            <div className="bg-card rounded-2xl p-3 border border-border col-span-1">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Average</p>
              <p className="text-base font-bold">{formatCurrency(avg)}</p>
            </div>
            <div className="bg-card rounded-2xl p-3 border border-border col-span-2 min-w-0">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Biggest</p>
              <p className="text-sm font-bold truncate">
                {biggest ? `${formatCurrency(biggest.amount)} · ${biggest.description}` : "—"}
              </p>
            </div>
            {byCategory.length > 0 && (
              <div className="bg-card rounded-2xl p-3 border border-border col-span-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">By category</p>
                  <Link href={statsHref} className="text-[11px] text-primary font-semibold">More stats →</Link>
                </div>
                {byCategory.slice(0, 5).map(([cat, amt]) => (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>{CATEGORY_EMOJIS[cat] ?? "📦"} {cat}</span>
                      <span className="font-semibold">{formatCurrency(amt)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-primary/70 rounded-full" style={{ width: `${total ? (amt / total) * 100 : 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-10">
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : expenses.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border p-10 text-center space-y-3">
            <p className="text-4xl">🛒</p>
            <p className="font-semibold">{inTab.length === 0 ? "No expenses yet" : "Nothing in this date range"}</p>
            <p className="text-sm text-muted-foreground">
              {inTab.length === 0 ? "Tap Add, or bulk import receipts" : "Try a different filter"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {expenses.map((exp) => (
              <ExpenseRow
                key={exp.id}
                expense={exp}
                tabs={allTabs}
                canShare={currentUser === "Deepen"}
                canModify={canModifyExpense(exp, tabsById, currentUser)}
                onDelete={() => handleDelete(exp.id)}
                onEdit={() => setEditingExpense(exp)}
                onOpen={() => setDetailExpense(exp)}
                onToggleShare={() => handleToggleShare(exp)}
                onPreviewReceipt={() => {
                  if (!exp.receipt_url) return;
                  if (isPdf(exp.receipt_url)) window.open(exp.receipt_url, "_blank", "noopener");
                  else setPreviewUrl(exp.receipt_url);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-24 z-50 bg-card border border-border rounded-xl px-4 py-2 text-sm shadow-xl">
          {toast}
        </div>
      )}

      {showAddExpense && (
        <ExpenseSheet
          tabs={formTabs}
          currentUser={currentUser}
          defaultTabId={activeTabId !== ALL_TAB_ID ? activeTabId : undefined}
          onClose={() => setShowAddExpense(false)}
          onSaved={fetchExpenses}
        />
      )}
      {editingExpense && (
        <ExpenseSheet
          tabs={formTabs}
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
      {detailExpense && (
        <ExpenseDetail
          expense={allExpenses.find(x => x.id === detailExpense.id) ?? detailExpense}
          tabs={allTabs}
          canEdit={canModifyExpense(allExpenses.find(x => x.id === detailExpense.id) ?? detailExpense, tabsById, currentUser)}
          onClose={() => setDetailExpense(null)}
          onEdit={() => { setEditingExpense(allExpenses.find(x => x.id === detailExpense.id) ?? detailExpense); setDetailExpense(null); }}
          onPreviewReceipt={() => {
            const url = detailExpense.receipt_url;
            if (!url) return;
            if (isPdf(url)) window.open(url, "_blank", "noopener");
            else setPreviewUrl(url);
          }}
        />
      )}
      {accessTab && (
        <TabAccessSheet
          tab={allTabs.find(t => t.id === accessTab.id) ?? accessTab}
          onPick={(a) => handleSetAccess(allTabs.find(t => t.id === accessTab.id) ?? accessTab, a)}
          onClose={() => setAccessTab(null)}
        />
      )}
      {previewUrl && (
        <ReceiptPreview url={previewUrl} onClose={() => setPreviewUrl(null)} />
      )}
    </div>
  );
}

function Switch({ on }: { on: boolean }) {
  return (
    <span className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors ${on ? "bg-primary" : "bg-muted-foreground/30"}`}>
      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${on ? "left-[18px]" : "left-0.5"}`} />
    </span>
  );
}

// ─── Expense Row ──────────────────────────────────────────────────────────────

function ExpenseRow({ expense: exp, tabs, canShare, canModify, onDelete, onEdit, onOpen, onToggleShare, onPreviewReceipt }: {
  expense: Expense; tabs: ExpenseTab[]; canShare: boolean; canModify: boolean;
  onDelete: () => void; onEdit: () => void; onOpen: () => void; onToggleShare: () => void; onPreviewReceipt: () => void;
}) {
  const tabName = tabs.find(t => t.id === exp.tab_id)?.name;
  const pdf = isPdf(exp.receipt_url);
  const thumb = thumbOf(exp);
  const items = itemsOf(exp).filter(i => !i.excluded);
  const itemCount = items.reduce((n, i) => n + (Number(i.qty) || 1), 0);
  const title = items.length > 0 ? `${vendorOf(exp)} · ${items[0].name}` : exp.description;
  return (
    <div className="bg-card rounded-2xl border border-border px-4 py-3 flex items-center gap-3">
      <button onClick={onOpen} aria-label="View details"
        className="flex-shrink-0 w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center text-2xl border border-border relative">
        {thumb ? (
          <ItemImage src={thumb} alt={title} className="w-full h-full" />
        ) : exp.receipt_url && pdf ? (
          <FileText className="w-5 h-5 text-muted-foreground" />
        ) : (CATEGORY_EMOJIS[exp.category] ?? "📦")}
        {itemCount > 1 && (
          <span className="absolute bottom-0 right-0 text-[9px] font-bold bg-black/70 text-white rounded-tl-md px-1">{itemCount}</span>
        )}
      </button>
      <button onClick={onOpen} className="flex-1 min-w-0 text-left">
        <p className="font-semibold text-sm truncate">{title}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${exp.paid_by === "DeShea" ? "bg-indigo-500/20 text-indigo-400" : "bg-emerald-500/20 text-emerald-400"}`}>
            {exp.paid_by}
          </span>
          <p className="text-xs text-muted-foreground">{exp.category}</p>
          <p className="text-xs text-muted-foreground">
            {format(new Date(exp.expense_date + "T12:00:00"), "MMM d, yyyy")}
          </p>
          {tabName && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground truncate max-w-[140px]">{tabName}</span>
          )}
        </div>
        {items.length > 0 ? (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {itemCount} item{itemCount === 1 ? "" : "s"}{items.length > 1 ? ` · +${items.length - 1} more` : ""}{exp.order_number ? ` · #${exp.order_number}` : ""}
          </p>
        ) : exp.notes ? <p className="text-xs text-muted-foreground mt-0.5 truncate">{exp.notes}</p> : null}
      </button>
      <div className="flex items-center gap-1 flex-shrink-0">
        <p className="font-bold text-sm">{formatCurrency(exp.amount)}</p>
        {exp.receipt_url && (
          <button onClick={onPreviewReceipt} aria-label={`View receipt${pdf ? " (PDF)" : ""}`} title="View receipt"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-primary hover:bg-muted">
            <Eye className="w-3.5 h-3.5" />
          </button>
        )}
        {canShare && exp.paid_by === "Deepen" && (
          <button
            onClick={onToggleShare}
            aria-label={exp.shared ? "Shared with DeShea, tap to hide" : "Private, tap to share with DeShea"}
            title={exp.shared ? "Shared with DeShea" : "Private"}
            className={`w-7 h-7 flex items-center justify-center rounded-lg ${exp.shared ? "text-indigo-400 bg-indigo-500/10" : "text-muted-foreground hover:bg-muted"}`}
          >
            {exp.shared ? <Users className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
          </button>
        )}
        {canModify && (
          <>
            <button onClick={onEdit} aria-label="Edit" className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={onDelete} aria-label="Delete" className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Shared Sheet Wrapper ─────────────────────────────────────────────────────
// Key fix: uses dvh so sheet respects keyboard height on iOS.
// overflow-y-auto on the inner div lets content scroll when keyboard is open.

function Sheet({ title, onClose, children }: {
  title: string; onClose: () => void; children: React.ReactNode;
}) {
  // Lock background scroll while sheet is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-lg bg-card rounded-t-3xl border-t border-x border-border flex flex-col animate-fade-in"
        style={{ maxHeight: "min(92dvh, 92vh)" }}
        onTouchMove={e => e.stopPropagation()}
      >
        {/* Drag handle + header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
          <div className="w-10 h-1 bg-white/20 rounded-full absolute top-3 left-1/2 -translate-x-1/2" />
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-muted">
            <X className="w-4 h-4" />
          </button>
        </div>
        {/* Scrollable body — overscrollBehavior contains scroll within the sheet */}
        <div
          className="overflow-y-auto flex-1 px-5"
          style={{
            paddingBottom: "max(2rem, env(safe-area-inset-bottom))",
            overscrollBehavior: "contain",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── Add/Edit Expense Sheet ───────────────────────────────────────────────────

function ExpenseSheet({ tabs, currentUser, defaultTabId, editing, onClose, onSaved }: {
  tabs: ExpenseTab[]; currentUser: Payer; defaultTabId?: string;
  editing?: Expense; onClose: () => void; onSaved: () => void;
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
    receipt_path: editing?.receipt_path ?? null as string | null,
    vendor: editing?.vendor ?? "",
    shared: editing?.shared ?? (currentUser === "DeShea"),
  });
  const [items, setItems] = useState<ExpenseItem[]>(editing ? itemsOf(editing) : []);

  function set(field: string, value: any) { setForm(f => ({ ...f, [field]: value })); }

  async function handleReceiptUpload(file: File) {
    if (!file) return;
    setUploadingReceipt(true);
    try {
      const { url, path } = await uploadReceipt(supabase, file);
      set("receipt_url", url);
      set("receipt_path", path);
    } catch (e: any) {
      setError("Receipt upload failed: " + (e?.message ?? "Unknown"));
    } finally { setUploadingReceipt(false); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0) { setError("Enter a valid amount"); return; }
    if (!form.description.trim()) { setError("Enter a description"); return; }
    setLoading(true); setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");
      const payload = {
        paid_by: form.paid_by, amount: amt, description: form.description.trim(),
        category: form.category, expense_date: form.expense_date,
        notes: form.notes.trim() || null, tab_id: form.tab_id || null, receipt_url: form.receipt_url || null,
        receipt_path: form.receipt_path || null, vendor: form.vendor.trim() || null, shared: !!form.shared,
      };
      // Optional line items: keep named rows; thumbnail = first item photo (row falls back to the receipt image).
      const cleanItems = items
        .filter(i => i.name.trim())
        .map(i => ({ ...i, name: i.name.trim(), image_url: i.image_url?.trim() || null, product_url: i.product_url?.trim() || null }));
      const itemsChanged = JSON.stringify(cleanItems) !== JSON.stringify(editing ? itemsOf(editing) : []);
      if (itemsChanged) {
        Object.assign(payload, { items: cleanItems, thumbnail_url: thumbnailForItems(cleanItems) });
      }
      if (editing) {
        const { error: e } = await updateExpense(supabase, editing.id, payload);
        if (e) throw e;
      } else {
        const { error: e } = await insertExpenses(supabase, [{ ...payload, user_id: user.id, source: "manual" }]);
        if (e) throw e;
      }
      onSaved(); onClose();
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  }

  return (
    <Sheet title={editing ? "Edit Expense" : "Add Expense"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Who paid */}
        <div className="space-y-1.5">
          <label className={labelCls}>Paid By</label>
          <div className="grid grid-cols-2 gap-2">
            {(["DeShea", "Deepen"] as const).map((person) => (
              <button key={person} type="button" onClick={() => set("paid_by", person)}
                className={`py-3 rounded-xl text-sm font-bold border-2 transition-all ${
                  form.paid_by === person
                    ? person === "DeShea" ? "bg-indigo-500/20 border-indigo-500 text-indigo-300" : "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                    : "bg-muted border-border text-muted-foreground"
                }`}>
                {person === "DeShea" ? "💜 DeShea" : "💚 Deepen"}
              </button>
            ))}
          </div>
        </div>

        {/* Amount */}
        <div className="space-y-1.5">
          <label className={labelCls}>Amount</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">$</span>
            <input type="number" step="0.01" min="0" required value={form.amount} onChange={e => set("amount", e.target.value)}
              placeholder="0.00"
              className="w-full bg-muted border border-border rounded-xl pl-8 pr-4 py-4 text-foreground text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className={labelCls}>Description</label>
          <input type="text" required value={form.description} onChange={e => set("description", e.target.value)}
            placeholder="e.g. Walmart grocery run…"
            className={inputCls} />
        </div>

        {/* Vendor */}
        <div className="space-y-1.5">
          <label className={labelCls}>Store / vendor (optional)</label>
          <input type="text" value={form.vendor} onChange={e => set("vendor", e.target.value)}
            placeholder="e.g. Home Depot" className={inputCls} />
        </div>

        {/* Category */}
        <div className="space-y-1.5">
          <label className={labelCls}>Category</label>
          <div className="grid grid-cols-3 gap-2">
            {EXPENSE_CATEGORIES.map(cat => (
              <button key={cat} type="button" onClick={() => set("category", cat)}
                className={`py-2.5 px-1 rounded-xl text-xs font-semibold border flex flex-col items-center gap-1 transition-all ${
                  form.category === cat ? "bg-primary/20 border-primary text-primary" : "bg-muted border-border text-muted-foreground"
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
            <label className={labelCls}>Tab</label>
            <select value={form.tab_id ?? ""} onChange={e => set("tab_id", e.target.value || null)} className={inputCls}>
              <option value="">No tab (All)</option>
              {tabs.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        )}

        {/* Date */}
        <div className="space-y-1.5">
          <label className={labelCls}>Date</label>
          <input type="date" value={form.expense_date} onChange={e => set("expense_date", e.target.value)} className={inputCls} />
        </div>

        {/* Receipt */}
        <div className="space-y-2">
          <label className={labelCls}>Receipt (optional)</label>
          {form.receipt_url ? (
            <div className="relative rounded-xl overflow-hidden">
              {isPdf(form.receipt_url) ? (
                <a href={form.receipt_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-muted border border-border rounded-xl px-4 py-4 text-sm">
                  <FileText className="w-5 h-5" /> PDF receipt attached
                </a>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.receipt_url} alt="Receipt preview" className="w-full max-h-48 object-cover rounded-xl" />
              )}
              <button type="button" onClick={() => { set("receipt_url", null); set("receipt_path", null); }}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center">
                <X className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleReceiptUpload(f); }} />
              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleReceiptUpload(f); }} />
              <button type="button" onClick={() => cameraInputRef.current?.click()} disabled={uploadingReceipt}
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-muted border border-border text-sm text-muted-foreground font-medium disabled:opacity-50">
                <Camera className="w-4 h-4" /> Camera
              </button>
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingReceipt}
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-muted border border-border text-sm text-muted-foreground font-medium disabled:opacity-50">
                {uploadingReceipt ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                {uploadingReceipt ? "Uploading…" : "Library"}
              </button>
            </div>
          )}
        </div>

        {/* Items */}
        <div className="space-y-1.5">
          <label className={labelCls}>Items (optional)</label>
          <ItemsEditor items={items} onChange={setItems} />
        </div>

        {/* Share */}
        {form.paid_by === "Deepen" && currentUser === "Deepen" && (
          <button type="button" onClick={() => set("shared", !form.shared)}
            className="w-full flex items-center justify-between gap-3 bg-muted border border-border rounded-xl px-4 py-3 text-sm">
            <span className="flex items-center gap-2 text-left">
              {form.shared ? <Users className="w-4 h-4 text-indigo-400" /> : <Lock className="w-4 h-4 text-muted-foreground" />}
              <span>
                <span className="font-semibold block">Share with DeShea</span>
                <span className="text-xs text-muted-foreground">{form.shared ? "DeShea can see this" : "Only you can see this"}</span>
              </span>
            </span>
            <Switch on={!!form.shared} />
          </button>
        )}

        {/* Notes */}
        <div className="space-y-1.5">
          <label className={labelCls}>Notes (optional)</label>
          <input type="text" value={form.notes} onChange={e => set("notes", e.target.value)}
            placeholder="Any extra details…" className={inputCls} />
        </div>

        {error && <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-4 py-2">{error}</p>}

        <button type="submit" disabled={loading || uploadingReceipt}
          className="w-full bg-primary text-primary-foreground rounded-xl py-4 font-bold text-base disabled:opacity-50 active:scale-[0.98] transition-all">
          {loading ? "Saving…" : editing ? "Save Changes" : "Save Expense"}
        </button>
      </form>
    </Sheet>
  );
}

// ─── Add Tab Sheet ────────────────────────────────────────────────────────────

function AddTabSheet({ currentUser, onClose, onSaved }: {
  currentUser: Payer; onClose: () => void; onSaved: () => void;
}) {
  const supabase = createClient();
  const [name, setName] = useState("");
  const [access, setAccess] = useState<TabAccess>("hidden");
  const [saving, setSaving] = useState(false);

  // Lock background scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const base = { user_id: user.id, name: name.trim(), position: 999 };
    if (currentUser === "DeShea") {
      // Her own tab: she can always view + add; hidden from nobody she needs.
      await supabase.from("expense_tabs").insert({ ...base, owner: "DeShea", deshea_access: "edit" });
    } else {
      const owner = access === "hidden" ? "Deepen" : "shared";
      const { error } = await supabase.from("expense_tabs").insert({ ...base, owner, deshea_access: access });
      if (error && /deshea_access/i.test(error.message)) await supabase.from("expense_tabs").insert({ ...base, owner });
    }
    onSaved();
  }

  // Nav bar height + safe area — sheet sits above it
  const NAV_HEIGHT = "calc(64px + env(safe-area-inset-bottom, 0px))";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      {/* Sheet is positioned so its bottom edge sits on top of the nav bar, never behind it */}
      <div
        className="relative w-full max-w-lg bg-card rounded-t-3xl border-t border-x border-border flex flex-col animate-fade-in"
        style={{ bottom: NAV_HEIGHT, marginBottom: 0, position: "absolute", left: 0, right: 0 }}
      >
        {/* Handle */}
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-3 mb-1 flex-shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-3 pb-4 flex-shrink-0">
          <h2 className="text-lg font-bold">New Tab</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-muted">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* All content — no scroll needed, fits in one screen */}
        <div className="px-5 pb-6 space-y-5">
          <div className="space-y-1.5">
            <label className={labelCls}>Tab Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Spark Delivery, Household…"
              className={inputCls}
            />
          </div>
          {currentUser === "Deepen" && (
            <div className="space-y-1.5">
              <label className={labelCls}>DeShea access</label>
              <div className="grid grid-cols-3 gap-2">
                {ACCESS_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setAccess(opt.value)}
                    className={`py-3.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                      access === opt.value
                        ? "bg-primary/20 border-primary text-primary"
                        : "bg-muted border-border text-muted-foreground"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{ACCESS_OPTIONS.find(o => o.value === access)?.help}</p>
            </div>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="w-full bg-primary text-primary-foreground rounded-xl py-4 font-bold text-base disabled:opacity-50 transition-all active:scale-[0.98]"
          >
            {saving ? "Creating…" : "Create Tab"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tab access (DeShea) ──────────────────────────────────────────────────────

function TabAccessSheet({ tab, onPick, onClose }: {
  tab: ExpenseTab; onPick: (a: TabAccess) => void; onClose: () => void;
}) {
  const current = tabAccess(tab);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.classList.add("sheet-open");
    return () => { document.body.style.overflow = prev; document.body.classList.remove("sheet-open"); };
  }, []);
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center" role="dialog" aria-modal="true" aria-label="DeShea access">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card rounded-t-3xl border-t border-x border-border animate-fade-in px-5 pt-5"
        style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <h2 className="text-lg font-bold">DeShea access</h2>
            <p className="text-xs text-muted-foreground truncate">{tab.name}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 flex items-center justify-center rounded-full bg-muted flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-2">
          {ACCESS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => onPick(opt.value)}
              aria-pressed={current === opt.value}
              className={`w-full text-left rounded-2xl border-2 px-4 py-3 transition-all ${
                current === opt.value ? "bg-primary/15 border-primary" : "bg-muted border-border"
              }`}
            >
              <span className="flex items-center justify-between">
                <span className="font-semibold text-sm">{opt.label}</span>
                {current === opt.value && <span className="text-[10px] font-bold text-primary uppercase tracking-wide">Current</span>}
              </span>
              <span className="block text-xs text-muted-foreground mt-0.5">{opt.help}</span>
            </button>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground mt-4">
          Applies to this tab and every expense in it. Enforced in the app: you and DeShea currently share one login.
        </p>
      </div>
    </div>
  );
}

// ─── Receipt Preview ──────────────────────────────────────────────────────────

function ReceiptPreview({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90" onClick={onClose}>
      <button onClick={onClose} className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
        <X className="w-5 h-5 text-white" />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="Receipt" className="max-w-full max-h-[85vh] object-contain rounded-2xl" onClick={e => e.stopPropagation()} />
    </div>
  );
}

// ─── Shared style constants ───────────────────────────────────────────────────
const labelCls = "text-xs font-medium text-muted-foreground uppercase tracking-wide";
const inputCls = "w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50";
