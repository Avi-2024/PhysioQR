const Doctor = require('../../models/Doctor.model');
const { provisionApprovedDoctor, sendDoctorApprovalNotification } = require('../../services/doctorApproval.service');
const { writeAuditLog } = require('../../utils/auditLogger');
const asyncHandler = require('../../utils/asyncHandler');
const { assertSplitTerms, normalizeRevenueConfiguration, isWebsiteDirectDoctor } = require('../../utils/splitModel');
const FEE_SHARE_TYPES = ['percentage', 'fixed', 'slab'];

const REVENUE_MODELS = ['split', 'platform_fee'];

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
  const direct = isWebsiteDirectDoctor(doctor);
  const effectiveModel = revenueModel ?? doctor.revenueModel ?? 'split';
  if (direct) {
    if (effectiveModel !== 'split') return res.status(400).json({ message: 'Website-direct doctors must use the 50:50 Split Model' });
    try { assertSplitTerms(req.body); } catch (error) { return res.status(400).json({ message: error.message }); }
  } else if (feeShareType !== undefined && !FEE_SHARE_TYPES.includes(feeShareType)) {
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

  if (approvedPatientFee !== undefined && approvedPatientFee !== '' && approvedPatientFee !== null) {
    doctor.approvedPatientFee = Number(approvedPatientFee);
  }
  if (feeSharePercentage !== undefined) doctor.feeSharePercentage = feeSharePercentage;
  if (feeShareHoldingDays !== undefined) doctor.feeShareHoldingDays = feeShareHoldingDays;
  if (revenueModel !== undefined) doctor.revenueModel = revenueModel;
  if (feeShareType !== undefined) doctor.feeShareType = feeShareType;
  if (fixedFeeShareAmount !== undefined) doctor.fixedFeeShareAmount = fixedFeeShareAmount;
  if (direct) normalizeRevenueConfiguration(doctor);

  const { temporaryPassword } = await provisionApprovedDoctor({ doctor, password });

  // Dispatch approval notifications with portal credentials to the doctor
  if (temporaryPassword && (doctor.mobile || doctor.email)) {
    sendDoctorApprovalNotification({ doctor, temporaryPassword }).catch((e) => {
      console.error('Doctor approval notification error:', e.message);
    });
  }

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

  const message = doctor.qrCodeActive
    ? 'Doctor approved, login enabled, wallet ready, and QR code active'
    : 'Doctor approved, login enabled, and wallet ready. QR code will activate when patient programme fee is confirmed.';

  res.json({
    message,
    doctor,
    temporaryPassword,
  });
});

module.exports = { approveDoctor };
