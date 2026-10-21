import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, CalendarDays, CheckCircle2, CircleHelp, ClipboardList, Play, RefreshCw } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import apiClient from '@/lib/api-client';
import ErrorState from '@/components/feedback/ErrorState';
import { cn } from '@/lib/cn';

type ExerciseReport = {
  id: string;
  name: string;
  videoStarted: boolean;
  videoCompleted: boolean;
  markedCompleted: boolean;
  skipped: boolean;
  skipReason: string;
};
type DayReport = {
  dayNumber: number;
  dayStarted: boolean;
  dayCompleted: boolean;
  completedAt: string | null;
  updatedAt: string | null;
  painBefore: number | null;
  painAfter: number | null;
  painChange: number | null;
  difficultyRating: number | null;
  feedback: string;
  discomfortReported: boolean;
  fullSessionCompleted: boolean;
  completedExercises: number;
  skippedExercises: number;
  videoStartedCount: number;
  videoCompletedCount: number;
  exercises: ExerciseReport[];
};
type Stats = {
  openedDays: number;
  completedDays: number;
  reportedDays: number;
  feedbackEntries: number;
  discomfortDays: number;
  painIncreasedDays: number;
  completedExercises: number;
  skippedExercises: number;
  averagePainBefore: number | null;
  averagePainAfter: number | null;
  latestReportDay: number | null;
  lastActivityAt: string | null;
};
type ProgrammeReport = {
  enrollmentId: string;
  program: { name: string; programCode?: string; durationDays?: number } | null;
  status: string;
  currentDay?: number;
  completionPercentage: number;
  startDate: string | null;
  expiryDate: string | null;
  summary: Stats;
  days: DayReport[];
};
type ProgressResponse = {
  patient: { id: string; patientId: string; fullName: string; age: number | null };
  summary: Stats;
  programmes: ProgrammeReport[];
};

