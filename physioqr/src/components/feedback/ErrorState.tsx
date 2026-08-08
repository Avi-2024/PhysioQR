import React from 'react';
import { AlertCircle } from 'lucide-react';
import Button from '@/components/ui/Button';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ErrorState = ({
  title   = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  onRetry,
}: ErrorStateProps) => (
  <div
    className="flex flex-col items-center justify-center py-16 px-4 text-center"
    role="alert"
    aria-live="assertive"
  >
    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-500">
      <AlertCircle size={28} aria-hidden="true" />
    </div>

    <h3 className="mb-1.5 text-base font-semibold text-gray-900">{title}</h3>

    <p className="mb-6 max-w-xs text-sm text-gray-500">{message}</p>

    {onRetry && (
      <Button
        variant="outline"
        size="sm"
        onClick={onRetry}
        aria-label="Retry"
      >
        Try Again
      </Button>
    )}
  </div>
);

ErrorState.displayName = 'ErrorState';

export { ErrorState };
export default ErrorState;
