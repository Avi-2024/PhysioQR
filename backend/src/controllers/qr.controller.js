const QrScan = require('../models/QrScan.model');
const Doctor = require('../models/Doctor.model');
const asyncHandler = require('../utils/asyncHandler');

const recordScan = asyncHandler(async (req, res) => {
  const { doctorCode, clinicId, deviceInfo } = req.body;
  if (!doctorCode) return res.status(400).json({ message: 'doctorCode is required' });

  const doctor = await Doctor.findOne({ referralCode: doctorCode });
  if (!doctor) return res.status(404).json({ message: 'Invalid doctor QR code' });
  if (doctor.status !== 'approved') return res.status(403).json({ message: 'Doctor is not approved' });
  if (!doctor.qrCodeActive) return res.status(403).json({ message: 'This QR code is inactive' });

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
    doctorCode: doctor.doctorId,
    doctorName: doctor.fullName,
    clinicName: doctor.clinicName,
    revenueModel: doctor.revenueModel,
    approvedPatientFee: doctor.approvedPatientFee,
  });
});

const getHistory = asyncHandler(async (req, res) => {
  const scans = await QrScan.find({ doctor: req.params.doctorId })
    .populate('patient', 'patientId fullName mobile')
    .populate('doctor', 'doctorId fullName clinicName')
    .sort({ createdAt: -1 });
  res.json(scans);
});

module.exports = {
  recordScan,
  getHistory,
};
