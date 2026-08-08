const mongoose = require('mongoose');

// Tracks what the patient did each day
const programProgressSchema = new mongoose.Schema({
  patientProgram: { type: mongoose.Schema.Types.ObjectId, ref: 'PatientProgram', required: true },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  dayNumber: { type: Number, required: true },
  dayUnlocked: { type: Boolean, default: false },
  dayStarted: { type: Boolean, default: false },
  dayCompleted: { type: Boolean, default: false },

  exercises: [
    {
      exercise: { type: mongoose.Schema.Types.ObjectId, ref: 'Exercise' },
      videoStarted: Boolean,
      videoCompleted: Boolean,
      markedCompleted: Boolean,
      skipped: Boolean,
      skipReason: String,
    },
  ],

  painScoreBefore: Number,   // 0–10
  painScoreAfter: Number,
  difficultyRating: Number,
  feedbackText: String,
  discomfortReported: Boolean,
  fullSessionCompleted: Boolean,
  completedAt: Date,
}, { timestamps: true });

module.exports = mongoose.model('ProgramProgress', programProgressSchema);
