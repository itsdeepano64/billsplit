# BillSplit — Setup Guide

## Project Structure
```
billsplit/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── layout.tsx
│   ├── (app)/
│   │   ├── layout.tsx          ← bottom nav, auth guard
│   │   ├── page.tsx            ← dashboard
│   │   ├── bills/page.tsx
│   │   ├── history/page.tsx
│   │   ├── reports/page.tsx
│   │   └── settings/page.tsx
│   ├── api/
│   │   ├── bills/route.ts
│   │   ├── payments/route.ts
│   │   └── seed/route.ts
│   ├── globals.css
│   ├── layout.tsx              ← root layout, PWA meta
│   └── manifest.ts
├── components/
│   ├── ui/                     ← shadcn primitives
│   ├── BillCard.tsx
│   ├── QuickPayButton.tsx
│   ├── BottomNav.tsx
│   ├── PaymentHistoryRow.tsx
│   └── ReportChart.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   ├── utils.ts
│   └── seed-data.ts
├── public/
│   ├── icons/                  ← PWA icons
│   └── sw.js                   ← service worker
├── middleware.ts
├── next.config.ts
├── tailwind.config.ts
└── package.json
```
