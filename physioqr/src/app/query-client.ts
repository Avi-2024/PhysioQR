import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

// Centralised query key factory
export const queryKeys = {
  // Auth
  me: ['me'] as const,

  // Admin
  adminDashboard: ['admin', 'dashboard'] as const,
  adminAgents: (filters?: object) => ['admin', 'agents', filters] as const,
  adminDoctors: (filters?: object) => ['admin', 'doctors', filters] as const,
  adminDoctor: (id: string) => ['admin', 'doctor', id] as const,
  adminPatients: (filters?: object) => ['admin', 'patients', filters] as const,
  adminPatient: (id: string) => ['admin', 'patient', id] as const,
  adminPayments: (filters?: object) => ['admin', 'payments', filters] as const,
  adminWithdrawals: (filters?: object) => ['admin', 'withdrawals', filters] as const,
  adminWallet: (doctorId: string) => ['admin', 'wallet', doctorId] as const,
  adminReports: (filters?: object) => ['admin', 'reports', filters] as const,

  // Agent
  agentDashboard: ['agent', 'dashboard'] as const,
  agentDoctors: (filters?: object) => ['agent', 'doctors', filters] as const,
  agentClinicVisits: (filters?: object) => ['agent', 'clinic-visits', filters] as const,

  // Doctor
  doctorDashboard: ['doctor', 'dashboard'] as const,
  doctorPatients: (filters?: object) => ['doctor', 'patients', filters] as const,
  doctorWallet: ['doctor', 'wallet'] as const,
  doctorWithdrawals: (filters?: object) => ['doctor', 'withdrawals', filters] as const,
  doctorQr: ['doctor', 'qr'] as const,
  doctorKyc: ['doctor', 'kyc'] as const,

  // Patient
  patientDashboard: ['patient', 'dashboard'] as const,
  patientProgramme: (patientId?: string) => ['patient', 'programme', patientId] as const,
  patientProgress: ['patient', 'progress'] as const,
  patientPayments: ['patient', 'payments'] as const,
  patientDayExercises: (dayNumber: number) => ['patient', 'day', dayNumber] as const,
};
