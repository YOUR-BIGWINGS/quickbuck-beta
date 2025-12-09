# 🚀 QuickBuck+ Stripe - Quick Reference

## ✅ What's Done

- Payment button is linked and ready
- Subscription page at `/subscription`
- Settings page shows subscription status
- All backend code complete
- Webhook configured in code

## 📝 Your To-Do List

### 1. Get Stripe Keys (5 min)

```
https://dashboard.stripe.com
→ Developers → API Keys
```

Copy:

- Publishable key: `pk_test_...`
- Secret key: `sk_test_...` (click Reveal)

### 2. Add Keys to Environment

**A) Frontend (.env.local):**

```env
STRIPE_SECRET_KEY=sk_test_...
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...  (get this in step 3)
```

**B) Backend (Convex - CRITICAL!):**

```bash
npx convex env set STRIPE_SECRET_KEY sk_test_...
npx convex env set STRIPE_WEBHOOK_SECRET whsec_...
```

⚠️ **Must do both!** Convex functions need their own env vars.

### 3. Create Webhook (3 min)

```
https://dashboard.stripe.com/webhooks
→ Add endpoint
```

- URL: `YOUR_VITE_CONVEX_URL/api/webhooks/stripe`
- Events:
  - customer.subscription.created
  - customer.subscription.updated
  - customer.subscription.deleted
  - invoice.payment_succeeded
  - invoice.payment_failed
- Copy signing secret → add to .env.local

### 4. Test (2 min)

1. Go to `/subscription`
2. Click "Subscribe Now"
3. Use card: `4242 4242 4242 4242`
4. Date: 12/34, CVC: 123, ZIP: 12345
5. Done! ✅

## 🎯 Key URLs

- **Subscribe:** `/subscription`
- **Settings:** `/dashboard/settings`
- **Stripe Dashboard:** https://dashboard.stripe.com

## 💳 Test Cards

| Card                | Result      |
| ------------------- | ----------- |
| 4242 4242 4242 4242 | Success ✅  |
| 4000 0000 0000 9995 | Declined ❌ |

## 💰 Pricing

- **Plan:** QuickBuck+
- **Price:** $3 AUD/month
- **Your cut:** $2.61/month (after Stripe fees)

## 🔍 Where's My Convex URL?

Check `.env.local` → `VITE_CONVEX_URL`

Example webhook URL:

```
https://curious-shark-123.convex.cloud/api/webhooks/stripe
```

## 📚 More Info

- Quick: `STRIPE_SETUP_SIMPLE.md`
- Detailed: `STRIPE_SETUP_GUIDE.md`
- Summary: `STRIPE_INTEGRATION_SUMMARY.md`

## ⚠️ Remember

- Use TEST mode keys first
- Don't commit .env.local to git
- Test before going live
- Switch to LIVE keys when ready
