import { useDeferredValue, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ChevronLeft, ChevronRight, ExternalLink, LockKeyhole, QrCode, RefreshCw, UserRoundCheck } from 'lucide-react';
import apiClient from '@/lib/api-client';
import ErrorState from '@/components/feedback/ErrorState';
import { SearchInput } from '@/components/ui/SearchInput';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';

type Referral = {
  _id: string;
  id: string;
  referralId: string;
  referralSource: 'qr_code' | 'referral_link';
  scanDate?: string;
  registrationDate?: string;
  paymentStatus: 'pending' | 'paid' | 'failed';
  conversionStage: 'scanned' | 'registered' | 'paid';
  clinicId?: string;
  doctor?: { _id?: string; doctorId?: string; fullName?: string; clinicName?: string; city?: string; state?: string };
  patient?: { _id?: string; patientId?: string; fullName?: string; mobile?: string; referralLocked?: boolean };
  agent?: { _id?: string; agentId?: string; fullName?: string; assignedRegion?: string };
};

type Response = {
  items: Referral[];
  meta: { page: number; limit: number; total: number; pages: number };
  summary: { totalScans: number; registered: number; paid: number; failed: number; lockedReferrals: number };
};

const PAGE_SIZE = 20;
const emptyData: Response = { items: [], meta: { page: 1, limit: PAGE_SIZE, total: 0, pages: 1 }, summary: { totalScans: 0, registered: 0, paid: 0, failed: 0, lockedReferrals: 0 } };

function PaymentPill({ value }: { value: Referral['paymentStatus'] }) {
  return <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold', value === 'paid' ? 'bg-emerald-50 text-emerald-700' : value === 'failed' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700')}>{value}</span>;
}

function StagePill({ value }: { value: Referral['conversionStage'] }) {
  return <span className="inline-flex rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold capitalize text-neutral-700">{value}</span>;
}

