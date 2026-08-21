import { useDeferredValue, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { CalendarClock, CheckCircle2, ChevronLeft, ChevronRight, ExternalLink, RefreshCw, Stethoscope, TriangleAlert } from 'lucide-react';
import apiClient from '@/lib/api-client';
import ErrorState from '@/components/feedback/ErrorState';
import { SearchInput } from '@/components/ui/SearchInput';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';

type Visit = {
  _id: string;
  visitDate: string;
  visitTime?: string;
  doctorName?: string;
  clinicName?: string;
  clinicLocation?: string;
  doctorInterestLevel?: 'very_interested' | 'interested' | 'neutral' | 'not_interested';
  outcome: 'doctor_registered' | 'interested' | 'follow_up_required' | 'not_interested' | 'call_later' | 'clinic_closed' | 'incorrect_location';
  followUpDate?: string;
  followUpStatus: 'not_required' | 'scheduled' | 'completed' | 'missed' | 'cancelled';
  nextAction?: string;
  agent?: { _id?: string; agentId?: string; fullName?: string; assignedRegion?: string };
  doctor?: { _id?: string; doctorId?: string; fullName?: string; clinicName?: string };
};

type Response = {
  items: Visit[];
  meta: { page: number; limit: number; total: number; totalPages: number };
  summary: { total: number; scheduled: number; overdue: number; completed: number; doctorRegistered: number };
};

const PAGE_SIZE = 20;
const emptyData: Response = { items: [], meta: { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 }, summary: { total: 0, scheduled: 0, overdue: 0, completed: 0, doctorRegistered: 0 } };

const humanize = (value?: string) => value ? value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()) : '—';
const dateText = (value?: string) => value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

function TonePill({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'green' | 'amber' | 'rose' | 'blue' }) {
  const styles = { neutral: 'bg-neutral-100 text-neutral-700', green: 'bg-emerald-50 text-emerald-700', amber: 'bg-amber-50 text-amber-700', rose: 'bg-rose-50 text-rose-700', blue: 'bg-sky-50 text-sky-700' };
  return <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold', styles[tone])}>{label}</span>;
}

function followUpTone(status: Visit['followUpStatus']): 'neutral' | 'green' | 'amber' | 'rose' | 'blue' {
  if (status === 'completed') return 'green';
  if (status === 'scheduled') return 'blue';
  if (status === 'missed') return 'rose';
  if (status === 'cancelled') return 'amber';
  return 'neutral';
}

