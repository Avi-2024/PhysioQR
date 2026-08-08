import React from 'react';
import Modal, { type ModalProps } from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { AlertTriangle } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ConfirmVariant = 'danger' | 'primary';

export interface ConfirmationModalProps
  extends Pick<ModalProps, 'isOpen' | 'onClose' | 'title'> {
  onConfirm: () => void;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  loading?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  description,
  confirmLabel = 'Confirm',
  cancelLabel   = 'Cancel',
  variant       = 'primary',
  loading       = false,
}: ConfirmationModalProps) => (
  <Modal isOpen={isOpen} onClose={onClose} size="sm">
    <div className="flex flex-col items-center text-center gap-4 pt-2">
      {/* Icon */}
      <div
        className={`flex h-14 w-14 items-center justify-center rounded-full ${
          variant === 'danger'
            ? 'bg-red-100 text-red-600'
            : 'bg-primary-50 text-primary-600'
        }`}
        aria-hidden="true"
      >
        <AlertTriangle size={24} />
      </div>

      {/* Title */}
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>

      {/* Description */}
      {description && (
        <p className="text-sm text-gray-500 max-w-xs">{description}</p>
      )}

      {/* Actions */}
      <div className="flex gap-3 w-full pt-2">
        <Button
          variant="outline"
          size="md"
          onClick={onClose}
          disabled={loading}
          className="flex-1"
          aria-label={cancelLabel}
        >
          {cancelLabel}
        </Button>
        <Button
          variant={variant === 'danger' ? 'danger' : 'primary'}
          size="md"
          onClick={onConfirm}
          loading={loading}
          className="flex-1"
          aria-label={confirmLabel}
        >
          {confirmLabel}
        </Button>
      </div>
    </div>
  </Modal>
);

ConfirmationModal.displayName = 'ConfirmationModal';

export { ConfirmationModal };
export default ConfirmationModal;
