const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth.middleware');
const { DoctorWallet, WalletTransaction } = require('../models/Wallet.model');
const Doctor = require('../models/Doctor.model');
const asyncHandler = require('../utils/asyncHandler');

router.use(protect);

// ⚠️ Static routes before dynamic /:doctorId

// Doctor views their wallet
router.get('/me', authorize('doctor'), asyncHandler(async (req, res) => {
  const doctor = await Doctor.findOne({ user: req.user._id });
  if (!doctor) return res.status(404).json({ message: 'Doctor profile not found' });

  const wallet = await DoctorWallet.findOne({ doctor: doctor._id });
  if (!wallet) return res.status(404).json({ message: 'Wallet not found' });

  res.json(wallet);
}));

// Doctor views wallet transactions (ledger)
router.get('/me/transactions', authorize('doctor'), asyncHandler(async (req, res) => {
  const doctor = await Doctor.findOne({ user: req.user._id });
  if (!doctor) return res.status(404).json({ message: 'Doctor profile not found' });

  const transactions = await WalletTransaction.find({ doctor: doctor._id }).sort({ createdAt: -1 });
  res.json(transactions);
}));

// Admin views any doctor's wallet
router.get('/:doctorId', authorize('admin'), asyncHandler(async (req, res) => {
  const wallet = await DoctorWallet.findOne({ doctor: req.params.doctorId });
  if (!wallet) return res.status(404).json({ message: 'Wallet not found' });
  res.json(wallet);
}));

module.exports = router;
