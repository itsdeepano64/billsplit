# BillSplit — Complete Setup Guide

## What You're Building
A mobile PWA for tracking and splitting household bills between DeShea & Deepen.
- Next.js 15 (App Router) + TypeScript + Tailwind
- Supabase (PostgreSQL) for data
- Vercel for hosting (free forever)
- Installable as a native-feeling app on any phone

---

## Step 1: Create the Supabase Project

1. Go to **supabase.com** → New project
2. Name it `billsplit`, pick a strong password, choose your region
3. Wait ~2 minutes for provisioning

4. Go to **SQL Editor** → New query
5. Copy the entire contents of `supabase-schema.sql` and run it
6. You should see "Success" — tables `bills` and `payments` are created

7. Go to **Project Settings → API**
8. Copy:
   - **Project URL** → `https://xxxxx.supabase.co`
   - **anon public key** → long JWT string

---

## Step 2: Create the GitHub Repository

1. Go to **github.com** → New repository
2. Name it `billsplit`, make it **Private**
3. Do NOT initialize with README (you'll push existing code)

---

## Step 3: Set Up the Project Locally

```bash
# Clone or create the project directory
cd ~/Documents
mkdir billsplit && cd billsplit

# Copy all project files from the deliverable into this directory

# Install dependencies
npm install

# Create your environment file
cp .env.local.example .env.local
```

Edit `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
```

---

## Step 4: Generate PWA Icons

You need two icon files in `public/icons/`:
- `icon-192.png` (192×192px)
- `icon-512.png` (512×512px)
- `apple-touch-icon.png` (180×180px)

**Free option:** Use https://www.pwabuilder.com/imageGenerator
- Upload any square image (your logo or a dollar sign emoji screenshot)
- Download the generated icons and put them in `public/icons/`

---

## Step 5: Run Locally

```bash
npm run dev
```

Open **http://localhost:3000** in your browser.

1. Click "Sign up" and create your account (use the email both you and DeShea will share, OR each create your own)
2. Go to **Settings → Seed Initial Bills** to import all 16 bills

---

## Step 6: Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit — BillSplit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/billsplit.git
git push -u origin main
```

---

## Step 7: Deploy to Vercel

1. Go to **vercel.com** → New Project
2. Import your `billsplit` GitHub repository
3. Framework: **Next.js** (auto-detected)
4. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your Supabase anon key
5. Click **Deploy**

Your app is live at `https://billsplit-xxx.vercel.app`

---

## Step 8: Configure Supabase Auth Redirect

1. In Supabase → **Authentication → URL Configuration**
2. Add your Vercel URL to **Redirect URLs**:
   ```
   https://billsplit-xxx.vercel.app/**
   ```
3. Also add `http://localhost:3000/**` for local dev

---

## Step 9: Install as PWA on Your Phone

**iPhone (Safari):**
1. Open your Vercel URL in Safari
2. Tap the Share button (box with arrow)
3. Tap "Add to Home Screen"
4. Name it "BillSplit" → Add

**Android (Chrome):**
1. Open your Vercel URL in Chrome
2. Tap the three-dot menu
3. Tap "Add to Home screen" or "Install app"

The app now launches full-screen with no browser UI, just like a native app.

---

## Step 10: Seed the Bills

1. Open the app on your phone
2. Sign in with your account
3. Go to **Settings**
4. Tap **"Seed Initial Bills"**
5. All 16 bills are imported with correct next due dates ✅

---

## Daily Usage

Every day you pay a bill:
1. Open BillSplit from your home screen
2. Find the bill on the Dashboard (it shows upcoming and overdue)
3. Tap **"PAID BY DeShea"** or **"PAID BY Deepen"**
4. Done — payment recorded, next due date automatically advanced ✅

---

## Sharing Between DeShea & Deepen

**Simplest approach (recommended):** Share one login
- Both people use the same email/password
- All data is shared automatically

**Two separate accounts:**
- Each person signs up with their own email
- Both can see all bills and payments (same user_id since you'll share one account)
- If you want truly separate accounts sharing data, you'd need a more complex setup — not needed for this use case

---

## Deployment Updates

When you make changes:
```bash
git add .
git commit -m "Update: description of change"
git push
```
Vercel auto-deploys on every push to `main`. Your live app updates in ~30 seconds.

---

## Costs: $0 Forever

| Service  | Free Tier | Your Usage |
|----------|-----------|------------|
| Vercel   | Unlimited deployments, 100GB bandwidth | < 1MB/month |
| Supabase | 500MB DB, 5GB bandwidth | < 1MB/month |
| Cloudflare (alternative) | Unlimited bandwidth | < 1MB/month |

The only way this costs money: Supabase pauses free projects after 7 days of inactivity.
**Fix:** Open the app at least once a week, or upgrade to Supabase Pro ($25/mo) to remove the pause.

---

## Troubleshooting

**"Cannot find module" errors:**
```bash
npm install
```

**Supabase connection errors:**
- Double-check your `.env.local` values
- Make sure you ran the SQL schema

**Bills not showing after seed:**
- Check Supabase → Table Editor → bills table has rows
- Check that RLS policies were created (SQL ran successfully)

**PWA not installing:**
- Must be served over HTTPS (Vercel provides this automatically)
- Icons must exist at `/public/icons/icon-192.png` and `icon-512.png`
