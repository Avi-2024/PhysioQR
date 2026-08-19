import React, { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';
import { PublicRoute } from '../route-guards';
import { PublicLayout } from '@/layouts/PublicLayout';
import { withSuspense } from './route-utils';

const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage'));
const PatientQRLandingPage = lazy(() => import('@/features/patients/pages/registration/PatientQRLandingPage'));
const PatientRegistrationPage = lazy(() => import('@/features/patients/pages/registration/PatientRegistrationPage'));
const PaymentSuccessPage = lazy(() => import('@/features/payments/pages/results/PaymentSuccessPage'));
const PaymentFailedPage = lazy(() => import('@/features/payments/pages/results/PaymentFailedPage'));
const ForgotPasswordPage = lazy(() => import('@/features/common/pages/ForgotPasswordPage'));
const LandingPage = lazy(() => import('@/features/landing/LandingPage'));

export const publicRoutes: RouteObject = {
  element: <PublicLayout />,
  children: [
    { path: '/', element: withSuspense(<LandingPage />) },
    { path: '/home', element: withSuspense(<LandingPage />) },
    {
      path: '/login',
      element: <PublicRoute>{withSuspense(<LoginPage />)}</PublicRoute>,
    },
    { path: '/forgot-password', element: withSuspense(<ForgotPasswordPage />) },
    { path: '/register', element: withSuspense(<PatientRegistrationPage />) },
    { path: '/qr', element: withSuspense(<PatientQRLandingPage />) },
    { path: '/payment-success', element: withSuspense(<PaymentSuccessPage />) },
    { path: '/payment-failed', element: withSuspense(<PaymentFailedPage />) },
  ],
};
