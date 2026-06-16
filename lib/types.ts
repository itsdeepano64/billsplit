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
  next_due_date: string;
  current_balance: number | null;
  created_at: string;
  user_id: string;
}

export interface Payment {
  id: string;
  bill_id: string;
  paid_by: Payer;
  paid_date: string;
  amount_paid: number;
  notes: string | null;
  created_at: string;
  user_id: string;
  bill?: Bill;
}

export interface MonthlySummary {
  total: number;
  byDeshea: number;
  byDeepen: number;
  balance: number;
  count: number;
}

export interface BillWithStatus extends Bill {
  isOverdue: boolean;
  daysUntilDue: number;
  lastPayment?: Payment;
}

export interface Message {
  id: string;
  user_id: string;
  for_user: "DeShea" | "Deepen";
  content: string;
  created_at: string;
  updated_at: string;
}

export type TransferDirection = 'DeShea→Deepen' | 'Deepen→DeShea';
export type TransferMethod = 'OnePay' | 'Bank Transfer' | 'Apple Pay' | 'Cash';

export interface Transfer {
  id: string;
  user_id: string;
  amount: number;
  transfer_date: string;
  direction: TransferDirection;
  method: TransferMethod;
  notes: string | null;
  created_at: string;
}
