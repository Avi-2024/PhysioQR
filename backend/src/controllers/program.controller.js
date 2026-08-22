const Program = require('../models/Program.model');
const { Exercise, ProgramDay } = require('../models/Exercise.model');
const asyncHandler = require('../utils/asyncHandler');

const getPrograms = asyncHandler(async (req, res) => {
  const filter = req.user?.role === 'admin' ? {} : { isActive: true };
  if (req.query.category) filter.painCategory = req.query.category;
  res.json(await Program.find(filter).populate('painCategory', 'name').sort({ createdAt: -1 }));
});

const createProgram = asyncHandler(async (req, res) => {
  res.status(201).json(await Program.create(req.body));
});

const updateProgram = asyncHandler(async (req, res) => {
  const program = await Program.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!program) return res.status(404).json({ message: 'Program not found' });
  res.json(program);
});

const getProgramDays = asyncHandler(async (req, res) => {
  res.json(
    await ProgramDay.find({ program: req.params.id, isActive: true })
      .populate('exercises.exercise')
      .sort({ dayNumber: 1 })
  );
});

const normalizeDayExercises = async (entries = []) => {
  if (!Array.isArray(entries)) return [];
  const normalized = entries
    .map((entry, index) => ({
      exercise: entry?.exercise,
      displayOrder: Number.isFinite(Number(entry?.displayOrder)) ? Number(entry.displayOrder) : index + 1,
    }))
    .filter((entry) => entry.exercise);

  const ids = [...new Set(normalized.map((entry) => String(entry.exercise)))];
  if (!ids.length) return [];

  const valid = await Exercise.find({ _id: { $in: ids }, isActive: true }).select('_id').lean();
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

const createProgramDay = asyncHandler(async (req, res) => {
  const dayNumber = await validateDayNumber({ programId: req.params.id, dayNumber: req.body.dayNumber });
  const exercises = await normalizeDayExercises(req.body.exercises);
  const day = await ProgramDay.create({
    program: req.params.id,
    dayNumber,
    title: String(req.body.title || '').trim(),
    exercises,
  });
  res.status(201).json(await day.populate('exercises.exercise'));
});

const updateProgramDay = asyncHandler(async (req, res) => {
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
  if (req.body.exercises !== undefined) day.exercises = await normalizeDayExercises(req.body.exercises);

  await day.save();
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
