const mongoose = require('mongoose');

// SRS §4.4 — Agent records clinic visits
const clinicVisitSchema = new mongoose.Schema({
  agent: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent', required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
  doctorName: String,       // for visits before doctor is registered
  clinicName: String,
  visitDate: { type: Date, required: true },
  visitTime: String,
  clinicLocation: String,
  discussionDetails: String,
  doctorInterestLevel: {
    type: String,
    enum: ['very_interested', 'interested', 'neutral', 'not_interested'],
  },
  documentsCollected: [String],
  followUpDate: Date,
  followUpNotes: String,
  outcome: {
    type: String,
    enum: ['doctor_registered', 'interested', 'follow_up_required', 'not_interested', 'call_later', 'clinic_closed', 'incorrect_location'],
    required: true,
  },
  photo: String,
}, { timestamps: true });

module.exports = mongoose.model('ClinicVisit', clinicVisitSchema);
