const Patient = require('../models/Patient.model');
const Doctor = require('../models/Doctor.model');
const QrScan = require('../models/QrScan.model');
const PatientProgram = require('../models/PatientProgram.model');
const ProgramProgress = require('../models/ProgramProgress.model');
const PatientAssessment = require('../models/PatientAssessment.model');
const { Order, Payment } = require('../models/Payment.model');
const Program = require('../models/Program.model');
const { writeAuditLog } = require('../utils/auditLogger');
const asyncHandler = require('../utils/asyncHandler');

// POST /api/patients/register
const registerPatient = asyncHandler(async (req, res) => {
  const { doctorCode, scanId, fullName, mobile, ...rest } = req.body;
  if (!fullName || !mobile) return res.status(400).json({ message: 'fullName and mobile are required' });

  let referringDoctor = null;
  if (doctorCode) {
    referringDoctor = await Doctor.findOne({ referralCode: doctorCode, qrCodeActive: true });
    if (!referringDoctor) return res.status(400).json({ message: 'Invalid or inactive doctor QR code' });
  }

  const existing = await Patient.findOne({ mobile });
  if (existing) {
    if (existing.referralLocked) {
      return res.status(400).json({ message: 'Mobile number already registered with a completed payment', patientId: existing._id });
    }
    if (referringDoctor && existing.referringDoctor?.toString() !== referringDoctor._id.toString()) {
      const prevDoctor = existing.referringDoctor;
      existing.referringDoctor = referringDoctor._id;
      existing.referralSource = 'qr_code';
      await existing.save();
      await writeAuditLog({ req, action: 'patient_referral_changed', module: 'Patient', recordId: existing._id, previousValue: { referringDoctor: prevDoctor }, newValue: { referringDoctor: referringDoctor._id }, reason: 'Unpaid patient scanned a different doctor QR code' });
    }
    if (referringDoctor && scanId) await QrScan.findOneAndUpdate({ _id: scanId, doctor: referringDoctor._id }, { patient: existing._id, registrationDate: new Date() });
    return res.json({ message: 'Patient already registered, referral updated', patientId: existing._id, patient: existing, doctor: referringDoctor ? { id: referringDoctor._id, doctorId: referringDoctor.doctorId, fullName: referringDoctor.fullName, clinicName: referringDoctor.clinicName } : null });
  }

  const patient = await Patient.create({ fullName, mobile, referringDoctor: referringDoctor?._id || null, referralSource: doctorCode ? 'qr_code' : 'direct', ...rest });
  if (referringDoctor) {
    if (scanId) await QrScan.findOneAndUpdate({ _id: scanId, doctor: referringDoctor._id }, { patient: patient._id, registrationDate: new Date() });
    else await QrScan.create({ doctor: referringDoctor._id, agent: referringDoctor.agent || null, patient: patient._id, referralSource: 'qr_code', registrationDate: new Date(), ipAddress: req.ip });
  }
  res.status(201).json({ message: 'Registration successful', patientId: patient._id, patient, doctor: referringDoctor ? { id: referringDoctor._id, doctorId: referringDoctor.doctorId, fullName: referringDoctor.fullName, clinicName: referringDoctor.clinicName } : null });
});

const verifyPatientMobile = asyncHandler(async (req, res) => {
  res.status(410).json({ message: 'Legacy mobile verification is disabled. Use /api/auth/send-otp and /api/auth/verify-otp.' });
});

const recordConsent = asyncHandler(async (req, res) => {
  const PatientConsent = require('../models/PatientConsent.model');
  const SystemSettings = require('../models/SystemSettings.model');
  const patientId = req.user._id;
  const settings = await SystemSettings.findOne();
  const consent = await PatientConsent.create({ ...req.body, patient: patientId, consentVersion: settings?.consentVersion || 'v1.0', ipAddress: req.ip, deviceInfo: req.headers['user-agent'] });
  await Patient.findByIdAndUpdate(patientId, { consentAccepted: true, consentVersion: consent.consentVersion, consentDate: new Date() });
  res.status(201).json({ message: 'Consent recorded', consent });
});

