import React, { useState } from "react";
import { MOCK_DOCTORS } from "../../mockData/doctorsData";

export function PatientLanding({ onProceedToAssessment }) {
  const [selectedDoctor, setSelectedDoctor] = useState(MOCK_DOCTORS[0]);
  const [patientForm, setPatientForm] = useState({
    name: "",
    mobile: "",
    otp: "",
    otpVerified: false
  });
  const [otpSent, setOtpSent] = useState(false);

  const handleSendOtp = () => {
    if (!patientForm.mobile) return alert("Please enter mobile number!");
    setOtpSent(true);
  };

  const handleVerifyOtp = () => {
    if (patientForm.otp === "1234" || patientForm.otp.length === 4) {
      setPatientForm({ ...patientForm, otpVerified: true });
    } else {
      alert("Please enter a 4-digit OTP (e.g. 1234 for demo)");
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!patientForm.otpVerified) return alert("Please verify OTP first!");
    onProceedToAssessment({
      name: patientForm.name,
      mobile: patientForm.mobile,
      doctor: selectedDoctor
    });
  };

  return (
    <div className="patient-flow-container">
      <div className="step-banner">
        <span className="step-number">Step 1 of 5</span>
        <h2>📱 Doctor QR Referral & Mobile Verification</h2>
        <p>You scanned a PhysioQR code at clinic (SRS Section 8 & 9)</p>
      </div>

      <div className="flow-card-grid">
        <div className="doctor-info-box">
          <div className="doctor-badge">Connected Doctor</div>
          <h3>{selectedDoctor.name}</h3>
          <p className="clinic-text">📍 {selectedDoctor.clinicName}, {selectedDoctor.city}</p>
          <div className="qr-sim">
            <span>Simulate QR Doctor Referral:</span>
            <select
              value={selectedDoctor.id}
              onChange={(e) => setSelectedDoctor(MOCK_DOCTORS.find((d) => d.id === e.target.value))}
            >
              {MOCK_DOCTORS.map((d) => (
                <option key={d.id} value={d.id}>{d.name} ({d.clinicName})</option>
              ))}
            </select>
          </div>
        </div>

        <div className="registration-box">
          <h3>Register Patient Account</h3>
          <form onSubmit={handleSubmit} className="simple-form">
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                required
                placeholder="Enter your name"
                value={patientForm.name}
                onChange={(e) => setPatientForm({ ...patientForm, name: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Mobile Number</label>
              <div className="input-with-btn">
                <input
                  type="tel"
                  required
                  placeholder="10-digit mobile number"
                  value={patientForm.mobile}
                  onChange={(e) => setPatientForm({ ...patientForm, mobile: e.target.value })}
                />
                <button type="button" className="inline-btn" onClick={handleSendOtp}>
                  {otpSent ? "Resend OTP" : "Send OTP"}
                </button>
              </div>
            </div>

            {otpSent && !patientForm.otpVerified && (
              <div className="form-group otp-box">
                <label>Enter 4-Digit OTP (Demo: 1234)</label>
                <div className="input-with-btn">
                  <input
                    type="text"
                    maxLength="4"
                    placeholder="1234"
                    value={patientForm.otp}
                    onChange={(e) => setPatientForm({ ...patientForm, otp: e.target.value })}
                  />
                  <button type="button" className="inline-btn verify" onClick={handleVerifyOtp}>
                    Verify OTP
                  </button>
                </div>
              </div>
            )}

            {patientForm.otpVerified && (
              <div className="verified-tag">✓ Mobile Number Verified</div>
            )}

            <button type="submit" className="primary-action-btn large" disabled={!patientForm.otpVerified}>
              Proceed to Health Assessment →
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
