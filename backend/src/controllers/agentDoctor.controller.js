const Agent = require('../models/Agent.model');
const Doctor = require('../models/Doctor.model');
const ClinicVisit = require('../models/ClinicVisit.model');
const Patient = require('../models/Patient.model');
const { Payment } = require('../models/Payment.model');
const asyncHandler = require('../utils/asyncHandler');

const VERIFIED_PAYMENT_STATUSES = ['successful', 'manually_verified', 'partially_refunded', 'refunded'];

const getCurrentAgent = async (req) => {
  const agent = await Agent.findOne({ user: req.user._id }).select('_id');
  if (!agent) {
    const error = new Error('Agent profile not found');
    error.status = 404;
    throw error;
  }
  return agent;
};

// GET /api/agents/me/doctors/:doctorId
// Returns only operational onboarding information for a doctor assigned to the
// authenticated agent. Financial, banking, KYC-document, and medical data are
// deliberately excluded from this agent-facing response.
const getMyDoctorById = asyncHandler(async (req, res) => {
  const agent = await getCurrentAgent(req);

  const doctor = await Doctor.findOne({ _id: req.params.doctorId, agent: agent._id })
    .select([
      'doctorId',
      'fullName',
      'mobile',
      'whatsapp',
      'email',
      'gender',
      'dateOfBirth',
      'profilePhoto',
      'qualification',
      'specialization',
      'medicalRegNumber',
      'registrationCouncil',
      'yearsOfExperience',
      'languagesSpoken',
      'clinicName',
      'clinicAddress',
      'city',
      'state',
      'postalCode',
      'clinicContact',
      'clinicEmail',
      'clinicWorkingHours',
      'googleMapsLink',
      'clinicBranches',
      'registrationDate',
      'approvalDate',
      'status',
      'rejectionReason',
      'suspensionReason',
      'referralCode',
      'qrCodeActive',
      'kycStatus',
      'createdAt',
      'updatedAt',
    ].join(' '))
    .lean();

  if (!doctor) return res.status(404).json({ message: 'Doctor not found' });

  const [patientCount, paidPatientIds, recentVisits] = await Promise.all([
    Patient.countDocuments({ referringDoctor: doctor._id }),
    Payment.distinct('patient', {
      doctor: doctor._id,
      status: { $in: VERIFIED_PAYMENT_STATUSES },
    }),
    ClinicVisit.find({ agent: agent._id, doctor: doctor._id })
      .select('visitDate visitTime clinicName clinicLocation outcome doctorInterestLevel followUpDate followUpStatus nextAction')
      .sort({ visitDate: -1, createdAt: -1 })
      .limit(8)
      .lean(),
  ]);

  res.json({
    doctor,
    performance: {
      patientRegistrations: patientCount,
      paidPatients: paidPatientIds.length,
    },
    recentVisits,
  });
});

module.exports = { getMyDoctorById };
