import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Languages,
  Play,
  Printer,
  Video,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import apiClient from '@/lib/api-client';
import ErrorState from '@/components/feedback/ErrorState';
import { cn } from '@/lib/cn';

type ApiRecord = Record<string, unknown>;
type ActiveProgram = {
  enrollmentId?: string;
  currentDay?: number;
  completionPercentage?: number;
  program?: { programCode?: string; name?: string; nameHindi?: string; durationDays?: number };
  currentDayContent?: {
    programDayId?: string | null;
    exerciseCount?: number;
    videoCount?: number;
    contentReady?: boolean;
    videoReady?: boolean;
  };
};
type Prescription = {
  prescriptionId: string;
  prescriptionDate?: string;
  prescriptionUrl?: string;
  prescriptionQr?: string;
  availableLanguages?: string[];
  activePrograms?: ActiveProgram[];
  enrollment?: { id?: string; currentDay?: number; completionPercentage?: number };
  patient?: { patientId?: string; fullName?: string; mobile?: string; age?: number; dateOfBirth?: string; gender?: string };
  doctor?: { doctorId?: string; fullName?: string; qualification?: string; specialization?: string; clinicName?: string; clinicAddress?: string; city?: string; state?: string; postalCode?: string; clinicContact?: string };
  program?: { programCode?: string; name?: string; nameHindi?: string; description?: string; instructions?: string; precautions?: string; durationDays?: number };
  day?: { id?: string; dayNumber?: number; title?: string; focus?: string; exercises?: Array<{ displayOrder?: number; exercise?: ApiRecord | null }> };
};

