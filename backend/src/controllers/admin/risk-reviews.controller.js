const PatientAssessment = require('../../models/PatientAssessment.model');
const Program = require('../../models/Program.model');
const { writeAuditLog } = require('../../utils/auditLogger');
const { paginateModel } = require('../../utils/queryHelpers');
const asyncHandler = require('../../utils/asyncHandler');

const reviewFilter = { $or: [{ hasRedFlag: true }, { requiresPhysioReview: true }] };

const populate = [
  { path: 'patient', select: 'patientId fullName mobile status referringDoctor', populate: { path: 'referringDoctor', select: 'doctorId fullName clinicName' } },
  { path: 'caseType', select: 'code name requiresSurgeryDetails requiresPhysioReview' },
  { path: 'painCategory', select: 'name' },
  { path: 'surgeryType', select: 'code name bodyRegion' },
  { path: 'approvedProgram', select: 'programCode name durationDays difficultyLevel painCategory isActive' },
  { path: 'reviewedBy', select: 'email mobile role' },
];

const getRiskReviews = asyncHandler(async (req, res) => {
  const { status = 'pending_review', search, reviewType } = req.query;
  const filter = { ...reviewFilter };
  if (status && status !== 'all') filter.status = status;
  if (reviewType && reviewType !== 'all') filter.reviewType = reviewType;

  const result = await paginateModel({ model: PatientAssessment, filter, query: req.query, sort: { createdAt: -1 }, populate });
  let items = result.items;
  if (search) {
    const q = String(search).trim().toLowerCase();
    items = items.filter((item) => [
      item.patient?.patientId, item.patient?.fullName, item.patient?.mobile,
      item.patient?.referringDoctor?.fullName, item.patient?.referringDoctor?.clinicName,
      item.caseType?.name, item.painCategory?.name, item.surgeryType?.name,
      item.approvedProgram?.name, item.reviewType, item.adminReviewNote, item.status,
      ...(item.redFlagDetails || []).flatMap((detail) => [detail.questionText, detail.answer, detail.reason]),
    ].filter((value) => value !== undefined && value !== null).some((value) => String(value).toLowerCase().includes(q)));
  }

  const [total, pending, cleared, blocked, redFlags, physioReviews] = await Promise.all([
    PatientAssessment.countDocuments(reviewFilter),
    PatientAssessment.countDocuments({ ...reviewFilter, status: 'pending_review' }),
    PatientAssessment.countDocuments({ ...reviewFilter, status: 'cleared' }),
    PatientAssessment.countDocuments({ ...reviewFilter, status: 'blocked' }),
    PatientAssessment.countDocuments({ hasRedFlag: true }),
    PatientAssessment.countDocuments({ requiresPhysioReview: true }),
  ]);

  res.json({ items, meta: result.meta, summary: { total, pending, cleared, blocked, redFlags, physioReviews } });
});

const getRiskReviewById = asyncHandler(async (req, res) => {
  const assessment = await PatientAssessment.findOne({ _id: req.params.id, ...reviewFilter }).populate(populate).lean();
  if (!assessment) return res.status(404).json({ message: 'Clinical review not found' });

  let availablePrograms = [];
  if (assessment.requiresPhysioReview && assessment.painCategory?._id) {
    availablePrograms = await Program.find({ isActive: true, painCategory: assessment.painCategory._id })
      .select('programCode name durationDays difficultyLevel description painCategory')
      .sort({ name: 1 })
      .lean();
  }

  res.json({ ...assessment, availablePrograms });
});

const updateRiskReview = asyncHandler(async (req, res) => {
  const { status, note, programId } = req.body;
  if (!['cleared', 'blocked'].includes(status)) return res.status(400).json({ message: 'Decision must be cleared or blocked' });
  if (!String(note || '').trim()) return res.status(400).json({ message: 'Clinical review note is required' });

  const assessment = await PatientAssessment.findOne({ _id: req.params.id, ...reviewFilter });
  if (!assessment) return res.status(404).json({ message: 'Clinical review not found' });
  if (assessment.status !== 'pending_review') return res.status(409).json({ message: 'Only pending clinical reviews can receive a decision' });

  let approvedProgram = null;
  if (status === 'cleared' && assessment.requiresPhysioReview) {
    if (!programId) return res.status(400).json({ message: 'Select the rehabilitation programme approved for this clinical review' });
    approvedProgram = await Program.findOne({ _id: programId, isActive: true, painCategory: assessment.painCategory }).select('_id name programCode');
    if (!approvedProgram) return res.status(400).json({ message: 'Select an active programme mapped to this body region' });
  }

  const previousValue = {
    status: assessment.status,
    adminReviewNote: assessment.adminReviewNote,
    approvedProgram: assessment.approvedProgram,
    reviewedBy: assessment.reviewedBy,
    reviewedAt: assessment.reviewedAt,
  };
  assessment.status = status;
  assessment.adminReviewNote = String(note).trim();
  assessment.approvedProgram = status === 'cleared' && approvedProgram ? approvedProgram._id : undefined;
  assessment.reviewedBy = req.user._id;
  assessment.reviewedAt = new Date();
  await assessment.save();

  const isRedFlagReview = assessment.reviewType === 'red_flag' || assessment.hasRedFlag;
  await writeAuditLog({
    req,
    action: status === 'cleared'
      ? isRedFlagReview ? 'assessment_red_flag_cleared' : 'assessment_physio_review_cleared'
      : isRedFlagReview ? 'assessment_red_flag_blocked' : 'assessment_physio_review_blocked',
    module: 'PatientAssessment',
    recordId: assessment._id,
    previousValue,
    newValue: {
      status,
      adminReviewNote: assessment.adminReviewNote,
      approvedProgram: assessment.approvedProgram,
      approvedProgramName: approvedProgram?.name,
      reviewedBy: req.user._id,
      reviewedAt: assessment.reviewedAt,
    },
  });

  const updated = await PatientAssessment.findById(assessment._id).populate(populate).lean();
  res.json(updated);
});

module.exports = { getRiskReviews, getRiskReviewById, updateRiskReview };
