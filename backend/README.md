# PhysioQR Backend

Doctor Referral and Rehabilitation Platform — REST API

---

## Tech Stack

| Tool | Purpose |
|------|---------|
| Node.js + Express | Web server and API |
| MongoDB + Mongoose | Database |
| JWT | Login tokens (User + Patient) |
| Razorpay | Payment gateway |
| Twilio | OTP via SMS |
| QRCode | Generate doctor QR codes |

---

## How to Run

```bash
cd backend
npm install
copy .env.example .env   # fill in your values
npm run dev
```

Server: `http://localhost:5000`
Health check: `http://localhost:5000/health`

---

## Folder Structure

```
backend/
├── src/
│   ├── config/
│   │   └── db.js                      ← MongoDB connection
│   │
│   ├── models/                        ← 25 database schemas
│   │   ├── User.model.js              ← Admin / Agent / Doctor login
│   │   ├── Agent.model.js
│   │   ├── Doctor.model.js            ← Includes fee share type, slabs, KYC
│   │   ├── Patient.model.js
│   │   ├── ClinicVisit.model.js       ← SRS §4.4
│   │   ├── PatientConsent.model.js    ← SRS §13
│   │   ├── QrScan.model.js            ← SRS §8.4
│   │   ├── PainCategory.model.js
│   │   ├── AssessmentQuestion.model.js ← Conditional logic support
│   │   ├── PatientAssessment.model.js  ← Red flag detection
│   │   ├── Program.model.js
│   │   ├── Exercise.model.js          ← Also contains ProgramDay
│   │   ├── PatientProgram.model.js    ← Unlock rules, pause, expiry
│   │   ├── ProgramProgress.model.js   ← Day-wise exercise tracking
│   │   ├── Coupon.model.js            ← SRS §23
│   │   ├── Payment.model.js           ← Also contains Order
│   │   ├── Refund.model.js            ← SRS §33
│   │   ├── FeeShare.model.js          ← Also contains WithdrawalRequest
│   │   ├── Wallet.model.js            ← DoctorWallet + WalletTransaction
│   │   ├── Payout.model.js            ← SRS §46
│   │   ├── Notification.model.js      ← SRS §39 all notification types
│   │   ├── SupportTicket.model.js     ← SRS §40
│   │   ├── AuditLog.model.js          ← SRS §41 read-only
│   │   ├── SystemSettings.model.js    ← SRS §45 singleton
│   │   └── Otp.model.js               ← Auto-expires via TTL index
│   │
│   ├── controllers/
│   │   ├── auth.controller.js         ← Login + OTP + patient JWT
│   │   ├── agent.controller.js        ← Dashboard, clinic visits
│   │   ├── doctor.controller.js       ← Approval, QR, audit logs
│   │   ├── patient.controller.js      ← Registration, program, progress
│   │   ├── payment.controller.js      ← Razorpay, fee share, platform fee model
│   │   └── refund.controller.js       ← Refund + fee share reversal
│   │
│   ├── routes/                        ← 17 route files
│   │   ├── auth.routes.js
│   │   ├── admin.routes.js            ← Full SRS §36 dashboard
│   │   ├── agent.routes.js
│   │   ├── doctor.routes.js
│   │   ├── patient.routes.js          ← Includes consent endpoint
│   │   ├── program.routes.js
│   │   ├── assessment.routes.js       ← Red flag check on submit
│   │   ├── payment.routes.js
│   │   ├── refund.routes.js
│   │   ├── coupon.routes.js           ← Validate + CRUD
│   │   ├── wallet.routes.js
│   │   ├── withdrawal.routes.js       ← Full §32.1 eligibility checks
│   │   ├── support.routes.js
│   │   ├── report.routes.js           ← All 5 report types §38
│   │   ├── notification.routes.js
│   │   └── settings.routes.js         ← Singleton settings §45
│   │
│   ├── middlewares/
│   │   └── auth.middleware.js         ← JWT for User + Patient, role guard
│   │
│   ├── utils/
│   │   ├── asyncHandler.js            ← Wraps async controllers
│   │   ├── feeCalculator.js           ← Percentage + Fixed + Slab models
│   │   ├── idGenerator.js             ← DR001, PT001, RC/2026/000001
│   │   └── auditLogger.js             ← writeAuditLog() helper
│   │
│   ├── app.js                         ← Express + all 17 routes
│   └── server.js                      ← Entry point
│
├── .env.example
├── package.json
└── README.md
```

