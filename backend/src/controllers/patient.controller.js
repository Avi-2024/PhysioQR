const Patient = require('../models/Patient.model');
const Doctor = require('../models/Doctor.model');
const QrScan = require('../models/QrScan.model');
const PatientProgram = require('../models/PatientProgram.model');
const ProgramProgress = require('../models/ProgramProgress.model');
const { Order, Payment } = require('../models/Payment.model');
const { writeAuditLog } = require('../utils/auditLogger');
const asyncHandler = require('../utils/asyncHandler');

// POST /api/patients/register
// Patient registers after scanning a doctor's QR code
const registerPatient = asyncHandler(async (req, res) => {
  const { doctorCode, fullName, mobile, ...rest } = req.body;

  if (!fullName || !mobile) {
    return res.status(400).json({ message: 'fullName and mobile are required' });
  }

  // Find the referring doctor first (needed for duplicate check below)
  let referringDoctor = null;
  if (doctorCode) {
    referringDoctor = await Doctor.findOne({ referralCode: doctorCode, qrCodeActive: true });
    if (!referringDoctor) return res.status(400).json({ message: 'Invalid or inactive doctor QR code' });
  }

  // SRS §12 — Duplicate patient handling
  const existing = await Patient.findOne({ mobile });
  if (existing) {
    // If referral is locked (paid), block completely
    if (existing.referralLocked) {
      return res.status(400).json({ message: 'Mobile number already registered with a completed payment', patientId: existing._id });
    }
    // If unpaid, allow referral switch to new doctor (SRS §12 recommended rule)
    if (referringDoctor && existing.referringDoctor?.toString() !== referringDoctor._id.toString()) {
      const prevDoctor = existing.referringDoctor;
      existing.referringDoctor = referringDoctor._id;
      existing.referralSource = 'qr_code';
      await existing.save();
      await writeAuditLog({
        req,
        action: 'patient_referral_changed',
        module: 'Patient',
        recordId: existing._id,
        previousValue: { referringDoctor: prevDoctor },
        newValue: { referringDoctor: referringDoctor._id },
        reason: 'Unpaid patient scanned a different doctor QR code',
      });
    }
    return res.json({ message: 'Patient already registered, referral updated', patientId: existing._id });
  }

  const patient = await Patient.create({
    fullName,
    mobile,
    referringDoctor: referringDoctor?._id || null,
    referralSource: doctorCode ? 'qr_code' : 'direct',
    ...rest,
  });

  // Record the QR scan
  if (referringDoctor) {
    await QrScan.create({
      doctor: referringDoctor._id,
      agent: referringDoctor.agent || null,
      patient: patient._id,
      referralSource: 'qr_code',
      registrationDate: new Date(),
      ipAddress: req.ip,
    });
  }

  res.status(201).json({ message: 'Registration successful', patientId: patient._id });
});

// POST /api/patients/verify-mobile
const verifyPatientMobile = asyncHandler(async (req, res) => {
  const { mobile } = req.body;
  const patient = await Patient.findOneAndUpdate({ mobile }, { mobileVerified: true }, { new: true });
  if (!patient) return res.status(404).json({ message: 'Patient not found' });
  res.json({ message: 'Mobile verified' });
});

// GET /api/patients/me/program
const getMyProgram = asyncHandler(async (req, res) => {
  const program = await PatientProgram.findOne({ patient: req.user._id, status: 'active' })
    .populate('program')
    .populate('doctor', 'fullName clinicName');
  res.json(program);
});

// GET /api/patients/me/progress
const getMyProgress = asyncHandler(async (req, res) => {
  const progress = await ProgramProgress.find({ patient: req.user._id }).sort({ dayNumber: 1 });
  res.json(progress);
});

// GET /api/patients/me/payments
const getMyPayments = asyncHandler(async (req, res) => {
  const payments = await Payment.find({ patient: req.user._id }).populate('program', 'name');
  res.json(payments);
});

module.exports = { registerPatient, verifyPatientMobile, getMyProgram, getMyProgress, getMyPayments };
