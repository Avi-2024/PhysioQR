const { DoctorWallet, WalletTransaction } = require('../models/Wallet.model');
const Doctor = require('../models/Doctor.model');
const asyncHandler = require('../utils/asyncHandler');

const getDoctorByUser = async (userId) => Doctor.findOne({ user: userId });

const getMyWallet = asyncHandler(async (req, res) => {
  const doctor = await getDoctorByUser(req.user._id);
  if (!doctor) return res.status(404).json({ message: 'Doctor profile not found' });

  const wallet = await DoctorWallet.findOne({ doctor: doctor._id });
  if (!wallet) return res.status(404).json({ message: 'Wallet not found' });

  res.json(wallet);
});

const getMyTransactions = asyncHandler(async (req, res) => {
  const doctor = await getDoctorByUser(req.user._id);
  if (!doctor) return res.status(404).json({ message: 'Doctor profile not found' });

  res.json(await WalletTransaction.find({ doctor: doctor._id }).sort({ createdAt: -1 }));
});

const getDoctorWallet = asyncHandler(async (req, res) => {
  const wallet = await DoctorWallet.findOne({ doctor: req.params.doctorId })
    .populate('doctor', 'doctorId fullName clinicName status');
  if (!wallet) return res.status(404).json({ message: 'Wallet not found' });
  res.json(wallet);
});

const getDoctorWalletTransactions = asyncHandler(async (req, res) => {
  const transactions = await WalletTransaction.find({ doctor: req.params.doctorId })
    .populate('relatedPayment', 'invoiceNumber paidAmount status')
    .sort({ createdAt: -1 });
  res.json(transactions);
});

module.exports = {
  getMyWallet,
  getMyTransactions,
  getDoctorWallet,
  getDoctorWalletTransactions,
};
