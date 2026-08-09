import React from 'react';
import {
  Activity,
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock,
  Layers,
  Lock,
  Maximize2,
  Play,
  RotateCw,
  ShieldCheck,
  Timer,
  Volume2,
} from 'lucide-react';

export function ProgrammeExperienceSection() {
  const protocolDays = [
    { day: 'Day 01', title: 'Mobility Foundation', status: 'completed' },
    { day: 'Day 02', title: 'Strength Activation', status: 'completed' },
    { day: 'Day 03', title: 'Movement Control', status: 'completed' },
    { day: 'Day 04', title: 'Stability & Balance', status: 'completed' },
    { day: 'Day 05', title: 'Quadriceps Load Progress', status: 'today' },
    { day: 'Day 06', title: 'Patellar Tracking & Flexion', status: 'locked' },
  ];

  return (
    <section className="rc-section" style={{ background: '#FFFFFF', borderBottom: '1px solid var(--border-default)' }}>
      <div className="rc-container">
        <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 56px auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--teal-100)', color: 'var(--teal-800)', padding: '4px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 800, letterSpacing: '0.6px', marginBottom: '12px' }}>
            <Activity className="w-3.5 h-3.5" />
            <span>CLINICAL PROGRAMME DELIVERY</span>
          </div>

          <h2 className="rc-heading-section" style={{ marginTop: '4px', marginBottom: '12px' }}>
            Programme content designed around progression
          </h2>
          <p className="rc-subheading">
            Structured exercise content delivers guided video instructions, repetition targets, rest intervals, and clinical precautions.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.25fr', gap: '40px', alignItems: 'stretch', maxWidth: '1120px', margin: '0 auto' }} className="rc-programme-grid grid-cols-1 md:grid-cols-2">
          <div
            className="rc-card"
            style={{
              background: 'linear-gradient(180deg, #FFFFFF 0%, #F2FAF8 100%)',
              border: '1.5px solid var(--teal-200)',
              padding: 'clamp(18px, 3vw, 32px)',
              borderRadius: '24px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '24px',
            }}
          >
            <div style={{ borderBottom: '1px solid var(--teal-200)', paddingBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--teal-700)', fontSize: '12px', fontWeight: 800, letterSpacing: '0.5px' }}>
                <CalendarDays className="w-4 h-4 flex-shrink-0" />
                <span>KNEE MOBILITY PROTOCOL - 14 DAYS</span>
              </div>
              <h3 style={{ fontSize: 'clamp(18px, 2vw, 22px)', fontWeight: 800, color: 'var(--teal-950)', marginTop: '6px' }}>
                Day-by-Day Exercise Schedule
              </h3>
              <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Exercises unlock sequentially to ensure safe joint adaptation and prevent over-exertion.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {protocolDays.map((item, idx) => {
                const isCompleted = item.status === 'completed';
                const isToday = item.status === 'today';

                return (
                  <div
                    key={idx}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '24px minmax(0, 1fr)',
                      alignItems: 'start',
                      background: isToday ? '#FFFFFF' : isCompleted ? 'rgba(255,255,255,0.7)' : '#F8FAFC',
                      border: isToday ? '1.5px solid var(--teal-600)' : '1px solid var(--border-soft)',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      boxShadow: isToday ? '0 4px 12px rgba(20, 117, 110, 0.08)' : 'none',
                      gap: '12px',
                    }}
                  >
                    <div style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '1px' }}>
                      {isCompleted && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                      {isToday && (
                        <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--teal-600)', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Play className="w-3 h-3 text-white" />
                        </div>
                      )}
                      {!isCompleted && !isToday && <Lock className="w-4 h-4 text-gray-400" />}
                    </div>

                    <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '10px' }}>
                      <div style={{ minWidth: 0, lineHeight: 1.45 }}>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: isToday ? 'var(--teal-700)' : 'var(--text-muted)' }}>{item.day}: </span>
                        <strong style={{ fontSize: '14px', color: isToday ? 'var(--teal-950)' : 'var(--text-primary)' }}>{item.title}</strong>
                      </div>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '4px 10px',
                          borderRadius: '12px',
                          background: isCompleted ? 'var(--success-bg)' : isToday ? 'var(--teal-100)' : 'var(--bg-surface-soft)',
                          color: isCompleted ? 'var(--success-text)' : isToday ? 'var(--teal-800)' : 'var(--text-muted)',
                        }}
                      >
                        {isCompleted ? 'Completed' : isToday ? "Today's Session" : 'Locked'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div
            className="rc-card"
            style={{
              background: '#FFFFFF',
              borderRadius: '24px',
              border: '1.5px solid var(--border-default)',
              padding: 'clamp(18px, 3vw, 32px)',
              boxShadow: 'var(--shadow-elevated)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '24px',
            }}
          >
            <div className="rc-programme-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', borderBottom: '1px solid var(--border-soft)', paddingBottom: '16px' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--teal-600)', fontSize: '11.5px', fontWeight: 800, textTransform: 'uppercase' }}>
                  <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                  <span>CLINICAL EXERCISE PLAYER</span>
                </div>
                <h4 style={{ fontSize: 'clamp(17px, 1.8vw, 20px)', fontWeight: 800, color: 'var(--teal-950)', marginTop: '2px' }}>
                  Supported Knee Extension
                </h4>
                <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>Quadriceps Isometric Strengthening Protocol</div>
              </div>

              <span className="rc-hero-status-badge" style={{ fontSize: '11.5px', fontWeight: 800, background: 'var(--teal-100)', color: 'var(--teal-800)', padding: '6px 12px', borderRadius: '12px' }}>
                Day 05 Active Session
              </span>
            </div>

            <div
              style={{
                minHeight: '230px',
                background: '#073F3C',
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '16px',
                color: '#FFFFFF',
                position: 'relative',
                boxShadow: '0 12px 28px rgba(6, 47, 46, 0.16)',
                border: '1px solid rgba(255, 255, 255, 0.14)',
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#D9F7F3', minWidth: 0 }}>
                  Supported Knee Extension
                </span>
                <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#8EDDD5', background: 'rgba(255,255,255,0.08)', padding: '4px 8px', borderRadius: '999px' }}>Verified</span>
              </div>

              <div style={{ alignSelf: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', margin: '24px 0 18px', textAlign: 'center' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#16847B', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 24px rgba(0,0,0,0.18)', cursor: 'pointer' }}>
                  <Play className="w-7 h-7 text-white ml-0.5" fill="currentColor" />
                </div>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF' }}>Video instructions</span>
                <span style={{ fontSize: '11px', fontWeight: 500, color: '#A8DCD7' }}>3 sets · 10 reps · 30 sec rest</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '20px minmax(48px, 1fr) auto 20px 20px', alignItems: 'center', gap: '9px', background: 'rgba(0,0,0,0.24)', padding: '10px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', minWidth: 0 }}>
                <Play className="w-4 h-4 text-white flex-shrink-0" />
                <div style={{ flex: 1, height: '5px', background: 'rgba(255,255,255,0.25)', borderRadius: '3px', overflow: 'hidden', minWidth: '44px' }}>
                  <div style={{ width: '45%', height: '100%', background: 'var(--teal-400)' }} />
                </div>
                <span style={{ fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>02:15</span>
                <Volume2 className="w-4 h-4 text-white flex-shrink-0 cursor-pointer" />
                <Maximize2 className="w-4 h-4 text-white flex-shrink-0 cursor-pointer" />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }} className="rc-responsive-grid-4">
              {[
                { icon: Layers, label: 'SETS', value: '3 Sets' },
                { icon: RotateCw, label: 'REPS', value: '10 Reps' },
                { icon: Timer, label: 'HOLD', value: '5 Sec' },
                { icon: Clock, label: 'REST', value: '30 Sec', accent: true },
              ].map((spec) => (
                <div key={spec.label} style={{ background: 'var(--bg-surface-soft)', padding: '14px 10px', borderRadius: '14px', border: '1px solid var(--border-soft)', textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '10px', color: 'var(--text-muted)', fontWeight: 800 }}>
                    <spec.icon className="w-3 h-3 text-teal-600" /> {spec.label}
                  </div>
                  <strong style={{ fontSize: '16px', color: spec.accent ? 'var(--teal-700)' : 'var(--text-primary)', marginTop: '4px', display: 'block', fontWeight: 800 }}>{spec.value}</strong>
                </div>
              ))}
            </div>

            <div style={{ background: 'var(--warning-bg)', border: '1px solid var(--warning-border)', padding: '14px 18px', borderRadius: '14px', display: 'flex', alignItems: 'flex-start', gap: '12px', fontSize: '13px', color: 'var(--warning-text)', lineHeight: '1.5' }}>
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-600" style={{ marginTop: '1px' }} />
              <div>
                <strong style={{ color: '#78350F' }}>Clinical Precaution:</strong> Keep back supported firmly against chair. Extend knee slowly until straight and hold for 5 seconds without hyperextending joint.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
