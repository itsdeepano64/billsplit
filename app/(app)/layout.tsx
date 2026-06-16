import BottomNav from "@/components/BottomNav";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <>
      {/* Page content scrolls naturally at the body level */}
      <main className="min-h-screen bg-background pb-[calc(80px+env(safe-area-inset-bottom))] pt-[env(safe-area-inset-top)]">
        {children}
      </main>

      {/* Fixed bottom navigation — anchored to viewport, not a scroll container */}
      <BottomNav />
    </>
  );
}
