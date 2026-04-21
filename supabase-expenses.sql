-- Run this in Supabase SQL Editor
CREATE TABLE IF NOT EXISTS expenses (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  paid_by         text not null check (paid_by in ('DeShea','Deepen')),
  amount          numeric(10,2) not null check (amount > 0),
  description     text not null,
  category        text not null default 'Other',
  expense_date    date not null,
  notes           text,
  created_at      timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS expenses_user_id_idx ON expenses(user_id);
CREATE INDEX IF NOT EXISTS expenses_expense_date_idx ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS expenses_paid_by_idx ON expenses(paid_by);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "expenses: select own" ON expenses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "expenses: insert own" ON expenses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "expenses: update own" ON expenses FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "expenses: delete own" ON expenses FOR DELETE USING (auth.uid() = user_id);
