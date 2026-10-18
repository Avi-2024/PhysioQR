const AppSetting = require('../models/AppSetting.model');

// Pricing authority for patients who register without a referring doctor.
// Explicit patient-level admin overrides win over the platform default.
// Neither amount nor its source is trusted from patient requests.
const resolveDirectPatientFee = async (patient) => {
  const patientOverride = Number(patient?.directPatientFee);
  if (Number.isFinite(patientOverride) && patientOverride > 0) {
    return { amount: patientOverride, source: 'patient_override' };
  }

  const finance = await AppSetting.findOne({ key: 'finance' }).lean();
  const defaultAmount = Number(finance?.value?.directPatientDefaultFee);
  if (Number.isFinite(defaultAmount) && defaultAmount > 0) {
    return { amount: defaultAmount, source: 'admin_default' };
  }

  return { amount: 0, source: 'not_configured' };
};

module.exports = { resolveDirectPatientFee };
