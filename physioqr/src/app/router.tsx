import React, { Suspense, lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { PublicRoute, ProtectedRoute, RoleProtectedRoute } from './route-guards';

// Layouts
import { AdminLayout } from '@/layouts/AdminLayout';
import { AgentLayout } from '@/layouts/AgentLayout';
import { DoctorLayout } from '@/layouts/DoctorLayout';
import { PatientLayout } from '@/layouts/PatientLayout';
import { PublicLayout } from '@/layouts/PublicLayout';

// Lazy Pages
const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage'));
const PatientQRLandingPage = lazy(() => import('@/features/patients/pages/registration/PatientQRLandingPage'));
const PatientRegistrationPage = lazy(() => import('@/features/patients/pages/registration/PatientRegistrationPage'));
const PaymentSuccessPage = lazy(() => import('@/features/payments/pages/results/PaymentSuccessPage'));
const PaymentFailedPage = lazy(() => import('@/features/payments/pages/results/PaymentFailedPage'));

// Admin Pages
const AdminDashboardPage = lazy(() => import('@/features/admin/pages/AdminDashboardPage'));
const AdminAgentsPage = lazy(() => import('@/features/admin/pages/agents/AdminAgentsPage'));
const AdminAgentDetailPage = lazy(() => import('@/features/admin/pages/agents/AdminAgentDetailPage'));
const AdminDoctorsPage = lazy(() => import('@/features/admin/pages/doctors/AdminDoctorsPage'));
const AdminDoctorNewPage = lazy(() => import('@/features/admin/pages/doctors/AdminDoctorCreatePage'));
const AdminDoctorDetailPage = lazy(() => import('@/features/admin/pages/doctors/AdminDoctorDetailPage'));
const AdminPatientsPage = lazy(() => import('@/features/admin/pages/patients/AdminPatientsPage'));
const AdminPatientDetailPage = lazy(() => import('@/features/admin/pages/patients/AdminPatientDetailPage'));
const AdminClinicVisitsPage = lazy(() => import('@/features/admin/pages/clinics/AdminClinicVisitsPage'));
const AdminClinicsPage = lazy(() => import('@/features/admin/pages/clinics/AdminClinicsPage'));
const AdminReferralsPage = lazy(() => import('@/features/admin/pages/clinics/AdminReferralsPage'));
const AdminAssessmentsPage = lazy(() => import('@/features/admin/pages/assessments/AdminAssessmentsPage'));
const AdminRiskReviewsPage = lazy(() => import('@/features/admin/pages/risk/AdminRiskReviewsPage'));
const AdminPainCategoriesPage = lazy(() => import('@/features/admin/pages/assessments/AdminPainCategoriesPage'));
const AdminProgramsPage = lazy(() => import('@/features/admin/pages/content/AdminProgramsPage'));
const AdminExercisesPage = lazy(() => import('@/features/admin/pages/content/AdminExercisesPage'));
const AdminVideosPage = lazy(() => import('@/features/admin/pages/content/AdminVideosPage'));
const AdminOrdersPage = lazy(() => import('@/features/admin/pages/payments/AdminOrdersPage'));
const AdminPaymentsPage = lazy(() => import('@/features/admin/pages/payments/AdminPaymentsPage'));
const AdminPaymentDetailPage = lazy(() => import('@/features/admin/pages/payments/AdminPaymentDetailPage'));
const AdminRefundsPage = lazy(() => import('@/features/admin/pages/payments/AdminRefundsPage'));
const AdminCouponsPage = lazy(() => import('@/features/admin/pages/payments/AdminCouponsPage'));
const AdminRevenueModelsPage = lazy(() => import('@/features/admin/pages/finance/AdminRevenueModelsPage'));
const AdminFeeSharesPage = lazy(() => import('@/features/admin/pages/finance/AdminFeeSharesPage'));
const AdminWalletsPage = lazy(() => import('@/features/admin/pages/finance/AdminWalletsPage'));
const AdminWithdrawalsPage = lazy(() => import('@/features/admin/pages/finance/AdminWithdrawalsPage'));
const AdminWithdrawalDetailPage = lazy(() => import('@/features/admin/pages/finance/AdminWithdrawalDetailPage'));
const AdminPayoutsPage = lazy(() => import('@/features/admin/pages/finance/AdminPayoutsPage'));
const AdminReconciliationPage = lazy(() => import('@/features/admin/pages/finance/AdminReconciliationPage'));
const AdminNotificationsPage = lazy(() => import('@/features/admin/pages/notifications/AdminNotificationsPage'));
const AdminSupportPage = lazy(() => import('@/features/admin/pages/support/AdminSupportPage'));
const AdminSupportTicketDetailPage = lazy(() => import('@/features/admin/pages/support/AdminSupportTicketDetailPage'));
const AdminReportsPage = lazy(() => import('@/features/admin/pages/reports/AdminReportsPage'));
const AdminFraudRiskPage = lazy(() => import('@/features/admin/pages/risk/AdminFraudRiskPage'));
const AdminAuditLogsPage = lazy(() => import('@/features/admin/pages/risk/AdminAuditLogsPage'));
const AdminSettingsPage = lazy(() => import('@/features/admin/pages/settings/AdminSettingsPage'));

// Agent Pages
const AgentDashboardPage = lazy(() => import('@/features/agents/pages/dashboard/AgentDashboardPage'));
const AgentDoctorsPage = lazy(() => import('@/features/agents/pages/doctors/AgentDoctorsPage'));
const AgentRegisterDoctorPage = lazy(() => import('@/features/agents/pages/doctors/AgentRegisterDoctorPage'));
const AgentClinicVisitsPage = lazy(() => import('@/features/agents/pages/clinic-visits/AgentClinicVisitsPage'));
const AgentPerformancePage = lazy(() => import('@/features/agents/pages/performance/AgentPerformancePage'));

// Doctor Pages
const DoctorDashboardPage = lazy(() => import('@/features/doctors/pages/dashboard/DoctorDashboardPage'));
const DoctorPatientsPage = lazy(() => import('@/features/doctors/pages/patients/DoctorPatientsPage'));
const DoctorQRReferralPage = lazy(() => import('@/features/doctors/pages/referrals/DoctorQRReferralPage'));
const DoctorEarningsPage = lazy(() => import('@/features/doctors/pages/earnings/DoctorEarningsPage'));
const DoctorWalletPage = lazy(() => import('@/features/doctors/pages/wallet/DoctorWalletPage'));
const DoctorWithdrawalsPage = lazy(() => import('@/features/doctors/pages/withdrawals/DoctorWithdrawalsPage'));
const DoctorBankKYCPage = lazy(() => import('@/features/doctors/pages/kyc/DoctorBankKYCPage'));
const DoctorProfilePage = lazy(() => import('@/features/doctors/pages/profile/DoctorProfilePage'));
const DoctorSupportPage = lazy(() => import('@/features/doctors/pages/support/DoctorSupportPage'));

// Patient Pages
const PatientDashboardPage = lazy(() => import('@/features/patients/pages/dashboard/PatientDashboardPage'));
const PatientProgrammePage = lazy(() => import('@/features/patients/pages/program/PatientProgrammePage'));
const ProgrammeDayPage = lazy(() => import('@/features/patients/pages/program/ProgrammeDayPage'));
const PatientProgressPage = lazy(() => import('@/features/patients/pages/progress/PatientProgressPage'));
const PatientPaymentsPage = lazy(() => import('@/features/patients/pages/payments/PatientPaymentsPage'));
const PatientSupportPage = lazy(() => import('@/features/patients/pages/support/PatientSupportPage'));

const ForgotPasswordPage = lazy(() => import('@/features/common/pages/ForgotPasswordPage'));
const NotFoundPage = lazy(() => import('@/features/common/pages/NotFoundPage'));
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
      { index: true, element: <Navigate to="/admin/dashboard" replace /> },
      { path: 'dashboard', element: <Suspense fallback={<PageLoader />}><AdminDashboardPage /></Suspense> },
      { path: 'agents', element: <Suspense fallback={<PageLoader />}><AdminAgentsPage /></Suspense> },
      { path: 'agents/:agentId', element: <Suspense fallback={<PageLoader />}><AdminAgentDetailPage /></Suspense> },
      { path: 'clinic-visits', element: <Suspense fallback={<PageLoader />}><AdminClinicVisitsPage /></Suspense> },
      { path: 'doctors', element: <Suspense fallback={<PageLoader />}><AdminDoctorsPage /></Suspense> },
      { path: 'doctors/new', element: <Suspense fallback={<PageLoader />}><AdminDoctorNewPage /></Suspense> },
      { path: 'doctors/:doctorId', element: <Suspense fallback={<PageLoader />}><AdminDoctorDetailPage /></Suspense> },
      { path: 'clinics', element: <Suspense fallback={<PageLoader />}><AdminClinicsPage /></Suspense> },
      { path: 'referrals', element: <Suspense fallback={<PageLoader />}><AdminReferralsPage /></Suspense> },
      { path: 'patients', element: <Suspense fallback={<PageLoader />}><AdminPatientsPage /></Suspense> },
      { path: 'patients/:patientId', element: <Suspense fallback={<PageLoader />}><AdminPatientDetailPage /></Suspense> },
      { path: 'assessments', element: <Suspense fallback={<PageLoader />}><AdminAssessmentsPage /></Suspense> },
      { path: 'risk-reviews', element: <Suspense fallback={<PageLoader />}><AdminRiskReviewsPage /></Suspense> },
      { path: 'pain-categories', element: <Suspense fallback={<PageLoader />}><AdminPainCategoriesPage /></Suspense> },
      { path: 'programs', element: <Suspense fallback={<PageLoader />}><AdminProgramsPage /></Suspense> },
      { path: 'exercises', element: <Suspense fallback={<PageLoader />}><AdminExercisesPage /></Suspense> },
      { path: 'videos', element: <Suspense fallback={<PageLoader />}><AdminVideosPage /></Suspense> },
      { path: 'orders', element: <Suspense fallback={<PageLoader />}><AdminOrdersPage /></Suspense> },
      { path: 'payments', element: <Suspense fallback={<PageLoader />}><AdminPaymentsPage /></Suspense> },
      { path: 'payments/:paymentId', element: <Suspense fallback={<PageLoader />}><AdminPaymentDetailPage /></Suspense> },
      { path: 'refunds', element: <Suspense fallback={<PageLoader />}><AdminRefundsPage /></Suspense> },
      { path: 'coupons', element: <Suspense fallback={<PageLoader />}><AdminCouponsPage /></Suspense> },
      { path: 'revenue-models', element: <Suspense fallback={<PageLoader />}><AdminRevenueModelsPage /></Suspense> },
      { path: 'fee-shares', element: <Suspense fallback={<PageLoader />}><AdminFeeSharesPage /></Suspense> },
      { path: 'wallets', element: <Suspense fallback={<PageLoader />}><AdminWalletsPage /></Suspense> },
      { path: 'withdrawals', element: <Suspense fallback={<PageLoader />}><AdminWithdrawalsPage /></Suspense> },
      { path: 'withdrawals/:withdrawalId', element: <Suspense fallback={<PageLoader />}><AdminWithdrawalDetailPage /></Suspense> },
      { path: 'payouts', element: <Suspense fallback={<PageLoader />}><AdminPayoutsPage /></Suspense> },
      { path: 'reconciliation', element: <Suspense fallback={<PageLoader />}><AdminReconciliationPage /></Suspense> },
      { path: 'notifications', element: <Suspense fallback={<PageLoader />}><AdminNotificationsPage /></Suspense> },
      { path: 'support', element: <Suspense fallback={<PageLoader />}><AdminSupportPage /></Suspense> },
      { path: 'support/:ticketId', element: <Suspense fallback={<PageLoader />}><AdminSupportTicketDetailPage /></Suspense> },
      { path: 'reports', element: <Suspense fallback={<PageLoader />}><AdminReportsPage /></Suspense> },
      { path: 'fraud-risk', element: <Suspense fallback={<PageLoader />}><AdminFraudRiskPage /></Suspense> },
      { path: 'audit-logs', element: <Suspense fallback={<PageLoader />}><AdminAuditLogsPage /></Suspense> },
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
      { path: 'support', element: <Suspense fallback={<PageLoader />}><DoctorSupportPage /></Suspense> },
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
      { path: 'support', element: <Suspense fallback={<PageLoader />}><PatientSupportPage /></Suspense> },
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
