const Patient = require('../../models/Patient.model');
const { Payment } = require('../../models/Payment.model');
const { writeAuditLog } = require('../../utils/auditLogger');
const asyncHandler = require('../../utils/asyncHandler');

const FINANCIAL_STATUSES = [
  'successful', 'manually_verified', 'partially_refunded', 'refunded',
  'disputed', 'chargeback', 'duplicate_captured',
];

const updateDirectPatientFee = asyncHandler(async (req, res) => {
  const fee = Number(req.body.fee);
  const reason = String(req.body.reason || '').trim();
  if (!Number.isFinite(fee) || fee <= 0) return res.status(400).json({ message: 'Patient fee must be greater than zero' });
  if (!reason) return res.status(400).json({ message: 'Reason is required' });

  const patient = await Patient.findById(req.params.id);
  if (!patient) return res.status(404).json({ message: 'Patient not found' });
  if (patient.referringDoctor) {
    return res.status(409).json({ message: 'This patient is linked to a Doctor. Patient fee is controlled by the referring Doctor.' });
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
