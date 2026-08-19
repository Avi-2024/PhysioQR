const mongoose = require('mongoose');

const clinicVisitSchema = new mongoose.Schema({
  agent: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent', required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
  doctorName: String,
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
  followUpStatus: {
    type: String,
    enum: ['not_required', 'scheduled', 'completed', 'missed', 'cancelled'],
    default: 'not_required',
  },
  followUpCompletedAt: Date,
  followUpCompletedNote: String,
  nextAction: String,
  outcome: {
    type: String,
    enum: ['doctor_registered', 'interested', 'follow_up_required', 'not_interested', 'call_later', 'clinic_closed', 'incorrect_location'],
    required: true,
  },
  photo: String,
  attachment: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

clinicVisitSchema.index({ agent: 1, visitDate: -1 });
clinicVisitSchema.index({ agent: 1, followUpStatus: 1, followUpDate: 1 });
clinicVisitSchema.index({ doctor: 1, visitDate: -1 });
clinicVisitSchema.index({ outcome: 1, visitDate: -1 });

module.exports = mongoose.model('ClinicVisit', clinicVisitSchema);
