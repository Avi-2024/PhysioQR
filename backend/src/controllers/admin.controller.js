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
const FraudCase = require('../models/FraudCase.model');
const Program = require('../models/Program.model');
const PainCategory = require('../models/PainCategory.model');
const { Exercise } = require('../models/Exercise.model');
const Coupon = require('../models/Coupon.model');
const Refund = require('../models/Refund.model');
const { writeAuditLog } = require('../utils/auditLogger');
const { buildSearchFilter, buildSort, paginateModel } = require('../utils/queryHelpers');
const asyncHandler = require('../utils/asyncHandler');

const isObjectId = (value) => /^[a-f\d]{24}$/i.test(String(value));
const MAX_AUDIT_EXPORT_LIMIT = 5000;

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

const escapeCsv = (value) => {
  if (value === undefined || value === null) return '';
  const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return `"${stringValue.replace(/"/g, '""')}"`;
};

const buildAuditFilter = (query = {}) => {
  const { module, action, userRole, recordId, performedBy, fromDate, toDate, search } = query;
  const filter = {};
  if (module) filter.module = module;
  if (action) filter.action = action;
  if (userRole) filter.userRole = userRole;
  if (recordId) filter.recordId = String(recordId);
  if (performedBy) filter.performedBy = performedBy;
  if (fromDate || toDate) {
    filter.createdAt = {};
    if (fromDate) filter.createdAt.$gte = new Date(fromDate);
    if (toDate) filter.createdAt.$lte = new Date(toDate);
  }
  if (search) {
    Object.assign(filter, buildSearchFilter(search, ['action', 'module', 'recordId', 'reason', 'path', 'requestId']));
  }
  return filter;
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
  const result = await paginateModel({
    model: AuditLog,
    filter: buildAuditFilter(req.query),
    query: req.query,
    sort: buildSort(req.query.sortBy, req.query.sortOrder, ['createdAt', 'action', 'module', 'userRole']),
    populate: [{ path: 'performedBy', select: 'email mobile role status' }],
    select: req.query.includeValues === 'true' ? undefined : '-previousValue -newValue',
  });

  sendList(res, result, '_id');
});

const getAuditLogById = asyncHandler(async (req, res) => {
  const log = await AuditLog.findById(req.params.id)
    .populate('performedBy', 'email mobile role status')
    .lean();
  if (!log) return res.status(404).json({ message: 'Audit log not found' });
  res.json(normalizeId(log, '_id'));
});

