-- Expense line items + thumbnails.
-- Items live in a jsonb array on the expense row, so they inherit the existing
-- expenses RLS ("own rows only") and load with the same select — no join, no extra policy.
--
-- items: [{ name, sku?, model?, qty, unit_price, line_total, image_url?, product_url?, excluded? }]
--   excluded = true → shown greyed out, not counted in the expense amount (e.g. a non-tool item on a tool receipt).

alter table public.expenses
  add column if not exists items jsonb not null default '[]'::jsonb,
  add column if not exists thumbnail_url text,   -- first item's image; UI falls back to the receipt image, then the category icon
  add column if not exists order_number text,
  add column if not exists store text,           -- store name / location, e.g. "Alton, IL #6920"
  add column if not exists subtotal numeric(10,2),
  add column if not exists tax numeric(10,2);

do $$ begin
  alter table public.expenses
    add constraint expenses_items_is_array check (jsonb_typeof(items) = 'array');
exception when duplicate_object then null; end $$;
