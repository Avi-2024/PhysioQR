import React from "react";

export function Sidebar({ currentRole, activeTab, setActiveTab }) {
  const getMenuItems = () => {
    switch (currentRole) {
      case "admin":
        return [
          { id: "overview", label: "📊 Overview & Stats" },
          { id: "doctors", label: "👨‍⚕️ Doctors & Approvals" },
          { id: "agents", label: "👔 Field Agents" },
          { id: "programs", label: "🧘 Programs & Videos" },
          { id: "wallets", label: "💰 Wallets & Payouts" },
          { id: "redflags", label: "🚨 Red Flag Safety Logs" },
        ];
      case "agent":
        return [
          { id: "overview", label: "📊 Onboarding Performance" },
          { id: "register", label: "➕ Register New Doctor" },
          { id: "mydoctors", label: "👨‍⚕️ Assigned Doctors" },
          { id: "visits", label: "📍 Clinic Visit Logs" },
        ];
      case "doctor":
        return [
          { id: "overview", label: "📊 Doctor Dashboard" },
          { id: "qrcode", label: "📱 My QR Code & Link" },
          { id: "patients", label: "👥 Referred Patients" },
          { id: "wallet", label: "💳 Fee Share & Wallet" },
        ];
      case "patient":
        return [
          { id: "scan", label: "🔍 1. Scan Doctor QR" },
          { id: "assessment", label: "📝 2. Health Assessment" },
          { id: "payment", label: "💳 3. Program Checkout" },
          { id: "exercises", label: "▶️ 4. Day-Wise Exercises" },
          { id: "dashboard", label: "📈 5. Recovery Dashboard" },
        ];
      default:
        return [];
    }
  };

  const items = getMenuItems();

  return (
    <aside className="sidebar-nav">
      <div className="sidebar-header">
        <span className="sidebar-role-badge">
          {currentRole.toUpperCase()} PORTAL
        </span>
      </div>
      <ul className="sidebar-menu">
        {items.map((item) => (
          <li key={item.id}>
            <button
              className={`sidebar-link ${activeTab === item.id ? "active" : ""}`}
              onClick={() => setActiveTab(item.id)}
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
