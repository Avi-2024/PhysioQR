const Doctor = require('../models/Doctor.model');
const Patient = require('../models/Patient.model');
const Agent = require('../models/Agent.model');
const QrScan = require('../models/QrScan.model');
const PatientProgram = require('../models/PatientProgram.model');
const PatientAssessment = require('../models/PatientAssessment.model');
const SupportTicket = require('../models/SupportTicket.model');
const { Order, Payment } = require('../models/Payment.model');
const { FeeShare, WithdrawalRequest } = require('../models/FeeShare.model');
const { DoctorWallet, WalletTransaction } = require('../models/Wallet.model');
const AuditLog = require('../models/AuditLog.model');
const Program = require('../models/Program.model');
const PainCategory = require('../models/PainCategory.model');
const { Exercise } = require('../models/Exercise.model');
const Coupon = require('../models/Coupon.model');
const Refund = require('../models/Refund.model');
const { writeAuditLog } = require('../utils/auditLogger');
const { buildSearchFilter, buildSort, paginateModel } = require('../utils/queryHelpers');
const asyncHandler = require('../utils/asyncHandler');

const isObjectId = (value) => /^[a-f\d]{24}$/i.test(String(value));

const normalizeId = (record, primaryKey) => ({
  ...record,
  id: record[primaryKey] || record._id,
});

const sendList = (res, result, primaryKey) => {
  res.json({
    items: result.items.map((item) => normalizeId(item, primaryKey)),
    meta: result.meta,
  });
};

const getDashboard = asyncHandler(async (req, res) => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [
    totalAgents,
    totalDoctors,
    activeDoctors,
    pendingApprovals,
    suspendedDoctors,
    totalQrScans,
    totalPatients,
    totalPaidPatients,
    activePrograms,
    todayRevenueResult,
    monthlyRevenueResult,
    totalFeeShareResult,
    pendingWithdrawals,
    completedPayouts,
    totalRefunds,
    highRiskAssessments,
    openTickets,
  ] = await Promise.all([
    Agent.countDocuments(),
    Doctor.countDocuments(),
    Doctor.countDocuments({ status: 'approved' }),
    Doctor.countDocuments({ status: 'submitted' }),
    Doctor.countDocuments({ status: 'suspended' }),
    QrScan.countDocuments(),
    Patient.countDocuments(),
    Payment.countDocuments({ status: 'successful' }),
    PatientProgram.countDocuments({ status: 'active' }),
    Payment.aggregate([
      { $match: { status: 'successful', createdAt: { $gte: todayStart } } },
      { $group: { _id: null, total: { $sum: '$paidAmount' } } },
    ]),
    Payment.aggregate([
      { $match: { status: 'successful', createdAt: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: '$paidAmount' } } },
    ]),
    Payment.aggregate([
      { $match: { status: 'successful' } },
      { $group: { _id: null, doctorShare: { $sum: '$doctorFeeShare' }, platformShare: { $sum: '$platformShare' } } },
    ]),
    WithdrawalRequest.countDocuments({ status: 'requested' }),
    WithdrawalRequest.countDocuments({ status: 'paid' }),
    Payment.countDocuments({ status: { $in: ['refunded', 'partially_refunded'] } }),
    PatientAssessment.countDocuments({ hasRedFlag: true, status: 'pending_review' }),
    SupportTicket.countDocuments({ status: 'open' }),
  ]);

  res.json({
    totalAgents,
    totalDoctors,
    activeDoctors,
    pendingApprovals,
    suspendedDoctors,
    totalQrScans,
    totalPatients,
    totalPaidPatients,
    activePrograms,
    todayRevenue: todayRevenueResult[0]?.total || 0,
    monthlyRevenue: monthlyRevenueResult[0]?.total || 0,
    totalDoctorFeeShare: totalFeeShareResult[0]?.doctorShare || 0,
    physioQrEarnings: totalFeeShareResult[0]?.platformShare || 0,
    pendingWithdrawals,
    completedPayouts,
    totalRefunds,
    highRiskAssessments,
    openTickets,
  });
});

const getAuditLogs = asyncHandler(async (req, res) => {
  const { module, action, limit = 100 } = req.query;
  const filter = {};
  if (module) filter.module = module;
  if (action) filter.action = action;

  const logs = await AuditLog.find(filter)
    .populate('performedBy', 'email role')
    .sort({ createdAt: -1 })
    .limit(Number(limit));

  res.json(logs);
});

