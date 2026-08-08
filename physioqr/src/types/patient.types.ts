import type { ProgrammeStatus, PaymentStatus, FeeShareStatus } from './common.types';

export interface Patient {
  id: string;
  name: string;
  email: string;
  mobile: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  city: string;
  state: string;
  referringDoctorId: string;
  referringDoctorName: string;
  painCategoryId: string;
  painCategoryName: string;
  programmeId?: string;
  programmeName?: string;
  programmeStatus: ProgrammeStatus;
  paymentStatus: PaymentStatus;
  feeShareStatus?: FeeShareStatus;
  currentDay: number;
  totalDays: number;
  completionPercentage: number;
  hasRedFlag: boolean;
  registrationDate: string;
  paymentDate?: string;
  programmeStartDate?: string;
  programmeExpiryDate?: string;
}

export interface PatientAssessmentAnswer {
  questionId: string;
  answer: string | string[] | number | boolean;
}

export interface PatientProgrammeDay {
  dayNumber: number;
  title: string;
  status: 'locked' | 'available' | 'in_progress' | 'completed' | 'missed';
  completedAt?: string;
  painScoreBefore?: number;
  painScoreAfter?: number;
  feedbackSubmitted: boolean;
}

export interface PatientDashboardData {
  patient: Patient;
  programme: {
    id: string;
    name: string;
    currentDay: number;
    totalDays: number;
    completionPercentage: number;
    expiryDate: string;
    days: PatientProgrammeDay[];
  };
}
