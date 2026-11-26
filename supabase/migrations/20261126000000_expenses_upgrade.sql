-- Expenses upgrade: sharing, vendor, import metadata, receipt path.
-- NOT applied automatically. Apply in the Supabase SQL editor (project rjwqgzjdkuxdmagglqxp)
-- BEFORE merging, so the new columns exist when the app writes them.
-- The app degrades gracefully if these columns are missing (writes retry without them).

alter table public.expenses
  add column if not exists shared boolean not null default false,  -- visible to DeShea (app-level)
  add column if not exists vendor text,
  add column if not exists source text not null default 'manual',
  add column if not exists source_ref text,                        -- e.g. gmail message id, for dedupe
  add column if not exists receipt_path text;                      -- storage path inside the receipts bucket

do $$ begin
  alter table public.expenses
    add constraint expenses_source_check check (source in ('manual','bulk_upload','email'));
exception when duplicate_object then null; end $$;

create unique index if not exists expenses_source_ref_uq
  on public.expenses (source_ref) where source_ref is not null;
create index if not exists expenses_tab_date_idx
  on public.expenses (tab_id, expense_date);

-- Tab sharing reuses the existing expense_tabs.owner column ('shared' | 'DeShea' | 'Deepen').

-- OPTIONAL phase 2, only once DeShea has her own Supabase login.
-- Today both people sign in with one shared account, so RLS can't separate them.
-- create policy "expenses: select shared" on public.expenses
--   for select using (shared);
-- create policy "expense_tabs: select shared" on public.expense_tabs
--   for select using (owner = 'shared');
