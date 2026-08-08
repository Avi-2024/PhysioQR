import React, { useState } from 'react';
import { ArrowUpRight, CheckCircle2, AlertCircle, Landmark, ShieldCheck } from 'lucide-react';
import { MOCK_WALLET_SUMMARY, MOCK_WITHDRAWAL_REQUESTS, MOCK_DOCTOR_PROFILE } from '../../mocks/mockDoctorData';
import { WithdrawalRequest } from '../../types/doctor.types';
import { formatCurrency, formatDate } from '../../lib/formatters';

export function WithdrawalsPage() {
  const wallet = MOCK_WALLET_SUMMARY;
  const profile = MOCK_DOCTOR_PROFILE;
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>(MOCK_WITHDRAWAL_REQUESTS);
  const [availableBalance, setAvailableBalance] = useState<number>(wallet.availableBalance);
  
  const [requestedAmount, setRequestedAmount] = useState<string>('1500');
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);

  const numAmount = Number(requestedAmount) || 0;
  const isEligible = availableBalance >= wallet.minimumWithdrawal && profile.kycStatus === 'verified';

  const handleOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (numAmount < wallet.minimumWithdrawal) {
      alert(`Minimum withdrawal limit is ₹${wallet.minimumWithdrawal}`);
      return;
    }
    if (numAmount > availableBalance) {
      alert(`Amount cannot exceed available balance of ₹${availableBalance}`);
      return;
    }
    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      const newReq: WithdrawalRequest = {
        id: `WD-${Date.now().toString().slice(-3)}`,
        amount: numAmount,
        requestDate: new Date().toISOString().split('T')[0],
        status: 'requested',
        bankAccountEnding: '4829',
        bankName: 'HDFC Bank Ltd',
        timeline: [
          { status: 'requested', date: 'Just now', note: 'Withdrawal requested by doctor' }
        ]
      };
      setWithdrawals([newReq, ...withdrawals]);
      setAvailableBalance((prev) => prev - numAmount);
      setIsSubmitting(false);
      setShowConfirmModal(false);
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 4000);
    }, 1200);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#17212B' }}>Bank Withdrawals & Payout Requests</h2>
        <p style={{ fontSize: '13.5px', color: '#5D6975', marginTop: '2px' }}>
          Transfer your available referral fee share balance directly to your verified bank account (SRS Section 32)
        </p>
      </div>

      {/* 16.1 Withdrawal Summary Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '1.25rem' }}>
        <div className="kpi-card" style={{ background: '#F1FAF8', borderLeft: '4px solid #14756E' }}>
          <span className="kpi-title" style={{ color: '#0F5F5A' }}>AVAILABLE FOR WITHDRAWAL</span>
          <div className="kpi-value" style={{ color: '#0F5F5A' }}>{formatCurrency(availableBalance)}</div>
          <div className="kpi-subtext">Withdrawable balance (Passed holding period)</div>
        </div>

        <div className="kpi-card">
          <span className="kpi-title">MINIMUM WITHDRAWAL LIMIT</span>
          <div className="kpi-value">{formatCurrency(wallet.minimumWithdrawal)}</div>
          <div className="kpi-subtext">Set by physioqr Central Admin</div>
        </div>

        <div className="kpi-card">
          <span className="kpi-title">VERIFIED BANK ACCOUNT</span>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#17212B', marginTop: '4px' }}>
            HDFC Bank Ltd
          </div>
          <div className="kpi-subtext">A/C ending in 4829 · Verified</div>
        </div>
      </div>

      {submitSuccess && (
        <div style={{ background: '#E8F8F0', color: '#0E8345', border: '1px solid #A7F3D0', padding: '12px 16px', borderRadius: '10px', fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 className="w-5 h-5" /> Withdrawal request of ₹{numAmount} submitted successfully! Expected processing: 24–48 hours.
        </div>
      )}

      {/* 16.2 Request Withdrawal Form */}
      <div className="card-section">
        <h3 className="section-card-title">Request New Payout</h3>

        <form onSubmit={handleOpenConfirm} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#5D6975', display: 'block', marginBottom: '6px' }}>Withdrawal Amount (₹) *</label>
              <input
                type="number"
                min={wallet.minimumWithdrawal}
                max={availableBalance}
                value={requestedAmount}
                onChange={(e) => setRequestedAmount(e.target.value)}
                required
                style={{ width: '100%', padding: '10px 14px', border: '1px solid #E2E8ED', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
              />
              <span style={{ fontSize: '11px', color: '#84909C', marginTop: '4px', display: 'block' }}>
                Min: ₹{wallet.minimumWithdrawal} | Max: ₹{availableBalance}
              </span>
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#5D6975', display: 'block', marginBottom: '6px' }}>Payout Destination Bank Account</label>
              <input
                type="text"
                disabled
                value="HDFC Bank Ltd — A/C ending in 4829 (KYC Verified)"
                style={{ width: '100%', padding: '10px 14px', border: '1px solid #E2E8ED', borderRadius: '8px', fontSize: '13px', background: '#F6F8FA', color: '#5D6975', cursor: 'not-allowed' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F6F8FA', padding: '12px 16px', borderRadius: '8px' }}>
            <span style={{ fontSize: '13px', color: '#5D6975' }}>Remaining Available Balance after Payout:</span>
            <strong style={{ fontSize: '15px', color: '#17212B' }}>{formatCurrency(Math.max(0, availableBalance - numAmount))}</strong>
          </div>

          <button
            type="submit"
            className="btn-primary-teal"
            disabled={!isEligible || numAmount < wallet.minimumWithdrawal || numAmount > availableBalance}
            style={{ width: 'fit-content', padding: '10px 24px' }}
          >
            <ArrowUpRight className="w-4 h-4" /> Review & Confirm Withdrawal Request
          </button>
        </form>
      </div>

      {/* 16.4 Withdrawal History & 16.5 Timeline */}
      <div className="card-section" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #E2E8ED' }}>
          <h3 className="section-card-title">Withdrawal Request History</h3>
        </div>

        <table className="enterprise-table">
          <thead>
            <tr>
              <th>Request ID</th>
              <th>Requested Amount</th>
              <th>Request Date</th>
              <th>Status</th>
              <th>Bank Account</th>
              <th>Transaction Ref</th>
            </tr>
          </thead>
          <tbody>
            {withdrawals.map((req) => (
              <tr key={req.id}>
                <td><strong>{req.id}</strong></td>
                <td><strong style={{ color: '#0F5F5A' }}>{formatCurrency(req.amount)}</strong></td>
                <td>{formatDate(req.requestDate)}</td>
                <td>
                  <span className={`badge-status ${req.status}`}>
                    {req.status.toUpperCase()}
                  </span>
                </td>
                <td>{req.bankName} (ending {req.bankAccountEnding})</td>
                <td>{req.transactionReference || 'Processing...'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 16.3 Confirmation Modal */}
      {showConfirmModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyCenter: 'center', padding: '1rem' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '16px', maxWidth: '440px', width: '100%', padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#17212B' }}>Confirm Withdrawal Request</h3>
            
            <p style={{ fontSize: '13.5px', color: '#5D6975', lineHeight: '1.5' }}>
              Submit a withdrawal request for <strong style={{ color: '#0F5F5A' }}>₹{numAmount}</strong> to the verified bank account ending in <strong>4829</strong>?
            </p>

            <div style={{ background: '#F6F8FA', padding: '12px', borderRadius: '8px', fontSize: '12.5px', color: '#5D6975', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div>• Requested Amount: <strong>₹{numAmount}</strong></div>
              <div>• Bank Account: <strong>HDFC Bank (ending 4829)</strong></div>
              <div>• Expected Processing Time: <strong>24 to 48 business hours</strong></div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px' }}>
              <button className="btn-outline" onClick={() => setShowConfirmModal(false)} disabled={isSubmitting}>
                Cancel
              </button>
              <button className="btn-primary-teal" onClick={handleConfirmSubmit} disabled={isSubmitting}>
                {isSubmitting ? 'Submitting Request...' : 'Confirm Withdrawal Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
