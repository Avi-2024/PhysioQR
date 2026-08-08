const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  patientId: { type: String, unique: true },  // e.g. PT001
  fullName: { type: String, required: true },
  mobile: { type: String, required: true, unique: true },
  whatsapp: String,
  email: String,
  age: Number,
  dateOfBirth: Date,
  gender: { type: String, enum: ['male', 'female', 'other'] },
  address: String,
  city: String,
  state: String,
  postalCode: String,
  preferredLanguage: { type: String, enum: ['en', 'hi'], default: 'en' },
  emergencyContact: String,

  // Referral — locked after payment
  referringDoctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
  referralSource: String,   // 'qr_code' | 'referral_link' | 'direct'
  referralLocked: { type: Boolean, default: false },

  // Auth
  mobileVerified: { type: Boolean, default: false },
  consentAccepted: { type: Boolean, default: false },
  consentVersion: String,
  consentDate: Date,

  // Account
  status: { type: String, enum: ['active', 'inactive', 'blocked'], default: 'active' },
}, { timestamps: true });

// Auto-generate patientId like PT00001 before saving
patientSchema.pre('save', async function (next) {
  if (this.patientId) return next();
  const count = await mongoose.model('Patient').countDocuments();
  this.patientId = `PT${String(count + 1).padStart(5, '0')}`;
  next();
});

module.exports = mongoose.model('Patient', patientSchema);
