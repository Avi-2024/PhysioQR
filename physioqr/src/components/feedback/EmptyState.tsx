import React, { type ReactNode } from 'react';
import { Inbox } from 'lucide-react';
import Button from '@/components/ui/Button';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EmptyStateAction {
  label: string;
  onClick: () => void;
}

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: EmptyStateAction;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const EmptyState = ({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) => (
  <div
    className="flex flex-col items-center justify-center py-16 px-4 text-center"
    role="status"
    aria-label={title}
  >
    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-gray-400">
      {icon ?? <Inbox size={28} aria-hidden="true" />}
    </div>

    <h3 className="mb-1.5 text-base font-semibold text-gray-900">{title}</h3>

    {description && (
      <p className="mb-6 max-w-xs text-sm text-gray-500">{description}</p>
    )}

    {action && (
      <Button
        variant="primary"
        size="sm"
        onClick={action.onClick}
        aria-label={action.label}
      >
        {action.label}
      </Button>
    )}
  </div>
);

EmptyState.displayName = 'EmptyState';

export { EmptyState };
export default EmptyState;