const score = (value: number | null) => value === null ? 'Not reported' : `${value}/10`;
const dateLabel = (value: string | null) => {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not recorded' : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

function StatCard({ label, value, help, attention }: { label: string; value: string | number; help?: string; attention?: boolean }) {
  return <div className={cn('rounded-xl border bg-white p-4', attention ? 'border-amber-200' : 'border-neutral-200')}>
    <p className="text-xs font-semibold text-neutral-500">{label}</p>
    <p className={cn('mt-1 text-2xl font-bold', attention ? 'text-amber-800' : 'text-neutral-900')}>{value}</p>
    {help && <p className="mt-1 text-xs leading-5 text-neutral-500">{help}</p>}
  </div>;
}

export default function DoctorPatientProgressPage() {
  const { patientId = '' } = useParams();
  const [selectedEnrollment, setSelectedEnrollment] = useState('');
  const query = useQuery<ProgressResponse>({
    queryKey: ['doctor-patient-progress', patientId],
    queryFn: () => apiClient.get(`/doctors/me/patients/${encodeURIComponent(patientId)}/progress`).then((response) => response.data),
    enabled: Boolean(patientId),
    retry: false,
  });

  if (query.isLoading) return <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-sm text-neutral-500">Loading patient rehabilitation progress…</div>;
  if (query.isError || !query.data) return <ErrorState title="Patient progress unavailable" message="Check that this patient belongs to your referrals and that the server is available." onRetry={() => query.refetch()} />;

  const { patient, programmes, summary } = query.data;
  const selected = programmes.find((item) => item.enrollmentId === selectedEnrollment) || programmes[0];
  const alertDays = selected?.days.filter((day) => day.discomfortReported || (day.painChange !== null && day.painChange > 0)) || [];
  const chartData = selected?.days
    .filter((day) => day.painBefore !== null || day.painAfter !== null)
    .map((day) => ({ day: `Day ${day.dayNumber}`, before: day.painBefore, after: day.painAfter })) || [];

  return <div className="mx-auto max-w-6xl space-y-5">
    <header className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6">
      <Link to="/doctor/patients" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800 hover:underline"><ArrowLeft className="h-4 w-4" /> All referred patients</Link>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">Patient rehab monitoring · Read only</p>
          <h1 className="mt-1 text-2xl font-bold text-neutral-950">{patient.fullName}</h1>
          <p className="mt-1 text-sm text-neutral-500">{patient.patientId} · {patient.age !== null ? `Age ${patient.age}` : 'Age not provided'}</p>
        </div>
        <button onClick={() => query.refetch()} disabled={query.isFetching} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-neutral-200 px-3 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"><RefreshCw className={cn('h-4 w-4', query.isFetching && 'animate-spin')} /> Refresh</button>
      </div>
      <p className="mt-4 text-sm leading-6 text-neutral-600">Review the patient’s own daily pain reports, written feedback, exercise activity and progress. Missing reports are shown as missing, not as zero pain.</p>
    </header>

    <section aria-label="Overall rehabilitation summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard label="Programme enrollments" value={programmes.length} />
      <StatCard label="Completed days" value={summary.completedDays} help={`${summary.openedDays} day(s) opened`} />
      <StatCard label="Patient reports" value={summary.reportedDays} help={`${summary.feedbackEntries} written feedback entries`} />
      <StatCard label="Attention indicators" value={summary.discomfortDays + summary.painIncreasedDays} attention={summary.discomfortDays + summary.painIncreasedDays > 0} help="Discomfort reports + pain increase days; one day may count twice" />
    </section>

    {!programmes.length ? (
      <section className="rounded-xl border border-neutral-200 bg-white p-8 text-center">
        <ClipboardList className="mx-auto h-9 w-9 text-neutral-400" />
        <h2 className="mt-3 font-semibold text-neutral-900">No rehabilitation programme assigned yet</h2>
        <p className="mt-1 text-sm text-neutral-500">Progress and patient reviews will appear once a programme is activated and sessions are recorded.</p>
      </section>
    ) : (
      <>
        {programmes.length > 1 && <section className="rounded-xl border border-neutral-200 bg-white p-4">
          <label htmlFor="doctor-programme" className="block text-sm font-semibold text-neutral-700">Select a rehabilitation programme</label>
          <select id="doctor-programme" value={selected?.enrollmentId} onChange={(event) => setSelectedEnrollment(event.target.value)} className="mt-2 min-h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm">
            {programmes.map((item) => <option key={item.enrollmentId} value={item.enrollmentId}>{item.program?.name || 'Rehabilitation programme'} · {item.status}</option>)}
          </select>
        </section>}
        {selected && <>
          <section className="rounded-xl border border-neutral-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><h2 className="text-lg font-bold text-neutral-950">{selected.program?.name || 'Rehabilitation programme'}</h2><p className="mt-1 text-xs text-neutral-500">Started {dateLabel(selected.startDate)} · Day {selected.currentDay || 1} of {selected.program?.durationDays || '—'} · {selected.status}</p></div>
              <span className="rounded-full bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800">{selected.completionPercentage}% completed</span>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-neutral-100"><div className="h-full bg-emerald-600" style={{ width: `${Math.min(100, Math.max(0, selected.completionPercentage))}%` }} /></div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label="Completed exercises" value={selected.summary.completedExercises} />
              <StatCard label="Skipped exercises" value={selected.summary.skippedExercises} />
              <StatCard label="Average pain before" value={score(selected.summary.averagePainBefore)} help="Only days with both scores" />
              <StatCard label="Average pain after" value={score(selected.summary.averagePainAfter)} help="Only days with both scores" />
            </div>
          </section>

          {alertDays.length > 0 && <section className="rounded-xl border border-amber-200 bg-amber-50 p-4" aria-label="Patient reports needing attention">
            <h2 className="flex items-center gap-2 text-sm font-bold text-amber-950"><AlertTriangle className="h-4 w-4" /> Reports to review</h2>
            <p className="mt-1 text-xs leading-5 text-amber-900">These are patient-reported indicators, not diagnoses. Review alongside clinical context.</p>
            <div className="mt-3 flex flex-wrap gap-2">{alertDays.map((day) => <a href={`#patient-day-${day.dayNumber}`} key={day.dayNumber} className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100">Day {day.dayNumber}: {[day.discomfortReported && 'discomfort', day.painChange !== null && day.painChange > 0 && 'pain increased'].filter(Boolean).join(' + ')}</a>)}</div>
          </section>}

          <section className="rounded-xl border border-neutral-200 bg-white p-4 sm:p-5">
            <h2 className="text-base font-bold text-neutral-900">Pain trend by day</h2>
            <p className="mt-1 text-xs text-neutral-500">Patient-reported scores, 0 = no pain and 10 = severe pain. Gaps represent missing values.</p>
            {chartData.length ? <div className="mt-5 h-64 w-full" role="img" aria-label="Line chart of patient-reported pain before and after each day">
              <ResponsiveContainer width="100%" height="100%"><LineChart data={chartData} margin={{ top: 5, right: 12, left: -25, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 10]} allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="before" stroke="#d97706" strokeWidth={2} connectNulls={false} name="Before session" />
                <Line type="monotone" dataKey="after" stroke="#059669" strokeWidth={2} connectNulls={false} name="After session" />
              </LineChart></ResponsiveContainer>
            </div> : <p className="mt-4 rounded-lg bg-neutral-50 p-4 text-sm text-neutral-500">No pain scores have been submitted yet.</p>}
            {chartData.length > 0 && <p className="mt-2 text-xs text-neutral-600"><span className="font-semibold text-amber-700">Orange</span> = before session; <span className="font-semibold text-emerald-700">Green</span> = after session.</p>}
          </section>

          <section className="space-y-3" aria-label="Day-wise patient reviews">
            <div><h2 className="text-lg font-bold text-neutral-900">Day-wise patient reviews & exercise activity</h2><p className="text-sm text-neutral-500">Open a day to see the complete saved feedback and individual exercise events.</p></div>
            {!selected.days.length && <div className="rounded-xl border border-neutral-200 bg-white p-6 text-sm text-neutral-500">No sessions opened or reviewed yet.</div>}
            {[...selected.days].reverse().map((day) => {
              const needsAttention = day.discomfortReported || (day.painChange !== null && day.painChange > 0);
              return <details key={day.dayNumber} id={`patient-day-${day.dayNumber}`} open={needsAttention} className={cn('rounded-xl border bg-white', needsAttention ? 'border-amber-200' : 'border-neutral-200')}>
                <summary className="cursor-pointer list-none p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><CalendarDays className="h-5 w-5 text-neutral-400" /><div><p className="font-bold text-neutral-900">Day {day.dayNumber} <span className="ml-1 text-xs font-semibold text-neutral-500">{day.dayCompleted ? 'Completed' : day.dayStarted ? 'Opened' : 'Not started'}</span></p><p className="mt-1 text-xs text-neutral-500">Updated {dateLabel(day.updatedAt)} · Pain {score(day.painBefore)} → {score(day.painAfter)}</p></div></div>{needsAttention ? <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">Review indicator</span> : day.dayCompleted ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <CircleHelp className="h-5 w-5 text-neutral-400" />}</div>
                </summary>
                <div className="space-y-4 border-t border-neutral-100 p-4 sm:p-5">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <Mini label="Pain before" value={score(day.painBefore)} />
                    <Mini label="Pain after" value={score(day.painAfter)} />
                    <Mini label="Difficulty" value={score(day.difficultyRating)} />
                    <Mini label="Reported discomfort" value={day.discomfortReported ? 'Yes' : 'No / unreported'} />
                  </div>
                  {day.painChange !== null && <p className={cn('text-xs font-semibold', day.painChange > 0 ? 'text-amber-800' : 'text-neutral-600')}>Pain change in this session: {day.painChange > 0 ? '+' : ''}{day.painChange} point(s)</p>}
                  <div><h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">Patient written review</h3><p className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-neutral-50 p-3 text-sm leading-6 text-neutral-800">{day.feedback || 'No written feedback submitted for this day.'}</p></div>
                  <div><h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">Exercise tracking ({day.completedExercises} completed · {day.skippedExercises} skipped)</h3>
                    {!day.exercises.length ? <p className="mt-2 text-sm text-neutral-500">No exercise events recorded.</p> : <ul className="mt-2 divide-y divide-neutral-100 rounded-lg border border-neutral-100">{day.exercises.map((exercise, index) => <li key={`${exercise.id}-${index}`} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm"><span className="font-medium text-neutral-800">{exercise.name}</span><div className="flex flex-wrap items-center gap-2 text-xs text-neutral-600">{exercise.videoStarted && <span className="inline-flex items-center gap-1"><Play className="h-3 w-3" /> Video started</span>}{exercise.videoCompleted && <span>Video finished</span>}{exercise.markedCompleted && <span className="font-semibold text-emerald-700">Completed</span>}{exercise.skipped && <span className="text-amber-800">Skipped{exercise.skipReason ? `: ${exercise.skipReason}` : ''}</span>}{!exercise.videoStarted && !exercise.videoCompleted && !exercise.markedCompleted && !exercise.skipped && <span>No activity logged</span>}</div></li>)}</ul>}
                  </div>
                </div>
              </details>;
            })}
          </section>
        </>}
      </>
    )}
    <p className="pb-3 text-xs leading-5 text-neutral-500">Clinical decisions remain with the treating professional. This view shows patient-entered information and recorded activity; it does not independently verify that exercises were performed.</p>
  </div>;
}

function Mini({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-neutral-50 p-3"><p className="text-xs text-neutral-500">{label}</p><p className="mt-1 text-sm font-semibold text-neutral-800">{value}</p></div>;
}
