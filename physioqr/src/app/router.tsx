import React, { lazy } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { adminRoutes } from './routes/admin.routes';
import { agentRoutes } from './routes/agent.routes';
import { doctorRoutes } from './routes/doctor.routes';
import { patientRoutes } from './routes/patient.routes';
import { publicRoutes } from './routes/public.routes';
import { withSuspense } from './routes/route-utils';
import RouteLoadErrorPage from './RouteLoadErrorPage';

const NotFoundPage = lazy(() => import('@/features/common/pages/NotFoundPage'));

// Any lazy-page import error bubbles to its top-level route's errorElement.
// Without this boundary, React Router shows a raw stack trace to patients/agents.
export const router = createBrowserRouter([
  publicRoutes,
  adminRoutes,
  agentRoutes,
  doctorRoutes,
  patientRoutes,
  {
    path: '*',
    element: withSuspense(<NotFoundPage />),
  },
].map((route) => ({ ...route, errorElement: <RouteLoadErrorPage /> })));
