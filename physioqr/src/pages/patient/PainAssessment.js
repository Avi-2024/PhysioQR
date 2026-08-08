import React, { useState } from "react";
import { PAIN_CATEGORIES } from "../../mockData/programsData";
import { checkAssessmentRedFlags } from "../../utils/redFlagChecker";
import { RedFlagAlert } from "../../components/patient/RedFlagAlert";

export function PainAssessment({ onCompleteAssessment }) {
  const [category, setCategory] = useState(PAIN_CATEGORIES[0].id);
  const [painLevel, setPainLevel] = useState(5);
  const [symptoms, setSymptoms] = useState([]);
  const [recentSurgery, setRecentSurgery] = useState("no");

  const [redFlagResult, setRedFlagResult] = useState(null);

  const toggleSymptom = (item) => {
    if (symptoms.includes(item)) {
      setSymptoms(symptoms.filter((s) => s !== item));
    } else {
      setSymptoms([...symptoms, item]);
    }
  };

  const handleAssessmentSubmit = (e) => {
    e.preventDefault();
    const result = checkAssessmentRedFlags({
      painLevel,
      symptoms,
      recentSurgery
    });

    if (result.isRedFlag) {
      setRedFlagResult(result);
    } else {
      onCompleteAssessment({
        categoryId: category,
        painLevel,
        symptoms,
        recentSurgery,
        hasRedFlag: false
      });
    }
  };

  return (
    <div className="patient-flow-container">
      <div className="step-banner">
        <span className="step-number">Step 2 of 5</span>
        <h2>📝 Clinical Pain & Health Assessment</h2>
        <p>Helps assign your personalized exercise plan and checks medical safety rules (SRS Section 14 & 15)</p>
      </div>

      {redFlagResult ? (
        <RedFlagAlert
          flags={redFlagResult.flags}
          onContactDoctor={() => alert("Connecting to clinic helpline...")}
        />
      ) : (
        <form onSubmit={handleAssessmentSubmit} className="assessment-form-card">
          <div className="form-section">
            <h3>1. Select Primary Area of Pain</h3>
            <div className="category-options-grid">
              {PAIN_CATEGORIES.map((cat) => (
                <div
                  key={cat.id}
                  className={`category-card ${category === cat.id ? "selected" : ""}`}
                  onClick={() => setCategory(cat.id)}
                >
                  <h4>{cat.name}</h4>
                  <p>{cat.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="form-section">
            <h3>2. Pain Severity Score (0 to 10)</h3>
            <div className="range-box">
              <input
                type="range"
                min="1"
                max="10"
                value={painLevel}
                onChange={(e) => setPainLevel(Number(e.target.value))}
              />
              <div className="range-val-badge">Score: <strong>{painLevel} / 10</strong> ({painLevel >= 8 ? "Severe" : painLevel >= 5 ? "Moderate" : "Mild"})</div>
            </div>
          </div>

          <div className="form-section">
            <h3>3. Do you experience any of the following symptoms?</h3>
            <p className="subtext">Select all that apply for safety screening:</p>
            <div className="symptom-checkboxes">
              {[
                "Stiffness in the morning",
                "Severe loss of movement",
                "Muscle weakness",
                "Chest pain",
                "Numbness in both legs",
                "Loss of bowel control",
                "Fever with pain"
              ].map((sym, idx) => (
                <label key={idx} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={symptoms.includes(sym)}
                    onChange={() => toggleSymptom(sym)}
                  />
                  {sym}
                </label>
              ))}
            </div>
          </div>

          <div className="form-section">
            <h3>4. Have you undergone joint surgery in the last 30 days?</h3>
            <div className="radio-group">
              <label>
                <input
                  type="radio"
                  name="surgery"
                  value="no"
                  checked={recentSurgery === "no"}
                  onChange={() => setRecentSurgery("no")}
                />
                No
              </label>
              <label>
                <input
                  type="radio"
                  name="surgery"
                  value="yes"
                  checked={recentSurgery === "yes"}
                  onChange={() => setRecentSurgery("yes")}
                />
                Yes
              </label>
            </div>
          </div>

          <button type="submit" className="primary-action-btn large">
            Complete Assessment & View Program →
          </button>
        </form>
      )}
    </div>
  );
}
