import type { UserRole, RevenueModel, KycStatus, DoctorStatus } from '@/types';

export const canAccessWallet = (revenueModel: RevenueModel): boolean =>
  revenueModel === 'split_model';

export const canRequestWithdrawal = (
  revenueModel: RevenueModel,
  kycStatus: KycStatus,
  doctorStatus: DoctorStatus,
  availableBalance: number,
  minimumWithdrawal: number
): boolean => {
  return (
    revenueModel === 'split_model' &&
    kycStatus === 'verified' &&
    doctorStatus === 'approved' &&
    availableBalance >= minimumWithdrawal
  );
};

export const canApproveDoctor = (role: UserRole): boolean => role === 'admin';
export const canViewPatientMedicalDetails = (role: UserRole): boolean =>
  role === 'admin' || role === 'doctor';
export const canManagePrograms = (role: UserRole): boolean => role === 'admin';
export const canViewAuditLogs = (role: UserRole): boolean => role === 'admin';

export const getRedirectPathForRole = (role: UserRole): string => {
  const paths: Record<UserRole, string> = {
    admin: '/admin/dashboard',
    agent: '/agent/dashboard',
    doctor: '/doctor/dashboard',
    patient: '/patient/dashboard',
  };
  return paths[role];
};
