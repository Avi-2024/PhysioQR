# Production Hardening Phase Flow

This phase hardens the payment-adjacent production paths that affect accounting, doctor onboarding, payouts, fraud review, and notification delivery.

## Invoice Numbering

- Successful payment verification now allocates invoice numbers through a Mongo-backed `Counter`.
- Counter key format is `invoice:<year>`.
- Invoice format remains `RC/YYYY/000001`.
- Allocation happens inside the same Mongo transaction that creates the successful payment, fee share, wallet ledger, QR update, referral lock, and patient program activation.

## Doctor KYC Document Upload

- Admin uploads KYC documents through `POST /api/doctors/:id/kyc-documents`.
- Supported document types:
  - `identity_proof`
  - `address_proof`
  - `medical_registration`
  - `cancelled_cheque`
  - `pan`
  - `profile_photo`
  - `other`
- Production storage mode is S3 using:
  - `DOCUMENT_STORAGE_MODE=s3`
  - `AWS_REGION`
  - `AWS_S3_BUCKET`
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`
- Development and smoke tests use `DOCUMENT_STORAGE_MODE=local`, which stores metadata only and avoids real file persistence.
- Uploaded files are stored with private S3 keys and server-side AES256 encryption.

## Payout Hardening

- Withdrawal request, approval, paid, reject, and failed transitions now use Mongo transactions.
- Wallet balance changes and ledger entries are written atomically with the withdrawal/payout state.
- Admin can mark payout failures through `POST /api/withdrawals/:id/failed`.
- Failed/rejected payouts return the blocked amount to the doctor wallet.
- Payout transaction references are unique to prevent duplicate bank transfer reconciliation.

## Fraud Risk Rules

The backend now creates `FraudCase` records and admin in-app notifications for:

- abnormal QR scans from the same device without payment conversion
- duplicate gateway transaction attempts
- frequent refunds under one doctor
- multiple doctors sharing the same bank account

Admin review APIs:

- `GET /api/admin/fraud-cases`
- `GET /api/admin/fraud-cases/:id`
- `PATCH /api/admin/fraud-cases/:id/review`

Fraud thresholds:

- `FRAUD_QR_SCAN_THRESHOLD`
- `FRAUD_REFUND_THRESHOLD`

## Notification Retry Worker

- Notifications now store `retryCount`, `lastAttemptAt`, and `nextAttemptAt`.
- Failed external deliveries are retried with exponential backoff.
- Worker command:

```bash
npm run worker:notifications
```

- Worker controls:
  - `NOTIFICATION_MAX_RETRIES`
  - `NOTIFICATION_RETRY_BASE_SECONDS`
  - `NOTIFICATION_WORKER_BATCH_SIZE`

## Payment Negative Edge Cases

Integration smoke now verifies:

- expired order verification is rejected
- wrong patient cannot verify another patient order
- invalid Razorpay signature is rejected
- duplicate gateway transaction on another order is rejected and flagged
- payment verification remains idempotent for the same successful order

## Verification

Run:

```bash
node --check src/controllers/payment.controller.js
node --check src/controllers/doctor.controller.js
node --check src/controllers/withdrawal.controller.js
node --check src/controllers/admin.controller.js
node --check scripts/integrationSmoke.js
npm audit --json
npm run test:integration
```
