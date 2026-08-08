import React from 'react';
import Badge, { type BadgeVariant } from '@/components/ui/Badge';
import {
  DOCTOR_STATUS_LABELS,
  DOCTOR_STATUS_COLORS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_COLORS,
  FEE_SHARE_STATUS_LABELS,
  WITHDRAWAL_STATUS_LABELS,
  KYC_STATUS_LABELS,
  PROGRAMME_STATUS_LABELS,
  AGENT_STATUS_LABELS,
} from '@/lib/constants';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type StatusType =
  | 'doctor'
  | 'payment'
  | 'feeShare'
  | 'withdrawal'
  | 'kyc'
  | 'programme'
  | 'agent';

interface StatusBadgeProps {
  status: string;
  type: StatusType;
  size?: 'sm' | 'md';
}

// ---------------------------------------------------------------------------
// Status map helpers
// ---------------------------------------------------------------------------

const feeShareColors: Record<string, BadgeVariant> = {
  estimated:            'neutral',
  pending:              'warning',
  on_hold:              'warning',
  available:            'success',
  withdrawal_requested: 'primary',
  approved_for_payout:  'primary',
  paid:                 'success',
  reversed:             'danger',
  adjusted:             'info',
  cancelled:            'neutral',
};

const withdrawalColors: Record<string, BadgeVariant> = {
  requested:    'warning',
  under_review: 'warning',
  approved:     'primary',
  rejected:     'danger',
  processing:   'info',
  paid:         'success',
  failed:       'danger',
  cancelled:    'neutral',
  reversed:     'danger',
};

const kycColors: Record<string, BadgeVariant> = {
  not_submitted:  'neutral',
  submitted:      'primary',
  under_review:   'warning',
  verified:       'success',
  rejected:       'danger',
  update_required:'warning',
};

const programmeColors: Record<string, BadgeVariant> = {
  not_started: 'neutral',
  active:      'success',
  paused:      'warning',
  completed:   'primary',
  expired:     'danger',
};

const agentColors: Record<string, BadgeVariant> = {
  active:     'success',
  inactive:   'neutral',
  suspended:  'warning',
  terminated: 'danger',
};

const getLabelAndVariant = (
  status: string,
  type: StatusType
): { label: string; variant: BadgeVariant } => {
  switch (type) {
    case 'doctor':
      return {
        label:   DOCTOR_STATUS_LABELS[status as keyof typeof DOCTOR_STATUS_LABELS] ?? status,
        variant: (DOCTOR_STATUS_COLORS[status as keyof typeof DOCTOR_STATUS_COLORS] as BadgeVariant) ?? 'neutral',
      };
    case 'payment':
      return {
        label:   PAYMENT_STATUS_LABELS[status as keyof typeof PAYMENT_STATUS_LABELS] ?? status,
        variant: (PAYMENT_STATUS_COLORS[status as keyof typeof PAYMENT_STATUS_COLORS] as BadgeVariant) ?? 'neutral',
      };
    case 'feeShare':
      return {
        label:   FEE_SHARE_STATUS_LABELS[status as keyof typeof FEE_SHARE_STATUS_LABELS] ?? status,
        variant: feeShareColors[status] ?? 'neutral',
      };
    case 'withdrawal':
      return {
        label:   WITHDRAWAL_STATUS_LABELS[status as keyof typeof WITHDRAWAL_STATUS_LABELS] ?? status,
        variant: withdrawalColors[status] ?? 'neutral',
      };
    case 'kyc':
      return {
        label:   KYC_STATUS_LABELS[status as keyof typeof KYC_STATUS_LABELS] ?? status,
        variant: kycColors[status] ?? 'neutral',
      };
    case 'programme':
      return {
        label:   PROGRAMME_STATUS_LABELS[status as keyof typeof PROGRAMME_STATUS_LABELS] ?? status,
        variant: programmeColors[status] ?? 'neutral',
      };
    case 'agent':
      return {
        label:   AGENT_STATUS_LABELS[status as keyof typeof AGENT_STATUS_LABELS] ?? status,
        variant: agentColors[status] ?? 'neutral',
      };
    default:
      return { label: status, variant: 'neutral' };
  }
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const StatusBadge = ({ status, type, size = 'sm' }: StatusBadgeProps) => {
  const { label, variant } = getLabelAndVariant(status, type);
  return (
    <Badge variant={variant} size={size}>
      {label}
    </Badge>
  );
};

StatusBadge.displayName = 'StatusBadge';

export default StatusBadge;
