const mongoose = require('mongoose');
const { Exercise, ProgramDay } = require('../models/Exercise.model');
const PainCategory = require('../models/PainCategory.model');
const { writeAuditLog } = require('../utils/auditLogger');
const asyncHandler = require('../utils/asyncHandler');
const { EXERCISE_PREFIX } = require('../data/generalKnee30DayDraft');
const { assignKneeVideoCandidates } = require('../services/kneeVideoCandidateMapping.service');
const { DEMO_VIDEO_ID, DEMO_VIDEO_URL, isDemoExerciseVideo, patientSafeExercise, missingDemoVideoFilter, installedDemoVideoFilter, pendingDemoVideoFilter } = require('../services/demoExerciseVideo.service');
// Draft-seeded content is delivered only via an authorised patient prescription,
// never through the generic exercise catalogue or exercise detail API.
const privateSeedPattern = new RegExp('^' + EXERCISE_PREFIX); // Prefix is fixed alphanumeric/underscore text.


const LANGUAGES = ['en', 'hi'];
const cleanString = (value) => String(value ?? '').trim();
const escapeRegex = (value) => cleanString(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const extractYouTubeVideoId = (videoUrl) => {
  if (!videoUrl) return null;
  const match = cleanString(videoUrl).match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
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
        const error = new Error('videoUrl must be a valid YouTube watch, Shorts, embed, live, or youtu.be URL');
        error.status = 400;
        throw error;
      }
      payload.youtubeVideoId = videoId;
      payload.isDemoVideo = isDemoExerciseVideo({ youtubeVideoId: videoId });
    } else {
      payload.youtubeVideoId = '';
      payload.isDemoVideo = false;
    }
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
    const filter = { isActive: true, seedKey: { $not: privateSeedPattern } };
    if (req.query.category) filter.painCategory = req.query.category;
    if (req.query.language) filter.language = req.query.language;
    const items = await Exercise.find(filter).populate('painCategory', 'name').sort({ displayOrder: 1, createdAt: -1 }).lean();
    return res.json(items.map(patientSafeExercise));
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

  const [items, total, totalAll, active, inactive, withVideo, demoVideos] = await Promise.all([
    Exercise.find(filter).populate('painCategory', 'name nameHindi isActive').sort({ isActive: -1, displayOrder: 1, createdAt: -1 }).skip(skip).limit(limit).lean(),
    Exercise.countDocuments(filter),
    Exercise.countDocuments(),
    Exercise.countDocuments({ isActive: true }),
    Exercise.countDocuments({ isActive: false }),
    Exercise.countDocuments({ videoUrl: { $nin: [null, ''] } }),
    Exercise.countDocuments({ isDemoVideo: true }),
  ]);
  const usage = await usageForExercises(items.map((item) => item._id));
  res.json({
    items: items.map((item) => ({ ...item, usage: usage.get(String(item._id)) || { programDays: 0, programs: 0 } })),
    meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    summary: { total: totalAll, active, inactive, withVideo, demoVideos },
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
  if (!exercise || (req.user.role !== 'admin' && (
    exercise.isActive === false || privateSeedPattern.test(String(exercise.seedKey || ''))
  ))) return res.status(404).json({ message: 'Exercise not found' });
  const programDays = await ProgramDay.find({ 'exercises.exercise': exercise._id, isActive: true })
    .select('program dayNumber title exercises')
    .populate('program', 'name programCode isActive')
    .sort({ dayNumber: 1 })
    .lean();
  const programIds = new Set(programDays.map((day) => String(day.program?._id || '')).filter(Boolean));
  res.json({ exercise: req.user.role === 'admin' ? exercise : patientSafeExercise(exercise),
    usage: { programDays: programDays.length, programs: programIds.size }, programDays });
});

