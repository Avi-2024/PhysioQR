const ProgramProgress = require('../models/ProgramProgress.model');
const PatientProgram = require('../models/PatientProgram.model');
const Program = require('../models/Program.model');
const { ProgramDay } = require('../models/Exercise.model');
const { writeAuditLog } = require('../utils/auditLogger');
const asyncHandler = require('../utils/asyncHandler');

const EXERCISE_EVENTS = ['video_started', 'video_completed', 'marked_completed', 'skipped'];

// Ensures the active user can access a patient program.
const loadAccessiblePatientProgram = async (req, patientProgramId) => {
  const patientProgram = await PatientProgram.findById(patientProgramId);
  if (!patientProgram) {
    const error = new Error('Program enrollment not found');
    error.status = 404;
    throw error;
  }

  const isOwner = req.user.role === 'patient' && patientProgram.patient.toString() === req.user._id.toString();
  if (req.user.role !== 'admin' && !isOwner) {
    const error = new Error('Access denied');
    error.status = 403;
    throw error;
  }

  return patientProgram;
};

// Validates a day number before using it in progress logic.
const parseDayNumber = (dayNumber) => {
  const day = Number(dayNumber);
  if (!Number.isInteger(day) || day <= 0) {
    const error = new Error('dayNumber must be a positive integer');
    error.status = 400;
    throw error;
  }
  return day;
};

// Loads a program day and its exercises.
const loadProgramDay = async (patientProgram, dayNumber) => {
  const programDay = await ProgramDay.findOne({
    program: patientProgram.program,
    dayNumber,
    isActive: true,
  }).populate('exercises.exercise');

  if (!programDay) {
    const error = new Error(`Day ${dayNumber} not found in program`);
    error.status = 404;
    throw error;
  }

  return programDay;
};

// Finds or creates progress for a patient program day.
const getOrCreateProgress = async ({ patientProgram, dayNumber, dayUnlocked = false, dayStarted = false }) => {
  let progress = await ProgramProgress.findOne({ patientProgram: patientProgram._id, dayNumber });
  if (!progress) {
    progress = new ProgramProgress({
      patientProgram: patientProgram._id,
      patient: patientProgram.patient,
      dayNumber,
    });
  }

  if (dayUnlocked) progress.dayUnlocked = true;
  if (dayStarted) {
    progress.dayStarted = true;
    progress.dayOpenedAt = progress.dayOpenedAt || new Date();
  }

  return progress;
};

// Checks if a day is unlocked based on the enrollment unlock method.
const isDayUnlocked = async (patientProgram, dayNumber) => {
  if (dayNumber === 1) return true;

  const { unlockMethod, startDate, currentDay } = patientProgram;

  if (unlockMethod === 'all_at_once') return true;

  if (unlockMethod === 'every_24_hours') {
    if (!startDate) return false;
    const daysSinceStart = Math.floor((Date.now() - new Date(startDate)) / (1000 * 60 * 60 * 24));
    return dayNumber <= daysSinceStart + 1;
  }

  if (unlockMethod === 'after_completion') {
    return dayNumber <= currentDay;
  }

  if (unlockMethod === 'manual') {
    const progress = await ProgramProgress.findOne({ patientProgram: patientProgram._id, dayNumber });
    return Boolean(progress?.dayUnlocked);
  }

  return false;
};

// Ensures submitted exercise IDs belong to the program day.
const validateExercisesForDay = (programDay, exercises = []) => {
  const allowedExerciseIds = new Set(programDay.exercises.map((item) => item.exercise?._id?.toString()).filter(Boolean));
  const invalid = exercises.find((item) => item.exercise && !allowedExerciseIds.has(item.exercise.toString()));
  if (invalid) {
    const error = new Error('Exercise does not belong to this program day');
    error.status = 400;
    throw error;
  }
};

