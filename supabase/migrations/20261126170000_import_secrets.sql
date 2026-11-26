-- Applied via the Supabase connector. The secret value itself is NOT in git: only its hash lives in the table (inserted separately).
-- Server-side secrets for the receipt-import edge function (stores only a SHA-256 hash).
-- RLS is on with no policies: only the service role (edge function) can read it.
create table if not exists public.import_secrets (
  name text primary key,
  secret_sha256 text not null,
  created_at timestamptz not null default now()
);
alter table public.import_secrets enable row level security;
revoke all on public.import_secrets from anon, authenticated;
