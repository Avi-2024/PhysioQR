import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PlayCircle, CheckCircle, Calendar, Stethoscope, ArrowRight } from 'lucide-react';

export default function PatientDashboardPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-primary-900 via-primary-800 to-neutral-900 text-white rounded-2xl p-6 sm:p-8 space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <span className="text-xs font-semibold text-primary-300 uppercase tracking-wider">Welcome back</span>
            <h1 className="text-2xl font-bold mt-1">Ramesh Gupta 👋</h1>
          </div>
          <span className="px-3 py-1 bg-success-500/20 text-success-300 border border-success-400/30 rounded-full text-xs font-bold">
            Active Programme
          </span>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 border border-white/10">
          <div>
            <p className="text-xs text-primary-200">Assigned Programme</p>
            <p className="font-bold text-white text-base">14-Day Lower Back Recovery</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-primary-200">
            <Stethoscope className="w-4 h-4 text-primary-300" /> Dr. Rajesh Sharma
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs font-semibold text-primary-200 mb-1">
            <span>Overall Progress</span>
            <span className="text-amber-400">Day 2 of 14 (14%)</span>
          </div>
          <div className="w-full h-2.5 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-amber-400 rounded-full" style={{ width: '14%' }}></div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-neutral-200 rounded-2xl p-6 space-y-4 shadow-sm">
        <div className="flex justify-between items-center">
          <h2 className="font-bold text-neutral-900 text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary-600" /> Today's Exercise Plan (Day 2)
          </h2>
          <span className="text-xs text-neutral-500 font-medium">Estimated 15 mins</span>
        </div>

        <div className="border border-neutral-200 rounded-xl p-4 flex items-center justify-between gap-4 hover:border-primary-300 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center flex-shrink-0">
              <PlayCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-neutral-900 text-sm">Day 2: Glute Activation & Bird-Dog Hold</p>
              <p className="text-xs text-neutral-500">2 Exercise Videos · Sets & Reps included</p>
            </div>
          </div>
          <button onClick={() => navigate('/patient/programme/day/2')} className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm rounded-lg transition-colors flex items-center gap-1">
            Start <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
