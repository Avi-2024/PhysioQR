// Fixed 50:50 applies ONLY to doctors who self-register through the public website.
// Existing/agent-referred Split Model doctors keep their approved configurable terms.
const SPLIT_DOCTOR_PERCENTAGE = 50;
const isWebsiteDirectDoctor = (doctor) => doctor?.registrationSource === 'website_direct';

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
  // Neither Agent/Admin agreements nor Platform Fee records should be
  // rewritten merely because an existing doctor document is saved.
  if (!isWebsiteDirectDoctor(doctor)) return doctor;
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

// Settlement uses the order's original terms for Agent/Admin/legacy doctors.
 // For website-direct doctors only, both existing and future orders use fixed 50:50.
const resolveSettlementTerms = (doctor = {}, pricing = {}) => {
  const direct = isWebsiteDirectDoctor(doctor) || pricing.registrationSource === 'website_direct';
  return {
    revenueModel: direct ? 'split' : (pricing.revenueModel || doctor.revenueModel || 'split'),
    feeShareType: direct ? 'percentage' : (pricing.feeShareType || doctor.feeShareType || 'percentage'),
    percentage: direct ? SPLIT_DOCTOR_PERCENTAGE : (pricing.feeSharePercentage ?? doctor.feeSharePercentage ?? 0),
    fixedAmount: direct ? 0 : (pricing.fixedFeeShareAmount ?? doctor.fixedFeeShareAmount ?? 0),
    slabs: direct ? [] : (Array.isArray(pricing.feeShareSlabs) ? pricing.feeShareSlabs : (doctor.feeShareSlabs || [])),
    basis: direct ? 'gross' : (pricing.feeShareCalculationBasis || doctor.feeShareCalculationBasis || 'gross'),
  };
};

module.exports = { SPLIT_DOCTOR_PERCENTAGE, isWebsiteDirectDoctor, assertSplitTerms, normalizeRevenueConfiguration, resolveSettlementTerms };
