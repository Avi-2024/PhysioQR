import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarClock, ExternalLink, MapPin, RefreshCw, Stethoscope, UserRound } from 'lucide-react';
import apiClient from '@/lib/api-client';
import ErrorState from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';

type VisitDetail = {
  _id: string;
  id: string;
  visitDate: string;
  visitTime?: string;
  doctorName?: string;
  clinicName?: string;
  clinicLocation?: string;
  discussionDetails?: string;
  doctorInterestLevel?: string;
  documentsCollected?: string[];
  followUpDate?: string;
  followUpNotes?: string;
  followUpStatus: string;
  followUpCompletedAt?: string;
  followUpCompletedNote?: string;
  nextAction?: string;
  outcome: string;
  photo?: string;
  attachment?: string;
  followUpDue: boolean;
  canAdminEdit: false;
  ownership: { role: 'agent'; message: string };
  createdAt?: string;
  updatedAt?: string;
  agent?: { _id?: string; agentId?: string; fullName?: string; assignedRegion?: string; mobile?: string; email?: string; status?: string };
  doctor?: { _id?: string; doctorId?: string; fullName?: string; clinicName?: string; city?: string; state?: string; mobile?: string; email?: string; status?: string; specialization?: string };
};

const humanize = (value?: string) => value ? value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()) : '—';
const text = (value?: string | null) => value?.trim() || '—';
const dateTime = (value?: string) => value ? new Date(value).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white"><div className="border-b border-neutral-100 bg-neutral-50/60 px-5 py-4"><h2 className="text-sm font-bold text-neutral-950">{title}</h2></div><div className="grid gap-4 p-5 sm:grid-cols-2">{children}</div></section>;
}

function Item({ label, value }: { label: string; value: React.ReactNode }) {
  return <div><div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">{label}</div><div className="mt-1 break-words text-sm font-semibold text-neutral-900">{value}</div></div>;
}

