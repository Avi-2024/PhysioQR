import React, { type ReactNode } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Skeleton } from '@/components/ui/Skeleton';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Trend {
  value: number;
  label: string;
}

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  trend?: Trend;
  onClick?: () => void;
  loading?: boolean;
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const KpiCard = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  onClick,
  loading = false,
  className,
}: KpiCardProps) => {
  const isPositiveTrend = trend && trend.value >= 0;

  const cardContent = (
    <>
      {/* Header row */}
      <div className="flex items-start justify-between mb-4">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600 shrink-0"
          aria-hidden="true"
        >
          {icon}
        </div>
      </div>

      {/* Value */}
      <p className="text-3xl font-bold tracking-tight text-gray-900 mb-1">
        {value}
      </p>

      {/* Subtitle + Trend */}
      <div className="flex items-center gap-2">
        {subtitle && (
          <span className="text-sm text-gray-500">{subtitle}</span>
        )}

        {trend && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 text-xs font-semibold rounded-full px-1.5 py-0.5',
              isPositiveTrend
                ? 'text-emerald-700 bg-emerald-100'
                : 'text-red-600 bg-red-100'
            )}
            aria-label={`${isPositiveTrend ? 'Up' : 'Down'} ${Math.abs(trend.value)}% — ${trend.label}`}
          >
            {isPositiveTrend ? (
              <TrendingUp size={12} aria-hidden="true" />
            ) : (
              <TrendingDown size={12} aria-hidden="true" />
            )}
            {Math.abs(trend.value)}%
            <span className="ml-0.5 font-normal text-gray-500">{trend.label}</span>
          </span>
        )}
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={`${title}: ${value}`}
        className={cn(
          'w-full text-left rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200',
          'transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:ring-primary-200',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer',
          className
        )}
      >
        {cardContent}
      </button>
    );
  }

  return (
    <div
      className={cn(
        'rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200',
        className
      )}
    >
      {cardContent}
    </div>
  );
};

KpiCard.displayName = 'KpiCard';

export { KpiCard };
export default KpiCard;
