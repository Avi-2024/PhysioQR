const mongoose = require('mongoose');
const { Exercise, ProgramDay } = require('../models/Exercise.model');
const PainCategory = require('../models/PainCategory.model');
const { writeAuditLog } = require('../utils/auditLogger');
const asyncHandler = require('../utils/asyncHandler');

const LANGUAGES = ['en', 'hi'];
const cleanString = (value) => String(value ?? '').trim();
const escapeRegex = (value) => cleanString(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const extractYouTubeVideoId = (videoUrl) => {
  if (!videoUrl) return null;
  const match = cleanString(videoUrl).match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match?.[1] || null;
};

const normalizeExercisePayload = (body = {}) => {
  const payload = {};
  ['name','nameHindi','description','videoUrl','thumbnail','holdDuration','restDuration','frequency','safetyInstructions','commonMistakes'].forEach((field) => {
    if (body[field] !== undefined) payload[field] = cleanString(body[field]);
  });
  if (body.painCategory !== undefined) payload.painCategory = body.painCategory || null;
  if (body.language !== undefined) payload.language = body.language || 'en';
  if (body.repetitions !== undefined && body.repetitions !== '') payload.repetitions = Number(body.repetitions);
  if (body.sets !== undefined && body.sets !== '') payload.sets = Number(body.sets);
  if (body.displayOrder !== undefined && body.displayOrder !== '') payload.displayOrder = Number(body.displayOrder);
  if (body.isActive !== undefined) payload.isActive = Boolean(body.isActive);
  if (Array.isArray(body.requiredEquipment)) payload.requiredEquipment = body.requiredEquipment.map(cleanString).filter(Boolean);
  if (body.videoUrl !== undefined) {
    if (payload.videoUrl) {
      const videoId = extractYouTubeVideoId(payload.videoUrl);
      if (!videoId) {
        const error = new Error('videoUrl must be a valid YouTube watch, Shorts, or youtu.be URL');
        error.status = 400;
        throw error;
      }
      payload.youtubeVideoId = videoId;
    } else payload.youtubeVideoId = '';
  }
  return payload;
};

const validateExercisePayload = async (payload, { partial = false } = {}) => {
  if (!partial && !payload.name) return 'Exercise name is required';
  if (payload.name !== undefined && !payload.name) return 'Exercise name is required';
  if (payload.language && !LANGUAGES.includes(payload.language)) return 'Language must be en or hi';
  if (payload.sets !== undefined && (!Number.isFinite(payload.sets) || payload.sets < 0 || payload.sets > 100)) return 'Sets must be between 0 and 100';
  if (payload.repetitions !== undefined && (!Number.isFinite(payload.repetitions) || payload.repetitions < 0 || payload.repetitions > 1000)) return 'Repetitions must be between 0 and 1000';
  if (payload.displayOrder !== undefined && (!Number.isFinite(payload.displayOrder) || payload.displayOrder < 0)) return 'Display order cannot be negative';
  if (payload.painCategory) {
    if (!mongoose.isValidObjectId(payload.painCategory)) return 'Invalid pain category';
    const category = await PainCategory.findOne({ _id: payload.painCategory, isActive: true }).select('_id').lean();
    if (!category) return 'Pain category not found or inactive';
  }
  return null;
};

const usageForExercises = async (exerciseIds) => {
  if (!exerciseIds.length) return new Map();
  const rows = await ProgramDay.aggregate([
    { $match: { 'exercises.exercise': { $in: exerciseIds }, isActive: true } },
    { $unwind: '$exercises' },
    { $match: { 'exercises.exercise': { $in: exerciseIds } } },
    { $group: { _id: '$exercises.exercise', programDays: { $sum: 1 }, programs: { $addToSet: '$program' } } },
  ]);
  return new Map(rows.map((row) => [String(row._id), { programDays: row.programDays, programs: row.programs.length }]));
};

const getExercises = asyncHandler(async (req, res) => {
  if (req.user?.role !== 'admin') {
    const filter = { isActive: true };
    if (req.query.category) filter.painCategory = req.query.category;
    if (req.query.language) filter.language = req.query.language;
    return res.json(await Exercise.find(filter).populate('painCategory', 'name').sort({ displayOrder: 1, createdAt: -1 }));
  }

  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const skip = (page - 1) * limit;
  const filter = {};
  const search = cleanString(req.query.search);
  if (search) {
    const regex = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ name: regex }, { nameHindi: regex }, { description: regex }, { frequency: regex }];
  }
  const category = req.query.categoryId || req.query.category;
  if (category) filter.painCategory = category;
  if (req.query.language) filter.language = req.query.language;
  if (req.query.status === 'active') filter.isActive = true;
  if (req.query.status === 'inactive') filter.isActive = false;
  if (req.query.video === 'with') filter.videoUrl = { $nin: [null, ''] };
  if (req.query.video === 'without') filter.$and = [{ $or: [{ videoUrl: null }, { videoUrl: '' }, { videoUrl: { $exists: false } }] }];

  const [items, total, totalAll, active, inactive, withVideo] = await Promise.all([
    Exercise.find(filter).populate('painCategory', 'name nameHindi isActive').sort({ isActive: -1, displayOrder: 1, createdAt: -1 }).skip(skip).limit(limit).lean(),
    Exercise.countDocuments(filter),
    Exercise.countDocuments(),
    Exercise.countDocuments({ isActive: true }),
    Exercise.countDocuments({ isActive: false }),
    Exercise.countDocuments({ videoUrl: { $nin: [null, ''] } }),
  ]);
  const usage = await usageForExercises(items.map((item) => item._id));
  res.json({
    items: items.map((item) => ({ ...item, usage: usage.get(String(item._id)) || { programDays: 0, programs: 0 } })),
    meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    summary: { total: totalAll, active, inactive, withVideo },
  });
});

