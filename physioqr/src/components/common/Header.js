import React from "react";
import { useAuth } from "../../context/AuthContext";
import { Logo } from "../brand/Logo";

export function Header() {
  const { currentRole, switchRole } = useAuth();

  return (
    <header className="main-header">
      <div className="brand-section">
        <Logo width={56} height={56} withText={false} />
        <div>
          <h1 className="brand-title">Rehabilitation Platform</h1>
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
