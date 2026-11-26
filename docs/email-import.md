# Email / automated receipt import (receipt file always attached)

Every automated import goes through ONE endpoint that requires the receipt file, so an import can never
create an expense without its receipt.

- Endpoint: `POST https://rjwqgzjdkuxdmagglqxp.supabase.co/functions/v1/receipt-import`
  (Supabase Edge Function `receipt-import`, source: `supabase/functions/receipt-import/index.ts` in the repo)
- Auth: header `x-import-secret: <secret>`. The secret lives on the box at
  `/workspace/billsplit-work/.import-secret` (chmod 600, never in git, never printed). Only its SHA-256 is stored
  in the DB (`public.import_secrets`, RLS on / no policies → service role only).
  Rotate: generate a new value, then `update public.import_secrets set secret_sha256 = '<sha256 of new value>' where name='receipt-import';`
- The function uses the service role (injected by Supabase at runtime) to upload to the public `receipts` bucket
  and to write the expense. The service role key is never in the client, repo, or Vercel env.

## Request (multipart, preferred)

```bash
SECRET=$(tr -d '\n' < /workspace/billsplit-work/.import-secret)
curl -s -X POST https://rjwqgzjdkuxdmagglqxp.supabase.co/functions/v1/receipt-import \
  -H "x-import-secret: $SECRET" \
  -F "file=@receipt.pdf;type=application/pdf" \
  -F 'expense={
    "source_ref": "<gmail message id>",          // REQUIRED, unique: dedupes & makes re-runs update, not duplicate
    "source": "email",
    "expense_date": "2026-11-18",                // required for a NEW expense
    "amount": 511.68,                            // required for a NEW expense (tool total incl. tax)
    "vendor": "Home Depot",
    "description": "Home Depot · Milwaukee M18 …",
    "category": "Tools",
    "tab_name": "Tools for Pruitt Mechanical Services",   // or "tab_id": "<uuid>"; resolves the owner
    "paid_by": "Deepen", "shared": false,
    "order_number": "WN77619395", "store": "Home Depot Alton, IL #6920",
    "subtotal": 474.44, "tax": 37.24,
    "items": [{"name":"…","qty":1,"unit_price":169.32,"line_total":169.32,"sku":"…","model":"…",
               "image_url":"https://…","product_url":"https://…","excluded":false}],
    "thumbnail_url": "https://…"                 // first counted item's image
  }'
```

JSON alternative: `Content-Type: application/json` with `{ "file_base64", "file_name", "content_type", "expense": {…} }`.

## Behavior
- **No file → `400 A receipt file is required`** (nothing is created). Wrong/missing secret → `401`.
- New `source_ref` → inserts the expense with `receipt_url` + `receipt_path` set. Existing `source_ref` → updates it
  and swaps in the new file (the old file is deleted).
- Files: pdf / png / jpg / webp / heic. Stored at `receipts/<timestamp>-<id>.<ext>` (same convention as the app),
  `receipt_url` = public URL. Response: `{ ok, expense_id, created, receipt_url, receipt_path }`.
- For HTML-only emails (Lowe's, Harbor Freight, HD order emails): render the email HTML to PDF first
  (strip tracking pixels), e.g. `google-chrome --headless=new --no-sandbox --no-pdf-header-footer --virtual-time-budget=20000 --print-to-pdf=out.pdf file://…/email.html`.
  The 8 receipts imported so far were done exactly this way (staged in `/workspace/billsplit-work/receipts-pdf/`).

## Routine checklist (weekly import)
1. Search both inboxes (deepenptech@gmail.com, deepanotrades@gmail.com) for new tool receipts (Home Depot, Lowe's, Harbor Freight…; no food).
2. Skip any whose Gmail message id already exists as `source_ref`.
3. Parse items + product photos; build the receipt PDF (attachment or rendered HTML).
4. POST to `receipt-import` with the file. Never insert expenses directly without a file.
5. Verify: every `expenses where source='email'` has non-null `receipt_url` and `receipt_path`, and the URL returns 200.
