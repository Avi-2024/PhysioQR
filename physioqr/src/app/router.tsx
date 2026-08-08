import React, { Suspense, lazy } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { PublicRoute, ProtectedRoute, RoleProtectedRoute } from './route-guards';

// Layouts
import { AdminLayout } from '@/layouts/AdminLayout';
import { AgentLayout } from '@/layouts/AgentLayout';
import { DoctorLayout } from '@/layouts/DoctorLayout';
import { PatientLayout } from '@/layouts/PatientLayout';
import { PublicLayout } from '@/layouts/PublicLayout';

// Lazy Pages
const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage'));
const PatientQRLandingPage = lazy(() => import('@/features/patients/pages/PatientQRLandingPage'));
const PatientRegistrationPage = lazy(() => import('@/features/patients/pages/PatientRegistrationPage'));
const PaymentSuccessPage = lazy(() => import('@/features/payments/pages/PaymentResultPages').then(m => ({ default: m.PaymentSuccessPage })));
const PaymentFailedPage = lazy(() => import('@/features/payments/pages/PaymentResultPages').then(m => ({ default: m.PaymentFailedPage })));

// Admin Pages
const AdminDashboardPage = lazy(() => import('@/features/admin/pages/AdminDashboardPage'));
const AdminAgentsPage = lazy(() => import('@/features/admin/pages/AdminStubPages').then(m => ({ default: m.AdminAgentsPage })));
const AdminAgentDetailPage = lazy(() => import('@/features/admin/pages/AdminStubPages').then(m => ({ default: m.AdminAgentDetailPage })));
const AdminDoctorsPage = lazy(() => import('@/features/admin/pages/AdminStubPages').then(m => ({ default: m.AdminDoctorsPage })));
const AdminDoctorNewPage = lazy(() => import('@/features/admin/pages/AdminStubPages').then(m => ({ default: m.AdminDoctorNewPage })));
const AdminDoctorDetailPage = lazy(() => import('@/features/admin/pages/AdminStubPages').then(m => ({ default: m.AdminDoctorDetailPage })));
const AdminPatientsPage = lazy(() => import('@/features/admin/pages/AdminStubPages').then(m => ({ default: m.AdminPatientsPage })));
const AdminPaymentsPage = lazy(() => import('@/features/admin/pages/AdminStubPages').then(m => ({ default: m.AdminPaymentsPage })));
const AdminFeeSharesPage = lazy(() => import('@/features/admin/pages/AdminStubPages').then(m => ({ default: m.AdminFeeSharesPage })));
const AdminWalletsPage = lazy(() => import('@/features/admin/pages/AdminStubPages').then(m => ({ default: m.AdminWalletsPage })));
const AdminWithdrawalsPage = lazy(() => import('@/features/admin/pages/AdminStubPages').then(m => ({ default: m.AdminWithdrawalsPage })));
const AdminReportsPage = lazy(() => import('@/features/admin/pages/AdminStubPages').then(m => ({ default: m.AdminReportsPage })));
const AdminSettingsPage = lazy(() => import('@/features/admin/pages/AdminStubPages').then(m => ({ default: m.AdminSettingsPage })));

// Agent Pages
const AgentDashboardPage = lazy(() => import('@/features/agents/pages/AgentDashboardPage'));
const AgentDoctorsPage = lazy(() => import('@/features/common/StubPages').then(m => ({ default: m.AgentDoctorsPage })));
const AgentRegisterDoctorPage = lazy(() => import('@/features/agents/pages/AgentRegisterDoctorPage'));
const AgentClinicVisitsPage = lazy(() => import('@/features/common/StubPages').then(m => ({ default: m.AgentClinicVisitsPage })));
const AgentPerformancePage = lazy(() => import('@/features/common/StubPages').then(m => ({ default: m.AgentPerformancePage })));

