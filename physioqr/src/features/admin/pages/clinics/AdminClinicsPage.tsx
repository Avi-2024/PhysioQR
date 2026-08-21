import { useDeferredValue, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Building2, ChevronLeft, ChevronRight, ExternalLink, MapPin, QrCode, RefreshCw, Stethoscope } from 'lucide-react';
import apiClient from '@/lib/api-client';
import ErrorState from '@/components/feedback/ErrorState';
import { SearchInput } from '@/components/ui/SearchInput';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';

type DoctorStatus = 'draft' | 'submitted' | 'under_review' | 'documents_required' | 'approved' | 'rejected' | 'suspended' | 'inactive';

type ClinicRecord = {
  _id: string;
  id: string;
  clinicId: string;
  doctorId?: string;
  fullName: string;
  specialization?: string;
  clinicName: string;
  clinicAddress?: string;
  city?: string;
  state?: string;
  clinicContact?: string;
  clinicEmail?: string;
  clinicWorkingHours?: string;
  clinicBranches?: number;
  status: DoctorStatus;
  qrCodeActive?: boolean;
  agent?: { fullName?: string; agentId?: string; assignedRegion?: string };
};

type ClinicListResponse = {
  items: ClinicRecord[];
  meta: { page: number; limit: number; total: number; totalPages: number };
  summary: { total: number; approved: number; qrActive: number; cities: number };
};

const PAGE_SIZE = 20;
const emptyResponse: ClinicListResponse = {
  items: [],
  meta: { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 },
  summary: { total: 0, approved: 0, qrActive: 0, cities: 0 },
};

function StatusPill({ status }: { status: DoctorStatus }) {
  const tones: Record<DoctorStatus, string> = {
    approved: 'bg-emerald-50 text-emerald-700',
    submitted: 'bg-amber-50 text-amber-700',
    under_review: 'bg-sky-50 text-sky-700',
    documents_required: 'bg-orange-50 text-orange-700',
    rejected: 'bg-rose-50 text-rose-700',
    suspended: 'bg-rose-50 text-rose-700',
    inactive: 'bg-neutral-100 text-neutral-700',
    draft: 'bg-neutral-100 text-neutral-700',
  };
  return <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize', tones[status])}>{status.replace(/_/g, ' ')}</span>;
}

