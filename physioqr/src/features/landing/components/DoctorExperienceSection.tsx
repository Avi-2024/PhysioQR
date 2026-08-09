import React from 'react';
import { Stethoscope, QrCode, Users, CheckCircle2, ArrowRight, Wallet } from 'lucide-react';
import { UserRole } from '../types/landing.types';

interface DoctorExperienceProps {
  onOpenPortal: (role?: UserRole) => void;
}

export function DoctorExperienceSection({ onOpenPortal }: DoctorExperienceProps) {
  return (
    <section
      id="doctors"
      className="rc-section"
      style={{
        background: 'linear-gradient(180deg, #FFFFFF 0%, #F2FAF8 100%)',
        borderBottom: '1px solid var(--border-default)'
      }}
    >
      <div className="rc-container">
        <div style={{ display: 'grid', gridTemplateColumns: '0.9fr 1.1fr', gap: '64px', alignItems: 'center', maxWidth: '1120px', margin: '0 auto' }} className="rc-dashboard-grid-2 grid-cols-1 lg:grid-cols-2">
          {/* Left Column: Realistic Dashboard Preview (Section 41) */}
          <div
            className="rc-card"
            style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              padding: '24px',
              boxShadow: 'var(--shadow-elevated)',
              border: '1.5px solid var(--border-default)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-default)', paddingBottom: '12px' }}>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--teal-600)', fontWeight: 800 }}>DOCTOR PORTAL PREVIEW</span>
                <h4 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>Good afternoon, Dr. Sharma</h4>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--success-bg)', color: 'var(--success-text)', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>
                <QrCode className="w-3.5 h-3.5" />
                <span>QR Referral Active</span>
              </div>
            </div>

            {/* 3 Metric Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }} className="rc-responsive-grid-3">
              <div style={{ background: 'var(--bg-surface-soft)', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border-soft)' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700 }}>REGISTERED</span>
                <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>58</div>
              </div>

              <div style={{ background: 'var(--bg-surface-soft)', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border-soft)' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700 }}>PAID PATIENTS</span>
                <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--teal-700)' }}>41</div>
              </div>

              <div style={{ background: 'var(--bg-surface-soft)', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border-soft)' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700 }}>ACTIVE</span>
                <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--success-text)' }}>27</div>
              </div>
            </div>

            {/* Split Model Wallet Preview */}
            <div style={{ background: 'var(--teal-50)', border: '1px solid var(--teal-200)', borderRadius: '12px', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Wallet className="w-4 h-4 text-teal-700" />
                <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--teal-900)' }}>Available Fee Share:</span>
              </div>
              <strong style={{ fontSize: '16px', color: 'var(--teal-800)', fontWeight: 800 }}>₹5,400</strong>
            </div>

            {/* Recent Referrals Table Preview */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.5px' }}>RECENT REFERRED PATIENTS</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC', padding: '10px 12px', borderRadius: '8px', fontSize: '12px' }}>
                  <div>
                    <strong style={{ color: 'var(--text-primary)' }}>Priya Verma</strong>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Knee Rehabilitation</div>
                  </div>
                  <span className="badge-status active">45% ACTIVE</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC', padding: '10px 12px', borderRadius: '8px', fontSize: '12px' }}>
                  <div>
                    <strong style={{ color: 'var(--text-primary)' }}>Rahul Singh</strong>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Lumbar Back Rehabilitation</div>
                  </div>
                  <span className="badge-status active">DAY 08 / 14</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Copy & Benefits */}
          <div>
            <span className="rc-eyebrow">CLINICIAN EXPERIENCE</span>
            <h2 className="rc-heading-section" style={{ marginTop: '8px', marginBottom: '16px' }}>
              Every referral, clearly connected.
            </h2>
            <p className="rc-subheading" style={{ marginBottom: '24px' }}>
              Doctors should be able to understand referral activity without navigating complicated operational software.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
              {[
                { title: 'Printable Acrylic QR Standees', desc: 'Recieve custom clinic reception QR standees for seamless patient onboarding.' },
                { title: 'Real-Time Referral Attribution', desc: 'Track exactly how many patients scanned, registered, and activated their exercise programmes.' },
                { title: 'Transparent Commercial Structure', desc: 'Clear visibility into eligible fee shares, holding release dates, and bank payouts.' },
              ].map((item, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--teal-100)', color: 'var(--teal-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>
                    ✓
                  </div>
                  <div>
                    <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--teal-950)' }}>{item.title}</h4>
                    <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)' }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <button className="rc-btn-outline" onClick={() => onOpenPortal('doctor')}>
              <span>Access Doctor Portal</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
