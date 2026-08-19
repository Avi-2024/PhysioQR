import React, { lazy } from 'react';
import { Navigate, type RouteObject } from 'react-router-dom';
import { ProtectedRoute, RoleProtectedRoute } from '../route-guards';
import { PatientLayout } from '@/layouts/PatientLayout';
import { withSuspense } from './route-utils';

const PatientDashboardPage = lazy(() => import('@/features/patients/pages/dashboard/PatientDashboardPage'));
const PatientProgrammePage = lazy(() => import('@/features/patients/pages/program/PatientProgrammePage'));
const ProgrammeDayPage = lazy(() => import('@/features/patients/pages/program/ProgrammeDayPage'));
const PatientProgressPage = lazy(() => import('@/features/patients/pages/progress/PatientProgressPage'));
const PatientPaymentsPage = lazy(() => import('@/features/patients/pages/payments/PatientPaymentsPage'));
const PatientSupportPage = lazy(() => import('@/features/patients/pages/support/PatientSupportPage'));

export const patientRoutes: RouteObject = {
  path: '/patient',
  element: (
    <ProtectedRoute>
      <RoleProtectedRoute allowedRoles={['patient']}>
        <PatientLayout />
      </RoleProtectedRoute>
    </ProtectedRoute>
  ),
  children: [
    { index: true, element: <Navigate to="/patient/dashboard" replace /> },
    { path: 'dashboard', element: withSuspense(<PatientDashboardPage />) },
    { path: 'programme', element: withSuspense(<PatientProgrammePage />) },
    { path: 'programme/day/:dayNumber', element: withSuspense(<ProgrammeDayPage />) },
    { path: 'progress', element: withSuspense(<PatientProgressPage />) },
    { path: 'payments', element: withSuspense(<PatientPaymentsPage />) },
    { path: 'support', element: withSuspense(<PatientSupportPage />) },
  ],
};