export default function AdminClinicsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search.trim());
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const query = useQuery<ClinicListResponse>({
    queryKey: ['admin-clinics', page, deferredSearch, status],
    queryFn: () => apiClient.get('/admin/clinics', {
      params: { page, limit: PAGE_SIZE, ...(deferredSearch ? { search: deferredSearch } : {}), ...(status ? { status } : {}) },
    }).then((response) => response.data),
  });

  const data = query.data ?? emptyResponse;
  const cards = useMemo(() => [
    { label: 'Clinic profiles', value: data.summary.total, icon: Building2 },
    { label: 'Approved doctors', value: data.summary.approved, icon: Stethoscope },
    { label: 'QR active', value: data.summary.qrActive, icon: QrCode },
    { label: 'Cities covered', value: data.summary.cities, icon: MapPin },
  ], [data.summary]);

  return (
    <div className="space-y-6 min-w-0">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-700">Clinic network</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-neutral-950 sm:text-3xl">Clinics</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-neutral-500">Clinic profiles attached to doctors, with location, contact, QR availability, and ownership context.</p>
        </div>
        <button type="button" onClick={() => query.refetch()} disabled={query.isFetching} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-60">
          <RefreshCw className={cn('h-4 w-4', query.isFetching && 'animate-spin')} /> Refresh
        </button>
      </header>

      {!query.isError && <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map((card) => <div key={card.label} className="rounded-xl border border-neutral-200 bg-white p-4"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{card.label}</p><p className="mt-2 text-2xl font-bold text-neutral-950">{query.isLoading ? '—' : card.value}</p></div><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-50 text-neutral-600"><card.icon className="h-5 w-5" /></div></div></div>)}</section>}

      <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <div className="border-b border-neutral-200 px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 flex-1 lg:max-w-2xl"><SearchInput value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Search clinic, doctor, city, contact, or email" /></div>
            <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="min-h-11 rounded-lg border border-neutral-300 bg-white px-3 text-sm font-medium text-neutral-700">
              <option value="">All doctor statuses</option>
              <option value="approved">Approved</option><option value="submitted">Submitted</option><option value="under_review">Under review</option><option value="documents_required">Documents required</option><option value="suspended">Suspended</option><option value="inactive">Inactive</option>
            </select>
          </div>
          {!query.isLoading && !query.isError && <p className="mt-3 text-xs text-neutral-500">{data.meta.total} clinic profile{data.meta.total === 1 ? '' : 's'} found.</p>}
        </div>

        {query.isError ? <div className="p-5"><ErrorState title="Clinics could not load" message="Check the admin API connection and session, then retry." onRetry={() => query.refetch()} /></div> : query.isLoading ? <div className="space-y-3 p-5">{Array.from({ length: 7 }).map((_, index) => <Skeleton key={index} className="h-14 w-full" />)}</div> : data.items.length === 0 ? <div className="px-5 py-14 text-center"><Building2 className="mx-auto h-9 w-9 text-neutral-300" /><h2 className="mt-3 text-sm font-semibold text-neutral-900">No clinic profiles found</h2><p className="mt-1 text-sm text-neutral-500">Clinic details appear here after they are added to a doctor profile.</p></div> : <>
          <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[1050px] text-left text-sm"><thead className="border-b border-neutral-200 bg-neutral-50/80"><tr className="text-xs font-semibold uppercase tracking-wide text-neutral-500"><th className="px-5 py-3">Clinic</th><th className="px-4 py-3">Doctor</th><th className="px-4 py-3">Location</th><th className="px-4 py-3">Contact</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">QR</th><th className="px-5 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-neutral-100">{data.items.map((clinic) => <tr key={clinic.id} onClick={() => navigate(`/admin/clinics/${clinic.clinicId}`)} className="cursor-pointer hover:bg-neutral-50"><td className="px-5 py-4"><div className="font-semibold text-neutral-950">{clinic.clinicName}</div><div className="mt-0.5 text-xs text-neutral-500">{clinic.clinicId}</div></td><td className="px-4 py-4"><div className="font-medium text-neutral-800">{clinic.fullName}</div><div className="mt-0.5 text-xs text-neutral-500">{clinic.doctorId || '—'} · {clinic.specialization || 'Specialization not set'}</div></td><td className="px-4 py-4 text-neutral-700">{[clinic.city, clinic.state].filter(Boolean).join(', ') || '—'}</td><td className="px-4 py-4"><div className="text-neutral-700">{clinic.clinicContact || '—'}</div><div className="mt-0.5 text-xs text-neutral-500">{clinic.clinicEmail || '—'}</div></td><td className="px-4 py-4"><StatusPill status={clinic.status} /></td><td className="px-4 py-4"><span className={cn('text-xs font-semibold', clinic.qrCodeActive ? 'text-emerald-700' : 'text-neutral-500')}>{clinic.qrCodeActive ? 'Active' : 'Inactive'}</span></td><td className="px-5 py-4 text-right"><button type="button" onClick={(event) => { event.stopPropagation(); navigate(`/admin/clinics/${clinic.clinicId}`); }} className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-primary-50 hover:text-primary-700">View <ExternalLink className="h-3.5 w-3.5" /></button></td></tr>)}</tbody></table></div>
          <div className="divide-y divide-neutral-100 md:hidden">{data.items.map((clinic) => <button key={clinic.id} type="button" onClick={() => navigate(`/admin/clinics/${clinic.clinicId}`)} className="block w-full px-4 py-4 text-left"><div className="flex items-start justify-between gap-3"><div><div className="font-semibold text-neutral-950">{clinic.clinicName}</div><div className="mt-1 text-xs text-neutral-500">{clinic.fullName} · {[clinic.city, clinic.state].filter(Boolean).join(', ') || 'Location unavailable'}</div></div><StatusPill status={clinic.status} /></div></button>)}</div>
          <div className="flex items-center justify-between border-t border-neutral-200 px-4 py-3 sm:px-5"><p className="text-xs text-neutral-500">Page {data.meta.page} of {Math.max(data.meta.totalPages, 1)}</p><div className="flex gap-2"><button type="button" disabled={data.meta.page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button><button type="button" disabled={data.meta.page >= data.meta.totalPages} onClick={() => setPage((value) => value + 1)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button></div></div>
        </>}
      </section>
    </div>
  );
}
