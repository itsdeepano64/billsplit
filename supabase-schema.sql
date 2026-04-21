-- ============================================================
-- BillSplit — Complete Supabase SQL Schema
-- Run this entire file in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────
-- BILLS TABLE
-- ─────────────────────────────────────────
create table if not exists bills (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  amount        numeric(10,2) not null check (amount >= 0),
  due_day       integer not null check (due_day between 1 and 31),
  frequency     text not null check (frequency in ('monthly','quarterly','yearly')),
  category      text not null default 'Other',
  notes         text,
  default_paid_by text check (default_paid_by in ('DeShea','Deepen')),
  next_due_date date not null,
  created_at    timestamptz not null default now()
);

-- ─────────────────────────────────────────
-- PAYMENTS TABLE
-- ─────────────────────────────────────────
create table if not exists payments (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  bill_id       uuid not null references bills(id) on delete cascade,
  paid_by       text not null check (paid_by in ('DeShea','Deepen')),
  paid_date     date not null,
  amount_paid   numeric(10,2) not null check (amount_paid >= 0),
  notes         text,
  created_at    timestamptz not null default now()
);

-- ─────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────
create index if not exists bills_user_id_idx on bills(user_id);
create index if not exists bills_next_due_date_idx on bills(next_due_date);
create index if not exists payments_user_id_idx on payments(user_id);
create index if not exists payments_bill_id_idx on payments(bill_id);
create index if not exists payments_paid_date_idx on payments(paid_date);
create index if not exists payments_paid_by_idx on payments(paid_by);

-- ─────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────
alter table bills enable row level security;
alter table payments enable row level security;

-- Bills: users see and manage their own bills
create policy "bills: select own"
  on bills for select
  using (auth.uid() = user_id);

create policy "bills: insert own"
  on bills for insert
  with check (auth.uid() = user_id);

create policy "bills: update own"
  on bills for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "bills: delete own"
  on bills for delete
  using (auth.uid() = user_id);

-- Payments: users see and manage their own payments
create policy "payments: select own"
  on payments for select
  using (auth.uid() = user_id);

create policy "payments: insert own"
  on payments for insert
  with check (auth.uid() = user_id);

create policy "payments: update own"
  on payments for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "payments: delete own"
  on payments for delete
  using (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- SHARED ACCESS POLICY (OPTIONAL)
-- If you want DeShea and Deepen to share
-- the same data, uncomment this block and
-- comment out the RLS policies above.
-- Both users must be in the same "household".
-- For simplicity, the app uses per-user data
-- and both people log in with the same account.
-- ─────────────────────────────────────────
-- (Leave commented unless you want multi-user shared data)

-- ─────────────────────────────────────────
-- REALTIME (optional, for live updates)
-- ─────────────────────────────────────────
-- alter publication supabase_realtime add table bills;
-- alter publication supabase_realtime add table payments;
