import { useDeferredValue, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ChevronLeft, ChevronRight, CircleDollarSign, Clock3, RefreshCw, RotateCcw, XCircle } from 'lucide-react';
import apiClient from '@/lib/api-client';
import ErrorState from '@/components/feedback/ErrorState';
import { SearchInput } from '@/components/ui/SearchInput';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/cn';

type Refund = {
  _id: string;
  refundType: string;
  refundAmount: number;
  gatewayRefundId?: string;
  feeShareReversal?: number;
  feeShareAlreadyWithdrawn?: boolean;
  reason?: string;
  status: string;
  createdAt: string;
  patient?: { patientId?: string; fullName?: string; mobile?: string };
  doctor?: { doctorId?: string; fullName?: string; clinicName?: string };
  payment?: { invoiceNumber?: string; gatewayTransactionId?: string; paidAmount?: number; status?: string; isDuplicate?: boolean };
  order?: { orderId?: string; finalAmount?: number; status?: string };
};
type Response = {
  items: Refund[];
  meta: { page: number; limit: number; total: number; totalPages: number };
  summary: { total: number; requested: number; processing: number; completed: number; completedAmount: number; rejectedOrFailed: number; feeShareReversal: number; duplicateQueued?: number; duplicateQueuedAmount?: number };
};