// Doctor Pages
const DoctorDashboardPage = lazy(() => import('@/features/doctors/pages/DoctorDashboardPage'));
const DoctorPatientsPage = lazy(() => import('@/features/doctors/pages/DoctorPatientsPage'));
const DoctorQRReferralPage = lazy(() => import('@/features/doctors/pages/DoctorQRReferralPage'));
const DoctorEarningsPage = lazy(() => import('@/features/common/StubPages').then(m => ({ default: m.DoctorEarningsPage })));
const DoctorWalletPage = lazy(() => import('@/features/doctors/pages/DoctorWalletPage'));
const DoctorWithdrawalsPage = lazy(() => import('@/features/common/StubPages').then(m => ({ default: m.DoctorWithdrawalsPage })));
const DoctorBankKYCPage = lazy(() => import('@/features/common/StubPages').then(m => ({ default: m.DoctorBankKYCPage })));
const DoctorProfilePage = lazy(() => import('@/features/common/StubPages').then(m => ({ default: m.DoctorProfilePage })));

// Patient Pages
const PatientDashboardPage = lazy(() => import('@/features/patients/pages/PatientDashboardPage'));
const PatientProgrammePage = lazy(() => import('@/features/common/StubPages').then(m => ({ default: m.PatientProgrammePage })));
const ProgrammeDayPage = lazy(() => import('@/features/patients/pages/ProgrammeDayPage'));
const PatientProgressPage = lazy(() => import('@/features/common/StubPages').then(m => ({ default: m.PatientProgressPage })));
const PatientPaymentsPage = lazy(() => import('@/features/common/StubPages').then(m => ({ default: m.PatientPaymentsPage })));