export default function AdminClinicVisitsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search.trim());
  const [outcome, setOutcome] = useState('');
  const [followUpStatus, setFollowUpStatus] = useState('');
  const [page, setPage] = useState(1);

  const query = useQuery<Response>({
    queryKey: ['admin-clinic-visits', page, deferredSearch, outcome, followUpStatus],
    queryFn: () => apiClient.get('/admin/clinic-visits', {
      params: { page, limit: PAGE_SIZE, ...(deferredSearch ? { search: deferredSearch } : {}), ...(outcome ? { outcome } : {}), ...(followUpStatus ? { followUpStatus } : {}) },
    }).then((response) => response.data),
  });

  const data = query.data ?? emptyData;
  const cards = useMemo(() => [
    { label: 'Total visits', value: data.summary.total, icon: CalendarClock },
    { label: 'Follow-ups scheduled', value: data.summary.scheduled, icon: CalendarClock },
    { label: 'Overdue follow-ups', value: data.summary.overdue, icon: TriangleAlert },
    { label: 'Doctors registered', value: data.summary.doctorRegistered, icon: CheckCircle2 },
  ], [data.summary]);

  return <div className="min-w-0 space-y-6">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-700">Field visit tracking</p><h1 className="mt-2 text-2xl font-bold tracking-tight text-neutral-950 sm:text-3xl">Clinic Visits</h1><p className="mt-1 max-w-3xl text-sm leading-6 text-neutral-500">Monitor field-agent visits, doctor interest, outcomes, follow-ups, and next actions from actual visit records.</p></div>
      <button type="button" onClick={() => query.refetch()} disabled={query.isFetching} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"><RefreshCw className={cn('h-4 w-4', query.isFetching && 'animate-spin')} /> Refresh</button>
    </header>

    {!query.isError && <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map((card) => <div key={card.label} className="rounded-xl border border-neutral-200 bg-white p-4"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{card.label}</p><p className="mt-2 text-2xl font-bold text-neutral-950">{query.isLoading ? '—' : card.value}</p></div><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-50 text-neutral-600"><card.icon className="h-5 w-5" /></div></div></div>)}</section>}

    <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <div className="border-b border-neutral-200 px-4 py-4 sm:px-5"><div className="flex flex-col gap-3 xl:flex-row xl:items-center"><div className="min-w-0 flex-1"><SearchInput value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Search doctor, clinic, location, discussion, or next action" /></div><select value={outcome} onChange={(event) => { setOutcome(event.target.value); setPage(1); }} className="min-h-11 rounded-lg border border-neutral-300 bg-white px-3 text-sm font-medium text-neutral-700"><option value="">All outcomes</option><option value="doctor_registered">Doctor registered</option><option value="interested">Interested</option><option value="follow_up_required">Follow-up required</option><option value="not_interested">Not interested</option><option value="call_later">Call later</option><option value="clinic_closed">Clinic closed</option><option value="incorrect_location">Incorrect location</option></select><select value={followUpStatus} onChange={(event) => { setFollowUpStatus(event.target.value); setPage(1); }} className="min-h-11 rounded-lg border border-neutral-300 bg-white px-3 text-sm font-medium text-neutral-700"><option value="">All follow-ups</option><option value="scheduled">Scheduled</option><option value="completed">Completed</option><option value="missed">Missed</option><option value="cancelled">Cancelled</option><option value="not_required">Not required</option></select></div>{!query.isLoading && !query.isError && <p className="mt-3 text-xs text-neutral-500">{data.meta.total} visit record{data.meta.total === 1 ? '' : 's'} found.</p>}</div>

      {query.isError ? <div className="p-5"><ErrorState title="Clinic visits could not load" message="Check the admin API connection and session, then retry." onRetry={() => query.refetch()} /></div> : query.isLoading ? <div className="space-y-3 p-5">{Array.from({ length: 7 }).map((_, index) => <Skeleton key={index} className="h-14 w-full" />)}</div> : data.items.length === 0 ? <div className="px-5 py-14 text-center"><Stethoscope className="mx-auto h-9 w-9 text-neutral-300" /><h2 className="mt-3 text-sm font-semibold text-neutral-900">No clinic visits found</h2><p className="mt-1 text-sm text-neutral-500">Visits recorded by field agents will appear here with outcomes and follow-up status.</p></div> : <>
        <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[1220px] text-left text-sm"><thead className="border-b border-neutral-200 bg-neutral-50/80"><tr className="text-xs font-semibold uppercase tracking-wide text-neutral-500"><th className="px-5 py-3">Agent</th><th className="px-4 py-3">Doctor / Clinic</th><th className="px-4 py-3">Visit</th><th className="px-4 py-3">Interest</th><th className="px-4 py-3">Outcome</th><th className="px-4 py-3">Follow-up</th><th className="px-4 py-3">Next action</th><th className="px-5 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-neutral-100">{data.items.map((visit) => <tr key={visit._id} onClick={() => navigate(`/admin/clinic-visits/${visit._id}`)} className="cursor-pointer hover:bg-neutral-50"><td className="px-5 py-4"><div className="font-semibold text-neutral-950">{visit.agent?.fullName || '—'}</div><div className="mt-0.5 text-xs text-neutral-500">{visit.agent?.agentId || 'No agent ID'} · {visit.agent?.assignedRegion || 'Region not set'}</div></td><td className="px-4 py-4"><div className="font-medium text-neutral-800">{visit.doctor?.fullName || visit.doctorName || 'Unregistered doctor'}</div><div className="mt-0.5 text-xs text-neutral-500">{visit.doctor?.clinicName || visit.clinicName || 'Clinic not provided'}</div></td><td className="px-4 py-4"><div className="text-neutral-700">{dateText(visit.visitDate)}</div><div className="mt-0.5 text-xs text-neutral-500">{visit.visitTime || visit.clinicLocation || '—'}</div></td><td className="px-4 py-4 text-neutral-700">{humanize(visit.doctorInterestLevel)}</td><td className="px-4 py-4"><TonePill label={humanize(visit.outcome)} tone={visit.outcome === 'doctor_registered' ? 'green' : visit.outcome === 'not_interested' ? 'rose' : visit.outcome === 'follow_up_required' ? 'amber' : 'neutral'} /></td><td className="px-4 py-4"><TonePill label={humanize(visit.followUpStatus)} tone={followUpTone(visit.followUpStatus)} /><div className="mt-1 text-xs text-neutral-500">{visit.followUpDate ? dateText(visit.followUpDate) : ''}</div></td><td className="max-w-[220px] px-4 py-4 text-neutral-600"><span className="line-clamp-2">{visit.nextAction || '—'}</span></td><td className="px-5 py-4 text-right"><button type="button" onClick={(event) => { event.stopPropagation(); navigate(`/admin/clinic-visits/${visit._id}`); }} className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-primary-50 hover:text-primary-700">View <ExternalLink className="h-3.5 w-3.5" /></button></td></tr>)}</tbody></table></div>
        <div className="divide-y divide-neutral-100 md:hidden">{data.items.map((visit) => <button key={visit._id} type="button" onClick={() => navigate(`/admin/clinic-visits/${visit._id}`)} className="block w-full px-4 py-4 text-left"><div className="flex items-start justify-between gap-3"><div><div className="font-semibold text-neutral-950">{visit.doctor?.fullName || visit.doctorName || 'Clinic visit'}</div><div className="mt-1 text-xs text-neutral-500">{visit.agent?.fullName || 'Agent unavailable'} · {dateText(visit.visitDate)}</div></div><TonePill label={humanize(visit.followUpStatus)} tone={followUpTone(visit.followUpStatus)} /></div></button>)}</div>
        <div className="flex items-center justify-between border-t border-neutral-200 px-4 py-3 sm:px-5"><p className="text-xs text-neutral-500">Page {data.meta.page} of {Math.max(data.meta.totalPages, 1)}</p><div className="flex gap-2"><button type="button" disabled={data.meta.page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button><button type="button" disabled={data.meta.page >= data.meta.totalPages} onClick={() => setPage((value) => value + 1)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button></div></div>
      </>}
    </section>
  </div>;
}
