// One-time amount for a newly registered patient's rehabilitation access.
// This is charged when the clinically approved programme is activated, not
// during the initial patient profile / OTP registration steps.
const PATIENT_REGISTRATION_FEE_INR = 300;

// Never silently reuse a Razorpay order created before this fixed-fee policy.
// That order already has a gateway-side amount and cannot be repriced in place.
const isCurrentRegistrationOrder = (order) =>
  order?.currency === 'INR'
  && Number(order?.originalAmount) === PATIENT_REGISTRATION_FEE_INR
  && Number(order?.finalAmount) === PATIENT_REGISTRATION_FEE_INR
  && Number(order?.discountAmount || 0) === 0;

module.exports = { PATIENT_REGISTRATION_FEE_INR, isCurrentRegistrationOrder };
