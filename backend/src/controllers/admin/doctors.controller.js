const Doctor = require('../../models/Doctor.model');
const Patient = require('../../models/Patient.model');
const QrScan = require('../../models/QrScan.model');
const { Payment } = require('../../models/Payment.model');
const { FeeShare } = require('../../models/FeeShare.model');
const { DoctorWallet } = require('../../models/Wallet.model');
const { buildSearchFilter, buildSort, paginateModel } = require('../../utils/queryHelpers');
const asyncHandler = require('../../utils/asyncHandler');

const VERIFIED_PAYMENT_STATUSES = ['successful', 'manually_verified', 'partially_refunded', 'refunded'];
const isObjectId = (value) => /^[a-f\d]{24}$/i.test(String(value));

const getDoctors = asyncHandler(async (req, res) => {
  const { status, agent, revenueModel, kycStatus, search } = req.query;
  const filter = {
    ...buildSearchFilter(search, [
      'doctorId', 'fullName', 'mobile', 'email', 'clinicName', 'city', 'state', 'specialization', 'medicalRegNumber',
    ]),
  };
  if (status) filter.status = status;
  if (agent) filter.agent = agent;
  if (revenueModel) filter.revenueModel = revenueModel;
  if (kycStatus) filter.kycStatus = kycStatus;

  const [result, total, approved, pendingApproval, documentsRequired, suspended] = await Promise.all([
    paginateModel({
      model: Doctor,
      filter,
      query: req.query,
      sort: buildSort(req.query.sortBy, req.query.sortOrder, ['createdAt', 'fullName', 'city', 'status', 'approvedPatientFee', 'approvalDate']),
      populate: [
        { path: 'agent', select: 'agentId fullName assignedRegion' },
        { path: 'preferredProgram', select: 'programCode name' },
      ],
      select: '-bankAccountNumber -panNumber -identityProof -addressProof -medicalRegDoc -cancelledCheque -kycDocuments',
    }),
    Doctor.countDocuments(),
    Doctor.countDocuments({ status: 'approved' }),
    Doctor.countDocuments({ status: { $in: ['submitted', 'under_review'] } }),
    Doctor.countDocuments({ status: 'documents_required' }),
    Doctor.countDocuments({ status: 'suspended' }),
  ]);

  res.json({ items: result.items.map((doctor) => ({ ...doctor, id: doctor.doctorId || doctor._id })), meta: result.meta, summary: { total, approved, pendingApproval, documentsRequired, suspended } });
});

const getDoctorById = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findOne({
    $or: [
      ...(isObjectId(req.params.id) ? [{ _id: req.params.id }] : []),
      { doctorId: req.params.id },
    ],
  })
    .populate('agent', 'agentId fullName assignedRegion mobile')
    .populate('preferredProgram', 'programCode name')
    .lean();

  if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
  if (doctor.bankAccountNumber) doctor.bankAccountNumber = `XXXXXX${doctor.bankAccountNumber.slice(-4)}`;
  if (doctor.panNumber) doctor.panNumber = `XXXXXX${doctor.panNumber.slice(-4)}`;
  delete doctor.identityProof;
  delete doctor.addressProof;
  delete doctor.medicalRegDoc;
  delete doctor.cancelledCheque;

  const [patients, paidPatientIds, wallet, revenue, feeShare, qrScans] = await Promise.all([
    Patient.countDocuments({ referringDoctor: doctor._id }),
    Payment.distinct('patient', { doctor: doctor._id, status: { $in: VERIFIED_PAYMENT_STATUSES } }),
    DoctorWallet.findOne({ doctor: doctor._id }).lean(),
    Payment.aggregate([
      { $match: { doctor: doctor._id, status: { $in: VERIFIED_PAYMENT_STATUSES } } },
      { $group: { _id: null, paid: { $sum: { $ifNull: ['$paidAmount', 0] } }, refunded: { $sum: { $ifNull: ['$refundAmount', 0] } } } },
      { $project: { _id: 0, total: { $max: [{ $subtract: ['$paid', '$refunded'] }, 0] } } },
    ]),
    FeeShare.aggregate([
      { $match: { doctor: doctor._id, status: { $in: ['pending', 'available', 'withdrawn', 'adjusted'] } } },
      { $group: { _id: null, total: { $sum: { $ifNull: ['$amount', 0] } } } },
    ]),
    QrScan.countDocuments({ doctor: doctor._id }),
  ]);

  res.json({
    ...doctor,
    id: doctor.doctorId || doctor._id,
    metrics: {
      qrScans,
      patients,
      paidPatients: paidPatientIds.length,
      revenueGenerated: revenue[0]?.total || 0,
      feeShareGenerated: feeShare[0]?.total || 0,
    },
    wallet,
  });
});

module.exports = { getDoctors, getDoctorById };
