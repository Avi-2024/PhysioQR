const mongoose = require('mongoose');
const QrScan = require('../../models/QrScan.model');
const Doctor = require('../../models/Doctor.model');
const Patient = require('../../models/Patient.model');
const Agent = require('../../models/Agent.model');
const { Payment } = require('../../models/Payment.model');
const asyncHandler = require('../../utils/asyncHandler');

const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const isObjectId = (value) => mongoose.Types.ObjectId.isValid(String(value));

const buildSearchFilter = async (search) => {
  if (!search) return {};
  const regex = new RegExp(escapeRegex(search.trim()), 'i');

  const [doctors, patients, agents] = await Promise.all([
    Doctor.find({ $or: [{ doctorId: regex }, { fullName: regex }, { clinicName: regex }, { city: regex }] }).select('_id').lean(),
    Patient.find({ $or: [{ patientId: regex }, { fullName: regex }, { mobile: regex }] }).select('_id').lean(),
    Agent.find({ $or: [{ agentId: regex }, { fullName: regex }, { assignedRegion: regex }] }).select('_id').lean(),
  ]);

  const or = [
    { clinicId: regex },
    { paymentStatus: regex },
    { referralSource: regex },
    { doctor: { $in: doctors.map((item) => item._id) } },
    { patient: { $in: patients.map((item) => item._id) } },
    { agent: { $in: agents.map((item) => item._id) } },
  ];

  if (isObjectId(search)) or.push({ _id: search });
  return { $or: or };
};

const listPopulate = [
  { path: 'doctor', select: 'doctorId fullName clinicName city state revenueModel qrCodeActive status' },
  { path: 'agent', select: 'agentId fullName assignedRegion' },
  { path: 'patient', select: 'patientId fullName mobile referralLocked status' },
];

const toReferral = (scan) => ({
  ...scan,
  id: scan._id,
  referralId: `REF-${String(scan._id).slice(-8).toUpperCase()}`,
  conversionStage: scan.paymentStatus === 'paid' ? 'paid' : scan.registrationDate ? 'registered' : 'scanned',
});

const getReferrals = asyncHandler(async (req, res) => {
  const {
    doctor,
    agent,
    paymentStatus,
    referralSource,
    conversionStage,
    search,
    page = 1,
    limit = 20,
    sortOrder = 'desc',
  } = req.query;

  const filter = await buildSearchFilter(search);
  if (doctor) filter.doctor = doctor;
  if (agent) filter.agent = agent;
  if (paymentStatus) filter.paymentStatus = paymentStatus;
  if (referralSource) filter.referralSource = referralSource;
  if (conversionStage === 'registered') filter.registrationDate = { $ne: null };
  if (conversionStage === 'scanned') filter.registrationDate = null;
  if (conversionStage === 'paid') filter.paymentStatus = 'paid';

  const pageNumber = Math.max(Number(page) || 1, 1);
  const limitNumber = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const sortDirection = sortOrder === 'asc' ? 1 : -1;

  const [items, total, totalScans, registered, paid, failed, locked] = await Promise.all([
    QrScan.find(filter)
      .populate(listPopulate)
      .sort({ scanDate: sortDirection, createdAt: sortDirection })
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber)
      .lean(),
    QrScan.countDocuments(filter),
    QrScan.countDocuments(),
    QrScan.countDocuments({ registrationDate: { $ne: null } }),
    QrScan.countDocuments({ paymentStatus: 'paid' }),
    QrScan.countDocuments({ paymentStatus: 'failed' }),
    Patient.countDocuments({ referralLocked: true }),
  ]);

  res.json({
    items: items.map(toReferral),
    meta: {
      page: pageNumber,
      limit: limitNumber,
      total,
      pages: Math.max(Math.ceil(total / limitNumber), 1),
    },
    summary: {
      totalScans,
      registered,
      paid,
      failed,
      lockedReferrals: locked,
    },
  });
});

const getReferralById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const objectId = id.startsWith('REF-') ? null : id;

  let scan = objectId && isObjectId(objectId)
    ? await QrScan.findById(objectId).populate(listPopulate).lean()
    : null;

  if (!scan && id.startsWith('REF-')) {
    const suffix = id.slice(4).toLowerCase();
    const candidates = await QrScan.find().populate(listPopulate).sort({ createdAt: -1 }).limit(500).lean();
    scan = candidates.find((item) => String(item._id).slice(-8).toLowerCase() === suffix) || null;
  }

  if (!scan) return res.status(404).json({ message: 'Referral record not found' });

  const payment = scan.patient && scan.doctor
    ? await Payment.findOne({ patient: scan.patient._id, doctor: scan.doctor._id })
        .select('status paidAmount paymentMethod gatewayProvider invoiceNumber verifiedAt createdAt')
        .sort({ createdAt: -1 })
        .lean()
    : null;

  res.json({
    ...toReferral(scan),
    payment,
    attribution: {
      referralLocked: Boolean(scan.patient?.referralLocked),
      editable: false,
      reason: scan.patient?.referralLocked
        ? 'Referral attribution is locked for this patient.'
        : 'Referral attribution is read-only in the admin workspace to preserve audit integrity.',
    },
  });
});

module.exports = { getReferrals, getReferralById };
