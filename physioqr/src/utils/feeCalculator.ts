export type SplitModelEarnings = {
  patientFee: number;
  doctorSharePercentage: number;
  doctorShareAmount: number;
  platformShareAmount: number;
};

export type PlatformFeeModel = {
  doctorClinicFee: number;
  platformFee: number;
  totalPatientExpense: number;
  doctorShareAmount: number;
  platformShareAmount: number;
};

// Calculates doctor/platform earnings for the split revenue model.
export function calculateSplitModelEarnings(patientFee: unknown, sharePercentage: unknown): SplitModelEarnings {
  const fee = Number(patientFee) || 0;
  const percentage = Number(sharePercentage) || 0;
  const doctorShare = (fee * percentage) / 100;

  return {
    patientFee: fee,
    doctorSharePercentage: percentage,
    doctorShareAmount: doctorShare,
    platformShareAmount: fee - doctorShare,
  };
}

// Calculates platform-fee revenue where clinic fee is collected outside the app.
export function calculatePlatformFeeModel(clinicFee: unknown, platformFee: unknown): PlatformFeeModel {
  const doctorClinicFee = Number(clinicFee) || 0;
  const appPlatformFee = Number(platformFee) || 0;

  return {
    doctorClinicFee,
    platformFee: appPlatformFee,
    totalPatientExpense: doctorClinicFee + appPlatformFee,
    doctorShareAmount: 0,
    platformShareAmount: appPlatformFee,
  };
}
