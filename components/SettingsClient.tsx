"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { Bill, Message } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import {
  LogOut, Download, ChevronRight, RefreshCw,
  Save, AlertTriangle, ImagePlus, Trash2, Check,
} from "lucide-react";

export default function SettingsClient({
  user,
  bills,
  messageForDeShea,
  messageForDeepen,
}: {
  user: any;
  bills: Bill[];
  messageForDeShea: Message | null;
  messageForDeepen: Message | null;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [currentUser, setCurrentUser] = useState<string>("");

  useEffect(() => {
    setCurrentUser(localStorage.getItem("current_user") ?? "");
  }, []);

  const isDeepen = currentUser === "Deepen";
  const isDeShea = currentUser === "DeShea";

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  async function handleSeed() {
    if (!confirm("This will add the default 16 bills if they don't already exist. Continue?")) return;
    setSeeding(true);
    setSeedMsg(null);
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      const data = await res.json();
      setSeedMsg(data.message ?? "Done");
      router.refresh();
    } catch {
      setSeedMsg("Error seeding bills");
    } finally {
      setSeeding(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const { data: payments } = await supabase
        .from("payments")
        .select("*, bill:bills(name, category)")
        .order("paid_date", { ascending: false });

      if (!payments?.length) { alert("No payments to export"); return; }

      const rows = [
        ["Date", "Bill", "Category", "Amount", "Paid By", "Notes"],
        ...payments.map((p) => [
          p.paid_date,
          p.bill?.name ?? "",
          p.bill?.category ?? "",
          p.amount_paid.toFixed(2),
          p.paid_by,
          p.notes ?? "",
        ]),
      ];

      const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bills-export-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
    } finally {
      setExporting(false);
    }
  }

  async function updateDefaultPaidBy(billId: string, value: string) {
    await supabase
      .from("bills")
      .update({ default_paid_by: value || null })
      .eq("id", billId);
    router.refresh();
  }

  return (
    <div className="space-y-6">

      {/* Account */}
      <Section title="Account">
        <div className="px-4 py-3">
          <p className="text-xs text-muted-foreground">Signed in as</p>
          <p className="font-semibold text-sm mt-0.5 truncate">{user?.email}</p>
          {currentUser && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Browsing as{" "}
              <span className={currentUser === "DeShea" ? "text-indigo-400" : "text-emerald-400"}>
                {currentUser === "DeShea" ? "💜" : "💚"} {currentUser}
              </span>
            </p>
          )}
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-4 py-4 text-destructive border-t border-border"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm font-medium">Sign Out</span>
        </button>
      </Section>

      {/* Appearance */}
      <AppearanceSection />

      {/* Message composer — shown to whoever is logged in */}
      {isDeepen && (
        <MessageComposer
          forUser="DeShea"
          fromUser="Deepen"
          existing={messageForDeShea}
          placeholder="e.g. Hey babe, water bill is due this week 💧"
        />
      )}
      {isDeShea && (
        <MessageComposer
          forUser="Deepen"
          fromUser="DeShea"
          existing={messageForDeepen}
          placeholder="e.g. Hey babe, can you check on the car insurance? 🚗"
        />
      )}

      {/* Default Paid By */}
      <Section title="Default Paid By">
        <p className="px-4 pt-3 pb-1 text-xs text-muted-foreground">
          Set who usually pays each bill. You can always choose the other person when recording a payment.
        </p>
        <div className="divide-y divide-border">
          {bills.map((bill) => (
            <div key={bill.id} className="flex items-center justify-between px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{bill.name}</p>
                <p className="text-xs text-muted-foreground">{formatCurrency(bill.amount)}</p>
              </div>
              <select
                defaultValue={bill.default_paid_by ?? ""}
                onChange={(e) => updateDefaultPaidBy(bill.id, e.target.value)}
                className="bg-muted border border-border rounded-lg text-xs px-2 py-1.5 text-foreground focus:outline-none ml-3 flex-shrink-0"
              >
                <option value="">None</option>
                <option value="DeShea">DeShea</option>
                <option value="Deepen">Deepen</option>
              </select>
            </div>
          ))}
        </div>
      </Section>

      {/* Data */}
      <Section title="Data">
        <button
          onClick={handleExport}
          disabled={exporting}
          className="w-full flex items-center gap-3 px-4 py-4 disabled:opacity-50"
        >
          <Download className="w-4 h-4 text-primary" />
          <div className="flex-1 text-left">
            <p className="text-sm font-medium">Export Payments CSV</p>
            <p className="text-xs text-muted-foreground">Download full payment history</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
        <button
          onClick={handleSeed}
          disabled={seeding}
          className="w-full flex items-center gap-3 px-4 py-4 border-t border-border disabled:opacity-50 text-muted-foreground"
        >
          <AlertTriangle className="w-4 h-4 text-amber-500/70" />
          <div className="flex-1 text-left">
            <p className="text-sm font-medium text-muted-foreground">Seed Initial Bills</p>
            <p className="text-xs text-muted-foreground/60">Import default bills (first-time setup only)</p>
          </div>
          {seeding ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4 opacity-50" />}
        </button>
        {seedMsg && <p className="px-4 pb-3 text-xs text-emerald-400">{seedMsg}</p>}
      </Section>

      <p className="text-center text-xs text-muted-foreground/40 pb-2">Bills · Household finances</p>
    </div>
  );
}

// ─── Appearance Section ─────────────────────────────────────────────────────

function AppearanceSection() {
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [currentBgUrl, setCurrentBgUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "saved" | "removed">("idle");
  const [blur, setBlur] = useState(6);
  const [savingBlur, setSavingBlur] = useState(false);
  const blurSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", ["home_background_url", "home_background_blur"]);
      for (const row of data ?? []) {
        if (row.key === "home_background_url") setCurrentBgUrl(row.value);
        if (row.key === "home_background_blur") setBlur(Number(row.value));
      }
    }
    load();
  }, []);

  async function saveBlur(value: number) {
    setSavingBlur(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("app_settings").upsert({
        user_id: user.id,
        key: "home_background_blur",
        value: String(value),
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,key" });
    } finally {
      setSavingBlur(false);
    }
  }

  function handleBlurChange(value: number) {
    setBlur(value);
    // Debounce saves — only write to DB 600ms after user stops sliding
    if (blurSaveTimer.current) clearTimeout(blurSaveTimer.current);
    blurSaveTimer.current = setTimeout(() => saveBlur(value), 600);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const ext = file.name.split(".").pop();
      const path = `home-bg.${ext}`;

      // Upload to Supabase Storage (bucket: app-assets)
      const { error: uploadError } = await supabase.storage
        .from("app-assets")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("app-assets")
        .getPublicUrl(path);

      const publicUrl = `${urlData.publicUrl}?v=${Date.now()}`;

      // Save to app_settings
      await supabase.from("app_settings").upsert({
        user_id: user.id,
        key: "home_background_url",
        value: publicUrl,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,key" });

      setCurrentBgUrl(publicUrl);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 3000);
    } catch (err: any) {
      alert("Upload failed: " + (err?.message ?? "Unknown error"));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleRemove() {
    if (!confirm("Remove the home background image?")) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("app_settings")
      .delete()
      .eq("user_id", user.id)
      .eq("key", "home_background_url");
    setCurrentBgUrl(null);
    setStatus("removed");
    setTimeout(() => setStatus("idle"), 3000);
  }

  return (
    <Section title="Appearance">
      <div className="p-4 space-y-5">
        <p className="text-xs text-muted-foreground">
          Upload a photo for the login screen background — a photo of you two, your cats, your home, etc.
        </p>

        {/* Live preview with dynamic blur */}
        {currentBgUrl && (
          <div className="relative rounded-xl overflow-hidden h-36 bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentBgUrl}
              alt="Home background preview"
              className="w-full h-full object-cover"
              style={{ filter: `blur(${blur}px) brightness(0.55)`, transform: "scale(1.06)" }}
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <p className="text-2xl">🏠</p>
                <p className="text-white font-black text-lg drop-shadow">Bills</p>
              </div>
            </div>
          </div>
        )}

        {/* Blur slider — only shown when image exists */}
        {currentBgUrl && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Background Blur
              </label>
              <span className="text-xs font-bold text-foreground tabular-nums">
                {blur}px {savingBlur ? <span className="text-muted-foreground font-normal">saving…</span> : ""}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={20}
              step={1}
              value={blur}
              onChange={e => handleBlurChange(Number(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer
                bg-muted
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-5
                [&::-webkit-slider-thumb]:h-5
                [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:bg-primary
                [&::-webkit-slider-thumb]:shadow-md
                [&::-webkit-slider-thumb]:cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground/60">
              <span>None</span>
              <span>Max</span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 transition-all"
          >
            {uploading ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /> Uploading…</>
            ) : status === "saved" ? (
              <><Check className="w-4 h-4" /> Saved!</>
            ) : (
              <><ImagePlus className="w-4 h-4" /> {currentBgUrl ? "Change Photo" : "Upload Photo"}</>
            )}
          </button>

          {currentBgUrl && (
            <button
              onClick={handleRemove}
              className="p-3 rounded-xl border border-border text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {status === "removed" && (
          <p className="text-xs text-muted-foreground text-center">Background removed.</p>
        )}
      </div>
    </Section>
  );
}

// ─── Reusable message composer ─────────────────────────────────────────────

function MessageComposer({
  forUser, fromUser, existing, placeholder,
}: {
  forUser: "DeShea" | "Deepen";
  fromUser: "DeShea" | "Deepen";
  existing: Message | null;
  placeholder: string;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [text, setText] = useState(existing?.content ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    if (!text.trim()) return;
    setSaving(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      if (existing) {
        await supabase
          .from("messages")
          .update({ content: text.trim(), updated_at: new Date().toISOString() })
          .eq("id", existing.id);
      } else {
        await supabase.from("messages").insert({
          content: text.trim(),
          user_id: authUser.id,
          for_user: forUser,
        });
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleClear() {
    if (!existing) return;
    if (!confirm(`Remove the message for ${forUser}?`)) return;
    await supabase.from("messages").delete().eq("id", existing.id);
    setText("");
    router.refresh();
  }

  return (
    <Section title={`Message for ${forUser}`}>
      <div className="px-4 py-4 space-y-3">
        <p className="text-xs text-muted-foreground">
          Write a note that will appear as a banner on {forUser}'s home screen.
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          rows={3}
          maxLength={300}
          className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none placeholder:text-muted-foreground/50"
        />
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={saving || !text.trim()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 transition-all"
          >
            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {saved ? "Saved!" : "Save Message"}
          </button>
          {existing && (
            <button
              onClick={handleClear}
              className="px-4 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-destructive transition-colors"
            >
              Remove
            </button>
          )}
        </div>
        {existing && (
          <p className="text-[11px] text-muted-foreground">
            Last updated {new Date(existing.updated_at).toLocaleDateString()}
          </p>
        )}
      </div>
    </Section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2 px-1">{title}</h2>
      <div className="bg-card rounded-2xl border border-border overflow-hidden divide-y divide-border">
        {children}
      </div>
    </div>
  );
}
