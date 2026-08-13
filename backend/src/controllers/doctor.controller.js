const QRCode = require('qrcode');
const Doctor = require('../models/Doctor.model');
const User = require('../models/User.model');
const Patient = require('../models/Patient.model');
const { DoctorWallet } = require('../models/Wallet.model');
const { writeAuditLog } = require('../utils/auditLogger');
const asyncHandler = require('../utils/asyncHandler');

// POST /api/doctors — Register a new doctor (by agent or admin)
const registerDoctor = asyncHandler(async (req, res) => {
  const payload = { ...req.body, status: 'submitted' };

  if (req.user?.role === 'agent' && !payload.agent) {
    const Agent = require('../models/Agent.model');
    const agent = await Agent.findOne({ user: req.user._id });
    if (!agent) return res.status(404).json({ message: 'Agent profile not found' });
    payload.agent = agent._id;
  }

  const doctor = await Doctor.create(payload);

  await writeAuditLog({ req, action: 'doctor_registered', module: 'Doctor', recordId: doctor._id, newValue: { fullName: doctor.fullName, status: 'submitted' } });

  res.status(201).json(doctor);
});

// GET /api/doctors
const getAllDoctors = asyncHandler(async (req, res) => {
  const { status, agent } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (agent) filter.agent = agent;
  const doctors = await Doctor.find(filter).populate('agent', 'fullName').sort({ createdAt: -1 });
  res.json(doctors);
});

// GET /api/doctors/:id
const getDoctorById = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(req.params.id).populate('agent').lean();
  if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
  // Mask bank account number before sending response (SRS §5.6)
  if (doctor.bankAccountNumber) {
    doctor.bankAccountNumber = 'XXXXXX' + doctor.bankAccountNumber.slice(-4);
  }
  res.json(doctor);
});

// POST /api/doctors/:id/approve
// SRS §6 — Admin sets fee, fee share %, holding period, then QR is auto-generated
const approveDoctor = asyncHandler(async (req, res) => {
  const { approvedPatientFee, feeSharePercentage, feeShareHoldingDays, revenueModel, feeShareType, fixedFeeShareAmount, password } = req.body;

  const doctor = await Doctor.findById(req.params.id);
  if (!doctor) return res.status(404).json({ message: 'Doctor not found' });

  const prev = { status: doctor.status };

  doctor.status = 'approved';
  doctor.approvalDate = new Date();
  doctor.approvedPatientFee = approvedPatientFee;
  doctor.feeSharePercentage = feeSharePercentage;
  doctor.feeShareHoldingDays = feeShareHoldingDays || 15;
  doctor.revenueModel = revenueModel || 'split';
  if (feeShareType) doctor.feeShareType = feeShareType;
  if (fixedFeeShareAmount) doctor.fixedFeeShareAmount = fixedFeeShareAmount;

  // Auto-generate QR code on approval (SRS §6)
  const referralUrl = `${process.env.APP_URL}/register?doctor=${doctor.doctorId}`;
  const qrCodeDataUrl = await QRCode.toDataURL(referralUrl);
  doctor.referralCode = doctor.doctorId;
  doctor.qrCodeUrl = qrCodeDataUrl;
  doctor.qrCodeActive = true;

  let loginUser = doctor.user ? await User.findById(doctor.user) : null;
  const generatedPassword = password || `Doctor@${Math.floor(100000 + Math.random() * 900000)}`;

  if (!loginUser) {
    const existing = await User.findOne({
      $or: [
        ...(doctor.email ? [{ email: doctor.email.trim().toLowerCase() }] : []),
        ...(doctor.mobile ? [{ mobile: doctor.mobile.trim() }] : []),
      ],
    });
    if (existing) {
      loginUser = existing;
      if (loginUser.role !== 'doctor') return res.status(409).json({ message: 'Email/mobile already belongs to another role' });
    } else {
      loginUser = await User.create({
        role: 'doctor',
        email: doctor.email?.trim().toLowerCase(),
        mobile: doctor.mobile?.trim(),
        password: generatedPassword,
        status: 'active',
      });
    }

    doctor.user = loginUser._id;
  } else {
    loginUser.status = 'active';
  }

  await doctor.save();

  loginUser.profileRef = doctor._id;
  loginUser.profileModel = 'Doctor';
  await loginUser.save();

  await DoctorWallet.findOneAndUpdate(
    { doctor: doctor._id },
    { $setOnInsert: { doctor: doctor._id } },
    { upsert: true, new: true }
  );

  await writeAuditLog({
    req,
    action: 'doctor_approved',
    module: 'Doctor',
    recordId: doctor._id,
    previousValue: prev,
    newValue: { status: 'approved', approvedPatientFee, feeSharePercentage },
  });

  res.json({
    message: 'Doctor approved, login enabled, wallet created, and QR code generated',
    doctor,
    temporaryPassword: doctor.user && password ? undefined : generatedPassword,
  });
});

