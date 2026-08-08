import React, { useState } from 'react';
import { Download, Share2, Copy, Printer, CheckCircle2, QrCode } from 'lucide-react';
import { MOCK_DOCTOR_PROFILE, MOCK_DASHBOARD_SUMMARY } from '../../mocks/mockDoctorData';
import { formatCurrency } from '../../lib/formatters';

export function QrReferralPage() {
  const profile = MOCK_DOCTOR_PROFILE;
  const summary = MOCK_DASHBOARD_SUMMARY;
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(profile.referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#17212B' }}>Clinic QR Code & Referral Management</h2>
        <p style={{ fontSize: '13.5px', color: '#5D6975', marginTop: '2px' }}>
          Display your scannable QR code standee at clinic reception or share digital links directly with patients
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '1.5rem' }}>
        {/* 14.1 Scannable QR & Actions */}
        <div className="card-section" style={{ alignItems: 'center', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#E8F8F0', color: '#0E8345', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700 }}>
            <CheckCircle2 className="w-4 h-4" /> QR Code Active & Verified
          </div>

          <div style={{ background: '#FFFFFF', padding: '1.5rem', borderRadius: '16px', border: '2px dashed #E2E8ED', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <img src={profile.qrCodeUrl} alt="Clinic QR Code" style={{ width: '180px', height: '180px', borderRadius: '8px' }} />
          </div>

          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#17212B' }}>{profile.name}</h3>
            <p style={{ fontSize: '13px', color: '#5D6975' }}>{profile.clinicName}</p>
            <span style={{ fontSize: '12px', color: '#0F5F5A', fontWeight: 700 }}>Referral Code: {profile.referralCode}</span>
          </div>

          <div style={{ display: 'flex', width: '100%', border: '1px solid #E2E8ED', borderRadius: '8px', overflow: 'hidden' }}>
            <input type="text" readOnly value={profile.referralLink} style={{ flex: 1, padding: '8px 12px', fontSize: '12px', border: 'none', background: '#F6F8FA', outline: 'none' }} />
            <button className="btn-primary-teal" style={{ borderRadius: 0, padding: '8px 14px', fontSize: '12px' }} onClick={handleCopy}>
              {copied ? '✓ Copied' : <><Copy className="w-3.5 h-3.5" /> Copy Link</>}
            </button>
          </div>

          <div style={{ display: 'flex', gap: '8px', width: '100%', flexWrap: 'wrap' }}>
            <button className="btn-outline" style={{ flex: 1, justifyContent: 'center', fontSize: '12px' }} onClick={() => alert('Downloading PNG...')}>
              <Download className="w-3.5 h-3.5" /> Download PNG
            </button>
            <button className="btn-outline" style={{ flex: 1, justifyContent: 'center', fontSize: '12px' }} onClick={() => alert('Printing Standee PDF...')}>
              <Printer className="w-3.5 h-3.5" /> Print Poster PDF
            </button>
          </div>
        </div>

        {/* 14.3 Referral Analytics & 14.4 Journey Explanation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Analytics Summary */}
          <div className="card-section">
            <h3 className="section-card-title">Referral Conversion Analytics</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ background: '#F6F8FA', padding: '1rem', borderRadius: '10px' }}>
                <span style={{ fontSize: '12px', color: '#5D6975', fontWeight: 600 }}>Total QR Scans</span>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#17212B', marginTop: '4px' }}>{summary.qrScans}</div>
              </div>

              <div style={{ background: '#F6F8FA', padding: '1rem', borderRadius: '10px' }}>
                <span style={{ fontSize: '12px', color: '#5D6975', fontWeight: 600 }}>Paid Patients</span>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#0F5F5A', marginTop: '4px' }}>{summary.paidPatients}</div>
              </div>

              <div style={{ background: '#F6F8FA', padding: '1rem', borderRadius: '10px' }}>
                <span style={{ fontSize: '12px', color: '#5D6975', fontWeight: 600 }}>Scan-to-Registration Rate</span>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#17212B', marginTop: '4px' }}>{summary.scanToRegistrationRate}%</div>
              </div>

              <div style={{ background: '#F6F8FA', padding: '1rem', borderRadius: '10px' }}>
                <span style={{ fontSize: '12px', color: '#5D6975', fontWeight: 600 }}>Revenue Generated</span>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#0E8345', marginTop: '4px' }}>{formatCurrency(summary.revenueGenerated)}</div>
              </div>
            </div>
          </div>

          {/* 14.4 Referral Journey Visual */}
          <div className="card-section" style={{ background: '#F1FAF8', border: '1px solid #DDF3F0' }}>
            <h3 className="section-card-title" style={{ color: '#0F5F5A' }}>How Doctor Referral Works</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#14756E', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '13px' }}>1</div>
                <div>
                  <strong style={{ fontSize: '13.5px', color: '#17212B' }}>Patient Scans QR Code</strong>
                  <p style={{ fontSize: '12px', color: '#5D6975' }}>Patient scans clinic standee or opens referral link.</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#14756E', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '13px' }}>2</div>
                <div>
                  <strong style={{ fontSize: '13.5px', color: '#17212B' }}>Patient Registers & Pays Fee</strong>
                  <p style={{ fontSize: '12px', color: '#5D6975' }}>Patient completes assessment and pays ₹500 for day-wise exercise videos.</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#14756E', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '13px' }}>3</div>
                <div>
                  <strong style={{ fontSize: '13.5px', color: '#17212B' }}>Doctor Earns 60% Commission</strong>
                  <p style={{ fontSize: '12px', color: '#5D6975' }}>₹300 fee share credited to doctor wallet (available after 15-day holding period).</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
