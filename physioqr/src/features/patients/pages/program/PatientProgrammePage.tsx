import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, Play, Printer, Stethoscope } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import apiClient from '@/lib/api-client';
import ErrorState from '@/components/feedback/ErrorState';

type ApiRecord = Record<string, unknown>;
type ActiveProgram = {
  enrollmentId?: string;
  currentDay?: number;
  completionPercentage?: number;
  program?: { programCode?: string; name?: string; nameHindi?: string; durationDays?: number };
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

  if (query.isLoading) return <div className="py-16 text-center text-sm font-semibold text-neutral-500">Loading your prescription…</div>;
  if (query.isError || !data) return <ErrorState title="Prescription could not load" message={requestError(query.error)} onRetry={() => query.refetch()} />;

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
    <div className="mx-auto max-w-5xl bg-white text-neutral-900 print:max-w-none print:shadow-none">
      {activePrograms.length > 1 && <section className="mb-4 rounded-xl border border-neutral-200 bg-white p-4 print:hidden">
        <div className="text-xs font-bold uppercase tracking-[0.14em] text-neutral-500">Your approved programmes</div>
        <div className="mt-3 flex flex-wrap gap-2">
          {activePrograms.map((item) => {
            const selected = item.enrollmentId === enrollment?.id;
            return <button key={item.enrollmentId} type="button" onClick={() => selectProgram(item.enrollmentId)} className={`rounded-lg border px-3 py-2 text-left text-sm font-semibold ${selected ? 'border-primary-500 bg-primary-50 text-primary-800' : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'}`}>
              <span className="block">{item.program?.name || 'Rehabilitation programme'}</span>
              <span className="mt-0.5 block text-[11px] font-medium opacity-70">Day {item.currentDay || 1} · {item.program?.durationDays || '—'} days</span>
            </button>;
          })}
        </div>
      </section>}

      <section className="border border-neutral-200 bg-white print:border-0">
        <div className="grid gap-5 border-b border-neutral-200 p-5 md:grid-cols-[1fr_1.2fr_auto] md:items-start">
          <div className="flex items-center gap-3">
            <img src="/PhysioQR.png" alt="PhysioQR" className="h-14 w-auto object-contain" />
            <div><div className="text-xl font-bold tracking-tight text-neutral-950">PhysioQR</div><div className="text-[11px] font-semibold tracking-[0.18em] text-neutral-400">guided rehabilitation</div></div>
          </div>

          <div className="min-w-0 text-sm">
            <div className="flex items-center gap-2 font-bold text-neutral-950"><Stethoscope className="h-4 w-4 text-primary-600" />{doctor.fullName || 'PhysioQR Clinical Team'}</div>
            <p className="mt-1 text-xs text-neutral-500">{[doctor.qualification, doctor.specialization].filter(Boolean).join(' · ') || 'Clinical rehabilitation provider'}</p>
            <p className="mt-2 text-xs leading-5 text-neutral-600">{doctor.clinicName || (doctor.fullName ? 'PhysioQR Partner Clinic' : 'PhysioQR Direct')}{clinicLocation ? ` · ${clinicLocation}` : ''}</p>
            {doctor.clinicContact && <p className="mt-1 text-xs text-neutral-500">Clinic: {doctor.clinicContact}</p>}
          </div>

          <div className="flex flex-wrap items-end gap-3 md:flex-col md:items-center">
            {data.prescriptionQr && <img src={data.prescriptionQr} alt="Prescription QR code" className="h-20 w-20 rounded border border-neutral-200 bg-white p-1 print:h-16 print:w-16" />}
            <div className="flex flex-wrap items-end gap-2 print:hidden md:flex-col md:items-stretch">
              <label className="text-[11px] font-semibold text-neutral-500">Video language
                <select value={language} onChange={(event) => setLanguage(event.target.value)} className="mt-1 block min-h-9 rounded-lg border border-neutral-300 bg-white px-2.5 text-xs font-semibold text-neutral-700">
                  {languages.map((item) => <option key={item} value={item}>{item === 'hi' ? 'Hindi' : 'English'}</option>)}
                </select>
              </label>
              <button type="button" onClick={() => window.print()} className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-neutral-300 px-3 text-xs font-semibold text-neutral-700"><Printer className="h-4 w-4" />Print</button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 border-b border-neutral-200 bg-neutral-50/60 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center print:bg-white">
          <div><h1 className="text-lg font-bold text-neutral-950">{patient.fullName || 'Patient'}</h1><p className="mt-1 text-xs text-neutral-500">{patientAge ? `${patientAge}y · ` : ''}{patient.mobile || patient.patientId || 'Patient profile'}</p></div>
          <div className="text-left sm:text-right"><div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Prescription date</div><div className="mt-1 text-sm font-bold text-neutral-900">{dateText(data.prescriptionDate)}</div><div className="mt-1 text-[11px] text-neutral-400">{data.prescriptionId}</div></div>
        </div>

        <div className="px-5 py-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><div className="text-xs font-bold uppercase tracking-[0.14em] text-primary-700">{program.name || 'Rehabilitation programme'}</div><h2 className="mt-1 text-lg font-bold text-neutral-950">Day {currentDay}{day?.title ? ` · ${day.title}` : ''}</h2></div><div className="text-xs font-semibold text-neutral-500">Exercises ({exercises.length})</div></div>

          <div className="mt-4 space-y-4">
            {exercises.length === 0 ? <div className="rounded-xl border border-dashed border-neutral-300 px-4 py-10 text-center text-sm text-neutral-500">No exercises are configured for this prescription day yet.</div> : exercises.map((entry, index) => {
              const exercise = entry.exercise || {};
              const id = text(exercise._id || exercise.id);
              const youtubeId = text(exercise.youtubeVideoId) || extractYoutubeId(text(exercise.videoUrl));
              const title = language === 'hi' ? text(exercise.nameHindi, text(exercise.name, 'Exercise')) : text(exercise.name, 'Exercise');
              const thumbnail = text(exercise.thumbnail) || (youtubeId ? `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg` : '');
              return <article key={id || index} className="overflow-hidden rounded-xl border border-neutral-200 bg-white print:break-inside-avoid">
                <div className="grid md:grid-cols-[42%_1fr]">
                  <div className="relative min-h-56 bg-neutral-100 print:min-h-44">
                    {playingId === id && youtubeId ? <iframe src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1`} title={title} className="absolute inset-0 h-full w-full border-0" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen /> : thumbnail ? <img src={thumbnail} alt={`${title} exercise`} className="absolute inset-0 h-full w-full object-cover" /> : <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-neutral-400">Video thumbnail not configured</div>}
                    {playingId !== id && youtubeId && <button type="button" onClick={() => startVideo(exercise)} className="absolute inset-0 m-auto flex h-14 w-14 items-center justify-center rounded-full bg-neutral-950/80 text-white shadow-lg print:hidden" aria-label={`Play ${title}`}><Play className="ml-1 h-6 w-6 fill-current" /></button>}
                    <div className="absolute bottom-0 left-0 bg-white/95 px-3 py-1.5 text-[11px] font-semibold text-neutral-500">Exercise #{index + 1}</div>
                  </div>

                  <div className="p-5">
                    <h3 className="text-base font-bold text-neutral-950">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-neutral-600">{text(exercise.description, 'Follow the prescribed movement slowly and with control.')}</p>
                    <dl className="mt-4 grid grid-cols-2 gap-x-5 gap-y-2 text-sm sm:grid-cols-3">
                      <PrescriptionValue label="Reps" value={exercise.repetitions} />
                      <PrescriptionValue label="Sets" value={exercise.sets} />
                      <PrescriptionValue label="Hold" value={exercise.holdDuration} />
                      <PrescriptionValue label="Rest" value={exercise.restDuration} />
                      <PrescriptionValue label="Frequency" value={exercise.frequency} />
                    </dl>
                    {Boolean(exercise.safetyInstructions) && <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">{text(exercise.safetyInstructions)}</div>}
                  </div>
                </div>
              </article>;
            })}
          </div>

          <div className="mt-5 flex flex-col gap-3 border-t border-neutral-200 pt-5 sm:flex-row sm:items-center sm:justify-between print:hidden">
            <p className="text-xs leading-5 text-neutral-500">Complete exercises only as prescribed. Stop and contact your clinician if you develop concerning symptoms.</p>
            <button type="button" onClick={() => navigate(`/patient/programme/day/${currentDay}?enrollment=${enrollment?.id || ''}`)} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white"><CalendarDays className="h-4 w-4" />Open daily tracking</button>
          </div>
        </div>
      </section>
    </div>
  );
}

function PrescriptionValue({ label, value }: { label: string; value: unknown }) { return <div><dt className="text-xs text-neutral-400">{label}</dt><dd className="mt-0.5 font-bold text-neutral-900">{text(value, '—')}</dd></div>; }
function text(value: unknown, fallback = '') { return value === undefined || value === null || value === '' ? fallback : String(value); }
function ageFromDate(value?: string) { if (!value) return undefined; const birth = new Date(value); if (Number.isNaN(birth.getTime())) return undefined; const today = new Date(); let age = today.getFullYear() - birth.getFullYear(); const beforeBirthday = today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate()); if (beforeBirthday) age -= 1; return age > 0 ? age : undefined; }
function dateText(value?: string) { if (!value) return '—'; const date = new Date(value); if (Number.isNaN(date.getTime())) return '—'; return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
function extractYoutubeId(url: string) { const match = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/); return match?.[1] || ''; }
function requestError(error: unknown) { const source = error && typeof error === 'object' ? error as { response?: { data?: { message?: string } }; message?: string } : {}; return source.response?.data?.message || source.message || 'Your active rehabilitation prescription is unavailable.'; }
