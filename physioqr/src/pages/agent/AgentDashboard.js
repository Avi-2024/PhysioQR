import React, { useState } from "react";
import { StatCard } from "../../components/common/StatCard";
import { MOCK_AGENTS } from "../../mockData/agentsData";
import { MOCK_DOCTORS } from "../../mockData/doctorsData";

export function AgentDashboard({ activeTab = "overview" }) {
  const agent = MOCK_AGENTS[0];
  const [doctors, setDoctors] = useState(MOCK_DOCTORS.filter((d) => d.agentId === agent.id));

  // State for new doctor registration form
  const [formData, setFormData] = useState({
    name: "",
    qualification: "",
    specialization: "",
    clinicName: "",
    city: "",
    patientFee: "500",
    pricingModel: "SPLIT"
  });

  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    const newDoc = {
      id: `DR00${doctors.length + 10}`,
      name: formData.name,
      qualification: formData.qualification,
      specialization: formData.specialization,
      clinicName: formData.clinicName,
      city: formData.city,
      agentId: agent.id,
      agentName: agent.name,
      status: "Pending",
      pricingModel: formData.pricingModel,
      patientFee: Number(formData.patientFee),
      doctorSharePercentage: 60,
      holdingPeriodDays: 15,
      totalReferredPatients: 0,
      totalPaidPatients: 0,
      wallet: { pendingShare: 0, availableShare: 0, withdrawnTotal: 0, totalEarned: 0 }
    };

    setDoctors([...doctors, newDoc]);
    alert(`Doctor ${formData.name} successfully registered! Status set to 'Pending Admin Review'.`);
    setFormData({ name: "", qualification: "", specialization: "", clinicName: "", city: "", patientFee: "500", pricingModel: "SPLIT" });
  };

  return (
    <div className="dashboard-view">
      <div className="view-header">
        <h2>👔 Agent Field Portal ({agent.name})</h2>
        <p>Register clinics & doctors, track onboarding targets, and log clinic visits (SRS Section 4 & 5)</p>
      </div>

      {activeTab === "overview" && (
        <>
          <div className="stats-grid">
            <StatCard icon="👨‍⚕️" label="Registered Doctors" value={agent.doctorsRegistered} subtext="Assigned Region: West Zone" />
            <StatCard icon="✓" label="Approved Doctors" value={agent.doctorsApproved} subtext="Ready with QR codes" />
            <StatCard icon="🎯" label="Monthly Target" value={`${agent.targetAchievementPercent}%`} subtext={`${agent.doctorsRegistered}/${agent.monthlyTarget} Onboarded`} />
          </div>

          <div className="content-card">
            <h3>My Onboarded Doctors</h3>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Doctor ID</th>
                  <th>Name</th>
                  <th>Clinic Name</th>
                  <th>Pricing Model</th>
                  <th>Approval Status</th>
                </tr>
              </thead>
              <tbody>
                {doctors.map((doc) => (
                  <tr key={doc.id}>
                    <td>{doc.id}</td>
                    <td><strong>{doc.name}</strong></td>
                    <td>{doc.clinicName} ({doc.city})</td>
                    <td>{doc.pricingModel}</td>
                    <td>
                      <span className={`status-badge ${doc.status.toLowerCase()}`}>
                        {doc.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === "register" && (
        <div className="content-card form-card">
          <h3>➕ Onboard New Doctor & Clinic (SRS Section 5)</h3>
          <form onSubmit={handleRegisterSubmit} className="simple-form">
            <div className="form-group">
              <label>Doctor Full Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Dr. Ananya Sen"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Qualification & Degree</label>
              <input
                type="text"
                required
                placeholder="e.g. MBBS, MS Orthopedics"
                value={formData.qualification}
                onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Specialization</label>
              <input
                type="text"
                required
                placeholder="e.g. Physiotherapist / Orthopedic"
                value={formData.specialization}
                onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Clinic Name & Address</label>
              <input
                type="text"
                required
                placeholder="e.g. Sen Physiotherapy Clinic, Bandra"
                value={formData.clinicName}
                onChange={(e) => setFormData({ ...formData, clinicName: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>City</label>
              <input
                type="text"
                required
                placeholder="e.g. Mumbai"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Proposed Patient Fee (₹)</label>
              <input
                type="number"
                required
                value={formData.patientFee}
                onChange={(e) => setFormData({ ...formData, patientFee: e.target.value })}
              />
            </div>

            <button type="submit" className="primary-action-btn large">
              Submit Doctor Profile for Admin Approval
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
