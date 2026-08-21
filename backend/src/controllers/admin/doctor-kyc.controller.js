const Doctor = require('../../models/Doctor.model');
const { writeAuditLog } = require('../../utils/auditLogger');
const fraudService = require('../../services/fraud.service');
const asyncHandler = require('../../utils/asyncHandler');

const ALLOWED_KYC_STATUSES = new Set(['pending', 'submitted', 'approved', 'rejected']);
const ALLOWED_FIELDS = [
  'kycStatus',
  'panNumber',
  'identityProof',
  'addressProof',
  'medicalRegDoc',
  'cancelledCheque',
  'bankAccountHolder',
  'bankAccountNumber',
  'bankName',
  'branchName',
  'ifscCode',
  'upiId',
  'bankVerified',
];

const cleanString = (value) => (typeof value === 'string' ? value.trim() : value);

const maskAccount = (value) => {
  if (!value) return undefined;
  const raw = String(value);
  return `XXXXXX${raw.slice(-4)}`;
};

const updateDoctorKycAndBank = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(req.params.id);
  if (!doctor) return res.status(404).json({ message: 'Doctor not found' });

  const updates = {};
  ALLOWED_FIELDS.forEach((key) => {
    if (req.body[key] !== undefined) updates[key] = cleanString(req.body[key]);
  });

  if (updates.kycStatus && !ALLOWED_KYC_STATUSES.has(updates.kycStatus)) {
    return res.status(400).json({ message: 'Invalid KYC status' });
  }

  if (updates.bankVerified !== undefined && typeof updates.bankVerified !== 'boolean') {
    return res.status(400).json({ message: 'bankVerified must be true or false' });
  }

  const nextBankVerified = updates.bankVerified ?? doctor.bankVerified;
  if (nextBankVerified) {
    const accountHolder = updates.bankAccountHolder ?? doctor.bankAccountHolder;
    const accountNumber = updates.bankAccountNumber ?? doctor.bankAccountNumber;
    const bankName = updates.bankName ?? doctor.bankName;
    const ifscCode = updates.ifscCode ?? doctor.ifscCode;

    const missing = [
      ['account holder', accountHolder],
      ['account number', accountNumber],
      ['bank name', bankName],
      ['IFSC', ifscCode],
    ].filter(([, value]) => !String(value || '').trim()).map(([label]) => label);

    if (missing.length) {
      return res.status(400).json({
        message: `Bank cannot be marked verified until these fields are provided: ${missing.join(', ')}`,
      });
    }
  }

  const previousValue = {};
  Object.keys(updates).forEach((key) => {
    previousValue[key] = key === 'bankAccountNumber' ? maskAccount(doctor[key]) : doctor[key];
    doctor[key] = updates[key];
  });

  await doctor.save();
  await fraudService.evaluateDoctorBankRisk({ doctor });

  await writeAuditLog({
    req,
    action: 'doctor_kyc_bank_updated',
    module: 'Doctor',
    recordId: doctor._id,
    previousValue,
    newValue: {
      ...updates,
      bankAccountNumber: updates.bankAccountNumber ? maskAccount(updates.bankAccountNumber) : undefined,
    },
  });

  const responseDoctor = doctor.toObject();
  if (responseDoctor.bankAccountNumber) responseDoctor.bankAccountNumber = maskAccount(responseDoctor.bankAccountNumber);
  if (responseDoctor.panNumber) responseDoctor.panNumber = `XXXXXX${String(responseDoctor.panNumber).slice(-4)}`;

  res.json({ message: 'Doctor KYC/bank details updated', doctor: responseDoctor });
});

module.exports = { updateDoctorKycAndBank };
