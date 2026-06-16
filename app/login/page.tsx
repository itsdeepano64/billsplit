"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [loading, setLoading] = useState<"DeShea" | "Deepen" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bgUrl, setBgUrl] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function loadBg() {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "home_background_url")
        .maybeSingle();
      if (data?.value) setBgUrl(data.value);
    }
    loadBg();
  }, []);

  async function handleLogin(person: "DeShea" | "Deepen") {
    setLoading(person);
    setError(null);
    try {
      const email = process.env.NEXT_PUBLIC_SHARED_EMAIL!;
      const password = process.env.NEXT_PUBLIC_SHARED_PASSWORD!;
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      localStorage.setItem("current_user", person);
      router.push("/");
      router.refresh();
    } catch {
      setError("Login failed. Check environment variables.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-6 overflow-hidden bg-[#0a0a0f]">

      {/* Background image — light blur so photo stays recognizable */}
      {bgUrl && (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${bgUrl})`,
              filter: "blur(6px) brightness(0.55)",
              transform: "scale(1.06)",
            }}
          />
          {/* Subtle gradient for readability without killing the photo */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/10 to-black/50" />
        </>
      )}

      {/* Fallback gradient when no image */}
      {!bgUrl && (
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/60 via-[#0a0a0f] to-emerald-950/40" />
      )}

      {/* Content */}
      <div className="relative z-10 w-full max-w-sm space-y-10">

        {/* Header */}
        <div className="text-center space-y-1">
          <div className="text-5xl mb-1">🏠</div>
          <h1 className="text-5xl font-black tracking-tight text-white drop-shadow-lg">Bills</h1>
          <p className="text-white/50 text-sm font-medium tracking-wide">Household finances · DeShea & Deepen</p>
        </div>

        {/* Login buttons */}
        <div className="space-y-4">
          <button
            onClick={() => handleLogin("DeShea")}
            disabled={!!loading}
            className="w-full rounded-3xl py-8 flex flex-col items-center gap-2.5 transition-all active:scale-[0.97] disabled:opacity-60
              bg-indigo-500/20 border border-indigo-400/30 hover:bg-indigo-500/30
              backdrop-blur-md shadow-xl shadow-indigo-900/20"
          >
            {loading === "DeShea" ? (
              <div className="w-9 h-9 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
            ) : (
              <>
                <span className="text-5xl leading-none drop-shadow">💜</span>
                <span className="text-2xl font-black text-indigo-200 tracking-tight drop-shadow">DeShea</span>
              </>
            )}
          </button>

          <button
            onClick={() => handleLogin("Deepen")}
            disabled={!!loading}
            className="w-full rounded-3xl py-8 flex flex-col items-center gap-2.5 transition-all active:scale-[0.97] disabled:opacity-60
              bg-emerald-500/20 border border-emerald-400/30 hover:bg-emerald-500/30
              backdrop-blur-md shadow-xl shadow-emerald-900/20"
          >
            {loading === "Deepen" ? (
              <div className="w-9 h-9 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
            ) : (
              <>
                <span className="text-5xl leading-none drop-shadow">💚</span>
                <span className="text-2xl font-black text-emerald-200 tracking-tight drop-shadow">Deepen</span>
              </>
            )}
          </button>
        </div>

        {error && (
          <p className="text-center text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">
            {error}
          </p>
        )}

        <p className="text-center text-[11px] text-white/25 font-medium tracking-wider uppercase">
          Private · Shared household account
        </p>
      </div>
    </div>
  );
}