export default function PatientProgrammePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedEnrollmentId = searchParams.get('enrollment') || '';
  const [language, setLanguage] = useState('en');
  const [playingId, setPlayingId] = useState('');
  const [showPrescription, setShowPrescription] = useState(false);
  const [showGuidance, setShowGuidance] = useState(false);
  const query = useQuery<Prescription>({
    queryKey: ['patient-prescription', selectedEnrollmentId],
    queryFn: () => apiClient.get('/patients/me/prescription', { params: selectedEnrollmentId ? { enrollmentId: selectedEnrollmentId } : {} }).then((response) => response.data),
    retry: false,
  });

  const data = query.data;
  const day = data?.day;
  const enrollment = data?.enrollment;
  const activePrograms = data?.activePrograms || [];
  const languages = data?.availableLanguages?.length ? data.availableLanguages : ['en'];
  const allExercises = useMemo(() => (day?.exercises || []).filter((entry) => entry.exercise), [day?.exercises]);
  const exercises = useMemo(() => {
    if (languages.length <= 1) return allExercises;
    const filtered = allExercises.filter((entry) => text(entry.exercise?.language, 'en') === language);
    return filtered.length ? filtered : allExercises;
  }, [allExercises, language, languages.length]);

  if (query.isLoading) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-white px-5 py-16 text-center shadow-sm">
        <div className="mx-auto h-10 w-10 animate-pulse rounded-2xl bg-primary-100" />
        <p className="mt-4 text-sm font-semibold text-neutral-500">Loading your prescription…</p>
      </div>
    );
  }
  if (query.isError || !data) {
    return <ErrorState title="Prescription could not load" message={requestError(query.error)} onRetry={() => query.refetch()} />;
  }

  const patient = data.patient || {};
  const doctor = data.doctor || {};
  const program = data.program || {};
  const currentDay = Number(day?.dayNumber || enrollment?.currentDay || 1);
  const patientAge = patient.age ?? ageFromDate(patient.dateOfBirth);
  const clinicLocation = [doctor.clinicAddress, doctor.city, doctor.state, doctor.postalCode].filter(Boolean).join(', ');

  const selectProgram = (id?: string) => {
    if (!id || id === enrollment?.id) return;
    setPlayingId('');
    setSearchParams({ enrollment: id });
  };

  const startVideo = (exercise: ApiRecord) => {
    const id = text(exercise._id || exercise.id);
    setPlayingId(id);
    if (enrollment?.id && id) {
      apiClient.post(`/progress/${enrollment.id}/day/${currentDay}/exercises/${id}/event`, { eventType: 'video_started' }).catch(() => undefined);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4 text-neutral-900 print:max-w-none print:space-y-0">
      {activePrograms.length > 1 && (
        <section className="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm print:hidden sm:p-5">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.09em] text-primary-700">Your approved programmes</p>
            <p className="mt-1 text-sm text-neutral-500">Switch between your active rehabilitation plans.</p>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {activePrograms.map((item) => {
              const selected = item.enrollmentId === enrollment?.id;
              const contentReady = Boolean(item.currentDayContent?.contentReady);
              const videoCount = Number(item.currentDayContent?.videoCount || 0);
              return (
                <button
                  key={item.enrollmentId}
                  type="button"
                  onClick={() => selectProgram(item.enrollmentId)}
                  className={cn(
                    'rounded-xl border p-3 text-left transition',
                    selected
                      ? 'border-primary-300 bg-primary-50 ring-1 ring-primary-100'
                      : 'border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className={cn('block truncate text-sm font-extrabold', selected ? 'text-primary-900' : 'text-neutral-900')}>
                        {patientProgrammeName(item.program?.name)}
                      </span>
                      <span className="mt-1 block text-[11px] font-medium text-neutral-500">
                        Day {item.currentDay || 1} · {item.program?.durationDays || '—'} days
                      </span>
                    </div>
                    {selected && <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-primary-600" />}
                  </div>
                  <span className={cn('mt-2 flex items-center gap-1.5 text-[10px] font-bold', contentReady ? 'text-emerald-700' : 'text-amber-700')}>
                    <Video className="h-3 w-3" />
                    {contentReady ? `${videoCount} video${videoCount === 1 ? '' : 's'} ready` : 'Content not configured'}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white print:rounded-none print:border-0">
        <header className="border-b border-neutral-100 px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-neutral-500">My rehabilitation plan</p>
              <h1 className="mt-1 text-xl font-semibold tracking-tight text-neutral-900">Today's exercises</h1>
              <p className="mt-1 text-xs text-neutral-500">
                {patient.fullName || 'Patient'}{doctor.fullName ? ' · ' + doctor.fullName : ''}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 print:hidden">
              <label className="flex min-h-10 items-center gap-1.5 rounded-lg border border-neutral-200 px-2.5 text-xs font-medium text-neutral-700">
                <Languages className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">Exercise language</span>
                <select aria-label="Exercise language" value={language} onChange={(event) => setLanguage(event.target.value)} className="bg-transparent py-2 outline-none">
                  {languages.map((item) => <option key={item} value={item}>{item === 'hi' ? 'Hindi' : 'English'}</option>)}
                </select>
              </label>
              <button type="button" onClick={() => setShowPrescription((value) => !value)}
                aria-expanded={showPrescription} className="min-h-10 rounded-lg border border-neutral-200 px-3 text-xs font-medium text-neutral-700 hover:bg-neutral-50">
                {showPrescription ? 'Hide prescription' : 'Prescription details'}
              </button>
              <button type="button" onClick={() => window.print()}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-neutral-200 px-3 text-xs font-medium text-neutral-700 hover:bg-neutral-50">
                <Printer className="h-4 w-4" aria-hidden="true" /> Print
              </button>
            </div>
          </div>
        </header>
        <div className={cn('border-b border-neutral-100 bg-neutral-50 px-4 py-4 sm:px-6', showPrescription ? 'block' : 'hidden', 'print:block print:bg-white')}>
          <div className="flex flex-wrap items-start justify-between gap-5 text-sm">
            <div>
              <img src="/PhysioQR.png" alt="PhysioQR" className="mb-3 h-10 w-auto object-contain" />
              <p className="font-semibold text-neutral-900">{patient.fullName || 'Patient'}</p>
              <p className="mt-1 text-xs text-neutral-500">{[patientAge ? patientAge + 'y' : '', patient.gender, patient.mobile || patient.patientId].filter(Boolean).join(' · ')}</p>
              <p className="mt-3 font-medium text-neutral-800">{doctor.fullName || 'PhysioQR Clinical Team'}</p>
              <p className="mt-1 text-xs text-neutral-500">{[doctor.qualification, doctor.specialization, doctor.clinicName, clinicLocation].filter(Boolean).join(' · ')}</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="text-right text-xs text-neutral-500">
                <p>Issued {dateText(data.prescriptionDate)}</p>
                <p className="mt-1">{data.prescriptionId}</p>
              </div>
              {data.prescriptionQr && <img src={data.prescriptionQr} alt="Prescription QR code" className="h-16 w-16 rounded-lg border border-neutral-200 bg-white p-1" />}
            </div>
          </div>
        </div>
        <div className="p-5 sm:p-6">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold text-emerald-800">Day {currentDay} of {program.durationDays || '—'}</p>
              <span className="text-xs font-medium text-neutral-500">{exercises.length} exercises</span>
            </div>
            <h2 className="mt-2 text-lg font-semibold leading-snug tracking-tight text-neutral-950 sm:text-xl">
              {day?.title || patientProgrammeName(program.name)}
            </h2>
            <p className="mt-1.5 text-sm text-neutral-600">{patientProgrammeName(program.name)}</p>
            {day?.focus && <p className="mt-2 text-sm text-neutral-700"><span className="font-medium">Today's focus:</span> {day.focus}</p>}
            {(program.instructions || program.description || program.precautions) && (
              <div className="mt-4 border-t border-neutral-100 pt-3">
                <button type="button" onClick={() => setShowGuidance((value) => !value)} aria-expanded={showGuidance}
                  className="text-sm font-medium text-emerald-800 underline-offset-4 hover:underline print:hidden">
                  {showGuidance ? 'Hide programme guidance −' : 'Read programme guidance +'}
                </button>
                <div className={cn('mt-3 space-y-2 text-sm leading-6 text-neutral-600', showGuidance ? 'block' : 'hidden', 'print:block')}>
                  {program.description && <p>{program.description}</p>}
                  {program.instructions && <p>{program.instructions}</p>}
                  {program.precautions && <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-950"><strong>Precautions:</strong> {program.precautions}</p>}
                </div>
              </div>
            )}
          </div>
          <div className="mt-5 space-y-4">
            {exercises.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50/70 px-4 py-10 text-center">
                <Video className="mx-auto h-7 w-7 text-neutral-300" />
                <p className="mt-3 text-sm font-bold text-neutral-700">No exercises configured for this day</p>
                <p className="mt-1 text-xs text-neutral-500">Your clinical team can add exercise content to this prescription.</p>
              </div>
            ) : exercises.map((entry, index) => {
              const exercise = entry.exercise || {};
              const id = text(exercise._id || exercise.id);
              const youtubeId = text(exercise.youtubeVideoId) || extractYoutubeId(text(exercise.videoUrl));
              const title = language === 'hi' ? text(exercise.nameHindi, text(exercise.name, 'Exercise')) : text(exercise.name, 'Exercise');
              const thumbnail = text(exercise.thumbnail) || (youtubeId ? `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg` : '');

              return (
                <article key={id || index} className="overflow-hidden rounded-xl border border-neutral-200 bg-white print:break-inside-avoid">
                  <div className="grid gap-0 sm:grid-cols-[minmax(0,36%)_1fr]">
                    <div className="relative aspect-video overflow-hidden bg-neutral-950 print:aspect-[16/10]">
                      {playingId === id && youtubeId ? (
                        <iframe src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1`}
                          title={title} className="absolute inset-0 h-full w-full border-0"
                          allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
                      ) : thumbnail ? (
                        <img src={thumbnail} alt={`${title} demonstration thumbnail`}
                          className="absolute inset-0 h-full w-full object-cover" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center gap-2 text-xs text-white/80">
                          <Video className="h-4 w-4" /> Video not available
                        </div>
                      )}
                      {playingId !== id && youtubeId && (
                        <button type="button" onClick={() => startVideo(exercise)}
                          className="absolute inset-0 m-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-neutral-900 shadow-md transition hover:scale-105 print:hidden"
                          aria-label={`Play ${title}`}>
                          <Play className="ml-0.5 h-5 w-5 fill-current" />
                        </button>
                      )}
                      <span className="absolute left-3 top-3 rounded-md bg-neutral-950/75 px-2 py-1 text-[11px] font-medium text-white">
                        {index + 1} / {exercises.length}
                      </span>
                    </div>
                    <div className="p-4 sm:p-5">
                      <h3 className="text-base font-semibold text-neutral-950">{title}</h3>
                      <p className="mt-2 text-sm leading-6 text-neutral-600">
                        {text(exercise.description, 'Move slowly and stay within a comfortable range.')}
                      </p>
                      <dl className="mt-3 flex flex-wrap gap-2">
                        <DosePill label="Sets" value={exercise.sets} />
                        <DosePill label="Reps" value={exercise.repetitions} />
                        <DosePill label="Hold" value={exercise.holdDuration} />
                        <DosePill label="Rest" value={exercise.restDuration} />
                      </dl>
                      {Boolean(exercise.safetyInstructions) && (
                        <p className="mt-3 border-t border-neutral-100 pt-3 text-xs leading-5 text-amber-900">
                          <strong>Safety:</strong> {text(exercise.safetyInstructions)}
                        </p>
                      )}
                      {Boolean(exercise.frequency) && (
                        <details className="mt-3 text-xs text-neutral-600 print:open">
                          <summary className="cursor-pointer font-medium text-emerald-800">Additional guidance</summary>
                          <p className="mt-1 leading-5">{text(exercise.frequency)}</p>
                        </details>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 pt-4 print:hidden">
            <p className="max-w-sm text-xs leading-5 text-neutral-500">
              Stop if a movement increases pain. Record how your session went.
            </p>
            {day?.id && allExercises.length > 0 ? (
              <button type="button"
                onClick={() => navigate(`/patient/programme/day/${currentDay}?enrollment=${enrollment?.id || ''}`)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800">
                <CalendarDays className="h-4 w-4" /> Start daily session <ChevronRight className="h-4 w-4" />
              </button>
            ) : <p className="text-sm text-amber-800">Daily session is not configured yet</p>}
          </div>
        </div>
      </section>
    </div>
  );
}

function DosePill({ label, value }: { label: string; value: unknown }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="rounded-md bg-neutral-50 px-2.5 py-1.5">
      <dt className="text-[11px] font-medium text-neutral-500">{label}</dt>
      <dd className="text-sm font-semibold text-neutral-900">{text(value)}</dd>
    </div>
  );
}

function patientProgrammeName(value?: string) {
  // Draft suffix is an internal editorial label. The backend only serves
  // clinician-gated programmes to patients after genuine sign-off/publication.
  const cleaned = String(value || '').replace(/\s*\(CLINICAL DRAFT\)\s*$/i, '').trim();
  return cleaned || 'Rehabilitation programme';
}

function text(value: unknown, fallback = '') {
  return value === undefined || value === null || value === '' ? fallback : String(value);
}

function ageFromDate(value?: string) {
  if (!value) return undefined;
  const birth = new Date(value);
  if (Number.isNaN(birth.getTime())) return undefined;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const beforeBirthday = today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate());
  if (beforeBirthday) age -= 1;
  return age > 0 ? age : undefined;
}

function dateText(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function extractYoutubeId(url: string) {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match?.[1] || '';
}

function requestError(error: unknown) {
  const source = error && typeof error === 'object' ? error as { response?: { data?: { message?: string } }; message?: string } : {};
  return source.response?.data?.message || source.message || 'Your active rehabilitation prescription is unavailable.';
}
