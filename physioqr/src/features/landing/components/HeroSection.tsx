import React from 'react';
import { Stethoscope, ShieldCheck, ClipboardCheck, LockKeyhole, ArrowRight, QrCode, HeartPulse, CheckCircle2 } from 'lucide-react';
import { UserRole } from '../types/landing.types';

interface HeroSectionProps {
  onOpenPortal: (role?: UserRole) => void;
}

export function HeroSection({ onOpenPortal }: HeroSectionProps) {
  return (
    <section
      style={{
        background: 'linear-gradient(180deg, #FFFFFF 0%, #F2FAF8 100%)',
        paddingTop: '64px',
        paddingBottom: '88px',
        borderBottom: '1px solid var(--border-default)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <div className="rc-container">
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '48px', alignItems: 'center' }} className="grid-cols-1 lg:grid-cols-2">
          {/* Left Column (55% Copy) */}
          <div>
            <div className="rc-eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--teal-100)', color: 'var(--teal-800)', padding: '4px 12px', borderRadius: '20px' }}>
              <span>CONNECTED DIGITAL REHABILITATION</span>
            </div>

            <h1 className="rc-heading-hero" style={{ marginTop: '16px', marginBottom: '20px' }}>
              From doctor referral to <span style={{ color: 'var(--teal-600)' }}>guided recovery</span>.
            </h1>

            <p className="rc-subheading" style={{ marginBottom: '32px' }}>
              PhysioQR connects doctors and patients through one structured rehabilitation journey—from QR referral and assessment to secure payments, day-wise exercise programmes and progress tracking.
            </p>

            {/* CTAs (Section 26) */}
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '36px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <button className="rc-btn-primary" onClick={() => onOpenPortal('patient')} style={{ padding: '14px 28px', fontSize: '16px' }}>
                  <span>I'm a Patient</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', fontWeight: 500 }}>
                  Access my programme
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <button className="rc-btn-outline" onClick={() => onOpenPortal('doctor')} style={{ padding: '14px 28px', fontSize: '16px' }}>
                  <span>I'm a Doctor</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', fontWeight: 500 }}>
                  Open referral portal
                </span>
              </div>
            </div>

            {/* Trust Row (Section 27) */}
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', paddingTop: '20px', borderTop: '1px solid var(--border-default)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                <Stethoscope className="w-4 h-4 text-teal-600" />
                <span>Doctor connected</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                <ShieldCheck className="w-4 h-4 text-teal-600" />
                <span>OTP verified</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                <ClipboardCheck className="w-4 h-4 text-teal-600" />
                <span>Structured programmes</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                <LockKeyhole className="w-4 h-4 text-teal-600" />
                <span>Secure payments</span>
              </div>
            </div>
          </div>

          {/* Right Column Product Visual (Section 28) */}
          <div style={{ position: 'relative' }}>
            <div
              className="rc-card"
              style={{
                background: '#FFFFFF',
                borderRadius: 'var(--radius-showcase)',
                border: '1.5px solid var(--border-default)',
                padding: '28px',
                boxShadow: 'var(--shadow-elevated)',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px'
              }}
            >
              {/* Doctor Referral Badge Card */}
              <div style={{ background: 'var(--teal-950)', color: '#FFFFFF', borderRadius: '14px', padding: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--teal-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '13px' }}>DR</div>
                  <div>
                    <div style={{ fontSize: '14.5px', fontWeight: 700 }}>Dr. Amit Sharma</div>
                    <div style={{ fontSize: '11px', color: 'var(--teal-300)' }}>Sharma Orthopaedics · Ref Code: DR001</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(20, 184, 166, 0.2)', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, color: '#14B8A6' }}>
                  <QrCode className="w-3.5 h-3.5" />
                  <span>QR Verified</span>
                </div>
              </div>

              {/* Connecting Stepper Indicator */}
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', color: 'var(--teal-600)', fontSize: '12px', fontWeight: 700 }}>
                <div style={{ height: '20px', width: '2px', background: 'var(--teal-500)' }}></div>
                <span>Referral Connected → Patient Recovery</span>
                <div style={{ height: '20px', width: '2px', background: 'var(--teal-500)' }}></div>
              </div>

              {/* Patient Day 5/14 Programme Active Card */}
              <div style={{ background: 'var(--teal-50)', border: '1px solid var(--teal-200)', borderRadius: '14px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <HeartPulse className="w-5 h-5 text-teal-600" />
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--teal-950)' }}>Knee Mobility Rehabilitation</div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>Assigned to Priya Verma · 14-Day Protocol</div>
                    </div>
                  </div>
                  <span className="badge-status active">PROGRAMME ACTIVE</span>
                </div>

                {/* Progress Bar */}
                <div style={{ background: '#FFFFFF', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-soft)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                    <span style={{ color: 'var(--text-primary)' }}>Day 05 of 14</span>
                    <span style={{ color: 'var(--teal-700)' }}>36% Completed</span>
                  </div>
                  <div style={{ height: '8px', background: 'var(--border-default)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: '36%', height: '100%', background: 'linear-gradient(90deg, #14756E, #1B8A80)' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
