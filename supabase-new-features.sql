-- ============================================================
-- Bills App — New Features Migration
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Add current_balance to bills table
ALTER TABLE bills ADD COLUMN IF NOT EXISTS current_balance numeric(10,2);

-- 2. Create messages table (for Deepen → DeShea messages)
CREATE TABLE IF NOT EXISTS messages (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  content     text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages: select own"
  ON messages FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "messages: insert own"
  ON messages FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "messages: update own"
  ON messages FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "messages: delete own"
  ON messages FOR DELETE USING (auth.uid() = user_id);
