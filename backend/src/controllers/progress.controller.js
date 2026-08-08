const ProgramProgress = require('../models/ProgramProgress.model');
const PatientProgram = require('../models/PatientProgram.model');
const { ProgramDay } = require('../models/Exercise.model');
const asyncHandler = require('../utils/asyncHandler');

// POST /api/progress/submit-day
// Patient submits completed exercises + feedback for a day (SRS §20)
const submitDayProgress = asyncHandler(async (req, res) => {
  const {
    patientProgramId, dayNumber,
    exercises,                  // array of { exercise, videoStarted, videoCompleted, markedCompleted, skipped, skipReason }
    painScoreBefore, painScoreAfter,
    difficultyRating, feedbackText,
    discomfortReported, fullSessionCompleted,
  } = req.body;

  const patientProgram = await PatientProgram.findById(patientProgramId);
  if (!patientProgram) return res.status(404).json({ message: 'Program enrollment not found' });
  if (patientProgram.patient.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Access denied' });
  }
  if (patientProgram.status !== 'active') {
    return res.status(400).json({ message: `Program is ${patientProgram.status}` });
  }

  // Upsert progress for this day
  let progress = await ProgramProgress.findOne({ patientProgram: patientProgramId, dayNumber });
  if (!progress) {
    progress = new ProgramProgress({ patientProgram: patientProgramId, patient: req.user._id, dayNumber });
  }

  progress.dayStarted = true;
  progress.exercises = exercises || progress.exercises;
  progress.painScoreBefore = painScoreBefore;
  progress.painScoreAfter = painScoreAfter;
  progress.difficultyRating = difficultyRating;
  progress.feedbackText = feedbackText;
  progress.discomfortReported = discomfortReported;
  progress.fullSessionCompleted = fullSessionCompleted;

  // Mark day completed if all non-skipped exercises are marked done
  const allDone = (exercises || []).every(e => e.markedCompleted || e.skipped);
  if (allDone) {
    progress.dayCompleted = true;
    progress.completedAt = new Date();
  }
  await progress.save();

  // Update current day on the program enrollment
  if (allDone && dayNumber >= patientProgram.currentDay) {
    patientProgram.currentDay = dayNumber + 1;

    // Recalculate completion percentage
    const program = await require('../models/Program.model').findById(patientProgram.program);
    if (program) {
      patientProgram.completionPercentage = Math.min(
        Math.round((dayNumber / program.durationDays) * 100),
        100
      );
    }

    // Mark program completed if last day done
    if (program && dayNumber >= program.durationDays) {
      patientProgram.status = 'completed';
    }

    await patientProgram.save();
  }

  res.json({ message: 'Progress saved', dayCompleted: progress.dayCompleted, progress });
});

// GET /api/progress/:patientProgramId/day/:dayNumber
// Returns day content + unlock status (SRS §19)
const getDayContent = asyncHandler(async (req, res) => {
  const { patientProgramId, dayNumber } = req.params;
  const day = Number(dayNumber);

  const patientProgram = await PatientProgram.findById(patientProgramId);
  if (!patientProgram) return res.status(404).json({ message: 'Program enrollment not found' });
  if (patientProgram.patient.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Access denied' });
  }

  // Check if this day is unlocked (SRS §19)
  const isUnlocked = isDayUnlocked(patientProgram, day);
  if (!isUnlocked) {
    return res.status(403).json({ message: 'This day is not unlocked yet', day, unlockMethod: patientProgram.unlockMethod });
  }

  const programDay = await ProgramDay.findOne({ program: patientProgram.program, dayNumber: day })
    .populate('exercises.exercise');
  if (!programDay) return res.status(404).json({ message: `Day ${day} not found in program` });

  // Mark day as opened in progress
  await ProgramProgress.findOneAndUpdate(
    { patientProgram: patientProgramId, dayNumber: day },
    { $setOnInsert: { patient: req.user._id, patientProgram: patientProgramId, dayNumber: day }, dayStarted: true, dayUnlocked: true },
    { upsert: true }
  );

  res.json({ day, isUnlocked, programDay });
});

// Admin manually unlocks a day (SRS §19)
const adminUnlockDay = asyncHandler(async (req, res) => {
  const { patientProgramId, dayNumber } = req.body;

  await ProgramProgress.findOneAndUpdate(
    { patientProgram: patientProgramId, dayNumber },
    { dayUnlocked: true },
    { upsert: true }
  );

  res.json({ message: `Day ${dayNumber} manually unlocked` });
});

// ─── Helper: check if a day is unlocked based on unlock method ───
function isDayUnlocked(patientProgram, dayNumber) {
  if (dayNumber === 1) return true; // Day 1 always unlocked after payment

  const { unlockMethod, startDate, currentDay } = patientProgram;

  if (unlockMethod === 'all_at_once') return true;

  if (unlockMethod === 'every_24_hours') {
    if (!startDate) return false;
    const daysSinceStart = Math.floor((Date.now() - new Date(startDate)) / (1000 * 60 * 60 * 24));
    return dayNumber <= daysSinceStart + 1;
  }

  if (unlockMethod === 'after_completion') {
    // Day N unlocks only after Day N-1 is completed
    return dayNumber <= currentDay;
  }

  if (unlockMethod === 'manual') {
    // Handled by ProgramProgress.dayUnlocked flag — checked separately
    return false; // caller checks DB flag
  }

  return false;
}

module.exports = { submitDayProgress, getDayContent, adminUnlockDay };
