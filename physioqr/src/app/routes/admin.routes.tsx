import React, { lazy } from 'react';
import { Navigate, type RouteObject } from 'react-router-dom';
import { ProtectedRoute, RoleProtectedRoute } from '../route-guards';
import { AdminLayout } from '@/layouts/AdminLayout';
import { withSuspense } from './route-utils';

const AdminDashboardPage = lazy(() => import('@/features/admin/pages/AdminDashboardPage'));
const AdminAgentsPage = lazy(() => import('@/features/admin/pages/agents/AdminAgentsPage'));
const AdminAgentDetailPage = lazy(() => import('@/features/admin/pages/agents/AdminAgentDetailPage'));
const AdminDoctorsPage = lazy(() => import('@/features/admin/pages/doctors/AdminDoctorsPage'));
const AdminDoctorNewPage = lazy(() => import('@/features/admin/pages/doctors/AdminDoctorCreatePage'));
const AdminDoctorDetailPage = lazy(() => import('@/features/admin/pages/doctors/AdminDoctorDetailPage'));
const AdminPatientsPage = lazy(() => import('@/features/admin/pages/patients/AdminPatientsPage'));
const AdminPatientDetailPage = lazy(() => import('@/features/admin/pages/patients/AdminPatientDetailPage'));
const AdminClinicVisitsPage = lazy(() => import('@/features/admin/pages/clinics/AdminClinicVisitsPage'));
const AdminClinicVisitDetailPage = lazy(() => import('@/features/admin/pages/clinics/AdminClinicVisitDetailPage'));
const AdminClinicsPage = lazy(() => import('@/features/admin/pages/clinics/AdminClinicsPage'));
const AdminClinicDetailPage = lazy(() => import('@/features/admin/pages/clinics/AdminClinicDetailPage'));
const AdminReferralsPage = lazy(() => import('@/features/admin/pages/clinics/AdminReferralsPage'));
const AdminReferralDetailPage = lazy(() => import('@/features/admin/pages/clinics/AdminReferralDetailPage'));
const AdminAssessmentsPage = lazy(() => import('@/features/admin/pages/assessments/AdminAssessmentsPage'));
const AdminAssessmentDetailPage = lazy(() => import('@/features/admin/pages/assessments/AdminAssessmentDetailPage'));
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

export const adminRoutes: RouteObject = {
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
    { path: 'dashboard', element: withSuspense(<AdminDashboardPage />) },
    { path: 'agents', element: withSuspense(<AdminAgentsPage />) },
    { path: 'agents/:agentId', element: withSuspense(<AdminAgentDetailPage />) },
    { path: 'clinic-visits', element: withSuspense(<AdminClinicVisitsPage />) },
    { path: 'clinic-visits/:visitId', element: withSuspense(<AdminClinicVisitDetailPage />) },
    { path: 'doctors', element: withSuspense(<AdminDoctorsPage />) },
    { path: 'doctors/new', element: withSuspense(<AdminDoctorNewPage />) },
    { path: 'doctors/:doctorId', element: withSuspense(<AdminDoctorDetailPage />) },
    { path: 'clinics', element: withSuspense(<AdminClinicsPage />) },
    { path: 'clinics/:clinicId', element: withSuspense(<AdminClinicDetailPage />) },
    { path: 'referrals', element: withSuspense(<AdminReferralsPage />) },
    { path: 'referrals/:referralId', element: withSuspense(<AdminReferralDetailPage />) },
    { path: 'patients', element: withSuspense(<AdminPatientsPage />) },
    { path: 'patients/:patientId', element: withSuspense(<AdminPatientDetailPage />) },
    { path: 'assessments', element: withSuspense(<AdminAssessmentsPage />) },
    { path: 'assessments/:assessmentId', element: withSuspense(<AdminAssessmentDetailPage />) },
    { path: 'risk-reviews', element: withSuspense(<AdminRiskReviewsPage />) },
    { path: 'pain-categories', element: withSuspense(<AdminPainCategoriesPage />) },
    { path: 'programs', element: withSuspense(<AdminProgramsPage />) },
    { path: 'exercises', element: withSuspense(<AdminExercisesPage />) },
    { path: 'videos', element: withSuspense(<AdminVideosPage />) },
    { path: 'orders', element: withSuspense(<AdminOrdersPage />) },
    { path: 'payments', element: withSuspense(<AdminPaymentsPage />) },
    { path: 'payments/:paymentId', element: withSuspense(<AdminPaymentDetailPage />) },
    { path: 'refunds', element: withSuspense(<AdminRefundsPage />) },
    { path: 'coupons', element: withSuspense(<AdminCouponsPage />) },
    { path: 'revenue-models', element: withSuspense(<AdminRevenueModelsPage />) },
    { path: 'fee-shares', element: withSuspense(<AdminFeeSharesPage />) },
    { path: 'wallets', element: withSuspense(<AdminWalletsPage />) },
    { path: 'withdrawals', element: withSuspense(<AdminWithdrawalsPage />) },
    { path: 'withdrawals/:withdrawalId', element: withSuspense(<AdminWithdrawalDetailPage />) },
    { path: 'payouts', element: withSuspense(<AdminPayoutsPage />) },
    { path: 'reconciliation', element: withSuspense(<AdminReconciliationPage />) },
    { path: 'notifications', element: withSuspense(<AdminNotificationsPage />) },
    { path: 'support', element: withSuspense(<AdminSupportPage />) },
    { path: 'support/:ticketId', element: withSuspense(<AdminSupportTicketDetailPage />) },
    { path: 'reports', element: withSuspense(<AdminReportsPage />) },
    { path: 'fraud-risk', element: withSuspense(<AdminFraudRiskPage />) },
    { path: 'audit-logs', element: withSuspense(<AdminAuditLogsPage />) },
    { path: 'settings', element: withSuspense(<AdminSettingsPage />) },
  ],
};
