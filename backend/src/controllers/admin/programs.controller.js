const mongoose = require('mongoose');
const Program = require('../../models/Program.model');
const PainCategory = require('../../models/PainCategory.model');
const PatientProgram = require('../../models/PatientProgram.model');
const { ProgramDay } = require('../../models/Exercise.model');
const { writeAuditLog } = require('../../utils/auditLogger');
const { getPagination } = require('../../utils/queryHelpers');
const asyncHandler = require('../../utils/asyncHandler');

const DIFFICULTY_LEVELS = [
  'beginner',
  'intermediate',
  'advanced',
  'senior_friendly',
  'post_operative',
  'general_mobility',
  'condition_specific',
];

const cleanString = (value) => String(value ?? '').trim();
const cleanStringArray = (value) => {
  if (!Array.isArray(value)) return undefined;
  return value.map(cleanString).filter(Boolean);
};

const normalizePayload = (body = {}) => {
  const payload = {};
  const stringFields = [
    'programCode', 'name', 'nameHindi', 'description', 'objective',
    'recommendedAgeGroup', 'instructions', 'precautions', 'thumbnail',
  ];
  stringFields.forEach((field) => {
    if (body[field] !== undefined) payload[field] = cleanString(body[field]);
  });

  if (body.painCategory !== undefined) payload.painCategory = body.painCategory || null;
  if (body.difficultyLevel !== undefined) payload.difficultyLevel = body.difficultyLevel || undefined;
  if (body.durationDays !== undefined && body.durationDays !== '') payload.durationDays = Number(body.durationDays);
  if (body.sessionsPerDay !== undefined && body.sessionsPerDay !== '') payload.sessionsPerDay = Number(body.sessionsPerDay);
  if (body.defaultPrice !== undefined && body.defaultPrice !== '') payload.defaultPrice = Number(body.defaultPrice);
  if (body.isActive !== undefined) payload.isActive = Boolean(body.isActive);

  ['eligibleConditions', 'excludedConditions', 'requiredEquipment'].forEach((field) => {
    const normalized = cleanStringArray(body[field]);
    if (normalized !== undefined) payload[field] = normalized;
  });

  return payload;
};

