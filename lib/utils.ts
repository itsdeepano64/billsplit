import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  addMonths,
  addQuarters,
  addYears,
  setDate,
  startOfMonth,
  endOfMonth,
  isBefore,
  parseISO,
  format,
  differenceInDays,
} from "date-fns";
import type { Frequency } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "MMM d, yyyy");
}

export function formatShortDate(date: string | Date): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "MMM d");
}

/** Given a due_day and frequency, compute the next due date from today */
export function computeNextDueDate(dueDay: number, frequency: Frequency): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Try setting this month's due date
  let candidate = setDate(startOfMonth(today), Math.min(dueDay, 28));

  // If that date is in the past or today, advance by one period
  if (!isBefore(today, candidate) && today.getDate() >= dueDay) {
    candidate = advanceByFrequency(candidate, frequency);
  }

  return format(candidate, "yyyy-MM-dd");
}

/** Advance a date by one billing period */
export function advanceByFrequency(date: Date, frequency: Frequency): Date {
  switch (frequency) {
    case "monthly":
      return addMonths(date, 1);
    case "quarterly":
      return addQuarters(date, 1);
    case "yearly":
      return addYears(date, 1);
    default:
      return addMonths(date, 1);
  }
}

/** Advance the next_due_date string by one period */
export function advanceDueDate(currentDueDate: string, frequency: Frequency): string {
  const current = parseISO(currentDueDate);
  const next = advanceByFrequency(current, frequency);
  return format(next, "yyyy-MM-dd");
}

/** Days until (or since) a due date. Negative = overdue. */
export function daysUntilDue(dueDateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = parseISO(dueDateStr);
  return differenceInDays(dueDate, today);
}

/** Is a bill overdue? */
export function isOverdue(dueDateStr: string): boolean {
  return daysUntilDue(dueDateStr) < 0;
}

/** Is a bill due within N days? */
export function isDueSoon(dueDateStr: string, days = 7): boolean {
  const d = daysUntilDue(dueDateStr);
  return d >= 0 && d <= days;
}

/** Get current month bounds as ISO strings */
export function currentMonthBounds(): { start: string; end: string } {
  const now = new Date();
  return {
    start: format(startOfMonth(now), "yyyy-MM-dd"),
    end: format(endOfMonth(now), "yyyy-MM-dd"),
  };
}

/** Get month bounds for a given year/month */
export function monthBounds(year: number, month: number): { start: string; end: string } {
  const d = new Date(year, month - 1, 1);
  return {
    start: format(startOfMonth(d), "yyyy-MM-dd"),
    end: format(endOfMonth(d), "yyyy-MM-dd"),
  };
}

export function getCategoryEmoji(category: string): string {
  const map: Record<string, string> = {
    Housing: "🏠",
    Utilities: "⚡",
    Phone: "📱",
    Auto: "🚗",
    Home: "🔧",
    Credit: "💳",
    Business: "💼",
  };
  return map[category] ?? "📄";
}

export function getDueDateColor(daysUntil: number): string {
  if (daysUntil < 0) return "text-red-400";
  if (daysUntil <= 3) return "text-red-400";
  if (daysUntil <= 7) return "text-amber-400";
  return "text-muted-foreground";
}

export function getDueDateBadge(daysUntil: number): { label: string; className: string } {
  if (daysUntil < 0)
    return {
      label: `${Math.abs(daysUntil)}d overdue`,
      className: "bg-red-500/20 text-red-400 border-red-500/30",
    };
  if (daysUntil === 0)
    return { label: "Due today", className: "bg-red-500/20 text-red-400 border-red-500/30" };
  if (daysUntil === 1)
    return {
      label: "Due tomorrow",
      className: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    };
  if (daysUntil <= 7)
    return {
      label: `${daysUntil}d left`,
      className: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    };
  return {
    label: `${daysUntil}d left`,
    className: "bg-muted text-muted-foreground border-border",
  };
}
