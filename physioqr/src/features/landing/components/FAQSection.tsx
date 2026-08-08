import React, { useState } from 'react';
import { FAQ_ITEMS } from '../data/landing-content';
import { ChevronDown, CircleHelp } from 'lucide-react';

export function FAQSection() {
  const [openId, setOpenId] = useState<string>('faq-1');

  const toggleAccordion = (id: string) => {
    setOpenId(openId === id ? '' : id);
  };

  return (
    <section id="faq" className="rc-section" style={{ background: '#FFFFFF', borderBottom: '1px solid var(--border-default)' }}>
      <div className="rc-container">
        {/* Header */}
        <div style={{ textAlign: 'center', maxWidth: '680px', margin: '0 auto 48px auto' }}>
          <span className="rc-eyebrow">COMMON QUESTIONS</span>
          <h2 className="rc-heading-section" style={{ marginTop: '8px', marginBottom: '12px' }}>
            Frequently Asked Questions
          </h2>
          <p className="rc-subheading">
            Clear answers about patient access, doctor referrals, exercise programmes, and platform safety.
          </p>
        </div>

        {/* Accordion List (Section 60) */}
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {FAQ_ITEMS.map((faq) => {
            const isOpen = openId === faq.id;
            return (
              <div
                key={faq.id}
                style={{
                  border: isOpen ? '1.5px solid var(--teal-600)' : '1px solid var(--border-default)',
                  borderRadius: '14px',
                  background: isOpen ? 'var(--teal-50)' : '#FFFFFF',
                  overflow: 'hidden',
                  transition: 'all 180ms ease-out'
                }}
              >
                <button
                  onClick={() => toggleAccordion(faq.id)}
                  style={{
                    width: '100%',
                    padding: '18px 24px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'transparent',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer'
                  }}
                  aria-expanded={isOpen}
                >
                  <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--teal-950)' }}>{faq.question}</span>
                  <ChevronDown
                    className="w-5 h-5 text-teal-600"
                    style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 200ms ease-out' }}
                  />
                </button>

                {isOpen && (
                  <div style={{ padding: '0 24px 20px 24px', fontSize: '14.5px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
