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

export type TransferDirection = "DeShea→Deepen" | "Deepen→DeShea";
export type TransferMethod = "OnePay" | "Bank Transfer" | "Apple Pay" | "Cash";

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

export interface ExpenseTab {
  id: string;
  user_id: string;
  name: string;
  owner: "DeShea" | "Deepen" | "shared";
  position: number;
  created_at: string;
}

export interface Expense {
  id: string;
  user_id: string;
  paid_by: Payer;
  amount: number;
  description: string;
  category: string;
  expense_date: string;
  notes: string | null;
  receipt_url: string | null;
  tab_id: string | null;
  created_at: string;
  // Added by supabase/migrations/20261126000000_expenses_upgrade.sql (may be undefined before it runs)
  shared?: boolean;
  vendor?: string | null;
  source?: "manual" | "bulk_upload" | "email";
  source_ref?: string | null;
  receipt_path?: string | null;
  // Added by supabase/migrations/20261126120000_expense_items.sql
  items?: ExpenseItem[] | null;
  thumbnail_url?: string | null;
  order_number?: string | null;
  store?: string | null;
  subtotal?: number | null;
  tax?: number | null;
}

export interface ExpenseItem {
  name: string;
  qty: number;
  unit_price: number;
  line_total: number;
  sku?: string | null;
  model?: string | null;
  image_url?: string | null;
  product_url?: string | null;
  /** Shown greyed out and not counted in the expense amount (e.g. a non-tool item on a tool receipt). */
  excluded?: boolean;
}
