import React, { useState } from "react";

export function VideoPlayer({ video, onComplete }) {
  const [completed, setCompleted] = useState(false);

  const handleMarkComplete = () => {
    setCompleted(true);
    if (onComplete) onComplete(video.id);
  };

  return (
    <div className="video-player-container">
      <div className="video-header">
        <h3>{video.title}</h3>
        <span className="video-duration">⏱️ {video.duration}</span>
      </div>

      <div className="video-wrapper">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}`}
          title={video.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      </div>

      <div className="video-details">
        <div className="exercise-instructions">
          <div><strong>Sets:</strong> {video.sets}</div>
          <div><strong>Rest:</strong> {video.rest}</div>
        </div>

        <button
          className={`mark-done-btn ${completed ? "completed" : ""}`}
          onClick={handleMarkComplete}
          disabled={completed}
        >
          {completed ? "✓ Exercise Marked Completed" : "Mark Exercise as Done"}
        </button>
      </div>
    </div>
  );
}
