import React from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Stethoscope, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';

export default function AgentDashboardPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 min-w-0">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900">Agent Field Portal</h1>
          <p className="text-sm text-neutral-500">Welcome back, Amit Kumar · West Zone Region</p>
        </div>
        <button
          onClick={() => navigate('/agent/doctors/new')}
          className="flex min-h-11 w-full sm:w-auto items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm rounded-lg transition-colors"
        >
          <UserPlus className="w-4 h-4" /> Register New Doctor
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-neutral-200 rounded-xl p-4 sm:p-5 shadow-sm min-w-0">
          <Stethoscope className="w-8 h-8 text-primary-600 mb-2" />
          <p className="text-2xl font-bold text-neutral-900">5</p>
          <p className="text-sm text-neutral-500">Doctors Registered</p>
        </div>
        <div className="bg-white border border-neutral-200 rounded-xl p-4 sm:p-5 shadow-sm min-w-0">
          <CheckCircle className="w-8 h-8 text-success-600 mb-2" />
          <p className="text-2xl font-bold text-neutral-900">4</p>
          <p className="text-sm text-neutral-500">Approved Doctors</p>
        </div>
        <div className="bg-white border border-neutral-200 rounded-xl p-4 sm:p-5 shadow-sm min-w-0">
          <Clock className="w-8 h-8 text-warning-600 mb-2" />
          <p className="text-2xl font-bold text-neutral-900">1</p>
          <p className="text-sm text-neutral-500">Pending Review</p>
        </div>
        <div className="bg-white border border-neutral-200 rounded-xl p-4 sm:p-5 shadow-sm min-w-0">
          <TrendingUp className="w-8 h-8 text-purple-600 mb-2" />
          <p className="text-xl sm:text-2xl font-bold text-neutral-900 break-words">{formatCurrency(15000)}</p>
          <p className="text-sm text-neutral-500">Doctor Revenue Generated</p>
        </div>
      </div>

      <div className="bg-white border border-neutral-200 rounded-xl p-5 sm:p-6 shadow-sm space-y-4 min-w-0">
        <h3 className="font-bold text-neutral-900">Monthly Onboarding Target</h3>
        <div>
          <div className="flex justify-between gap-3 text-sm mb-1 font-medium">
            <span className="text-neutral-600 min-w-0">5 of 10 Doctors Onboarded</span>
            <span className="text-primary-600 font-bold flex-shrink-0">50%</span>
          </div>
          <div className="w-full h-3 bg-neutral-100 rounded-full overflow-hidden">
            <div className="h-full bg-primary-600 rounded-full" style={{ width: '50%' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
