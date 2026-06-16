-- ============================================================
-- Messages — bidirectional update
-- Run this in Supabase SQL Editor
-- ============================================================

-- Add a for_user column so messages can be targeted to a specific person
ALTER TABLE messages ADD COLUMN IF NOT EXISTS for_user text NOT NULL DEFAULT 'DeShea';

-- Update existing messages (if any) to set for_user = 'DeShea' (already the default)
-- No further action needed for existing rows.