const getAgents = asyncHandler(async (req, res) => {
  const { status, search } = req.query;
  const filter = {
    ...buildSearchFilter(search, ['agentId', 'fullName', 'mobile', 'email', 'city', 'assignedRegion']),
  };
  if (status) filter.status = status;

  const result = await paginateModel({
    model: Agent,
    filter,
    query: req.query,
    sort: buildSort(req.query.sortBy, req.query.sortOrder, ['createdAt', 'fullName', 'city', 'status']),
    select: '-identityProof',
  });

  sendList(res, result, 'agentId');
});

const getAgentById = asyncHandler(async (req, res) => {
  const agent = await Agent.findOne({
    $or: [{ _id: isObjectId(req.params.id) ? req.params.id : null }, { agentId: req.params.id }],
  }).select('-identityProof').lean();

  if (!agent) return res.status(404).json({ message: 'Agent not found' });

  const doctors = await Doctor.find({ agent: agent._id })
    .select('doctorId fullName clinicName city status approvedPatientFee revenueModel createdAt')
    .sort({ createdAt: -1 })
    .lean();

  const doctorIds = doctors.map((doctor) => doctor._id);
  const [patientsGenerated, paidPatients, revenue] = await Promise.all([
    Patient.countDocuments({ referringDoctor: { $in: doctorIds } }),
    Payment.countDocuments({ doctor: { $in: doctorIds }, status: 'successful' }),
    Payment.aggregate([
      { $match: { doctor: { $in: doctorIds }, status: 'successful' } },
      { $group: { _id: null, total: { $sum: '$paidAmount' } } },
    ]),
  ]);

  res.json({
    ...normalizeId(agent, 'agentId'),
    metrics: {
      doctorsRegistered: doctors.length,
      patientsGenerated,
      paidPatients,
      revenueGenerated: revenue[0]?.total || 0,
    },
    doctors,
  });
});

const getDoctors = asyncHandler(async (req, res) => {
  const { status, agent, revenueModel, search } = req.query;
  const filter = {
    ...buildSearchFilter(search, ['doctorId', 'fullName', 'mobile', 'email', 'clinicName', 'city', 'specialization']),
  };
  if (status) filter.status = status;
  if (agent) filter.agent = agent;
  if (revenueModel) filter.revenueModel = revenueModel;

  const result = await paginateModel({
    model: Doctor,
    filter,
    query: req.query,
    sort: buildSort(req.query.sortBy, req.query.sortOrder, ['createdAt', 'fullName', 'city', 'status', 'approvedPatientFee']),
    populate: [{ path: 'agent', select: 'agentId fullName assignedRegion' }],
    select: '-bankAccountNumber -panNumber -identityProof -addressProof -medicalRegDoc -cancelledCheque',
  });

  sendList(res, result, 'doctorId');
});

const getDoctorById = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findOne({
    $or: [{ _id: isObjectId(req.params.id) ? req.params.id : null }, { doctorId: req.params.id }],
  }).populate('agent', 'agentId fullName assignedRegion mobile').lean();

  if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
  if (doctor.bankAccountNumber) doctor.bankAccountNumber = `XXXXXX${doctor.bankAccountNumber.slice(-4)}`;
  if (doctor.panNumber) doctor.panNumber = `XXXXXX${doctor.panNumber.slice(-4)}`;

  const [patients, paidPatients, wallet, revenue, qrScans] = await Promise.all([
    Patient.countDocuments({ referringDoctor: doctor._id }),
    Payment.countDocuments({ doctor: doctor._id, status: 'successful' }),
    DoctorWallet.findOne({ doctor: doctor._id }).lean(),
    Payment.aggregate([
      { $match: { doctor: doctor._id, status: 'successful' } },
      { $group: { _id: null, total: { $sum: '$paidAmount' }, feeShare: { $sum: '$doctorFeeShare' } } },
    ]),
    QrScan.countDocuments({ doctor: doctor._id }),
  ]);

  res.json({
    ...normalizeId(doctor, 'doctorId'),
    metrics: {
      qrScans,
      patients,
      paidPatients,
      revenueGenerated: revenue[0]?.total || 0,
      feeShareGenerated: revenue[0]?.feeShare || 0,
    },
    wallet,
  });
});