const updateExercise = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid exercise id' });
  const exercise = await Exercise.findById(req.params.id);
  if (!exercise) return res.status(404).json({ message: 'Exercise not found' });
  const payload = normalizeExercisePayload(req.body);
  const validationError = await validateExercisePayload(payload, { partial: true });
  if (validationError) return res.status(400).json({ message: validationError });
  const previousValue = exercise.toObject();
  // Editing the title, prescription, or URL cannot silently approve a video
  // candidate. Only the explicit reviewed-video action releases this flag.
  const changedVideo = payload.videoUrl !== undefined && payload.youtubeVideoId !== exercise.youtubeVideoId;
  if (exercise.videoCandidateReviewPending || (changedVideo && exercise.videoReview?.reviewedAt)) {
    payload.isDemoVideo = true;
    payload.videoCandidateReviewPending = true;
    if (changedVideo) {
      // A replacement URL also needs a NEW clinical review, even if an older
      // candidate had previously been approved.
      payload.videoReview = {};
      payload.videoCandidateTitle = 'Admin replacement awaiting clinical review';
      payload.videoCandidateProvider = 'Admin-provided, unreviewed';
      payload.videoCandidateSourcePage = '';
    }
  }
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
  await writeAuditLog({ req, action: nextActive ? 'exercise_reactivated' : 'exercise_deactivated', module: 'Exercise', recordId: exercise._id, previousValue, newValue: { isActive: nextActive }, reason: cleanString(req.body?.reason) || (nextActive ? 'Admin activated exercise from Exercise Library' : 'Admin deactivated exercise from Exercise Library') });
  res.json({ message: `Exercise ${nextActive ? 'reactivated' : 'deactivated'}`, exercise });
});

// Explicit clinician review for one candidate video. Confirmation is
// auditable, and a video is never automatically approved by matching its name.
const recordExerciseVideoReview = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid exercise ID' });
  const exercise = await Exercise.findById(req.params.id);
  if (!exercise) return res.status(404).json({ message: 'Exercise not found' });
  if (!exercise.videoCandidateReviewPending) {
    return res.status(409).json({ message: 'This exercise has no pending mapped-video review' });
  }
  const clinicianName = cleanString(req.body?.clinicianName);
  const reviewNote = cleanString(req.body?.reviewNote);
  if (clinicianName.length < 3 || clinicianName.length > 160 || reviewNote.length < 10 || reviewNote.length > 2000) {
    return res.status(400).json({ message: 'Enter the actual reviewing clinician name and a meaningful review note' });
  }
  if (!exercise.youtubeVideoId || !/^[A-Za-z0-9_-]{11}$/.test(exercise.youtubeVideoId)) {
    return res.status(409).json({ message: 'First save a valid, working YouTube exercise demonstration' });
  }
  const { LEGACY_DEMO_VIDEO_ID, DEMO_VIDEO_ID } = require('../services/demoExerciseVideo.service');
  if ([LEGACY_DEMO_VIDEO_ID, DEMO_VIDEO_ID].includes(exercise.youtubeVideoId)) {
    return res.status(409).json({ message: 'Generic sample-player URLs cannot be approved as exercise demonstrations' });
  }
  const previousValue = { isDemoVideo: exercise.isDemoVideo, videoCandidateReviewPending: exercise.videoCandidateReviewPending };
  exercise.videoCandidateReviewPending = false;
  exercise.isDemoVideo = false;
  exercise.videoReview = {
    clinicianName, reviewNote, reviewedAt: new Date(), recordedBy: req.user._id,
  };
  await exercise.save();
  await writeAuditLog({
    req, action: 'exercise_video_clinical_review_recorded', module: 'Exercise',
    recordId: exercise._id, previousValue,
    newValue: { isDemoVideo: false, videoCandidateReviewPending: false, videoReview: exercise.videoReview },
    reason: reviewNote,
  });
  res.json({ message: 'Video review recorded. Programme publication still requires separate 30-day clinical sign-off.', exercise });
});

// Admin-only batch lifecycle action. IDs are explicit, validated and limited.
// A shared optional note avoids typing the same reason for each exercise.
// Each changed record still has its own attributed audit log.
const bulkSetExerciseStatus = asyncHandler(async (req, res) => {
  const { exerciseIds, action } = req.body || {};
  if (!Array.isArray(exerciseIds) || exerciseIds.length < 1 || exerciseIds.length > 100
    || !exerciseIds.every((id) => typeof id === 'string' && mongoose.isValidObjectId(id))) {
    return res.status(400).json({ message: 'Choose between 1 and 100 valid exercise IDs' });
  }
  if (!['activate', 'deactivate'].includes(action)) {
    return res.status(400).json({ message: 'Action must be activate or deactivate' });
  }
  const ids = [...new Set(exerciseIds.map((id) => id.toLowerCase()))];
  const exercises = await Exercise.find({ _id: { $in: ids } })
    .select('_id name isActive');
  if (exercises.length !== ids.length) {
    return res.status(404).json({ message: 'One or more selected exercises no longer exist. Refresh and retry.' });
  }

  const nextActive = action === 'activate';
  const changes = exercises.filter((exercise) => exercise.isActive !== nextActive);
  if (changes.length) {
    await Exercise.updateMany(
      { _id: { $in: changes.map((exercise) => exercise._id) }, isActive: !nextActive },
      { $set: { isActive: nextActive } },
    );
  }
  const reason = cleanString(req.body.reason) || (nextActive
    ? 'Bulk activation from Admin Exercise Library'
    : 'Bulk deactivation from Admin Exercise Library');
  for (const exercise of changes) {
    await writeAuditLog({
      req, action: nextActive ? 'exercise_reactivated' : 'exercise_deactivated',
      module: 'Exercise', recordId: exercise._id,
      previousValue: { isActive: !nextActive },
      newValue: { isActive: nextActive },
      reason, metadata: { bulk: true, selectedCount: ids.length, batchAction: action },
    });
  }
  res.json({
    message: `${changes.length} exercises ${nextActive ? 'activated' : 'deactivated'}; ${ids.length - changes.length} already in that state.`,
    selected: ids.length,
    changed: changes.length,
    skipped: ids.length - changes.length,
    // Exercise activation is NOT clinical approval or programme publication.
    programmePublished: false,
  });
});

