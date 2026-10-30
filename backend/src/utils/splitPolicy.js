// Business rule: every new verified Split Model patient payment is shared 50:50.
// No per-doctor percentage, fixed/slab, or fee basis may override it.
const DOCTOR_SPLIT_PERCENT = 50;
const PHYSIOQR_SPLIT_PERCENT = 50;

const applyFixedSplitConfiguration = (doctor) => {
  if (!doctor || (doctor.revenueModel && doctor.revenueModel !== 'split')) return doctor;
  doctor.feeShareType = 'percentage';
  doctor.feeSharePercentage = DOCTOR_SPLIT_PERCENT;
  doctor.feeShareCalculationBasis = 'gross';
  doctor.requestedFeeShareType = 'percentage';
  doctor.requestedFeeSharePercentage = DOCTOR_SPLIT_PERCENT;
  doctor.fixedFeeShareAmount = undefined;
  doctor.requestedFixedFeeShareAmount = undefined;
  doctor.feeShareSlabs = [];
  return doctor;
};

const splitPaidAmount = (paidAmount) => {
  const amount = Number(paidAmount);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new RangeError('Split payment amount must be a non-negative finite number');
  }
  // Integer paise avoid floating-point drift. The odd paisa is allocated to
  // the doctor (round-half-up); platform gets the exact remaining paise.
  const paise = Math.round((amount + Number.EPSILON) * 100);
  const doctorPaise = Math.round(paise / 2);
  return {
    doctorShare: doctorPaise / 100,
    platformShare: (paise - doctorPaise) / 100,
    eligibleAmount: paise / 100,
    appliedPercentage: DOCTOR_SPLIT_PERCENT,
  };
};

module.exports = {
  DOCTOR_SPLIT_PERCENT,
  PHYSIOQR_SPLIT_PERCENT,
  applyFixedSplitConfiguration,
  splitPaidAmount,
};