const getPatients = asyncHandler(async (req, res) => {
  const { status, mobileVerified, doctor, city, search } = req.query;
  const filter = {
    ...buildSearchFilter(search, ['patientId', 'fullName', 'mobile', 'email', 'city']),
  };
  if (status) filter.status = status;
  if (mobileVerified !== undefined) filter.mobileVerified = mobileVerified === 'true';
  if (doctor) filter.referringDoctor = doctor;
  if (city) filter.city = city;

  const result = await paginateModel({
    model: Patient,
    filter,
    query: req.query,
    sort: buildSort(req.query.sortBy, req.query.sortOrder, ['createdAt', 'fullName', 'city', 'status']),
    populate: [{ path: 'referringDoctor', select: 'doctorId fullName clinicName city' }],
  });

  sendList(res, result, 'patientId');
});

const getPatientById = asyncHandler(async (req, res) => {
  const patient = await Patient.findOne({
    $or: [{ _id: isObjectId(req.params.id) ? req.params.id : null }, { patientId: req.params.id }],
  }).populate('referringDoctor', 'doctorId fullName clinicName city revenueModel approvedPatientFee').lean();

  if (!patient) return res.status(404).json({ message: 'Patient not found' });

  const [programs, payments, assessments] = await Promise.all([
    PatientProgram.find({ patient: patient._id }).populate('program', 'programCode name durationDays').sort({ createdAt: -1 }).lean(),
    Payment.find({ patient: patient._id }).populate('program', 'programCode name').sort({ createdAt: -1 }).lean(),
    PatientAssessment.find({ patient: patient._id }).populate('painCategory', 'name').sort({ createdAt: -1 }).lean(),
  ]);

  res.json({ ...normalizeId(patient, 'patientId'), programs, payments, assessments });
});

const getPayments = asyncHandler(async (req, res) => {
  const { status, doctor, patient, search } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (doctor) filter.doctor = doctor;
  if (patient) filter.patient = patient;
  if (search) {
    filter.$or = [
      { gatewayTransactionId: { $regex: String(search), $options: 'i' } },
      { invoiceNumber: { $regex: String(search), $options: 'i' } },
    ];
  }

  const result = await paginateModel({
    model: Payment,
    filter,
    query: req.query,
    sort: buildSort(req.query.sortBy, req.query.sortOrder, ['createdAt', 'paidAmount', 'status']),
    populate: [
      { path: 'patient', select: 'patientId fullName mobile city' },
      { path: 'doctor', select: 'doctorId fullName clinicName' },
      { path: 'program', select: 'programCode name' },
      { path: 'order', select: 'orderId finalAmount status' },
    ],
  });

  sendList(res, result, '_id');
});

const getOrders = asyncHandler(async (req, res) => {
  const { status, doctor, patient } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (doctor) filter.doctor = doctor;
  if (patient) filter.patient = patient;

  const result = await paginateModel({
    model: Order,
    filter,
    query: req.query,
    sort: buildSort(req.query.sortBy, req.query.sortOrder, ['createdAt', 'finalAmount', 'status']),
    populate: [
      { path: 'patient', select: 'patientId fullName mobile' },
      { path: 'doctor', select: 'doctorId fullName clinicName' },
      { path: 'program', select: 'programCode name' },
    ],
  });

  sendList(res, result, 'orderId');
});

const getWithdrawals = asyncHandler(async (req, res) => {
  const { status, doctor } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (doctor) filter.doctor = doctor;

  const result = await paginateModel({
    model: WithdrawalRequest,
    filter,
    query: req.query,
    sort: buildSort(req.query.sortBy, req.query.sortOrder, ['createdAt', 'requestedAmount', 'status']),
    populate: [
      { path: 'doctor', select: 'doctorId fullName clinicName kycStatus bankVerified status' },
      { path: 'wallet', select: 'availableBalance pendingBalance withdrawalRequestedAmount paidBalance' },
    ],
    select: '-bankAccountNumber',
  });

  sendList(res, result, '_id');
});

