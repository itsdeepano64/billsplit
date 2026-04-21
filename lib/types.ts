export type Frequency = "monthly" | "quarterly" | "yearly";
export type Payer = "DeShea" | "Deepen";

export interface Bill {
  id: string;
  name: string;
  amount: number;
  due_day: number;
  frequency: Frequency;
  category: string;
  notes: string | null;
  default_paid_by: Payer | null;
  next_due_date: string; // ISO date string YYYY-MM-DD
  created_at: string;
  user_id: string;
}

export interface Payment {
  id: string;
  bill_id: string;
  paid_by: Payer;
  paid_date: string; // ISO date string
  amount_paid: number;
  notes: string | null;
  created_at: string;
  user_id: string;
  bill?: Bill; // joined
}

export interface MonthlySummary {
  total: number;
  byDeshea: number;
  byDeepen: number;
  balance: number; // positive = DeShea owes Deepen, negative = Deepen owes DeShea
  count: number;
}

export interface BillWithStatus extends Bill {
  isOverdue: boolean;
  daysUntilDue: number;
  lastPayment?: Payment;
}
