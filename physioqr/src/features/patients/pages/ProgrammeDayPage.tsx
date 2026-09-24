import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Circle,
  HeartPulse,
  Play,
  SkipForward,
  Sparkles,
} from 'lucide-react';
import apiClient from '@/lib/api-client';
import ErrorState from '@/components/feedback/ErrorState';
import { cn } from '@/lib/cn';

type ApiRecord = Record<string, unknown>;

export default function ProgrammeDayPage() {
  const { dayNumber } = useParams();
  const [searchParams] = useSearchParams();
  const selectedEnrollmentId = searchParams.get('enrollment') || '';
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const day = Number(dayNumber) || 1;
  const [painScoreBefore, setPainScoreBefore] = useState('');
  const [painScoreAfter, setPainScoreAfter] = useState('');
  const [difficultyRating, setDifficultyRating] = useState('');
  const [feedbackText, setFeedbackText] = useState('');
  const [discomfortReported, setDiscomfortReported] = useState(false);

  const programQuery = useQuery({
    queryKey: ['patient-program', selectedEnrollmentId],
    queryFn: async () => (await apiClient.get(selectedEnrollmentId ? `/patients/me/programs/${selectedEnrollmentId}` : '/patients/me/program')).data,
    retry: false,
  });
  const patientProgram = asRecord(programQuery.data);
  const patientProgramId = text(patientProgram._id || patientProgram.id);
  const dayQuery = useQuery({
    queryKey: ['patient-program-day', patientProgramId, day],
    enabled: Boolean(patientProgramId),
    queryFn: async () => (await apiClient.get(`/progress/${patientProgramId}/day/${day}`)).data,
    retry: false,
  });

  const payload = asRecord(dayQuery.data);
  const programDay = asRecord(payload.programDay);
  const progress = asRecord(payload.progress);
  const exercises = useMemo(() => {
    const items = Array.isArray(programDay.exercises) ? programDay.exercises as ApiRecord[] : [];
    return items.map((item) => asRecord(item.exercise)).filter((item) => text(item._id || item.id));
  }, [programDay.exercises]);
  const progressExercises = Array.isArray(progress.exercises) ? progress.exercises as ApiRecord[] : [];
  const completedCount = exercises.filter((exercise) => {
    const id = text(exercise._id || exercise.id);
    const state = progressExercises.find((item) => text(item.exercise) === id);
    return Boolean(state?.markedCompleted);
  }).length;
  const sessionProgress = exercises.length ? Math.round((completedCount / exercises.length) * 100) : 0;

  const eventMutation = useMutation({
    mutationFn: async ({ exerciseId, eventType, skipReason }: { exerciseId: string; eventType: string; skipReason?: string }) =>
      apiClient.post(`/progress/${patientProgramId}/day/${day}/exercises/${exerciseId}/event`, { eventType, skipReason }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['patient-program-day', patientProgramId, day] });
      await queryClient.invalidateQueries({ queryKey: ['patient-progress-summary', patientProgramId] });
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => apiClient.post('/progress/submit-day', {
      patientProgramId,
      dayNumber: day,
      exercises: exercises.map((exercise) => {
        const id = text(exercise._id || exercise.id);
        const state = progressExercises.find((item) => text(item.exercise) === id);
        return {
          exercise: id,
          videoStarted: Boolean(state?.videoStarted),
          videoCompleted: Boolean(state?.videoCompleted),
          markedCompleted: Boolean(state?.markedCompleted),
          skipped: Boolean(state?.skipped),
          skipReason: text(state?.skipReason),
        };
      }),
      painScoreBefore: painScoreBefore ? Number(painScoreBefore) : undefined,
      painScoreAfter: painScoreAfter ? Number(painScoreAfter) : undefined,
      difficultyRating: difficultyRating ? Number(difficultyRating) : undefined,
      feedbackText,
      discomfortReported,
      fullSessionCompleted: true,
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['patient-program', selectedEnrollmentId] });
      await queryClient.invalidateQueries({ queryKey: ['patient-program-day', patientProgramId, day] });
      await queryClient.invalidateQueries({ queryKey: ['patient-progress-summary', patientProgramId] });
      await queryClient.invalidateQueries({ queryKey: ['patient-prescription'] });
    },
  });

  if (programQuery.isError || dayQuery.isError) {
    return (
      <ErrorState
        title="Programme day could not load"
        message="This day may be locked or the selected programme is unavailable."
        onRetry={() => {
          programQuery.refetch();
          dayQuery.refetch();
        }}
      />
    );
  }

  const program = asRecord(patientProgram.program);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="overflow-hidden rounded-[28px] border border-emerald-100 bg-gradient-to-br from-white via-emerald-50/70 to-teal-50 p-5 shadow-sm sm:p-7">
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate(`/patient/programme${patientProgramId ? `?enrollment=${patientProgramId}` : ''}`)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white bg-white/90 text-neutral-600 shadow-sm transition hover:bg-neutral-50"
            aria-label="Back to programme"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
          </button>

          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] text-primary-700">
              <Sparkles className="h-3 w-3" />
              Today&apos;s session
            </div>
            <h1 className="mt-3 text-2xl font-black tracking-tight text-neutral-950 sm:text-3xl">
              Day {day}: {text(programDay.title, 'Recovery Session')}
            </h1>
            <p className="mt-2 text-sm leading-6 text-neutral-600">
              {text(program.name, 'Rehabilitation programme')} · {exercises.length} exercise{exercises.length === 1 ? '' : 's'} assigned
            </p>

            <div className="mt-5 max-w-xl">
              <div className="mb-2 flex items-center justify-between text-xs font-semibold">
                <span className="text-neutral-500">Session progress</span>
                <span className="text-primary-700">{completedCount} of {exercises.length} completed</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white">
                <div className="h-full rounded-full bg-primary-600 transition-all" style={{ width: `${sessionProgress}%` }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {dayQuery.isLoading && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-sm text-neutral-500 shadow-sm">
          Loading today&apos;s exercises...
        </div>
      )}

      {!dayQuery.isLoading && exercises.length === 0 && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-7 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-500">
            <HeartPulse className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-base font-bold text-neutral-900">No exercises assigned yet</h2>
          <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-neutral-500">
            Your care team has not added exercise content for this day.
          </p>
        </div>
      )}

      <div className="space-y-5">
        {exercises.map((exercise, index) => {
          const id = text(exercise._id || exercise.id);
          const state = progressExercises.find((item) => text(item.exercise) === id) || {};
          const youtubeId = text(exercise.youtubeVideoId) || extractYoutubeId(text(exercise.videoUrl));
          const completed = Boolean(state.markedCompleted);
          const skipped = Boolean(state.skipped);

          return (
            <article key={id} className={cn(
              'overflow-hidden rounded-[24px] border bg-white shadow-sm transition',
              completed ? 'border-emerald-200 ring-1 ring-emerald-100' : 'border-neutral-200/80'
            )}>
              <div className="border-b border-neutral-100 px-5 py-4 sm:px-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-black',
                      completed ? 'bg-emerald-100 text-emerald-700' : 'bg-primary-50 text-primary-700'
                    )}>
                      {completed ? <CheckCircle2 className="h-5 w-5" /> : index + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-neutral-400">Exercise {index + 1}</p>
                      <h2 className="truncate text-base font-black text-neutral-950 sm:text-lg">{text(exercise.name, 'Exercise')}</h2>
                    </div>
                  </div>
                  <ExerciseStatus completed={completed} skipped={skipped} />
                </div>
              </div>

              <div className="grid lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
                <div className="aspect-video bg-neutral-950 lg:aspect-auto lg:min-h-[360px]">
                  {youtubeId ? (
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${youtubeId}`}
                      title={text(exercise.name, 'Exercise video')}
                      className="h-full min-h-full w-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <div className="flex h-full min-h-[240px] flex-col items-center justify-center px-5 text-center text-white">
                      <Play className="h-8 w-8 text-neutral-500" />
                      <p className="mt-3 text-sm font-bold">Video not configured</p>
                      <p className="mt-1 text-xs text-neutral-400">Follow the written exercise guidance provided by your care team.</p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col p-5 sm:p-6">
                  <div>
                    <p className="text-sm leading-6 text-neutral-600">
                      {text(exercise.description, 'Follow the prescribed exercise instructions carefully.')}
                    </p>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-2">
                    <Info label="Sets" value={text(exercise.sets, '-')} />
                    <Info label="Reps" value={text(exercise.repetitions, '-')} />
                    <Info label="Hold" value={text(exercise.holdDuration, '-')} />
                    <Info label="Rest" value={text(exercise.restDuration, '-')} />
                  </div>

                  {Boolean(exercise.safetyInstructions) && (
                    <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-3.5">
                      <div className="flex gap-2.5">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                        <div>
                          <div className="text-xs font-extrabold text-amber-900">Safety note</div>
                          <p className="mt-1 text-xs leading-5 text-amber-800">{text(exercise.safetyInstructions)}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mt-auto grid gap-2 pt-5">
                    <button
                      type="button"
                      onClick={() => eventMutation.mutate({ exerciseId: id, eventType: 'video_started' })}
                      disabled={Boolean(state.videoStarted) || eventMutation.isPending}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-primary-200 bg-primary-50 px-4 py-2.5 text-sm font-bold text-primary-700 transition hover:bg-primary-100 disabled:cursor-default disabled:opacity-60"
                    >
                      <Play className="h-4 w-4" />
                      {state.videoStarted ? 'Video started' : 'Start video'}
                    </button>
                    <button
                      type="button"
                      onClick={() => eventMutation.mutate({ exerciseId: id, eventType: 'marked_completed' })}
                      disabled={completed || eventMutation.isPending}
                      className={cn(
                        'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition disabled:cursor-default',
                        completed ? 'bg-emerald-600' : 'bg-primary-600 hover:bg-primary-700'
                      )}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {completed ? 'Exercise completed' : 'Mark as complete'}
                    </button>
                    <button
                      type="button"
                      onClick={() => eventMutation.mutate({ exerciseId: id, eventType: 'skipped', skipReason: 'Patient skipped from portal' })}
                      disabled={skipped || eventMutation.isPending}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-neutral-500 transition hover:bg-neutral-50 hover:text-neutral-700 disabled:cursor-default disabled:opacity-60"
                    >
                      <SkipForward className="h-3.5 w-3.5" />
                      {skipped ? 'Exercise skipped' : 'Skip this exercise'}
                    </button>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <form
        className="overflow-hidden rounded-[24px] border border-neutral-200/80 bg-white shadow-sm"
        onSubmit={(event) => {
          event.preventDefault();
          submitMutation.mutate();
        }}
      >
        <div className="border-b border-neutral-100 px-5 py-5 sm:px-6">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-primary-700">Finish session</p>
          <h2 className="mt-1 text-xl font-black text-neutral-950">How did today feel?</h2>
          <p className="mt-1 text-sm text-neutral-500">Your feedback helps keep your recovery record complete.</p>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <NumberInput label="Pain before" value={painScoreBefore} onChange={setPainScoreBefore} helper="0 = no pain, 10 = severe" />
            <NumberInput label="Pain after" value={painScoreAfter} onChange={setPainScoreAfter} helper="0 = no pain, 10 = severe" />
            <NumberInput label="Difficulty" value={difficultyRating} onChange={setDifficultyRating} helper="0 = easy, 10 = very hard" />
          </div>

          <label className="block">
            <span className="text-sm font-bold text-neutral-800">Anything you want to share?</span>
            <textarea
              value={feedbackText}
              onChange={(event) => setFeedbackText(event.target.value)}
              placeholder="Optional notes about today's session"
              className="mt-2 min-h-24 w-full rounded-xl border border-neutral-300 px-3.5 py-3 text-sm outline-none transition placeholder:text-neutral-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            />
          </label>

          <label className={cn(
            'flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition',
            discomfortReported ? 'border-amber-200 bg-amber-50' : 'border-neutral-200 bg-neutral-50'
          )}>
            <input
              type="checkbox"
              checked={discomfortReported}
              onChange={(event) => setDiscomfortReported(event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
            />
            <div>
              <div className="text-sm font-bold text-neutral-800">I experienced discomfort during this session</div>
              <div className="mt-0.5 text-xs leading-5 text-neutral-500">Select this so the session record reflects how you felt.</div>
            </div>
          </label>

          {submitMutation.isSuccess && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm font-bold text-emerald-700">
              Day progress saved successfully.
            </div>
          )}
          {submitMutation.error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm font-bold text-rose-700">
              {errorMessage(submitMutation.error)}
            </div>
          )}

          <button
            disabled={submitMutation.isPending || exercises.length === 0}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitMutation.isPending ? (
              'Saving session...'
            ) : (
              <>
                Save today&apos;s progress
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

function ExerciseStatus({ completed, skipped }: { completed: boolean; skipped: boolean }) {
  if (completed) {
    return <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-extrabold text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" />Done</span>;
  }
  if (skipped) {
    return <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-extrabold text-neutral-600"><SkipForward className="h-3.5 w-3.5" />Skipped</span>;
  }
  return <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-extrabold text-primary-700"><Circle className="h-3 w-3" />Pending</span>;
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-3">
      <div className="text-[10px] font-bold uppercase tracking-wide text-neutral-400">{label}</div>
      <div className="mt-0.5 text-sm font-black text-neutral-900">{value}</div>
    </div>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  helper,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  helper: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-neutral-800">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        type="number"
        min="0"
        max="10"
        placeholder="0–10"
        className="mt-2 w-full rounded-xl border border-neutral-300 px-3.5 py-3 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
      />
      <span className="mt-1.5 block text-[10px] text-neutral-400">{helper}</span>
    </label>
  );
}

function asRecord(value: unknown): ApiRecord {
  return value && typeof value === 'object' ? value as ApiRecord : {};
}

function text(value: unknown, fallback = '') {
  return value === undefined || value === null || value === '' ? fallback : String(value);
}

function extractYoutubeId(url: string) {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match?.[1] || '';
}

function errorMessage(error: unknown) {
  const response = asRecord(asRecord(error).response);
  const data = asRecord(response.data);
  return text(data.message || asRecord(error).message, 'Request failed.');
}
