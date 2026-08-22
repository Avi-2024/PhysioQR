const mongoose = require('mongoose');
const Payout = require('../../models/Payout.model');
const { WalletTransaction } = require('../../models/Wallet.model');
const { getPagination } = require('../../utils/queryHelpers');
const asyncHandler = require('../../utils/asyncHandler');

const getPayouts = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.method) filter.payoutMethod = req.query.method;
  if (req.query.doctor) filter.doctor = req.query.doctor;

  const search = String(req.query.search || '').trim();
  if (search) {
    const Doctor = require('../../models/Doctor.model');
    const doctorIds = (await Doctor.find({
      $or: [
        { doctorId: { $regex: search, $options: 'i' } },
        { fullName: { $regex: search, $options: 'i' } },
        { clinicName: { $regex: search, $options: 'i' } },
      ],
    }).select('_id').lean()).map((item) => item._id);
    filter.$or = [
      { transactionReference: { $regex: search, $options: 'i' } },
      { doctor: { $in: doctorIds } },
    ];
  }

  const [items, total, summaryRows] = await Promise.all([
    Payout.find(filter)
      .populate('doctor', 'doctorId fullName clinicName kycStatus bankVerified')
      .populate('withdrawalRequest', 'requestedAmount status payoutTransactionRef createdAt')
      .populate('processedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Payout.countDocuments(filter),
    Payout.aggregate([{ $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$amount' } } }]),
  ]);

  const byStatus = Object.fromEntries(summaryRows.map((row) => [row._id, row]));
  res.json({
    items,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    summary: {
      total: summaryRows.reduce((sum, row) => sum + row.count, 0),
      processing: byStatus.processing?.count || 0,
      completed: byStatus.completed?.count || 0,
      failed: byStatus.failed?.count || 0,
      reversed: byStatus.reversed?.count || 0,
      completedAmount: byStatus.completed?.amount || 0,
    },
  });
});

const getPayoutById = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid payout id' });

  const payout = await Payout.findById(req.params.id)
    .populate('doctor', 'doctorId fullName clinicName mobile email kycStatus bankVerified bankAccountHolder bankName bankAccountNumber ifscCode upiId')
    .populate('withdrawalRequest')
    .populate('processedBy', 'name email')
    .lean();
  if (!payout) return res.status(404).json({ message: 'Payout not found' });

  const account = payout.doctor?.bankAccountNumber;
  if (account) payout.doctor.bankAccountNumber = `•••• ${String(account).slice(-4)}`;

  const ledger = await WalletTransaction.find({
    doctor: payout.doctor?._id || payout.doctor,
    type: { $in: ['withdrawal_approved', 'payout_completed', 'payout_failed'] },
  }).sort({ createdAt: -1 }).limit(20).lean();

  res.json({
    payout,
    ledger,
    integrity: {
      withdrawalApproved: ['approved', 'processing', 'paid'].includes(payout.withdrawalRequest?.status),
      doctorReady: payout.doctor?.kycStatus === 'approved' && Boolean(payout.doctor?.bankVerified),
      transactionReferencePresent: Boolean(payout.transactionReference),
      terminal: ['completed', 'failed', 'reversed'].includes(payout.status),
    },
  });
});

module.exports = { getPayouts, getPayoutById };