const ForgotPasswordPage = lazy(() => import('@/features/common/StubPages').then(m => ({ default: m.ForgotPasswordPage })));
const NotFoundPage = lazy(() => import('@/features/common/StubPages').then(m => ({ default: m.NotFoundPage })));
const LandingPage = lazy(() => import('@/features/landing/LandingPage'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-neutral-500">Loading physioqr...</p>
      </div>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      {
        path: '/',
        element: (
          <Suspense fallback={<PageLoader />}>
            <LandingPage />
          </Suspense>
        ),
      },
      {
        path: '/home',
        element: (
          <Suspense fallback={<PageLoader />}>
            <LandingPage />
          </Suspense>
        ),
      },
      {
        path: '/login',
        element: (
          <PublicRoute>
            <Suspense fallback={<PageLoader />}>
              <LoginPage />
            </Suspense>
          </PublicRoute>
        ),
      },
      {
        path: '/forgot-password',
        element: (
          <Suspense fallback={<PageLoader />}>
            <ForgotPasswordPage />
          </Suspense>
        ),
      },
      {
        path: '/register',
        element: (
          <Suspense fallback={<PageLoader />}>
            <PatientRegistrationPage />
          </Suspense>
        ),
      },
      {
        path: '/qr',
        element: (
          <Suspense fallback={<PageLoader />}>
            <PatientQRLandingPage />
          </Suspense>
        ),
      },
      {
        path: '/payment-success',
        element: (
          <Suspense fallback={<PageLoader />}>
            <PaymentSuccessPage />
          </Suspense>
        ),
      },
      {
        path: '/payment-failed',
        element: (
          <Suspense fallback={<PageLoader />}>
            <PaymentFailedPage />
          </Suspense>
        ),
      },
    ],
  },
  {
    path: '/admin',
    element: (
      <ProtectedRoute>
        <RoleProtectedRoute allowedRoles={['admin']}>
          <AdminLayout />
        </RoleProtectedRoute>
      </ProtectedRoute>
    ),
    children: [
      { path: 'dashboard', element: <Suspense fallback={<PageLoader />}><AdminDashboardPage /></Suspense> },
      { path: 'agents', element: <Suspense fallback={<PageLoader />}><AdminAgentsPage /></Suspense> },
      { path: 'agents/:agentId', element: <Suspense fallback={<PageLoader />}><AdminAgentDetailPage /></Suspense> },
      { path: 'doctors', element: <Suspense fallback={<PageLoader />}><AdminDoctorsPage /></Suspense> },
      { path: 'doctors/new', element: <Suspense fallback={<PageLoader />}><AdminDoctorNewPage /></Suspense> },
      { path: 'doctors/:doctorId', element: <Suspense fallback={<PageLoader />}><AdminDoctorDetailPage /></Suspense> },
      { path: 'patients', element: <Suspense fallback={<PageLoader />}><AdminPatientsPage /></Suspense> },
      { path: 'payments', element: <Suspense fallback={<PageLoader />}><AdminPaymentsPage /></Suspense> },
      { path: 'fee-shares', element: <Suspense fallback={<PageLoader />}><AdminFeeSharesPage /></Suspense> },
      { path: 'wallets', element: <Suspense fallback={<PageLoader />}><AdminWalletsPage /></Suspense> },
      { path: 'withdrawals', element: <Suspense fallback={<PageLoader />}><AdminWithdrawalsPage /></Suspense> },
      { path: 'reports', element: <Suspense fallback={<PageLoader />}><AdminReportsPage /></Suspense> },
      { path: 'settings', element: <Suspense fallback={<PageLoader />}><AdminSettingsPage /></Suspense> },
    ],
  },
  {
    path: '/agent',
    element: (
      <ProtectedRoute>
        <RoleProtectedRoute allowedRoles={['agent']}>
          <AgentLayout />
        </RoleProtectedRoute>
      </ProtectedRoute>
    ),
    children: [
      { path: 'dashboard', element: <Suspense fallback={<PageLoader />}><AgentDashboardPage /></Suspense> },
      { path: 'doctors', element: <Suspense fallback={<PageLoader />}><AgentDoctorsPage /></Suspense> },
      { path: 'doctors/new', element: <Suspense fallback={<PageLoader />}><AgentRegisterDoctorPage /></Suspense> },
      { path: 'clinic-visits', element: <Suspense fallback={<PageLoader />}><AgentClinicVisitsPage /></Suspense> },
      { path: 'performance', element: <Suspense fallback={<PageLoader />}><AgentPerformancePage /></Suspense> },
    ],
  },
  {
    path: '/doctor',
    element: (
      <ProtectedRoute>
        <RoleProtectedRoute allowedRoles={['doctor']}>
          <DoctorLayout />
        </RoleProtectedRoute>
      </ProtectedRoute>
    ),
    children: [
      { path: 'dashboard', element: <Suspense fallback={<PageLoader />}><DoctorDashboardPage /></Suspense> },
      { path: 'patients', element: <Suspense fallback={<PageLoader />}><DoctorPatientsPage /></Suspense> },
      { path: 'qr-referral', element: <Suspense fallback={<PageLoader />}><DoctorQRReferralPage /></Suspense> },
      { path: 'earnings', element: <Suspense fallback={<PageLoader />}><DoctorEarningsPage /></Suspense> },
      { path: 'wallet', element: <Suspense fallback={<PageLoader />}><DoctorWalletPage /></Suspense> },
      { path: 'withdrawals', element: <Suspense fallback={<PageLoader />}><DoctorWithdrawalsPage /></Suspense> },
      { path: 'bank-kyc', element: <Suspense fallback={<PageLoader />}><DoctorBankKYCPage /></Suspense> },
      { path: 'profile', element: <Suspense fallback={<PageLoader />}><DoctorProfilePage /></Suspense> },
    ],
  },
  {
    path: '/patient',
    element: (
      <ProtectedRoute>
        <RoleProtectedRoute allowedRoles={['patient']}>
          <PatientLayout />
        </RoleProtectedRoute>
      </ProtectedRoute>
    ),
    children: [
      { path: 'dashboard', element: <Suspense fallback={<PageLoader />}><PatientDashboardPage /></Suspense> },
      { path: 'programme', element: <Suspense fallback={<PageLoader />}><PatientProgrammePage /></Suspense> },
      { path: 'programme/day/:dayNumber', element: <Suspense fallback={<PageLoader />}><ProgrammeDayPage /></Suspense> },
      { path: 'progress', element: <Suspense fallback={<PageLoader />}><PatientProgressPage /></Suspense> },
      { path: 'payments', element: <Suspense fallback={<PageLoader />}><PatientPaymentsPage /></Suspense> },
    ],
  },
  {
    path: '*',
    element: (
      <Suspense fallback={<PageLoader />}>
        <NotFoundPage />
      </Suspense>
    ),
  },
]);
