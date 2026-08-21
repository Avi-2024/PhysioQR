import { useDeferredValue, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  ExternalLink,
  FileWarning,
  Plus,
  RefreshCw,
  Stethoscope,
} from 'lucide-react';
import apiClient from '@/lib/api-client';
import ErrorState from '@/components/feedback/ErrorState';
import { SearchInput } from '@/components/ui/SearchInput';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';

type DoctorStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'documents_required'
  | 'approved'
  | 'rejected'
  | 'suspended'
  | 'inactive';

type KycStatus = 'pending' | 'submitted' | 'approved' | 'rejected';
type RevenueModel = 'split' | 'platform_fee';

type AgentRef = {
  _id?: string;
  agentId?: string;
  fullName?: string;
  assignedRegion?: string;
};

type DoctorRecord = {
  _id: string;
  id?: string;
  doctorId: string;
  fullName: string;
  mobile: string;
  email?: string;
  specialization?: string;
  clinicName?: string;
  city?: string;
  state?: string;
  status: DoctorStatus;
  kycStatus?: KycStatus;
  revenueModel?: RevenueModel;
  approvedPatientFee?: number;
  requestedPatientFee?: number;
  agent?: AgentRef | string | null;
  createdAt?: string;
};

type DoctorSummary = {
  total: number;
  approved: number;
  pendingApproval: number;
  documentsRequired: number;
  suspended: number;
};

