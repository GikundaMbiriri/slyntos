# Stripe Payment Integration Setup

This document provides step-by-step instructions for setting up Stripe payment processing in your Slyntos application.

## Prerequisites

1. A Stripe account (create one at [stripe.com](https://stripe.com))
2. Access to your Stripe Dashboard

## Setup Steps

### 1. Get Your Stripe API Keys

1. Log in to your [Stripe Dashboard](https://dashboard.stripe.com/)
2. Navigate to **Developers** → **API Keys**
3. Copy the following keys:
   - **Publishable key** (starts with `pk_test_` for test mode)
   - **Secret key** (starts with `sk_test_` for test mode)

### 2. Create a Product and Price

1. In Stripe Dashboard, go to **Products**
2. Click **Add product**
3. Create a product for "Slyntos Pro":
   - Name: "Slyntos Pro Operator"
   - Description: "Unlimited access to all Slyntos features"
4. Add a price:
   - Price: $10.00
   - Billing: Recurring monthly
   - Copy the **Price ID** (starts with `price_`)

### 3. Configure Environment Variables

1. Copy `.env.example` to `.env`:

   ```bash
   cp .env.example .env
   ```

2. Update your `.env` file with your Stripe keys:
   ```env
   VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
   STRIPE_SECRET_KEY=sk_test_your_secret_key_here
   VITE_STRIPE_PRO_PRICE_ID=price_your_pro_price_id_here
   ```

### 4. Set Up Webhooks (Recommended for Production)

1. In Stripe Dashboard, go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Set endpoint URL to: `https://yourdomain.com/api/stripe/webhook`
4. Select events to listen for:
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
5. Copy the **Signing secret** (starts with `whsec_`)
6. Add to your `.env`:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
   ```

### 5. Test Payment Integration

1. Start your development server:

   ```bash
   npm run dev
   ```

2. Navigate to your app and try to upgrade to Pro
3. Use Stripe's test card numbers:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
   - Any future expiry date and CVC

### 6. Payment Flow

The Stripe integration provides two payment methods:

1. **Stripe Checkout** (Recommended):
   - Secure, hosted payment page
   - PCI compliant
   - Handles card validation
   - Supports multiple payment methods

2. **Legacy Access Codes** (Fallback):
   - Manual activation codes
   - Useful for testing or special promotions
   - Current Pro code: `39759298`

## Features Included

- ✅ Secure payment processing with Stripe
- ✅ Subscription management
- ✅ Automatic plan upgrades/downgrades
- ✅ Webhook handling for subscription updates
- ✅ Customer portal for subscription management
- ✅ Rate limiting on payment endpoints
- ✅ Comprehensive error handling
- ✅ Development/test mode support

## Testing Checklist

- [ ] Environment variables configured correctly
- [ ] Stripe keys are valid and working
- [ ] Payment form loads without errors
- [ ] Test payment succeeds with test card
- [ ] User plan upgrades after successful payment
- [ ] Webhook endpoint receives events (if configured)
- [ ] Error handling works for declined cards

## Production Deployment

1. Switch to live Stripe keys:
   - Replace `pk_test_` with `pk_live_`
   - Replace `sk_test_` with `sk_live_`
   - Update webhook endpoints to production URLs

2. Set up proper webhook endpoint security
3. Configure SSL/HTTPS for your domain
4. Test with real payment methods

## Troubleshooting

### Common Issues

1. **"Stripe not available" error**:
   - Check that `STRIPE_SECRET_KEY` is set in your environment
   - Verify the key format starts with `sk_test_` or `sk_live_`

2. **Payment button doesn't work**:
   - Check browser console for JavaScript errors
   - Verify `VITE_STRIPE_PUBLISHABLE_KEY` is set correctly
   - Ensure the price ID exists in your Stripe account

3. **Webhook errors**:
   - Verify webhook endpoint URL is accessible
   - Check that `STRIPE_WEBHOOK_SECRET` matches your Stripe dashboard
   - Review webhook logs in Stripe Dashboard

### Support

For additional help:

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe API Reference](https://stripe.com/docs/api)
- [Stripe Testing Guide](https://stripe.com/docs/testing)

---

_This integration includes both modern Stripe payment processing and legacy activation codes for maximum flexibility._
