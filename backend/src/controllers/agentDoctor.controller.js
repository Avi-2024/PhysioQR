const mongoose = require('mongoose');
const Agent = require('../models/Agent.model');
const Doctor = require('../models/Doctor.model');
const User = require('../models/User.model');
const Program = require('../models/Program.model');
const ClinicVisit = require('../models/ClinicVisit.model');
const Patient = require('../models/Patient.model');
const { Payment } = require('../models/Payment.model');
const { uploadDoctorKycDocument } = require('../services/storage.service');
const { provisionApprovedDoctor } = require('../services/doctorApproval.service');
const { writeAuditLog } = require('../utils/auditLogger');
const asyncHandler = require('../utils/asyncHandler');

const VERIFIED_PAYMENT_STATUSES = ['successful', 'manually_verified', 'partially_refunded', 'refunded'];
const AGENT_UPLOAD_DOCUMENT_TYPES = ['identity_proof', 'address_proof', 'medical_registration', 'profile_photo', 'other'];
const AGENT_EDITABLE_DOCTOR_FIELDS = [
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
const REVENUE_MODELS = ['split', 'platform_fee'];
const REQUESTED_FEE_SHARE_TYPES = ['percentage', 'fixed'];

const AGENT_DOCTOR_LIST_FIELDS = [
  'doctorId','fullName','mobile','qualification','specialization','medicalRegNumber',
  'clinicName','city','preferredProgram','revenueModel','registrationDate','approvalDate',
  'status','rejectionReason','suspensionReason','referralCode','qrCodeActive','kycStatus','createdAt','updatedAt',
].join(' ');

const AGENT_DOCTOR_DETAIL_FIELDS = [
  AGENT_DOCTOR_LIST_FIELDS,
  'qrCodeUrl',
  'requestedPatientFee','requestedFeeShareType','requestedFeeSharePercentage','requestedFixedFeeShareAmount',
  'approvedPatientFee','feeShareType','feeSharePercentage','fixedFeeShareAmount',
].join(' ');

const getCurrentAgent = async (req) => {
  const agent = await Agent.findOne({ user: req.user._id }).select('_id status');
  if (!agent) {
    const error = new Error('Agent profile not found');
    error.status = 404;
    throw error;
  }
  return agent;
};

const buildReferralUrl = (doctor) => {
  if (!doctor?.doctorId) return null;
  const appUrl = process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
  return `${appUrl.replace(/\/$/, '')}/register?doctor=${doctor.doctorId}`;
};

const pickEditableDoctorFields = (body = {}) => {
  const updates = {};
  AGENT_EDITABLE_DOCTOR_FIELDS.forEach((field) => {
    if (body[field] !== undefined) updates[field] = body[field];
  });
  return updates;
};

const normalizeDoctorUpdates = (updates) => {
  const stringFields = [
    'fullName',
    'mobile',
    'qualification',
    'specialization',
    'medicalRegNumber',
    'clinicName',
    'city',
    'preferredProgram',
    'revenueModel',
    'requestedFeeShareType',
  ];
  stringFields.forEach((field) => {
    if (updates[field] !== undefined) updates[field] = String(updates[field]).trim();
  });
  return updates;
};

const validateCommercialUpdates = (doctor, updates) => {
  if (updates.requestedPatientFee !== undefined) {
    const fee = Number(updates.requestedPatientFee);
    if (!Number.isFinite(fee) || fee < 1 || fee > 100000) {
      const error = new Error('Patient price must be between 1 and 100000');
      error.status = 400;
      throw error;
    }
    updates.requestedPatientFee = fee;
  }

  const effectiveRevenueModel = updates.revenueModel || doctor.revenueModel || 'split';

  if (effectiveRevenueModel === 'platform_fee') {
    // No doctor fee share exists in Platform Fee mode. Remove any stale values
    // supplied by an old client before applying the update.
    delete updates.requestedFeeShareType;
    delete updates.requestedFeeSharePercentage;
    delete updates.requestedFixedFeeShareAmount;
    return;
  }

  const hasCommissionInput = updates.requestedFeeShareType !== undefined
    || updates.requestedFeeSharePercentage !== undefined
    || updates.requestedFixedFeeShareAmount !== undefined;

  if (updates.revenueModel === 'split' && doctor.revenueModel !== 'split' && !updates.requestedFeeShareType) {
    const error = new Error('Commission type is required when switching to Split Model');
    error.status = 400;
    throw error;
  }

  if (hasCommissionInput && !updates.requestedFeeShareType) {
    const error = new Error('Commission type is required when updating Split Model commission');
    error.status = 400;
    throw error;
  }

  if (updates.requestedFeeShareType !== undefined && !REQUESTED_FEE_SHARE_TYPES.includes(updates.requestedFeeShareType)) {
    const error = new Error('Commission type must be percentage or fixed');
    error.status = 400;
    throw error;
  }

  if (updates.requestedFeeShareType === 'percentage') {
    const percentage = Number(updates.requestedFeeSharePercentage);
    if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
      const error = new Error('Commission percentage must be between 0 and 100');
      error.status = 400;
      throw error;
    }
    updates.requestedFeeSharePercentage = percentage;
    delete updates.requestedFixedFeeShareAmount;
  }

  if (updates.requestedFeeShareType === 'fixed') {
    const amount = Number(updates.requestedFixedFeeShareAmount);
    if (!Number.isFinite(amount) || amount < 0 || amount > 100000) {
      const error = new Error('Fixed commission must be between 0 and 100000');
      error.status = 400;
      throw error;
    }
    const patientPrice = updates.requestedPatientFee ?? doctor.requestedPatientFee ?? doctor.approvedPatientFee;
    if (Number.isFinite(Number(patientPrice)) && amount > Number(patientPrice)) {
      const error = new Error('Fixed commission cannot exceed the patient price');
      error.status = 400;
      throw error;
    }
    updates.requestedFixedFeeShareAmount = amount;
    delete updates.requestedFeeSharePercentage;
  }
};

