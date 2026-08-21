import React from 'react';
import { PlayCircle, Lock, ArrowRight } from 'lucide-react';
import { UserRole } from '../types/landing.types';

interface PatientExperienceProps {
  onOpenPortal: (role?: UserRole) => void;
}

export function PatientExperienceSection({ onOpenPortal }: PatientExperienceProps) {
  return (
    <section id="patients" className="rc-section" style={{ background: '#FFFFFF', borderBottom: '1px solid var(--border-default)' }}>
      <div className="rc-container">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '64px', alignItems: 'center', maxWidth: '1120px', margin: '0 auto' }} className="rc-dashboard-grid-2 grid-cols-1 lg:grid-cols-2">
          <div>
            <span className="rc-eyebrow">PATIENT-FIRST EXPERIENCE</span>
            <h2 className="rc-heading-section" style={{ marginTop: '8px', marginBottom: '16px' }}>
              Recovery support wherever you feel pain.
            </h2>
            <p className="rc-subheading" style={{ marginBottom: '24px' }}>
              From everyday pain to post-surgery recovery, PhysioQR keeps each rehabilitation day focused on the exercises and guidance recommended for you.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
              {[
                { title: 'Guided Video Exercises', desc: 'Follow clear video instructions with set counts, rep counts, and hold precautions for every exercise.' },
                { title: 'Automated Reminders & Notifications', desc: 'Stay consistent with helpful WhatsApp reminders for scheduled exercises and recovery milestones.' },
                { title: 'Day-Wise Recovery Guidance', desc: 'Exercises remain organised day by day for a simple and structured recovery experience.' },
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

            <button className="rc-btn-primary" onClick={() => onOpenPortal('patient')}>
              <span>Start Patient Login</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div
              style={{
                width: '100%',
                maxWidth: '340px',
                background: 'var(--teal-950)',
                borderRadius: '36px',
                padding: '12px',
                boxShadow: '0 24px 60px rgba(10, 40, 38, 0.25)',
                border: '4px solid #0C5753'
              }}
            >
              <div style={{ background: '#FFFFFF', borderRadius: '28px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-soft)', paddingBottom: '12px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>GOOD MORNING</div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>Priya Verma</div>
                  </div>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--teal-100)', color: 'var(--teal-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800 }}>
                    PV
                  </div>
                </div>

                <div style={{ background: 'var(--teal-50)', padding: '14px', borderRadius: '14px', border: '1px solid var(--teal-200)' }}>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--teal-950)' }}>Post-Surgery Knee Rehabilitation</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--teal-700)', fontWeight: 700, marginTop: '4px' }}>
                    <span>Day 05 of 14</span>
                    <span>36% Complete</span>
                  </div>
                  <div style={{ height: '6px', background: 'var(--teal-200)', borderRadius: '3px', marginTop: '8px', overflow: 'hidden' }}>
                    <div style={{ width: '36%', height: '100%', background: 'var(--teal-600)' }}></div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.5px' }}>TODAY&apos;S EXERCISES</div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-surface-soft)', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border-default)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <PlayCircle className="w-5 h-5 text-teal-600" />
                      <div>
                        <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)' }}>Mobility Warm-up</div>
                        <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>5 min · 3 Sets</div>
                      </div>
                    </div>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--success-text)', background: 'var(--success-bg)', padding: '2px 6px', borderRadius: '8px' }}>Available</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-surface-soft)', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border-default)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <PlayCircle className="w-5 h-5 text-teal-600" />
                      <div>
                        <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)' }}>Quadriceps Activation</div>
                        <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>8 min · 10 Reps</div>
                      </div>
                    </div>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--success-text)', background: 'var(--success-bg)', padding: '2px 6px', borderRadius: '8px' }}>Available</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F8FAFC', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border-soft)', opacity: 0.7 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Lock className="w-4 h-4 text-gray-400" />
                      <div>
                        <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-muted)' }}>Guided Stretch</div>
                        <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>6 min · Locked</div>
                      </div>
                    </div>
                    <span style={{ fontSize: '9.5px', fontWeight: 600, color: 'var(--text-muted)' }}>Complete previous</span>
                  </div>
                </div>

                <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '10px', padding: '10px 12px', fontSize: '11.5px', color: '#047857', fontWeight: 700 }}>
                  WhatsApp reminder scheduled for your next exercise session.
                </div>

                <button className="rc-btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '10px', fontSize: '13px' }}>
                  Continue Day 05 Exercises →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
