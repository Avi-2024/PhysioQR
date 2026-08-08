import React from 'react';
import { QrCode, ClipboardCheck, Activity, Users, ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-react';
import { MOCK_DOCTOR_PROFILE } from '../../../mocks/mockDoctorData';

export function CapabilitiesSection() {
  const doctor = MOCK_DOCTOR_PROFILE;

  return (
    <section className="rc-section" style={{ background: '#FFFFFF', borderBottom: '1px solid var(--border-default)' }}>
      <div className="rc-container">
        {/* Section Header */}
        <div style={{ textAlign: 'center', maxWidth: '680px', margin: '0 auto 56px auto' }}>
          <span className="rc-eyebrow">COMPLETE WORKFLOW ENGINE</span>
          <h2 className="rc-heading-section" style={{ marginTop: '8px', marginBottom: '12px' }}>
            Built around the complete rehabilitation workflow
          </h2>
          <p className="rc-subheading">
            Referral, clinical assessment, day-wise programme delivery, and payment management work as one connected system.
          </p>
        </div>

        {/* Bento Grid (Fixed Layout & Visual Previews) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }} className="grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          
          {/* Card 1: QR Referral (Large - Span 2 Columns) */}
          <div
            className="rc-card rc-card-interactive lg:col-span-2"
            style={{
              background: 'linear-gradient(135deg, #FFFFFF 0%, #F2FAF8 100%)',
              border: '1.5px solid var(--teal-200)',
              padding: '32px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '24px'
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--teal-600)', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <QrCode className="w-6 h-6" />
                </div>
                <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--teal-800)', background: 'var(--teal-100)', padding: '4px 12px', borderRadius: '12px' }}>
                  DOCTOR NETWORK
                </span>
              </div>

              <h3 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--teal-950)', marginBottom: '8px' }}>
                QR-Based Referral & Attribution
              </h3>
              <p style={{ fontSize: '14.5px', color: 'var(--text-secondary)', lineHeight: '1.6', maxWidth: '580px' }}>
                Each approved doctor receives a unique referral QR code so every patient registration remains attributed to the correct referring doctor without manual entry.
              </p>
            </div>

            {/* Visual Preview Box */}
            <div style={{ background: '#FFFFFF', border: '1px solid var(--teal-200)', borderRadius: '14px', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img src={doctor.qrCodeUrl} alt="QR Code Preview" style={{ width: '48px', height: '48px', borderRadius: '8px', border: '1px solid var(--border-default)' }} />
                <div>
                  <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{doctor.name}</strong>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Ref Code: {doctor.referralCode} · QR Standee Active</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px', fontSize: '12px' }}>
                <div><span style={{ color: 'var(--text-muted)' }}>Scans:</span> <strong style={{ color: 'var(--teal-700)' }}>146</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Registrations:</span> <strong style={{ color: 'var(--teal-700)' }}>58</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Paid:</span> <strong style={{ color: 'var(--success-text)' }}>41</strong></div>
              </div>
            </div>
          </div>

          {/* Card 2: Guided Pain Assessment (Standard Span 1) */}
          <div
            className="rc-card rc-card-interactive"
            style={{
              background: '#FFFFFF',
              border: '1.5px solid var(--border-default)',
              padding: '32px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '24px'
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--teal-50)', border: '1px solid var(--teal-200)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ClipboardCheck className="w-6 h-6 text-teal-600" />
                </div>
                <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', background: 'var(--bg-surface-soft)', padding: '4px 12px', borderRadius: '12px' }}>
                  CLINICAL SAFETY
                </span>
              </div>

              <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
                Guided Pain Assessment
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                Conditional questions capture patient symptoms while safety rules detect severe red-flag responses requiring clinical review.
              </p>
            </div>

            {/* Assessment Score Preview Box */}
            <div style={{ background: 'var(--bg-surface-soft)', border: '1px solid var(--border-default)', borderRadius: '12px', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Pain Location: Knee Joint</span>
                <strong style={{ color: 'var(--teal-700)' }}>Score: 6 / 10</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: 'var(--text-muted)' }}>
                <span>Recent Surgery: No</span>
                <span style={{ color: 'var(--success-text)', fontWeight: 700 }}>✓ Safety Cleared</span>
              </div>
            </div>
          </div>

          {/* Card 3: Structured Day-wise Content (Standard Span 1) */}
          <div
            className="rc-card rc-card-interactive"
            style={{
              background: '#FFFFFF',
              border: '1.5px solid var(--border-default)',
              padding: '32px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '24px'
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--teal-50)', border: '1px solid var(--teal-200)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Activity className="w-6 h-6 text-teal-600" />
                </div>
                <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--teal-700)', background: 'var(--teal-100)', padding: '4px 12px', borderRadius: '12px' }}>
                  REHAB CONTENT
                </span>
              </div>

              <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
                Structured Day-wise Content
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                Exercise videos, repetition targets, rest durations, and hold precautions remain organized sequentially day by day.
              </p>
            </div>

            {/* Day Sequence Pills */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, background: 'var(--success-bg)', color: 'var(--success-text)', padding: '4px 8px', borderRadius: '6px' }}>Day 1 ✓</span>
              <span style={{ fontSize: '11px', fontWeight: 700, background: 'var(--success-bg)', color: 'var(--success-text)', padding: '4px 8px', borderRadius: '6px' }}>Day 2 ✓</span>
              <span style={{ fontSize: '11px', fontWeight: 800, background: 'var(--teal-600)', color: '#FFFFFF', padding: '4px 8px', borderRadius: '6px' }}>Day 3 Today</span>
              <span style={{ fontSize: '11px', fontWeight: 600, background: 'var(--bg-surface-soft)', color: 'var(--text-muted)', padding: '4px 8px', borderRadius: '6px' }}>Day 4 🔒</span>
            </div>
          </div>

          {/* Card 4: Connected Field Operations (Standard Span 1) */}
          <div
            className="rc-card rc-card-interactive"
            style={{
              background: '#FFFFFF',
              border: '1.5px solid var(--border-default)',
              padding: '32px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '24px'
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--teal-50)', border: '1px solid var(--teal-200)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users className="w-6 h-6 text-teal-600" />
                </div>
                <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', background: 'var(--bg-surface-soft)', padding: '4px 12px', borderRadius: '12px' }}>
                  FIELD NETWORK
                </span>
              </div>

              <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
                Connected Field Operations
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                Field agents onboard doctors, manage clinic desk visits, and track assigned medical networks with operational visibility.
              </p>
            </div>

            <div style={{ background: 'var(--bg-surface-soft)', border: '1px solid var(--border-default)', borderRadius: '12px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Agent Onboarding Portal</span>
              <span style={{ color: 'var(--teal-700)', fontWeight: 700 }}>Operational</span>
            </div>
          </div>

          {/* Card 5: Centralised Administration (Standard Span 1) */}
          <div
            className="rc-card rc-card-interactive"
            style={{
              background: '#FFFFFF',
              border: '1.5px solid var(--border-default)',
              padding: '32px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '24px'
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--teal-50)', border: '1px solid var(--teal-200)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldCheck className="w-6 h-6 text-teal-600" />
                </div>
                <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', background: 'var(--bg-surface-soft)', padding: '4px 12px', borderRadius: '12px' }}>
                  ENTERPRISE CONTROL
                </span>
              </div>

              <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
                Centralised Administration
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                PhysioQR operations remain centrally controlled through programme, doctor, payment, patient, and reporting tools.
              </p>
            </div>

            <div style={{ background: 'var(--bg-surface-soft)', border: '1px solid var(--border-default)', borderRadius: '12px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Central Admin Audit</span>
              <span style={{ color: 'var(--success-text)', fontWeight: 700 }}>✓ Verified Active</span>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
