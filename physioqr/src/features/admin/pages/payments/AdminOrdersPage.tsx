import { useDeferredValue, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ChevronLeft, ChevronRight, Clock3, ExternalLink, ReceiptText, RefreshCw, RotateCcw, XCircle } from 'lucide-react';
import apiClient from '@/lib/api-client';
import ErrorState from '@/components/feedback/ErrorState';
import { SearchInput } from '@/components/ui/SearchInput';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';
import { formatCurrency } from '@/lib/formatters';

type Person = { _id?: string; patientId?: string; doctorId?: string; fullName?: string; mobile?: string; clinicName?: string };
type Program = { _id?: string; programCode?: string; name?: string };
type Order = {
  _id: string;
  id: string;
  orderId?: string;
  patient?: Person | null;
  doctor?: Person | null;
  program?: Program | null;
  finalAmount?: number;
  currency?: string;
  status: string;
  couponCode?: string;
  paymentMethod?: string;
  gatewayProvider?: string;
  createdAt?: string;
  paidAt?: string;
  payment?: { attempts: number; latestStatus?: string | null; latestPaymentId?: string | null; invoiceNumber?: string | null };
  activation?: { status?: string; currentDay?: number; completionPercentage?: number } | null;
};
type OrdersResponse = {
  items: Order[];
  meta: { page: number; limit: number; total: number; totalPages: number };
  summary: { total: number; paid: number; pending: number; failed: number; refunded: number; totalCollected: number };
};

const PAGE_SIZE = 20;
const statusOptions = ['', 'created', 'pending', 'successful', 'manually_verified', 'failed', 'cancelled', 'refunded', 'partially_refunded', 'disputed', 'chargeback'];
const labelize = (value?: string | null) => value ? value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()) : '—';
const dateTime = (value?: string) => value ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';

