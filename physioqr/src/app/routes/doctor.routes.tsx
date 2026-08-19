import React, { lazy } from 'react';
import { Navigate, type RouteObject } from 'react-router-dom';
import { ProtectedRoute, RoleProtectedRoute } from '../route-guards';
import { DoctorLayout } from '@/layouts/DoctorLayout';
import { withSuspense } from './route-utils';

const DoctorDashboardPage = lazy(() => import('@/features/doctors/pages/dashboard/DoctorDashboardPage'));
const DoctorPatientsPage = lazy(() => import('@/features/doctors/pages/patients/DoctorPatientsPage'));
const DoctorQRReferralPage = lazy(() => import('@/features/doctors/pages/referrals/DoctorQRReferralPage'));
const DoctorEarningsPage = lazy(() => import('@/features/doctors/pages/earnings/DoctorEarningsPage'));
const DoctorWalletPage = lazy(() => import('@/features/doctors/pages/wallet/DoctorWalletPage'));
const DoctorWithdrawalsPage = lazy(() => import('@/features/doctors/pages/withdrawals/DoctorWithdrawalsPage'));
const DoctorBankKYCPage = lazy(() => import('@/features/doctors/pages/kyc/DoctorBankKYCPage'));
const DoctorProfilePage = lazy(() => import('@/features/doctors/pages/profile/DoctorProfilePage'));
const DoctorSupportPage = lazy(() => import('@/features/doctors/pages/support/DoctorSupportPage'));

export const doctorRoutes: RouteObject = {
  path: '/doctor',
  element: (
    <ProtectedRoute>
      <RoleProtectedRoute allowedRoles={['doctor']}>
        <DoctorLayout />
      </RoleProtectedRoute>
    </ProtectedRoute>
  ),
  children: [
    { index: true, element: <Navigate to="/doctor/dashboard" replace /> },
    { path: 'dashboard', element: withSuspense(<DoctorDashboardPage />) },
    { path: 'patients', element: withSuspense(<DoctorPatientsPage />) },
    { path: 'qr-referral', element: withSuspense(<DoctorQRReferralPage />) },
    { path: 'earnings', element: withSuspense(<DoctorEarningsPage />) },
    { path: 'wallet', element: withSuspense(<DoctorWalletPage />) },
    { path: 'withdrawals', element: withSuspense(<DoctorWithdrawalsPage />) },
    { path: 'bank-kyc', element: withSuspense(<DoctorBankKYCPage />) },
    { path: 'support', element: withSuspense(<DoctorSupportPage />) },
    { path: 'profile', element: withSuspense(<DoctorProfilePage />) },
  ],
};