// POST /api/doctors/:id/reject
const rejectDoctor = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(req.params.id);
  if (!doctor) return res.status(404).json({ message: 'Doctor not found' });

  const prev = { status: doctor.status };
  doctor.status = 'rejected';
  doctor.rejectionReason = req.body.reason;
  await doctor.save();

  await writeAuditLog({ req, action: 'doctor_rejected', module: 'Doctor', recordId: doctor._id, previousValue: prev, newValue: { status: 'rejected', reason: req.body.reason } });

  res.json({ message: 'Doctor rejected', doctor });
});

// POST /api/doctors/:id/suspend
// SRS §7 — QR disabled, new fee shares on hold, withdrawal disabled
const suspendDoctor = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(req.params.id);
  if (!doctor) return res.status(404).json({ message: 'Doctor not found' });

  const prev = { status: doctor.status };
  doctor.status = 'suspended';
  doctor.suspensionReason = req.body.reason;
  doctor.qrCodeActive = false;
  await doctor.save();

  if (doctor.user) await User.findByIdAndUpdate(doctor.user, { status: 'suspended' });

  await writeAuditLog({ req, action: 'doctor_suspended', module: 'Doctor', recordId: doctor._id, previousValue: prev, newValue: { status: 'suspended', reason: req.body.reason } });

  res.json({ message: 'Doctor suspended, QR code disabled', doctor });
});

// POST /api/doctors/:id/qr-code — Regenerate QR code (SRS §8.3)
const generateQrCode = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(req.params.id);
  if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
  if (doctor.status !== 'approved') return res.status(400).json({ message: 'Doctor must be approved first' });

  const referralUrl = `${process.env.APP_URL}/register?doctor=${doctor.doctorId}`;
  const qrCodeDataUrl = await QRCode.toDataURL(referralUrl);

  doctor.referralCode = doctor.doctorId;
  doctor.qrCodeUrl = qrCodeDataUrl;
  doctor.qrCodeActive = true;
  await doctor.save();

  await writeAuditLog({ req, action: 'qr_code_regenerated', module: 'Doctor', recordId: doctor._id });

  res.json({ message: 'QR code generated', qrCodeUrl: qrCodeDataUrl, referralUrl });
});

// POST /api/doctors/:id/disable-qr — Admin disables QR (SRS §8.3)
const disableQrCode = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findByIdAndUpdate(req.params.id, { qrCodeActive: false }, { new: true });
  if (!doctor) return res.status(404).json({ message: 'Doctor not found' });

  await writeAuditLog({ req, action: 'qr_code_disabled', module: 'Doctor', recordId: doctor._id });

  res.json({ message: 'QR code disabled' });
});

const reactivateQrCode = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(req.params.id);
  if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
  if (doctor.status !== 'approved') return res.status(400).json({ message: 'Doctor must be approved to activate QR' });

  doctor.qrCodeActive = true;
  if (!doctor.qrCodeUrl) {
    const referralUrl = `${process.env.APP_URL}/register?doctor=${doctor.doctorId}`;
    doctor.referralCode = doctor.doctorId;
    doctor.qrCodeUrl = await QRCode.toDataURL(referralUrl);
  }
  await doctor.save();

  await writeAuditLog({ req, action: 'qr_code_reactivated', module: 'Doctor', recordId: doctor._id });
  res.json({ message: 'QR code reactivated', doctor });
});

