const Program = require('../models/Program.model');
const { ProgramDay } = require('../models/Exercise.model');
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

const createProgramDay = asyncHandler(async (req, res) => {
  res.status(201).json(await ProgramDay.create({ program: req.params.id, ...req.body }));
});

const updateProgramDay = asyncHandler(async (req, res) => {
  const day = await ProgramDay.findByIdAndUpdate(req.params.dayId, req.body, { new: true });
  if (!day) return res.status(404).json({ message: 'Program day not found' });
  res.json(day);
});

module.exports = {
  getPrograms,
  createProgram,
  updateProgram,
  getProgramDays,
  createProgramDay,
  updateProgramDay,
};
