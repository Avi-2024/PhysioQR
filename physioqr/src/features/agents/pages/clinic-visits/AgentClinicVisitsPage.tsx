import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, CheckCircle2, FileText, MapPin, Plus, Search, Stethoscope } from 'lucide-react';
import apiClient from '@/lib/api-client';
import ErrorState from '@/components/feedback/ErrorState';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';

type ApiRecord = Record<string, unknown>;

const OUTCOMES = [
  ['doctor_registered', 'Doctor registered'],
  ['interested', 'Interested'],
  ['follow_up_required', 'Follow-up required'],
  ['not_interested', 'Not interested'],
  ['call_later', 'Call later'],
  ['clinic_closed', 'Clinic closed'],
  ['incorrect_location', 'Incorrect location'],
];
const INTEREST = [
  ['very_interested', 'Very interested'],
  ['interested', 'Interested'],
  ['neutral', 'Neutral'],
  ['not_interested', 'Not interested'],
];

export default function AgentClinicVisitsPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [outcome, setOutcome] = useState('all');

  const visitsQuery = useQuery({
    queryKey: ['agent-visits'],
    queryFn: async () => (await apiClient.get('/agents/me/visits', { params: { limit: 100, sortBy: 'visitDate', sortOrder: 'desc' } })).data,
  });
  const doctorsQuery = useQuery({
    queryKey: ['agent-doctors'],
    queryFn: async () => (await apiClient.get('/agents/me/doctors')).data,
  });

  const visits = useMemo(() => extractItems(visitsQuery.data), [visitsQuery.data]);
  const doctors = useMemo(() => extractItems(doctorsQuery.data), [doctorsQuery.data]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return visits.filter((visit) => {
      const doctor = asRecord(visit.doctor);
      const values = [doctor.fullName, visit.doctorName, visit.clinicName, visit.clinicLocation, visit.discussionDetails].map((value) => text(value).toLowerCase());
      return (!q || values.some((value) => value.includes(q))) && (outcome === 'all' || visit.outcome === outcome);
    });
  }, [outcome, search, visits]);

  const createMutation = useMutation({
    mutationFn: async (payload: ApiRecord) => (await apiClient.post('/agents/me/visits', payload)).data,
    onSuccess: async () => {
      setOpen(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['agent-visits'] }),
        queryClient.invalidateQueries({ queryKey: ['agent-follow-ups'] }),
        queryClient.invalidateQueries({ queryKey: ['agent-dashboard'] }),
      ]);
    },
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-600">Field activity</p>
          <h1 className="mt-1 text-2xl font-bold text-neutral-900 sm:text-3xl">Clinic Visits</h1>
          <p className="mt-1 max-w-3xl text-sm text-neutral-500">Capture every doctor meeting, clinic discussion, interest level, outcome and next follow-up.</p>
        </div>
        <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700">
          <Plus className="h-4 w-4" /> Add Visit
        </button>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Total visits" value={visits.length} icon={MapPin} />
        <Metric label="Doctor registered" value={visits.filter((visit) => visit.outcome === 'doctor_registered').length} icon={Stethoscope} />
        <Metric label="Follow-up required" value={visits.filter((visit) => visit.followUpStatus === 'scheduled').length} icon={CalendarClock} />
        <Metric label="Completed follow-ups" value={visits.filter((visit) => visit.followUpStatus === 'completed').length} icon={CheckCircle2} />
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="grid gap-3 border-b border-neutral-200 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_auto]">
          <label className="relative block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search doctor, clinic, location or discussion" className="w-full rounded-lg border border-neutral-300 py-2.5 pl-9 pr-3 text-sm" />
          </label>
          <div className="flex flex-wrap gap-2">
            {['all', 'doctor_registered', 'interested', 'follow_up_required', 'not_interested'].map((item) => (
              <button key={item} type="button" onClick={() => setOutcome(item)} className={cn('rounded-full px-3 py-2 text-xs font-semibold', outcome === item ? 'bg-primary-600 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200')}>
                {item === 'all' ? 'All' : labelize(item)}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 sm:p-5">
          {visitsQuery.isError && <ErrorState title="Clinic visits could not load" message="Check your connection and try again." onRetry={() => visitsQuery.refetch()} />}
          {visitsQuery.isLoading && <Skeleton className="h-64 w-full" />}
          {!visitsQuery.isLoading && !visitsQuery.isError && filtered.length === 0 && (
            <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center">
              <MapPin className="mx-auto h-8 w-8 text-neutral-400" />
              <p className="mt-3 text-sm font-semibold text-neutral-800">No clinic visits found</p>
              <p className="mt-1 text-xs text-neutral-500">Record a visit after meeting a doctor or clinic.</p>
            </div>
          )}
          {!visitsQuery.isLoading && filtered.length > 0 && <div className="space-y-3">{filtered.map((visit) => <VisitCard key={text(visit._id || visit.id)} visit={visit} />)}</div>}
        </div>
      </section>

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Record clinic visit" size="xl">
        <VisitForm doctors={doctors} saving={createMutation.isPending} error={createMutation.error} onSubmit={(payload) => createMutation.mutate(payload)} />
      </Modal>
    </div>
  );
}

function VisitCard({ visit }: { visit: ApiRecord }) {
  const doctor = asRecord(visit.doctor);
  return (
    <article className="rounded-xl border border-neutral-200 p-4 transition-colors hover:border-primary-200">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-neutral-900">{text(doctor.fullName || visit.doctorName, 'Unlinked doctor')}</p>
            <Pill value={text(visit.outcome, 'not_recorded')} />
          </div>
          <p className="mt-1 text-sm text-neutral-600">{text(visit.clinicName || doctor.clinicName, 'Clinic not specified')}</p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500">
            <span>{dateText(visit.visitDate)}{text(visit.visitTime) ? ` • ${text(visit.visitTime)}` : ''}</span>
            {text(visit.clinicLocation) && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{text(visit.clinicLocation)}</span>}
            {text(visit.doctorInterestLevel) && <span>Interest: {labelize(visit.doctorInterestLevel)}</span>}
          </div>
        </div>
        <Pill value={text(visit.followUpStatus, 'not_required')} muted />
      </div>
      {text(visit.discussionDetails) && <p className="mt-3 rounded-lg bg-neutral-50 p-3 text-sm text-neutral-700">{text(visit.discussionDetails)}</p>}
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {text(visit.followUpDate) && <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 text-xs text-amber-800"><strong>Follow-up:</strong> {dateText(visit.followUpDate)}{text(visit.followUpNotes) ? ` — ${text(visit.followUpNotes)}` : ''}</div>}
        {text(visit.nextAction) && <div className="rounded-lg border border-neutral-200 p-3 text-xs text-neutral-700"><strong>Next action:</strong> {text(visit.nextAction)}</div>}
      </div>
      {(Array.isArray(visit.documentsCollected) && visit.documentsCollected.length > 0) && <div className="mt-3 flex items-center gap-2 text-xs text-neutral-500"><FileText className="h-4 w-4" />Documents: {(visit.documentsCollected as unknown[]).map((item) => text(item)).join(', ')}</div>}
    </article>
  );
}

function VisitForm({ doctors, saving, error, onSubmit }: { doctors: ApiRecord[]; saving: boolean; error: unknown; onSubmit: (payload: ApiRecord) => void }) {
  const [doctorId, setDoctorId] = useState('');
  const [outcome, setOutcome] = useState('interested');
  const [followUpDate, setFollowUpDate] = useState('');

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const documents = text(form.get('documentsCollected')).split(',').map((item) => item.trim()).filter(Boolean);
    onSubmit({
      doctor: doctorId || undefined,
      doctorName: form.get('doctorName') || undefined,
      clinicName: form.get('clinicName'),
      visitDate: form.get('visitDate'),
      visitTime: form.get('visitTime') || undefined,
      clinicLocation: form.get('clinicLocation') || undefined,
      discussionDetails: form.get('discussionDetails') || undefined,
      doctorInterestLevel: form.get('doctorInterestLevel') || undefined,
      documentsCollected: documents,
      followUpDate: followUpDate || undefined,
      followUpNotes: form.get('followUpNotes') || undefined,
      nextAction: form.get('nextAction') || undefined,
      outcome,
      photo: form.get('photo') || undefined,
      attachment: form.get('attachment') || undefined,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="rounded-lg border border-primary-100 bg-primary-50/50 p-4 text-sm text-primary-900">
        Capture the visit first. If a follow-up date is set, the system automatically creates a scheduled follow-up in your Follow-ups workspace.
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Linked doctor"><select value={doctorId} onChange={(event) => setDoctorId(event.target.value)} className={inputClass}><option value="">Unlinked / new doctor</option>{doctors.map((doctor) => <option key={text(doctor._id || doctor.id)} value={text(doctor._id || doctor.id)}>{text(doctor.fullName)} — {text(doctor.clinicName, 'No clinic')}</option>)}</select></Field>
        <Field label="Doctor name"><input name="doctorName" className={inputClass} placeholder="Required for unlinked visits" /></Field>
        <Field label="Clinic name"><input name="clinicName" required className={inputClass} /></Field>
        <Field label="Clinic location"><input name="clinicLocation" className={inputClass} /></Field>
        <Field label="Visit date"><input name="visitDate" type="date" required className={inputClass} /></Field>
        <Field label="Visit time"><input name="visitTime" type="time" className={inputClass} /></Field>
        <Field label="Visit outcome"><select value={outcome} onChange={(event) => setOutcome(event.target.value)} className={inputClass}>{OUTCOMES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
        <Field label="Doctor interest"><select name="doctorInterestLevel" className={inputClass}><option value="">Not captured</option>{INTEREST.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
        <Field label="Follow-up date"><input type="date" value={followUpDate} onChange={(event) => setFollowUpDate(event.target.value)} className={inputClass} /></Field>
        <Field label="Next action"><input name="nextAction" className={inputClass} placeholder="Call, collect documents, revisit..." /></Field>
        <Field label="Documents collected"><input name="documentsCollected" className={inputClass} placeholder="Medical registration, ID proof (comma separated)" /></Field>
        <Field label="Photo URL"><input name="photo" className={inputClass} placeholder="Optional uploaded photo URL" /></Field>
        <Field label="Attachment URL"><input name="attachment" className={inputClass} placeholder="Optional uploaded document URL" /></Field>
        <Field label="Discussion details" wide><textarea name="discussionDetails" className={`${inputClass} min-h-24`} /></Field>
        <Field label="Follow-up notes" wide><textarea name="followUpNotes" className={`${inputClass} min-h-20`} /></Field>
      </div>
      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{errorMessage(error)}</div>}
      <div className="flex justify-end border-t border-neutral-100 pt-4"><button type="submit" disabled={saving} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60">{saving ? 'Saving...' : 'Save visit'}</button></div>
    </form>
  );
}

function Metric({ label, value, icon: Icon }: { label: string; value: number; icon: React.ElementType }) { return <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"><span className="inline-flex rounded-lg bg-primary-50 p-2 text-primary-700"><Icon className="h-5 w-5" /></span><p className="mt-3 text-2xl font-bold text-neutral-900">{value}</p><p className="text-sm text-neutral-500">{label}</p></div>; }
function Field({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) { return <label className={wide ? 'block sm:col-span-2' : 'block'}><span className="text-sm font-semibold text-neutral-700">{label}</span><div className="mt-2">{children}</div></label>; }
function Pill({ value, muted }: { value: string; muted?: boolean }) { const positive = ['doctor_registered', 'completed'].includes(value); const warning = ['interested', 'follow_up_required', 'scheduled', 'call_later'].includes(value); return <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize', muted ? 'bg-neutral-100 text-neutral-600' : positive ? 'bg-emerald-50 text-emerald-700' : warning ? 'bg-amber-50 text-amber-700' : 'bg-neutral-100 text-neutral-600')}>{labelize(value)}</span>; }
const inputClass = 'w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100';
function extractItems(payload: unknown): ApiRecord[] { if (Array.isArray(payload)) return payload as ApiRecord[]; const record = asRecord(payload); if (Array.isArray(record.items)) return record.items as ApiRecord[]; if (Array.isArray(record.data)) return record.data as ApiRecord[]; return []; }
function asRecord(value: unknown): ApiRecord { return value && typeof value === 'object' ? value as ApiRecord : {}; }
function text(value: unknown, fallback = '') { return value === undefined || value === null || value === '' ? fallback : String(value); }
function labelize(value: unknown) { return text(value, '-').replace(/_/g, ' '); }
function dateText(value: unknown) { if (!value) return '-'; const date = new Date(String(value)); return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
function errorMessage(error: unknown) { const response = asRecord(asRecord(error).response); const data = asRecord(response.data); return text(data.message || asRecord(error).message, 'Request failed. Please try again.'); }
