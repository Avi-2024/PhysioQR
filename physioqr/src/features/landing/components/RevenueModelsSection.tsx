import React from 'react';
import { Wallet, Check, ArrowRight } from 'lucide-react';

export function RevenueModelsSection() {
  return (
    <section
      className="rc-section"
      style={{
        background: 'linear-gradient(180deg, #FFFFFF 0%, #F2FAF8 100%)',
        borderBottom: '1px solid var(--border-default)'
      }}
    >
      <div className="rc-container">
        {/* Header */}
        <div style={{ textAlign: 'center', maxWidth: '680px', margin: '0 auto 48px auto' }}>
          <span className="rc-eyebrow">COMMERCIAL TRANSPARENCY</span>
          <h2 className="rc-heading-section" style={{ marginTop: '8px', marginBottom: '12px' }}>
            Flexible payment models for different clinic workflows
          </h2>
          <p className="rc-subheading">
            PhysioQR supports two clear commercial structures depending on how the doctor prefers to manage their professional fees.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', maxWidth: '1040px', margin: '0 auto' }} className="rc-responsive-grid-2 grid-cols-1 md:grid-cols-2">
          {/* Split Model Card (Section 49) */}
          <div className="rc-card" style={{ background: '#FFFFFF', padding: 'clamp(18px, 3vw, 32px)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--teal-700)', background: 'var(--teal-100)', padding: '4px 12px', borderRadius: '12px' }}>
                SPLIT MODEL
              </span>
              <Wallet className="w-5 h-5 text-teal-600" />
            </div>

            <div>
              <h3 style={{ fontSize: 'clamp(18px, 1.8vw, 20px)', fontWeight: 800, color: 'var(--teal-950)', marginBottom: '6px' }}>One online payment. Clearly shared.</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                The patient pays the complete Rehabilitation Programme Fee online. The amount is shared according to the approved fee-share configuration.
              </p>
            </div>

            {/* Visual Breakdown Diagram (Section 49) */}
            <div style={{ background: 'var(--teal-50)', border: '1px solid var(--teal-200)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 800, color: 'var(--teal-950)', borderBottom: '1px solid var(--teal-200)', paddingBottom: '8px' }}>
                <span>Patient Online Payment</span>
                <span>₹500</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '12.5px', color: 'var(--teal-800)', paddingLeft: '12px', flexWrap: 'wrap' }}>
                <span>├── Doctor Programme Fee Share (60%)</span>
                <strong>₹300</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '12.5px', color: 'var(--text-secondary)', paddingLeft: '12px', flexWrap: 'wrap' }}>
                <span>└── PhysioQR Platform Share (40%)</span>
                <strong>₹200</strong>
              </div>
            </div>

            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13.5px', color: 'var(--text-secondary)' }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Check className="w-4 h-4 text-teal-600" /> Monthly bank withdrawal requests</li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Check className="w-4 h-4 text-teal-600" /> Transparent wallet ledger with 15-day holding release</li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Check className="w-4 h-4 text-teal-600" /> Automated patient digital receipt generation</li>
            </ul>
          </div>

          {/* Platform Fee Model Card (Section 50) */}
          <div className="rc-card" style={{ background: '#FFFFFF', padding: 'clamp(18px, 3vw, 32px)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', background: 'var(--bg-surface-soft)', padding: '4px 12px', borderRadius: '12px' }}>
                PLATFORM FEE MODEL
              </span>
              <Wallet className="w-5 h-5 text-gray-500" />
            </div>

            <div>
              <h3 style={{ fontSize: 'clamp(18px, 1.8vw, 20px)', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>Clinic fee stays with the doctor.</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                The doctor collects their own professional clinic consultation fee separately, while the patient pays only the PhysioQR digital platform fee online.
              </p>
            </div>

            {/* Visual Diagram (Section 50) */}
            <div style={{ background: 'var(--bg-surface-soft)', border: '1px solid var(--border-default)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)', flexWrap: 'wrap' }}>
                <span>Doctor Clinic Consultation Fee</span>
                <span>Collected Separately</span>
              </div>
              <div style={{ textAlign: 'center', fontSize: '14px', fontWeight: 800, color: 'var(--teal-600)' }}>+</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '13px', fontWeight: 800, color: 'var(--teal-800)', flexWrap: 'wrap' }}>
                <span>PhysioQR Digital Platform Fee</span>
                <span>Paid Online</span>
              </div>
            </div>

            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13.5px', color: 'var(--text-secondary)' }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Check className="w-4 h-4 text-teal-600" /> Direct clinic collection by doctor</li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Check className="w-4 h-4 text-teal-600" /> Simplified digital access fee for patient</li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Check className="w-4 h-4 text-teal-600" /> Full patient activity & referral tracking</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
