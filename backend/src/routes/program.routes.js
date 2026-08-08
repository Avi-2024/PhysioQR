const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth.middleware');
const Program = require('../models/Program.model');
const { Exercise, ProgramDay } = require('../models/Exercise.model');
const asyncHandler = require('../utils/asyncHandler');

router.use(protect);

// Programs
router.get('/',     asyncHandler(async (req, res) => { res.json(await Program.find({ isActive: true })); }));
router.post('/',    authorize('admin'), asyncHandler(async (req, res) => { res.status(201).json(await Program.create(req.body)); }));
router.put('/:id',  authorize('admin'), asyncHandler(async (req, res) => { res.json(await Program.findByIdAndUpdate(req.params.id, req.body, { new: true })); }));

// Program Days
router.get('/:id/days',   asyncHandler(async (req, res) => { res.json(await ProgramDay.find({ program: req.params.id }).populate('exercises.exercise')); }));
router.post('/:id/days',  authorize('admin'), asyncHandler(async (req, res) => { res.status(201).json(await ProgramDay.create({ program: req.params.id, ...req.body })); }));

module.exports = router;