const getWallets = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.doctor) filter.doctor = req.query.doctor;

  const result = await paginateModel({
    model: DoctorWallet,
    filter,
    query: req.query,
    sort: buildSort(req.query.sortBy, req.query.sortOrder, ['createdAt', 'availableBalance', 'pendingBalance', 'lifetimeEarnings']),
    populate: [{ path: 'doctor', select: 'doctorId fullName clinicName status revenueModel' }],
  });

  sendList(res, result, '_id');
});

const getWalletLedger = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findOne({
    $or: [{ _id: isObjectId(req.params.doctorId) ? req.params.doctorId : null }, { doctorId: req.params.doctorId }],
  });
  if (!doctor) return res.status(404).json({ message: 'Doctor not found' });

  const result = await paginateModel({
    model: WalletTransaction,
    filter: { doctor: doctor._id },
    query: req.query,
    sort: { createdAt: -1 },
    populate: [{ path: 'relatedPayment', select: 'invoiceNumber paidAmount status' }],
  });

  sendList(res, result, '_id');
});

const getFeeShares = asyncHandler(async (req, res) => {
  const { status, doctor } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (doctor) filter.doctor = doctor;

  const result = await paginateModel({
    model: FeeShare,
    filter,
    query: req.query,
    sort: buildSort(req.query.sortBy, req.query.sortOrder, ['createdAt', 'amount', 'availableDate', 'status']),
    populate: [
      { path: 'doctor', select: 'doctorId fullName clinicName' },
      { path: 'patient', select: 'patientId fullName mobile' },
      { path: 'payment', select: 'invoiceNumber paidAmount status' },
    ],
  });

  sendList(res, result, '_id');
});

const getRiskReviews = asyncHandler(async (req, res) => {
  const { status = 'pending_review' } = req.query;
  const filter = { hasRedFlag: true };
  if (status !== 'all') filter.status = status;

  const result = await paginateModel({
    model: PatientAssessment,
    filter,
    query: req.query,
    sort: { createdAt: -1 },
    populate: [
      { path: 'patient', select: 'patientId fullName mobile referringDoctor' },
      { path: 'painCategory', select: 'name' },
      { path: 'reviewedBy', select: 'email role' },
    ],
  });

  sendList(res, result, '_id');
});

const updateRiskReview = asyncHandler(async (req, res) => {
  const { status, adminReviewNote } = req.body;
  if (!['cleared', 'blocked', 'pending_review'].includes(status)) {
    return res.status(400).json({ message: 'status must be cleared, blocked, or pending_review' });
  }

  const assessment = await PatientAssessment.findById(req.params.id);
  if (!assessment) return res.status(404).json({ message: 'Assessment not found' });

  const previousValue = { status: assessment.status, adminReviewNote: assessment.adminReviewNote };
  assessment.status = status;
  assessment.adminReviewNote = adminReviewNote;
  assessment.reviewedBy = req.user._id;
  await assessment.save();

  await writeAuditLog({
    req,
    action: 'risk_review_decision',
    module: 'PatientAssessment',
    recordId: assessment._id,
    previousValue,
    newValue: { status, adminReviewNote },
  });

  res.json(assessment);
});

const getContentSummary = asyncHandler(async (req, res) => {
  const [
    painCategories,
    activePainCategories,
    programs,
    activePrograms,
    exercises,
    activeExercises,
    coupons,
    activeCoupons,
    refunds,
  ] = await Promise.all([
    PainCategory.countDocuments(),
    PainCategory.countDocuments({ isActive: true }),
    Program.countDocuments(),
    Program.countDocuments({ isActive: true }),
    Exercise.countDocuments(),
    Exercise.countDocuments({ isActive: true }),
    Coupon.countDocuments(),
    Coupon.countDocuments({ isActive: true }),
    Refund.countDocuments(),
  ]);

  res.json({
    painCategories,
    activePainCategories,
    programs,
    activePrograms,
    exercises,
    activeExercises,
    coupons,
    activeCoupons,
    refunds,
  });
});

module.exports = {
  getDashboard,
  getAuditLogs,
  getAgents,
  getAgentById,
  getDoctors,
  getDoctorById,
  getPatients,
  getPatientById,
  getPayments,
  getOrders,
  getWithdrawals,
  getWallets,
  getWalletLedger,
  getFeeShares,
  getRiskReviews,
  updateRiskReview,
  getContentSummary,
};
