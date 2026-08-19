const { Exercise } = require('../models/Exercise.model');
const asyncHandler = require('../utils/asyncHandler');

// Extracts an 11-character YouTube video ID from a supported URL.
const extractYouTubeVideoId = (videoUrl) => {
  if (!videoUrl) return null;
  const match = String(videoUrl).match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match?.[1] || null;
};

// Normalizes exercise video metadata before persistence.
const normalizeExercisePayload = (payload) => {
  const next = { ...payload };
  if (next.videoUrl) {
    const videoId = extractYouTubeVideoId(next.videoUrl);
    if (!videoId) {
      const error = new Error('videoUrl must be a valid YouTube watch or youtu.be URL');
      error.status = 400;
      throw error;
    }
    next.youtubeVideoId = next.youtubeVideoId || videoId;
  }
  return next;
};

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
  res.status(201).json(await Exercise.create(normalizeExercisePayload(req.body)));
});

const getExerciseById = asyncHandler(async (req, res) => {
  const exercise = await Exercise.findById(req.params.id).populate('painCategory', 'name');
  if (!exercise) return res.status(404).json({ message: 'Exercise not found' });
  res.json(exercise);
});

const updateExercise = asyncHandler(async (req, res) => {
  const exercise = await Exercise.findByIdAndUpdate(req.params.id, normalizeExercisePayload(req.body), { new: true });
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
