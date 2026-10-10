const mongoose = require('mongoose');

// A single exercise (video + instructions)
const exerciseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  // Stable seed identity. Existing clinical exercises have no seed key.
  seedKey: { type: String, unique: true, sparse: true },
  nameHindi: String,
  description: String,
  videoUrl: String,       // YouTube unlisted URL
  youtubeVideoId: String,
  // TESTING ONLY. A demo URL must never satisfy clinical programme readiness.
  isDemoVideo: { type: Boolean, default: false },
  // Exercise-specific external video candidate, NOT yet reviewed by our
  // physiotherapist. The clinical release gate treats it as unapproved.
  videoCandidateReviewPending: { type: Boolean, default: false },
  videoCandidateTitle: String,
  videoCandidateProvider: String,
  videoCandidateSourcePage: String,
  thumbnail: String,
  repetitions: Number,
  sets: Number,
  holdDuration: String,   // e.g. "10 seconds"
  restDuration: String,
  frequency: String,
  requiredEquipment: [String],
  safetyInstructions: String,
  commonMistakes: String,
  painCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'PainCategory' },
  language: { type: String, enum: ['en', 'hi'], default: 'en' },
  displayOrder: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// One day in a program — contains a list of exercises
const programDaySchema = new mongoose.Schema({
  program: { type: mongoose.Schema.Types.ObjectId, ref: 'Program', required: true },
  dayNumber: { type: Number, required: true },
  title: String,
  focus: String,
  exercises: [
    {
      exercise: { type: mongoose.Schema.Types.ObjectId, ref: 'Exercise' },
      displayOrder: Number,
      // Daily dosage overrides keep progression attached to the programme day.
      sets: Number,
      repetitions: Number,
      holdDuration: String,
      restDuration: String,
    },
  ],
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const Exercise = mongoose.model('Exercise', exerciseSchema);
const ProgramDay = mongoose.model('ProgramDay', programDaySchema);

module.exports = { Exercise, ProgramDay };
