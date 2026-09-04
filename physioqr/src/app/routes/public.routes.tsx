import React, { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';
import { PublicRoute } from '../route-guards';
import { PublicLayout } from '@/layouts/PublicLayout';
import { withSuspense } from './route-utils';

const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage'));
const ChangePasswordPage = lazy(() => import('@/features/auth/pages/ChangePasswordPage'));
const PatientQRLandingPage = lazy(() => import('@/features/patients/pages/registration/PatientQRLandingPage'));
const PatientRegistrationPage = lazy(() => import('@/features/patients/pages/registration/PatientRegistrationPage'));
const PaymentSuccessPage = lazy(() => import('@/features/payments/pages/results/PaymentSuccessPage'));
const PaymentFailedPage = lazy(() => import('@/features/payments/pages/results/PaymentFailedPage'));
const ForgotPasswordPage = lazy(() => import('@/features/common/pages/ForgotPasswordPage'));
const LandingPage = lazy(() => import('@/features/landing/LandingPage'));
const PatientPage = lazy(() => import('@/features/landing/PatientPage'));
const DoctorPage = lazy(() => import('@/features/landing/DoctorPage'));

export const publicRoutes: RouteObject = {
  element: <PublicLayout />,
  children: [
    { path: '/', element: withSuspense(<LandingPage />) },
    { path: '/home', element: withSuspense(<LandingPage />) },
    { path: '/patients', element: withSuspense(<PatientPage />) },
    { path: '/doctors', element: withSuspense(<DoctorPage />) },
    {
      path: '/login',
      element: <PublicRoute>{withSuspense(<LoginPage />)}</PublicRoute>,
    },
    { path: '/change-password', element: withSuspense(<ChangePasswordPage />) },
    { path: '/forgot-password', element: withSuspense(<ForgotPasswordPage />) },
    { path: '/register', element: withSuspense(<PatientRegistrationPage />) },
    { path: '/qr', element: withSuspense(<PatientQRLandingPage />) },
    { path: '/payment-success', element: withSuspense(<PaymentSuccessPage />) },
    { path: '/payment-failed', element: withSuspense(<PaymentFailedPage />) },
  ],
};
