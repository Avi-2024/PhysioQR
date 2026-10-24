import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  Clock3,
  HeartPulse,
  PlayCircle,
  ShieldCheck,
  Stethoscope,
  VideoOff,
} from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import apiClient from '@/lib/api-client';
import PatientProgrammePage from '@/features/patients/pages/program/PatientProgrammePage';
import { getPatientSessionState } from '@/lib/patient-session';

type PrescriptionHome = {
  enrollment?: { id?: string; currentDay?: number; completionPercentage?: number; expiryDate?: string };
  program?: { name?: string; durationDays?: number };
  doctor?: { fullName?: string };
  day?: {
    id?: string;
    dayNumber?: number;
    title?: string;
    focus?: string;
    exercises?: Array<{ exercise?: Record<string, unknown> | null }>;
    videoAvailability?: { ready?: number; total?: number };
  };
};

export default function PatientDashboardPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedEnrollmentId = searchParams.get('enrollment') || '';
  // Share the exact same prescription query as the exercise panel below.
  // /patients/me/program may choose a different active enrolment and must
  // never claim that today's exercises are ready.
  const query = useQuery<PrescriptionHome>({
    queryKey: ['patient-prescription', requestedEnrollmentId],
    queryFn: () => apiClient.get('/patients/me/prescription', { params: requestedEnrollmentId ? { enrollmentId: requestedEnrollmentId } : {} }).then((response) => response.data),
    retry: false,
  });

  const data = query.data;
  const enrollment = data?.enrollment;
  const selectedId = enrollment?.id || '';
  const currentDay = Math.max(1, Number(data?.day?.dayNumber || enrollment?.currentDay || 1));
  const duration = Math.max(0, Number(data?.program?.durationDays || 0));
  const percent = Math.min(100, Math.max(0, Number(enrollment?.completionPercentage || 0)));
  const session = getPatientSessionState(data);
  const hasVideos = session.status === 'ready';
  const isGuidanceOnly = session.status === 'guidance_only';
  const programmeName = data?.program?.name?.replace(/\s*\(CLINICAL DRAFT\)\s*$/i, '').trim() || 'Your rehabilitation programme';
  const dayPath = `/patient/programme/day/${currentDay}?enrollment=${encodeURIComponent(selectedId)}`;
  const programmePath = selectedId ? `/patient/programme?enrollment=${encodeURIComponent(selectedId)}` : '/patient/programme';

  return (
    <div className="space-y-5">
      {query.isLoading && (
        <div className="animate-pulse rounded-[28px] border border-emerald-100 bg-emerald-50 p-7" role="status">
          <div className="h-4 w-36 rounded-lg bg-emerald-100" />
          <div className="mt-5 h-10 max-w-lg rounded-lg bg-emerald-100" />
          <div className="mt-4 h-5 max-w-md rounded-lg bg-emerald-100" />
          <span className="sr-only">Loading today's programme</span>
        </div>
      )}

      {query.isError && (
        <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">
          <p className="font-bold">We couldn't confirm today's session.</p>
          <p className="mt-1">Please refresh the prescription below before opening an exercise.</p>
          <button type="button" onClick={() => query.refetch()} className="mt-3 font-bold underline">Try again</button>
        </div>
      )}

      {data && (
        <section className="overflow-hidden rounded-[28px] bg-gradient-to-br from-[#123e37] via-[#165d50] to-[#237868] text-white shadow-lg shadow-emerald-950/10 print:hidden">
          <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-center lg:gap-10 lg:p-8">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold tracking-wide">
                <HeartPulse className="h-4 w-4" aria-hidden="true" /> Your recovery plan
              </div>
              <p className="mt-5 text-sm font-semibold text-emerald-100">Day {currentDay}{duration ? ` of ${duration}` : ''}</p>
              <h1 className="mt-2 max-w-2xl text-2xl font-black leading-tight tracking-tight sm:text-3xl lg:text-4xl">
                {programmeName}
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-emerald-50 sm:text-base">
                {session.status === 'not_configured'
                  ? "Today's exercises haven't been assigned yet. We'll show your session here once your care team configures it."
                  : isGuidanceOnly
                    ? 'Your exercise guidance is available. Approved videos have not been linked for this session yet.'
                    : `${session.readyVideoCount} exercise video${session.readyVideoCount === 1 ? '' : 's'} available for today's session. Move at your own pace.`}
              </p>
              <div className="mt-6 flex flex-wrap gap-2.5">
                {hasVideos ? (
                  <button type="button" onClick={() => navigate(dayPath)}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-emerald-950 shadow-sm transition hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                    <PlayCircle className="h-5 w-5" aria-hidden="true" /> Start Day {currentDay} <ChevronRight className="h-4 w-4" />
                  </button>
                ) : isGuidanceOnly ? (
                  <Link to={programmePath} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-emerald-950 hover:bg-emerald-50">
                    Read exercise guidance <ArrowUpRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <Link to="/patient/support" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-emerald-950 hover:bg-emerald-50">
                    Contact care team <ArrowUpRight className="h-4 w-4" />
                  </Link>
                )}
                <Link to="/patient/progress" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/20">
                  <Activity className="h-4 w-4" /> View progress
                </Link>
              </div>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-sm font-bold">
                {hasVideos ? <CheckCircle2 className="h-5 w-5 text-emerald-200" /> : <VideoOff className="h-5 w-5 text-amber-200" />}
                {hasVideos ? 'Session ready' : isGuidanceOnly ? 'Videos pending' : 'Session not configured'}
              </div>
              <div className="mt-6 flex items-baseline justify-between gap-2">
                <span className="text-sm text-emerald-100">Programme completion</span>
                <span className="text-2xl font-black tabular-nums">{percent}%</span>
              </div>
              <div role="progressbar" aria-label="Programme completion" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}
                className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/20">
                <div className="h-full rounded-full bg-emerald-200 transition-all" style={{ width: `${percent}%` }} />
              </div>
              <div className="mt-5 space-y-3 border-t border-white/20 pt-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-emerald-100">Exercises assigned</span>
                  <span className="font-bold tabular-nums">{session.exerciseCount}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-emerald-100">Videos ready</span>
                  <span className="font-bold tabular-nums">{session.readyVideoCount}</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {data && (
        <div className="grid gap-3 sm:grid-cols-2 print:hidden">
          <div className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800"><Stethoscope className="h-5 w-5" /></div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-neutral-500">Care team</p>
              <p className="truncate text-sm font-bold text-neutral-900">{data.doctor?.fullName || 'PhysioQR care team'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700"><Clock3 className="h-5 w-5" /></div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-neutral-500">Programme access</p>
              <p className="text-sm font-bold text-neutral-900">{expiryText(enrollment?.expiryDate)}</p>
            </div>
            <ShieldCheck className="ml-auto h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
          </div>
        </div>
      )}

      <section id="today-session" className="space-y-3 scroll-mt-6">
        <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Your care plan</p>
            <h2 className="mt-1 text-xl font-black tracking-tight text-neutral-950 sm:text-2xl">Exercises & session history</h2>
          </div>
          <Link to="/patient/progress" className="inline-flex min-h-10 items-center gap-2 text-sm font-bold text-emerald-800 hover:underline">
            My progress <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
        <PatientProgrammePage />
      </section>
    </div>
  );
}

function expiryText(value?: string) {
  if (!value) return 'Active access';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Active access';
  return `Until ${date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`;
}
