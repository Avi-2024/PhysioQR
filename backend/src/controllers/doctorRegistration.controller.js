const mongoose = require('mongoose');
const Doctor = require('../models/Doctor.model');
const Agent = require('../models/Agent.model');
const User = require('../models/User.model');
const Program = require('../models/Program.model');
const { provisionApprovedDoctor } = require('../services/doctorApproval.service');
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

const AGENT_REGISTRATION_FIELDS = [
  'fullName',
  'mobile',
  'qualification',
  'specialization',
  'medicalRegNumber',
  'clinicName',
  'city',
  'preferredProgram',
  'revenueModel',
  'requestedPatientFee',
  'requestedFeeShareType',
  'requestedFeeSharePercentage',
  'requestedFixedFeeShareAmount',
];

const AGENT_REQUIRED_FIELDS = [
  'fullName',
  'mobile',
  'qualification',
  'specialization',
  'medicalRegNumber',
  'clinicName',
  'city',
  'preferredProgram',
  'revenueModel',
  'requestedPatientFee',
  'requestedFeeShareType',
];
const REVENUE_MODELS = ['split', 'platform_fee'];
const REQUESTED_FEE_SHARE_TYPES = ['percentage', 'fixed'];

function pickRegistrationFields(body = {}, fields = REGISTRATION_FIELDS) {
  const payload = {};
  fields.forEach((field) => {
    if (body[field] !== undefined) payload[field] = body[field];
  });
  return payload;
}

function validateAgentRegistration(payload) {
  for (const field of AGENT_REQUIRED_FIELDS) {
    if (payload[field] === undefined || payload[field] === null || String(payload[field]).trim() === '') {
      return `${field} is required`;
    }
  }
  return null;
}

function validateCommercialProposal(payload) {
  if (payload.requestedPatientFee !== undefined) {
    const fee = Number(payload.requestedPatientFee);
    if (!Number.isFinite(fee) || fee < 1 || fee > 100000) return 'Patient price must be between 1 and 100000';
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

const registerDoctorSecure = asyncHandler(async (req, res) => {
  const isAgentRegistration = req.user?.role === 'agent';
  const payload = pickRegistrationFields(
    req.body,
    isAgentRegistration ? AGENT_REGISTRATION_FIELDS : REGISTRATION_FIELDS
  );

  payload.status = isAgentRegistration ? 'under_review' : 'submitted';
  payload.registrationDate = new Date();

  if (payload.email) payload.email = String(payload.email).trim().toLowerCase();
  if (payload.mobile) payload.mobile = String(payload.mobile).trim();
  if (payload.medicalRegNumber) payload.medicalRegNumber = String(payload.medicalRegNumber).trim();

  if (isAgentRegistration) {
    const validationError = validateAgentRegistration(payload);
    if (validationError) return res.status(400).json({ message: validationError });
  }

  if (payload.revenueModel && !REVENUE_MODELS.includes(payload.revenueModel)) {
    return res.status(400).json({ message: 'Payment model must be split or platform_fee' });
  }

  const commercialError = validateCommercialProposal(payload);
  if (commercialError) return res.status(400).json({ message: commercialError });
  applyCommercialProposalDefaults(payload);

  if (payload.preferredProgram) {
    if (!mongoose.isValidObjectId(payload.preferredProgram)) {
      return res.status(400).json({ message: 'Selected rehabilitation programme is invalid' });
    }
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
  let temporaryPassword;

  if (isAgentRegistration) {
    try {
      const provisioned = await provisionApprovedDoctor({ doctor });
      temporaryPassword = provisioned.temporaryPassword;
    } catch (error) {
      await Doctor.deleteOne({ _id: doctor._id, status: { $ne: 'approved' } }).catch(() => {});
      throw error;
    }
  }

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
      requestedPatientFee: doctor.requestedPatientFee,
      requestedFeeShareType: doctor.requestedFeeShareType,
      requestedFeeSharePercentage: doctor.requestedFeeSharePercentage,
      requestedFixedFeeShareAmount: doctor.requestedFixedFeeShareAmount,
      qrCodeActive: doctor.qrCodeActive,
    },
  });

  res.status(201).json({
    ...doctor.toObject(),
    temporaryPassword,
    autoApproved: isAgentRegistration,
  });
});

module.exports = { registerDoctorSecure };