const createExercise = asyncHandler(async (req, res) => {
  const payload = normalizeExercisePayload(req.body);
  const validationError = await validateExercisePayload(payload);
  if (validationError) return res.status(400).json({ message: validationError });
  const exercise = await Exercise.create(payload);
  await writeAuditLog({ req, action: 'exercise_created', module: 'Exercise', recordId: exercise._id, newValue: exercise });
  res.status(201).json(exercise);
});

const getExerciseById = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid exercise id' });
  const exercise = await Exercise.findById(req.params.id).populate('painCategory', 'name nameHindi description isActive').lean();
  if (!exercise) return res.status(404).json({ message: 'Exercise not found' });
  const programDays = await ProgramDay.find({ 'exercises.exercise': exercise._id, isActive: true })
    .select('program dayNumber title exercises')
    .populate('program', 'name programCode isActive')
    .sort({ dayNumber: 1 })
    .lean();
  const programIds = new Set(programDays.map((day) => String(day.program?._id || '')).filter(Boolean));
  res.json({ exercise, usage: { programDays: programDays.length, programs: programIds.size }, programDays });
});

const updateExercise = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid exercise id' });
  const exercise = await Exercise.findById(req.params.id);
  if (!exercise) return res.status(404).json({ message: 'Exercise not found' });
  const payload = normalizeExercisePayload(req.body);
  const validationError = await validateExercisePayload(payload, { partial: true });
  if (validationError) return res.status(400).json({ message: validationError });
  const previousValue = exercise.toObject();
  Object.assign(exercise, payload);
  await exercise.save();
  await writeAuditLog({ req, action: 'exercise_updated', module: 'Exercise', recordId: exercise._id, previousValue, newValue: payload });
  res.json(exercise);
});

const setExerciseStatus = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid exercise id' });
  const exercise = await Exercise.findById(req.params.id);
  if (!exercise) return res.status(404).json({ message: 'Exercise not found' });
  const nextActive = req.params.action === 'reactivate';
  if (exercise.isActive === nextActive) return res.status(409).json({ message: `Exercise is already ${nextActive ? 'active' : 'inactive'}` });
  const previousValue = { isActive: exercise.isActive };
  exercise.isActive = nextActive;
  await exercise.save();
  await writeAuditLog({ req, action: nextActive ? 'exercise_reactivated' : 'exercise_deactivated', module: 'Exercise', recordId: exercise._id, previousValue, newValue: { isActive: nextActive }, reason: cleanString(req.body.reason) });
  res.json({ message: `Exercise ${nextActive ? 'reactivated' : 'deactivated'}`, exercise });
});

const deleteExercise = asyncHandler(async (req, res) => {
  const exercise = await Exercise.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!exercise) return res.status(404).json({ message: 'Exercise not found' });
  res.json({ message: 'Exercise deactivated' });
});

module.exports = { getExercises, createExercise, getExerciseById, updateExercise, setExerciseStatus, deleteExercise };
