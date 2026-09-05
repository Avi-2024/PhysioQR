const QRCode = require('qrcode');
const Doctor = require('../models/Doctor.model');
const Agent = require('../models/Agent.model');
const User = require('../models/User.model');
const Program = require('../models/Program.model');
const { DoctorWallet } = require('../models/Wallet.model');
const { writeAuditLog } = require('../utils/auditLogger');
const asyncHandler = require('../utils/asyncHandler');

const REGISTRATION_FIELDS = [
  'fullName', 'mobile', 'whatsapp', 'email', 'gender', 'dateOfBirth', 'profilePhoto',
  'qualification', 'specialization', 'medicalRegNumber', 'registrationCouncil',
  'yearsOfExperience', 'languagesSpoken', 'consultationFee', 'clinicName',
  'clinicAddress', 'city', 'state', 'postalCode', 'clinicContact', 'clinicEmail',
  'clinicWorkingHours', 'googleMapsLink', 'clinicBranches', 'requestedPatientFee',
  'preferredProgram', 'revenueModel', 'requestedFeeShareType',
  'requestedFeeSharePercentage', 'requestedFixedFeeShareAmount',
];
const REVENUE_MODELS = ['split', 'platform_fee'];
const REQUESTED_FEE_SHARE_TYPES = ['percentage', 'fixed'];

function pickRegistrationFields(body = {}) {
  const payload = {};
  REGISTRATION_FIELDS.forEach((field) => {
    if (body[field] !== undefined) payload[field] = body[field];
  });
  return payload;
}

function validateCommercialProposal(payload) {
  if (payload.requestedPatientFee !== undefined) {
    const fee = Number(payload.requestedPatientFee);
    if (!Number.isFinite(fee) || fee < 0 || fee > 100000) return 'Patient price must be between 0 and 100000';
    payload.requestedPatientFee = fee;
  }

  if (payload.requestedFeeShareType && !REQUESTED_FEE_SHARE_TYPES.includes(payload.requestedFeeShareType)) {
    return 'Commission type must be percentage or fixed';
  }

  if (payload.requestedFeeShareType === 'percentage') {
    const percentage = Number(payload.requestedFeeSharePercentage);
    if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) return 'Commission percentage must be between 0 and 100';
    payload.requestedFeeSharePercentage = percentage;
    delete payload.requestedFixedFeeShareAmount;
  }

  if (payload.requestedFeeShareType === 'fixed') {
    const amount = Number(payload.requestedFixedFeeShareAmount);
    if (!Number.isFinite(amount) || amount < 0 || amount > 100000) return 'Fixed commission must be between 0 and 100000';
    if (payload.requestedPatientFee !== undefined && amount > payload.requestedPatientFee) return 'Fixed commission cannot exceed the patient price';
    payload.requestedFixedFeeShareAmount = amount;
    delete payload.requestedFeeSharePercentage;
  }

  return null;
}

// Agent-selected commercial terms become the initial active configuration.
// Admin remains able to change them later from the Doctor workflow.
function applyCommercialProposalDefaults(payload) {
  if (payload.requestedPatientFee !== undefined) payload.approvedPatientFee = payload.requestedPatientFee;
  if (payload.requestedFeeShareType === 'percentage') {
    payload.feeShareType = 'percentage';
    payload.feeSharePercentage = payload.requestedFeeSharePercentage;
    delete payload.fixedFeeShareAmount;
  }
  if (payload.requestedFeeShareType === 'fixed') {
    payload.feeShareType = 'fixed';
    payload.fixedFeeShareAmount = payload.requestedFixedFeeShareAmount;
    delete payload.feeSharePercentage;
  }
}

function loginIdentifierFilter(payload) {
  const clauses = [];
  if (payload.email) clauses.push({ email: payload.email });
  if (payload.mobile) clauses.push({ mobile: payload.mobile });
  return clauses.length ? { $or: clauses } : null;
}

async function activateAgentRegisteredDoctor({ doctor }) {
  const appUrl = process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
  const referralUrl = `${appUrl.replace(/\/$/, '')}/register?doctor=${doctor.doctorId}`;
  const qrCodeUrl = await QRCode.toDataURL(referralUrl);
  const generatedPassword = `Doctor@${Math.floor(100000 + Math.random() * 900000)}`;
  let loginUser = null;

  try {
    loginUser = await User.create({
      role: 'doctor',
      email: doctor.email || undefined,
      mobile: doctor.mobile,
      password: generatedPassword,
      status: 'active',
      mustChangePassword: true,
    });

    doctor.status = 'approved';
    doctor.approvalDate = new Date();
    doctor.user = loginUser._id;
    doctor.referralCode = doctor.doctorId;
    doctor.qrCodeUrl = qrCodeUrl;
    doctor.qrCodeActive = true;
    await doctor.save();

    loginUser.profileRef = doctor._id;
    loginUser.profileModel = 'Doctor';
    await loginUser.save();

    await DoctorWallet.findOneAndUpdate(
      { doctor: doctor._id },
      { $setOnInsert: { doctor: doctor._id } },
      { upsert: true, new: true }
    );

    return generatedPassword;
  } catch (error) {
    if (loginUser?._id) await User.deleteOne({ _id: loginUser._id }).catch(() => {});
    doctor.status = 'under_review';
    doctor.approvalDate = undefined;
    doctor.user = undefined;
    doctor.referralCode = undefined;
    doctor.qrCodeUrl = undefined;
    doctor.qrCodeActive = false;
    await doctor.save().catch(() => {});
    throw error;
  }
}

