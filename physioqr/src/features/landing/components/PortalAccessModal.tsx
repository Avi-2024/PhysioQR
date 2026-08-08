import React, { useEffect } from 'react';
import { HeartPulse, Stethoscope, X, ArrowRight, ShieldCheck, UserCheck } from 'lucide-react';
import { UserRole } from '../types/landing.types';

interface PortalAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRole: (role: UserRole) => void;
}

export function PortalAccessModal({ isOpen, onClose, onSelectRole }: PortalAccessModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="rc-modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="portal-modal-title">
      <div className="rc-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <span className="rc-eyebrow">PORTAL ACCESS SELECTOR</span>
            <h2 id="portal-modal-title" style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
              Welcome to PhysioQR
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Choose how you'd like to continue your rehabilitation journey.
            </p>
          </div>

          <button
            onClick={onClose}
            style={{ border: 'none', background: 'var(--bg-surface-soft)', padding: '8px', borderRadius: '50%', cursor: 'pointer', color: 'var(--text-muted)' }}
            aria-label="Close portal access selector"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 20. Patient Access Card */}
        <div
          className="rc-card rc-card-interactive"
          onClick={() => onSelectRole('patient')}
          style={{ marginBottom: '16px', cursor: 'pointer', border: '1.5px solid var(--teal-200)', background: 'var(--teal-50)' }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--teal-600)', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <HeartPulse className="w-6 h-6" />
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--teal-900)' }}>Continue as Patient</h3>
                <span style={{ fontSize: '11px', fontWeight: 700, background: 'var(--teal-100)', color: 'var(--teal-800)', padding: '2px 8px', borderRadius: '12px' }}>
                  Mobile OTP
                </span>
              </div>
              <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Access your assigned rehabilitation programme, daily exercises, progress tracking, and payment receipts.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px', color: 'var(--teal-700)', fontWeight: 700, fontSize: '13.5px' }}>
                <span>Patient Login</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>

        {/* 21. Doctor Access Card */}
        <div
          className="rc-card rc-card-interactive"
          onClick={() => onSelectRole('doctor')}
          style={{ marginBottom: '24px', cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--teal-900)', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Stethoscope className="w-6 h-6" />
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>Continue as Doctor</h3>
                <span style={{ fontSize: '11px', fontWeight: 700, background: 'var(--bg-surface-soft)', color: 'var(--text-secondary)', padding: '2px 8px', borderRadius: '12px' }}>
                  Registered Account
                </span>
              </div>
              <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Manage patient referrals, clinic QR standees, patient activity monitoring, and fee-share payouts.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px', color: 'var(--teal-600)', fontWeight: 700, fontSize: '13.5px' }}>
                <span>Doctor Portal</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>

        {/* 22. Staff Access Footer */}
        <div style={{ paddingTop: '16px', borderTop: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Admin or Field Agent?</span>
          <button
            onClick={() => onSelectRole('staff')}
            style={{ border: 'none', background: 'transparent', color: 'var(--teal-700)', fontWeight: 700, fontSize: '13.5px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <span>Staff Login</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