const commercialTermsChanged = (doctor, updates) => {
  if (updates.revenueModel !== undefined && updates.revenueModel !== doctor.revenueModel) return true;
  if (updates.requestedPatientFee !== undefined) {
    const current = doctor.requestedPatientFee ?? doctor.approvedPatientFee;
    if (Number(updates.requestedPatientFee) !== Number(current)) return true;
  }
  if (updates.requestedFeeShareType !== undefined) {
    const currentType = doctor.requestedFeeShareType || doctor.feeShareType;
    if (updates.requestedFeeShareType !== currentType) return true;
    if (updates.requestedFeeShareType === 'percentage') {
      const current = doctor.requestedFeeSharePercentage ?? doctor.feeSharePercentage;
      if (Number(updates.requestedFeeSharePercentage) !== Number(current)) return true;
    }
    if (updates.requestedFeeShareType === 'fixed') {
      const current = doctor.requestedFixedFeeShareAmount ?? doctor.fixedFeeShareAmount;
      if (Number(updates.requestedFixedFeeShareAmount) !== Number(current)) return true;
    }
  }
  return false;
};

const applyCommercialUpdates = (doctor, updates) => {
  if (updates.requestedPatientFee !== undefined) {
    doctor.requestedPatientFee = updates.requestedPatientFee;
    doctor.approvedPatientFee = updates.requestedPatientFee;
  }

  if (doctor.revenueModel === 'platform_fee') {
    doctor.requestedFeeShareType = undefined;
    doctor.requestedFeeSharePercentage = undefined;
    doctor.requestedFixedFeeShareAmount = undefined;
    doctor.feeShareType = 'percentage';
    doctor.feeSharePercentage = 0;
    doctor.fixedFeeShareAmount = undefined;
    return;
  }

  if (updates.requestedFeeShareType === 'percentage') {
    doctor.requestedFeeShareType = 'percentage';
    doctor.requestedFeeSharePercentage = updates.requestedFeeSharePercentage;
    doctor.requestedFixedFeeShareAmount = undefined;
    doctor.feeShareType = 'percentage';
    doctor.feeSharePercentage = updates.requestedFeeSharePercentage;
    doctor.fixedFeeShareAmount = undefined;
  }
  if (updates.requestedFeeShareType === 'fixed') {
    doctor.requestedFeeShareType = 'fixed';
    doctor.requestedFixedFeeShareAmount = updates.requestedFixedFeeShareAmount;
    doctor.requestedFeeSharePercentage = undefined;
    doctor.feeShareType = 'fixed';
    doctor.fixedFeeShareAmount = updates.requestedFixedFeeShareAmount;
    doctor.feeSharePercentage = undefined;
  }
};

