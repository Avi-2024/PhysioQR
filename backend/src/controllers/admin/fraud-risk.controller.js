const mongoose = require('mongoose');
const FraudCase = require('../../models/FraudCase.model');
const { buildSearchFilter, buildSort, paginateModel } = require('../../utils/queryHelpers');
const { writeAuditLog } = require('../../utils/auditLogger');
const asyncHandler = require('../../utils/asyncHandler');

const STATUSES = ['open', 'reviewing', 'resolved', 'dismissed'];
const SEVERITIES = ['low', 'medium', 'high', 'critical'];

const assertEnum = (value, allowed, label) => {
  if (value && !allowed.includes(value)) {
    const error = new Error(`${label} must be one of: ${allowed.join(', ')}`);
    error.status = 400;
    throw error;
  }
};

const getFraudCases = asyncHandler(async (req, res) => {
  assertEnum(req.query.status, STATUSES, 'status');
  assertEnum(req.query.severity, SEVERITIES, 'severity');

  const filter = {
    ...buildSearchFilter(req.query.search, ['rule', 'summary', 'relatedRecord']),
  };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.severity) filter.severity = req.query.severity;
  if (req.query.rule) filter.rule = req.query.rule;
  if (req.query.doctor) filter.doctor = req.query.doctor;
  if (req.query.patient) filter.patient = req.query.patient;

  const [result, summaryRows, rules] = await Promise.all([
    paginateModel({
      model: FraudCase,
      filter,
      query: req.query,
      sort: buildSort(req.query.sortBy, req.query.sortOrder, ['createdAt', 'updatedAt', 'severity', 'status']),
      populate: [
        { path: 'doctor', select: 'doctorId fullName clinicName status' },
        { path: 'patient', select: 'patientId fullName mobile status' },
        { path: 'payment', select: 'invoiceNumber paidAmount refundAmount status gatewayTransactionId' },
        { path: 'reviewedBy', select: 'email mobile role' },
      ],
    }),
    FraudCase.aggregate([
      { $group: { _id: null,
        total: { $sum: 1 },
        open: { $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] } },
        reviewing: { $sum: { $cond: [{ $eq: ['$status', 'reviewing'] }, 1, 0] } },
        critical: { $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] } },
        high: { $sum: { $cond: [{ $eq: ['$severity', 'high'] }, 1, 0] } },
        resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
        dismissed: { $sum: { $cond: [{ $eq: ['$status', 'dismissed'] }, 1, 0] } },
      } },
    ]),
    FraudCase.distinct('rule'),
  ]);

  res.json({
    items: result.items,
    meta: result.meta,
    summary: summaryRows[0] || { total: 0, open: 0, reviewing: 0, critical: 0, high: 0, resolved: 0, dismissed: 0 },
    rules: rules.filter(Boolean).sort(),
  });
});

const getFraudCaseById = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid fraud case id' });
  const fraudCase = await FraudCase.findById(req.params.id)
    .populate('doctor', 'doctorId fullName clinicName mobile email city state status kycStatus bankVerified')
    .populate('patient', 'patientId fullName mobile email city status referralLocked')
    .populate('payment', 'invoiceNumber paidAmount refundAmount status gatewayProvider gatewayOrderId gatewayTransactionId paymentMethod verifiedAt createdAt')
    .populate('reviewedBy', 'email mobile role')
    .lean();
  if (!fraudCase) return res.status(404).json({ message: 'Fraud case not found' });
  res.json({ fraudCase });
});

const reviewFraudCase = asyncHandler(async (req, res) => {
  const { status, note } = req.body;
  if (!['reviewing', 'resolved', 'dismissed'].includes(status)) {
    return res.status(400).json({ message: 'status must be reviewing, resolved, or dismissed' });
  }
  const cleanNote = String(note || '').trim();
  if (!cleanNote) return res.status(400).json({ message: 'note is required' });

  const fraudCase = await FraudCase.findById(req.params.id);
  if (!fraudCase) return res.status(404).json({ message: 'Fraud case not found' });

  const previousValue = { status: fraudCase.status, resolutionNote: fraudCase.resolutionNote };
  fraudCase.status = status;
  fraudCase.resolutionNote = cleanNote;
  fraudCase.reviewedBy = req.user._id;
  fraudCase.reviewedAt = new Date();
  await fraudCase.save();

  await writeAuditLog({
    req,
    action: 'fraud_case_reviewed',
    module: 'FraudCase',
    recordId: fraudCase._id,
    previousValue,
    newValue: { status, note: cleanNote },
  });

  res.json({ message: 'Fraud case updated', fraudCase });
});

module.exports = { getFraudCases, getFraudCaseById, reviewFraudCase };