const Program = require('../models/Program.model');
const { Exercise, ProgramDay } = require('../models/Exercise.model');
const asyncHandler = require('../utils/asyncHandler');
const { ensureApprovedRelease } = require('../services/programmeReleaseGate.service');

const getPrograms = asyncHandler(async (req, res) => {
  const filter = req.user?.role === 'admin' ? {} : { isActive: true };
  if (req.query.category) filter.painCategory = req.query.category;
  res.json(await Program.find(filter).populate('painCategory', 'name').sort({ createdAt: -1 }));
});

const createProgram = asyncHandler(async (req, res) => {
  res.status(201).json(await Program.create(req.body));
});

const updateProgram = asyncHandler(async (req, res) => {
  const existing = await Program.findById(req.params.id);
  if (!existing) return res.status(404).json({ message: 'Program not found' });
  if (req.body.isActive === true && !existing.isActive) await ensureApprovedRelease(existing);
  // Release gate is immutable through the legacy generic update API.
  // Lifecycle switches are handled only by Admin's audited status endpoints.
  // Never accept a disguised isActive value via this legacy update route.
  const { clinicalApprovalRequired, clinicalApproval, isActive, ...safeBody } = req.body;
  const program = await Program.findByIdAndUpdate(req.params.id, safeBody, { new: true });
  res.json(program);
});

const getProgramDays = asyncHandler(async (req, res) => {
  const program = await Program.findById(req.params.id).select('isActive').lean();
  if (!program || (req.user.role !== 'admin' && !program.isActive)) {
    return res.status(404).json({ message: 'Programme days not found' });
  }
  res.json(
    await ProgramDay.find({ program: req.params.id, isActive: true })
      .populate('exercises.exercise')
      .sort({ dayNumber: 1 })
  );
});

const normalizeDayExercises = async (entries = [], { allowInactive = false } = {}) => {
  if (!Array.isArray(entries)) return [];
  const normalized = entries
    .map((entry, index) => ({
      exercise: entry?.exercise,
      displayOrder: Number.isFinite(Number(entry?.displayOrder)) ? Number(entry.displayOrder) : index + 1,
      ...(entry?.sets !== undefined ? { sets: Number(entry.sets) } : {}),
      ...(entry?.repetitions !== undefined ? { repetitions: Number(entry.repetitions) } : {}),
      ...(entry?.holdDuration !== undefined ? { holdDuration: String(entry.holdDuration).trim() } : {}),
      ...(entry?.restDuration !== undefined ? { restDuration: String(entry.restDuration).trim() } : {}),
    }))
    .filter((entry) => entry.exercise);

  const ids = [...new Set(normalized.map((entry) => String(entry.exercise)))];
  if (!ids.length) return [];

  if (normalized.some((entry) =>
    (entry.sets !== undefined && (!Number.isInteger(entry.sets) || entry.sets < 1 || entry.sets > 20))
    || (entry.repetitions !== undefined && (!Number.isInteger(entry.repetitions) || entry.repetitions < 1 || entry.repetitions > 100))
    || (entry.holdDuration?.length > 100) || (entry.restDuration?.length > 100))) {
    const error = new Error('Invalid per-day exercise prescription');
    error.status = 400;
    throw error;
  }
  const valid = await Exercise.find({ _id: { $in: ids }, ...(allowInactive ? {} : { isActive: true }) }).select('_id').lean();
  const validIds = new Set(valid.map((exercise) => String(exercise._id)));
  if (validIds.size !== ids.length) {
    const error = new Error('One or more selected exercises are missing or inactive');
    error.status = 400;
    throw error;
  }

  return normalized;
};

const validateDayNumber = async ({ programId, dayNumber, excludeDayId }) => {
  const program = await Program.findById(programId).select('durationDays isActive').lean();
  if (!program) {
    const error = new Error('Program not found');
    error.status = 404;
    throw error;
  }

  const numericDay = Number(dayNumber);
  if (!Number.isInteger(numericDay) || numericDay < 1 || numericDay > program.durationDays) {
    const error = new Error(`Day number must be between 1 and ${program.durationDays}`);
    error.status = 400;
    throw error;
  }

  const duplicateFilter = { program: programId, dayNumber: numericDay, isActive: true };
  if (excludeDayId) duplicateFilter._id = { $ne: excludeDayId };
  if (await ProgramDay.exists(duplicateFilter)) {
    const error = new Error(`Day ${numericDay} is already configured for this program`);
    error.status = 409;
    throw error;
  }

  return numericDay;
};

// For clinician-gated content, a changed exercise-day prescription invalidates
// its previous clinical sign-off. Published programmes must be unpublished first.
const ensureDayEditable = async (program) => {
  if (!program?.clinicalApprovalRequired) return;
  if (program.isActive) {
    const error = new Error('Unpublish this clinically approved programme before editing day content');
    error.status = 409;
    throw error;
  }
};
const revokeDayContentSignoff = async (program) => {
  if (!program?.clinicalApprovalRequired || !program.clinicalApproval?.approvedAt) return;
  program.clinicalApproval = {};
  await program.save();
};

const createProgramDay = asyncHandler(async (req, res) => {
  const program = await Program.findById(req.params.id).select('isActive clinicalApprovalRequired clinicalApproval');
  await ensureDayEditable(program);
  const dayNumber = await validateDayNumber({ programId: req.params.id, dayNumber: req.body.dayNumber });
  const exercises = await normalizeDayExercises(req.body.exercises, { allowInactive: !program.isActive });
  const day = await ProgramDay.create({
    program: req.params.id,
    dayNumber,
    title: String(req.body.title || '').trim(),
    focus: String(req.body.focus || '').trim(),
    exercises,
  });
  await revokeDayContentSignoff(program);
  res.status(201).json(await day.populate('exercises.exercise'));
});

const updateProgramDay = asyncHandler(async (req, res) => {
  const program = await Program.findById(req.params.id).select('isActive clinicalApprovalRequired clinicalApproval');
  await ensureDayEditable(program);
  const day = await ProgramDay.findOne({ _id: req.params.dayId, program: req.params.id, isActive: true });
  if (!day) return res.status(404).json({ message: 'Program day not found' });

  if (req.body.dayNumber !== undefined) {
    day.dayNumber = await validateDayNumber({
      programId: req.params.id,
      dayNumber: req.body.dayNumber,
      excludeDayId: day._id,
    });
  }
  if (req.body.title !== undefined) day.title = String(req.body.title || '').trim();
  if (req.body.focus !== undefined) day.focus = String(req.body.focus || '').trim();
  if (req.body.exercises !== undefined) {
    day.exercises = await normalizeDayExercises(req.body.exercises, { allowInactive: !program.isActive });
  }

  await day.save();
  await revokeDayContentSignoff(program);
  res.json(await day.populate('exercises.exercise'));
});

module.exports = {
  getPrograms,
  createProgram,
  updateProgram,
  getProgramDays,
  createProgramDay,
  updateProgramDay,
};
