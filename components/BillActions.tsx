"use client";

import { useState } from "react";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { Bill } from "@/lib/types";
import { BillModal } from "./AddBillButton";

export default function BillActions({ bill }: { bill: Bill }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleDelete() {
    if (!confirm(`Delete "${bill.name}"? This won't delete payment history.`)) return;
    await supabase.from("bills").delete().eq("id", bill.id);
    router.refresh();
    setMenuOpen(false);
  }

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="w-8 h-8 flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted active:bg-muted transition-colors"
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 top-9 z-50 bg-popover border border-border rounded-2xl shadow-xl overflow-hidden min-w-[140px]">
              <button
                onClick={() => { setEditOpen(true); setMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-accent transition-colors"
              >
                <Pencil className="w-4 h-4 text-muted-foreground" />
                Edit
              </button>
              <button
                onClick={handleDelete}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </>
        )}
      </div>

      {editOpen && <BillModal existing={bill} onClose={() => setEditOpen(false)} />}
    </>
  );
}
