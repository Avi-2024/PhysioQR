import React from 'react';
import { Play, CheckCircle2, Lock, Clock, Activity, AlertCircle, CalendarDays, ShieldCheck, Layers, RotateCw, Timer, Volume2, Maximize2 } from 'lucide-react';

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
        {/* Section Header */}
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

        {/* 2-Column Showcase */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.25fr', gap: '40px', alignItems: 'stretch' }} className="grid-cols-1 md:grid-cols-2">
          
          {/* Left Column: 14-Day Protocol Timeline */}
          <div
            className="rc-card"
            style={{
              background: 'linear-gradient(180deg, #FFFFFF 0%, #F2FAF8 100%)',
              border: '1.5px solid var(--teal-200)',
              padding: '32px',
              borderRadius: '24px',
              display: 'flex',
              flexDirection: 'column',
              justify: 'space-between',
              gap: '24px'
            }}
          >
            <div style={{ borderBottom: '1px solid var(--teal-200)', paddingBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--teal-700)', fontSize: '12px', fontWeight: 800, letterSpacing: '0.5px' }}>
                <CalendarDays className="w-4 h-4" />
                <span>KNEE MOBILITY PROTOCOL · 14 DAYS</span>
              </div>
              <h3 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--teal-950)', marginTop: '6px' }}>
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
                      display: 'flex',
                      justify: 'space-between',
                      alignItems: 'center',
                      background: isToday ? '#FFFFFF' : isCompleted ? 'rgba(255,255,255,0.7)' : '#F8FAFC',
                      border: isToday ? '1.5px solid var(--teal-600)' : '1px solid var(--border-soft)',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      boxShadow: isToday ? '0 4px 12px rgba(20, 117, 110, 0.08)' : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {isCompleted && <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />}
                      {isToday && <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--teal-600)', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 800 }}>▶</div>}
                      {!isCompleted && !isToday && <Lock className="w-4 h-4 text-gray-400 flex-shrink-0" />}

                      <div>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: isToday ? 'var(--teal-700)' : 'var(--text-muted)' }}>{item.day}: </span>
                        <strong style={{ fontSize: '14px', color: isToday ? 'var(--teal-950)' : 'var(--text-primary)' }}>{item.title}</strong>
                      </div>
                    </div>

                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        padding: '4px 10px',
                        borderRadius: '12px',
                        background: isCompleted ? 'var(--success-bg)' : isToday ? 'var(--teal-100)' : 'var(--bg-surface-soft)',
                        color: isCompleted ? 'var(--success-text)' : isToday ? 'var(--teal-800)' : 'var(--text-muted)'
                      }}
                    >
                      {isCompleted ? 'Completed' : isToday ? 'Today\'s Session' : 'Locked'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Premium Clinical Exercise Player Card */}
          <div
            className="rc-card"
            style={{
              background: '#FFFFFF',
              borderRadius: '24px',
              border: '1.5px solid var(--border-default)',
              padding: '32px',
              boxShadow: 'var(--shadow-elevated)',
              display: 'flex',
              flexDirection: 'column',
              justify: 'space-between',
              gap: '24px'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-soft)', paddingBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--teal-600)', fontSize: '11.5px', fontWeight: 800, textTransform: 'uppercase' }}>
                  <ShieldCheck className="w-4 h-4" />
                  <span>CLINICAL EXERCISE PLAYER</span>
                </div>
                <h4 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--teal-950)', marginTop: '2px' }}>
                  Supported Knee Extension
                </h4>
                <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>Quadriceps Isometric Strengthening Protocol</div>
              </div>

              <span style={{ fontSize: '11.5px', fontWeight: 800, background: 'var(--teal-100)', color: 'var(--teal-800)', padding: '6px 12px', borderRadius: '12px' }}>
                Day 05 Active Session
              </span>
            </div>

            {/* Video Player Box (Perfect Height & Spacing) */}
            <div
              style={{
                minHeight: '230px',
                background: 'linear-gradient(135deg, #062F2E 0%, #083F3D 100%)',
                borderRadius: '18px',
                display: 'flex',
                flexDirection: 'column',
                justify: 'space-between',
                padding: '20px',
                color: '#FFFFFF',
                position: 'relative',
                boxShadow: '0 12px 28px rgba(6, 47, 46, 0.25)',
                border: '1px solid rgba(255, 255, 255, 0.12)'
              }}
            >
              {/* Top Bar inside Player */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(6px)', padding: '4px 12px', borderRadius: '12px' }}>
                  HD Clinical Video · Audio Notes On
                </span>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--teal-300)' }}>PhysioQR Verified</span>
              </div>

              {/* Center Glowing Play Button */}
              <div style={{ alignSelf: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', margin: '20px 0' }}>
                <div style={{ width: '58px', height: '58px', borderRadius: '50%', background: 'linear-gradient(135deg, #14756E, #1B8A80)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 24px rgba(20, 184, 166, 0.8)', cursor: 'pointer' }}>
                  <Play className="w-7 h-7 text-white ml-0.5" />
                </div>
                <span style={{ fontSize: '13px', fontWeight: 700, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>Tap to Play Video Instructions</span>
              </div>

              {/* Bottom Video Controls Overlay Bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <Play className="w-4 h-4 text-white flex-shrink-0" />
                <div style={{ flex: 1, height: '5px', background: 'rgba(255,255,255,0.25)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: '45%', height: '100%', background: 'var(--teal-400)' }}></div>
                </div>
                <span style={{ fontSize: '11.5px', fontWeight: 700, whiteSpace: 'nowrap' }}>02:15 / 04:30</span>
                <Volume2 className="w-4 h-4 text-white flex-shrink-0 cursor-pointer" />
                <Maximize2 className="w-4 h-4 text-white flex-shrink-0 cursor-pointer" />
              </div>
            </div>

            {/* 4 Clinical Target Specs Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
              <div style={{ background: 'var(--bg-surface-soft)', padding: '14px 10px', borderRadius: '14px', border: '1px solid var(--border-soft)', textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '10px', color: 'var(--text-muted)', fontWeight: 800 }}>
                  <Layers className="w-3 h-3 text-teal-600" /> SETS
                </div>
                <strong style={{ fontSize: '16px', color: 'var(--text-primary)', marginTop: '4px', display: 'block', fontWeight: 800 }}>3 Sets</strong>
              </div>

              <div style={{ background: 'var(--bg-surface-soft)', padding: '14px 10px', borderRadius: '14px', border: '1px solid var(--border-soft)', textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '10px', color: 'var(--text-muted)', fontWeight: 800 }}>
                  <RotateCw className="w-3 h-3 text-teal-600" /> REPS
                </div>
                <strong style={{ fontSize: '16px', color: 'var(--text-primary)', marginTop: '4px', display: 'block', fontWeight: 800 }}>10 Reps</strong>
              </div>

              <div style={{ background: 'var(--bg-surface-soft)', padding: '14px 10px', borderRadius: '14px', border: '1px solid var(--border-soft)', textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '10px', color: 'var(--text-muted)', fontWeight: 800 }}>
                  <Timer className="w-3 h-3 text-teal-600" /> HOLD
                </div>
                <strong style={{ fontSize: '16px', color: 'var(--text-primary)', marginTop: '4px', display: 'block', fontWeight: 800 }}>5 Sec</strong>
              </div>

              <div style={{ background: 'var(--bg-surface-soft)', padding: '14px 10px', borderRadius: '14px', border: '1px solid var(--border-soft)', textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '10px', color: 'var(--text-muted)', fontWeight: 800 }}>
                  <Clock className="w-3 h-3 text-teal-600" /> REST
                </div>
                <strong style={{ fontSize: '16px', color: 'var(--teal-700)', marginTop: '4px', display: 'block', fontWeight: 800 }}>30 Sec</strong>
              </div>
            </div>

            {/* Clinical Precaution Note */}
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