const dateText = (value?: string) => value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function AdminReferralsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search.trim());
  const [paymentStatus, setPaymentStatus] = useState('');
  const [referralSource, setReferralSource] = useState('');
  const [page, setPage] = useState(1);

  const query = useQuery<Response>({
    queryKey: ['admin-referrals', page, deferredSearch, paymentStatus, referralSource],
    queryFn: () => apiClient.get('/admin/referrals', { params: { page, limit: PAGE_SIZE, ...(deferredSearch ? { search: deferredSearch } : {}), ...(paymentStatus ? { paymentStatus } : {}), ...(referralSource ? { referralSource } : {}) } }).then((response) => response.data),
  });

  const data = query.data ?? emptyData;
  const cards = useMemo(() => [
    { label: 'Total scans', value: data.summary.totalScans, icon: QrCode },
    { label: 'Registered', value: data.summary.registered, icon: UserRoundCheck },
    { label: 'Paid', value: data.summary.paid, icon: CheckCircle2 },
    { label: 'Locked referrals', value: data.summary.lockedReferrals, icon: LockKeyhole },
  ], [data.summary]);

  return <div className="min-w-0 space-y-6">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-700">Referral attribution</p><h1 className="mt-2 text-2xl font-bold tracking-tight text-neutral-950 sm:text-3xl">Referrals</h1><p className="mt-1 max-w-3xl text-sm leading-6 text-neutral-500">Track QR and referral-link journeys from scan to registration and payment without changing attribution history.</p></div>
      <button type="button" onClick={() => query.refetch()} disabled={query.isFetching} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"><RefreshCw className={cn('h-4 w-4', query.isFetching && 'animate-spin')} /> Refresh</button>
    </header>

    {!query.isError && <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map((card) => <div key={card.label} className="rounded-xl border border-neutral-200 bg-white p-4"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{card.label}</p><p className="mt-2 text-2xl font-bold text-neutral-950">{query.isLoading ? '—' : card.value}</p></div><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-50 text-neutral-600"><card.icon className="h-5 w-5" /></div></div></div>)}</section>}

    <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <div className="border-b border-neutral-200 px-4 py-4 sm:px-5"><div className="flex flex-col gap-3 xl:flex-row xl:items-center"><div className="min-w-0 flex-1"><SearchInput value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Search referral, doctor, clinic, patient, mobile, or agent" /></div><select value={paymentStatus} onChange={(event) => { setPaymentStatus(event.target.value); setPage(1); }} className="min-h-11 rounded-lg border border-neutral-300 bg-white px-3 text-sm font-medium text-neutral-700"><option value="">All payment statuses</option><option value="pending">Pending</option><option value="paid">Paid</option><option value="failed">Failed</option></select><select value={referralSource} onChange={(event) => { setReferralSource(event.target.value); setPage(1); }} className="min-h-11 rounded-lg border border-neutral-300 bg-white px-3 text-sm font-medium text-neutral-700"><option value="">All sources</option><option value="qr_code">QR code</option><option value="referral_link">Referral link</option></select></div>{!query.isLoading && !query.isError && <p className="mt-3 text-xs text-neutral-500">{data.meta.total} referral record{data.meta.total === 1 ? '' : 's'} found.</p>}</div>

      {query.isError ? <div className="p-5"><ErrorState title="Referrals could not load" message="Check the admin API and session, then retry." onRetry={() => query.refetch()} /></div> : query.isLoading ? <div className="space-y-3 p-5">{Array.from({ length: 7 }).map((_, index) => <Skeleton key={index} className="h-14 w-full" />)}</div> : data.items.length === 0 ? <div className="px-5 py-14 text-center"><QrCode className="mx-auto h-9 w-9 text-neutral-300" /><h2 className="mt-3 text-sm font-semibold text-neutral-900">No referral records found</h2><p className="mt-1 text-sm text-neutral-500">Referral activity will appear after patients scan a doctor QR or open a referral link.</p></div> : <>
        <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[1180px] text-left text-sm"><thead className="border-b border-neutral-200 bg-neutral-50/80"><tr className="text-xs font-semibold uppercase tracking-wide text-neutral-500"><th className="px-5 py-3">Referral</th><th className="px-4 py-3">Doctor / Clinic</th><th className="px-4 py-3">Patient</th><th className="px-4 py-3">Source</th><th className="px-4 py-3">Stage</th><th className="px-4 py-3">Payment</th><th className="px-4 py-3">Scanned</th><th className="px-5 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-neutral-100">{data.items.map((item) => <tr key={item.id} onClick={() => navigate(`/admin/referrals/${item._id}`)} className="cursor-pointer hover:bg-neutral-50"><td className="px-5 py-4"><div className="font-semibold text-neutral-950">{item.referralId}</div><div className="mt-0.5 text-xs text-neutral-500">{item.agent?.fullName || 'No agent attributed'}</div></td><td className="px-4 py-4"><div className="font-medium text-neutral-800">{item.doctor?.fullName || '—'}</div><div className="mt-0.5 text-xs text-neutral-500">{item.doctor?.clinicName || item.clinicId || 'Clinic unavailable'}</div></td><td className="px-4 py-4"><div className="font-medium text-neutral-800">{item.patient?.fullName || 'Not registered'}</div><div className="mt-0.5 flex items-center gap-1 text-xs text-neutral-500">{item.patient?.patientId || item.patient?.mobile || '—'} {item.patient?.referralLocked && <LockKeyhole className="h-3 w-3" />}</div></td><td className="px-4 py-4 text-neutral-700">{item.referralSource === 'qr_code' ? 'QR code' : 'Referral link'}</td><td className="px-4 py-4"><StagePill value={item.conversionStage} /></td><td className="px-4 py-4"><PaymentPill value={item.paymentStatus} /></td><td className="px-4 py-4 text-neutral-600">{dateText(item.scanDate)}</td><td className="px-5 py-4 text-right"><button type="button" onClick={(event) => { event.stopPropagation(); navigate(`/admin/referrals/${item._id}`); }} className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-primary-50 hover:text-primary-700">View <ExternalLink className="h-3.5 w-3.5" /></button></td></tr>)}</tbody></table></div>
        <div className="divide-y divide-neutral-100 md:hidden">{data.items.map((item) => <button key={item.id} type="button" onClick={() => navigate(`/admin/referrals/${item._id}`)} className="block w-full px-4 py-4 text-left"><div className="flex items-start justify-between gap-3"><div><div className="font-semibold text-neutral-950">{item.referralId}</div><div className="mt-1 text-xs text-neutral-500">{item.doctor?.fullName || 'Doctor unavailable'} · {item.patient?.fullName || 'Not registered'}</div></div><PaymentPill value={item.paymentStatus} /></div></button>)}</div>
        <div className="flex items-center justify-between border-t border-neutral-200 px-4 py-3 sm:px-5"><p className="text-xs text-neutral-500">Page {data.meta.page} of {Math.max(data.meta.pages, 1)}</p><div className="flex gap-2"><button type="button" disabled={data.meta.page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button><button type="button" disabled={data.meta.page >= data.meta.pages} onClick={() => setPage((value) => value + 1)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button></div></div>
      </>}
    </section>
  </div>;
}
