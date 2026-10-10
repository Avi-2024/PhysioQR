import { CheckCircle2, CircleAlert, ExternalLink, RefreshCw, ShieldCheck, Video } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export type ReleaseExercise = {
  id: string;
  name: string;
  active: boolean;
  videoReady: boolean;
  demoVideo?: boolean;
  candidateReviewPending?: boolean;
  safetyReady: boolean;
  categoryReady: boolean;
  doseReady: boolean;
  ready: boolean;
  usedOnDays: number[];
};

export type ReleaseReadiness = {
  required: boolean;
  clinicalApproved: boolean;
  readyForSignOff: boolean;
  readyForPublish?: boolean;
  approvalOutdated?: boolean;
  issueCount: number;
  issues: string[];
  exercises?: ReleaseExercise[];
  missingDays?: number[];
  configuredDays?: number;
  requiredDays?: number;
};

type Props = {
  programId: string;
  isActive: boolean;
  clinicalApproval?: { clinicianName?: string; approvedAt?: string };
  readiness?: ReleaseReadiness;
  isRefreshing?: boolean;
  onRefresh: () => void;
  onSignoff: () => void;
  onPublish: () => void;
};

function Status({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold ${ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
      {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <CircleAlert className="h-3.5 w-3.5" />}
      {label}
    </span>
  );
}

export default function ProgrammeReleaseChecklist({
  programId, isActive, clinicalApproval, readiness, isRefreshing, onRefresh, onSignoff, onPublish,
}: Props) {
  const navigate = useNavigate();
  const tasks = readiness?.exercises || [];
  const readyCount = tasks.filter((task) => task.ready).length;
  const requiredDays = readiness?.requiredDays || 0;
  const configuredDays = readiness?.configuredDays || 0;
  const contentReady = Boolean(readiness?.readyForSignOff);
  const signed = Boolean(clinicalApproval?.approvedAt);
  const canPublish = !isActive && Boolean(readiness?.readyForPublish) && signed;
  const percent = tasks.length ? Math.round((readyCount / tasks.length) * 100) : 0;

  return (
    <section className="overflow-hidden rounded-2xl border border-amber-200 bg-white" aria-labelledby="release-workflow-heading">
      <header className="border-b border-amber-200 bg-amber-50 p-5">
        <p className="text-xs font-bold uppercase tracking-wider text-amber-900">Clinical draft — patient publication locked</p>
        <h2 id="release-workflow-heading" className="mt-1 text-xl font-bold text-neutral-950">Finish the programme in 3 steps</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-700">
          Complete each exercise once, even when it appears on many days.
          Actual exercise videos and qualified clinician approval are required before patients can receive this programme.
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-semibold text-neutral-800">
            {readyCount} of {tasks.length} exercises ready · {configuredDays}/{requiredDays} programme days configured
          </div>
          <button type="button" onClick={onRefresh} disabled={isRefreshing}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} /> Recheck readiness
          </button>
        </div>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-amber-100" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Exercise readiness">
          <div className="h-full rounded-full bg-emerald-600 transition-all" style={{ width: `${percent}%` }} />
        </div>
        {Boolean(readiness?.issueCount) && <p className="mt-2 text-xs text-amber-900">
          {readiness?.issueCount} total assignment-level checks pending; the list below groups them into unique exercise tasks.
        </p>}
      </header>

      <div className="space-y-4 p-5">
        <div>
          <div className="flex items-center gap-2">
            <Video className="h-5 w-5 text-primary-700" />
            <h3 className="text-base font-bold text-neutral-950">Step 1. Complete exercise videos and review</h3>
          </div>
          <p className="mt-1 text-sm leading-6 text-neutral-600">
            Open each exercise, attach its real reviewed YouTube video, verify instructions/safety, then activate the exercise.
            Recheck this page after saving. Nothing is approved automatically.
          </p>
          <div className="mt-4 overflow-hidden rounded-xl border border-neutral-200">
            {tasks.length ? tasks.map((task, index) => (
              <div key={task.id} className="flex flex-col justify-between gap-3 border-b border-neutral-100 p-3 last:border-b-0 sm:flex-row sm:items-center sm:px-4">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-neutral-900">{index + 1}. {task.name}</p>
                  <p className="mt-1 text-xs text-neutral-500">Used on {task.usedOnDays.length} programme day(s)</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Status label={task.candidateReviewPending ? 'Exercise video found — clinician review pending' : task.demoVideo ? 'Generic demo — replace with exercise video' : task.videoReady ? 'Reviewed video ready' : 'Video missing'} ok={task.videoReady} />
                    <Status label={task.active ? 'Active' : 'Inactive'} ok={task.active} />
                    <Status label={task.safetyReady ? 'Safety checked' : 'Safety notes missing'} ok={task.safetyReady} />
                    {!task.categoryReady && <Status label="Wrong body region" ok={false} />}
                    {!task.doseReady && <Status label="Review sets/reps" ok={false} />}
                  </div>
                </div>
                <button type="button"
                  onClick={() => navigate(`/admin/exercises/${task.id}?programme=${encodeURIComponent(programId)}`)}
                  className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 text-xs font-bold text-neutral-800 hover:bg-neutral-50">
                  Edit exercise <ExternalLink className="h-3.5 w-3.5" />
                </button>
              </div>
            )) : <p className="p-4 text-sm text-amber-900">No mapped exercises found. Check the programme's day-wise plan first.</p>}
          </div>
          {(readiness?.missingDays?.length || 0) > 0 && <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Missing/empty programme days: {readiness?.missingDays?.join(', ')}. Configure these in the day-wise plan below.
          </p>}
          {(readiness?.issues || []).some((issue) => issue.includes('duplicate active day') || issue.includes('missing exercise reference') || issue.includes('changed after clinical sign-off')) &&
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-950">
              Additional configuration or sign-off checks need attention: {(readiness?.issues || []).filter((issue) =>
                issue.includes('duplicate active day') || issue.includes('missing exercise reference') || issue.includes('changed after clinical sign-off')).slice(0, 3).join('; ')}
            </p>}
        </div>

        <div className="border-t border-neutral-100 pt-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary-700" />
            <h3 className="text-base font-bold text-neutral-950">Step 2. Record real clinical sign-off</h3>
          </div>
          <p className="mt-1 text-sm leading-6 text-neutral-600">
            A qualified physiotherapist reviews all 30 days, videos, doses and exclusions. Admin then records their name and review note.
          </p>
          {signed && <p className={`mt-2 text-xs font-semibold ${readiness?.approvalOutdated ? 'text-amber-800' : 'text-emerald-800'}`}>
            {readiness?.approvalOutdated ? 'Previous sign-off is outdated. Renew after clinical review.' : 'Recorded reviewer: ' + (clinicalApproval?.clinicianName || '')}
          </p>}
          <button type="button" onClick={onSignoff} disabled={isActive || !contentReady}
            className="mt-3 min-h-10 rounded-lg bg-primary-700 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">
            {signed ? 'Record renewed sign-off' : 'Record clinical sign-off'}
          </button>
          {!contentReady && <p className="mt-2 text-xs text-amber-800">Available when all content checks pass. Sign-off is never automatic.</p>}
        </div>

        <div className="border-t border-neutral-100 pt-4">
          <h3 className="text-base font-bold text-neutral-950">Step 3. Publish for new patient assignments</h3>
          <p className="mt-1 text-sm leading-6 text-neutral-600">
            Publishing is a separate audited action. It becomes available only after content is complete and clinical sign-off is recorded.
          </p>
          <button type="button" onClick={onPublish} disabled={!canPublish}
            className="mt-3 min-h-10 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">
            {isActive ? 'Already published' : 'Publish after approval'}
          </button>
          {(!signed || readiness?.approvalOutdated) && <p className="mt-2 text-xs text-amber-800">{readiness?.approvalOutdated ? 'The previous sign-off is outdated. Record renewed clinical sign-off first.' : 'Waiting for clinical sign-off.'}</p>}
        </div>
      </div>
    </section>
  );
}
