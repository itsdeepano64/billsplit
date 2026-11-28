-- Additive: per-tab access level for DeShea.
--   hidden = she can't see the tab or its expenses
--   view   = she can see it, not add/edit
--   edit   = "View + add": she can see it and add expenses (and edit/delete her own)
-- NOTE: enforced in the app UI only. Both people share ONE Supabase login, so RLS ("own rows") cannot tell
-- them apart. True enforcement needs DeShea to have her own login (then RLS can key on auth.uid()).
alter table public.expense_tabs
  add column if not exists deshea_access text not null default 'hidden';

do $$ begin
  alter table public.expense_tabs
    add constraint expense_tabs_deshea_access_check check (deshea_access in ('hidden','view','edit'));
exception when duplicate_object then null; end $$;

-- Preserve existing behavior: shared / DeShea-owned tabs were fully usable by her.
update public.expense_tabs set deshea_access = 'edit' where owner in ('shared','DeShea') and deshea_access = 'hidden';

-- Tools for Pruitt: View only. Legacy owner flag kept in sync so older cached app builds also show it.
update public.expense_tabs set deshea_access = 'view', owner = 'shared'
 where name = 'Tools for Pruitt Mechanical Services';
