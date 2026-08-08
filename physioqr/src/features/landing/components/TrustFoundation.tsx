import React from 'react';
import { TRUST_FOUNDATION_ITEMS } from '../data/landing-content';
import { Stethoscope, ShieldCheck, ClipboardCheck, LockKeyhole } from 'lucide-react';

export function TrustFoundation() {
  const getIcon = (name: string) => {
    switch (name) {
      case 'Stethoscope': return <Stethoscope className="w-6 h-6 text-teal-600" />;
      case 'ShieldCheck': return <ShieldCheck className="w-6 h-6 text-teal-600" />;
      case 'ClipboardCheck': return <ClipboardCheck className="w-6 h-6 text-teal-600" />;
      case 'LockKeyhole': return <LockKeyhole className="w-6 h-6 text-teal-600" />;
      default: return <ShieldCheck className="w-6 h-6 text-teal-600" />;
    }
  };

  return (
    <section style={{ background: 'var(--teal-50)', borderBottom: '1px solid var(--border-default)', padding: '48px 0' }}>
      <div className="rc-container">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }} className="grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          {TRUST_FOUNDATION_ITEMS.map((item, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                padding: '16px',
                borderRight: idx < 3 ? '1px solid var(--teal-200)' : 'none'
              }}
            >
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-soft)', marginBottom: '4px' }}>
                {getIcon(item.iconName)}
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--teal-950)' }}>{item.title}</h3>
              <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
