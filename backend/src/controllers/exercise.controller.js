const { Exercise } = require('../models/Exercise.model');
const asyncHandler = require('../utils/asyncHandler');

const getExercises = asyncHandler(async (req, res) => {
  const { category, language } = req.query;
  const filter = req.user?.role === 'admin' ? {} : { isActive: true };
  if (category) filter.painCategory = category;
  if (language) filter.language = language;

  const exercises = await Exercise.find(filter)
    .populate('painCategory', 'name')
    .sort({ displayOrder: 1 });

  res.json(exercises);
});

const createExercise = asyncHandler(async (req, res) => {
  res.status(201).json(await Exercise.create(req.body));
});

const getExerciseById = asyncHandler(async (req, res) => {
  const exercise = await Exercise.findById(req.params.id).populate('painCategory', 'name');
  if (!exercise) return res.status(404).json({ message: 'Exercise not found' });
  res.json(exercise);
});

const updateExercise = asyncHandler(async (req, res) => {
  const exercise = await Exercise.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!exercise) return res.status(404).json({ message: 'Exercise not found' });
  res.json(exercise);
});

const deleteExercise = asyncHandler(async (req, res) => {
  const exercise = await Exercise.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!exercise) return res.status(404).json({ message: 'Exercise not found' });
  res.json({ message: 'Exercise deactivated' });
});

module.exports = {
  getExercises,
  createExercise,
  getExerciseById,
  updateExercise,
  deleteExercise,
};
