# Payment and Razorpay Hardening Flow

## Purpose

This module safely creates patient payment orders, verifies successful gateway payments, activates programs, creates fee-share records, updates doctor wallets, and protects against duplicate payment side effects.

## Gateway Modes

Production:

```env
PAYMENT_GATEWAY_MODE=razorpay
```

Development/integration only:

```env
PAYMENT_GATEWAY_MODE=mock
```

Mock mode never runs in production and is used only to test backend invariants without contacting Razorpay.

## Order Creation

Endpoint:

`POST /api/payments/create-order`

Auth:

Patient only

Required:

```json
{
  "patientId": "PATIENT_ID",
  "programId": "PROGRAM_ID",
  "doctorId": "DOCTOR_ID"
}
```

Optional:

```json
{
  "idempotencyKey": "CLIENT_GENERATED_KEY",
  "couponCode": "CODE"
}
```

Backend checks:

- patient owns request
- mobile is verified
- consent is accepted
- doctor is approved and QR active
- program is active
- patient referral matches doctor
- same patient does not already have successful/active program purchase
- amount is locked at order creation

Locked order fields:

- `originalAmount`
- `discountAmount`
- `taxAmount`
- `gatewayCharges`
- `finalAmount`
- `pricingSnapshot`
- `gatewayOrderId`
- `idempotencyKey`

## Payment Verification

Endpoint:

`POST /api/payments/verify`

Auth:

Patient only

Required:

```json
{
  "razorpay_order_id": "order_xxx",
  "razorpay_payment_id": "pay_xxx",
  "razorpay_signature": "signature"
}
```

Production:

- validates Razorpay HMAC signature with timing-safe comparison

Mock mode:

- skips external signature verification for integration tests only

## Idempotent Success Processor

Successful payment processing is centralized in one function.

It uses a Mongo transaction to:

1. Re-load locked order.
2. Reject duplicate gateway transaction IDs.
3. Return existing successful payment for repeated verification of the same order.
4. Create `Payment`.
5. Calculate doctor fee share from locked order amount and doctor snapshot.
6. Create `FeeShare` for split model.
7. Update `DoctorWallet`.
8. Create `WalletTransaction`.
9. Mark order successful.
10. Lock patient referral.
11. Mark latest QR scan paid.
12. Activate `PatientProgram`.
13. Increment coupon usage if applicable.
14. Write audit log `payment_verified`.

## Duplicate Payment Handling

Protected by:

- unique `Payment.gatewayTransactionId`
- order successful check
- active patient program check before order creation
- idempotency key for repeated order create calls

Repeated verification of the same successful order returns the existing payment.

Different order/payment attempts using the same gateway payment ID are rejected.

## Razorpay Webhook

Endpoint:

`POST /api/payments/webhook/razorpay`

Required env:

```env
RAZORPAY_WEBHOOK_SECRET=...
```

Supported event:

- `payment.captured`

The webhook uses the same idempotent success processor as checkout verification.

## Receipt

Endpoint:

`GET /api/payments/:id/receipt`

Patient can access own receipt.

Doctor can access referred patient receipt.

Admin can access all.

## Verification

Covered by `npm run test:integration` in mock gateway mode:

- idempotent order creation
- payment verification
- duplicate verification returns existing payment
- patient program activation
- fee share creation
- wallet ledger creation
- receipt access
