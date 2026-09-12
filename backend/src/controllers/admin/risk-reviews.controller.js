const PatientAssessment = require('../../models/PatientAssessment.model');
const Patient = require('../../models/Patient.model');
const Program = require('../../models/Program.model');
const { Payment } = require('../../models/Payment.model');
const notificationService = require('../../services/notification.service');
const { writeAuditLog } = require('../../utils/auditLogger');
const { paginateModel } = require('../../utils/queryHelpers');
const asyncHandler = require('../../utils/asyncHandler');

const reviewFilter = { $or: [{ hasRedFlag: true }, { requiresPhysioReview: true }] };
const FINANCIAL_STATUSES = ['successful', 'manually_verified', 'partially_refunded', 'refunded', 'disputed', 'chargeback'];

const populate = [
  {
    path: 'patient',
    select: 'patientId fullName mobile status referringDoctor directPatientFee directPatientFeeSetAt',
    populate: { path: 'referringDoctor', select: 'doctorId fullName clinicName approvedPatientFee revenueModel' },
  },
  { path: 'caseType', select: 'code name requiresSurgeryDetails requiresPhysioReview' },
  { path: 'painCategory', select: 'name' },
  { path: 'surgeryType', select: 'code name bodyRegion' },
  { path: 'approvedProgram', select: 'programCode name durationDays difficultyLevel painCategory isActive' },
  { path: 'approvedPrograms', select: 'programCode name durationDays difficultyLevel painCategory isActive' },
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
      item.approvedProgram?.name,
      ...(item.approvedPrograms || []).map((program) => program?.name),
      item.reviewType, item.adminReviewNote, item.status,
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
  if (assessment.painCategory?._id) {
    availablePrograms = await Program.find({ isActive: true, painCategory: assessment.painCategory._id })
      .select('programCode name durationDays difficultyLevel description painCategory')
      .sort({ durationDays: 1, name: 1 })
      .lean();
  }

  res.json({ ...assessment, availablePrograms });
});