const updateKycAndBank = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(req.params.id);
  if (!doctor) return res.status(404).json({ message: 'Doctor not found' });

  const allowed = [
    'kycStatus', 'panNumber', 'identityProof', 'addressProof', 'medicalRegDoc',
    'cancelledCheque', 'bankAccountHolder', 'bankAccountNumber', 'bankName',
    'branchName', 'ifscCode', 'upiId', 'bankVerified',
  ];
  const updates = {};
  allowed.forEach((key) => {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  });

  const previousValue = {};
  Object.keys(updates).forEach((key) => {
    previousValue[key] = key === 'bankAccountNumber' && doctor[key] ? `XXXXXX${doctor[key].slice(-4)}` : doctor[key];
    doctor[key] = updates[key];
  });
  await doctor.save();

  await writeAuditLog({
    req,
    action: 'doctor_kyc_bank_updated',
    module: 'Doctor',
    recordId: doctor._id,
    previousValue,
    newValue: { ...updates, bankAccountNumber: updates.bankAccountNumber ? `XXXXXX${updates.bankAccountNumber.slice(-4)}` : undefined },
  });

  res.json({ message: 'Doctor KYC/bank details updated', doctor });
});

// GET /api/doctors/me/profile — Doctor views their own profile
const getMyProfile = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findOne({ user: req.user._id }).lean();
  if (!doctor) return res.status(404).json({ message: 'Doctor profile not found' });
  if (doctor.bankAccountNumber) {
    doctor.bankAccountNumber = 'XXXXXX' + doctor.bankAccountNumber.slice(-4);
  }
  res.json(doctor);
});

// PUT /api/doctors/me/profile — Doctor updates their profile
const updateMyProfile = asyncHandler(async (req, res) => {
  // Prevent doctor from changing sensitive fields
  const { status, feeSharePercentage, approvedPatientFee, revenueModel, qrCodeActive, ...allowedUpdates } = req.body;

  const doctor = await Doctor.findOneAndUpdate({ user: req.user._id }, allowedUpdates, { new: true });
  if (!doctor) return res.status(404).json({ message: 'Doctor profile not found' });
  res.json(doctor);
});

// GET /api/doctors/me/patients — Doctor sees only their referred patients (SRS §3.3)
const getMyPatients = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findOne({ user: req.user._id });
  if (!doctor) return res.status(404).json({ message: 'Doctor profile not found' });
  const patients = await Patient.find({ referringDoctor: doctor._id }).select('-consentVersion -consentDate');
  res.json(patients);
});

// GET /api/doctors/me/qr-stats — QR scan count, registration count, conversion (SRS §8.2)
const getMyQrStats = asyncHandler(async (req, res) => {
  const QrScan = require('../models/QrScan.model');
  const doctor = await Doctor.findOne({ user: req.user._id });
  if (!doctor) return res.status(404).json({ message: 'Doctor profile not found' });

  const totalScans = await QrScan.countDocuments({ doctor: doctor._id });
  const totalRegistrations = await QrScan.countDocuments({ doctor: doctor._id, registrationDate: { $exists: true } });
  const totalPaid = await QrScan.countDocuments({ doctor: doctor._id, paymentStatus: 'paid' });

  res.json({
    qrCodeUrl: doctor.qrCodeUrl,
    referralUrl: `${process.env.APP_URL}/register?doctor=${doctor.doctorId}`,
    totalScans,
    totalRegistrations,
    totalPaid,
    conversionRate: totalScans > 0 ? ((totalPaid / totalScans) * 100).toFixed(1) + '%' : '0%',
  });
});

module.exports = {
  registerDoctor, getAllDoctors, getDoctorById,
  approveDoctor, rejectDoctor, suspendDoctor,
  generateQrCode, disableQrCode, reactivateQrCode, updateKycAndBank,
  getMyProfile, updateMyProfile, getMyPatients, getMyQrStats,
};
