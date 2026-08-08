// Core user roles
export type UserRole = 'admin' | 'agent' | 'doctor' | 'patient';

export type DoctorStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'documents_required'
  | 'approved'
  | 'rejected'
  | 'suspended'
  | 'inactive';

export type RevenueModel = 'split_model' | 'platform_fee_model';

export type PaymentStatus =
  | 'created'
  | 'pending'
  | 'successful'
  | 'failed'
  | 'cancelled'
  | 'refunded'
  | 'partially_refunded'
  | 'disputed'
  | 'chargeback'
  | 'manually_verified';

export type ProgrammeStatus =
  | 'not_started'
  | 'active'
  | 'paused'
  | 'completed'
  | 'expired';

export type FeeShareStatus =
  | 'estimated'
  | 'pending'
  | 'on_hold'
  | 'available'
  | 'withdrawal_requested'
  | 'approved_for_payout'
  | 'paid'
  | 'reversed'
  | 'adjusted'
  | 'cancelled';

export type WithdrawalStatus =
  | 'requested'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'processing'
  | 'paid'
  | 'failed'
  | 'cancelled'
  | 'reversed';

export type KycStatus =
  | 'not_submitted'
  | 'submitted'
  | 'under_review'
  | 'verified'
  | 'rejected'
  | 'update_required';

export type AgentStatus = 'active' | 'inactive' | 'suspended' | 'terminated';

export type DayStatus =
  | 'locked'
  | 'available'
  | 'in_progress'
  | 'completed'
  | 'missed'
  | 'paused'
  | 'expired';

// API response shapes
export interface ApiSuccessResponse<T> {
  success: true;
  message: string;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  code?: string;
  errors?: Record<string, string[]>;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
