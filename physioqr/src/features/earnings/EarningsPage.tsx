import React from 'react';
import { Wallet, Info, HelpCircle } from 'lucide-react';
import { MOCK_WALLET_SUMMARY, MOCK_REFERRAL_PATIENTS } from '../../mocks/mockDoctorData';
import { formatCurrency, formatDate } from '../../lib/formatters';

export function EarningsPage() {
  const wallet = MOCK_WALLET_SUMMARY;
  const commissions = MOCK_REFERRAL_PATIENTS;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#17212B' }}>Financial & Earnings Overview</h2>
        <p style={{ fontSize: '13.5px', color: '#5D6975', marginTop: '2px' }}>
          Transparent tracking of earned referral fee shares, holding periods, and payout eligibility (SRS Section 22.1 & 31)
        </p>
      </div>

      {/* 15.1 Earnings Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem' }}>
        <div className="kpi-card">
          <span className="kpi-title">LIFETIME EARNED</span>
          <div className="kpi-value">{formatCurrency(wallet.lifetimeCommission)}</div>
          <div className="kpi-subtext">Total 60% fee share credited</div>
        </div>

        <div className="kpi-card" style={{ background: '#F1FAF8', borderLeft: '4px solid #14756E' }}>
          <span className="kpi-title" style={{ color: '#0F5F5A' }}>AVAILABLE FOR WITHDRAWAL</span>
          <div className="kpi-value" style={{ color: '#0F5F5A' }}>{formatCurrency(wallet.availableBalance)}</div>
          <div className="kpi-subtext">Passed 15-day holding period</div>
        </div>

        <div className="kpi-card">
          <span className="kpi-title">PENDING COMMISSION</span>
          <div className="kpi-value" style={{ color: '#B45309' }}>{formatCurrency(wallet.pendingCommission)}</div>
          <div className="kpi-subtext">In 15-day clinical holding period</div>
        </div>

        <div className="kpi-card">
          <span className="kpi-title">ALREADY PAID TO BANK</span>
          <div className="kpi-value" style={{ color: '#0E8345' }}>{formatCurrency(wallet.paidCommission)}</div>
          <div className="kpi-subtext">Transferred to HDFC Bank A/C</div>
        </div>
      </div>

      {/* 15.4 Commission Rules Explanation Banner */}
      <div className="card-section" style={{ background: '#F1FAF8', border: '1px solid #DDF3F0', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Info className="w-5 h-5" style={{ color: '#0F5F5A', flexShrink: 0 }} />
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#0F5F5A' }}>How Your Commission is Calculated</h4>
            <p style={{ fontSize: '12.5px', color: '#5D6975', marginTop: '2px' }}>
              Your assigned rate is <strong>60% of the patient program fee (₹500) = ₹300 per paid patient</strong>. Commission becomes available for withdrawal 15 days after patient payment.
            </p>
          </div>
        </div>
      </div>

      {/* 15.3 Commission Breakdown Table */}
      <div className="card-section" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #E2E8ED', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="section-card-title">Commission Ledger Breakdown</h3>
          <span style={{ fontSize: '12px', color: '#5D6975' }}>5 total ledger entries</span>
        </div>

        <table className="enterprise-table">
          <thead>
            <tr>
              <th>Patient</th>
              <th>Payment Date</th>
              <th>Patient Fee</th>
              <th>Rate</th>
              <th>Doctor Commission</th>
              <th>Available Release Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {commissions.map((item) => (
              <tr key={item.id}>
                <td>
                  <strong>{item.name}</strong>
                  <div style={{ fontSize: '11px', color: '#84909C' }}>{item.mobileMasked}</div>
                </td>
                <td>{formatDate(item.registrationDate)}</td>
                <td>{formatCurrency(item.paymentAmount)}</td>
                <td>{wallet.commissionPercentage}%</td>
                <td>
                  <strong style={{ color: '#0F5F5A' }}>{formatCurrency(item.commissionAmount)}</strong>
                </td>
                <td>{item.releaseDate ? formatDate(item.releaseDate) : 'N/A'}</td>
                <td>
                  <span className={`badge-status ${item.commissionStatus}`}>
                    {item.commissionStatus.toUpperCase()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
