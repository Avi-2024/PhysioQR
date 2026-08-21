const PatientAssessment = require('../../models/PatientAssessment.model');
const { writeAuditLog } = require('../../utils/auditLogger');
const { paginateModel } = require('../../utils/queryHelpers');
const asyncHandler = require('../../utils/asyncHandler');

const populate = [
  { path: 'patient', select: 'patientId fullName mobile status referringDoctor', populate: { path: 'referringDoctor', select: 'doctorId fullName clinicName' } },
  { path: 'painCategory', select: 'name' },
  { path: 'reviewedBy', select: 'email mobile role' },
];

const getRiskReviews = asyncHandler(async (req, res) => {
  const { status = 'pending_review', search } = req.query;
  const filter = { hasRedFlag: true };
  if (status && status !== 'all') filter.status = status;

  const result = await paginateModel({
    model: PatientAssessment,
    filter,
    query: req.query,
    sort: { createdAt: -1 },
    populate,
  });

  let items = result.items;
  if (search) {
    const q = String(search).trim().toLowerCase();
    items = items.filter((item) => [
      item.patient?.patientId,
      item.patient?.fullName,
      item.patient?.mobile,
      item.patient?.referringDoctor?.fullName,
      item.patient?.referringDoctor?.clinicName,
      item.painCategory?.name,
      item.adminReviewNote,
      item.status,
      ...(item.redFlagDetails || []).flatMap((detail) => [detail.questionText, detail.answer, detail.reason]),
    ].filter((value) => value !== undefined && value !== null).some((value) => String(value).toLowerCase().includes(q)));
  }

  const [total, pending, cleared, blocked] = await Promise.all([
    PatientAssessment.countDocuments({ hasRedFlag: true }),
    PatientAssessment.countDocuments({ hasRedFlag: true, status: 'pending_review' }),
    PatientAssessment.countDocuments({ hasRedFlag: true, status: 'cleared' }),
    PatientAssessment.countDocuments({ hasRedFlag: true, status: 'blocked' }),
  ]);

  res.json({ items, meta: result.meta, summary: { total, pending, cleared, blocked } });
});

const getRiskReviewById = asyncHandler(async (req, res) => {
  const assessment = await PatientAssessment.findOne({ _id: req.params.id, hasRedFlag: true }).populate(populate).lean();
  if (!assessment) return res.status(404).json({ message: 'Risk review not found' });
  res.json(assessment);
});

const updateRiskReview = asyncHandler(async (req, res) => {
  const { status, note } = req.body;
  if (!['cleared', 'blocked'].includes(status)) {
    return res.status(400).json({ message: 'Decision must be cleared or blocked' });
  }
  if (!String(note || '').trim()) {
    return res.status(400).json({ message: 'Clinical review note is required' });
  }

  const assessment = await PatientAssessment.findOne({ _id: req.params.id, hasRedFlag: true });
  if (!assessment) return res.status(404).json({ message: 'Risk review not found' });
  if (assessment.status !== 'pending_review') {
    return res.status(409).json({ message: 'Only pending risk reviews can receive a clinical decision' });
  }

  const previousValue = { status: assessment.status, adminReviewNote: assessment.adminReviewNote, reviewedBy: assessment.reviewedBy, reviewedAt: assessment.reviewedAt };
  assessment.status = status;
  assessment.adminReviewNote = String(note).trim();
  assessment.reviewedBy = req.user._id;
  assessment.reviewedAt = new Date();
  await assessment.save();

  await writeAuditLog({
    req,
    action: status === 'cleared' ? 'assessment_red_flag_cleared' : 'assessment_red_flag_blocked',
    module: 'PatientAssessment',
    recordId: assessment._id,
    previousValue,
    newValue: { status, adminReviewNote: assessment.adminReviewNote, reviewedBy: req.user._id, reviewedAt: assessment.reviewedAt },
  });

  const updated = await PatientAssessment.findById(assessment._id).populate(populate).lean();
  res.json(updated);
});

module.exports = { getRiskReviews, getRiskReviewById, updateRiskReview };