// Explicit Admin action for local testing only. Unlike the CLI, this uses
// the SAME database as the running API, avoiding accidental .env mismatches.
// NEVER marks a video reviewed or publishes a programme.
const manageDemoExerciseVideos = asyncHandler(async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      message: 'Demo YouTube videos are disabled in production.',
    });
  }
  if (req.body?.acknowledgeTestingOnly !== true) {
    return res.status(400).json({ message: 'Confirm these are testing-only videos, not clinical exercise instructions.' });
  }
  const action = req.body?.action;
  if (!['apply', 'remove'].includes(action)) {
    return res.status(400).json({ message: 'Action must be apply or remove' });
  }
  const filter = action === 'apply' ? pendingDemoVideoFilter() : installedDemoVideoFilter();
  const change = action === 'apply'
    ? { videoUrl: DEMO_VIDEO_URL, youtubeVideoId: DEMO_VIDEO_ID, isDemoVideo: true }
    : { videoUrl: '', youtubeVideoId: '', isDemoVideo: false };

  const matchingBefore = await Exercise.countDocuments(filter);
  const result = matchingBefore
    ? await Exercise.updateMany(filter, { $set: change })
    : { matchedCount: 0, modifiedCount: 0 };
  const modified = Number(result.modifiedCount || 0);
  await writeAuditLog({
    req,
    action: action === 'apply' ? 'exercise_demo_videos_bulk_added' : 'exercise_demo_videos_bulk_removed',
    module: 'Exercise',
    reason: 'Admin confirmed development-only demo playback URLs',
    metadata: { action, matchingBefore, modified, testOnly: true, realVideosOverwritten: 0 },
  });

  res.json({
    message: action === 'apply'
      ? `Requested YouTube URL added/updated for ${modified} exercises (blank videos and previous demo only). Real videos preserved. Clinical approval remains locked.`
      : `Demo YouTube URLs removed from ${modified} exercises. Real videos preserved.`,
    action, matched: Number(result.matchedCount || 0), changed: modified,
    realVideosOverwritten: 0, programmePublished: false,
    testingOnly: true,
  });
});

// Dedicated scoped action. Unlike the blanket demo button, this maps a
// DIFFERENT exercise-matched video to each of the 15 Knee 30D seed exercises.
const assignKneeDraftVideoCandidates = asyncHandler(async (req, res) => {
  if (req.body?.acknowledgeReviewPending !== true) {
    return res.status(400).json({ message: 'Confirm these are video candidates pending physiotherapist review.' });
  }
  const result = await assignKneeVideoCandidates({ apply: true });
  await writeAuditLog({
    req, action: 'knee_draft_video_candidates_assigned', module: 'Exercise',
    reason: 'Admin requested 15 distinct exercise-matched videos for a clinical draft',
    metadata: { programmeCode: result.programmeCode, changed: result.changed,
      totalCandidates: result.totalCandidates, patientProgrammePublished: false },
  });
  res.json({ message: result.changed + ' Knee draft exercise videos assigned for clinical review. Programme remains unpublished.', ...result });
});

const deleteExercise = asyncHandler(async (req, res) => {
  const exercise = await Exercise.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!exercise) return res.status(404).json({ message: 'Exercise not found' });
  res.json({ message: 'Exercise deactivated' });
});

module.exports = { getExercises, createExercise, getExerciseById, updateExercise, setExerciseStatus, bulkSetExerciseStatus, manageDemoExerciseVideos, assignKneeDraftVideoCandidates, recordExerciseVideoReview, deleteExercise };
