const mongoose = require('mongoose');

// Records every time a patient scans a doctor's QR code
const qrScanSchema = new mongoose.Schema({
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  agent: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent' },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
  clinicId: String,
  referralSource: { type: String, enum: ['qr_code', 'referral_link'], default: 'qr_code' },
  scanDate: { type: Date, default: Date.now },
  registrationDate: Date,
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
  deviceInfo: String,
  ipAddress: String,
}, { timestamps: true });

module.exports = mongoose.model('QrScan', qrScanSchema);