export default function AdminClinicVisitDetailPage() {
  const { visitId = '' } = useParams();
  const navigate = useNavigate();
  const query = useQuery<VisitDetail>({ queryKey: ['admin-clinic-visit-detail', visitId], queryFn: () => apiClient.get(`/admin/clinic-visits/${visitId}`).then((response) => response.data), enabled: Boolean(visitId) });

  if (query.isLoading) return <div className="space-y-5"><Skeleton className="h-32 w-full" /><Skeleton className="h-24 w-full" /><Skeleton className="h-[420px] w-full" /></div>;
  if (query.isError || !query.data) return <ErrorState title="Clinic visit detail could not load" message="Check the visit record and admin API connection, then retry." onRetry={() => query.refetch()} />;

  const visit = query.data;
  return <div className="mx-auto w-full max-w-[1500px] space-y-5">
    <header className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6"><div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between"><div className="flex min-w-0 items-start gap-4"><button type="button" onClick={() => navigate('/admin/clinic-visits')} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-neutral-200 text-neutral-600 hover:bg-neutral-50"><ArrowLeft className="h-5 w-5" /></button><div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-700"><Stethoscope className="h-7 w-7" /></div><div><h1 className="text-2xl font-bold tracking-tight text-neutral-950 sm:text-3xl">{visit.doctor?.fullName || visit.doctorName || visit.clinicName || 'Clinic Visit'}</h1><p className="mt-1 text-sm text-neutral-600">{visit.doctor?.clinicName || visit.clinicName || 'Clinic not provided'} · {humanize(visit.outcome)}</p><p className="mt-2 text-xs text-neutral-500">Visited {dateTime(visit.visitDate)}{visit.visitTime ? ` · ${visit.visitTime}` : ''}</p></div></div><button type="button" onClick={() => query.refetch()} disabled={query.isFetching} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"><RefreshCw className={cn('h-4 w-4', query.isFetching && 'animate-spin')} /> Refresh</button></div></header>

    <section className="rounded-xl border border-sky-200 bg-sky-50 p-4"><div className="flex items-start gap-3"><UserRound className="mt-0.5 h-5 w-5 shrink-0 text-sky-700" /><div><div className="text-sm font-bold text-neutral-950">Admin monitoring is read-only</div><p className="mt-1 text-sm leading-6 text-neutral-600">{visit.ownership.message}</p></div></div></section>

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><div className="rounded-xl border border-neutral-200 bg-white p-4"><div className="text-xs text-neutral-500">Outcome</div><div className="mt-2 text-xl font-bold text-neutral-950">{humanize(visit.outcome)}</div></div><div className="rounded-xl border border-neutral-200 bg-white p-4"><div className="text-xs text-neutral-500">Interest level</div><div className="mt-2 text-xl font-bold text-neutral-950">{humanize(visit.doctorInterestLevel)}</div></div><div className="rounded-xl border border-neutral-200 bg-white p-4"><div className="text-xs text-neutral-500">Follow-up</div><div className="mt-2 text-xl font-bold text-neutral-950">{humanize(visit.followUpStatus)}</div></div><div className={cn('rounded-xl border p-4', visit.followUpDue ? 'border-rose-200 bg-rose-50' : 'border-neutral-200 bg-white')}><div className="text-xs text-neutral-500">Follow-up due</div><div className="mt-2 text-xl font-bold text-neutral-950">{visit.followUpDue ? 'Overdue' : dateTime(visit.followUpDate)}</div></div></section>

    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]"><main className="space-y-5"><InfoCard title="Visit record"><Item label="Visit date" value={dateTime(visit.visitDate)} /><Item label="Visit time" value={text(visit.visitTime)} /><Item label="Clinic location" value={text(visit.clinicLocation)} /><Item label="Outcome" value={humanize(visit.outcome)} /><Item label="Interest level" value={humanize(visit.doctorInterestLevel)} /><Item label="Documents collected" value={visit.documentsCollected?.length ? visit.documentsCollected.join(', ') : '—'} /></InfoCard><InfoCard title="Discussion & next action"><Item label="Discussion details" value={text(visit.discussionDetails)} /><Item label="Next action" value={text(visit.nextAction)} /></InfoCard><InfoCard title="Follow-up"><Item label="Status" value={humanize(visit.followUpStatus)} /><Item label="Follow-up date" value={dateTime(visit.followUpDate)} /><Item label="Notes" value={text(visit.followUpNotes)} /><Item label="Completed at" value={dateTime(visit.followUpCompletedAt)} /><Item label="Completion note" value={text(visit.followUpCompletedNote)} /><Item label="Overdue" value={visit.followUpDue ? 'Yes' : 'No'} /></InfoCard><InfoCard title="Record timeline"><Item label="Created" value={dateTime(visit.createdAt)} /><Item label="Last updated" value={dateTime(visit.updatedAt)} /></InfoCard></main>

      <aside className="space-y-4 xl:sticky xl:top-5"><section className="overflow-hidden rounded-xl border border-neutral-200 bg-white"><div className="border-b border-neutral-100 bg-neutral-50/60 px-4 py-4"><h2 className="text-sm font-bold text-neutral-950">Related workspaces</h2><p className="mt-1 text-xs text-neutral-500">Operational changes stay with the owning Agent or Doctor module.</p></div><div className="space-y-2 p-4">{visit.agent?._id && <button type="button" onClick={() => navigate(`/admin/agents/${visit.agent?._id}`)} className="flex w-full items-center gap-3 rounded-xl border border-neutral-200 px-4 py-3 text-left text-sm font-semibold text-neutral-700 hover:bg-neutral-50"><UserRound className="h-4 w-4" />Open agent <ExternalLink className="ml-auto h-3.5 w-3.5" /></button>}{visit.doctor?._id && <button type="button" onClick={() => navigate(`/admin/doctors/${visit.doctor?._id}`)} className="flex w-full items-center gap-3 rounded-xl border border-neutral-200 px-4 py-3 text-left text-sm font-semibold text-neutral-700 hover:bg-neutral-50"><Stethoscope className="h-4 w-4" />Open doctor <ExternalLink className="ml-auto h-3.5 w-3.5" /></button>}</div></section><section className="rounded-xl border border-neutral-200 bg-white p-4"><div className="flex items-center gap-2 text-sm font-bold text-neutral-950"><CalendarClock className="h-4 w-4 text-primary-700" />Field context</div><div className="mt-4 space-y-3 text-sm"><div className="flex justify-between gap-3"><span className="text-neutral-500">Agent</span><span className="text-right font-semibold text-neutral-900">{visit.agent?.fullName || '—'}</span></div><div className="flex justify-between gap-3"><span className="text-neutral-500">Region</span><span className="text-right font-semibold text-neutral-900">{visit.agent?.assignedRegion || '—'}</span></div><div className="flex justify-between gap-3"><span className="text-neutral-500">Doctor</span><span className="text-right font-semibold text-neutral-900">{visit.doctor?.fullName || visit.doctorName || 'Unregistered'}</span></div><div className="flex justify-between gap-3"><span className="text-neutral-500">Clinic</span><span className="text-right font-semibold text-neutral-900">{visit.doctor?.clinicName || visit.clinicName || '—'}</span></div>{visit.clinicLocation && <div className="flex items-start gap-2 rounded-lg bg-neutral-50 p-3 text-xs text-neutral-600"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />{visit.clinicLocation}</div>}</div></section></aside>
    </div>
  </div>;
}
