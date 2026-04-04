# feedio — Backend Setup Guide

Full walkthrough for connecting Supabase (auth + database) and Stripe (payments).

---

## Prerequisites

- Node.js ≥ 20
- [Supabase CLI](https://supabase.com/docs/guides/cli) (`npm i -g supabase`)
- A [Supabase account](https://supabase.com) (free tier is fine)
- A [Stripe account](https://stripe.com) (test mode)

---

## 1 — Supabase Project

### 1a. Create a project
Go to https://supabase.com/dashboard → **New project**.  
Pick a name, region, and password. Wait for provisioning (~1 min).

### 1b. Run the schema
In Supabase Dashboard → **SQL Editor**, paste the contents of:
```
supabase/migrations/001_initial.sql
```
Click **Run**. This creates all tables, RLS policies, and triggers.

### 1c. Copy your API keys
Go to **Settings → API**:
- **Project URL** → `VITE_SUPABASE_URL`
- **anon / public** → `VITE_SUPABASE_ANON_KEY`

### 1d. Create your `.env`
```bash
cp .env.example .env
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
```

---

## 2 — Stripe

### 2a. Create a product
Dashboard → **Products → Add product**:
- Name: `feedio Pro`
- Price: `$19.00` / month (recurring)

Copy the **Price ID** (starts with `price_`).

### 2b. Add to `.env`
```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_STRIPE_PRO_PRICE_ID=price_...
VITE_APP_URL=http://localhost:5173
```

---

## 3 — Supabase Edge Functions

### 3a. Log in to Supabase CLI
```bash
supabase login
supabase link --project-ref <your-project-ref>
```

Your project ref is in the dashboard URL: `https://supabase.com/dashboard/project/<ref>`.

### 3b. Set secrets
```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...   # from step 3d
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...     # Settings → API → service_role
```

### 3c. Deploy functions
```bash
supabase functions deploy create-checkout
supabase functions deploy stripe-webhook
```

### 3d. Register the Stripe webhook
In Stripe Dashboard → **Webhooks → Add endpoint**:
- URL: `https://<your-project-ref>.supabase.co/functions/v1/stripe-webhook`
- Events to listen for:
  - `checkout.session.completed`
  - `customer.subscription.deleted`
  - `customer.subscription.updated`
  - `invoice.payment_failed`

Copy the **Signing secret** (`whsec_...`) and set it via:
```bash
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## 4 — Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173. The demo banner will disappear once `VITE_SUPABASE_URL` is set.

---

## 5 — Testing payments locally

Use [Stripe CLI](https://stripe.com/docs/stripe-cli) to forward webhooks to your local Supabase:

```bash
# Forward to your local Supabase edge function
stripe listen --forward-to https://<project-ref>.supabase.co/functions/v1/stripe-webhook

# Or test against local Supabase dev server
stripe listen --forward-to http://localhost:54321/functions/v1/stripe-webhook
```

Test card: `4242 4242 4242 4242`, any future expiry, any CVC.

---

## 6 — Deploy to production

1. Set `VITE_APP_URL` to your production domain.
2. In Supabase → **Auth → URL Configuration**, add your production domain.
3. Enable email confirmations in `supabase/config.toml`.
4. Register a production Stripe webhook pointing to your production Supabase URL.
5. Deploy the app (Vercel, Netlify, etc.) — it's a static build:
   ```bash
   npm run build
   # dist/ folder is the deployable output
   ```

---

## Environment variable reference

| Variable | Where to get it |
|----------|----------------|
| `VITE_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon/public |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe Dashboard → Developers → API keys |
| `VITE_STRIPE_PRO_PRICE_ID` | Stripe Dashboard → Products → your Pro price |
| `VITE_APP_URL` | Your app's base URL (e.g. `http://localhost:5173`) |
| `STRIPE_SECRET_KEY` *(edge fn secret)* | Stripe Dashboard → API keys → Secret key |
| `STRIPE_WEBHOOK_SECRET` *(edge fn secret)* | Stripe Dashboard → Webhooks → your endpoint |
| `SUPABASE_SERVICE_ROLE_KEY` *(edge fn secret)* | Supabase → Settings → API → service_role |
