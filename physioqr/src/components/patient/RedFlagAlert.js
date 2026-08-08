import React from "react";

export function RedFlagAlert({ flags, onContactDoctor }) {
  return (
    <div className="red-flag-card">
      <div className="red-flag-header">
        <span className="alert-icon">⚠️</span>
        <div>
          <h3>Medical Safety Screening Alert</h3>
          <p>High-Risk Symptom Detected (SRS Section 15)</p>
        </div>
      </div>

      <div className="red-flag-body">
        <p className="red-flag-intro">
          Based on your health assessment responses, automated video exercise assignment has been paused for your safety:
        </p>

        <ul className="flag-list">
          {flags.map((flag, idx) => (
            <li key={idx} className="flag-item">
              <strong>{flag.label}</strong>
              <span>{flag.action}</span>
            </li>
          ))}
        </ul>

        <div className="red-flag-action-box">
          <p>
            Please consult your referring doctor or seek direct clinical evaluation before starting any physical exercises. Our clinical team has been notified for manual review.
          </p>
          <button className="contact-dr-btn" onClick={onContactDoctor}>
            📞 Contact Doctor / Request Urgent Review
          </button>
        </div>
      </div>
    </div>
  );
}
