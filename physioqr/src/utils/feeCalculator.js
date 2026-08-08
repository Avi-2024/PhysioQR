/**
 * Fee Calculation Utility for PhysioQR
 * Supports Split Model and Platform Fee Model as specified in SRS Section 22
 */

// Calculate earnings for Split Model (SRS Section 22.1)
export function calculateSplitModelEarnings(patientFee, sharePercentage) {
  const fee = Number(patientFee) || 0;
  const percentage = Number(sharePercentage) || 0;

  const doctorShare = (fee * percentage) / 100;
  const platformShare = fee - doctorShare;

  return {
    patientFee: fee,
    doctorSharePercentage: percentage,
    doctorShareAmount: doctorShare,
    platformShareAmount: platformShare,
  };
}

// Calculate details for Platform Fee Model (SRS Section 22.2)
export function calculatePlatformFeeModel(clinicFee, platformFee) {
  const cFee = Number(clinicFee) || 0;
  const pFee = Number(platformFee) || 0;

  return {
    doctorClinicFee: cFee, // Collected directly by doctor (not processed in app)
    platformFee: pFee,     // Paid online through PhysioQR
    totalPatientExpense: cFee + pFee,
    doctorShareAmount: 0,  // Doctor receives 0 share from the online platform fee
    platformShareAmount: pFee,
  };
}
