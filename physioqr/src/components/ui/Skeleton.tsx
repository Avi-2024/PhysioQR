import React from 'react';
import { cn } from '@/lib/cn';

// ---------------------------------------------------------------------------
// Skeleton — single animated shimmer block
// ---------------------------------------------------------------------------

export interface SkeletonProps {
  className?: string;
}

export const Skeleton = ({ className }: SkeletonProps) => (
  <div
    aria-hidden="true"
    className={cn(
      'animate-pulse rounded-md bg-gray-200',
      className
    )}
  />
);

Skeleton.displayName = 'Skeleton';

// ---------------------------------------------------------------------------
// SkeletonText — multiple shimmer lines mimicking a text block
// ---------------------------------------------------------------------------

export interface SkeletonTextProps {
  lines?: number;
  className?: string;
  /** last line width fraction (e.g. '3/4' renders the last line at 75%) */
  lastLineWidth?: string;
}

export const SkeletonText = ({
  lines = 3,
  className,
  lastLineWidth = '2/3',
}: SkeletonTextProps) => (
  <div className={cn('space-y-2', className)} aria-hidden="true">
    {Array.from({ length: lines }).map((_, i) => (
      <div
        key={i}
        className={cn(
          'animate-pulse rounded-md bg-gray-200 h-4',
          i === lines - 1 && `w-${lastLineWidth}`
        )}
      />
    ))}
  </div>
);

SkeletonText.displayName = 'SkeletonText';

export default Skeleton;
