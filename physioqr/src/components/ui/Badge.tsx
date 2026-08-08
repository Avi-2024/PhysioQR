import React, { type ReactNode } from 'react';
import { cn } from '@/lib/cn';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BadgeVariant =
  | 'success'
  | 'warning'
  | 'danger'
  | 'primary'
  | 'neutral'
  | 'info';

export type BadgeSize = 'sm' | 'md';

export interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  children: ReactNode;
  className?: string;
}

// ---------------------------------------------------------------------------
// Class maps
// ---------------------------------------------------------------------------

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200',
  warning: 'bg-amber-100 text-amber-700 ring-1 ring-amber-200',
  danger:  'bg-red-100 text-red-700 ring-1 ring-red-200',
  primary: 'bg-primary-100 text-primary-700 ring-1 ring-primary-200',
  neutral: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200',
  info:    'bg-sky-100 text-sky-700 ring-1 ring-sky-200',
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const Badge = ({ variant = 'neutral', size = 'sm', children, className }: BadgeProps) => (
  <span
    className={cn(
      'inline-flex items-center font-medium rounded-full leading-none',
      variantClasses[variant],
      sizeClasses[size],
      className
    )}
  >
    {children}
  </span>
);

Badge.displayName = 'Badge';

export { Badge };
export default Badge;
