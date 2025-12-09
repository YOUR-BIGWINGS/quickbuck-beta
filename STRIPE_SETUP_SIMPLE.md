ther# QuickBuck+ Stripe Setup - Quick Start

Your payment system is ready to go! Just follow these 5 simple steps:

## Step 1: Get Stripe Account

1. Go to https://dashboard.stripe.com/register
2. Create account (use test mode for now)

## Step 2: Get API Keys

1. In Stripe Dashboard, go to **Developers** → **API Keys**
2. Copy these keys:
   - **Publishable key** (starts with `pk_test_`)
   - **Secret key** (starts with `sk_test_` - click "Reveal" to see it)

## Step 3: Add Keys to Environment

**A) Add to `.env.local` (for frontend):**

```env
STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY_HERE
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY_HERE
```

**B) Add to Convex (for backend - CRITICAL!):**

Run these commands in your terminal:

```bash
npx convex env set STRIPE_SECRET_KEY sk_test_YOUR_SECRET_KEY_HERE
```

⚠️ **Important:** Convex functions run on Convex servers and need their own environment variables. The `.env.local` file only works for your frontend code.

## Step 4: Set Up Webhook

1. In Stripe Dashboard, go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Endpoint URL: `https://YOUR-CONVEX-URL.convex.cloud/api/webhooks/stripe`
   - Get your Convex URL from `VITE_CONVEX_URL` in your .env.local
   - Example: `https://curious-shark-123.convex.cloud/api/webhooks/stripe`
4. Select these events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Click **Add endpoint**
6. Copy the **Signing secret** (starts with `whsec_`)
7. Add to `.env.local`:

```env
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE
```

8. Add to Convex:

```bash
npx convex env set STRIPE_WEBHOOK_SECRET whsec_YOUR_WEBHOOK_SECRET_HERE
```

## Step 5: Test It

1. Make sure `npx convex dev` is running
2. Go to `/subscription` page in your app
3. Click **Subscribe Now**
4. Use test card: `4242 4242 4242 4242`
   - Any future date (e.g., 12/34)
   - Any 3-digit CVC
   - Any ZIP
5. Complete checkout
6. You should see active subscription!

## Test Cards

- **Success:** `4242 4242 4242 4242`
- **Declined:** `4000 0000 0000 9995`
- **Requires Auth:** `4000 0025 0000 3155`

## Where to Find Your Convex URL

Your `VITE_CONVEX_URL` is in `.env.local` and looks like:

```
VITE_CONVEX_URL=https://curious-shark-123.convex.cloud
```

Just add `/api/webhooks/stripe` to the end for the webhook URL.

## Going Live Later

When ready for production:

1. Switch to **live mode** in Stripe Dashboard
2. Get new live keys (start with `pk_live_` and `sk_live_`)
3. Create new webhook for live mode
4. Update .env.local with live keys

## That's It!

Your QuickBuck+ subscription system is now live. Users can:

- Subscribe for $3 AUD/month
- Get VIP tag and premium features
- Manage/cancel subscription anytime

## Need Help?

- Full documentation: `STRIPE_SETUP_GUIDE.md`
- Stripe docs: https://stripe.com/docs
- Test in Stripe Dashboard: https://dashboard.stripe.com/test/payments
