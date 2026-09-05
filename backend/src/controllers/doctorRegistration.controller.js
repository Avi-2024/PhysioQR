const Doctor = require('../models/Doctor.model');
const Agent = require('../models/Agent.model');
const Program = require('../models/Program.model');
const { writeAuditLog } = require('../utils/auditLogger');
const asyncHandler = require('../utils/asyncHandler');

const REGISTRATION_FIELDS = [
  'fullName', 'mobile', 'whatsapp', 'email', 'gender', 'dateOfBirth', 'profilePhoto',
  'qualification', 'specialization', 'medicalRegNumber', 'registrationCouncil',
  'yearsOfExperience', 'languagesSpoken', 'consultationFee', 'clinicName',
  'clinicAddress', 'city', 'state', 'postalCode', 'clinicContact', 'clinicEmail',
  'clinicWorkingHours', 'googleMapsLink', 'clinicBranches', 'requestedPatientFee',
  'preferredProgram', 'revenueModel',
];
const REVENUE_MODELS = ['split', 'platform_fee'];

function pickRegistrationFields(body = {}) {
  const payload = {};
  REGISTRATION_FIELDS.forEach((field) => {
    if (body[field] !== undefined) payload[field] = body[field];
  });
  return payload;
}

const registerDoctorSecure = asyncHandler(async (req, res) => {
  const payload = pickRegistrationFields(req.body);
  payload.status = 'submitted';
  payload.registrationDate = new Date();

  if (payload.email) payload.email = String(payload.email).trim().toLowerCase();
  if (payload.mobile) payload.mobile = String(payload.mobile).trim();
  if (payload.medicalRegNumber) payload.medicalRegNumber = String(payload.medicalRegNumber).trim();

  if (payload.revenueModel && !REVENUE_MODELS.includes(payload.revenueModel)) {
    return res.status(400).json({ message: 'Payment model must be split or platform_fee' });
  }

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
    if (duplicate) {
      return res.status(409).json({
        message: 'A doctor with the same mobile, email, or medical registration number already exists',
      });
    }
  }

  if (req.user?.role === 'agent') {
    const agent = await Agent.findOne({ user: req.user._id }).select('_id status');
    if (!agent) return res.status(404).json({ message: 'Agent profile not found' });
    if (agent.status !== 'active') return res.status(403).json({ message: 'Inactive agent cannot register doctors' });
    payload.agent = agent._id;
  } else if (req.user?.role === 'admin' && req.body.agent) {
    const assignedAgent = await Agent.findById(req.body.agent).select('_id status');
    if (!assignedAgent) return res.status(400).json({ message: 'Assigned agent does not exist' });
    if (assignedAgent.status === 'terminated') return res.status(400).json({ message: 'Cannot assign a doctor to a terminated agent' });
    payload.agent = assignedAgent._id;
  }

  const doctor = await Doctor.create(payload);
  await writeAuditLog({
    req,
    action: 'doctor_registered',
    module: 'Doctor',
    recordId: doctor._id,
    newValue: {
      fullName: doctor.fullName,
      status: doctor.status,
      agent: doctor.agent || null,
      preferredProgram: doctor.preferredProgram || null,
      revenueModel: doctor.revenueModel,
    },
  });

  res.status(201).json(doctor);
});

module.exports = { registerDoctorSecure };
