import { useDeferredValue, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ExternalLink, LockKeyhole, RefreshCw, ShieldCheck, UserCheck, Users } from 'lucide-react';
import apiClient from '@/lib/api-client';
import ErrorState from '@/components/feedback/ErrorState';
import { SearchInput } from '@/components/ui/SearchInput';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';

type PatientStatus = 'active' | 'inactive' | 'blocked';
type Patient = {
  _id: string;
  id: string;
  patientId?: string;
  fullName: string;
  mobile: string;
  email?: string;
  city?: string;
  state?: string;
  status: PatientStatus;
  mobileVerified?: boolean;
  referralLocked?: boolean;
  referralSource?: string;
  referringDoctor?: { _id?: string; doctorId?: string; fullName?: string; clinicName?: string; city?: string };
  createdAt?: string;
};

type Response = {
  items: Patient[];
  meta: { page: number; limit: number; total: number; totalPages: number };
  summary: { total: number; active: number; blocked: number; mobileVerified: number; referralLocked: number; paidPatients: number };
};

const PAGE_SIZE = 20;
const emptyData: Response = { items: [], meta: { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 }, summary: { total: 0, active: 0, blocked: 0, mobileVerified: 0, referralLocked: 0, paidPatients: 0 } };

function StatusPill({ status }: { status: PatientStatus }) {
  return <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize', status === 'active' ? 'bg-emerald-50 text-emerald-700' : status === 'blocked' ? 'bg-rose-50 text-rose-700' : 'bg-neutral-100 text-neutral-700')}>{status}</span>;
}

