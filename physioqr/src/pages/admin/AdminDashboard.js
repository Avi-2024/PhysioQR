import React, { useState } from "react";
import { StatCard } from "../../components/common/StatCard";
import { MOCK_DOCTORS } from "../../mockData/doctorsData";
import { MOCK_AGENTS } from "../../mockData/agentsData";
import { MOCK_PATIENTS } from "../../mockData/patientsData";
import { MOCK_PAYOUT_REQUESTS } from "../../mockData/walletData";
import { formatCurrency } from "../../utils/formatters";
import { calculateSplitModelEarnings } from "../../utils/feeCalculator";

export function AdminDashboard({ activeTab = "overview" }) {
  const [doctors, setDoctors] = useState(MOCK_DOCTORS);
  const [payouts, setPayouts] = useState(MOCK_PAYOUT_REQUESTS);

  const handleApproveDoctor = (id) => {
    setDoctors(
      doctors.map((d) =>
        d.id === id ? { ...d, status: "Approved" } : d
      )
    );
  };

  const handleProcessPayout = (id) => {
    setPayouts(
      payouts.map((p) =>
        p.id === id
          ? { ...p, status: "Paid", transactionRef: `UTR${Math.floor(Math.random() * 90000000 + 10000000)}` }
          : p
      )
    );
  };

  return (
    <div className="dashboard-view">
      <div className="view-header">
        <h2>🛡️ Central Admin Management Panel</h2>
        <p>Full control over agents, doctors, pricing models, payouts, and compliance (SRS Section 3.1)</p>
      </div>

      {activeTab === "overview" && (
        <>
          <div className="stats-grid">
            <StatCard icon="👨‍⚕️" label="Total Registered Doctors" value={doctors.length} subtext="2 Pending Approval" />
            <StatCard icon="👔" label="Active Field Agents" value={MOCK_AGENTS.length} subtext="Target: 10 doctors/month" />
            <StatCard icon="👥" label="Total Patients Onboarded" value={MOCK_PATIENTS.length} subtext="83% Payment conversion" />
            <StatCard icon="💰" label="Gross Revenue Generated" value={formatCurrency(4500)} type="highlight" />
          </div>

          <div className="content-card">
            <h3>Recent System Activity & Financial Split Summary</h3>
            <p className="card-subtitle">Showing fee distributions between Doctor Wallets & PhysioQR Platform</p>
            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Doctor</th>
                    <th>Pricing Model</th>
                    <th>Patient Fee</th>
                    <th>Doctor Fee Share</th>
                    <th>PhysioQR Share</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {doctors.map((doc) => {
                    const split = calculateSplitModelEarnings(doc.patientFee, doc.doctorSharePercentage);
                    return (
                      <tr key={doc.id}>
                        <td>
                          <strong>{doc.name}</strong> <br />
                          <small>{doc.clinicName} ({doc.city})</small>
                        </td>
                        <td>
                          <span className={`badge-pill ${doc.pricingModel === "SPLIT" ? "blue" : "purple"}`}>
                            {doc.pricingModel === "SPLIT" ? "Split Model" : "Platform Fee Model"}
                          </span>
                        </td>
                        <td>{formatCurrency(doc.patientFee)}</td>
                        <td>
                          {doc.pricingModel === "SPLIT"
                            ? `${split.doctorSharePercentage}% (${formatCurrency(split.doctorShareAmount)})`
                            : "Direct Collection by Doctor"}
                        </td>
                        <td>
                          {doc.pricingModel === "SPLIT"
                            ? formatCurrency(split.platformShareAmount)
                            : formatCurrency(doc.platformFee)}
                        </td>
                        <td>
                          <span className={`status-badge ${doc.status.toLowerCase()}`}>
                            {doc.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === "doctors" && (
        <div className="content-card">
          <h3>👨‍⚕️ Doctor Onboarding & Approval Requests</h3>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Doctor Details</th>
                <th>Specialization</th>
                <th>Assigned Agent</th>
                <th>Pricing Model</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {doctors.map((doc) => (
                <tr key={doc.id}>
                  <td>
                    <strong>{doc.name}</strong> ({doc.id})<br />
                    <small>{doc.clinicName}</small>
                  </td>
                  <td>{doc.specialization}</td>
                  <td>{doc.agentName}</td>
                  <td>{doc.pricingModel} ({formatCurrency(doc.patientFee)})</td>
                  <td>
                    {doc.status === "Pending" ? (
                      <button className="primary-action-btn" onClick={() => handleApproveDoctor(doc.id)}>
                        ✓ Approve & Generate QR
                      </button>
                    ) : (
                      <span className="status-badge approved">Approved</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "wallets" && (
        <div className="content-card">
          <h3>💰 Doctor Fee Share Payout Requests (SRS Section 32)</h3>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Request ID</th>
                <th>Doctor Name</th>
                <th>Requested Amount</th>
                <th>Bank Details</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((po) => (
                <tr key={po.id}>
                  <td>{po.id}</td>
                  <td>{po.doctorName}</td>
                  <td><strong>{formatCurrency(po.requestedAmount)}</strong></td>
                  <td>{po.bankName} ({po.accountNumberMasked})</td>
                  <td>
                    <span className={`status-badge ${po.status.toLowerCase().replace(" ", "-")}`}>
                      {po.status}
                    </span>
                  </td>
                  <td>
                    {po.status === "Under Review" ? (
                      <button className="primary-action-btn" onClick={() => handleProcessPayout(po.id)}>
                        💳 Approve & Transfer Funds
                      </button>
                    ) : (
                      <small>Ref: {po.transactionRef || "N/A"}</small>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
