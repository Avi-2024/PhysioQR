import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { HeartPulse, Stethoscope, X, ArrowRight } from 'lucide-react';

interface RegisterAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRole?: (role: 'patient' | 'doctor') => void;
}

export function RegisterAccessModal({ isOpen, onClose, onSelectRole }: RegisterAccessModalProps) {
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
    <div
      className="rc-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="register-modal-title"
    >
      <div className="rc-modal-container" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '24px' }}>
          <div style={{ minWidth: 0 }}>
            <span className="rc-eyebrow">REGISTRATION OPTIONS</span>
            <h2 id="register-modal-title" style={{ fontSize: 'clamp(20px, 4vw, 24px)', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
              Create Your PhysioQR Account
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Select your role to open the correct registration flow.
            </p>
          </div>

          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: 'var(--bg-surface-soft)',
              padding: '8px',
              borderRadius: '50%',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              flexShrink: 0,
            }}
            aria-label="Close registration options"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Patient Registration Option */}
        <Link
          to="/register"
          role="link"
          aria-label="Register as a patient"
          className="rc-card rc-card-interactive"
          onClick={(e) => {
            onClose();
            if (onSelectRole) {
              e.preventDefault();
              onSelectRole('patient');
            }
          }}
          style={{
            display: 'block',
            textDecoration: 'none',
            marginBottom: '16px',
            cursor: 'pointer',
            border: '1.5px solid var(--teal-200)',
            background: 'linear-gradient(180deg, #FFFFFF 0%, #F2FAF8 100%)',
            transition: 'all 150ms ease-in-out',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'var(--teal-600)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <HeartPulse className="w-6 h-6" />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="rc-modal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--teal-900)' }}>Register as Patient</h3>
                <span style={{ fontSize: '11px', fontWeight: 700, background: 'var(--teal-100)', color: 'var(--teal-800)', padding: '2px 8px', borderRadius: '12px' }}>
                  Rehabilitation Care
                </span>
              </div>
              <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: '1.5' }}>
                Start your doctor-guided rehabilitation recovery programme. Enter patient details, complete the clinical pain assessment questionnaire, and unlock daily guided exercises.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px', color: 'var(--teal-700)', fontWeight: 700, fontSize: '13.5px' }}>
                <span>Patient Registration Form</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        </Link>

        {/* Doctor Registration Option */}
        <Link
          to="/register/doctor"
          role="link"
          aria-label="Register as a doctor"
          className="rc-card rc-card-interactive"
          onClick={(e) => {
            onClose();
            if (onSelectRole) {
              e.preventDefault();
              onSelectRole('doctor');
            }
          }}
          style={{
            display: 'block',
            textDecoration: 'none',
            cursor: 'pointer',
            border: '1.5px solid var(--border-default)',
            background: '#FFFFFF',
            transition: 'all 150ms ease-in-out',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'var(--teal-950)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Stethoscope className="w-6 h-6" />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="rc-modal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>Register as Doctor / Clinic</h3>
                <span style={{ fontSize: '11px', fontWeight: 700, background: 'var(--bg-surface-soft)', color: 'var(--text-secondary)', padding: '2px 8px', borderRadius: '12px' }}>
                  Clinic Partner
                </span>
              </div>
              <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: '1.5' }}>
                Join the PhysioQR clinical network. Receive custom clinic QR standees, refer patients seamlessly, track patient recovery adherence, and manage transparent revenue share.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px', color: 'var(--teal-600)', fontWeight: 700, fontSize: '13.5px' }}>
                <span>Doctor Registration Form</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