type DoctorListResponse = {
  items: DoctorRecord[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: DoctorSummary;
};

const PAGE_SIZE = 20;

const emptyResponse: DoctorListResponse = {
  items: [],
  meta: { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 },
  summary: { total: 0, approved: 0, pendingApproval: 0, documentsRequired: 0, suspended: 0 },
};

const STATUS_OPTIONS: Array<{ value: '' | DoctorStatus; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under review' },
  { value: 'documents_required', label: 'Documents required' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'inactive', label: 'Inactive' },
];

const KYC_OPTIONS: Array<{ value: '' | KycStatus; label: string }> = [
  { value: '', label: 'All KYC' },
  { value: 'pending', label: 'KYC pending' },
  { value: 'submitted', label: 'KYC submitted' },
  { value: 'approved', label: 'KYC approved' },
  { value: 'rejected', label: 'KYC rejected' },
];

const REVENUE_OPTIONS: Array<{ value: '' | RevenueModel; label: string }> = [
  { value: '', label: 'All revenue models' },
  { value: 'split', label: 'Revenue split' },
  { value: 'platform_fee', label: 'Platform fee' },
];

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

function labelize(value?: string) {
  if (!value) return '—';
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function displayText(value?: string, fallback = '—') {
  return value?.trim() || fallback;
}

function StatusPill({ status }: { status: DoctorStatus }) {
  const tone = {
    draft: 'bg-neutral-100 text-neutral-700 ring-neutral-600/10',
    submitted: 'bg-sky-50 text-sky-700 ring-sky-600/10',
    under_review: 'bg-amber-50 text-amber-700 ring-amber-600/10',
    documents_required: 'bg-orange-50 text-orange-700 ring-orange-600/10',
    approved: 'bg-emerald-50 text-emerald-700 ring-emerald-600/10',
    rejected: 'bg-rose-50 text-rose-700 ring-rose-600/10',
    suspended: 'bg-rose-50 text-rose-700 ring-rose-600/10',
    inactive: 'bg-neutral-100 text-neutral-600 ring-neutral-600/10',
  }[status];

  return (
    <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset', tone)}>
      {labelize(status)}
    </span>
  );
}

function KycPill({ status }: { status?: KycStatus }) {
  if (!status) return <span className="text-xs text-neutral-400">—</span>;

  const tone = {
    pending: 'bg-neutral-100 text-neutral-700',
    submitted: 'bg-sky-50 text-sky-700',
    approved: 'bg-emerald-50 text-emerald-700',
    rejected: 'bg-rose-50 text-rose-700',
  }[status];

  return <span className={cn('inline-flex rounded-md px-2 py-1 text-xs font-semibold', tone)}>{labelize(status)}</span>;
}

export default function AdminDoctorsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search.trim());
  const [status, setStatus] = useState<'' | DoctorStatus>('');
  const [kycStatus, setKycStatus] = useState<'' | KycStatus>('');
  const [revenueModel, setRevenueModel] = useState<'' | RevenueModel>('');
  const [page, setPage] = useState(1);

  const query = useQuery<DoctorListResponse>({
    queryKey: ['admin-doctors', page, deferredSearch, status, kycStatus, revenueModel],
    queryFn: () =>
      apiClient
        .get('/admin/doctors', {
          params: {
            page,
            limit: PAGE_SIZE,
            ...(deferredSearch ? { search: deferredSearch } : {}),
            ...(status ? { status } : {}),
            ...(kycStatus ? { kycStatus } : {}),
            ...(revenueModel ? { revenueModel } : {}),
          },
        })
        .then((response) => response.data),
  });

  const data = query.data ?? emptyResponse;
  const rows = data.items ?? [];
  const meta = data.meta ?? emptyResponse.meta;
  const summary = data.summary ?? emptyResponse.summary;

  const summaryCards = useMemo(
    () => [
      { label: 'Total doctors', value: summary.total, icon: Stethoscope, tone: 'bg-sky-50 text-sky-700' },
      { label: 'Approved', value: summary.approved, icon: BadgeCheck, tone: 'bg-emerald-50 text-emerald-700' },
      { label: 'Pending approval', value: summary.pendingApproval, icon: CircleAlert, tone: 'bg-amber-50 text-amber-700' },
      { label: 'Documents required', value: summary.documentsRequired, icon: FileWarning, tone: 'bg-orange-50 text-orange-700' },
    ],
    [summary],
  );

  const hasFilters = Boolean(search || status || kycStatus || revenueModel);
  const from = meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1;
  const to = Math.min(meta.page * meta.limit, meta.total);

  const clearFilters = () => {
    setSearch('');
    setStatus('');
    setKycStatus('');
    setRevenueModel('');
    setPage(1);
  };

  return (
    <div className="min-w-0 space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-700">Doctor network</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-neutral-950 sm:text-3xl">Doctors</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-neutral-500">
            Review onboarding, approval, KYC, clinic ownership, and referral programme readiness from live backend records.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => query.refetch()}
            disabled={query.isFetching}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={cn('h-4 w-4', query.isFetching && 'animate-spin')} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => navigate('/admin/doctors/new')}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white transition hover:bg-primary-700"
          >
            <Plus className="h-4 w-4" />
            Add doctor
          </button>
        </div>
      </header>

      {!query.isError && (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((item) => (
              <div key={item.label} className="rounded-xl border border-neutral-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{item.label}</p>
                    <p className="mt-2 text-2xl font-bold text-neutral-950">{query.isLoading ? '—' : item.value}</p>
                  </div>
                  <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', item.tone)}>
                    <item.icon className="h-5 w-5" />
                  </div>
                </div>
              </div>
            ))}
          </section>

          {!query.isLoading && summary.suspended > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              <CircleAlert className="h-4 w-4 shrink-0" />
              <span><strong>{summary.suspended}</strong> doctor{summary.suspended === 1 ? '' : 's'} currently suspended.</span>
              <button type="button" onClick={() => { setStatus('suspended'); setPage(1); }} className="ml-auto font-semibold underline-offset-2 hover:underline">
                Review
              </button>
            </div>
          )}
        </>
      )}

      <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <div className="border-b border-neutral-200 px-4 py-4 sm:px-5">
          <div className="grid gap-3 xl:grid-cols-[minmax(320px,1fr)_auto_auto_auto_auto] xl:items-center">
            <SearchInput
              value={search}
              onChange={(value) => { setSearch(value); setPage(1); }}
              placeholder="Search doctor ID, name, mobile, clinic, city, specialization"
            />

            <select
              value={status}
              onChange={(event) => { setStatus(event.target.value as '' | DoctorStatus); setPage(1); }}
              className="min-h-11 rounded-lg border border-neutral-300 bg-white px-3 text-sm font-medium text-neutral-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
              aria-label="Filter doctors by status"
            >
              {STATUS_OPTIONS.map((option) => <option key={option.value || 'all'} value={option.value}>{option.label}</option>)}
            </select>

            <select
              value={kycStatus}
              onChange={(event) => { setKycStatus(event.target.value as '' | KycStatus); setPage(1); }}
              className="min-h-11 rounded-lg border border-neutral-300 bg-white px-3 text-sm font-medium text-neutral-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
              aria-label="Filter doctors by KYC status"
            >
              {KYC_OPTIONS.map((option) => <option key={option.value || 'all'} value={option.value}>{option.label}</option>)}
            </select>

            <select
              value={revenueModel}
              onChange={(event) => { setRevenueModel(event.target.value as '' | RevenueModel); setPage(1); }}
              className="min-h-11 rounded-lg border border-neutral-300 bg-white px-3 text-sm font-medium text-neutral-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
              aria-label="Filter doctors by revenue model"
            >
              {REVENUE_OPTIONS.map((option) => <option key={option.value || 'all'} value={option.value}>{option.label}</option>)}
            </select>

            {hasFilters && (
              <button type="button" onClick={clearFilters} className="min-h-11 rounded-lg px-3 text-sm font-semibold text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900">
                Clear
              </button>
            )}
          </div>

          {!query.isLoading && !query.isError && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-500">
              <span>{meta.total} doctor{meta.total === 1 ? '' : 's'} found.</span>
              {query.isFetching && <span>Updating live records…</span>}
            </div>
          )}
        </div>

        {query.isError ? (
          <div className="p-5">
            <ErrorState
              title="Doctors could not load"
              message="Check the backend API, admin session, and doctor permissions, then retry."
              onRetry={() => query.refetch()}
            />
          </div>
        ) : query.isLoading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 7 }).map((_, index) => <Skeleton key={index} className="h-16 w-full" />)}
          </div>
        ) : rows.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <Stethoscope className="mx-auto h-9 w-9 text-neutral-300" />
            <h2 className="mt-3 text-sm font-semibold text-neutral-900">No doctors found</h2>
            <p className="mt-1 text-sm text-neutral-500">
              {hasFilters ? 'Try clearing the current filters.' : 'Doctor onboarding records will appear here once created or submitted.'}
            </p>
            {!hasFilters && (
              <button type="button" onClick={() => navigate('/admin/doctors/new')} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700">
                <Plus className="h-4 w-4" /> Add doctor
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[1120px] text-left text-sm">
                <thead className="border-b border-neutral-200 bg-neutral-50/80">
                  <tr className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    <th className="px-5 py-3">Doctor</th>
                    <th className="px-4 py-3">Clinic</th>
                    <th className="px-4 py-3">Agent</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3">KYC</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Patient fee</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {rows.map((doctor) => {
                    const agent = typeof doctor.agent === 'object' && doctor.agent ? doctor.agent : undefined;
                    return (
                      <tr key={doctor._id} className="cursor-pointer transition hover:bg-neutral-50" onClick={() => navigate(`/admin/doctors/${doctor._id}`)}>
                        <td className="px-5 py-4">
                          <div className="font-semibold text-neutral-950">{doctor.fullName}</div>
                          <div className="mt-0.5 text-xs font-medium text-neutral-500">{doctor.doctorId}</div>
                          <div className="mt-1 text-xs text-neutral-500">{displayText(doctor.specialization)}</div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="max-w-[220px] truncate font-medium text-neutral-800">{displayText(doctor.clinicName)}</div>
                          <div className="mt-0.5 text-xs text-neutral-500">{doctor.mobile}</div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-medium text-neutral-700">{displayText(agent?.fullName)}</div>
                          <div className="mt-0.5 text-xs text-neutral-500">{displayText(agent?.agentId)}</div>
                        </td>
                        <td className="px-4 py-4 text-neutral-700">
                          <div>{displayText(doctor.city)}</div>
                          {doctor.state && <div className="mt-0.5 text-xs text-neutral-500">{doctor.state}</div>}
                        </td>
                        <td className="px-4 py-4"><KycPill status={doctor.kycStatus} /></td>
                        <td className="px-4 py-4"><StatusPill status={doctor.status} /></td>
                        <td className="px-4 py-4 font-medium text-neutral-800">
                          {doctor.approvedPatientFee != null ? inr.format(doctor.approvedPatientFee) : '—'}
                          <div className="mt-0.5 text-xs font-normal text-neutral-500">{labelize(doctor.revenueModel)}</div>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            onClick={(event) => { event.stopPropagation(); navigate(`/admin/doctors/${doctor._id}`); }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 transition hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700"
                          >
                            Review <ExternalLink className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-neutral-100 md:hidden">
              {rows.map((doctor) => (
                <button key={doctor._id} type="button" onClick={() => navigate(`/admin/doctors/${doctor._id}`)} className="block w-full px-4 py-4 text-left transition hover:bg-neutral-50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-neutral-950">{doctor.fullName}</div>
                      <div className="mt-0.5 text-xs font-medium text-neutral-500">{doctor.doctorId}</div>
                    </div>
                    <StatusPill status={doctor.status} />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                    <div><span className="text-neutral-400">Clinic</span><div className="mt-0.5 truncate font-medium text-neutral-700">{displayText(doctor.clinicName)}</div></div>
                    <div><span className="text-neutral-400">Location</span><div className="mt-0.5 font-medium text-neutral-700">{[doctor.city, doctor.state].filter(Boolean).join(', ') || '—'}</div></div>
                    <div><span className="text-neutral-400">KYC</span><div className="mt-1"><KycPill status={doctor.kycStatus} /></div></div>
                    <div><span className="text-neutral-400">Fee</span><div className="mt-0.5 font-medium text-neutral-700">{doctor.approvedPatientFee != null ? inr.format(doctor.approvedPatientFee) : '—'}</div></div>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-3 border-t border-neutral-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <p className="text-sm text-neutral-500">Showing {from}–{to} of {meta.total}</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={meta.page <= 1 || query.isFetching}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </button>
                <span className="min-w-20 text-center text-sm font-medium text-neutral-600">Page {meta.page} of {Math.max(meta.totalPages, 1)}</span>
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.min(meta.totalPages, current + 1))}
                  disabled={meta.page >= meta.totalPages || query.isFetching}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
