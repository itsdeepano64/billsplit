import { createClient } from "@/lib/supabase/server";
import SettingsClient from "@/components/SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: bills } = await supabase.from("bills").select("*").order("name");

  return (
    <div className="px-4 pt-6 pb-4 space-y-6 max-w-lg mx-auto animate-fade-in">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      <SettingsClient user={user} bills={bills ?? []} />
    </div>
  );
}
