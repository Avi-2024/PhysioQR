import React from 'react';
import { UserRound, Lock, Info } from 'lucide-react';
import { MOCK_DOCTOR_PROFILE } from '../../mocks/mockDoctorData';
import { formatCurrency } from '../../lib/formatters';

export function DoctorProfilePage() {
  const profile = MOCK_DOCTOR_PROFILE;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#17212B' }}>Doctor Profile & Settings</h2>
        <p style={{ fontSize: '13.5px', color: '#5D6975', marginTop: '2px' }}>
          Personal, professional, clinic information and assigned referral program settings
        </p>
      </div>

      {/* Section 1: Doctor Credentials */}
      <div className="card-section">
        <h3 className="section-card-title">1. Personal & Professional Details</h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#5D6975', display: 'block', marginBottom: '4px' }}>Full Name</label>
            <input type="text" disabled value={profile.name} style={{ width: '100%', padding: '10px 14px', border: '1px solid #E2E8ED', borderRadius: '8px', fontSize: '13.5px', background: '#F6F8FA', outline: 'none' }} />
          </div>

          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#5D6975', display: 'block', marginBottom: '4px' }}>Email Address</label>
            <input type="text" disabled value={profile.email} style={{ width: '100%', padding: '10px 14px', border: '1px solid #E2E8ED', borderRadius: '8px', fontSize: '13.5px', background: '#F6F8FA', outline: 'none' }} />
          </div>

          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#5D6975', display: 'block', marginBottom: '4px' }}>Qualification</label>
            <input type="text" disabled value={profile.qualification} style={{ width: '100%', padding: '10px 14px', border: '1px solid #E2E8ED', borderRadius: '8px', fontSize: '13.5px', background: '#F6F8FA', outline: 'none' }} />
          </div>

          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#5D6975', display: 'block', marginBottom: '4px' }}>Medical Council Registration</label>
            <input type="text" disabled value={`${profile.registrationNumber} (${profile.medicalCouncil})`} style={{ width: '100%', padding: '10px 14px', border: '1px solid #E2E8ED', borderRadius: '8px', fontSize: '13.5px', background: '#F6F8FA', outline: 'none' }} />
          </div>
        </div>
      </div>

      {/* Section 2: Read-Only Referral Program Settings (Admin Managed) */}
      <div className="card-section" style={{ background: '#F1FAF8', border: '1px solid #DDF3F0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Lock className="w-5 h-5" style={{ color: '#0F5F5A' }} />
          <h3 className="section-card-title" style={{ color: '#0F5F5A' }}>Referral Program Settings (Admin Controlled)</h3>
        </div>

        <p style={{ fontSize: '12.5px', color: '#5D6975' }}>
          These financial parameters are configured by physioqr Central Admin. Contact support to request any changes.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginTop: '4px' }}>
          <div style={{ background: '#FFFFFF', padding: '1rem', borderRadius: '8px', border: '1px solid #DDF3F0' }}>
            <span style={{ fontSize: '11px', color: '#5D6975', fontWeight: 600 }}>PATIENT PROGRAM FEE</span>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#0F5F5A', marginTop: '4px' }}>{formatCurrency(profile.patientFee)}</div>
          </div>

          <div style={{ background: '#FFFFFF', padding: '1rem', borderRadius: '8px', border: '1px solid #DDF3F0' }}>
            <span style={{ fontSize: '11px', color: '#5D6975', fontWeight: 600 }}>DOCTOR COMMISSION</span>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#0F5F5A', marginTop: '4px' }}>{profile.commissionPercentage}% (₹300)</div>
          </div>

          <div style={{ background: '#FFFFFF', padding: '1rem', borderRadius: '8px', border: '1px solid #DDF3F0' }}>
            <span style={{ fontSize: '11px', color: '#5D6975', fontWeight: 600 }}>HOLDING PERIOD</span>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#0F5F5A', marginTop: '4px' }}>{profile.holdingPeriodDays} Days</div>
          </div>

          <div style={{ background: '#FFFFFF', padding: '1rem', borderRadius: '8px', border: '1px solid #DDF3F0' }}>
            <span style={{ fontSize: '11px', color: '#5D6975', fontWeight: 600 }}>MIN WITHDRAWAL</span>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#0F5F5A', marginTop: '4px' }}>{formatCurrency(profile.minimumWithdrawalAmount)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