// Recalculates enrollment day and completion percentage after day completion.
const updateEnrollmentCompletion = async ({ patientProgram, dayNumber, isCompleted }) => {
  if (!isCompleted || dayNumber < patientProgram.currentDay) return;

  const program = await Program.findById(patientProgram.program);
  patientProgram.currentDay = dayNumber + 1;

  if (program) {
    patientProgram.completionPercentage = Math.min(
      Math.round((dayNumber / program.durationDays) * 100),
      100
    );
    if (dayNumber >= program.durationDays) {
      patientProgram.status = 'completed';
      patientProgram.currentDay = program.durationDays;
    }
  }

  await patientProgram.save();
};

// Applies one exercise event to a progress document.
const applyExerciseEvent = (progress, { exerciseId, eventType, skipReason }) => {
  if (!EXERCISE_EVENTS.includes(eventType)) {
    const error = new Error(`eventType must be one of: ${EXERCISE_EVENTS.join(', ')}`);
    error.status = 400;
    throw error;
  }

  let item = progress.exercises.find((exerciseProgress) => exerciseProgress.exercise?.toString() === exerciseId.toString());
  if (!item) {
    progress.exercises.push({ exercise: exerciseId });
    item = progress.exercises[progress.exercises.length - 1];
  }

  const now = new Date();
  if (eventType === 'video_started') {
    item.videoStarted = true;
    item.videoStartedAt = item.videoStartedAt || now;
  }
  if (eventType === 'video_completed') {
    item.videoStarted = true;
    item.videoStartedAt = item.videoStartedAt || now;
    item.videoCompleted = true;
    item.videoCompletedAt = item.videoCompletedAt || now;
  }
  if (eventType === 'marked_completed') {
    item.markedCompleted = true;
    item.markedCompletedAt = item.markedCompletedAt || now;
  }
  if (eventType === 'skipped') {
    item.skipped = true;
    item.skippedAt = item.skippedAt || now;
    item.skipReason = skipReason;
  }
};

// POST /api/progress/submit-day
const submitDayProgress = asyncHandler(async (req, res) => {
  const {
    patientProgramId,
    dayNumber,
    exercises,
    painScoreBefore,
    painScoreAfter,
    difficultyRating,
    feedbackText,
    discomfortReported,
    fullSessionCompleted,
  } = req.body;

  const day = parseDayNumber(dayNumber);
  const patientProgram = await loadAccessiblePatientProgram(req, patientProgramId);
  if (req.user.role !== 'patient') return res.status(403).json({ message: 'Only patients can submit day progress' });
  if (patientProgram.status !== 'active') {
    return res.status(400).json({ message: `Program is ${patientProgram.status}` });
  }

  const unlocked = await isDayUnlocked(patientProgram, day);
  if (!unlocked) return res.status(403).json({ message: 'This day is not unlocked yet', day, unlockMethod: patientProgram.unlockMethod });

  const programDay = await loadProgramDay(patientProgram, day);
  validateExercisesForDay(programDay, exercises || []);

  const progress = await getOrCreateProgress({ patientProgram, dayNumber: day, dayUnlocked: true, dayStarted: true });
  progress.exercises = exercises || progress.exercises;
  progress.painScoreBefore = painScoreBefore;
  progress.painScoreAfter = painScoreAfter;
  progress.difficultyRating = difficultyRating;
  progress.feedbackText = feedbackText;
  progress.discomfortReported = discomfortReported;
  progress.fullSessionCompleted = fullSessionCompleted;

  const allDone = (progress.exercises || []).length > 0 && progress.exercises.every((exercise) => exercise.markedCompleted || exercise.skipped);
  if (allDone) {
    progress.dayCompleted = true;
    progress.completedAt = progress.completedAt || new Date();
  }
  await progress.save();

  await updateEnrollmentCompletion({ patientProgram, dayNumber: day, isCompleted: progress.dayCompleted });

  res.json({ message: 'Progress saved', dayCompleted: progress.dayCompleted, progress });
});

