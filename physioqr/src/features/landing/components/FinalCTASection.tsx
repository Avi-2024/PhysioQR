import React from 'react';
import { ArrowRight, HeartPulse, Stethoscope, Sparkles, CheckCircle2 } from 'lucide-react';
import { UserRole } from '../types/landing.types';

interface FinalCTAProps {
  onOpenPortal: (role?: UserRole) => void;
}

export function FinalCTASection({ onOpenPortal }: FinalCTAProps) {
  return (
    <section
      style={{
        background: 'linear-gradient(180deg, #FFFFFF 0%, #F2FAF8 100%)',
        color: 'var(--text-primary)',
        padding: '92px 0',
        position: 'relative',
        borderTop: '1px solid var(--teal-200)',
        borderBottom: '1px solid var(--border-default)'
      }}
    >
      <div className="rc-container" style={{ position: 'relative', zIndex: 10 }}>
        {/* Section Header */}
        <div style={{ maxWidth: '680px', margin: '0 auto 52px auto', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'var(--teal-600)',
              color: '#FFFFFF',
              padding: '5px 16px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 800,
              letterSpacing: '0.6px',
              textTransform: 'uppercase',
              boxShadow: '0 4px 12px rgba(20, 117, 110, 0.2)'
            }}
          >
            <Sparkles className="w-3.5 h-3.5 text-white" />
            <span>PORTAL RECOVERY PATHWAY</span>
          </div>

          <h2 className="rc-heading-section" style={{ color: 'var(--teal-950)', fontSize: 'clamp(25px, 3.6vw, 42px)', letterSpacing: 0, lineHeight: '1.2' }}>
            Continue your PhysioQR journey.
          </h2>

          <p style={{ fontSize: '17px', color: 'var(--teal-900)', lineHeight: '1.6', maxWidth: '580px', fontWeight: 500 }}>
            Select your role to access your dedicated digital rehabilitation portal.
          </p>
        </div>

        {/* 2 World-Class Interactive Role Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', maxWidth: '960px', margin: '0 auto' }} className="rc-responsive-grid-2 grid-cols-1 md:grid-cols-2">
          
          {/* Card 1: Patient Access */}
          <div
            className="rc-card-interactive"
            onClick={() => onOpenPortal('patient')}
            style={{
              background: '#FFFFFF',
              border: '2px solid var(--teal-300)',
              borderRadius: '24px',
              padding: '36px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '28px',
              cursor: 'pointer',
              boxShadow: '0 12px 32px rgba(20, 117, 110, 0.12)',
              transition: 'all 200ms ease-out'
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'var(--teal-600)', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(20, 117, 110, 0.35)' }}>
                  <HeartPulse className="w-7 h-7" />
                </div>
                <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--teal-800)', background: 'var(--teal-100)', padding: '4px 12px', borderRadius: '12px' }}>
                  MOBILE OTP ACCESS
                </span>
              </div>

              <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--teal-700)', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                PATIENT PORTAL
              </span>
              <h3 style={{ fontSize: 'clamp(20px, 2.4vw, 26px)', fontWeight: 800, color: 'var(--teal-950)', marginTop: '4px', marginBottom: '10px' }}>
                Patient Access
              </h3>
              <p style={{ fontSize: '14.5px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '20px' }}>
                Access your assigned rehabilitation exercise videos, daily progress tracking, and digital payment receipts.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: 'var(--text-primary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle2 className="w-4 h-4 text-teal-600" /> OTP-verified mobile access</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle2 className="w-4 h-4 text-teal-600" /> Day-wise exercise video guidance</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle2 className="w-4 h-4 text-teal-600" /> Direct doctor referral link</div>
              </div>
            </div>

            <button
              className="rc-btn-primary"
              style={{
                width: '100%',
                justifyContent: 'center',
                padding: '16px',
                fontSize: '16px',
                borderRadius: '14px',
                boxShadow: '0 6px 20px rgba(20, 117, 110, 0.35)'
              }}
            >
              <span>Login as Patient</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </div>

          {/* Card 2: Doctor Portal */}
          <div
            className="rc-card-interactive"
            onClick={() => onOpenPortal('doctor')}
            style={{
              background: '#FFFFFF',
              border: '2px solid var(--teal-200)',
              borderRadius: '24px',
              padding: '36px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '28px',
              cursor: 'pointer',
              boxShadow: '0 12px 32px rgba(6, 47, 46, 0.08)',
              transition: 'all 200ms ease-out'
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'var(--teal-50)', border: '1px solid var(--teal-200)', color: 'var(--teal-700)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Stethoscope className="w-7 h-7" />
                </div>
                <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', background: 'var(--bg-surface-soft)', padding: '4px 12px', borderRadius: '12px' }}>
                  CLINICIAN PORTAL
                </span>
              </div>

              <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--teal-700)', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                DOCTOR PORTAL
              </span>
              <h3 style={{ fontSize: 'clamp(20px, 2.4vw, 26px)', fontWeight: 800, color: 'var(--teal-950)', marginTop: '4px', marginBottom: '10px' }}>
                Doctor Portal
              </h3>
              <p style={{ fontSize: '14.5px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '20px' }}>
                Manage clinic QR standees, track patient referral activity, monitor progress, and access fee-share statements.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: 'var(--text-primary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle2 className="w-4 h-4 text-teal-600" /> Printable reception QR standees</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle2 className="w-4 h-4 text-teal-600" /> Real-time patient progress monitoring</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle2 className="w-4 h-4 text-teal-600" /> Transparent commercial fee-share wallet</div>
              </div>
            </div>

            <button
              style={{
                width: '100%',
                justifyContent: 'center',
                padding: '16px',
                fontSize: '16px',
                borderRadius: '14px',
                color: 'var(--teal-950)',
                border: '1.5px solid var(--teal-300)',
                background: 'var(--teal-50)',
                cursor: 'pointer',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 180ms ease-out'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--teal-100)';
                e.currentTarget.style.borderColor = 'var(--teal-600)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--teal-50)';
                e.currentTarget.style.borderColor = 'var(--teal-300)';
              }}
            >
              <span>Open Doctor Portal</span>
              <ArrowRight className="w-4 h-4 text-teal-700" />
            </button>
          </div>

        </div>
      </div>
    </section>
  );
}
