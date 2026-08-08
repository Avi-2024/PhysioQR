import React from 'react';
import { HeartPulse, Stethoscope, ArrowRight, Check } from 'lucide-react';
import { UserRole } from '../types/landing.types';

interface ExperienceSelectorProps {
  onOpenPortal: (role?: UserRole) => void;
}

export function ExperienceSelector({ onOpenPortal }: ExperienceSelectorProps) {
  return (
    <section id="platform" className="rc-section" style={{ background: 'var(--bg-page)', borderBottom: '1px solid var(--border-default)' }}>
      <div className="rc-container">
        {/* Header */}
        <div style={{ textAlign: 'center', maxWidth: '680px', margin: '0 auto 48px auto' }}>
          <span className="rc-eyebrow">DUAL PORTAL ARCHITECTURE</span>
          <h2 className="rc-heading-section" style={{ marginTop: '8px', marginBottom: '12px' }}>
            One platform. Two connected experiences.
          </h2>
          <p className="rc-subheading">
            PhysioQR gives patients a simple recovery experience while giving doctors clear visibility into every referral.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }} className="grid-cols-1 md:grid-cols-2">
          {/* Patient Card (Section 37) */}
          <div
            className="rc-card"
            style={{
              background: 'linear-gradient(180deg, #FFFFFF 0%, #F2FAF8 100%)',
              border: '1.5px solid var(--teal-200)',
              padding: '36px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--teal-600)', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <HeartPulse className="w-6 h-6" />
                </div>
                <div>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--teal-700)', textTransform: 'uppercase' }}>FOR PATIENTS</span>
                  <h3 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--teal-950)' }}>Follow your recovery with clarity.</h3>
                </div>
              </div>

              <p style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.6' }}>
                Access the programme recommended by your doctor, complete exercise videos at your own pace, and track your daily progress.
              </p>

              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '32px' }}>
                {[
                  'Easy mobile OTP access',
                  'Clinical pain assessment questionnaire',
                  'Day-wise exercise video guidance',
                  'Clear progress percentages & hold precautions',
                  'Online payment & digital receipts'
                ].map((item, idx) => (
                  <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: 'var(--text-primary)', fontWeight: 600 }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--teal-100)', color: 'var(--teal-700)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button className="rc-btn-primary" onClick={() => onOpenPortal('patient')} style={{ width: 'fit-content' }}>
              <span>Explore Patient Experience</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Doctor Card (Section 38) */}
          <div
            className="rc-card"
            style={{
              background: '#FFFFFF',
              border: '1.5px solid var(--border-default)',
              padding: '36px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--teal-950)', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Stethoscope className="w-6 h-6" />
                </div>
                <div>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>FOR DOCTORS</span>
                  <h3 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)' }}>Extend rehabilitation beyond the clinic.</h3>
                </div>
              </div>

              <p style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.6' }}>
                Refer patients via your unique QR code standee, track registration & programme activity, and access transparent fee-share statements.
              </p>

              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '32px' }}>
                {[
                  'Unique clinic QR referral standee & link',
                  'Real-time referral & patient progress tracking',
                  'Payment status & programme activation alerts',
                  'Commercial fee-share wallet & withdrawal history',
                  'KYC verification & bank payout portal'
                ].map((item, idx) => (
                  <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: 'var(--text-primary)', fontWeight: 600 }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--bg-surface-soft)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button className="rc-btn-outline" onClick={() => onOpenPortal('doctor')} style={{ width: 'fit-content' }}>
              <span>Explore Doctor Experience</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
