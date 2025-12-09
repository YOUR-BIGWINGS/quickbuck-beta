# Ko-fi Setup Guide for QuickBuck+

## Why Ko-fi?

- ✅ **NO business verification required** - Works with personal PayPal
- ✅ **NO ABN/company needed** - Perfect for individuals
- ✅ Super simple setup (5-10 minutes)
- ✅ Monthly memberships supported
- 💰 5% fee OR free with Ko-fi Gold ($6/month)

---

## Step 1: Create Ko-fi Account

1. Go to https://ko-fi.com
2. Click **Sign Up**
3. Create your account (use your real name or project name)
4. Complete profile setup

---

## Step 2: Set Up Membership Tier

1. In Ko-fi dashboard, go to **Monetization** → **Memberships**
2. Click **Enable Memberships**
3. Create a membership tier:
   - **Name**: QuickBuck+ (or "Premium Member")
   - **Price**: $3.00 per month (or your preferred amount)
   - **Description**:
     ```
     Get premium QuickBuck features:
     • Special gold VIP tag
     • Access to exclusive premium themes
     • Stock analysis bot with daily recommendations
     • Investment insights and suggestions
     ```
4. **Save** the tier

---

## Step 3: Connect Payment Method

1. Go to **Settings** → **Payouts**
2. Connect your **PayPal account** (personal PayPal works!)
   - Or connect **Stripe** if you prefer (but PayPal is simpler)
3. No business verification needed for PayPal

---

## Step 4: Get Your Ko-fi Page URL

1. Your Ko-fi page URL will be: `https://ko-fi.com/yourpage`
2. The membership URL is: `https://ko-fi.com/yourpage/membership`
3. Copy this URL

---

## Step 5: Configure Environment Variables

### For the Frontend (Ko-fi URL)

Create a `.env` file in your project root (if you don't have one):

```bash
NEXT_PUBLIC_KOFI_URL=https://ko-fi.com/yourpage/membership
```

Replace `yourpage` with your actual Ko-fi username.

### For Webhooks (Optional but Recommended)

1. In Ko-fi dashboard, go to **Settings** → **API**
2. Enable **Webhooks**
3. Copy your **Verification Token**
4. Set webhook URL to your Convex endpoint:

   ```
   https://your-convex-deployment.convex.site/kofiWebhook
   ```

   (Get your Convex URL from: `npx convex dashboard` → HTTP Actions)

5. Set the verification token in Convex:
   ```powershell
   npx convex env set KOFI_VERIFICATION_TOKEN "your_token_here"
   ```

---

## Step 6: Test the Integration

1. Start your dev server (if not running)
2. Go to your app's pricing page
3. Click **Subscribe to QuickBuck+**
4. It should open your Ko-fi membership page in a new tab
5. Complete a test subscription (you can cancel it immediately)

---

## How It Works

### User Flow:

1. User clicks "Subscribe" in your app
2. Opens Ko-fi membership page in new tab
3. User subscribes on Ko-fi
4. Ko-fi sends webhook to your Convex backend
5. Your backend activates premium features

### Important Note:

Ko-fi doesn't automatically link users to your app. You have two options:

#### Option A: Manual Activation (Simpler)

1. Users subscribe on Ko-fi
2. They email you their Ko-fi email
3. You manually activate their subscription in the database

#### Option B: Email-Based Matching (Automated)

1. Users subscribe on Ko-fi with same email as their QuickBuck account
2. Webhook matches email and activates automatically
3. Requires users to use same email for both accounts

---

## Webhook Setup (Optional but Recommended)

The webhook lets Ko-fi notify your app when someone subscribes/unsubscribes.

### Webhook Events:

- New subscription → Activate premium
- Subscription renewed → Keep premium active
- Subscription cancelled → Deactivate premium

### Testing Webhooks:

1. Ko-fi dashboard → API → Test Webhook
2. Check Convex logs: `npx convex logs`
3. Verify subscription appears in your database

---

## Managing Subscriptions

### View Active Subscribers:

1. Ko-fi dashboard → **Supporters**
2. Filter by **Members**
3. See all active subscriptions

### Cancel/Refund:

1. Find member in Ko-fi dashboard
2. Click **Actions** → **Cancel Membership** or **Issue Refund**

---

## Matching Ko-fi Users to QuickBuck Users

Since Ko-fi doesn't send your app's user ID, you need to match subscribers. Here are the options:

### Option 1: Email Matching (Recommended)

Update the webhook to find users by email:

```typescript
// In convex/kofiWebhook.ts, replace the handleSubscription function:
async function handleSubscription(ctx: any, kofiData: any) {
  const email = kofiData.email;

  // Find user by email in your users table
  const user = await ctx.db
    .query("users")
    .withIndex("by_email", (q: any) => q.eq("email", email))
    .first();

  if (!user) {
    console.error(`No user found with email: ${email}`);
    return;
  }

  // Rest of the code...
}
```

### Option 2: Custom Message Field

Tell users to include their user ID in the Ko-fi message field when subscribing.

### Option 3: Manual Linking

Keep a separate table mapping Ko-fi emails to user IDs and link them manually.

---

## Costs

### Ko-fi Fees:

- **Standard**: 5% platform fee
- **Ko-fi Gold**: $6/month, 0% platform fee (worth it if you get >2 subscribers)

### Payment Processing:

- PayPal: ~2.9% + $0.30 per transaction
- Stripe: ~2.9% + $0.30 per transaction

### Example:

- $3/month subscription
- With Ko-fi Standard (5%) + PayPal (2.9%):
  - You get: ~$2.61 per subscriber
- With Ko-fi Gold (0%) + PayPal (2.9%):
  - You get: ~$2.82 per subscriber

---

## Troubleshooting

### "Ko-fi page opens but subscription doesn't activate"

- Check that webhook is configured correctly
- Verify email matching is working
- Check Convex logs for errors

### "Can't find my Ko-fi URL"

- It's `https://ko-fi.com/[your-username]`
- Find it in Ko-fi dashboard → Settings → Page URL

### "Users can't find membership option"

- Make sure you've enabled memberships
- Share the direct membership URL: `https://ko-fi.com/yourpage/membership`

---

## Current Status

✅ Lemon Squeezy removed
✅ Ko-fi integration code complete
✅ Frontend updated to redirect to Ko-fi
⏳ Awaiting Ko-fi account setup
⏳ Need to set NEXT_PUBLIC_KOFI_URL environment variable

---

## Next Steps

1. **Create Ko-fi account** and set up membership tier ($3/month)
2. **Set environment variable**:
   ```bash
   NEXT_PUBLIC_KOFI_URL=https://ko-fi.com/yourpage/membership
   ```
3. **Test** by clicking subscribe button in your app
4. **(Optional)** Set up webhook for automatic activation
5. **(Optional)** Implement email-based user matching

---

## Support

- Ko-fi Help: https://help.ko-fi.com
- Ko-fi Dashboard: https://ko-fi.com/manage
- Test your membership page before going live!
