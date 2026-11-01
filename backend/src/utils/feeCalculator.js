/**
 * SRS §27 — Fee Share Calculation
 * Supports: percentage, fixed, slab-based
 * SRS §28 — Calculation basis: gross, after_discount, net_after_charges
 */

/**
 * Get the eligible amount based on calculation basis.
 */
const getEligibleAmount = (paidAmount, discountAmount = 0, gatewayCharges = 0, basis = 'gross') => {
  if (basis === 'after_discount') return paidAmount - discountAmount;
  if (basis === 'net_after_charges') return paidAmount - gatewayCharges;
  return paidAmount; // gross (default)
};

/**
 * Percentage-based fee share (SRS §27.1)
 */
const calculatePercentageFeeShare = (paidAmount, discountAmount, gatewayCharges, percentage, basis) => {
  const eligibleAmount = getEligibleAmount(paidAmount, discountAmount, gatewayCharges, basis);
  const doctorShare = parseFloat(((eligibleAmount * percentage) / 100).toFixed(2));
  const platformShare = parseFloat((eligibleAmount - doctorShare).toFixed(2));
  return { doctorShare, platformShare, eligibleAmount };
};

/**
 * Fixed fee share (SRS §27.2)
 */
const calculateFixedFeeShare = (paidAmount, discountAmount, gatewayCharges, fixedAmount, basis) => {
  const eligibleAmount = getEligibleAmount(paidAmount, discountAmount, gatewayCharges, basis);
  const doctorShare = Math.min(fixedAmount, eligibleAmount); // can't exceed eligible amount
  const platformShare = parseFloat((eligibleAmount - doctorShare).toFixed(2));
  return { doctorShare, platformShare, eligibleAmount };
};

/**
 * Slab-based fee share (SRS §27.3)
 * slabs: [{ minPatients, maxPatients, percentage }]
 * totalPaidPatients: total paid patients for this doctor so far (including current)
 */
const calculateSlabFeeShare = (paidAmount, discountAmount, gatewayCharges, slabs, totalPaidPatients, basis) => {
  const eligibleAmount = getEligibleAmount(paidAmount, discountAmount, gatewayCharges, basis);

  // Find the slab that matches the current patient count
  const slab = slabs.find(s =>
    totalPaidPatients >= s.minPatients &&
    (s.maxPatients === null || totalPaidPatients <= s.maxPatients)
  );

  const percentage = slab ? slab.percentage : 0;
  const doctorShare = parseFloat(((eligibleAmount * percentage) / 100).toFixed(2));
  const platformShare = parseFloat((eligibleAmount - doctorShare).toFixed(2));
  return { doctorShare, platformShare, eligibleAmount, appliedPercentage: percentage };
};

/**
 * Main entry point — picks the right calculation method based on doctor config.
 * @param {object} config
 * @param {number} config.paidAmount
 * @param {number} config.discountAmount
 * @param {number} config.gatewayCharges
 * @param {string} config.feeShareType - 'percentage' | 'fixed' | 'slab'
 * @param {number} config.percentage - for percentage type
 * @param {number} config.fixedAmount - for fixed type
 * @param {Array}  config.slabs - for slab type
 * @param {number} config.totalPaidPatients - for slab type
 * @param {string} config.basis - 'gross' | 'after_discount' | 'net_after_charges'
 * @param {string} config.revenueModel - 'split' | 'platform_fee'
 */
const calculateFeeShare = (config) => {
  const {
    paidAmount, discountAmount = 0, gatewayCharges = 0,
    feeShareType = 'percentage', percentage = 0, fixedAmount = 0,
    slabs = [], totalPaidPatients = 1,
    basis = 'gross', revenueModel = 'split',
  } = config;

  // Platform Fee Model — doctor gets no fee share (SRS §22.2)
  if (revenueModel === 'platform_fee') {
    return { doctorShare: 0, platformShare: paidAmount, eligibleAmount: paidAmount };
  }

  if (feeShareType === 'fixed') {
    return calculateFixedFeeShare(paidAmount, discountAmount, gatewayCharges, fixedAmount, basis);
  }
  if (feeShareType === 'slab') {
    return calculateSlabFeeShare(paidAmount, discountAmount, gatewayCharges, slabs, totalPaidPatients, basis);
  }
  return calculatePercentageFeeShare(paidAmount, discountAmount, gatewayCharges, percentage, basis);
};

module.exports = { calculateFeeShare, getEligibleAmount };