export default function AdminOrdersPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search.trim());
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const query = useQuery<OrdersResponse>({
    queryKey: ['admin-orders', page, deferredSearch, status],
    queryFn: () => apiClient.get('/admin/orders', { params: {
      page,
      limit: PAGE_SIZE,
      ...(deferredSearch ? { search: deferredSearch } : {}),
      ...(status ? { status } : {}),
    } }).then((response) => response.data),
  });

  const cards = useMemo(() => [
    { label: 'All orders', value: query.data?.summary.total ?? '—', icon: ReceiptText },
    { label: 'Paid / verified', value: query.data?.summary.paid ?? '—', icon: CheckCircle2 },
    { label: 'Pending', value: query.data?.summary.pending ?? '—', icon: Clock3 },
    { label: 'Refunded', value: query.data?.summary.refunded ?? '—', icon: RotateCcw },
  ], [query.data?.summary]);

  return <div className="min-w-0 space-y-6">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-700">Commerce</p><h1 className="mt-2 text-2xl font-bold tracking-tight text-neutral-950 sm:text-3xl">Orders</h1><p className="mt-1 max-w-3xl text-sm leading-6 text-neutral-500">Review immutable program orders, pricing snapshots, payment attempts and activation state. Order history is read-only; payment and refund decisions stay in their owning modules.</p></div>
      <button type="button" onClick={() => query.refetch()} disabled={query.isFetching} className="inline-flex min-h-11 items-center gap-2 self-start rounded-lg border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-700"><RefreshCw className={cn('h-4 w-4', query.isFetching && 'animate-spin')} />Refresh</button>
    </header>

    {!query.isError && <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map((card) => <div key={card.label} className="rounded-xl border border-neutral-200 bg-white p-4"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{card.label}</p><p className="mt-2 text-2xl font-bold text-neutral-950">{query.isLoading ? '—' : card.value}</p></div><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-50 text-neutral-600"><card.icon className="h-5 w-5" /></div></div></div>)}</section>}

    {!query.isError && !query.isLoading && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"><strong>Verified order value:</strong> {formatCurrency(query.data?.summary.totalCollected || 0)} from successful or manually verified orders.</div>}

    <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <div className="border-b border-neutral-200 px-4 py-4 sm:px-5"><div className="flex flex-col gap-3 lg:flex-row lg:items-center"><div className="min-w-0 flex-1"><SearchInput value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Search order ID, gateway order, receipt or coupon" /></div><select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="min-h-11 rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-700"><option value="">All statuses</option>{statusOptions.filter(Boolean).map((item) => <option key={item} value={item}>{labelize(item)}</option>)}</select></div>{!query.isLoading && !query.isError && <p className="mt-3 text-xs text-neutral-500">{query.data?.meta.total ?? 0} order{query.data?.meta.total === 1 ? '' : 's'} found.</p>}</div>

      {query.isError ? <div className="p-5"><ErrorState title="Orders could not load" message="Check the admin order API and session, then retry." onRetry={() => query.refetch()} /></div> : query.isLoading ? <div className="space-y-3 p-5">{Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="h-16 w-full" />)}</div> : !query.data?.items.length ? <div className="px-5 py-14 text-center"><ReceiptText className="mx-auto h-9 w-9 text-neutral-300" /><h2 className="mt-3 text-sm font-semibold text-neutral-900">No orders found</h2><p className="mt-1 text-sm text-neutral-500">No orders match the current filters.</p></div> : <>
        <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[1180px] text-left text-sm"><thead className="border-b border-neutral-200 bg-neutral-50/80"><tr className="text-xs font-semibold uppercase tracking-wide text-neutral-500"><th className="px-5 py-3">Order</th><th className="px-4 py-3">Patient</th><th className="px-4 py-3">Program</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Payment</th><th className="px-4 py-3">Activation</th><th className="px-4 py-3">Created</th><th className="px-5 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-neutral-100">{query.data.items.map((item) => <tr key={item._id} onClick={() => navigate(`/admin/orders/${item.orderId || item._id}`)} className="cursor-pointer hover:bg-neutral-50"><td className="px-5 py-4"><div className="font-semibold text-neutral-950">{item.orderId || item._id}</div><div className="mt-1"><Status status={item.status} /></div></td><td className="px-4 py-4"><div className="font-medium text-neutral-800">{item.patient?.fullName || '—'}</div><div className="text-xs text-neutral-500">{item.patient?.patientId || item.patient?.mobile || '—'}</div></td><td className="px-4 py-4"><div className="font-medium text-neutral-800">{item.program?.name || '—'}</div><div className="text-xs text-neutral-500">{item.program?.programCode || '—'}</div></td><td className="px-4 py-4 font-semibold text-neutral-900">{typeof item.finalAmount === 'number' ? formatCurrency(item.finalAmount) : '—'}</td><td className="px-4 py-4"><div className="text-neutral-700">{labelize(item.payment?.latestStatus || item.status)}</div><div className="text-xs text-neutral-400">{item.payment?.attempts || 0} attempt{item.payment?.attempts === 1 ? '' : 's'}</div></td><td className="px-4 py-4"><div className="text-neutral-700">{labelize(item.activation?.status)}</div>{item.activation?.status && <div className="text-xs text-neutral-400">Day {item.activation.currentDay || 1}</div>}</td><td className="px-4 py-4 text-neutral-600">{dateTime(item.createdAt)}</td><td className="px-5 py-4 text-right"><button type="button" onClick={(event) => { event.stopPropagation(); navigate(`/admin/orders/${item.orderId || item._id}`); }} className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-700">View <ExternalLink className="h-3.5 w-3.5" /></button></td></tr>)}</tbody></table></div>
        <div className="divide-y divide-neutral-100 md:hidden">{query.data.items.map((item) => <button key={item._id} type="button" onClick={() => navigate(`/admin/orders/${item.orderId || item._id}`)} className="block w-full px-4 py-4 text-left"><div className="flex items-start justify-between gap-3"><div><div className="font-semibold text-neutral-950">{item.orderId || item._id}</div><div className="mt-1 text-xs text-neutral-500">{item.patient?.fullName || 'Unknown patient'} · {item.program?.name || 'Unknown program'}</div><div className="mt-2 text-sm font-semibold text-neutral-800">{typeof item.finalAmount === 'number' ? formatCurrency(item.finalAmount) : '—'}</div></div><Status status={item.status} /></div></button>)}</div>
        <div className="flex items-center justify-between border-t border-neutral-200 px-4 py-3 sm:px-5"><p className="text-xs text-neutral-500">Page {query.data.meta.page} of {Math.max(query.data.meta.totalPages, 1)}</p><div className="flex gap-2"><button disabled={query.data.meta.page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button><button disabled={query.data.meta.page >= query.data.meta.totalPages} onClick={() => setPage((value) => value + 1)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button></div></div>
      </>}
    </section>
  </div>;
}

function Status({ status }: { status: string }) {
  const paid = ['successful', 'manually_verified'].includes(status);
  const failed = ['failed', 'cancelled', 'chargeback', 'disputed'].includes(status);
  const refunded = ['refunded', 'partially_refunded'].includes(status);
  const Icon = paid ? CheckCircle2 : failed ? XCircle : refunded ? RotateCcw : Clock3;
  return <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold', paid ? 'bg-emerald-50 text-emerald-700' : failed ? 'bg-rose-50 text-rose-700' : refunded ? 'bg-violet-50 text-violet-700' : 'bg-amber-50 text-amber-700')}><Icon className="h-3.5 w-3.5" />{labelize(status)}</span>;
}
