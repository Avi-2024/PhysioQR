import type { ElementType } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  CalendarDays,
  ChevronRight,
  Clock3,
  HeartPulse,
  PlayCircle,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import apiClient from '@/lib/api-client';
import PatientProgrammePage from '@/features/patients/pages/program/PatientProgrammePage';

type ApiRecord = Record<string, unknown>;

export default function PatientDashboardPage() {
  const navigate = useNavigate();
  const programQuery = useQuery({
    queryKey: ['patient-program'],
    queryFn: async () => (await apiClient.get('/patients/me/program')).data,
    retry: false,
  });

  const program = asRecord(programQuery.data);
  const rehabProgram = asRecord(program.program);
  const doctor = asRecord(program.doctor);
  const currentDay = Math.max(1, Number(program.currentDay || 1));
  const completion = Math.min(Math.max(Number(program.completionPercentage || 0), 0), 100);
  const durationDays = Number(rehabProgram.durationDays || 0);
  const remaining = durationDays ? Math.max(durationDays - currentDay, 0) : 0;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[28px] border border-emerald-100 bg-gradient-to-br from-white via-emerald-50/70 to-teal-50 p-5 shadow-sm sm:p-7 print:hidden">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white/80 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.08em] text-emerald-700 shadow-sm">
              <Sparkles className="h-3.5 w-3.5" />
              Your recovery today
            </div>
            <h1 className="mt-4 max-w-2xl text-2xl font-black tracking-tight text-neutral-950 sm:text-3xl lg:text-4xl">
              Keep moving forward, one session at a time.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-neutral-600 sm:text-base">
              {text(rehabProgram.name, 'Your prescribed rehabilitation programme')} is ready. Follow today&apos;s exercises and record your progress when you finish.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => navigate(`/patient/programme/day/${currentDay}`)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-primary-700"
              >
                <PlayCircle className="h-4.5 w-4.5" />
                Start Day {currentDay}
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => navigate('/patient/progress')}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-5 py-3 text-sm font-bold text-neutral-700 transition hover:bg-neutral-50"
              >
                <Activity className="h-4.5 w-4.5 text-primary-600" />
                View progress
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-white/80 bg-white/90 p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-neutral-400">Today</p>
                <p className="mt-1 text-2xl font-black text-neutral-950">Day {currentDay}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-700">
                <HeartPulse className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between text-xs font-semibold">
                <span className="text-neutral-500">Overall recovery progress</span>
                <span className="text-primary-700">{completion}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-neutral-100">
                <div className="h-full rounded-full bg-primary-600 transition-all" style={{ width: `${completion}%` }} />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-4 text-xs">
              <span className="text-neutral-500">{durationDays ? `${remaining} days remaining` : 'Programme in progress'}</span>
              <span className="inline-flex items-center gap-1.5 font-bold text-emerald-700">
                <ShieldCheck className="h-3.5 w-3.5" />
                Active
              </span>
            </div>
          </div>
        </div>
      </section>

      {!programQuery.isLoading && !programQuery.isError && Object.keys(program).length > 0 && (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 print:hidden">
          <DashboardStat
            icon={CalendarDays}
            label="Current day"
            value={durationDays ? `Day ${currentDay} of ${durationDays}` : `Day ${currentDay}`}
          />
          <DashboardStat
            icon={Activity}
            label="Overall progress"
            value={`${completion}% complete`}
            progress={completion}
          />
          <DashboardStat
            icon={Clock3}
            label="Programme access"
            value={expiryText(program.expiryDate)}
          />
          <DashboardStat
            icon={HeartPulse}
            label="Care team"
            value={text(doctor.fullName, 'PhysioQR care')}
          />
        </section>
      )}

      {programQuery.isError && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 print:hidden">
          Your prescription is available below. Live recovery summary could not be refreshed right now.
        </div>
      )}

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3 print:hidden">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.09em] text-primary-700">Your care plan</p>
            <h2 className="mt-1 text-xl font-black text-neutral-950 sm:text-2xl">Prescription & programme</h2>
          </div>
        </div>
        <PatientProgrammePage />
      </section>
    </div>
  );
}

function DashboardStat({
  icon: Icon,
  label,
  value,
  progress,
}: {
  icon: ElementType;
  label: string;
  value: string;
  progress?: number;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
          <Icon className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-wide text-neutral-400">{label}</div>
          <div className="mt-0.5 truncate text-sm font-extrabold text-neutral-950" title={value}>{value}</div>
        </div>
      </div>
      {progress !== undefined && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-neutral-100">
          <div className="h-full rounded-full bg-primary-600" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
}

function asRecord(value: unknown): ApiRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as ApiRecord : {};
}

function text(value: unknown, fallback = '') {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value);
}

function expiryText(value: unknown) {
  if (!value) return 'Active access';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return 'Active access';
  return `Until ${date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`;
}
