const mongoose = require('mongoose');

// SRS §45 — Admin-configurable global settings (single document, singleton pattern)
const systemSettingsSchema = new mongoose.Schema({
  globalProgramFee: Number,
  minDoctorPrice: Number,
  maxDoctorPrice: Number,
  defaultFeeSharePercentage: Number,
  feeShareCalculationBasis: {
    type: String,
    enum: ['gross', 'after_discount', 'net_after_charges'],
    default: 'gross',
  },
  feeShareHoldingDays: { type: Number, default: 15 },
  minWithdrawal: { type: Number, default: 1000 },
  maxWithdrawal: { type: Number, default: 50000 },
  withdrawalRequestStartDay: { type: Number, default: 1 },   // 1st of month
  withdrawalRequestEndDay: { type: Number, default: 5 },     // 5th of month
  payoutCycle: { type: String, enum: ['weekly', 'monthly'], default: 'monthly' },
  referralValidityDays: { type: Number, default: 30 },
  programAccessDuration: Number,
  maxPausesAllowed: { type: Number, default: 2 },
  maxPauseDurationDays: { type: Number, default: 7 },
  extendExpiryOnPause: { type: Boolean, default: true },
  refundPeriodDays: { type: Number, default: 2 },
  otpExpiryMinutes: { type: Number, default: 10 },
  maxOtpAttempts: { type: Number, default: 5 },
  maxLoginAttempts: { type: Number, default: 5 },
  currency: { type: String, default: 'INR' },
  taxPercentage: { type: Number, default: 0 },
  invoicePrefix: { type: String, default: 'RC' },
  supportPhone: String,
  supportEmail: String,
  supportWhatsApp: String,
  termsAndConditions: String,
  privacyPolicy: String,
  medicalDisclaimer: String,
  consentVersion: { type: String, default: 'v1.0' },
}, { timestamps: true });

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);