---

## SRS Coverage Checklist

| SRS Section | Feature | Status |
|---|---|---|
| §3 | 4 roles: Admin, Agent, Doctor, Patient | ✅ |
| §4.3 | Agent dashboard stats | ✅ |
| §4.4 | Clinic visit management | ✅ |
| §5–6 | Doctor registration + approval flow | ✅ |
| §7 | Doctor suspension — QR disabled | ✅ |
| §8 | QR code generate / disable / reactivate | ✅ |
| §9–10 | Patient registration via QR | ✅ |
| §11 | OTP with expiry, retry limit | ✅ |
| §12 | Duplicate patient detection | ✅ |
| §13 | Patient consent with full audit record | ✅ |
| §14–15 | Pain assessment + red flag detection | ✅ |
| §16–17 | Program + day-wise exercise management | ✅ |
| §18 | YouTube video fields + validation hooks | ✅ |
| §19 | Video unlock rules on PatientProgram | ✅ |
| §20 | Exercise tracking + feedback | ✅ |
| §21 | Program access, expiry, pause | ✅ |
| §22.1 | Split model fee share | ✅ |
| §22.2 | Platform fee model (no fee share) | ✅ |
| §23 | Coupon / discount management | ✅ |
| §24–25 | Payment flow, failed, duplicate | ✅ |
| §26 | Invoice number generation | ✅ |
| §27.1 | Percentage-based fee share | ✅ |
| §27.2 | Fixed fee share | ✅ |
| §27.3 | Slab-based fee share | ✅ |
| §28 | Fee share calculation basis | ✅ |
| §29–30 | Fee share status + holding period | ✅ |
| §31 | Doctor wallet + full ledger | ✅ |
| §32 | Withdrawal eligibility + payout flow | ✅ |
| §33 | Refund + fee share reversal | ✅ |
| §36 | Admin dashboard — all stats | ✅ |
| §38 | 5 report types with filters | ✅ |
| §39 | Notification model — all types | ✅ |
| §40 | Support tickets | ✅ |
| §41 | Audit logs written in controllers | ✅ |
| §43 | JWT, bcrypt, rate limit, role guard | ✅ |
| §45 | System settings singleton | ✅ |
| §46 | All 33 system records present | ✅ |
| §47 | All business rules enforced | ✅ |

---

## Key API Endpoints

### Auth
| Method | URL | Who |
|--------|-----|-----|
| POST | /api/auth/login | Admin / Agent / Doctor |
| POST | /api/auth/send-otp | Patient |
| POST | /api/auth/verify-otp | Patient (returns JWT) |

### Doctors
| Method | URL | Who |
|--------|-----|-----|
| POST | /api/doctors | Admin / Agent |
| POST | /api/doctors/:id/approve | Admin |
| POST | /api/doctors/:id/suspend | Admin |
| POST | /api/doctors/:id/disable-qr | Admin |
| GET | /api/doctors/me/profile | Doctor |
| GET | /api/doctors/me/qr-stats | Doctor |

### Patients
| Method | URL | Who |
|--------|-----|-----|
| POST | /api/patients/register | Public |
| POST | /api/patients/verify-mobile | Public |
| POST | /api/patients/consent | Public |
| GET | /api/patients/me/program | Patient |

### Payments
| Method | URL | Who |
|--------|-----|-----|
| POST | /api/payments/create-order | Patient |
| POST | /api/payments/verify | Patient |
| POST | /api/refunds | Admin |

### Wallet & Withdrawals
| Method | URL | Who |
|--------|-----|-----|
| GET | /api/wallet/me | Doctor |
| POST | /api/withdrawals/request | Doctor |
| POST | /api/withdrawals/:id/approve | Admin |
| POST | /api/withdrawals/:id/paid | Admin |
| POST | /api/withdrawals/:id/reject | Admin |

### Reports
| Method | URL | Who |
|--------|-----|-----|
| GET | /api/reports/financial | Admin |
| GET | /api/reports/doctor/:id | Admin |
| GET | /api/reports/agent/:id | Admin |
| GET | /api/reports/patients | Admin |
| GET | /api/reports/programs | Admin |

### Settings & Admin
| Method | URL | Who |
|--------|-----|-----|
| GET/PUT | /api/settings | Admin |
| GET | /api/admin/dashboard | Admin |
| GET | /api/admin/audit-logs | Admin |
