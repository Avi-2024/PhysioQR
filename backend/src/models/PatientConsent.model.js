const mongoose = require('mongoose');

// SRS §13 — Separate consent record with full audit trail
const patientConsentSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  consentVersion: { type: String, required: true },  // e.g. "v1.0"
  acceptedAt: { type: Date, default: Date.now },
  ipAddress: String,
  deviceInfo: String,
  language: { type: String, enum: ['en', 'hi'], default: 'en' },

  // Which consents were accepted
  termsAccepted: { type: Boolean, default: false },
  privacyPolicyAccepted: { type: Boolean, default: false },
  paymentPolicyAccepted: { type: Boolean, default: false },
  refundPolicyAccepted: { type: Boolean, default: false },
  medicalDisclaimerAccepted: { type: Boolean, default: false },
  exerciseConsentAccepted: { type: Boolean, default: false },
  communicationConsentAccepted: { type: Boolean, default: false },
  healthInfoDeclarationAccepted: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('PatientConsent', patientConsentSchema);