// GET /api/progress/:patientProgramId/day/:dayNumber
const getDayContent = asyncHandler(async (req, res) => {
  const { patientProgramId, dayNumber } = req.params;
  const day = parseDayNumber(dayNumber);

  const patientProgram = await loadAccessiblePatientProgram(req, patientProgramId);
  const unlocked = await isDayUnlocked(patientProgram, day);
  if (!unlocked) return res.status(403).json({ message: 'This day is not unlocked yet', day, unlockMethod: patientProgram.unlockMethod });

  const programDay = await loadProgramDay(patientProgram, day);
  const progress = await getOrCreateProgress({ patientProgram, dayNumber: day, dayUnlocked: true, dayStarted: req.user.role === 'patient' });
  await progress.save();

  res.json({ day, isUnlocked: true, programDay, progress });
});

// POST /api/progress/:patientProgramId/day/:dayNumber/exercises/:exerciseId/event
const trackExerciseEvent = asyncHandler(async (req, res) => {
  const day = parseDayNumber(req.params.dayNumber);
  const { patientProgramId, exerciseId } = req.params;
  const { eventType, skipReason } = req.body;

  const patientProgram = await loadAccessiblePatientProgram(req, patientProgramId);
  if (req.user.role !== 'patient') return res.status(403).json({ message: 'Only patients can track exercise progress' });
  if (patientProgram.status !== 'active') return res.status(400).json({ message: `Program is ${patientProgram.status}` });

  const unlocked = await isDayUnlocked(patientProgram, day);
  if (!unlocked) return res.status(403).json({ message: 'This day is not unlocked yet', day, unlockMethod: patientProgram.unlockMethod });

  const programDay = await loadProgramDay(patientProgram, day);
  validateExercisesForDay(programDay, [{ exercise: exerciseId }]);

  const progress = await getOrCreateProgress({ patientProgram, dayNumber: day, dayUnlocked: true, dayStarted: true });
  applyExerciseEvent(progress, { exerciseId, eventType, skipReason });
  await progress.save();

  res.json({ message: 'Exercise progress tracked', progress });
});

// GET /api/progress/:patientProgramId/summary
const getProgramProgressSummary = asyncHandler(async (req, res) => {
  const { patientProgramId } = req.params;
  const patientProgram = await loadAccessiblePatientProgram(req, patientProgramId);
  const program = await Program.findById(patientProgram.program);
  const progress = await ProgramProgress.find({ patientProgram: patientProgram._id }).sort({ dayNumber: 1 });

  const completedDays = progress.filter((day) => day.dayCompleted).length;
  const openedDays = progress.filter((day) => day.dayStarted).length;
  const skippedExercises = progress.reduce((total, day) => total + day.exercises.filter((exercise) => exercise.skipped).length, 0);
  const completedExercises = progress.reduce((total, day) => total + day.exercises.filter((exercise) => exercise.markedCompleted).length, 0);

  res.json({
    patientProgram,
    durationDays: program?.durationDays || null,
    currentDay: patientProgram.currentDay,
    completionPercentage: patientProgram.completionPercentage,
    completedDays,
    openedDays,
    completedExercises,
    skippedExercises,
    progress,
  });
});

// POST /api/progress/admin-unlock
const adminUnlockDay = asyncHandler(async (req, res) => {
  const { patientProgramId, dayNumber } = req.body;
  const day = parseDayNumber(dayNumber);
  const patientProgram = await loadAccessiblePatientProgram(req, patientProgramId);

  const progress = await getOrCreateProgress({ patientProgram, dayNumber: day, dayUnlocked: true });
  await progress.save();

  await writeAuditLog({
    req,
    action: 'program_day_unlocked',
    module: 'ProgramProgress',
    recordId: progress._id,
    newValue: { patientProgramId, dayNumber: day },
  });

  res.json({ message: `Day ${day} manually unlocked`, progress });
});

module.exports = {
  submitDayProgress,
  getDayContent,
  trackExerciseEvent,
  getProgramProgressSummary,
  adminUnlockDay,
};
