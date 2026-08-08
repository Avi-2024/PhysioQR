import React from "react";
import { useAuth } from "../../context/AuthContext";

export function Header() {
  const { currentRole, switchRole } = useAuth();

  return (
    <header className="main-header">
      <div className="brand-section">
        <div className="brand-logo-icon">+</div>
        <div>
          <h1 className="brand-title">PhysioQR</h1>
          <span className="brand-subtitle">Rehabilitation Platform</span>
        </div>
      </div>

      <div className="role-switcher-container">
        <span className="role-label">Active Portal:</span>
        <div className="role-buttons">
          <button
            className={`role-btn ${currentRole === "admin" ? "active" : ""}`}
            onClick={() => switchRole("admin")}
          >
            🛡️ Admin
          </button>
          <button
            className={`role-btn ${currentRole === "agent" ? "active" : ""}`}
            onClick={() => switchRole("agent")}
          >
            👔 Agent
          </button>
          <button
            className={`role-btn ${currentRole === "doctor" ? "active" : ""}`}
            onClick={() => switchRole("doctor")}
          >
            👨‍⚕️ Doctor
          </button>
          <button
            className={`role-btn ${currentRole === "patient" ? "active" : ""}`}
            onClick={() => switchRole("patient")}
          >
            🏃 Patient Journey
          </button>
        </div>
      </div>
    </header>
  );
}