// GET /api/patients/me/onboarding-status
// DB-backed source of truth used to resume patient onboarding after refresh/re-login.
const getOnboardingStatus = asyncHandler(async (req, res) => {
  const patientId = req.user._id;
  const [patient, assessment, patientProgram, verifiedPayment] = await Promise.all([
    Patient.findById(patientId).select('patientId fullName mobile mobileVerified consentAccepted referringDoctor referralLocked status').lean(),
    PatientAssessment.findOne({ patient: patientId }).sort({ createdAt: -1 }).select('_id painCategory hasRedFlag status createdAt').populate('painCategory', 'name').lean(),
    PatientProgram.findOne({ patient: patientId }).sort({ createdAt: -1 }).select('_id program status payment startDate expiryDate').lean(),
    Payment.findOne({ patient: patientId, status: { $in: ['successful', 'manually_verified', 'partially_refunded', 'refunded'] }, duplicateOf: { $exists: false } }).sort({ verifiedAt: -1, createdAt: -1 }).select('_id status verifiedAt').lean(),
  ]);
  if (!patient) return res.status(404).json({ message: 'Patient not found' });

  const assessmentCompleted = Boolean(assessment);
  const reviewPending = assessment?.status === 'pending_review';
  const reviewBlocked = assessment?.status === 'blocked';
  const assessmentCleared = assessmentCompleted && !reviewPending && !reviewBlocked;
  const paymentCompleted = Boolean(verifiedPayment);
  const programActivated = patientProgram?.status === 'active';

  let nextStep = 1;
  let nextAction = 'basic_details';
  if (patient.mobileVerified) { nextStep = 3; nextAction = 'consent'; }
  if (patient.mobileVerified && patient.consentAccepted) { nextStep = 4; nextAction = 'assessment'; }
  if (assessmentCompleted) { nextStep = 5; nextAction = reviewPending ? 'risk_review' : reviewBlocked ? 'assessment_blocked' : 'programme'; }
  if (assessmentCleared && !paymentCompleted) { nextStep = 5; nextAction = 'programme'; }
  if (assessmentCleared && patientProgram?.status === 'pending_payment') { nextStep = 6; nextAction = 'payment'; }
  if (paymentCompleted && !programActivated) { nextStep = 6; nextAction = 'activation_pending'; }
  if (programActivated) { nextStep = 6; nextAction = 'dashboard'; }

  res.json({
    patient: { id: patient._id, patientId: patient.patientId, fullName: patient.fullName, mobile: patient.mobile, status: patient.status },
    registered: true,
    mobileVerified: Boolean(patient.mobileVerified),
    consentCompleted: Boolean(patient.consentAccepted),
    assessmentCompleted,
    assessment: assessment || null,
    reviewPending,
    reviewBlocked,
    paymentCompleted,
    payment: verifiedPayment || null,
    programActivated,
    program: patientProgram || null,
    referralLocked: Boolean(patient.referralLocked),
    nextStep,
    nextAction,
  });
});

const getOnboardingQuote = asyncHandler(async (req, res) => {
  const { painCategoryId } = req.query;
  const patient = await Patient.findById(req.user._id).populate('referringDoctor', 'doctorId fullName clinicName status qrCodeActive approvedPatientFee revenueModel');
  if (!patient) return res.status(404).json({ message: 'Patient not found' });
  if (!patient.referringDoctor) return res.status(400).json({ message: 'Patient is not linked to a referring doctor' });
  if (patient.referringDoctor.status !== 'approved' || !patient.referringDoctor.qrCodeActive) return res.status(400).json({ message: 'Referring doctor is not active for new program payments' });

  const programFilter = { isActive: true };
  if (painCategoryId) programFilter.painCategory = painCategoryId;
  let program = await Program.findOne(programFilter).populate('painCategory', 'name').sort({ createdAt: -1 });
  if (!program && painCategoryId) program = await Program.findOne({ isActive: true }).populate('painCategory', 'name').sort({ createdAt: -1 });
  if (!program) return res.status(404).json({ message: 'No active rehabilitation program is available' });

  const amount = patient.referringDoctor.approvedPatientFee || program.defaultPrice || 0;
  if (amount <= 0) return res.status(400).json({ message: 'Program price is not configured for this doctor' });
  res.json({ patient: { id: patient._id, patientId: patient.patientId, fullName: patient.fullName, mobile: patient.mobile, mobileVerified: patient.mobileVerified, consentAccepted: patient.consentAccepted }, doctor: { id: patient.referringDoctor._id, doctorId: patient.referringDoctor.doctorId, fullName: patient.referringDoctor.fullName, clinicName: patient.referringDoctor.clinicName, revenueModel: patient.referringDoctor.revenueModel }, program: { id: program._id, programCode: program.programCode, name: program.name, description: program.description, difficultyLevel: program.difficultyLevel, durationDays: program.durationDays, sessionsPerDay: program.sessionsPerDay, painCategory: program.painCategory }, pricing: { originalAmount: amount, discountAmount: 0, taxAmount: 0, finalAmount: amount, currency: 'INR' } });
});

const getMyProgram = asyncHandler(async (req, res) => {
  const program = await PatientProgram.findOne({ patient: req.user._id, status: 'active' }).populate('program').populate('doctor', 'fullName clinicName');
  res.json(program);
});
const getMyProgress = asyncHandler(async (req, res) => res.json(await ProgramProgress.find({ patient: req.user._id }).sort({ dayNumber: 1 })));
const getMyPayments = asyncHandler(async (req, res) => res.json(await Payment.find({ patient: req.user._id }).populate('program', 'name')));

module.exports = { registerPatient, verifyPatientMobile, recordConsent, getOnboardingStatus, getOnboardingQuote, getMyProgram, getMyProgress, getMyPayments };