const validateDoctorUpdates = async ({ doctor, updates }) => {
  for (const [field, value] of Object.entries(updates)) {
    if (value === '') {
      const error = new Error(`${field} cannot be empty`);
      error.status = 400;
      throw error;
    }
  }

  if (updates.mobile !== undefined && !/^[6-9]\d{9}$/.test(updates.mobile)) {
    const error = new Error('Enter a valid 10-digit mobile number');
    error.status = 400;
    throw error;
  }

  if (updates.revenueModel !== undefined && !REVENUE_MODELS.includes(updates.revenueModel)) {
    const error = new Error('Payment model must be split or platform_fee');
    error.status = 400;
    throw error;
  }

  validateCommercialUpdates(doctor, updates);

  if (updates.preferredProgram !== undefined) {
    if (!mongoose.isValidObjectId(updates.preferredProgram)) {
      const error = new Error('Selected rehabilitation programme is invalid');
      error.status = 400;
      throw error;
    }
    const program = await Program.findOne({ _id: updates.preferredProgram, isActive: true }).select('_id').lean();
    if (!program) {
      const error = new Error('Selected rehabilitation programme is unavailable or inactive');
      error.status = 400;
      throw error;
    }
  }

  const duplicateClauses = [];
  if (updates.mobile !== undefined && updates.mobile !== doctor.mobile) duplicateClauses.push({ mobile: updates.mobile });
  if (updates.medicalRegNumber !== undefined && updates.medicalRegNumber !== doctor.medicalRegNumber) {
    duplicateClauses.push({ medicalRegNumber: updates.medicalRegNumber });
  }

  if (duplicateClauses.length) {
    const duplicateDoctor = await Doctor.findOne({ _id: { $ne: doctor._id }, $or: duplicateClauses })
      .select('_id doctorId mobile medicalRegNumber')
      .lean();
    if (duplicateDoctor) {
      const error = new Error('Another doctor already uses this mobile or medical registration number');
      error.status = 409;
      throw error;
    }
  }

  if (updates.mobile !== undefined && updates.mobile !== doctor.mobile) {
    const userFilter = { mobile: updates.mobile };
    if (doctor.user) userFilter._id = { $ne: doctor.user };
    const duplicateUser = await User.findOne(userFilter).select('_id role').lean();
    if (duplicateUser) {
      const error = new Error('This mobile number is already used by another login account');
      error.status = 409;
      throw error;
    }
  }

  if (commercialTermsChanged(doctor, updates)) {
    const hasVerifiedPayment = await Payment.exists({
      doctor: doctor._id,
      status: { $in: VERIFIED_PAYMENT_STATUSES },
    });
    if (hasVerifiedPayment) {
      const error = new Error('Commercial terms cannot be changed by Agent after a verified patient payment. Contact Admin.');
      error.status = 409;
      throw error;
    }
  }
};

const getMyDoctors = asyncHandler(async (req, res) => {
  const agent = await getCurrentAgent(req);
  const doctors = await Doctor.find({ agent: agent._id })
    .select(AGENT_DOCTOR_LIST_FIELDS)
    .populate('preferredProgram', 'programCode name durationDays')
    .sort({ createdAt: -1 })
    .lean();
  res.json(doctors);
});

