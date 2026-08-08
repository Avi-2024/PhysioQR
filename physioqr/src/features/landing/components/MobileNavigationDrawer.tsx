import React, { useEffect } from 'react';
import { X, ArrowRight, ShieldCheck } from 'lucide-react';
import { APP_CONFIG } from '../../../config/app.config';
import { UserRole } from '../types/landing.types';

interface MobileNavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPortal: (role?: UserRole) => void;
}

export function MobileNavigationDrawer({ isOpen, onClose, onOpenPortal }: MobileNavigationDrawerProps) {
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
    <div className="rc-modal-overlay" onClick={onClose} style={{ justifyContent: 'flex-end', padding: 0 }}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '320px',
          height: '100%',
          background: '#FFFFFF',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-elevated)',
          animation: 'slideLeft 200ms ease-out'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px solid var(--border-default)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--teal-600)', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>+</div>
            <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>{APP_CONFIG.name}</span>
          </div>

          <button onClick={onClose} style={{ border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <ul style={{ listStyle: 'none', padding: '24px 0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {APP_CONFIG.navLinks.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                onClick={onClose}
                style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', textDecoration: 'none', display: 'block' }}
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '16px', borderTop: '1px solid var(--border-default)' }}>
          <button
            className="rc-btn-primary"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={() => {
              onClose();
              onOpenPortal();
            }}
          >
            Sign In to Portal
          </button>

          <button
            onClick={() => {
              onClose();
              onOpenPortal('staff');
            }}
            style={{ border: 'none', background: 'transparent', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', cursor: 'pointer' }}
          >
            <span>Admin or Agent? Staff Access</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
