import React, { useState } from "react";
import { MOCK_PROGRAMS } from "../../mockData/programsData";
import { VideoPlayer } from "../../components/patient/VideoPlayer";

export function DayWiseExercises() {
  const program = MOCK_PROGRAMS[0]; // Lower Back Recovery
  const [selectedDayNumber, setSelectedDayNumber] = useState(1);
  const [completedExercises, setCompletedExercises] = useState([]);

  const currentDayData = program.days.find((d) => d.dayNumber === selectedDayNumber) || program.days[0];

  const handleVideoComplete = (vidId) => {
    if (!completedExercises.includes(vidId)) {
      setCompletedExercises([...completedExercises, vidId]);
    }
  };

  return (
    <div className="patient-flow-container">
      <div className="step-banner">
        <span className="step-number">Step 4 of 5</span>
        <h2>▶️ Day-Wise Exercise Video Player</h2>
        <p>Follow expert video guides with unlock progression rules (SRS Section 17 & 19)</p>
      </div>

      <div className="exercise-player-layout">
        <aside className="days-sidebar">
          <h3>Program Progression</h3>
          <ul className="days-list">
            {program.days.map((day) => {
              const isLocked = day.dayNumber > 2; // Demo unlock rule: Day 1 & 2 unlocked
              return (
                <li key={day.dayNumber}>
                  <button
                    className={`day-btn ${selectedDayNumber === day.dayNumber ? "active" : ""} ${isLocked ? "locked" : ""}`}
                    onClick={() => !isLocked && setSelectedDayNumber(day.dayNumber)}
                    disabled={isLocked}
                  >
                    <span>Day {day.dayNumber}</span>
                    {isLocked ? <small>🔒 Locked</small> : <small>✓ Available</small>}
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <main className="video-player-section">
          <h2>{currentDayData.title}</h2>
          <div className="videos-grid">
            {currentDayData.videos.map((vid) => (
              <VideoPlayer
                key={vid.id}
                video={vid}
                onComplete={handleVideoComplete}
              />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