const getMyDoctorById = asyncHandler(async (req, res) => {
  const agent = await getCurrentAgent(req);
  if (!mongoose.isValidObjectId(req.params.doctorId)) return res.status(404).json({ message: 'Doctor not found' });

  const doctor = await Doctor.findOne({ _id: req.params.doctorId, agent: agent._id })
    .select(AGENT_DOCTOR_DETAIL_FIELDS)
    .populate('preferredProgram', 'programCode name durationDays')
    .lean();

  if (!doctor) return res.status(404).json({ message: 'Doctor not found' });

  const [patientCount, paidPatientIds, recentVisits] = await Promise.all([
    Patient.countDocuments({ referringDoctor: doctor._id }),
    Payment.distinct('patient', { doctor: doctor._id, status: { $in: VERIFIED_PAYMENT_STATUSES } }),
    ClinicVisit.find({ agent: agent._id, doctor: doctor._id })
      .select('visitDate visitTime clinicName clinicLocation outcome doctorInterestLevel followUpDate followUpStatus nextAction')
      .sort({ visitDate: -1, createdAt: -1 })
      .limit(8)
      .lean(),
  ]);

  res.json({
    doctor,
    referralUrl: doctor.qrCodeActive ? buildReferralUrl(doctor) : null,
    performance: { patientRegistrations: patientCount, paidPatients: paidPatientIds.length },
    recentVisits,
  });
});

const updateMyDoctor = asyncHandler(async (req, res) => {
  const agent = await getCurrentAgent(req);
  if (agent.status !== 'active') return res.status(403).json({ message: 'Inactive agent cannot edit doctors' });
  if (!mongoose.isValidObjectId(req.params.doctorId)) return res.status(404).json({ message: 'Doctor not found' });

  const doctor = await Doctor.findOne({ _id: req.params.doctorId, agent: agent._id });
  if (!doctor) return res.status(404).json({ message: 'Doctor not found' });

  const updates = normalizeDoctorUpdates(pickEditableDoctorFields(req.body));
  if (!Object.keys(updates).length) return res.status(400).json({ message: 'No editable doctor fields were provided' });

  await validateDoctorUpdates({ doctor, updates });

  const previousValue = {};
  Object.keys(updates).forEach((field) => {
    previousValue[field] = doctor[field];
  });
  if (commercialTermsChanged(doctor, updates)) {
    previousValue.requestedFeeShareType = doctor.requestedFeeShareType;
    previousValue.requestedFeeSharePercentage = doctor.requestedFeeSharePercentage;
    previousValue.requestedFixedFeeShareAmount = doctor.requestedFixedFeeShareAmount;
    previousValue.approvedPatientFee = doctor.approvedPatientFee;
    previousValue.feeShareType = doctor.feeShareType;
    previousValue.feeSharePercentage = doctor.feeSharePercentage;
    previousValue.fixedFeeShareAmount = doctor.fixedFeeShareAmount;
  }

  const mobileChanged = updates.mobile !== undefined && updates.mobile !== doctor.mobile;
  const loginUser = mobileChanged && doctor.user ? await User.findById(doctor.user) : null;
  const previousLoginMobile = loginUser?.mobile;
  const previousTokenVersion = loginUser?.tokenVersion;

  const simpleUpdates = { ...updates };
  delete simpleUpdates.requestedPatientFee;
  delete simpleUpdates.requestedFeeShareType;
  delete simpleUpdates.requestedFeeSharePercentage;
  delete simpleUpdates.requestedFixedFeeShareAmount;
  Object.assign(doctor, simpleUpdates);
  applyCommercialUpdates(doctor, updates);
  await doctor.save();

  try {
    if (loginUser) {
      loginUser.mobile = updates.mobile;
      loginUser.tokenVersion = (loginUser.tokenVersion || 0) + 1;
      await loginUser.save();
    }
  } catch (error) {
    Object.assign(doctor, previousValue);
    await doctor.save().catch(() => {});
    if (loginUser) {
      loginUser.mobile = previousLoginMobile;
      loginUser.tokenVersion = previousTokenVersion;
      await loginUser.save().catch(() => {});
    }
    throw error;
  }

  await writeAuditLog({
    req,
    action: 'doctor_profile_updated_by_agent',
    module: 'Doctor',
    recordId: doctor._id,
    previousValue,
    newValue: {
      ...updates,
      approvedPatientFee: doctor.approvedPatientFee,
      feeShareType: doctor.feeShareType,
      feeSharePercentage: doctor.feeSharePercentage,
      fixedFeeShareAmount: doctor.fixedFeeShareAmount,
    },
  });

  const safeDoctor = await Doctor.findOne({ _id: doctor._id, agent: agent._id })
    .select(AGENT_DOCTOR_DETAIL_FIELDS)
    .populate('preferredProgram', 'programCode name durationDays')
    .lean();

  res.json({
    message: mobileChanged
      ? 'Doctor updated. Login mobile changed and existing doctor sessions were revoked.'
      : 'Doctor updated successfully.',
    doctor: safeDoctor,
    referralUrl: safeDoctor?.qrCodeActive ? buildReferralUrl(safeDoctor) : null,
  });
});

