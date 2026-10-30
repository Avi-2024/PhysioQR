// The Split Model is a product-level 50:50 revenue agreement, not a configurable commission.
const SPLIT_DOCTOR_PERCENTAGE = 50;

const assertSplitTerms = (input = {}) => {
  for (const field of ['requestedFeeShareType', 'feeShareType']) {
    if (input[field] !== undefined && input[field] !== 'percentage') {
      const error = new Error('Split Model only supports a percentage-based 50:50 share');
      error.status = 400;
      throw error;
    }
  }
  for (const field of ['requestedFeeSharePercentage', 'feeSharePercentage']) {
    if (input[field] !== undefined && (input[field] === null || input[field] === '' || Number(input[field]) !== SPLIT_DOCTOR_PERCENTAGE)) {
      const error = new Error('Split Model doctor and PhysioQR shares must each be 50%');
      error.status = 400;
      throw error;
    }
  }
  for (const field of ['requestedFixedFeeShareAmount', 'fixedFeeShareAmount']) {
    if (input[field] !== undefined && input[field] !== null && input[field] !== '' && Number(input[field]) !== 0) {
      const error = new Error('Fixed commissions are not supported under the 50:50 Split Model');
      error.status = 400;
      throw error;
    }
  }
  if (input.feeShareCalculationBasis !== undefined && input.feeShareCalculationBasis !== 'gross') {
    const error = new Error('Split Model shares must be based on the verified payment amount');
    error.status = 400;
    throw error;
  }
  if (Array.isArray(input.feeShareSlabs) && input.feeShareSlabs.length) {
    const error = new Error('Slab commissions are not supported under the 50:50 Split Model');
    error.status = 400;
    throw error;
  }
};

// Normalize existing legacy doctor records when written; settlement enforces this
// separately even for historical orders/doctor records that have not been saved again.
const normalizeRevenueConfiguration = (doctor) => {
  if (doctor.revenueModel === 'platform_fee') {
    doctor.requestedFeeShareType = undefined;
    doctor.requestedFeeSharePercentage = undefined;
    doctor.requestedFixedFeeShareAmount = undefined;
    doctor.feeShareType = 'percentage';
    doctor.feeSharePercentage = 0;
    doctor.fixedFeeShareAmount = undefined;
    doctor.feeShareSlabs = [];
    return doctor;
  }
  doctor.revenueModel = 'split';
  doctor.requestedFeeShareType = 'percentage';
  doctor.requestedFeeSharePercentage = SPLIT_DOCTOR_PERCENTAGE;
  doctor.requestedFixedFeeShareAmount = undefined;
  doctor.feeShareType = 'percentage';
  doctor.feeSharePercentage = SPLIT_DOCTOR_PERCENTAGE;
  doctor.fixedFeeShareAmount = undefined;
  doctor.feeShareSlabs = [];
  doctor.feeShareCalculationBasis = 'gross';
  return doctor;
};

module.exports = { SPLIT_DOCTOR_PERCENTAGE, assertSplitTerms, normalizeRevenueConfiguration };
