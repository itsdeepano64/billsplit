-- Run this in Supabase SQL Editor to add weekly split support
ALTER TABLE payments ADD COLUMN IF NOT EXISTS weekly_split boolean NOT NULL DEFAULT false;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS split_group_id uuid;
CREATE INDEX IF NOT EXISTS payments_split_group_idx ON payments(split_group_id);
