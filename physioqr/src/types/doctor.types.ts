export type DoctorAccountStatus =
  | 'active'
  | 'inactive'
  | 'suspended'
  | 'verification_required';

export type PaymentStatus =
  | 'paid'
  | 'pending'
  | 'failed'
  | 'refunded'
  | 'partially_refunded';

export type CommissionStatus =
  | 'pending'
  | 'on_hold'
  | 'available'
  | 'requested'
  | 'paid'
  | 'reversed';

export type ProgramStatus =
  | 'not_started'
  | 'active'
  | 'paused'
  | 'completed'
  | 'expired';

export type WithdrawalStatus =
  | 'requested'
  | 'under_review'
  | 'approved'
  | 'processing'
  | 'paid'
  | 'rejected'
  | 'failed'
  | 'cancelled';

export type KycDocumentStatus =
  | 'not_submitted'
  | 'under_review'
  | 'verified'
  | 'rejected'
  | 'update_required';

export interface DoctorProfile {
  id: string;
  name: string;
  email: string;
  mobile: string;
  qualification: string;
  specialization: string;
  registrationNumber: string;
  medicalCouncil: string;
  yearsOfExperience: number;
  clinicName: string;
  clinicAddress: string;
  city: string;
  state: string;
  pincode: string;
  accountStatus: DoctorStatus;
  referralCode: string;
  patientFee: number;
  commissionPercentage: number;
  holdingPeriodDays: number;
  minimumWithdrawalAmount: number;
  payoutCycle: string;
  qrCodeUrl: string;
  referralLink: string;
  kycStatus: KycDocumentStatus;
  bankVerificationStatus: KycDocumentStatus;
}

export type DoctorStatus = DoctorAccountStatus;

export interface ReferralPatient {
  id: string;
  name: string;
  mobileMasked: string;
  registrationDate: string;
  painCategory: string;
  programName: string;
  programProgress: number; // 0 to 100
  paymentAmount: number;
  paymentStatus: PaymentStatus;
  programStatus: ProgramStatus;
  commissionAmount: number;
  commissionStatus: CommissionStatus;
  releaseDate?: string;
  lastActiveDate: string;
}

export interface WalletSummary {
  lifetimeCommission: number;
  availableBalance: number;
  pendingCommission: number;
  paidCommission: number;
  reversedCommission: number;
  minimumWithdrawal: number;
  holdingPeriodDays: number;
  commissionPercentage: number;
  patientFee: number;
}

export interface WithdrawalRequest {
  id: string;
  amount: number;
  requestDate: string;
  status: WithdrawalStatus;
  bankAccountEnding: string;
  bankName: string;
  processedDate?: string;
  transactionReference?: string;
  rejectionReason?: string;
  timeline: {
    status: WithdrawalStatus;
    date: string;
    note?: string;
  }[];
}

export interface DashboardSummary {
  qrScans: number;
  registeredPatients: number;
  paidPatients: number;
  activePatients: number;
  revenueGenerated: number;
  lifetimeCommission: number;
  pendingCommission: number;
  availableCommission: number;
  paidCommission: number;
  conversionRate: number; // e.g. 70.6
  scanToRegistrationRate: number;
}

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  category: 'patients' | 'payments' | 'commission' | 'withdrawals' | 'account' | 'support';
  isRead: boolean;
  actionUrl?: string;
}

export interface SupportTicket {
  id: string;
  category: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'waiting_doctor' | 'resolved' | 'closed';
  createdDate: string;
  lastUpdated: string;
}
