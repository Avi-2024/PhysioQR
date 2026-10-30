import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ShieldCheck, CheckCircle2, PlayCircle, ArrowRight } from 'lucide-react';

export default function PatientQRLandingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const doctorCode = searchParams.get('doctor') || 'DR001';

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-neutral-900 text-white flex flex-col justify-between p-4 sm:p-8">
      <div className="max-w-xl mx-auto w-full py-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center font-bold text-white text-xl">+</div>
          <div>
            <h1 className="text-xl font-bold leading-none">physioqr</h1>
            <p className="text-xs text-primary-300">Digital Rehabilitation Platform</p>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary-300 uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-success-400" /> Connected Doctor Referral
          </div>
          <h2 className="text-2xl font-bold text-white">Dr. Rajesh Sharma</h2>
          <p className="text-sm text-primary-200">📍 City Spine & Joint Clinic, Mumbai</p>
          <span className="inline-block px-3 py-1 bg-primary-500/30 border border-primary-400/40 rounded-full text-xs font-semibold text-primary-200">
            Referral Code: {doctorCode}
          </span>
        </div>

        <div className="space-y-3">
          <h3 className="text-lg font-bold">Your Guided Recovery Journey</h3>
          <ul className="space-y-2 text-sm text-primary-100">
            <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-success-400 flex-shrink-0" /> Quick 2-minute clinical health assessment</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-success-400 flex-shrink-0" /> Assigned day-wise exercise videos</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-success-400 flex-shrink-0" /> Track daily pain & progress with doctor</li>
          </ul>
        </div>

        <button
          onClick={() => navigate(`/register?doctor=${doctorCode}`)}
          className="w-full py-4 bg-primary-500 hover:bg-primary-400 text-white font-extrabold text-base rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 group"
        >
          <PlayCircle className="w-5 h-5" />
          Start Registration & Assessment
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      <p className="text-center text-xs text-primary-300/60 py-4">
        © 2026 physioqr · Professional Physiotherapy Care
      </p>
    </div>
  );
}
