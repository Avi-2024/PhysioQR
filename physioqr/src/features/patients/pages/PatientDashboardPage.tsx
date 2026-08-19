import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Activity, ArrowRight, Calendar, CreditCard, PlayCircle, Stethoscope } from 'lucide-react';
import apiClient from '@/lib/api-client';
import ErrorState from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';

type ApiRecord = Record<string, unknown>;

// Renders the patient's live recovery dashboard from active program and progress APIs.
export default function PatientDashboardPage() {
  const navigate = useNavigate();
  const programQuery = useQuery({ queryKey: ['patient-program'], queryFn: async () => (await apiClient.get('/patients/me/program')).data, retry: false });
  const program = asRecord(programQuery.data);
  const rehabProgram = asRecord(program.program);
  const doctor = asRecord(program.doctor);
  const durationDays = Number(rehabProgram.durationDays || 0);
  const currentDay = Math.max(1, Number(program.currentDay || 1));
  const completion = Number(program.completionPercentage || 0);

  if (programQuery.isError) {
    return <ErrorState title="Program could not load" message="Your active program is unavailable or not yet activated." onRetry={() => programQuery.refetch()} />;
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-primary-900 via-primary-800 to-neutral-900 text-white rounded-2xl p-6 sm:p-8 space-y-4">
        <div className="flex justify-between items-start gap-3">
          <div className="min-w-0">
            <span className="text-xs font-semibold text-primary-300 uppercase tracking-wider">Welcome back</span>
            <h1 className="text-2xl font-bold mt-1">Your Recovery Plan</h1>
          </div>
          <span className="px-3 py-1 bg-success-500/20 text-success-300 border border-success-400/30 rounded-full text-xs font-bold">
            {programQuery.isLoading ? 'Loading' : labelize(program.status || 'active_program')}
          </span>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 border border-white/10">
          <div className="min-w-0">
            <p className="text-xs text-primary-200">Assigned Programme</p>
            {programQuery.isLoading ? <Skeleton className="mt-1 h-6 w-56 bg-white/20" /> : <p className="font-bold text-white text-base break-words">{text(rehabProgram.name, 'No active program')}</p>}
          </div>
          <div className="flex items-center gap-2 text-xs text-primary-200">
            <Stethoscope className="w-4 h-4 text-primary-300" /> {text(doctor.fullName, 'Doctor not assigned')}
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs font-semibold text-primary-200 mb-1">
            <span>Overall Progress</span>
            <span className="text-amber-400">Day {currentDay} of {durationDays || '-'} ({completion}%)</span>
          </div>
          <div className="w-full h-2.5 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-amber-400 rounded-full" style={{ width: `${Math.min(Math.max(completion, 0), 100)}%` }} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard icon={Calendar} label="Current Day" value={`Day ${currentDay}`} />
        <SummaryCard icon={Activity} label="Completion" value={`${completion}%`} />
        <SummaryCard icon={CreditCard} label="Access Expiry" value={dateText(program.expiryDate)} />
      </div>

      <div className="bg-white border border-neutral-200 rounded-2xl p-6 space-y-4 shadow-sm">
        <div className="flex justify-between items-center gap-3">
          <h2 className="font-bold text-neutral-900 text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary-600" /> Today's Exercise Plan
          </h2>
          <span className="text-xs text-neutral-500 font-medium">{text(rehabProgram.sessionsPerDay, '1')} session/day</span>
        </div>

        <div className="border border-neutral-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-primary-300 transition-colors">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center flex-shrink-0">
              <PlayCircle className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-neutral-900 text-sm">Day {currentDay}: {text(rehabProgram.name, 'Recovery session')}</p>
              <p className="text-xs text-neutral-500">Video guidance, sets, reps, safety instructions, and feedback.</p>
            </div>
          </div>
          <button onClick={() => navigate(`/patient/programme/day/${currentDay}`)} className="min-h-11 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm rounded-lg transition-colors flex items-center justify-center gap-1">
            Start <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"><Icon className="mb-2 h-5 w-5 text-primary-600" /><div className="text-lg font-bold text-neutral-900">{value}</div><div className="text-xs text-neutral-500">{label}</div></div>;
}

function asRecord(value: unknown): ApiRecord {
  return value && typeof value === 'object' ? value as ApiRecord : {};
}

function text(value: unknown, fallback = '') {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value);
}

function labelize(value: unknown) {
  return text(value, '-').replace(/_/g, ' ');
}

function dateText(value: unknown) {
  if (!value) return '-';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
