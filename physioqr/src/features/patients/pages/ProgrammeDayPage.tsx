import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Play, SkipForward } from 'lucide-react';
import apiClient from '@/lib/api-client';
import ErrorState from '@/components/feedback/ErrorState';
import { cn } from '@/lib/cn';

type ApiRecord = Record<string, unknown>;

// Renders one active programme day and submits exercise/progress events.
export default function ProgrammeDayPage() {
  const { dayNumber } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const day = Number(dayNumber) || 1;
  const [painScoreBefore, setPainScoreBefore] = useState('');
  const [painScoreAfter, setPainScoreAfter] = useState('');
  const [difficultyRating, setDifficultyRating] = useState('');
  const [feedbackText, setFeedbackText] = useState('');
  const [discomfortReported, setDiscomfortReported] = useState(false);

  const programQuery = useQuery({ queryKey: ['patient-program'], queryFn: async () => (await apiClient.get('/patients/me/program')).data, retry: false });
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

  const eventMutation = useMutation({
    mutationFn: async ({ exerciseId, eventType, skipReason }: { exerciseId: string; eventType: string; skipReason?: string }) => apiClient.post(`/progress/${patientProgramId}/day/${day}/exercises/${exerciseId}/event`, { eventType, skipReason }),
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
      await queryClient.invalidateQueries({ queryKey: ['patient-program'] });
      await queryClient.invalidateQueries({ queryKey: ['patient-program-day', patientProgramId, day] });
      await queryClient.invalidateQueries({ queryKey: ['patient-progress-summary', patientProgramId] });
    },
  });

  if (programQuery.isError || dayQuery.isError) {
    return <ErrorState title="Programme day could not load" message="This day may be locked or the programme is unavailable." onRetry={() => { programQuery.refetch(); dayQuery.refetch(); }} />;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/patient/programme')} className="p-2 border border-neutral-300 rounded-lg hover:bg-neutral-100" aria-label="Back to programme">
          <ArrowLeft className="w-4 h-4 text-neutral-600" />
        </button>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-neutral-900">Day {day}: {text(programDay.title, 'Recovery Session')}</h1>
          <p className="text-xs text-neutral-500">{exercises.length} exercise video{exercises.length === 1 ? '' : 's'} assigned</p>
        </div>
      </div>

      <div className="space-y-4">
        {dayQuery.isLoading && <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-sm text-neutral-500">Loading day content...</div>}
        {!dayQuery.isLoading && exercises.length === 0 && <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-sm text-neutral-500">No exercises assigned for this day yet.</div>}
        {exercises.map((exercise) => {
          const id = text(exercise._id || exercise.id);
          const state = progressExercises.find((item) => text(item.exercise) === id) || {};
          const youtubeId = text(exercise.youtubeVideoId) || extractYoutubeId(text(exercise.videoUrl));
          return (
            <article key={id} className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
              <div className="aspect-video bg-neutral-900">
                {youtubeId ? (
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${youtubeId}`}
                    title={text(exercise.name, 'Exercise video')}
                    className="h-full w-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm font-semibold text-white">Video URL not configured</div>
                )}
              </div>
              <div className="space-y-4 p-5">
                <div>
                  <h2 className="text-lg font-bold text-neutral-900">{text(exercise.name, 'Exercise')}</h2>
                  <p className="mt-1 text-sm text-neutral-500">{text(exercise.description, 'Follow the video instructions carefully and stop if severe pain occurs.')}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-4">
                  <Info label="Sets" value={text(exercise.sets, '-')} />
                  <Info label="Reps" value={text(exercise.repetitions, '-')} />
                  <Info label="Hold" value={text(exercise.holdDuration, '-')} />
                  <Info label="Rest" value={text(exercise.restDuration, '-')} />
                </div>
                {Boolean(exercise.safetyInstructions) && <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{text(exercise.safetyInstructions)}</div>}
                <div className="grid gap-2 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => eventMutation.mutate({ exerciseId: id, eventType: 'video_started' })}
                    disabled={Boolean(state.videoStarted) || eventMutation.isPending}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-primary-200 px-4 py-2.5 text-sm font-semibold text-primary-700 hover:bg-primary-50 disabled:opacity-60"
                  >
                    <Play className="h-4 w-4" />
                    {state.videoStarted ? 'Video Started' : 'Start Video'}
                  </button>
                  <button
                    type="button"
                    onClick={() => eventMutation.mutate({ exerciseId: id, eventType: 'marked_completed' })}
                    disabled={Boolean(state.markedCompleted) || eventMutation.isPending}
                    className={cn('inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white', state.markedCompleted ? 'bg-success-600' : 'bg-primary-600 hover:bg-primary-700')}
                  >
                    <CheckCircle className="h-4 w-4" />
                    {state.markedCompleted ? 'Completed' : 'Mark Complete'}
                  </button>
                  <button
                    type="button"
                    onClick={() => eventMutation.mutate({ exerciseId: id, eventType: 'skipped', skipReason: 'Patient skipped from portal' })}
                    disabled={Boolean(state.skipped) || eventMutation.isPending}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
                  >
                    <SkipForward className="h-4 w-4" />
                    {state.skipped ? 'Skipped' : 'Skip'}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <form className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm space-y-4" onSubmit={(event) => { event.preventDefault(); submitMutation.mutate(); }}>
        <h2 className="text-base font-bold text-neutral-900">Daily Feedback</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberInput label="Pain before" value={painScoreBefore} onChange={setPainScoreBefore} />
          <NumberInput label="Pain after" value={painScoreAfter} onChange={setPainScoreAfter} />
          <NumberInput label="Difficulty" value={difficultyRating} onChange={setDifficultyRating} />
        </div>
        <label className="block">
          <span className="text-sm font-semibold text-neutral-700">Feedback</span>
          <textarea value={feedbackText} onChange={(event) => setFeedbackText(event.target.value)} className="mt-2 min-h-24 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-primary-500" />
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold text-neutral-700">
          <input type="checkbox" checked={discomfortReported} onChange={(event) => setDiscomfortReported(event.target.checked)} className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500" />
          I experienced discomfort during this session.
        </label>
        {submitMutation.isSuccess && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">Day progress saved.</div>}
        {submitMutation.error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{errorMessage(submitMutation.error)}</div>}
        <button disabled={submitMutation.isPending || exercises.length === 0} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60">
          <Play className="h-4 w-4" />
          {submitMutation.isPending ? 'Saving...' : 'Submit Day Progress'}
        </button>
      </form>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-neutral-50 p-3"><div className="text-xs text-neutral-500">{label}</div><div className="font-bold text-neutral-900">{value}</div></div>;
}

function NumberInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-neutral-700">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} type="number" min="0" max="10" className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-primary-500" />
    </label>
  );
}

function asRecord(value: unknown): ApiRecord {
  return value && typeof value === 'object' ? value as ApiRecord : {};
}

function text(value: unknown, fallback = '') {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value);
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
