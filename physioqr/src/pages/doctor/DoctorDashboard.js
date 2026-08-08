import React, { useState } from "react";
import { StatCard } from "../../components/common/StatCard";
import { MOCK_DOCTORS } from "../../mockData/doctorsData";
import { MOCK_PATIENTS } from "../../mockData/patientsData";
import { formatCurrency } from "../../utils/formatters";

export function DoctorDashboard({ activeTab = "overview" }) {
  const [doctor, setDoctor] = useState(MOCK_DOCTORS[0]);
  const referredPatients = MOCK_PATIENTS.filter((p) => p.referringDoctorId === doctor.id);

  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawalSuccess, setWithdrawalSuccess] = useState(false);

  const handleWithdrawRequest = (e) => {
    e.preventDefault();
    const amt = Number(withdrawAmount);
    if (amt > doctor.wallet.availableShare) {
      alert("Requested amount exceeds available balance!");
      return;
    }
    if (amt < 1000) {
      alert("Minimum withdrawal limit is ₹1,000 as per SRS Section 32.2!");
      return;
    }

    setDoctor({
      ...doctor,
      wallet: {
        ...doctor.wallet,
        availableShare: doctor.wallet.availableShare - amt
      }
    });
    setWithdrawalSuccess(true);
    setWithdrawAmount("");
  };

  return (
    <div className="dashboard-view">
      <div className="view-header">
        <h2>👨‍⚕️ Doctor Referral & Wallet Portal ({doctor.name})</h2>
        <p>Clinic: {doctor.clinicName} | Model: <strong>{doctor.pricingModel === "SPLIT" ? "Split Share Model (60%)" : "Platform Fee Model"}</strong></p>
      </div>

      {activeTab === "overview" && (
        <>
          <div className="stats-grid">
            <StatCard icon="👥" label="Referred Patients" value={doctor.totalReferredPatients} subtext="10 Paid & Active" />
            <StatCard icon="⌛" label="Pending Fee Share" value={formatCurrency(doctor.wallet.pendingShare)} subtext="In 15-day holding period" />
            <StatCard icon="💳" label="Available Balance" value={formatCurrency(doctor.wallet.availableShare)} type="highlight" subtext="Ready for Withdrawal" />
            <StatCard icon="📈" label="Lifetime Fee Earnings" value={formatCurrency(doctor.wallet.totalEarned)} />
          </div>

          <div className="content-card flex-row">
            <div className="qr-preview-box">
              <h3>📱 Your Referral QR Code</h3>
              <p>Patients scan this at your clinic to automatically link their rehabilitation plan to your referral profile.</p>
              <img src={doctor.qrCodeUrl} alt="Doctor QR Code" className="qr-img" />
              <p className="qr-link">Link: <code>{doctor.referralLink}</code></p>
              <button className="primary-action-btn" onClick={() => alert("QR Code downloaded for print display!")}>
                📥 Download Printable Standee QR
              </button>
            </div>

            <div className="wallet-summary-box">
              <h3>💳 Earnings & Wallet Overview</h3>
              <ul className="wallet-details-list">
                <li>
                  <span>Fee Model:</span>
                  <strong>{doctor.pricingModel}</strong>
                </li>
                <li>
                  <span>Patient Program Fee:</span>
                  <strong>{formatCurrency(doctor.patientFee)}</strong>
                </li>
                <li>
                  <span>Your Fee Share:</span>
                  <strong>{doctor.doctorSharePercentage}% ({formatCurrency(doctor.patientFee * 0.6)})</strong>
                </li>
                <li>
                  <span>Holding Period:</span>
                  <strong>{doctor.holdingPeriodDays} Days</strong>
                </li>
                <li>
                  <span>Bank Account (KYC):</span>
                  <strong>{doctor.bankDetails.bankName} ({doctor.bankDetails.accountNumber})</strong>
                </li>
              </ul>
            </div>
          </div>
        </>
      )}

      {activeTab === "patients" && (
        <div className="content-card">
          <h3>👥 Patients Referred By You (SRS Section 34)</h3>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Patient Name</th>
                <th>Mobile</th>
                <th>Pain Category</th>
                <th>Payment Status</th>
                <th>Your Fee Share</th>
              </tr>
            </thead>
            <tbody>
              {referredPatients.map((pat) => (
                <tr key={pat.id}>
                  <td><strong>{pat.name}</strong></td>
                  <td>{pat.mobile}</td>
                  <td>{pat.painCategory}</td>
                  <td>
                    <span className={`status-badge ${pat.paymentStatus.toLowerCase()}`}>
                      {pat.paymentStatus}
                    </span>
                  </td>
                  <td>{formatCurrency(pat.paidAmount * 0.6)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "wallet" && (
        <div className="content-card form-card">
          <h3>💳 Fee Share Withdrawal Request (SRS Section 32)</h3>
          <div className="balance-banner">
            <div>Available Balance for Withdrawal: <strong>{formatCurrency(doctor.wallet.availableShare)}</strong></div>
            <small>Minimum withdrawal threshold: ₹1,000 | Processing time: 3-5 days</small>
          </div>

          {withdrawalSuccess && (
            <div className="success-alert">
              ✓ Withdrawal request submitted! Sent to Admin for direct bank payout processing.
            </div>
          )}

          <form onSubmit={handleWithdrawRequest} className="simple-form">
            <div className="form-group">
              <label>Enter Withdrawal Amount (₹)</label>
              <input
                type="number"
                required
                min="1000"
                max={doctor.wallet.availableShare}
                placeholder="e.g. 1500"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Payout Bank Account</label>
              <input
                type="text"
                disabled
                value={`${doctor.bankDetails.bankName} - ${doctor.bankDetails.accountNumber} (KYC Verified)`}
              />
            </div>

            <button type="submit" className="primary-action-btn large" disabled={doctor.wallet.availableShare < 1000}>
              Submit Payout Request
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
