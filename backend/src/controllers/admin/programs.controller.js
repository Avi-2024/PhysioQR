const mongoose = require('mongoose');
const Program = require('../../models/Program.model');
const PainCategory = require('../../models/PainCategory.model');
const PatientProgram = require('../../models/PatientProgram.model');
const { ProgramDay } = require('../../models/Exercise.model');
const { writeAuditLog } = require('../../utils/auditLogger');
const { getPagination } = require('../../utils/queryHelpers');
const asyncHandler = require('../../utils/asyncHandler');
const { inspectProgrammeRelease, getProgrammeReleaseReadiness, ensureApprovedRelease } = require('../../services/programmeReleaseGate.service');

const DIFFICULTY_LEVELS = [
  'beginner', 'intermediate', 'advanced', 'senior_friendly',
  'post_operative', 'general_mobility', 'condition_specific',
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
    Program.find(filter).populate('painCategory', 'name nameHindi isActive').sort({ isActive: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
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
    items: items.map((item) => ({ ...item, defaultPrice: undefined, metrics: metrics.get(String(item._id)) })),
    meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    summary: { total: summary[0], active: summary[1], inactive: summary[2], mappedCategories: summary[3].length },
  });
});

const getProgramById = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid program id' });
  const program = await Program.findById(req.params.id).populate('painCategory', 'name nameHindi description isActive').lean();
  if (!program) return res.status(404).json({ message: 'Program not found' });
  delete program.defaultPrice;

  const [days, enrollmentSummary] = await Promise.all([
    ProgramDay.find({ program: program._id, isActive: true })
      .select('dayNumber title focus exercises isActive')
      .populate('exercises.exercise', 'name nameHindi thumbnail videoUrl youtubeVideoId isActive seedKey')
      .sort({ dayNumber: 1 }).lean(),
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
  const overview = await inspectProgrammeRelease(program, { checkApprovalFreshness: true });
  const approvalOutdated = overview.issues.some((issue) =>
    issue.startsWith('Day configuration or exercise library content changed after clinical sign-off'));
  const nonSignatureIssues = overview.issues.filter((issue) =>
    !issue.startsWith('Day configuration or exercise library content changed after clinical sign-off'));
  res.json({
    program,
    days,
    releaseReadiness: {
      required: Boolean(program.clinicalApprovalRequired),
      clinicalApproved: Boolean(program.clinicalApproval?.approvedAt),
      // A stale old signature must not prevent recording a NEW clinician review.
      readyForSignOff: Boolean(program.clinicalApprovalRequired) && nonSignatureIssues.length === 0,
      readyForPublish: Boolean(program.clinicalApproval?.approvedAt) && overview.issues.length === 0,
      approvalOutdated,
      issueCount: overview.issues.length,
      issues: overview.issues.slice(0, 15),
      exercises: overview.exercises,
      missingDays: overview.missingDays,
      configuredDays: overview.configuredDays,
      requiredDays: overview.requiredDays,
    },
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

  if (program.clinicalApprovalRequired && payload.isActive !== undefined) {
    return res.status(409).json({ message: 'This reviewed programme can only be published or unpublished through the audited status action' });
  }
  if (payload.isActive === true && !program.isActive) await ensureApprovedRelease(program);
  const previousValue = program.toObject();
  Object.assign(program, payload);
  if (program.clinicalApprovalRequired && program.clinicalApproval?.approvedAt) {
    // Any clinical programme detail change requires a renewed sign-off.
    program.clinicalApproval = {};
  }
  // Keep any historical field out of active content configuration.
  program.defaultPrice = undefined;
  await program.save();
  await writeAuditLog({ req, action: 'program_updated', module: 'Program', recordId: program._id, previousValue, newValue: payload });
  res.json(program);
});

const setProgramStatus = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid program id' });
  const program = await Program.findById(req.params.id);
  if (!program) return res.status(404).json({ message: 'Program not found' });

  const nextActive = req.params.action === 'reactivate';
  if (program.isActive === nextActive) return res.status(409).json({ message: `Program is already ${nextActive ? 'active' : 'inactive'}` });
  if (nextActive) await ensureApprovedRelease(program);

  const previousValue = { isActive: program.isActive };
  program.isActive = nextActive;
  await program.save();
  await writeAuditLog({
    req,
    action: nextActive ? 'program_reactivated' : 'program_deactivated',
    module: 'Program', recordId: program._id, previousValue, newValue: { isActive: nextActive }, reason: cleanString(req.body.reason),
  });
  res.json({ message: `Program ${nextActive ? 'reactivated' : 'deactivated'}`, program });
});

// Admin records a real clinician's sign-off, not a system-generated approval.
// All 30 days, active exercises, safety instructions, and real video URLs must
// exist before this action succeeds. Never auto-approve from a seed.
const recordProgrammeClinicalApproval = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid programme ID' });
  const program = await Program.findById(req.params.id);
  if (!program) return res.status(404).json({ message: 'Programme not found' });
  if (!program.clinicalApprovalRequired) return res.status(400).json({ message: 'Clinical sign-off is not enabled for this programme' });
  if (program.isActive) return res.status(409).json({ message: 'Deactivate the programme before changing clinical sign-off' });
  const clinicianName = String(req.body.clinicianName || '').trim();
  const reviewNote = String(req.body.reviewNote || '').trim();
  if (clinicianName.length < 3 || clinicianName.length > 160 || reviewNote.length < 10 || reviewNote.length > 2000) {
    return res.status(400).json({ message: 'Provide the reviewing clinician name (3+ chars) and meaningful review note (10+ chars)' });
  }
  const issues = await getProgrammeReleaseReadiness(program);
  if (issues.length) return res.status(409).json({
    message: 'Complete and review all programme days, active exercises and videos before sign-off',
    issueCount: issues.length, issues: issues.slice(0, 15),
  });
  const previousValue = program.clinicalApproval;
  program.clinicalApproval = {
    clinicianName, reviewNote, approvedAt: new Date(), recordedBy: req.user._id,
  };
  await program.save();
  await writeAuditLog({
    req, action: 'programme_clinical_signoff_recorded', module: 'Program',
    recordId: program._id, previousValue,
    newValue: program.clinicalApproval,
    reason: reviewNote,
  });
  res.json({ message: 'Clinical sign-off recorded. Programme is still inactive until separately published.', program });
});

module.exports = { getPrograms, getProgramById, createProgram, updateProgram, setProgramStatus, recordProgrammeClinicalApproval };