const updateRiskReview = asyncHandler(async (req, res) => {
  const { status, note, programId, programIds, patientFee } = req.body;
  if (!['cleared', 'blocked'].includes(status)) return res.status(400).json({ message: 'Decision must be cleared or blocked' });
  if (!String(note || '').trim()) return res.status(400).json({ message: 'Clinical review note is required' });

  const assessment = await PatientAssessment.findOne({ _id: req.params.id, ...reviewFilter });
  if (!assessment) return res.status(404).json({ message: 'Clinical review not found' });

  const programmeCorrection = assessment.status === 'cleared' && status === 'cleared';
  const shouldSendClearanceSms = assessment.status === 'pending_review' && status === 'cleared';
  if (assessment.status !== 'pending_review' && !programmeCorrection) {
    return res.status(409).json({ message: 'Only pending reviews can receive a decision. Cleared reviews can only update programme assignment or direct-patient fee before payment.' });
  }

  const patient = await Patient.findById(assessment.patient);
  if (!patient) return res.status(404).json({ message: 'Patient not found' });
  const previousDirectPatientFee = patient.directPatientFee;

  const paid = await Payment.exists({ patient: assessment.patient, status: { $in: FINANCIAL_STATUSES } });
  if (programmeCorrection && paid) {
    return res.status(409).json({ message: 'Programme assignment and patient fee are locked after verified payment' });
  }

  let approvedPrograms = [];
  if (status === 'cleared') {
    const ids = [...new Set([
      ...(Array.isArray(programIds) ? programIds : []),
      ...(programId ? [programId] : []),
    ].map((value) => String(value)).filter(Boolean))];

    if (!ids.length) return res.status(400).json({ message: 'Select at least one rehabilitation programme for this clinical review' });

    approvedPrograms = await Program.find({
      _id: { $in: ids },
      isActive: true,
      painCategory: assessment.painCategory,
    }).select('_id name programCode durationDays');

    if (approvedPrograms.length !== ids.length) {
      return res.status(400).json({ message: 'Every selected programme must be active and mapped to this body region' });
    }

    if (!patient.referringDoctor) {
      const fee = Number(patientFee ?? patient.directPatientFee);
      if (!Number.isFinite(fee) || fee <= 0) {
        return res.status(400).json({ message: 'Admin must set the patient fee for a direct PhysioQR patient before clearance' });
      }
      patient.directPatientFee = fee;
      patient.directPatientFeeSetBy = req.user._id;
      patient.directPatientFeeSetAt = new Date();
      await patient.save();
    }
  }

  const previousValue = {
    status: assessment.status,
    adminReviewNote: assessment.adminReviewNote,
    approvedProgram: assessment.approvedProgram,
    approvedPrograms: assessment.approvedPrograms,
    directPatientFee: previousDirectPatientFee,
    reviewedBy: assessment.reviewedBy,
    reviewedAt: assessment.reviewedAt,
  };

  if (!programmeCorrection) assessment.status = status;
  assessment.adminReviewNote = String(note).trim();
  if (status === 'cleared') {
    assessment.approvedPrograms = approvedPrograms.map((program) => program._id);
    assessment.approvedProgram = approvedPrograms[0]._id;
  } else {
    assessment.approvedPrograms = [];
    assessment.approvedProgram = undefined;
  }
  assessment.reviewedBy = req.user._id;
  assessment.reviewedAt = new Date();
  await assessment.save();

  const isRedFlagReview = assessment.reviewType === 'red_flag' || assessment.hasRedFlag;
  const action = programmeCorrection
    ? 'assessment_programme_bundle_updated_after_clearance'
    : status === 'cleared'
      ? isRedFlagReview ? 'assessment_red_flag_cleared' : 'assessment_physio_review_cleared'
      : isRedFlagReview ? 'assessment_red_flag_blocked' : 'assessment_physio_review_blocked';

  await writeAuditLog({
    req,
    action,
    module: 'PatientAssessment',
    recordId: assessment._id,
    previousValue,
    newValue: {
      status: assessment.status,
      adminReviewNote: assessment.adminReviewNote,
      approvedProgram: assessment.approvedProgram,
      approvedPrograms: assessment.approvedPrograms,
      approvedProgramNames: approvedPrograms.map((program) => program.name),
      directPatientFee: patient.referringDoctor ? undefined : patient.directPatientFee,
      feeAuthority: patient.referringDoctor ? 'doctor' : 'admin',
      reviewedBy: req.user._id,
      reviewedAt: assessment.reviewedAt,
    },
    reason: note,
  });

  let sms;
  if (shouldSendClearanceSms) {
    sms = await notificationService.createNotification({
      recipientType: 'patient',
      patient: assessment.patient,
      type: 'assessment_review_cleared',
      channel: 'sms',
      title: 'Assessment review cleared',
      message: 'PhysioQR: Your assessment has been reviewed and cleared. Please log in to continue with payment and your approved rehabilitation plan.',
      metadata: { assessmentId: assessment._id, reviewedAt: assessment.reviewedAt },
    });
    await writeAuditLog({
      req,
      action: 'assessment_clearance_sms_queued',
      module: 'Notification',
      recordId: sms._id,
      newValue: { assessmentId: assessment._id, patientId: assessment.patient, status: sms.status, provider: sms.provider, providerMessageId: sms.providerMessageId, failureReason: sms.failureReason },
    });
  }

  const updated = await PatientAssessment.findById(assessment._id).populate(populate).lean();
  res.json({ ...updated, sms: sms ? { notificationId: sms._id, status: sms.status, provider: sms.provider, providerMessageId: sms.providerMessageId, failureReason: sms.failureReason } : undefined });
});

module.exports = { getRiskReviews, getRiskReviewById, updateRiskReview };
