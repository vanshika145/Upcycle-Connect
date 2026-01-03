# Razorpay Payment Integration Setup

This document explains how to set up Razorpay payment gateway for UpCycle Connect.

## Prerequisites

1. Create a Razorpay account at [https://razorpay.com](https://razorpay.com)
2. Complete the KYC verification process
3. Get your API keys from the Razorpay Dashboard

## Backend Setup

### 1. Get Your Razorpay API Keys

1. Log in to your Razorpay Dashboard
2. Go to **Settings** → **API Keys**
3. Generate a new key pair (or use existing test keys)
4. Copy your **Key ID** and **Key Secret**

### 2. Add Environment Variables

Add the following to your `server/.env` file:

```env
# Razorpay Configuration
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_key_secret_here
```

**Important:**
- For testing, use keys starting with `rzp_test_`
- For production, use keys starting with `rzp_live_`
- Never commit your `.env` file to version control

### 3. Test Mode

Razorpay provides test mode for development:
- Use test API keys
- Test card numbers: `4111 1111 1111 1111` (Visa)
- Use any future expiry date
- Use any CVV (e.g., `123`)

## Frontend Setup

The frontend automatically loads Razorpay checkout script when the payment modal opens. No additional configuration needed.

## Payment Flow

1. **Seeker clicks "Pay Now"** → Opens payment modal
2. **Backend creates Razorpay order** → `/api/payments/create-order`
3. **Razorpay checkout opens** → User completes payment
4. **Backend verifies payment** → `/api/payments/verify`
5. **Request status updated** → Payment marked as complete
6. **Provider notified** → Socket.IO event sent

## API Endpoints

### Create Payment Order
```
POST /api/payments/create-order
Body: { requestId: string }
Response: { order: { id, amount, currency, receipt }, keyId: string }
```

### Verify Payment
```
POST /api/payments/verify
Body: {
  requestId: string,
  razorpay_order_id: string,
  razorpay_payment_id: string,
  razorpay_signature: string
}
Response: { message: string, request: {...} }
```

## Testing

### Test Cards (Test Mode)

| Card Number | Card Type | Status |
|------------|-----------|--------|
| 4111 1111 1111 1111 | Visa | Success |
| 5555 5555 5555 4444 | Mastercard | Success |
| 5104 0600 0000 0008 | Mastercard | Success |

### Test Scenarios

1. **Successful Payment:**
   - Use test card: `4111 1111 1111 1111`
   - Any future expiry date
   - Any CVV
   - Payment should succeed

2. **Payment Failure:**
   - Use card: `4000 0000 0000 0002`
   - Payment will fail (test failure card)

## Production Deployment

1. **Switch to Live Mode:**
   - Update `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` with live keys
   - Ensure KYC is completed
   - Test with small amounts first

2. **Webhook Setup (Optional but Recommended):**
   - Configure webhooks in Razorpay Dashboard
   - Add webhook endpoint: `POST /api/payments/webhook`
   - Verify webhook signature for security

3. **Security:**
   - Never expose `RAZORPAY_KEY_SECRET` in frontend
   - Always verify payment signature on backend
   - Use HTTPS in production

## Troubleshooting

### Payment Modal Not Opening
- Check if Razorpay script is loaded (check browser console)
- Verify `RAZORPAY_KEY_ID` is set correctly
- Check network connectivity

### Payment Verification Fails
- Verify `RAZORPAY_KEY_SECRET` is correct
- Check if payment was actually successful in Razorpay Dashboard
- Verify signature calculation matches Razorpay's algorithm

### "Payment gateway not configured" Error
- Ensure `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are in `.env`
- Restart the server after adding environment variables

## Support

- Razorpay Documentation: [https://razorpay.com/docs](https://razorpay.com/docs)
- Razorpay Support: support@razorpay.com

