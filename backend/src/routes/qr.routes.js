const express = require('express');
const router = express.Router();
const QrScan = require('../models/QrScan.model');
const Doctor = require('../models/Doctor.model');
const asyncHandler = require('../utils/asyncHandler');
const { protect, authorize } = require('../middlewares/auth.middleware');

// POST /api/qr/scan
// Called immediately when patient opens the QR link — before registration (SRS §8.4)
router.post('/scan', asyncHandler(async (req, res) => {
  const { doctorCode, clinicId, deviceInfo } = req.body;

  if (!doctorCode) return res.status(400).json({ message: 'doctorCode is required' });

  const doctor = await Doctor.findOne({ referralCode: doctorCode });
  if (!doctor) return res.status(404).json({ message: 'Invalid doctor QR code' });

  if (!doctor.qrCodeActive) {
    return res.status(403).json({ message: 'This QR code is inactive' });
  }

  // Record the scan even before patient registers (SRS §8.4)
  const scan = await QrScan.create({
    doctor: doctor._id,
    agent: doctor.agent || null,
    clinicId: clinicId || null,
    referralSource: 'qr_code',
    deviceInfo: deviceInfo || req.headers['user-agent'],
    ipAddress: req.ip,
  });

  res.json({
    message: 'QR scan recorded',
    scanId: scan._id,
    doctorId: doctor._id,
    doctorName: doctor.fullName,
    revenueModel: doctor.revenueModel,
    approvedPatientFee: doctor.approvedPatientFee,
  });
}));

// GET /api/qr/history/:doctorId — Admin views QR scan history (SRS §8.3)
router.get('/history/:doctorId', protect, authorize('admin'), asyncHandler(async (req, res) => {
  const scans = await QrScan.find({ doctor: req.params.doctorId })
    .populate('patient', 'fullName mobile')
    .sort({ createdAt: -1 });
  res.json(scans);
}));

module.exports = router;
