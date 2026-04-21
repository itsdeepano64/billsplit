"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [loading, setLoading] = useState<"DeShea" | "Deepen" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

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
    } catch (err: any) {
      setError("Login failed. Check environment variables.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-10">

        <div className="text-center space-y-3">
          <div className="text-6xl">🏠</div>
          <h1 className="text-4xl font-bold tracking-tight">Bills</h1>
          <p className="text-muted-foreground text-sm">Household finances · DeShea & Deepen</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => handleLogin("DeShea")}
            disabled={!!loading}
            className="w-full rounded-2xl py-7 flex flex-col items-center gap-2 transition-all active:scale-[0.97] disabled:opacity-60 bg-indigo-500/20 border-2 border-indigo-500/40 hover:bg-indigo-500/30"
          >
            {loading === "DeShea" ? (
              <div className="w-8 h-8 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
            ) : (
              <>
                <span className="text-4xl">💜</span>
                <span className="text-2xl font-bold text-indigo-300">DeShea</span>
              </>
            )}
          </button>

          <button
            onClick={() => handleLogin("Deepen")}
            disabled={!!loading}
            className="w-full rounded-2xl py-7 flex flex-col items-center gap-2 transition-all active:scale-[0.97] disabled:opacity-60 bg-emerald-500/20 border-2 border-emerald-500/40 hover:bg-emerald-500/30"
          >
            {loading === "Deepen" ? (
              <div className="w-8 h-8 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
            ) : (
              <>
                <span className="text-4xl">💚</span>
                <span className="text-2xl font-bold text-emerald-300">Deepen</span>
              </>
            )}
          </button>
        </div>

        {error && <p className="text-center text-sm text-destructive">{error}</p>}
        <p className="text-center text-xs text-muted-foreground">Private · Shared household account</p>
      </div>
    </div>
  );
}
