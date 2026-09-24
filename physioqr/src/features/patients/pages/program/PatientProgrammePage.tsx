import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Languages,
  Play,
  Printer,
  Stethoscope,
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
  program?: { programCode?: string; name?: string; nameHindi?: string; description?: string; durationDays?: number };
  day?: { id?: string; dayNumber?: number; title?: string; exercises?: Array<{ displayOrder?: number; exercise?: ApiRecord | null }> };
};

export default function PatientProgrammePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedEnrollmentId = searchParams.get('enrollment') || '';
  const [language, setLanguage] = useState('en');
  const [playingId, setPlayingId] = useState('');
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
    <div className="mx-auto max-w-5xl space-y-4 text-neutral-900 print:max-w-none print:space-y-0">
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
                        {item.program?.name || 'Rehabilitation programme'}
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

      <section className="overflow-hidden rounded-[24px] border border-neutral-200/80 bg-white shadow-sm print:rounded-none print:border-0 print:shadow-none">
        <div className="grid gap-5 border-b border-neutral-100 bg-neutral-50/70 p-5 md:grid-cols-[1fr_1.25fr_auto] md:items-start print:bg-white sm:p-6">
          <div className="flex items-center gap-3">
            <img src="/PhysioQR.png" alt="PhysioQR" className="h-12 w-auto object-contain sm:h-14" />
            <div>
              <div className="text-lg font-black tracking-tight text-neutral-950 sm:text-xl">PhysioQR</div>
              <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">guided rehabilitation</div>
            </div>
          </div>

          <div className="min-w-0 rounded-xl border border-neutral-200 bg-white p-3.5 text-sm shadow-sm print:border-0 print:p-0 print:shadow-none">
            <div className="flex items-center gap-2 font-extrabold text-neutral-950">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 text-primary-700 print:hidden">
                <Stethoscope className="h-4 w-4" />
              </div>
              <span>{doctor.fullName || 'PhysioQR Clinical Team'}</span>
            </div>
            <p className="mt-2 text-xs text-neutral-500">
              {[doctor.qualification, doctor.specialization].filter(Boolean).join(' · ') || 'Clinical rehabilitation provider'}
            </p>
            <p className="mt-1.5 text-xs leading-5 text-neutral-600">
              {doctor.clinicName || (doctor.fullName ? 'PhysioQR Partner Clinic' : 'PhysioQR Direct')}
              {clinicLocation ? ` · ${clinicLocation}` : ''}
            </p>
            {doctor.clinicContact && <p className="mt-1 text-xs text-neutral-500">Clinic: {doctor.clinicContact}</p>}
          </div>

          <div className="flex items-center gap-3 md:flex-col md:items-end">
            {data.prescriptionQr && (
              <img
                src={data.prescriptionQr}
                alt="Prescription QR code"
                className="h-16 w-16 rounded-xl border border-neutral-200 bg-white p-1 sm:h-20 sm:w-20 print:h-16 print:w-16"
              />
            )}
            <div className="flex flex-wrap gap-2 print:hidden md:justify-end">
              <label className="relative inline-flex min-h-9 items-center gap-2 rounded-lg border border-neutral-300 bg-white px-2.5 text-xs font-semibold text-neutral-700">
                <Languages className="h-3.5 w-3.5 text-neutral-400" />
                <select value={language} onChange={(event) => setLanguage(event.target.value)} className="appearance-none bg-transparent pr-3 outline-none">
                  {languages.map((item) => <option key={item} value={item}>{item === 'hi' ? 'Hindi' : 'English'}</option>)}
                </select>
              </label>
              <button type="button" onClick={() => window.print()} className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 text-xs font-semibold text-neutral-700 hover:bg-neutral-50">
                <Printer className="h-3.5 w-3.5" />
                Print
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 border-b border-neutral-100 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center sm:px-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-neutral-400">Patient</p>
            <h1 className="mt-1 text-lg font-black text-neutral-950">{patient.fullName || 'Patient'}</h1>
            <p className="mt-1 text-xs text-neutral-500">
              {[patientAge ? `${patientAge}y` : '', patient.gender, patient.mobile || patient.patientId].filter(Boolean).join(' · ') || 'Patient profile'}
            </p>
          </div>
          <div className="sm:text-right">
            <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-neutral-400">Prescription date</div>
            <div className="mt-1 text-sm font-extrabold text-neutral-900">{dateText(data.prescriptionDate)}</div>
            <div className="mt-1 text-[10px] text-neutral-400">{data.prescriptionId}</div>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-[0.09em] text-primary-700">{program.name || 'Rehabilitation programme'}</div>
              <h2 className="mt-1 text-xl font-black text-neutral-950">
                Day {currentDay}{day?.title ? ` · ${day.title}` : ''}
              </h2>
              <p className="mt-1 text-sm text-neutral-500">{program.description || 'Your prescribed exercises for this recovery day.'}</p>
            </div>
            <div className="inline-flex items-center gap-2 self-start rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-bold text-neutral-600 sm:self-auto">
              <Video className="h-3.5 w-3.5" />
              {exercises.length} exercise{exercises.length === 1 ? '' : 's'}
            </div>
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
                <article key={id || index} className="overflow-hidden rounded-2xl border border-neutral-200 bg-white print:break-inside-avoid">
                  <div className="grid md:grid-cols-[42%_1fr]">
                    <div className="relative min-h-56 overflow-hidden bg-neutral-950 print:min-h-44">
                      {playingId === id && youtubeId ? (
                        <iframe
                          src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1`}
                          title={title}
                          className="absolute inset-0 h-full w-full border-0"
                          allow="autoplay; encrypted-media; picture-in-picture"
                          allowFullScreen
                        />
                      ) : thumbnail ? (
                        <img src={thumbnail} alt={`${title} exercise`} className="absolute inset-0 h-full w-full object-cover opacity-90" />
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center text-white">
                          <Video className="h-8 w-8 text-neutral-600" />
                          <p className="mt-3 text-sm font-bold">Video not configured</p>
                        </div>
                      )}

                      {playingId !== id && youtubeId && (
                        <button
                          type="button"
                          onClick={() => startVideo(exercise)}
                          className="absolute inset-0 m-auto flex h-14 w-14 items-center justify-center rounded-full bg-white text-neutral-950 shadow-xl transition hover:scale-105 print:hidden"
                          aria-label={`Play ${title}`}
                        >
                          <Play className="ml-1 h-5 w-5 fill-current" />
                        </button>
                      )}

                      <div className="absolute left-3 top-3 rounded-full bg-neutral-950/70 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur">
                        Exercise {index + 1}
                      </div>
                    </div>

                    <div className="p-5 sm:p-6">
                      <h3 className="text-lg font-black text-neutral-950">{title}</h3>
                      <p className="mt-2 text-sm leading-6 text-neutral-600">{text(exercise.description, 'Follow the prescribed movement slowly and with control.')}</p>

                      <dl className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                        <PrescriptionValue label="Reps" value={exercise.repetitions} />
                        <PrescriptionValue label="Sets" value={exercise.sets} />
                        <PrescriptionValue label="Hold" value={exercise.holdDuration} />
                        <PrescriptionValue label="Rest" value={exercise.restDuration} />
                        <PrescriptionValue label="Frequency" value={exercise.frequency} />
                      </dl>

                      {Boolean(exercise.safetyInstructions) && (
                        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs leading-5 text-amber-900">
                          {text(exercise.safetyInstructions)}
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="mt-6 flex flex-col gap-3 rounded-2xl bg-neutral-50 p-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
            <p className="max-w-2xl text-xs leading-5 text-neutral-500">
              Follow only the exercises prescribed for you. Use daily tracking to record completion and feedback.
            </p>
            {day?.id && allExercises.length > 0 ? (
              <button
                type="button"
                onClick={() => navigate(`/patient/programme/day/${currentDay}?enrollment=${enrollment?.id || ''}`)}
                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 text-sm font-extrabold text-white shadow-sm transition hover:bg-primary-700"
              >
                <CalendarDays className="h-4 w-4" />
                Start daily tracking
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <div className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 px-4 text-sm font-bold text-amber-800">
                Day content not configured
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function PrescriptionValue({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="rounded-xl bg-neutral-50 p-3">
      <dt className="text-[10px] font-bold uppercase tracking-wide text-neutral-400">{label}</dt>
      <dd className="mt-0.5 text-sm font-black text-neutral-900">{text(value, '—')}</dd>
    </div>
  );
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
