const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth.middleware');
const { Exercise } = require('../models/Exercise.model');
const asyncHandler = require('../utils/asyncHandler');

router.use(protect);

// GET /api/exercises — list all exercises
router.get('/', asyncHandler(async (req, res) => {
  const { category, language } = req.query;
  const filter = { isActive: true };
  if (category) filter.painCategory = category;
  if (language) filter.language = language;
  const exercises = await Exercise.find(filter)
    .populate('painCategory', 'name')
    .sort({ displayOrder: 1 });
  res.json(exercises);
}));

// POST /api/exercises — admin creates exercise
router.post('/', authorize('admin'), asyncHandler(async (req, res) => {
  const exercise = await Exercise.create(req.body);
  res.status(201).json(exercise);
}));

// GET /api/exercises/:id
router.get('/:id', asyncHandler(async (req, res) => {
  const exercise = await Exercise.findById(req.params.id).populate('painCategory', 'name');
  if (!exercise) return res.status(404).json({ message: 'Exercise not found' });
  res.json(exercise);
}));

// PUT /api/exercises/:id — admin updates exercise
router.put('/:id', authorize('admin'), asyncHandler(async (req, res) => {
  const exercise = await Exercise.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!exercise) return res.status(404).json({ message: 'Exercise not found' });
  res.json(exercise);
}));

// DELETE /api/exercises/:id — soft delete
router.delete('/:id', authorize('admin'), asyncHandler(async (req, res) => {
  const exercise = await Exercise.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!exercise) return res.status(404).json({ message: 'Exercise not found' });
  res.json({ message: 'Exercise deactivated' });
}));

module.exports = router;
