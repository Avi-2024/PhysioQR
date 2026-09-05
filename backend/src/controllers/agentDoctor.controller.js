const Agent = require('../models/Agent.model');
const Doctor = require('../models/Doctor.model');
const ClinicVisit = require('../models/ClinicVisit.model');
const Patient = require('../models/Patient.model');
const { Payment } = require('../models/Payment.model');
const { uploadDoctorKycDocument } = require('../services/storage.service');
const { writeAuditLog } = require('../utils/auditLogger');
const asyncHandler = require('../utils/asyncHandler');

const VERIFIED_PAYMENT_STATUSES = ['successful', 'manually_verified', 'partially_refunded', 'refunded'];
const AGENT_UPLOAD_DOCUMENT_TYPES = ['identity_proof', 'address_proof', 'medical_registration', 'profile_photo', 'other'];
const AGENT_DOCTOR_FIELDS = [
  'doctorId','fullName','mobile','whatsapp','email','gender','dateOfBirth','profilePhoto',
  'qualification','specialization','medicalRegNumber','registrationCouncil','yearsOfExperience','languagesSpoken',
  'clinicName','clinicAddress','city','state','postalCode','clinicContact','clinicEmail','clinicWorkingHours','googleMapsLink','clinicBranches',
  'preferredProgram','revenueModel','requestedPatientFee','requestedFeeShareType','requestedFeeSharePercentage','requestedFixedFeeShareAmount',
  'registrationDate','approvalDate','status','rejectionReason','suspensionReason','referralCode','qrCodeActive','kycStatus','createdAt','updatedAt',
].join(' ');

const getCurrentAgent = async (req) => {
  const agent = await Agent.findOne({ user: req.user._id }).select('_id status');
  if (!agent) { const error = new Error('Agent profile not found'); error.status = 404; throw error; }
  return agent;
};

const getMyDoctors = asyncHandler(async (req, res) => {
  const agent = await getCurrentAgent(req);
  const doctors = await Doctor.find({ agent: agent._id })
    .select(AGENT_DOCTOR_FIELDS)
    .populate('preferredProgram', 'programCode name')
    .sort({ createdAt: -1 })
    .lean();
  res.json(doctors);
});

const getMyDoctorById = asyncHandler(async (req, res) => {
  const agent = await getCurrentAgent(req);
  const doctor = await Doctor.findOne({ _id: req.params.doctorId, agent: agent._id })
    .select(AGENT_DOCTOR_FIELDS)
    .populate('preferredProgram', 'programCode name')
    .lean();
  if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
  const [patientCount, paidPatientIds, recentVisits] = await Promise.all([
    Patient.countDocuments({ referringDoctor: doctor._id }),
    Payment.distinct('patient', { doctor: doctor._id, status: { $in: VERIFIED_PAYMENT_STATUSES } }),
    ClinicVisit.find({ agent: agent._id, doctor: doctor._id })
      .select('visitDate visitTime clinicName clinicLocation outcome doctorInterestLevel followUpDate followUpStatus nextAction')
      .sort({ visitDate: -1, createdAt: -1 }).limit(8).lean(),
  ]);
  res.json({ doctor, performance: { patientRegistrations: patientCount, paidPatients: paidPatientIds.length }, recentVisits });
});

// Agents may collect non-financial onboarding documents only for doctors assigned
// to them. PAN/cancelled-cheque/bank documents remain Doctor/Admin-only.
const uploadMyDoctorDocument = asyncHandler(async (req, res) => {
  const agent = await getCurrentAgent(req);
  if (agent.status !== 'active') return res.status(403).json({ message: 'Inactive agent cannot upload doctor documents' });
  const documentType = String(req.body.documentType || '');
  if (!AGENT_UPLOAD_DOCUMENT_TYPES.includes(documentType)) {
    return res.status(400).json({ message: `documentType must be one of: ${AGENT_UPLOAD_DOCUMENT_TYPES.join(', ')}` });
  }
  if (!req.file) return res.status(400).json({ message: 'document file is required' });

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

  res.status(201).json({ message: 'Doctor document uploaded', document: { id: metadata._id, documentType, originalName: metadata.originalName, uploadedAt: metadata.uploadedAt } });
});

module.exports = { getMyDoctors, getMyDoctorById, uploadMyDoctorDocument };
