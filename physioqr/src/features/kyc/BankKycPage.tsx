import React from 'react';
import { ShieldCheck, CheckCircle2, Lock, FileText, Landmark } from 'lucide-react';
import { MOCK_DOCTOR_PROFILE } from '../../mocks/mockDoctorData';

export function BankKycPage() {
  const profile = MOCK_DOCTOR_PROFILE;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#17212B' }}>Bank Details & KYC Verification</h2>
        <p style={{ fontSize: '13.5px', color: '#5D6975', marginTop: '2px' }}>
          Verified medical registration and encrypted bank details required for payout disbursal (SRS Section 29)
        </p>
      </div>

      {/* 17.1 Verification Status Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
        <div className="card-section" style={{ padding: '1rem' }}>
          <span style={{ fontSize: '12px', color: '#5D6975', fontWeight: 600 }}>MEDICAL REGISTRATION</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', color: '#0E8345', fontWeight: 700, fontSize: '13px' }}>
            <CheckCircle2 className="w-4 h-4" /> MCI Verified
          </div>
        </div>

        <div className="card-section" style={{ padding: '1rem' }}>
          <span style={{ fontSize: '12px', color: '#5D6975', fontWeight: 600 }}>IDENTITY & PAN</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', color: '#0E8345', fontWeight: 700, fontSize: '13px' }}>
            <CheckCircle2 className="w-4 h-4" /> PAN Approved
          </div>
        </div>

        <div className="card-section" style={{ padding: '1rem' }}>
          <span style={{ fontSize: '12px', color: '#5D6975', fontWeight: 600 }}>BANK ACCOUNT</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', color: '#0E8345', fontWeight: 700, fontSize: '13px' }}>
            <CheckCircle2 className="w-4 h-4" /> Bank Verified
          </div>
        </div>

        <div className="card-section" style={{ padding: '1rem' }}>
          <span style={{ fontSize: '12px', color: '#5D6975', fontWeight: 600 }}>CANCELLED CHEQUE</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', color: '#0E8345', fontWeight: 700, fontSize: '13px' }}>
            <CheckCircle2 className="w-4 h-4" /> Document Verified
          </div>
        </div>
      </div>

      {/* 17.2 Bank Details Form (Masked & Read-only after verification) */}
      <div className="card-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="section-card-title">Verified Bank Payout Account</h3>
          <span className="badge-status verified">✓ Payout Active</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#5D6975', display: 'block', marginBottom: '6px' }}>Account Holder Name</label>
            <input type="text" disabled value={profile.name} style={{ width: '100%', padding: '10px 14px', border: '1px solid #E2E8ED', borderRadius: '8px', fontSize: '13.5px', background: '#F6F8FA', outline: 'none' }} />
          </div>

          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#5D6975', display: 'block', marginBottom: '6px' }}>Bank Name</label>
            <input type="text" disabled value="HDFC Bank Ltd" style={{ width: '100%', padding: '10px 14px', border: '1px solid #E2E8ED', borderRadius: '8px', fontSize: '13.5px', background: '#F6F8FA', outline: 'none' }} />
          </div>

          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#5D6975', display: 'block', marginBottom: '6px' }}>Account Number</label>
            <input type="text" disabled value="XXXX-XXXX-4829" style={{ width: '100%', padding: '10px 14px', border: '1px solid #E2E8ED', borderRadius: '8px', fontSize: '13.5px', background: '#F6F8FA', outline: 'none' }} />
          </div>

          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#5D6975', display: 'block', marginBottom: '6px' }}>IFSC Code</label>
            <input type="text" disabled value="HDFC0000241" style={{ width: '100%', padding: '10px 14px', border: '1px solid #E2E8ED', borderRadius: '8px', fontSize: '13.5px', background: '#F6F8FA', outline: 'none' }} />
          </div>
        </div>

        <div style={{ background: '#F1FAF8', border: '1px solid #DDF3F0', padding: '12px 16px', borderRadius: '8px', fontSize: '12.5px', color: '#0F5F5A', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Lock className="w-4 h-4" />
          <span>Your bank details are encrypted. To update your payout bank account, contact central support for identity re-verification.</span>
        </div>
      </div>
    </div>
  );
}
