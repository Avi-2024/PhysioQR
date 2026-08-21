import React from 'react';
import { BellRing, CalendarCheck2, CheckCircle2, MessageCircle } from 'lucide-react';

const reminders = [
  {
    time: '8:00 AM',
    title: 'Morning exercise reminder',
    message: 'Your Day 05 exercises are ready. Continue your recovery when you are comfortable.',
  },
  {
    time: '6:30 PM',
    title: 'Progress check-in',
    message: 'A quick reminder to complete today’s exercises and keep your recovery progress updated.',
  },
];

export function WhatsAppReminderSection() {
  return (
    <section
      className="rc-section"
      style={{
        background: 'linear-gradient(180deg, #F5FCFA 0%, #FFFFFF 100%)',
        borderBottom: '1px solid var(--border-default)',
      }}
    >
      <div className="rc-container">
        <div
          className="grid grid-cols-1 lg:grid-cols-2"
          style={{
            gap: 'clamp(36px, 6vw, 72px)',
            alignItems: 'center',
            maxWidth: '1120px',
            margin: '0 auto',
          }}
        >
          <div>
            <span className="rc-eyebrow">AUTOMATED PATIENT SUPPORT</span>
            <h2
              className="rc-heading-section"
              style={{ marginTop: '8px', marginBottom: '16px' }}
            >
              WhatsApp reminders that keep recovery on track.
            </h2>
            <p className="rc-subheading" style={{ marginBottom: '28px', maxWidth: '600px' }}>
              PhysioQR can remind patients about their daily exercises, programme progress, and important recovery actions directly on WhatsApp.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[
                'Daily exercise reminders at the right time',
                'Progress and programme check-in notifications',
                'Simple mobile messages without another app to learn',
              ].map((item) => (
                <div
                  key={item}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    color: 'var(--text-primary)',
                    fontSize: '14.5px',
                    fontWeight: 600,
                  }}
                >
                  <span
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: '#E2F8F0',
                      color: '#159B73',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </span>
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div style={{ position: 'relative', maxWidth: '520px', width: '100%', margin: '0 auto' }}>
            <div
              style={{
                position: 'absolute',
                inset: '-24px',
                borderRadius: '36px',
                background: 'rgba(36, 211, 102, 0.08)',
                filter: 'blur(22px)',
              }}
            />

            <div
              className="rc-card"
              style={{
                position: 'relative',
                background: '#FFFFFF',
                border: '1.5px solid #CDEDE3',
                borderRadius: '24px',
                padding: 'clamp(20px, 3vw, 28px)',
                boxShadow: '0 24px 60px rgba(17, 94, 76, 0.12)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  paddingBottom: '18px',
                  borderBottom: '1px solid var(--border-soft)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '14px',
                      background: '#25D366',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 8px 20px rgba(37, 211, 102, 0.22)',
                    }}
                  >
                    <MessageCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#159B73', letterSpacing: '0.5px' }}>
                      WHATSAPP REMINDERS
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--teal-950)' }}>
                      PhysioQR Recovery
                    </div>
                  </div>
                </div>

                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: '#ECFDF5',
                    color: '#16865F',
                    padding: '5px 9px',
                    borderRadius: '999px',
                    fontSize: '11px',
                    fontWeight: 800,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <BellRing className="w-3.5 h-3.5" />
                  Automated
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '18px' }}>
                {reminders.map((reminder) => (
                  <div
                    key={reminder.title}
                    style={{
                      background: '#F4FBF8',
                      border: '1px solid #D9EFE7',
                      borderRadius: '16px',
                      padding: '16px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        marginBottom: '7px',
                      }}
                    >
                      <strong style={{ fontSize: '14px', color: 'var(--teal-950)' }}>{reminder.title}</strong>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>{reminder.time}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.55, color: 'var(--text-secondary)' }}>
                      {reminder.message}
                    </p>
                  </div>
                ))}
              </div>

              <div
                style={{
                  marginTop: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '9px',
                  color: 'var(--text-secondary)',
                  fontSize: '12.5px',
                  fontWeight: 600,
                }}
              >
                <CalendarCheck2 className="w-4 h-4 text-teal-600" />
                Timed around the patient’s recovery schedule
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
