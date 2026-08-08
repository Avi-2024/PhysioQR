const mongoose = require('mongoose');

// A single exercise (video + instructions)
const exerciseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  nameHindi: String,
  description: String,
  videoUrl: String,       // YouTube unlisted URL
  youtubeVideoId: String,
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
  exercises: [
    {
      exercise: { type: mongoose.Schema.Types.ObjectId, ref: 'Exercise' },
      displayOrder: Number,
    },
  ],
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const Exercise = mongoose.model('Exercise', exerciseSchema);
const ProgramDay = mongoose.model('ProgramDay', programDaySchema);

module.exports = { Exercise, ProgramDay };
