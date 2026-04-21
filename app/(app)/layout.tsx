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
    <div className="flex flex-col min-h-screen bg-background">
      {/* Main content — bottom padding for nav bar */}
      <main className="flex-1 overflow-y-auto pb-24 safe-top scroll-container">
        {children}
      </main>

      {/* Fixed bottom navigation */}
      <BottomNav />
    </div>
  );
}