const validatePayload = async (payload, { partial = false, programId = null } = {}) => {
  if (!partial && !payload.name) return 'Program name is required';
  if (payload.name !== undefined && !payload.name) return 'Program name is required';
  if (!partial && !payload.painCategory) return 'Pain category is required';
  if (payload.painCategory !== undefined && !payload.painCategory) return 'Pain category is required';
  if (!partial && (!Number.isFinite(payload.durationDays) || payload.durationDays < 1)) return 'Duration must be at least 1 day';
  if (payload.durationDays !== undefined && (!Number.isFinite(payload.durationDays) || payload.durationDays < 1 || payload.durationDays > 365)) return 'Duration must be between 1 and 365 days';
  if (payload.sessionsPerDay !== undefined && (!Number.isFinite(payload.sessionsPerDay) || payload.sessionsPerDay < 1 || payload.sessionsPerDay > 10)) return 'Sessions per day must be between 1 and 10';
  if (payload.defaultPrice !== undefined && (!Number.isFinite(payload.defaultPrice) || payload.defaultPrice < 0)) return 'Default price cannot be negative';
  if (payload.difficultyLevel !== undefined && payload.difficultyLevel && !DIFFICULTY_LEVELS.includes(payload.difficultyLevel)) return 'Invalid difficulty level';

  if (payload.painCategory) {
    const category = await PainCategory.findOne({ _id: payload.painCategory, isActive: true }).select('_id').lean();
    if (!category) return 'Pain category not found or inactive';
  }

  if (payload.programCode) {
    const duplicateFilter = { programCode: { $regex: `^${payload.programCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } };
    if (programId) duplicateFilter._id = { $ne: programId };
    if (await Program.exists(duplicateFilter)) return 'Program code already exists';
  }

  return null;
};

const listMetrics = async (programIds) => {
  if (!programIds.length) return new Map();
  const [days, enrollments] = await Promise.all([
    ProgramDay.aggregate([
      { $match: { program: { $in: programIds }, isActive: true } },
      { $group: { _id: '$program', dayCount: { $sum: 1 } } },
    ]),
    PatientProgram.aggregate([
      { $match: { program: { $in: programIds } } },
      { $group: {
        _id: '$program',
        enrollmentCount: { $sum: 1 },
        activeEnrollmentCount: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
      } },
    ]),
  ]);

  const metrics = new Map();
  programIds.forEach((id) => metrics.set(String(id), { dayCount: 0, enrollmentCount: 0, activeEnrollmentCount: 0 }));
  days.forEach((item) => Object.assign(metrics.get(String(item._id)), { dayCount: item.dayCount }));
  enrollments.forEach((item) => Object.assign(metrics.get(String(item._id)), {
    enrollmentCount: item.enrollmentCount,
    activeEnrollmentCount: item.activeEnrollmentCount,
  }));
  return metrics;
};

const getPrograms = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};
  const search = cleanString(req.query.search);
  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { name: { $regex: escaped, $options: 'i' } },
      { nameHindi: { $regex: escaped, $options: 'i' } },
      { programCode: { $regex: escaped, $options: 'i' } },
      { description: { $regex: escaped, $options: 'i' } },
    ];
  }
  if (req.query.status === 'active') filter.isActive = true;
  if (req.query.status === 'inactive') filter.isActive = false;
  if (req.query.categoryId) filter.painCategory = req.query.categoryId;
  if (req.query.difficultyLevel) filter.difficultyLevel = req.query.difficultyLevel;

  const [items, total, summary] = await Promise.all([
    Program.find(filter)
      .populate('painCategory', 'name nameHindi isActive')
      .sort({ isActive: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Program.countDocuments(filter),
    Promise.all([
      Program.countDocuments(),
      Program.countDocuments({ isActive: true }),
      Program.countDocuments({ isActive: false }),
      Program.distinct('painCategory', { isActive: true, painCategory: { $ne: null } }),
    ]),
  ]);

  const metrics = await listMetrics(items.map((item) => item._id));
  res.json({
    items: items.map((item) => ({ ...item, metrics: metrics.get(String(item._id)) })),
    meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    summary: {
      total: summary[0],
      active: summary[1],
      inactive: summary[2],
      mappedCategories: summary[3].length,
    },
  });
});

const getProgramById = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid program id' });
  const program = await Program.findById(req.params.id).populate('painCategory', 'name nameHindi description isActive').lean();
  if (!program) return res.status(404).json({ message: 'Program not found' });

  const [days, enrollmentSummary] = await Promise.all([
    ProgramDay.find({ program: program._id, isActive: true })
      .select('dayNumber title exercises isActive')
      .populate('exercises.exercise', 'name nameHindi thumbnail videoUrl youtubeVideoId isActive')
      .sort({ dayNumber: 1 })
      .lean(),
    PatientProgram.aggregate([
      { $match: { program: program._id } },
      { $group: {
        _id: null,
        total: { $sum: 1 },
        active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        pendingPayment: { $sum: { $cond: [{ $eq: ['$status', 'pending_payment'] }, 1, 0] } },
      } },
    ]),
  ]);

  const enrollment = enrollmentSummary[0] || { total: 0, active: 0, completed: 0, pendingPayment: 0 };
  res.json({
    program,
    days,
    metrics: {
      configuredDays: days.length,
      totalExercises: days.reduce((sum, day) => sum + (day.exercises?.length || 0), 0),
      enrollments: enrollment.total,
      activeEnrollments: enrollment.active,
      completedEnrollments: enrollment.completed,
      pendingPaymentEnrollments: enrollment.pendingPayment,
    },
  });
});

const createProgram = asyncHandler(async (req, res) => {
  const payload = normalizePayload(req.body);
  const error = await validatePayload(payload);
  if (error) return res.status(400).json({ message: error });

  const program = await Program.create(payload);
  await writeAuditLog({ req, action: 'program_created', module: 'Program', recordId: program._id, newValue: program });
  res.status(201).json(program);
});

const updateProgram = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid program id' });
  const program = await Program.findById(req.params.id);
  if (!program) return res.status(404).json({ message: 'Program not found' });

  const payload = normalizePayload(req.body);
  const error = await validatePayload(payload, { partial: true, programId: program._id });
  if (error) return res.status(400).json({ message: error });

  const previousValue = program.toObject();
  Object.assign(program, payload);
  await program.save();
  await writeAuditLog({ req, action: 'program_updated', module: 'Program', recordId: program._id, previousValue, newValue: payload });
  res.json(program);
});

const setProgramStatus = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid program id' });
  const program = await Program.findById(req.params.id);
  if (!program) return res.status(404).json({ message: 'Program not found' });

  const nextActive = req.params.action === 'reactivate';
  if (program.isActive === nextActive) {
    return res.status(409).json({ message: `Program is already ${nextActive ? 'active' : 'inactive'}` });
  }

  const previousValue = { isActive: program.isActive };
  program.isActive = nextActive;
  await program.save();
  await writeAuditLog({
    req,
    action: nextActive ? 'program_reactivated' : 'program_deactivated',
    module: 'Program',
    recordId: program._id,
    previousValue,
    newValue: { isActive: nextActive },
    reason: cleanString(req.body.reason),
  });
  res.json({ message: `Program ${nextActive ? 'reactivated' : 'deactivated'}`, program });
});

module.exports = { getPrograms, getProgramById, createProgram, updateProgram, setProgramStatus };
