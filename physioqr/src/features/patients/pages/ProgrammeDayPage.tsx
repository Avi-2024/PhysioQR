import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Lock, Play } from 'lucide-react';

export default function ProgrammeDayPage() {
  const { dayNumber } = useParams();
  const navigate = useNavigate();
  const currentDay = Number(dayNumber) || 1;
  const [completed, setCompleted] = useState(false);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/patient/dashboard')} className="p-2 border border-neutral-300 rounded-lg hover:bg-neutral-100">
          <ArrowLeft className="w-4 h-4 text-neutral-600" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-neutral-900">Day {currentDay}: Glute Activation & Bird-Dog Hold</h1>
          <p className="text-xs text-neutral-500">14-Day Lower Back Recovery Programme</p>
        </div>
      </div>

      <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="relative aspect-video bg-neutral-900">
          <iframe
            src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"
            title="Exercise Video"
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex justify-between items-center text-sm border-b border-neutral-100 pb-3">
            <div>
              <span className="text-xs text-neutral-500">Sets & Repetitions</span>
              <p className="font-bold text-neutral-900">3 sets x 10 reps (30s rest)</p>
            </div>
            <div>
              <span className="text-xs text-neutral-500">Hold Duration</span>
              <p className="font-bold text-neutral-900">5 seconds hold</p>
            </div>
          </div>

          <button
            onClick={() => setCompleted(true)}
            disabled={completed}
            className={`w-full py-3 font-semibold text-sm rounded-lg transition-colors flex items-center justify-center gap-2 ${
              completed ? 'bg-success-600 text-white' : 'bg-primary-600 hover:bg-primary-700 text-white'
            }`}
          >
            {completed ? <CheckCircle className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {completed ? 'Exercise Marked as Done ✓' : 'Mark Exercise as Done'}
          </button>
        </div>
      </div>
    </div>
  );
}
