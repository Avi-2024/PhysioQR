const Doctor = require('../../models/Doctor.model');
const { provisionApprovedDoctor } = require('../../services/doctorApproval.service');
const { writeAuditLog } = require('../../utils/auditLogger');
const asyncHandler = require('../../utils/asyncHandler');

const REVENUE_MODELS = ['split', 'platform_fee'];
const FEE_SHARE_TYPES = ['percentage', 'fixed', 'slab'];

// POST /api/doctors/:id/approve
// Admin remains the authority for detailed pricing and fee-share configuration.
// Account/QR/wallet provisioning is shared with Agent auto-approval.
const approveDoctor = asyncHandler(async (req, res) => {
  const {
    approvedPatientFee,
    feeSharePercentage,
    feeShareHoldingDays,
    revenueModel,
    feeShareType,
    fixedFeeShareAmount,
    password,
  } = req.body;

  const doctor = await Doctor.findById(req.params.id);
  if (!doctor) return res.status(404).json({ message: 'Doctor not found' });

  if (revenueModel !== undefined && !REVENUE_MODELS.includes(revenueModel)) {
    return res.status(400).json({ message: 'Payment model must be split or platform_fee' });
  }
  if (feeShareType !== undefined && !FEE_SHARE_TYPES.includes(feeShareType)) {
    return res.status(400).json({ message: 'Fee share type must be percentage, fixed, or slab' });
  }

  const previousValue = {
    status: doctor.status,
    approvedPatientFee: doctor.approvedPatientFee,
    revenueModel: doctor.revenueModel,
    feeShareType: doctor.feeShareType,
    feeSharePercentage: doctor.feeSharePercentage,
    fixedFeeShareAmount: doctor.fixedFeeShareAmount,
    feeShareHoldingDays: doctor.feeShareHoldingDays,
  };

  if (approvedPatientFee !== undefined) doctor.approvedPatientFee = approvedPatientFee;
  if (feeSharePercentage !== undefined) doctor.feeSharePercentage = feeSharePercentage;
  if (feeShareHoldingDays !== undefined) doctor.feeShareHoldingDays = feeShareHoldingDays;
  if (revenueModel !== undefined) doctor.revenueModel = revenueModel;
  if (feeShareType !== undefined) doctor.feeShareType = feeShareType;
  if (fixedFeeShareAmount !== undefined) doctor.fixedFeeShareAmount = fixedFeeShareAmount;

  const { temporaryPassword } = await provisionApprovedDoctor({ doctor, password });

  await writeAuditLog({
    req,
    action: 'doctor_approved',
    module: 'Doctor',
    recordId: doctor._id,
    previousValue,
    newValue: {
      status: doctor.status,
      approvedPatientFee: doctor.approvedPatientFee,
      revenueModel: doctor.revenueModel,
      feeShareType: doctor.feeShareType,
      feeSharePercentage: doctor.feeSharePercentage,
      fixedFeeShareAmount: doctor.fixedFeeShareAmount,
      feeShareHoldingDays: doctor.feeShareHoldingDays,
      qrCodeActive: doctor.qrCodeActive,
    },
  });

  res.json({
    message: 'Doctor approved, login enabled, wallet ready, and QR code active',
    doctor,
    temporaryPassword,
  });
});

module.exports = { approveDoctor };