const dateText = (value?: string) => value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function AdminPatientsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search.trim());
  const [status, setStatus] = useState('');
  const [verified, setVerified] = useState('');
  const [page, setPage] = useState(1);

  const query = useQuery<Response>({
    queryKey: ['admin-patients', page, deferredSearch, status, verified],
    queryFn: () => apiClient.get('/admin/patients', { params: { page, limit: PAGE_SIZE, ...(deferredSearch ? { search: deferredSearch } : {}), ...(status ? { status } : {}), ...(verified ? { mobileVerified: verified } : {}) } }).then((response) => response.data),
  });

  const data = query.data ?? emptyData;
  const cards = useMemo(() => [
    { label: 'Total patients', value: data.summary.total, icon: Users },
    { label: 'Active', value: data.summary.active, icon: UserCheck },
    { label: 'Mobile verified', value: data.summary.mobileVerified, icon: ShieldCheck },
    { label: 'Referral locked', value: data.summary.referralLocked, icon: LockKeyhole },
  ], [data.summary]);

  return <div className="min-w-0 space-y-6">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-700">Patient operations</p><h1 className="mt-2 text-2xl font-bold tracking-tight text-neutral-950 sm:text-3xl">Patients</h1><p className="mt-1 max-w-3xl text-sm leading-6 text-neutral-500">Monitor patient identity, referral ownership, account state, and doctor attribution from the live backend.</p></div>
      <button type="button" onClick={() => query.refetch()} disabled={query.isFetching} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"><RefreshCw className={cn('h-4 w-4', query.isFetching && 'animate-spin')} /> Refresh</button>
    </header>

    {!query.isError && <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map((card) => <div key={card.label} className="rounded-xl border border-neutral-200 bg-white p-4"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{card.label}</p><p className="mt-2 text-2xl font-bold text-neutral-950">{query.isLoading ? '—' : card.value}</p></div><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-50 text-neutral-600"><card.icon className="h-5 w-5" /></div></div></div>)}</section>}

    <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <div className="border-b border-neutral-200 px-4 py-4 sm:px-5"><div className="flex flex-col gap-3 xl:flex-row xl:items-center"><div className="min-w-0 flex-1"><SearchInput value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Search patient ID, name, mobile, email, city, or state" /></div><select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="min-h-11 rounded-lg border border-neutral-300 bg-white px-3 text-sm font-medium text-neutral-700"><option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="blocked">Blocked</option></select><select value={verified} onChange={(e) => { setVerified(e.target.value); setPage(1); }} className="min-h-11 rounded-lg border border-neutral-300 bg-white px-3 text-sm font-medium text-neutral-700"><option value="">All verification</option><option value="true">Mobile verified</option><option value="false">Not verified</option></select></div>{!query.isLoading && !query.isError && <p className="mt-3 text-xs text-neutral-500">{data.meta.total} patient{data.meta.total === 1 ? '' : 's'} found.</p>}</div>

      {query.isError ? <div className="p-5"><ErrorState title="Patients could not load" message="Check the admin API connection and session, then retry." onRetry={() => query.refetch()} /></div> : query.isLoading ? <div className="space-y-3 p-5">{Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div> : data.items.length === 0 ? <div className="px-5 py-14 text-center"><Users className="mx-auto h-9 w-9 text-neutral-300" /><h2 className="mt-3 text-sm font-semibold text-neutral-900">No patients found</h2><p className="mt-1 text-sm text-neutral-500">Patient records will appear here after registration.</p></div> : <>
        <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[1100px] text-left text-sm"><thead className="border-b border-neutral-200 bg-neutral-50/80"><tr className="text-xs font-semibold uppercase tracking-wide text-neutral-500"><th className="px-5 py-3">Patient</th><th className="px-4 py-3">Contact</th><th className="px-4 py-3">Location</th><th className="px-4 py-3">Referring doctor</th><th className="px-4 py-3">Referral</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Joined</th><th className="px-5 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-neutral-100">{data.items.map((patient) => <tr key={patient._id} onClick={() => navigate(`/admin/patients/${patient.patientId || patient._id}`)} className="cursor-pointer hover:bg-neutral-50"><td className="px-5 py-4"><div className="font-semibold text-neutral-950">{patient.fullName}</div><div className="mt-0.5 text-xs text-neutral-500">{patient.patientId || '—'}</div></td><td className="px-4 py-4"><div className="font-medium text-neutral-800">{patient.mobile}</div><div className="mt-0.5 text-xs text-neutral-500">{patient.email || (patient.mobileVerified ? 'Mobile verified' : 'Mobile not verified')}</div></td><td className="px-4 py-4 text-neutral-700">{[patient.city, patient.state].filter(Boolean).join(', ') || '—'}</td><td className="px-4 py-4"><div className="font-medium text-neutral-800">{patient.referringDoctor?.fullName || 'Direct / none'}</div><div className="mt-0.5 text-xs text-neutral-500">{patient.referringDoctor?.clinicName || patient.referringDoctor?.doctorId || '—'}</div></td><td className="px-4 py-4"><div className="text-neutral-700">{patient.referralSource || 'direct'}</div>{patient.referralLocked && <div className="mt-1 flex items-center gap-1 text-xs font-semibold text-emerald-700"><LockKeyhole className="h-3 w-3" /> Locked</div>}</td><td className="px-4 py-4"><StatusPill status={patient.status} /></td><td className="px-4 py-4 text-neutral-600">{dateText(patient.createdAt)}</td><td className="px-5 py-4 text-right"><button type="button" onClick={(e) => { e.stopPropagation(); navigate(`/admin/patients/${patient.patientId || patient._id}`); }} className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-primary-50 hover:text-primary-700">View <ExternalLink className="h-3.5 w-3.5" /></button></td></tr>)}</tbody></table></div>
        <div className="divide-y divide-neutral-100 md:hidden">{data.items.map((patient) => <button key={patient._id} type="button" onClick={() => navigate(`/admin/patients/${patient.patientId || patient._id}`)} className="block w-full px-4 py-4 text-left"><div className="flex items-start justify-between gap-3"><div><div className="font-semibold text-neutral-950">{patient.fullName}</div><div className="mt-1 text-xs text-neutral-500">{patient.patientId || '—'} · {patient.mobile}</div></div><StatusPill status={patient.status} /></div></button>)}</div>
        <div className="flex items-center justify-between border-t border-neutral-200 px-4 py-3 sm:px-5"><p className="text-xs text-neutral-500">Page {data.meta.page} of {Math.max(data.meta.totalPages, 1)}</p><div className="flex gap-2"><button type="button" disabled={data.meta.page <= 1} onClick={() => setPage((v) => Math.max(1, v - 1))} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button><button type="button" disabled={data.meta.page >= data.meta.totalPages} onClick={() => setPage((v) => v + 1)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button></div></div>
      </>}
    </section>
  </div>;
}
