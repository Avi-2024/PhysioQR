const AppSetting = require('../models/AppSetting.model');

const WEBSITE_DIRECT_REGISTRATION_FEE = 300;
const isWebsiteDirectPatient = (patient) => patient?.referralSource === 'direct' && !patient?.referringDoctor;

// Pricing authority for patients who register without a referring doctor.
// Explicit patient-level admin overrides win over the platform default.
// Neither amount nor its source is trusted from patient requests.
const resolveDirectPatientFee = async (patient) => {
  // A patient who registers through the public website (without a Doctor QR)
  // always pays ₹300, regardless of legacy Admin default or individual fee.
  // Other non-doctor cohorts retain the existing Admin pricing behavior.
  if (isWebsiteDirectPatient(patient)) {
    return { amount: WEBSITE_DIRECT_REGISTRATION_FEE, source: 'website_direct_fixed' };
  }
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

module.exports = { resolveDirectPatientFee, isWebsiteDirectPatient, WEBSITE_DIRECT_REGISTRATION_FEE };
