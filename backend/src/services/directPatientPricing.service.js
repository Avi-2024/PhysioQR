const { PATIENT_REGISTRATION_FEE_INR } = require('../config/patientRegistrationFee');

// Fixed onboarding fee, independent of legacy admin settings and patient
// overrides. Existing paid records retain their original financial amounts.
const resolveDirectPatientFee = async () => ({
  amount: PATIENT_REGISTRATION_FEE_INR,
  source: 'fixed_registration_fee',
});

module.exports = { resolveDirectPatientFee };
