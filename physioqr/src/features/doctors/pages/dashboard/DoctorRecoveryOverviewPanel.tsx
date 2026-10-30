import { useQuery } from '@tanstack/react-query';
import { Activity, AlertTriangle, ArrowRight, CheckCircle2, ClipboardList, Clock3, HeartPulse, RefreshCw, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import apiClient from '@/lib/api-client';

export type DoctorRecoveryUpdate = {
  patientId: string;
  patientName: string;
  programmeName: string;
  dayNumber: number;
  completed: boolean;
  painBefore: number | null;
  painAfter: number | null;
  discomfortReported: boolean;
  needsReview: boolean;
  feedback: string;
  updatedAt: string | null;
};

export type DoctorRecoveryOverview = {
  periodDays: number;
  totalReferredPatients: number;
  patientsReporting: number;
  loggedDays: number;
  completedDays: number;
  discomfortDays: number;
  recentUpdates: DoctorRecoveryUpdate[];
};

const dateLabel = (value: string | null) => {
  if (!value) return 'Date not reported';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Date not reported'
    : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

function RecoveryMetric({ icon: Icon, label, value }: {
  icon: typeof Activity; label: string; value: number;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
      <div className="flex items-center gap-2 text-emerald-700"><Icon className="h-4 w-4" aria-hidden="true" /><span className="text-xs font-semibold text-neutral-600">{label}</span></div>
      <p className="mt-2 text-2xl font-extrabold tabular-nums text-neutral-950">{value}</p>
    </div>
  );
}

export default function DoctorRecoveryOverviewPanel() {
  const query = useQuery<DoctorRecoveryOverview>({
    queryKey: ['doctor-recovery-overview'],
    queryFn: async () => (await apiClient.get('/doctors/me/recovery-overview')).data,
    staleTime: 60_000,
    retry: false,
  });
  const overview = query.data;
  return (
    <section aria-label="Referred patient recovery updates" className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700">
            <HeartPulse className="h-4 w-4" aria-hidden="true" /> Patient rehabilitation
          </p>
          <h2 className="mt-1 text-xl font-extrabold text-neutral-950">Recovery updates</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-neutral-600">Track rehabilitation activity and patient-reported symptoms from your referred patients over the last 30 days.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => query.refetch()} disabled={query.isFetching}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-neutral-200 px-3 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${query.isFetching ? 'animate-spin' : ''}`} aria-hidden="true" /> Refresh
          </button>
          <Link to="/doctor/patients" className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-emerald-700 px-3 text-sm font-semibold text-white hover:bg-emerald-800">
            All referred patients <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </header>

      {query.isLoading && <p role="status" className="mt-5 rounded-xl bg-neutral-50 p-5 text-sm text-neutral-600">Loading patient recovery updates…</p>}
      {query.isError && <div role="alert" className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <p className="font-semibold">Patient recovery updates could not load.</p>
        <p className="mt-1">You can still review your referred patients individually.</p>
        <button type="button" onClick={() => query.refetch()} className="mt-2 font-bold underline">Retry updates</button>
      </div>}
      {overview && <>
        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <RecoveryMetric icon={Users} label="Patients with activity" value={overview.patientsReporting} />
          <RecoveryMetric icon={Activity} label="Logged days" value={overview.loggedDays} />
          <RecoveryMetric icon={CheckCircle2} label="Completed days" value={overview.completedDays} />
          <RecoveryMetric icon={AlertTriangle} label="Discomfort reports" value={overview.discomfortDays} />
        </div>
        <div className="mt-5 flex flex-wrap items-baseline justify-between gap-3">
          <h3 className="text-base font-bold text-neutral-950">Recent patient updates</h3>
          <p className="text-xs text-neutral-500">Latest 8 logged sessions · 30-day window</p>
        </div>
        {overview.recentUpdates.length === 0 ? (
          <div className="mt-3 rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-6 text-center">
            <ClipboardList className="mx-auto h-7 w-7 text-neutral-400" aria-hidden="true" />
            <p className="mt-2 text-sm font-bold text-neutral-900">No recent rehabilitation activity</p>
            <p className="mt-1 text-sm text-neutral-600">
              {overview.totalReferredPatients
                ? 'Day completion and symptom reports will appear here when patients record them.'
                : 'Patients referred through your QR code will appear here after registration and exercise activity.'}
            </p>
          </div>
        ) : (
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {overview.recentUpdates.map((item, index) => (
              <div key={`${item.patientId}-${item.programmeName}-${item.dayNumber}-${index}`}
                className={`rounded-xl border p-4 ${item.needsReview ? 'border-amber-200 bg-amber-50/50' : 'border-neutral-200 bg-white'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-neutral-950">{item.patientName}</p>
                    <p className="mt-0.5 text-xs text-neutral-600">{item.programmeName} · Day {item.dayNumber}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${item.needsReview ? 'bg-amber-100 text-amber-900' : item.completed ? 'bg-emerald-50 text-emerald-800' : 'bg-neutral-100 text-neutral-700'}`}>
                    {item.needsReview ? 'Review report' : item.completed ? 'Day completed' : 'Activity logged'}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-neutral-600">
                  <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" aria-hidden="true" /> {dateLabel(item.updatedAt)}</span>
                  {item.painBefore !== null && <span>Pain before: <strong>{item.painBefore}/10</strong></span>}
                  {item.painAfter !== null && <span>Pain after: <strong>{item.painAfter}/10</strong></span>}
                  {item.discomfortReported && <span className="font-bold text-amber-900">Discomfort reported</span>}
                </div>
                {item.feedback && <p className="mt-3 line-clamp-2 rounded-lg bg-white/80 p-2.5 text-xs leading-5 text-neutral-700">Patient feedback: {item.feedback}</p>}
                <Link to={`/doctor/patients/${encodeURIComponent(item.patientId)}/progress`}
                  className="mt-3 inline-flex min-h-9 items-center gap-1.5 text-xs font-bold text-emerald-800 hover:underline">
                  Review detailed progress <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
            ))}
          </div>
        )}
        <p className="mt-4 text-xs leading-5 text-neutral-500">
          Symptoms and progress are patient-reported. A higher post-session pain score or discomfort report needs clinical review; these indicators are not a diagnosis or proof of recovery.
        </p>
      </>}
    </section>
  );
}
