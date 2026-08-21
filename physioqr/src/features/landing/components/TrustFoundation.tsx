import React from 'react';
import { TRUST_FOUNDATION_ITEMS } from '../data/landing-content';
import { Stethoscope, ShieldCheck, ClipboardCheck } from 'lucide-react';

export function TrustFoundation() {
  const getIcon = (name: string) => {
    switch (name) {
      case 'Stethoscope': return <Stethoscope className="w-6 h-6 text-teal-600" />;
      case 'ShieldCheck': return <ShieldCheck className="w-6 h-6 text-teal-600" />;
      case 'ClipboardCheck': return <ClipboardCheck className="w-6 h-6 text-teal-600" />;
      default: return <ShieldCheck className="w-6 h-6 text-teal-600" />;
    }
  };

  return (
    <section style={{ background: 'var(--teal-50)', borderBottom: '1px solid var(--border-default)', padding: '48px 0' }}>
      <div className="rc-container">
        <div className="rc-responsive-grid-3" style={{ display: 'grid', gap: '24px', alignItems: 'start' }}>
          {TRUST_FOUNDATION_ITEMS.map((item, idx) => (
            <div
              key={item.title}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                padding: '20px 16px',
                borderRight: idx < TRUST_FOUNDATION_ITEMS.length - 1 ? '1px solid var(--teal-200)' : 'none',
                minWidth: 0,
              }}
            >
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-soft)', marginBottom: '4px', flexShrink: 0 }}>
                {getIcon(item.iconName)}
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--teal-950)', wordBreak: 'break-word' }}>{item.title}</h3>
              <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: '1.5', wordBreak: 'break-word' }}>{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
