import React from 'react';
import { JOURNEY_STEPS } from '../data/landing-content';
import { QrCode, UserRound, ClipboardCheck, BadgeCheck, Activity } from 'lucide-react';

export function CareJourney() {
  const getIcon = (name: string) => {
    switch (name) {
      case 'QrCode': return <QrCode className="w-5 h-5 text-teal-600" />;
      case 'UserRound': return <UserRound className="w-5 h-5 text-teal-600" />;
      case 'ClipboardCheck': return <ClipboardCheck className="w-5 h-5 text-teal-600" />;
      case 'BadgeCheck': return <BadgeCheck className="w-5 h-5 text-teal-600" />;
      case 'Activity': return <Activity className="w-5 h-5 text-teal-600" />;
      default: return <Activity className="w-5 h-5 text-teal-600" />;
    }
  };

  return (
    <section id="how-it-works" className="rc-section" style={{ background: '#FFFFFF', borderBottom: '1px solid var(--border-default)' }}>
      <div className="rc-container">
        {/* Section Header */}
        <div style={{ textAlignment: 'center', textAlign: 'center', maxWidth: '680px', margin: '0 auto 56px auto' }}>
          <span className="rc-eyebrow">STRUCTURED CLINICAL WORKFLOW</span>
          <h2 className="rc-heading-section" style={{ marginTop: '8px', marginBottom: '12px' }}>
            One connected rehabilitation journey
          </h2>
          <p className="rc-subheading">
            Every stage is structured—from the doctor's clinic referral recommendation to the patient's final programme day.
          </p>
        </div>

        {/* 5-Step Stepper (Section 30-35) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', position: 'relative' }} className="grid-cols-1 md:grid-cols-3 lg:grid-cols-5">
          {JOURNEY_STEPS.map((step) => (
            <div
              key={step.stepNumber}
              className="rc-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                padding: '20px',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--teal-50)', border: '1px solid var(--teal-200)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {getIcon(step.iconName)}
                </div>

                <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--teal-700)', background: 'var(--teal-100)', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  0{step.stepNumber}
                </span>
              </div>

              <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--teal-950)' }}>{step.title}</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
