import React from 'react';
import {
  QrCode,
  Users,
  TrendingUp,
  Wallet,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Share2,
  Download,
  AlertTriangle
} from 'lucide-react';
import {
  MOCK_DOCTOR_PROFILE,
  MOCK_DASHBOARD_SUMMARY,
  MOCK_REFERRAL_PATIENTS,
  MOCK_WITHDRAWAL_REQUESTS
} from '../../mocks/mockDoctorData';
import { formatCurrency, formatDate } from '../../lib/formatters';

interface DoctorDashboardOverviewPageProps {
  onNavigate: (screen: string) => void;
}

export function DoctorDashboardOverviewPage({ onNavigate }: DoctorDashboardOverviewPageProps) {
  const profile = MOCK_DOCTOR_PROFILE;
  const summary = MOCK_DASHBOARD_SUMMARY;
  const recentPatients = MOCK_REFERRAL_PATIENTS.slice(0, 4);
  const latestWithdrawal = MOCK_WITHDRAWAL_REQUESTS[0];

  const handleCopyLink = () => {
    navigator.clipboard.writeText(profile.referralLink);
    alert('Referral link copied to clipboard!');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* 12.1 Dashboard Header */}
      <div style={{ display: 'flex', justify: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#17212B' }}>Good afternoon, {profile.name}</h2>
          <p style={{ fontSize: '14px', color: '#5D6975', marginTop: '2px' }}>
            Your referral activity is performing well. 3 new patients completed payment this week.
          </p>
        </div>

        {/* 12.2 Primary Actions */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-primary-teal" onClick={() => onNavigate('qr')}>
            <QrCode className="w-4 h-4" /> Share QR Code
          </button>
          <button className="btn-outline" onClick={() => onNavigate('patients')}>
            <Users className="w-4 h-4" /> View Referred Patients
          </button>
          <button
            className="btn-outline"
            style={{ color: '#0F5F5A', borderColor: '#14756E', fontWeight: 700 }}
            onClick={() => onNavigate('withdrawals')}
          >
            <ArrowUpRight className="w-4 h-4" /> Request Withdrawal
          </button>
        </div>
      </div>

      {/* 12.3 Critical Status Strip (Action required area - only when action is needed) */}
      {profile.kycStatus !== 'verified' && (
        <div className="status-strip-banner">
          <div className="status-strip-left">
            <AlertTriangle className="w-5 h-5" />
            <span>Identity or Bank Verification pending. Complete KYC to enable withdrawals.</span>
          </div>
          <button className="btn-primary-teal" style={{ padding: '6px 14px', fontSize: '13px' }} onClick={() => onNavigate('kyc')}>
            Complete Verification
          </button>
        </div>
      )}

      {/* 12.4 KPI Summary (4 Primary Cards Max) */}
      <div className="kpi-grid-4">
        <div className="kpi-card" onClick={() => onNavigate('patients')} style={{ cursor: 'pointer' }}>
          <div className="kpi-card-header">
            <span className="kpi-title">TOTAL REFERRALS</span>
            <Users className="w-5 h-5 text-teal-600" />
          </div>
          <div className="kpi-value">{summary.registeredPatients}</div>
          <div className="kpi-subtext">39.7% from {summary.qrScans} QR scans</div>
        </div>

        <div className="kpi-card" onClick={() => onNavigate('patients')} style={{ cursor: 'pointer' }}>
          <div className="kpi-card-header">
            <span className="kpi-title">PAID PATIENTS</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="kpi-value">{summary.paidPatients}</div>
          <div className="kpi-subtext">{summary.conversionRate}% registration-to-paid conversion</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-title">REVENUE GENERATED</span>
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
          <div className="kpi-value">{formatCurrency(summary.revenueGenerated)}</div>
          <div className="kpi-subtext">Gross patient program payments</div>
        </div>

        <div className="kpi-card" style={{ borderLeft: '4px solid #14756E', background: '#F1FAF8' }} onClick={() => onNavigate('withdrawals')}>
          <div className="kpi-card-header">
            <span className="kpi-title" style={{ color: '#0F5F5A' }}>AVAILABLE COMMISSION</span>
            <Wallet className="w-5 h-5" style={{ color: '#0F5F5A' }} />
          </div>
          <div className="kpi-value" style={{ color: '#0F5F5A' }}>{formatCurrency(summary.availableCommission)}</div>
          <div className="kpi-subtext">Withdrawable immediately · Min ₹1,000</div>
        </div>
      </div>

      {/* Grid Row 2: Referral Funnel & Earnings Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.25rem' }}>
        {/* 12.5 Referral Funnel */}
        <div className="card-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="section-card-title">Referral Performance Funnel</h3>
            <span style={{ fontSize: '12px', color: '#5D6975', fontWeight: 600 }}>Last 30 Days</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { stage: '1. QR Code Scans', count: summary.qrScans, pct: '100%' },
              { stage: '2. Patient Registrations', count: summary.registeredPatients, pct: '39.7% conversion' },
              { stage: '3. Clinical Assessments Completed', count: 52, pct: '89.6% conversion' },
              { stage: '4. Payments Completed', count: summary.paidPatients, pct: '78.8% conversion' },
              { stage: '5. Programs Activated', count: 41, pct: '100% activation' },
            ].map((step, idx) => (
              <div key={idx} style={{ background: '#F6F8FA', padding: '10px 14px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#17212B' }}>{step.stage}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <strong style={{ fontSize: '15px', color: '#0F5F5A' }}>{step.count}</strong>
                  <span style={{ fontSize: '11px', background: '#DDF3F0', color: '#0F5F5A', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                    {step.pct}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 12.7 Commission Release Information & Financial Summary */}
        <div className="card-section" style={{ background: '#F1FAF8', border: '1px solid #DDF3F0' }}>
          <h3 className="section-card-title" style={{ color: '#0F5F5A' }}>Commission Rules & Status</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justify: 'space-between', borderBottom: '1px solid #DDF3F0', paddingBottom: '8px', fontSize: '13px' }}>
              <span style={{ color: '#5D6975' }}>Commission Rate:</span>
              <strong style={{ color: '#0F5F5A' }}>{profile.commissionPercentage}% of patient fee</strong>
            </div>

            <div style={{ display: 'flex', justify: 'space-between', borderBottom: '1px solid #DDF3F0', paddingBottom: '8px', fontSize: '13px' }}>
              <span style={{ color: '#5D6975' }}>Holding Period:</span>
              <strong style={{ color: '#0F5F5A' }}>{profile.holdingPeriodDays} days after payment</strong>
            </div>

            <div style={{ display: 'flex', justify: 'space-between', borderBottom: '1px solid #DDF3F0', paddingBottom: '8px', fontSize: '13px' }}>
              <span style={{ color: '#5D6975' }}>Pending Commission:</span>
              <strong style={{ color: '#B45309' }}>{formatCurrency(summary.pendingCommission)}</strong>
            </div>

            <div style={{ display: 'flex', justify: 'space-between', paddingTop: '4px', fontSize: '14px' }}>
              <span style={{ fontWeight: 700, color: '#17212B' }}>Available Balance:</span>
              <strong style={{ fontSize: '18px', color: '#0F5F5A' }}>{formatCurrency(summary.availableCommission)}</strong>
            </div>

            <button className="btn-primary-teal" style={{ width: '100%', justifyContent: 'center', marginTop: '6px' }} onClick={() => onNavigate('withdrawals')}>
              Request Bank Payout →
            </button>
          </div>
        </div>
      </div>

      {/* Grid Row 3: Recent Patients & QR Card */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '1.25rem' }}>
        {/* 12.8 Recent Patients Table */}
        <div className="card-section">
          <div style={{ display: 'flex', justify: 'space-between', alignItems: 'center' }}>
            <h3 className="section-card-title">Recent Referrals</h3>
            <button className="btn-outline" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => onNavigate('patients')}>
              View All Patients →
            </button>
          </div>

          <table className="enterprise-table">
            <thead>
              <tr>
                <th>Patient Name</th>
                <th>Pain Category</th>
                <th>Payment Status</th>
                <th>Commission</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {recentPatients.map((pat) => (
                <tr key={pat.id}>
                  <td>
                    <strong>{pat.name}</strong>
                    <div style={{ fontSize: '11px', color: '#84909C' }}>{pat.mobileMasked} · {formatDate(pat.registrationDate)}</div>
                  </td>
                  <td>{pat.painCategory}</td>
                  <td>
                    <span className={`badge-status ${pat.paymentStatus}`}>
                      {pat.paymentStatus.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <strong>{formatCurrency(pat.commissionAmount)}</strong>
                    <div style={{ fontSize: '11px', color: '#84909C' }}>{pat.commissionStatus}</div>
                  </td>
                  <td>
                    <button className="btn-outline" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => onNavigate('patients')}>
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 12.10 QR Performance Card */}
        <div className="card-section">
          <h3 className="section-card-title">Clinic QR Code</h3>

          <div style={{ background: '#F6F8FA', border: '1px border-dashed #E2E8ED', borderRadius: '10px', padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <img src={profile.qrCodeUrl} alt="Clinic QR" style={{ width: '140px', height: '140px', borderRadius: '8px', border: '2px solid #FFFFFF' }} />
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#17212B' }}>{profile.clinicName}</span>

            <div style={{ display: 'flex', gap: '6px', width: '100%' }}>
              <button className="btn-primary-teal" style={{ flex: 1, padding: '6px', fontSize: '12px', justifyContent: 'center' }} onClick={handleCopyLink}>
                <Copy className="w-3.5 h-3.5" /> Copy Link
              </button>
              <button className="btn-outline" style={{ flex: 1, padding: '6px', fontSize: '12px', justifyContent: 'center' }} onClick={() => onNavigate('qr')}>
                <QrCode className="w-3.5 h-3.5" /> Print QR
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