const completeLegacyMyDoctorActivation = asyncHandler(async (req, res) => {
  const agent = await getCurrentAgent(req);
  if (agent.status !== 'active') return res.status(403).json({ message: 'Inactive agent cannot activate doctors' });
  if (!mongoose.isValidObjectId(req.params.doctorId)) return res.status(404).json({ message: 'Doctor not found' });

  const doctor = await Doctor.findOne({ _id: req.params.doctorId, agent: agent._id });
  if (!doctor) return res.status(404).json({ message: 'Doctor not found' });

  if (doctor.status !== 'submitted') {
    return res.status(400).json({ message: 'Only legacy submitted Agent doctors can complete automatic activation' });
  }

  const previousValue = {
    status: doctor.status,
    approvalDate: doctor.approvalDate,
    qrCodeActive: doctor.qrCodeActive,
  };

  const { temporaryPassword, referralUrl } = await provisionApprovedDoctor({ doctor });

  await writeAuditLog({
    req,
    action: 'legacy_agent_doctor_auto_approval_completed',
    module: 'Doctor',
    recordId: doctor._id,
    previousValue,
    newValue: {
      status: doctor.status,
      approvalDate: doctor.approvalDate,
      qrCodeActive: doctor.qrCodeActive,
    },
  });

  const safeDoctor = await Doctor.findOne({ _id: doctor._id, agent: agent._id })
    .select(AGENT_DOCTOR_DETAIL_FIELDS)
    .populate('preferredProgram', 'programCode name durationDays')
    .lean();

  res.json({
    message: 'Doctor activated and referral QR generated',
    doctor: safeDoctor,
    referralUrl,
    temporaryPassword,
  });
});

const uploadMyDoctorDocument = asyncHandler(async (req, res) => {
  const agent = await getCurrentAgent(req);
  if (agent.status !== 'active') return res.status(403).json({ message: 'Inactive agent cannot upload doctor documents' });
  const documentType = String(req.body.documentType || '');
  if (!AGENT_UPLOAD_DOCUMENT_TYPES.includes(documentType)) {
    return res.status(400).json({ message: `documentType must be one of: ${AGENT_UPLOAD_DOCUMENT_TYPES.join(', ')}` });
  }
  if (!req.file) return res.status(400).json({ message: 'document file is required' });
  if (!mongoose.isValidObjectId(req.params.doctorId)) return res.status(404).json({ message: 'Doctor not found' });

  const doctor = await Doctor.findOne({ _id: req.params.doctorId, agent: agent._id });
  if (!doctor) return res.status(404).json({ message: 'Doctor not found' });

  const metadata = await uploadDoctorKycDocument({ doctor, documentType, file: req.file });
  metadata.uploadedBy = req.user._id;
  doctor.kycDocuments.push(metadata);
  if (doctor.kycStatus !== 'approved') doctor.kycStatus = 'submitted';
  if (documentType === 'identity_proof') doctor.identityProof = metadata.key;
  if (documentType === 'address_proof') doctor.addressProof = metadata.key;
  if (documentType === 'medical_registration') doctor.medicalRegDoc = metadata.key;
  if (documentType === 'profile_photo') doctor.profilePhoto = metadata.key;
  await doctor.save();

  await writeAuditLog({
    req,
    action: 'doctor_document_uploaded_by_agent',
    module: 'Doctor',
    recordId: doctor._id,
    newValue: { documentType, storageProvider: metadata.storageProvider, agent: agent._id },
  });

  res.status(201).json({
    message: 'Doctor document uploaded',
    document: {
      id: metadata._id,
      documentType,
      originalName: metadata.originalName,
      uploadedAt: metadata.uploadedAt,
    },
  });
});

module.exports = { getMyDoctors, getMyDoctorById, updateMyDoctor, completeLegacyMyDoctorActivation, uploadMyDoctorDocument };
