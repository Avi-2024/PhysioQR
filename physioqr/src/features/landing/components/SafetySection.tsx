import React from 'react';
import { SAFETY_RULES } from '../data/landing-content';
import { ShieldCheck, FileCheck2, Bell, Shield } from 'lucide-react';

const iconMap: Record<string, React.ReactNode> = {
  ShieldCheck: <ShieldCheck className="w-6 h-6 text-teal-600" />,
  FileCheck2: <FileCheck2 className="w-6 h-6 text-teal-600" />,
  Bell: <Bell className="w-6 h-6 text-teal-600" />,
};

export function SafetySection() {
  return (
    <section
      id="safety"
      className="rc-section"
      style={{
        background: 'linear-gradient(180deg, #FFFFFF 0%, #F2FAF8 100%)',
        borderBottom: '1px solid var(--border-default)'
      }}
    >
      <div className="rc-container">
        <div style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto 56px auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--teal-100)', color: 'var(--teal-800)', padding: '4px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 800, letterSpacing: '0.6px', marginBottom: '12px' }}>
            <Shield className="w-3.5 h-3.5" />
            <span>SAFETY & CLINICAL RESPONSIBILITY</span>
          </div>

          <h2 className="rc-heading-section" style={{ color: 'var(--teal-950)', marginTop: '4px', marginBottom: '12px' }}>
            Designed with healthcare responsibility in mind.
          </h2>

          <p className="rc-subheading" style={{ color: 'var(--text-secondary)' }}>
            PhysioQR combines clear digital workflows with safety controls appropriate for structured rehabilitation delivery.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', maxWidth: '980px', margin: '0 auto' }} className="rc-responsive-grid-3 grid-cols-1 md:grid-cols-3">
          {SAFETY_RULES.map((rule, idx) => (
            <div
              key={idx}
              className="rc-card rc-card-interactive"
              style={{
                background: '#FFFFFF',
                border: '1.5px solid var(--border-default)',
                padding: '28px',
                borderRadius: '20px',
                boxShadow: 'var(--shadow-card)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'var(--teal-50)',
                  border: '1px solid var(--teal-200)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {iconMap[rule.iconName] || <ShieldCheck className="w-6 h-6 text-teal-600" />}
              </div>

              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--teal-950)', marginBottom: '6px' }}>
                  {rule.title}
                </h3>
                <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0 }}>
                  {rule.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
