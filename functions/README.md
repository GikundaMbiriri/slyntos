# Firebase Functions for Slyntos AI

This directory contains Firebase Cloud Functions for handling secure M-Pesa payment callbacks.

## Setup

1. **Install Dependencies**

   ```bash
   cd functions
   npm install
   ```

2. **Update Project ID**
   - Update the project ID in `.firebaserc` to match your Firebase project
   - Update the callback URL in `src/services/unifiedPaymentService.ts` to use your project ID

3. **Deploy Functions**
   ```bash
   npm run deploy
   ```

## Functions

### tumaCallback

- **URL**: `https://us-central1-YOUR-PROJECT-ID.cloudfunctions.net/tumaCallback`
- **Purpose**: Receives M-Pesa payment confirmation callbacks from Tuma API
- **Security**: Only processes verified callbacks with valid payment sessions

## How It Works

1. User initiates payment via STK Push
2. Payment session stored in Firestore
3. User completes payment on phone
4. Tuma API sends callback to Firebase Function
5. Function verifies payment and updates user plan
6. Payment session is cleaned up

## Security Features

- ✅ Only real M-Pesa callbacks can upgrade users
- ✅ Payment simulations completely disabled
- ✅ Sessions expire after 10 minutes
- ✅ All payments logged for audit trail
- ✅ User verification before plan updates
