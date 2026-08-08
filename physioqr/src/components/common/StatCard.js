import React from "react";

export function StatCard({ icon, label, value, subtext, badge, type = "default" }) {
  return (
    <div className={`stat-card stat-card-${type}`}>
      <div className="stat-card-header">
        <span className="stat-icon">{icon}</span>
        {badge && <span className="stat-badge">{badge}</span>}
      </div>
      <div className="stat-card-body">
        <h4 className="stat-label">{label}</h4>
        <h2 className="stat-value">{value}</h2>
        {subtext && <p className="stat-subtext">{subtext}</p>}
      </div>
    </div>
  );
}