const exportAuditLogs = asyncHandler(async (req, res) => {
  const format = req.query.format || 'csv';
  if (!['csv', 'json'].includes(format)) {
    return res.status(400).json({ message: 'format must be csv or json' });
  }

  const limit = Math.min(Number(req.query.limit || 1000), MAX_AUDIT_EXPORT_LIMIT);
  const logs = await AuditLog.find(buildAuditFilter(req.query))
    .populate('performedBy', 'email mobile role status')
    .sort(buildSort(req.query.sortBy, req.query.sortOrder, ['createdAt', 'action', 'module', 'userRole']))
    .limit(limit)
    .lean();

  if (format === 'json') {
    return res.json({ items: logs.map((item) => normalizeId(item, '_id')), meta: { total: logs.length, limit } });
  }

  const rows = [
    ['createdAt', 'userRole', 'performedBy', 'action', 'module', 'recordId', 'reason', 'method', 'path', 'ipAddress', 'requestId'].join(','),
    ...logs.map((log) => [
      log.createdAt?.toISOString?.() || log.createdAt,
      log.userRole,
      log.performedBy?.email || log.performedBy?.mobile || log.performedBy?._id,
      log.action,
      log.module,
      log.recordId,
      log.reason,
      log.method,
      log.path,
      log.ipAddress,
      log.requestId,
    ].map(escapeCsv).join(',')),
  ];

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="audit-logs.csv"');
  res.send(rows.join('\n'));
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

const getClinics = asyncHandler(async (req, res) => {
  const { status, city, search } = req.query;
  const filter = { clinicName: { $exists: true, $ne: '' } };
  if (status) filter.status = status;
  if (city) filter.city = city;
  if (search) {
    Object.assign(filter, buildSearchFilter(search, ['clinicName', 'clinicAddress', 'city', 'state', 'fullName', 'doctorId']));
  }

  const result = await paginateModel({
    model: Doctor,
    filter,
    query: req.query,
    sort: buildSort(req.query.sortBy, req.query.sortOrder, ['clinicName', 'city', 'status', 'createdAt']),
    populate: [{ path: 'agent', select: 'agentId fullName assignedRegion city' }],
    select: 'doctorId fullName clinicName clinicAddress city state postalCode clinicContact clinicEmail clinicWorkingHours googleMapsLink clinicBranches status qrCodeActive revenueModel approvedPatientFee agent createdAt updatedAt',
  });

  res.json({
    items: result.items.map((doctor) => ({
      ...doctor,
      id: doctor._id,
      clinicId: `CLINIC-${doctor.doctorId || doctor._id}`,
      doctor,
    })),
    meta: result.meta,
  });
});

const getReferrals = asyncHandler(async (req, res) => {
  const { doctor, agent, paymentStatus, referralSource, search } = req.query;
  const filter = {};
  if (doctor) filter.doctor = doctor;
  if (agent) filter.agent = agent;
  if (paymentStatus) filter.paymentStatus = paymentStatus;
  if (referralSource) filter.referralSource = referralSource;

  const result = await paginateModel({
    model: QrScan,
    filter,
    query: req.query,
    sort: buildSort(req.query.sortBy, req.query.sortOrder, ['scanDate', 'createdAt', 'paymentStatus']),
    populate: [
      { path: 'doctor', select: 'doctorId fullName clinicName city revenueModel qrCodeActive' },
      { path: 'agent', select: 'agentId fullName assignedRegion' },
      { path: 'patient', select: 'patientId fullName mobile referralLocked' },
    ],
  });

  let items = result.items;
  if (search) {
    const query = String(search).toLowerCase();
    items = items.filter((scan) => [
      scan.doctor?.doctorId,
      scan.doctor?.fullName,
      scan.doctor?.clinicName,
      scan.patient?.fullName,
      scan.patient?.mobile,
      scan.agent?.fullName,
      scan.clinicId,
      scan.paymentStatus,
    ].filter(Boolean).some((value) => String(value).toLowerCase().includes(query)));
  }

  res.json({
    items: items.map((scan) => ({
      ...scan,
      id: scan._id,
      referralId: `REF-${String(scan._id).slice(-8).toUpperCase()}`,
      scanCount: 1,
      conversionStage: scan.paymentStatus === 'paid' ? 'paid' : scan.registrationDate ? 'registered' : 'scanned',
    })),
    meta: result.meta,
  });
});

const getRevenueModels = asyncHandler(async (req, res) => {
  const { revenueModel, status, search } = req.query;
  const filter = {};
  if (revenueModel) filter.revenueModel = revenueModel;
  if (status) filter.status = status;
  if (search) {
    Object.assign(filter, buildSearchFilter(search, ['doctorId', 'fullName', 'clinicName', 'city', 'revenueModel']));
  }

  const result = await paginateModel({
    model: Doctor,
    filter,
    query: req.query,
    sort: buildSort(req.query.sortBy, req.query.sortOrder, ['createdAt', 'fullName', 'approvedPatientFee', 'feeSharePercentage', 'revenueModel']),
    populate: [{ path: 'agent', select: 'agentId fullName assignedRegion' }],
    select: 'doctorId fullName clinicName city status revenueModel approvedPatientFee requestedPatientFee feeSharePercentage feeShareType fixedFeeShareAmount feeShareCalculationBasis feeShareHoldingDays minWithdrawal maxWithdrawal payoutCycle qrCodeActive agent updatedAt createdAt',
  });

  res.json({
    items: result.items.map((doctor) => ({
      ...doctor,
      id: doctor._id,
      modelId: `RM-${doctor.doctorId || String(doctor._id).slice(-6).toUpperCase()}`,
    })),
    meta: result.meta,
  });
});

const updateRevenueModel = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(req.params.doctorId);
  if (!doctor) return res.status(404).json({ message: 'Doctor not found' });

  const previousValue = {
    revenueModel: doctor.revenueModel,
    approvedPatientFee: doctor.approvedPatientFee,
    feeSharePercentage: doctor.feeSharePercentage,
    feeShareType: doctor.feeShareType,
    fixedFeeShareAmount: doctor.fixedFeeShareAmount,
    feeShareCalculationBasis: doctor.feeShareCalculationBasis,
    feeShareHoldingDays: doctor.feeShareHoldingDays,
    minWithdrawal: doctor.minWithdrawal,
    maxWithdrawal: doctor.maxWithdrawal,
    payoutCycle: doctor.payoutCycle,
  };

  const updates = {};
  if (req.body.revenueModel !== undefined) updates.revenueModel = req.body.revenueModel;
  if (req.body.feeShareType !== undefined) updates.feeShareType = req.body.feeShareType;
  if (req.body.feeShareCalculationBasis !== undefined) updates.feeShareCalculationBasis = req.body.feeShareCalculationBasis;

  ['approvedPatientFee', 'feeSharePercentage', 'fixedFeeShareAmount', 'feeShareHoldingDays', 'minWithdrawal', 'maxWithdrawal'].forEach((field) => {
    if (req.body[field] !== undefined && req.body[field] !== '') {
      const numberValue = Number(req.body[field]);
      if (Number.isNaN(numberValue)) return res.status(400).json({ message: `${field} must be a number` });
      updates[field] = numberValue;
    }
  });
  if (req.body.payoutCycle !== undefined) updates.payoutCycle = req.body.payoutCycle;

  Object.assign(doctor, updates);
  await doctor.save();

  await writeAuditLog({
    req,
    action: 'doctor_revenue_model_updated',
    module: 'Doctor',
    recordId: doctor._id,
    previousValue,
    newValue: updates,
    reason: req.body.reason,
  });

  res.json({ message: 'Revenue model updated', doctor });
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

const getWithdrawalById = asyncHandler(async (req, res) => {
  const withdrawal = await WithdrawalRequest.findById(req.params.id)
    .populate('doctor', 'doctorId fullName clinicName mobile email kycStatus bankVerified status revenueModel')
    .populate('wallet', 'availableBalance pendingBalance withdrawalRequestedAmount paidBalance reversedBalance lifetimeEarnings')
    .populate('processedBy', 'email mobile role')
    .select('-bankAccountNumber')
    .lean();

  if (!withdrawal) return res.status(404).json({ message: 'Withdrawal request not found' });

  res.json(normalizeId(withdrawal, '_id'));
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

const getFraudCases = asyncHandler(async (req, res) => {
  const { status, severity, rule, doctor, search } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (severity) filter.severity = severity;
  if (rule) filter.rule = rule;
  if (doctor) filter.doctor = doctor;
  if (search) {
    filter.$or = [
      { summary: { $regex: String(search), $options: 'i' } },
      { rule: { $regex: String(search), $options: 'i' } },
    ];
  }

  const result = await paginateModel({
    model: FraudCase,
    filter,
    query: req.query,
    sort: buildSort(req.query.sortBy, req.query.sortOrder, ['createdAt', 'severity', 'status']),
    populate: [
      { path: 'doctor', select: 'doctorId fullName clinicName' },
      { path: 'patient', select: 'patientId fullName mobile' },
      { path: 'payment', select: 'invoiceNumber paidAmount status gatewayTransactionId' },
    ],
  });

  sendList(res, result, '_id');
});

const getFraudCaseById = asyncHandler(async (req, res) => {
  const fraudCase = await FraudCase.findById(req.params.id)
    .populate('doctor', 'doctorId fullName clinicName')
    .populate('patient', 'patientId fullName mobile')
    .populate('payment', 'invoiceNumber paidAmount status gatewayTransactionId')
    .populate('reviewedBy', 'email mobile role');
  if (!fraudCase) return res.status(404).json({ message: 'Fraud case not found' });
  res.json(fraudCase);
});

const reviewFraudCase = asyncHandler(async (req, res) => {
  const { status, note } = req.body;
  if (!['reviewing', 'resolved', 'dismissed'].includes(status)) {
    return res.status(400).json({ message: 'status must be reviewing, resolved, or dismissed' });
  }

  const fraudCase = await FraudCase.findById(req.params.id);
  if (!fraudCase) return res.status(404).json({ message: 'Fraud case not found' });

  const previousValue = { status: fraudCase.status, resolutionNote: fraudCase.resolutionNote };
  fraudCase.status = status;
  fraudCase.resolutionNote = note;
  fraudCase.reviewedBy = req.user._id;
  fraudCase.reviewedAt = new Date();
  await fraudCase.save();

  await writeAuditLog({
    req,
    action: 'fraud_case_reviewed',
    module: 'FraudCase',
    recordId: fraudCase._id,
    previousValue,
    newValue: { status, note },
  });

  res.json(fraudCase);
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
  getAuditLogById,
  exportAuditLogs,
  getAgents,
  getAgentById,
  getDoctors,
  getDoctorById,
  getClinics,
  getReferrals,
  getRevenueModels,
  updateRevenueModel,
  getPatients,
  getPatientById,
  getPayments,
  getOrders,
  getWithdrawals,
  getWithdrawalById,
  getWallets,
  getWalletLedger,
  getFeeShares,
  getRiskReviews,
  updateRiskReview,
  getFraudCases,
  getFraudCaseById,
  reviewFraudCase,
  getContentSummary,
};
