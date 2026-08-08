import React from "react";
import { StatCard } from "../../components/common/StatCard";

export function PatientDashboard() {
  return (
    <div className="patient-flow-container">
      <div className="step-banner">
        <span className="step-number">Step 5 of 5</span>
        <h2>📈 Patient Recovery Dashboard</h2>
        <p>Track your daily completion rate, feedback scores, and medical timeline (SRS Section 35)</p>
      </div>

      <div className="stats-grid">
        <StatCard icon="🎯" label="Program Progress" value="45%" subtext="Day 2 of 14 Completed" type="highlight" />
        <StatCard icon="📹" label="Exercises Completed" value="4 Videos" subtext="2 Exercises today" />
        <StatCard icon="👨‍⚕️" label="Referring Doctor" value="Dr. Rajesh Sharma" subtext="City Spine & Joint Clinic" />
      </div>

      <div className="content-card">
        <h3>Exercise Feedback & Daily Log</h3>
        <table className="custom-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Program Day</th>
              <th>Pain Score Before</th>
              <th>Pain Score After</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>2026-08-05</td>
              <td>Day 1</td>
              <td>6 / 10</td>
              <td>4 / 10</td>
              <td><span className="status-badge approved">Completed</span></td>
            </tr>
            <tr>
              <td>2026-08-06</td>
              <td>Day 2</td>
              <td>5 / 10</td>
              <td>3 / 10</td>
              <td><span className="status-badge approved">Completed</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
