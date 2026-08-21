const Patient = require('../../models/Patient.model');
const PatientProgram = require('../../models/PatientProgram.model');
const PatientAssessment = require('../../models/PatientAssessment.model');
const { Payment, Order } = require('../../models/Payment.model');
const { buildSearchFilter, buildSort, paginateModel } = require('../../utils/queryHelpers');
const { writeAuditLog } = require('../../utils/auditLogger');
const asyncHandler = require('../../utils/asyncHandler');

const isObjectId = (value) => /^[a-f\d]{24}$/i.test(String(value));
const VERIFIED_PAYMENT_STATUSES = ['successful', 'manually_verified'];

const resolvePatient = (id) => Patient.findOne({
  $or: [
    { _id: isObjectId(id) ? id : null },
    { patientId: id },
  ],
});

const getPatients = asyncHandler(async (req, res) => {
  const { status, mobileVerified, referralLocked, doctor, city, search } = req.query;
  const filter = {
    ...buildSearchFilter(search, ['patientId', 'fullName', 'mobile', 'email', 'city', 'state']),
  };
  if (status) filter.status = status;
  if (mobileVerified !== undefined && mobileVerified !== '') filter.mobileVerified = mobileVerified === 'true';
  if (referralLocked !== undefined && referralLocked !== '') filter.referralLocked = referralLocked === 'true';
  if (doctor) filter.referringDoctor = doctor;
  if (city) filter.city = city;

  const [result, total, active, blocked, verified, referralLockedCount, paidPatientIds] = await Promise.all([
    paginateModel({
      model: Patient,
      filter,
      query: req.query,
      sort: buildSort(req.query.sortBy, req.query.sortOrder, ['createdAt', 'fullName', 'city', 'status']),
      populate: [{ path: 'referringDoctor', select: 'doctorId fullName clinicName city' }],
    }),
    Patient.countDocuments(),
    Patient.countDocuments({ status: 'active' }),
    Patient.countDocuments({ status: 'blocked' }),
    Patient.countDocuments({ mobileVerified: true }),
    Patient.countDocuments({ referralLocked: true }),
    Payment.distinct('patient', { status: { $in: VERIFIED_PAYMENT_STATUSES } }),
  ]);

  res.json({
    items: result.items.map((item) => ({ ...item, id: item.patientId || item._id })),
    meta: result.meta,
    summary: {
      total,
      active,
      blocked,
      mobileVerified: verified,
      referralLocked: referralLockedCount,
      paidPatients: paidPatientIds.length,
    },
  });
});

const getPatientById = asyncHandler(async (req, res) => {
  const patientDoc = await resolvePatient(req.params.id);
  if (!patientDoc) return res.status(404).json({ message: 'Patient not found' });

  const patient = await Patient.findById(patientDoc._id)
    .populate('referringDoctor', 'doctorId fullName clinicName city state revenueModel approvedPatientFee status')
    .lean();

  const [programs, payments, assessments, orders] = await Promise.all([
    PatientProgram.find({ patient: patient._id })
      .populate('program', 'programCode name durationDays')
      .sort({ createdAt: -1 })
      .lean(),
    Payment.find({ patient: patient._id })
      .populate('program', 'programCode name')
      .populate('doctor', 'doctorId fullName clinicName')
      .sort({ createdAt: -1 })
      .lean(),
    PatientAssessment.find({ patient: patient._id })
      .populate('painCategory', 'name')
      .sort({ createdAt: -1 })
      .lean(),
    Order.find({ patient: patient._id })
      .populate('program', 'programCode name')
      .sort({ createdAt: -1 })
      .lean(),
  ]);

  const verifiedPayments = payments.filter((payment) => VERIFIED_PAYMENT_STATUSES.includes(payment.status));
  const totalPaid = verifiedPayments.reduce((sum, payment) => sum + Number(payment.paidAmount || 0), 0);
  const activePrograms = programs.filter((program) => program.status === 'active').length;
  const redFlags = assessments.filter((assessment) => assessment.hasRedFlag).length;

  res.json({
    ...patient,
    id: patient.patientId || patient._id,
    metrics: {
      programs: programs.length,
      activePrograms,
      payments: payments.length,
      successfulPayments: verifiedPayments.length,
      totalPaid,
      assessments: assessments.length,
      redFlags,
    },
    programs,
    payments,
    assessments,
    orders,
  });
});

const updatePatientStatus = asyncHandler(async (req, res) => {
  const { status, reason } = req.body;
  if (!['active', 'inactive', 'blocked'].includes(status)) {
    return res.status(400).json({ message: 'status must be active, inactive, or blocked' });
  }
  if (!String(reason || '').trim()) {
    return res.status(400).json({ message: 'Reason is required for patient status changes' });
  }

  const patient = await resolvePatient(req.params.id);
  if (!patient) return res.status(404).json({ message: 'Patient not found' });
  if (patient.status === status) return res.status(400).json({ message: `Patient is already ${status}` });

  const previousValue = { status: patient.status, tokenVersion: patient.tokenVersion || 0 };
  patient.status = status;
  if (status !== 'active') patient.tokenVersion = (patient.tokenVersion || 0) + 1;
  await patient.save();

  await writeAuditLog({
    req,
    action: `patient_${status}`,
    module: 'Patient',
    recordId: patient._id,
    previousValue,
    newValue: { status: patient.status, tokenVersion: patient.tokenVersion || 0 },
    reason: String(reason).trim(),
  });

  res.json({ message: `Patient status changed to ${status}`, patient });
});

module.exports = { getPatients, getPatientById, updatePatientStatus };