const registerDoctorSecure = asyncHandler(async (req, res) => {
  const payload = pickRegistrationFields(req.body);
  const isAgentRegistration = req.user?.role === 'agent';
  // Agent registrations are activated in the same request. Until provisioning
  // succeeds, keep the persisted record non-approved to avoid partial state.
  payload.status = isAgentRegistration ? 'under_review' : 'submitted';
  payload.registrationDate = new Date();

  if (payload.email) payload.email = String(payload.email).trim().toLowerCase();
  if (payload.mobile) payload.mobile = String(payload.mobile).trim();
  if (payload.medicalRegNumber) payload.medicalRegNumber = String(payload.medicalRegNumber).trim();

  if (payload.revenueModel && !REVENUE_MODELS.includes(payload.revenueModel)) {
    return res.status(400).json({ message: 'Payment model must be split or platform_fee' });
  }

  const commercialError = validateCommercialProposal(payload);
  if (commercialError) return res.status(400).json({ message: commercialError });
  applyCommercialProposalDefaults(payload);

  if (payload.preferredProgram) {
    const program = await Program.findOne({ _id: payload.preferredProgram, isActive: true }).select('_id').lean();
    if (!program) return res.status(400).json({ message: 'Selected rehabilitation programme is unavailable or inactive' });
  }

  const duplicateClauses = [];
  if (payload.mobile) duplicateClauses.push({ mobile: payload.mobile });
  if (payload.email) duplicateClauses.push({ email: payload.email });
  if (payload.medicalRegNumber) duplicateClauses.push({ medicalRegNumber: payload.medicalRegNumber });

  if (duplicateClauses.length) {
    const duplicate = await Doctor.findOne({ $or: duplicateClauses })
      .select('_id doctorId fullName mobile email medicalRegNumber')
      .lean();
    if (duplicate) return res.status(409).json({ message: 'A doctor with the same mobile, email, or medical registration number already exists' });
  }

  if (isAgentRegistration) {
    const agent = await Agent.findOne({ user: req.user._id }).select('_id status');
    if (!agent) return res.status(404).json({ message: 'Agent profile not found' });
    if (agent.status !== 'active') return res.status(403).json({ message: 'Inactive agent cannot register doctors' });
    payload.agent = agent._id;

    const identifierFilter = loginIdentifierFilter(payload);
    if (identifierFilter && await User.exists(identifierFilter)) {
      return res.status(409).json({ message: 'Doctor login mobile or email is already used by another account' });
    }
  } else if (req.user?.role === 'admin' && req.body.agent) {
    const assignedAgent = await Agent.findById(req.body.agent).select('_id status');
    if (!assignedAgent) return res.status(400).json({ message: 'Assigned agent does not exist' });
    if (assignedAgent.status === 'terminated') return res.status(400).json({ message: 'Cannot assign a doctor to a terminated agent' });
    payload.agent = assignedAgent._id;
  }

  const doctor = await Doctor.create(payload);
  const temporaryPassword = isAgentRegistration ? await activateAgentRegisteredDoctor({ doctor }) : undefined;

  await writeAuditLog({
    req,
    action: isAgentRegistration ? 'doctor_registered_auto_approved' : 'doctor_registered',
    module: 'Doctor',
    recordId: doctor._id,
    newValue: {
      fullName: doctor.fullName,
      status: doctor.status,
      agent: doctor.agent || null,
      preferredProgram: doctor.preferredProgram || null,
      revenueModel: doctor.revenueModel,
      approvedPatientFee: doctor.approvedPatientFee,
      feeShareType: doctor.feeShareType,
      feeSharePercentage: doctor.feeSharePercentage,
      fixedFeeShareAmount: doctor.fixedFeeShareAmount,
      qrCodeActive: doctor.qrCodeActive,
    },
  });

  res.status(201).json({ ...doctor.toObject(), temporaryPassword, autoApproved: isAgentRegistration });
});

module.exports = { registerDoctorSecure };
