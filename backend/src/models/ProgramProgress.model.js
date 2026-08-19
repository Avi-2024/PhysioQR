const mongoose = require('mongoose');

const exerciseProgressSchema = new mongoose.Schema({
  exercise: { type: mongoose.Schema.Types.ObjectId, ref: 'Exercise' },
  videoStarted: { type: Boolean, default: false },
  videoStartedAt: Date,
  videoCompleted: { type: Boolean, default: false },
  videoCompletedAt: Date,
  markedCompleted: { type: Boolean, default: false },
  markedCompletedAt: Date,
  skipped: { type: Boolean, default: false },
  skippedAt: Date,
  skipReason: String,
}, { _id: false });

const programProgressSchema = new mongoose.Schema({
  patientProgram: { type: mongoose.Schema.Types.ObjectId, ref: 'PatientProgram', required: true },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  dayNumber: { type: Number, required: true },
  dayUnlocked: { type: Boolean, default: false },
  dayStarted: { type: Boolean, default: false },
  dayOpenedAt: Date,
  dayCompleted: { type: Boolean, default: false },

  exercises: [exerciseProgressSchema],

  painScoreBefore: Number,
  painScoreAfter: Number,
  difficultyRating: Number,
  feedbackText: String,
  discomfortReported: Boolean,
  fullSessionCompleted: Boolean,
  completedAt: Date,
}, { timestamps: true });

programProgressSchema.index({ patientProgram: 1, dayNumber: 1 }, { unique: true });
programProgressSchema.index({ patient: 1, createdAt: -1 });

module.exports = mongoose.model('ProgramProgress', programProgressSchema);
