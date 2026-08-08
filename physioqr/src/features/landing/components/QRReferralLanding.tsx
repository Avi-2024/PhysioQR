import React, { useState } from 'react';
import { QrCode, Stethoscope, CheckCircle2, ShieldCheck, ArrowRight, HeartPulse } from 'lucide-react';
import { MOCK_DOCTOR_PROFILE } from '../../../mocks/mockDoctorData';

interface QRReferralLandingProps {
  doctorCode?: string;
  onCompleteLogin: () => void;
  onBackToMain: () => void;
}

export function QRReferralLanding({ doctorCode = 'DR001', onCompleteLogin, onBackToMain }: QRReferralLandingProps) {
  const doctor = MOCK_DOCTOR_PROFILE;
  const [mobileNumber, setMobileNumber] = useState('');
  const [step, setStep] = useState<'mobile' | 'otp'>('mobile');
  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (mobileNumber.length < 10) {
      alert('Please enter a valid 10-digit mobile number');
      return;
    }
    setStep('otp');
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      onCompleteLogin();
    }, 1000);
  };

  return (
    <div style={{ background: 'var(--bg-page)', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div
        className="rc-card"
        style={{
          maxWidth: '480px',
          width: '100%',
          padding: '32px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          boxShadow: 'var(--shadow-elevated)',
          border: '1.5px solid var(--teal-200)',
          background: '#FFFFFF'
        }}
      >
        {/* Top Branding */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-default)', paddingBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--teal-600)', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>+</div>
            <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--teal-950)' }}>PhysioQR</span>
          </div>

          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--success-text)', background: 'var(--success-bg)', padding: '4px 10px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>QR Verified</span>
          </span>
        </div>

        {/* Section 23: Referred by Doctor Box */}
        <div style={{ background: 'var(--teal-50)', border: '1px solid var(--teal-200)', borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--teal-700)', textTransform: 'uppercase' }}>OFFICIAL DOCTOR REFERRAL</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'var(--teal-600)', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>DR</div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--teal-950)' }}>Referred by {doctor.name}</h2>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{doctor.clinicName}</div>
            </div>
          </div>

          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5', marginTop: '4px' }}>
            Your doctor has invited you to begin your structured PhysioQR rehabilitation exercise programme.
          </p>
        </div>

        {/* Patient Mobile + OTP Form Flow */}
        {step === 'mobile' ? (
          <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>Enter Your Mobile Number *</label>
              <div style={{ display: 'flex', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-input)', overflow: 'hidden' }}>
                <span style={{ padding: '10px 14px', background: 'var(--bg-surface-soft)', fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary)', borderRight: '1px solid var(--border-default)' }}>+91</span>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  placeholder="98765 43210"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', fontSize: '15px', border: 'none', outline: 'none' }}
                />
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                We'll send a 4-digit OTP to verify your mobile number.
              </span>
            </div>

            <button type="submit" className="rc-btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
              <span>Continue with Mobile Number</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>Enter 4-Digit OTP *</label>
              <input
                type="text"
                required
                maxLength={4}
                placeholder="4321"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                style={{ width: '100%', padding: '12px 14px', fontSize: '18px', fontWeight: 800, textAlign: 'center', letterSpacing: '8px', border: '1.5px solid var(--teal-600)', borderRadius: 'var(--radius-input)', outline: 'none' }}
              />
              <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px', display: 'block', textAlign: 'center' }}>
                OTP sent to +91 {mobileNumber}
              </span>
            </div>

            <button type="submit" className="rc-btn-primary" disabled={isVerifying} style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
              {isVerifying ? 'Verifying OTP...' : 'Verify & Open Patient Programme'}
            </button>

            <button
              type="button"
              onClick={() => setStep('mobile')}
              style={{ border: 'none', background: 'transparent', color: 'var(--teal-700)', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer' }}
            >
              Change Mobile Number
            </button>
          </form>
        )}

        <div style={{ textAlign: 'center', paddingTop: '12px', borderTop: '1px solid var(--border-default)' }}>
          <button
            onClick={onBackToMain}
            style={{ border: 'none', background: 'transparent', color: 'var(--text-muted)', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer' }}
          >
            ← Return to RehabCare Main Site
          </button>
        </div>
      </div>
    </div>
  );
}
