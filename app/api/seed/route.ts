import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSeedBillsWithDates } from "@/lib/seed-data";

export async function POST() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const seedBills = getSeedBillsWithDates();

  // Check which bills already exist (by name)
  const { data: existing } = await supabase
    .from("bills")
    .select("name")
    .eq("user_id", user.id);

  const existingNames = new Set((existing ?? []).map((b) => b.name));
  const toInsert = seedBills.filter((b) => !existingNames.has(b.name));

  if (toInsert.length === 0) {
    return NextResponse.json({ message: "All bills already exist — nothing to seed." });
  }

  const { error } = await supabase.from("bills").insert(
    toInsert.map((b) => ({ ...b, user_id: user.id }))
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    message: `✅ Seeded ${toInsert.length} bills successfully!`,
    count: toInsert.length,
  });
}
