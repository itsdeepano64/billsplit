"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CreditCard, Clock, Receipt, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/",         label: "Home",     icon: Home },
  { href: "/bills",    label: "Bills",    icon: CreditCard },
  { href: "/expenses", label: "Expenses", icon: Receipt },
  { href: "/history",  label: "History",  icon: Clock },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/90 backdrop-blur-xl border-t border-border safe-bottom">
      <div className="flex items-stretch max-w-lg mx-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          // Match /history sub-routes too; exact match for root
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              prefetch={true}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1 py-3 touch-target",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon
                className={cn("w-5 h-5", active && "scale-110")}
                strokeWidth={active ? 2.5 : 2}
              />
              <span className={cn("text-[10px] tracking-wide", active ? "font-semibold" : "font-medium")}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
