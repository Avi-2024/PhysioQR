import type {
  DoctorStatus, PaymentStatus, FeeShareStatus,
  WithdrawalStatus, KycStatus, ProgrammeStatus, AgentStatus
} from '@/types';

export const APP_NAME = 'physioqr';
export const MINIMUM_WITHDRAWAL_AMOUNT = 1000;
export const HOLDING_PERIOD_DEFAULT_DAYS = 15;
export const OTP_LENGTH = 6;
export const OTP_EXPIRY_SECONDS = 300;

export const DOCTOR_STATUS_LABELS: Record<DoctorStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  under_review: 'Under Review',
  documents_required: 'Documents Required',
  approved: 'Approved',
  rejected: 'Rejected',
  suspended: 'Suspended',
  inactive: 'Inactive',
};

export const DOCTOR_STATUS_COLORS: Record<DoctorStatus, string> = {
  draft: 'neutral',
  submitted: 'primary',
  under_review: 'warning',
  documents_required: 'warning',
  approved: 'success',
  rejected: 'danger',
  suspended: 'danger',
  inactive: 'neutral',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  created: 'Created',
  pending: 'Pending',
  successful: 'Successful',
  failed: 'Failed',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
  partially_refunded: 'Partially Refunded',
  disputed: 'Disputed',
  chargeback: 'Chargeback',
  manually_verified: 'Manually Verified',
};

export const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
  created: 'neutral',
  pending: 'warning',
  successful: 'success',
  failed: 'danger',
  cancelled: 'neutral',
  refunded: 'neutral',
  partially_refunded: 'warning',
  disputed: 'danger',
  chargeback: 'danger',
  manually_verified: 'success',
};

export const FEE_SHARE_STATUS_LABELS: Record<FeeShareStatus, string> = {
  estimated: 'Estimated',
  pending: 'Pending',
  on_hold: 'On Hold',
  available: 'Available',
  withdrawal_requested: 'Withdrawal Requested',
  approved_for_payout: 'Approved for Payout',
  paid: 'Paid',
  reversed: 'Reversed',
  adjusted: 'Adjusted',
  cancelled: 'Cancelled',
};

export const WITHDRAWAL_STATUS_LABELS: Record<WithdrawalStatus, string> = {
  requested: 'Requested',
  under_review: 'Under Review',
  approved: 'Approved',
  rejected: 'Rejected',
  processing: 'Processing',
  paid: 'Paid',
  failed: 'Failed',
  cancelled: 'Cancelled',
  reversed: 'Reversed',
};

export const KYC_STATUS_LABELS: Record<KycStatus, string> = {
  not_submitted: 'Not Submitted',
  submitted: 'Submitted',
  under_review: 'Under Review',
  verified: 'Verified',
  rejected: 'Rejected',
  update_required: 'Update Required',
};

export const PROGRAMME_STATUS_LABELS: Record<ProgrammeStatus, string> = {
  not_started: 'Not Started',
  active: 'Active',
  paused: 'Paused',
  completed: 'Completed',
  expired: 'Expired',
};

export const AGENT_STATUS_LABELS: Record<AgentStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  suspended: 'Suspended',
  terminated: 'Terminated',
};

export const PAIN_CATEGORIES = [
  'Lower Back Pain',
  'Upper Back Pain',
  'Neck Pain',
  'Shoulder Pain',
  'Knee Pain',
  'Hip Pain',
  'Ankle Pain',
  'Elbow Pain',
  'Wrist Pain',
  'Joint Stiffness',
  'Posture-related Pain',
  'Muscle Weakness',
  'Sports Injury Recovery',
  'Post-operative Rehabilitation',
  'General Mobility',
  'Other',
];