const statuses = ['requested', 'approved', 'processing', 'completed', 'rejected', 'failed'];
const types = ['full', 'partial', 'duplicate_payment', 'program_cancellation', 'manual', 'gateway'];
const label = (value: string) => value.replace(/_/g, ' ');
const badge = (status: string) => cn('rounded-full px-2.5 py-1 text-xs font-semibold capitalize', status === 'completed' ? 'bg-emerald-50 text-emerald-700' : status === 'rejected' || status === 'failed' ? 'bg-red-50 text-red-700' : status === 'requested' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700');

export default function AdminRefundsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search.trim());
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);

  const query = useQuery<Response>({
    queryKey: ['admin-refunds', page, deferredSearch, status, type],
    queryFn: () => apiClient.get('/admin/refunds', { params: { page, limit: 20, ...(deferredSearch ? { search: deferredSearch } : {}), ...(status ? { status } : {}), ...(type ? { refundType: type } : {}) } }).then((response) => response.data),
  });
  const summary = query.data?.summary;

  return <div className="space-y-6">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div><p className="text-xs font-bold uppercase tracking-[.16em] text-primary-700">Commerce</p><h1 className="mt-2 text-2xl font-bold text-neutral-950 sm:text-3xl">Refunds</h1><p className="mt-1 text-sm text-neutral-500">Primary payment refund ledger plus duplicate-charge refund queue. A queued duplicate refund is not shown as completed until gateway processing is actually recorded.</p></div>
      <button onClick={() => query.refetch()} className="inline-flex min-h-11 items-center gap-2 self-start rounded-lg border border-neutral-300 bg-white px-4 text-sm font-semibold"><RefreshCw className={cn('h-4 w-4', query.isFetching && 'animate-spin')} />Refresh</button>
    </header>

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
      [RotateCcw, 'Total refunds', summary?.total],
      [Clock3, 'Requested', summary?.requested],
      [CircleDollarSign, 'Completed value', summary ? formatCurrency(summary.completedAmount) : '—'],
      [XCircle, 'Rejected / failed', summary?.rejectedOrFailed],
    ].map(([Icon, itemLabel, value]: any) => <div key={itemLabel} className="rounded-xl border border-neutral-200 bg-white p-4"><Icon className="h-5 w-5 text-neutral-500" /><p className="mt-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">{itemLabel}</p><p className="mt-1 text-2xl font-bold">{value ?? '—'}</p></div>)}</section>

    {summary && Number(summary.duplicateQueued || 0) > 0 && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"><div className="flex gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><div><strong>{summary.duplicateQueued} duplicate charge refund request{summary.duplicateQueued === 1 ? '' : 's'} queued</strong> · {formatCurrency(summary.duplicateQueuedAmount || 0)} awaiting gateway completion. These requests do not reverse the primary program entitlement or doctor earning.</div></div></div>}
    {summary && summary.feeShareReversal > 0 && <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700"><strong>Recorded doctor fee-share reversals:</strong> {formatCurrency(summary.feeShareReversal)}</div>}

    <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-neutral-200 p-4 lg:flex-row">
        <div className="flex-1"><SearchInput value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Patient, invoice, transaction, order or refund ID" /></div>
        <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="min-h-11 rounded-lg border border-neutral-300 px-3 text-sm"><option value="">All statuses</option>{statuses.map((value) => <option key={value} value={value}>{label(value)}</option>)}</select>
        <select value={type} onChange={(event) => { setType(event.target.value); setPage(1); }} className="min-h-11 rounded-lg border border-neutral-300 px-3 text-sm"><option value="">All types</option>{types.map((value) => <option key={value} value={value}>{label(value)}</option>)}</select>
      </div>

      {query.isError ? <div className="p-5"><ErrorState title="Refunds could not load" message="Check the API and admin session, then retry." onRetry={() => query.refetch()} /></div> : query.isLoading ? <div className="space-y-3 p-5">{Array.from({ length: 7 }).map((_, index) => <Skeleton key={index} className="h-14 w-full" />)}</div> : !query.data?.items.length ? <div className="p-12 text-center text-sm text-neutral-500">No refunds match these filters.</div> : <>
        <div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left text-sm"><thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500"><tr><th className="px-5 py-3">Refund</th><th className="px-4 py-3">Patient</th><th className="px-4 py-3">Payment</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Fee reversal</th><th className="px-4 py-3">Status</th><th className="px-5 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-neutral-100">{query.data.items.map((refund) => {
          const duplicate = refund.refundType === 'duplicate_payment' || refund.payment?.status === 'duplicate_captured' || refund.payment?.isDuplicate;
          return <tr key={refund._id} className={cn('hover:bg-neutral-50', duplicate && 'bg-amber-50/40')}><td className="px-5 py-4"><div className="flex items-center gap-2 font-semibold">{duplicate && <AlertTriangle className="h-4 w-4 text-amber-600" />}{refund.gatewayRefundId || refund._id.slice(-8)}</div><div className="mt-1 text-xs text-neutral-500">{label(refund.refundType)} · {new Date(refund.createdAt).toLocaleString()}</div></td><td className="px-4 py-4"><div className="font-medium">{refund.patient?.fullName || '—'}</div><div className="text-xs text-neutral-500">{refund.patient?.patientId || refund.patient?.mobile || '—'}</div></td><td className="px-4 py-4"><div>{refund.payment?.invoiceNumber || refund.payment?.gatewayTransactionId || '—'}</div><div className="text-xs text-neutral-500">{duplicate ? 'Duplicate captured charge' : refund.order?.orderId || 'Order —'}</div></td><td className="px-4 py-4 font-semibold">{formatCurrency(refund.refundAmount)}</td><td className="px-4 py-4">{duplicate ? <span className="text-xs text-neutral-500">Not applicable</span> : refund.feeShareReversal ? formatCurrency(refund.feeShareReversal) : '—'}</td><td className="px-4 py-4"><span className={badge(refund.status)}>{label(refund.status)}</span></td><td className="px-5 py-4 text-right"><button onClick={() => navigate(`/admin/refunds/${refund._id}`)} className="rounded-lg border border-neutral-200 px-3 py-2 text-xs font-semibold">View</button></td></tr>;
        })}</tbody></table></div>
        <div className="flex items-center justify-between border-t border-neutral-200 px-5 py-3"><p className="text-xs text-neutral-500">Page {query.data.meta.page} of {query.data.meta.totalPages} · {query.data.meta.total} refunds</p><div className="flex gap-2"><button disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="h-9 w-9 rounded-lg border disabled:opacity-40"><ChevronLeft className="mx-auto h-4 w-4" /></button><button disabled={page >= query.data.meta.totalPages} onClick={() => setPage((value) => value + 1)} className="h-9 w-9 rounded-lg border disabled:opacity-40"><ChevronRight className="mx-auto h-4 w-4" /></button></div></div>
      </>}
    </section>
  </div>;
}
