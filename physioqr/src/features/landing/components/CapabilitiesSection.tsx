import React from 'react';
import { Activity, ClipboardCheck, QrCode } from 'lucide-react';

export function CapabilitiesSection() {
  const dayPills = [
    { label: 'Day 1', tone: 'success' },
    { label: 'Day 2', tone: 'success' },
    { label: 'Day 3 Today', tone: 'active' },
    { label: 'Day 4 Locked', tone: 'neutral' },
  ];

  return (
    <section className="rc-section" style={{ background: '#FFFFFF', borderBottom: '1px solid var(--border-default)' }}>
      <div className="rc-container">
        <div style={{ textAlign: 'center', maxWidth: '680px', margin: '0 auto 56px auto' }}>
          <span className="rc-eyebrow">COMPLETE WORKFLOW ENGINE</span>
          <h2 className="rc-heading-section" style={{ marginTop: '8px', marginBottom: '12px' }}>
            Built around the complete rehabilitation workflow
          </h2>
          <p className="rc-subheading">
            Referral, clinical assessment, and structured rehabilitation guidance work together in one connected patient journey.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }} className="rc-responsive-grid-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          <CapabilityCard
            icon={<QrCode className="w-5 h-5 text-teal-600" />}
            badge="DOCTOR NETWORK"
            title="QR-Based Referral & Attribution"
            description="Each approved doctor receives a unique referral QR code so every patient registration remains connected to the correct referring doctor."
            preview={
              <div style={{ display: 'grid', gap: '8px' }}>
                <PreviewRow label="QR Status" value="Active" success />
                <PreviewRow label="Scans" value="146" accent />
                <PreviewRow label="Registrations" value="58" />
              </div>
            }
          />

          <CapabilityCard
            icon={<ClipboardCheck className="w-5 h-5 text-teal-600" />}
            badge="CLINICAL SAFETY"
            title="Guided Pain Assessment"
            description="Conditional questions capture patient symptoms while safety rules detect severe red-flag responses requiring clinical review."
            preview={
              <div style={{ display: 'grid', gap: '8px' }}>
                <PreviewRow label="Pain Location" value="Knee Joint" />
                <PreviewRow label="Score" value="6 / 10" accent />
                <PreviewRow label="Status" value="Safety Cleared" success />
              </div>
            }
          />

          <CapabilityCard
            icon={<Activity className="w-5 h-5 text-teal-600" />}
            badge="REHAB CONTENT"
            title="Structured Day-wise Content"
            description="Exercise videos, repetition targets, rest durations, and hold precautions remain organized sequentially day by day."
            preview={
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {dayPills.map((pill) => (
                  <span
                    key={pill.label}
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      background: pill.tone === 'success' ? 'var(--success-bg)' : pill.tone === 'active' ? 'var(--teal-600)' : 'var(--bg-surface-soft)',
                      color: pill.tone === 'success' ? 'var(--success-text)' : pill.tone === 'active' ? '#FFFFFF' : 'var(--text-muted)',
                      padding: '4px 8px',
                      borderRadius: '6px',
                    }}
                  >
                    {pill.label}
                  </span>
                ))}
              </div>
            }
          />
        </div>
      </div>
    </section>
  );
}

function CapabilityHeader({ icon, badge }: { icon: React.ReactNode; badge: string }) {
  return (
    <div className="rc-capability-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
      <div
        className="rc-capability-icon"
        style={{
          width: '44px',
          height: '44px',
          borderRadius: '12px',
          background: 'var(--teal-50)',
          border: '1px solid var(--teal-200)',
          color: 'var(--teal-600)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <span className="rc-capability-badge" style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', background: 'var(--bg-surface-soft)', padding: '4px 12px', borderRadius: '12px' }}>
        {badge}
      </span>
    </div>
  );
}

function CapabilityCard({ icon, badge, title, description, preview }: { icon: React.ReactNode; badge: string; title: string; description: string; preview: React.ReactNode }) {
  return (
    <div
      className="rc-card rc-card-interactive"
      style={{
        background: '#FFFFFF',
        border: '1.5px solid var(--border-default)',
        padding: 'clamp(20px, 3vw, 32px)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: '24px',
      }}
    >
      <div>
        <CapabilityHeader icon={icon} badge={badge} />
        <h3 style={{ fontSize: 'clamp(18px, 1.8vw, 20px)', fontWeight: 800, color: 'var(--text-primary)', marginTop: '16px', marginBottom: '8px' }}>
          {title}
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>{description}</p>
      </div>

      <div style={{ background: 'var(--bg-surface-soft)', border: '1px solid var(--border-default)', borderRadius: '12px', padding: '12px 16px', fontSize: '12px', minWidth: 0 }}>
        {preview}
      </div>
    </div>
  );
}

function PreviewRow({ label, value, accent = false, success = false }: { label: string; value: string; accent?: boolean; success?: boolean }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: '12px', alignItems: 'start' }}>
      <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{label}</span>
      <strong style={{ color: success ? 'var(--success-text)' : accent ? 'var(--teal-700)' : 'var(--text-primary)', textAlign: 'right' }}>{value}</strong>
    </div>
  );
}
