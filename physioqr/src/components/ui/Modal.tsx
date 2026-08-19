import React, {
  type ReactNode,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: ModalSize;
}

// ---------------------------------------------------------------------------
// Size classes
// ---------------------------------------------------------------------------

const sizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-5xl',
};

// ---------------------------------------------------------------------------
// Focus trap helper
// ---------------------------------------------------------------------------

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const getFocusableElements = (container: HTMLElement): HTMLElement[] =>
  Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE));

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
}: ModalProps) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  // -------------------------------------------------------------------------
  // Save / restore focus
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (isOpen) {
      previousFocus.current = document.activeElement as HTMLElement;

      requestAnimationFrame(() => {
        const focusable = dialogRef.current
          ? getFocusableElements(dialogRef.current)
          : [];

        focusable[0]?.focus();
      });
    } else {
      previousFocus.current?.focus();
    }
  }, [isOpen]);

  // -------------------------------------------------------------------------
  // Lock body scroll
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // -------------------------------------------------------------------------
  // Escape key + focus trap
  // -------------------------------------------------------------------------

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = getFocusableElements(dialogRef.current);

        if (focusable.length === 0) {
          e.preventDefault();
          return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    },
    [isOpen, onClose]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // -------------------------------------------------------------------------
  // Overlay click
  // -------------------------------------------------------------------------

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === overlayRef.current) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="
        fixed inset-0 z-50
        flex items-center justify-center
        bg-black/50 backdrop-blur-sm
        p-3 sm:p-4
        animate-in fade-in duration-150
      "
      role="presentation"
      aria-hidden="false"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        className={cn(
          // Base modal
          'relative flex w-full flex-col',
          'rounded-2xl bg-white shadow-2xl',
          'ring-1 ring-gray-200',

          // IMPORTANT:
          // Never allow modal to exceed viewport height
          'max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)]',

          // Animation
          'animate-in zoom-in-95 duration-150',

          // Width
          sizeClasses[size]
        )}
      >
        {/* ----------------------------------------------------------------- */}
        {/* Header */}
        {/* ----------------------------------------------------------------- */}

        {title && (
          <div
            className="
              flex shrink-0
              items-center justify-between
              gap-4
              border-b border-gray-100
              px-5 py-4 sm:px-6
            "
          >
            <h2
              id="modal-title"
              className="min-w-0 text-base sm:text-lg font-semibold text-gray-900"
            >
              {title}
            </h2>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="
                shrink-0
                rounded-lg p-1.5
                text-gray-400
                transition-colors
                hover:bg-gray-100
                hover:text-gray-600
                focus:outline-none
                focus:ring-2
                focus:ring-primary-500
              "
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* Scrollable Body */}
        {/* ----------------------------------------------------------------- */}

        <div
          className={cn(
            'min-h-0 flex-1 overflow-y-auto overscroll-contain',
            'px-5 pb-5 sm:px-6 sm:pb-6',
            !title && 'pt-5 sm:pt-6'
          )}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};

Modal.displayName = 'Modal';

export { Modal };
export default Modal;