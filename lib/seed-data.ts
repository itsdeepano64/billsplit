import { computeNextDueDate } from "./utils";
import type { Frequency } from "./types";

interface SeedBill {
  name: string;
  amount: number;
  due_day: number;
  frequency: Frequency;
  category: string;
  notes: string | null;
  default_paid_by: "DeShea" | "Deepen" | null;
}

export const SEED_BILLS: SeedBill[] = [
  { name: "Mortgage",              amount: 826.24, due_day: 1,  frequency: "monthly", category: "Housing",   notes: "Balance: 49,081.82",              default_paid_by: null },
  { name: "Trash",                 amount: 27.00,  due_day: 20, frequency: "monthly", category: "Utilities", notes: null,                              default_paid_by: null },
  { name: "Water",                 amount: 120.00, due_day: 16, frequency: "monthly", category: "Utilities", notes: null,                              default_paid_by: null },
  { name: "Internet - Sparklight", amount: 81.00,  due_day: 27, frequency: "monthly", category: "Utilities", notes: null,                              default_paid_by: null },
  { name: "Electric & Gas - Ameren",amount: 365.00,due_day: 19, frequency: "monthly", category: "Utilities", notes: null,                              default_paid_by: null },
  { name: "Consumer Cellular",     amount: 145.00, due_day: 1,  frequency: "monthly", category: "Phone",     notes: null,                              default_paid_by: null },
  { name: "Cadillac - Capital One",amount: 536.00, due_day: 24, frequency: "monthly", category: "Auto",      notes: "Balance: 13,759.79",              default_paid_by: null },
  { name: "HVAC - Wells Fargo",    amount: 475.00, due_day: 16, frequency: "monthly", category: "Home",      notes: "Balance: 1,278.24",               default_paid_by: null },
  { name: "Care Credit - Synchrony",amount: 116.00,due_day: 1, frequency: "monthly", category: "Credit",    notes: "Balance: 3,648.38",               default_paid_by: null },
  { name: "Wells Fargo - Personal",amount: 25.00,  due_day: 28, frequency: "monthly", category: "Credit",    notes: "Balance: 940.78",                 default_paid_by: null },
  { name: "Citi",                  amount: 109.00, due_day: 14, frequency: "monthly", category: "Credit",    notes: "Balance: 12,391.75",              default_paid_by: null },
  { name: "Amazon - Chase",        amount: 44.00,  due_day: 25, frequency: "monthly", category: "Credit",    notes: "Balance: 2,513.41",               default_paid_by: null },
  { name: "AMEX - Deepen/Shea",    amount: 40.00,  due_day: 8,  frequency: "monthly", category: "Credit",    notes: "Balance: 375.36",                 default_paid_by: null },
  { name: "Chase Ink - Biz",       amount: 40.00,  due_day: 12, frequency: "monthly", category: "Business",  notes: "Balance: 1,198.80",               default_paid_by: null },
  { name: "AMEX - Biz",            amount: 35.00,  due_day: 13, frequency: "monthly", category: "Business",  notes: "Balance: 1,030.53",               default_paid_by: null },
  { name: "Wells Fargo - Biz",     amount: 110.00, due_day: 27, frequency: "monthly", category: "Business",  notes: "Balance: 11,904.86 (new tires)",  default_paid_by: null },
];

export function getSeedBillsWithDates() {
  return SEED_BILLS.map((bill) => ({
    ...bill,
    next_due_date: computeNextDueDate(bill.due_day, bill.frequency),
  }));
}
