import React, { lazy } from 'react';
import { Navigate, type RouteObject } from 'react-router-dom';
import { ProtectedRoute, RoleProtectedRoute } from '../route-guards';
import { AgentLayout } from '@/layouts/AgentLayout';
import { withSuspense } from './route-utils';

const AgentDashboardPage = lazy(() => import('@/features/agents/pages/dashboard/AgentDashboardPage'));
const AgentDoctorsPage = lazy(() => import('@/features/agents/pages/doctors/AgentDoctorsPage'));
const AgentDoctorDetailPage = lazy(() => import('@/features/agents/pages/doctors/AgentDoctorDetailPage'));
const AgentRegisterDoctorPage = lazy(() => import('@/features/agents/pages/doctors/AgentRegisterDoctorPage'));
const AgentClinicVisitsPage = lazy(() => import('@/features/agents/pages/clinic-visits/AgentClinicVisitsPage'));
const AgentFollowUpsPage = lazy(() => import('@/features/agents/pages/follow-ups/AgentFollowUpsPage'));
const AgentPerformancePage = lazy(() => import('@/features/agents/pages/performance/AgentPerformancePage'));

export const agentRoutes: RouteObject = {
  path: '/agent',
  element: (
    <ProtectedRoute>
      <RoleProtectedRoute allowedRoles={['agent']}>
        <AgentLayout />
      </RoleProtectedRoute>
    </ProtectedRoute>
  ),
  children: [
    { index: true, element: <Navigate to="/agent/dashboard" replace /> },
    { path: 'dashboard', element: withSuspense(<AgentDashboardPage />) },
    { path: 'doctors', element: withSuspense(<AgentDoctorsPage />) },
    { path: 'doctors/new', element: withSuspense(<AgentRegisterDoctorPage />) },
    { path: 'doctors/:doctorId', element: withSuspense(<AgentDoctorDetailPage />) },
    { path: 'clinic-visits', element: withSuspense(<AgentClinicVisitsPage />) },
    { path: 'follow-ups', element: withSuspense(<AgentFollowUpsPage />) },
    { path: 'performance', element: withSuspense(<AgentPerformancePage />) },
  ],
};
