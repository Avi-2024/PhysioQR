const Patient = require('../../models/Patient.model');
const { Payment } = require('../../models/Payment.model');
const { writeAuditLog } = require('../../utils/auditLogger');
const asyncHandler = require('../../utils/asyncHandler');
const { isWebsiteDirectPatient } = require('../../services/directPatientPricing.service');

const FINANCIAL_STATUSES = [
  'successful', 'manually_verified', 'partially_refunded', 'refunded',
  'disputed', 'chargeback', 'duplicate_captured',
];

const updateDirectPatientFee = asyncHandler(async (req, res) => {
  const fee = Number(req.body.fee);
  const reason = String(req.body.reason || '').trim();
  if (!Number.isFinite(fee) || fee <= 0) return res.status(400).json({ message: 'Patient fee must be greater than zero' });
  if (!reason) return res.status(400).json({ message: 'Reason is required' });

  // Admin patient detail URLs use public IDs (e.g. PT00016), whereas some
  // internal callers use the MongoDB _id. Resolve either exact format safely.
  const identifier = String(req.params.id || '').trim();
  const isMongoId = /^[a-f\d]{24}$/i.test(identifier);
  const isPublicId = /^PT\d{5,}$/.test(identifier);
  if (!isMongoId && !isPublicId) {
    return res.status(400).json({ message: 'Invalid patient ID. Use a PT-number or MongoDB ID.' });
  }
  const patient = await Patient.findOne(isMongoId
    ? { _id: identifier }
    : { patientId: identifier });
  if (!patient) return res.status(404).json({ message: 'Patient not found' });
  if (patient.referringDoctor) {
    return res.status(409).json({ message: 'This patient is linked to a Doctor. Patient fee is controlled by the referring Doctor.' });
  }
  if (isWebsiteDirectPatient(patient)) {
    return res.status(409).json({ message: 'Website direct registration fee is fixed at ₹300 and cannot be overridden.' });
  }

  const paid = await Payment.exists({ patient: patient._id, status: { $in: FINANCIAL_STATUSES } });
  if (paid || patient.referralLocked) {
    return res.status(409).json({ message: 'Patient fee is locked after verified payment or commercial attribution lock' });
  }

  const previousValue = {
    directPatientFee: patient.directPatientFee,
    directPatientFeeSetBy: patient.directPatientFeeSetBy,
    directPatientFeeSetAt: patient.directPatientFeeSetAt,
  };

  patient.directPatientFee = fee;
  patient.directPatientFeeSetBy = req.user._id;
  patient.directPatientFeeSetAt = new Date();
  await patient.save();

  await writeAuditLog({
    req,
    action: 'direct_patient_fee_updated',
    module: 'Patient',
    recordId: patient._id,
    previousValue,
    newValue: {
      directPatientFee: patient.directPatientFee,
      directPatientFeeSetBy: patient.directPatientFeeSetBy,
      directPatientFeeSetAt: patient.directPatientFeeSetAt,
      feeAuthority: 'admin',
    },
    reason,
  });

  res.json({
    message: 'Direct patient fee updated',
    patientId: patient._id,
    fee: patient.directPatientFee,
    feeAuthority: 'admin',
    feeLocked: false,
  });
});

module.exports = { updateDirectPatientFee };
