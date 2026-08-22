const { DoctorWallet, WalletTransaction } = require('../../models/Wallet.model');
const Doctor = require('../../models/Doctor.model');
const { getPagination, buildSearchFilter } = require('../../utils/queryHelpers');
const asyncHandler = require('../../utils/asyncHandler');

const getWallets = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const doctorFilter = req.query.search
    ? buildSearchFilter(req.query.search, ['doctorId', 'fullName', 'clinicName', 'city'])
    : {};
  const doctors = req.query.search
    ? await Doctor.find(doctorFilter).select('_id').lean()
    : [];
  const filter = {};
  if (req.query.doctor) filter.doctor = req.query.doctor;
  if (req.query.search) filter.doctor = { $in: doctors.map((doctor) => doctor._id) };

  const [items, total, summary] = await Promise.all([
    DoctorWallet.find(filter)
      .populate('doctor', 'doctorId fullName clinicName city status revenueModel kycStatus bankVerified')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    DoctorWallet.countDocuments(filter),
    DoctorWallet.aggregate([
      { $group: {
        _id: null,
        pendingBalance: { $sum: '$pendingBalance' },
        availableBalance: { $sum: '$availableBalance' },
        withdrawalRequestedAmount: { $sum: '$withdrawalRequestedAmount' },
        paidBalance: { $sum: '$paidBalance' },
        reversedBalance: { $sum: '$reversedBalance' },
        lifetimeEarnings: { $sum: '$lifetimeEarnings' },
        wallets: { $sum: 1 },
      } },
    ]),
  ]);

  res.json({
    items,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    summary: summary[0] || { wallets: 0, pendingBalance: 0, availableBalance: 0, withdrawalRequestedAmount: 0, paidBalance: 0, reversedBalance: 0, lifetimeEarnings: 0 },
  });
});

const getWalletByDoctor = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findOne({
    $or: [
      { _id: req.params.doctorId.match(/^[a-f\d]{24}$/i) ? req.params.doctorId : null },
      { doctorId: req.params.doctorId },
    ],
  }).select('doctorId fullName clinicName city status revenueModel kycStatus bankVerified minWithdrawal maxWithdrawal payoutCycle').lean();
  if (!doctor) return res.status(404).json({ message: 'Doctor not found' });

  const wallet = await DoctorWallet.findOne({ doctor: doctor._id }).lean();
  if (!wallet) return res.status(404).json({ message: 'Wallet not found' });

  const [recentTransactions, transactionCount] = await Promise.all([
    WalletTransaction.find({ wallet: wallet._id })
      .populate('relatedPayment', 'invoiceNumber paidAmount status refundAmount')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean(),
    WalletTransaction.countDocuments({ wallet: wallet._id }),
  ]);

  res.json({ doctor, wallet, recentTransactions, transactionCount });
});

const getWalletLedger = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findOne({
    $or: [
      { _id: req.params.doctorId.match(/^[a-f\d]{24}$/i) ? req.params.doctorId : null },
      { doctorId: req.params.doctorId },
    ],
  }).select('_id doctorId fullName').lean();
  if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
  const wallet = await DoctorWallet.findOne({ doctor: doctor._id }).lean();
  if (!wallet) return res.status(404).json({ message: 'Wallet not found' });

  const { page, limit, skip } = getPagination(req.query);
  const filter = { wallet: wallet._id };
  if (req.query.type) filter.type = req.query.type;
  const [items, total] = await Promise.all([
    WalletTransaction.find(filter)
      .populate('relatedPayment', 'invoiceNumber paidAmount status refundAmount gatewayTransactionId')
      .populate('createdBy', 'email mobile role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    WalletTransaction.countDocuments(filter),
  ]);
  res.json({ items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 }, wallet, doctor });
});

module.exports = { getWallets, getWalletByDoctor, getWalletLedger };
