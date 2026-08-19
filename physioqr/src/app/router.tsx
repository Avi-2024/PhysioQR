import React, { lazy } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { adminRoutes } from './routes/admin.routes';
import { agentRoutes } from './routes/agent.routes';
import { doctorRoutes } from './routes/doctor.routes';
import { patientRoutes } from './routes/patient.routes';
import { publicRoutes } from './routes/public.routes';
import { withSuspense } from './routes/route-utils';

const NotFoundPage = lazy(() => import('@/features/common/pages/NotFoundPage'));

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
]);
