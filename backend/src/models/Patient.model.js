const mongoose = require('mongoose');
const Counter = require('./Counter.model');

const patientSchema = new mongoose.Schema({
  patientId: { type: String, unique: true },  // e.g. PT00001
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

  // Direct-patient commercial terms are patient-level, never programme-level.
  // Doctor-linked patients continue to use Doctor.approvedPatientFee.
  directPatientFee: Number,
  directPatientFeeSetBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  directPatientFeeSetAt: Date,

  // Auth
  mobileVerified: { type: Boolean, default: false },
  tokenVersion: { type: Number, default: 0 },
  consentAccepted: { type: Boolean, default: false },
  consentVersion: String,
  consentDate: Date,

  // Account
  status: { type: String, enum: ['active', 'inactive', 'blocked'], default: 'active' },
}, { timestamps: true });

const PATIENT_COUNTER_KEY = 'patient_id';

const getHighestExistingPatientSequence = async () => {
  const latest = await mongoose.model('Patient')
    .findOne({ patientId: /^PT\d+$/ })
    .sort({ patientId: -1 })
    .select('patientId')
    .lean();

  if (!latest?.patientId) return 0;
  const sequence = Number(String(latest.patientId).replace(/^PT/, ''));
  return Number.isFinite(sequence) ? sequence : 0;
};

const nextPatientSequence = async () => {
  const highestExisting = await getHighestExistingPatientSequence();

  try {
    await Counter.findOneAndUpdate(
      { key: PATIENT_COUNTER_KEY },
      { $max: { sequence: highestExisting } },
      { upsert: true, setDefaultsOnInsert: true },
    );
  } catch (error) {
    if (error?.code !== 11000) throw error;
  }

  const counter = await Counter.findOneAndUpdate(
    { key: PATIENT_COUNTER_KEY },
    { $inc: { sequence: 1 } },
    { new: true },
  );

  if (!counter) throw new Error('Unable to allocate patient ID');
  return counter.sequence;
};

patientSchema.pre('save', async function (next) {
  if (this.patientId) return next();

  try {
    const sequence = await nextPatientSequence();
    this.patientId = `PT${String(sequence).padStart(5, '0')}`;
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('Patient', patientSchema);
