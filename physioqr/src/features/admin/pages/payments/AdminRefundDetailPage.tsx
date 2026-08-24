import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, CheckCircle2, CircleDollarSign, CreditCard, RefreshCw, RotateCcw, Send, ShieldAlert } from 'lucide-react';
import apiClient from '@/lib/api-client';
import ErrorState from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/cn';

const money = (value?: number) => value == null ? '—' : formatCurrency(value);
const label = (value?: string) => value ? value.replace(/_/g, ' ') : '—';

export default function AdminRefundDetailPage() {
  const { refundId = '' } = useParams();
  const navigate = useNavigate();
  const query = useQuery<any>({ queryKey: ['admin-refund', refundId], enabled: Boolean(refundId), queryFn: () => apiClient.get(`/admin/refunds/${refundId}`).then((response) => response.data) });
  const processRefund = useMutation({
    mutationFn: () => apiClient.post(`/refunds/${refundId}/process`).then((response) => response.data),
    onSuccess: () => query.refetch(),
  });

  if (query.isLoading) return <div className="space-y-4">{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-20 w-full" />)}</div>;
  if (query.isError || !query.data) return <ErrorState title="Refund could not load" message="The refund may not exist or the admin API is unavailable." onRetry={() => query.refetch()} />;

  const { refund: r, integrity } = query.data;
  const duplicate = Boolean(integrity.duplicateCharge);
  const canProcess = duplicate && ['requested', 'approved'].includes(r.status);

  return <div className="space-y-6">
    <header>
      <button onClick={() => navigate('/admin/refunds')} className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-neutral-600"><ArrowLeft className="h-4 w-4" />Refunds</button>
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-primary-700">{duplicate ? 'Duplicate charge refund' : 'Refund review'}</p><h1 className="mt-2 text-2xl font-bold text-neutral-950">{r.gatewayRefundId || `Refund ${r._id.slice(-8)}`}</h1><p className="mt-1 text-sm text-neutral-500">{r.patient?.fullName || 'Patient'} · {label(r.refundType)}</p></div><div className="flex flex-wrap gap-2">{canProcess && <button disabled={processRefund.isPending} onClick={() => processRefund.mutate()} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-neutral-950 px-4 text-sm font-semibold text-white disabled:opacity-50"><Send className="h-4 w-4" />{processRefund.isPending ? 'Submitting…' : 'Send to Razorpay'}</button>}<button onClick={() => query.refetch()} className="inline-flex min-h-11 items-center gap-2 rounded-lg border px-4 text-sm font-semibold"><RefreshCw className={cn('h-4 w-4', query.isFetching && 'animate-spin')} />Refresh</button></div></div>
    </header>

    {processRefund.isError && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{(processRefund.error as any)?.response?.data?.message || 'Refund could not be submitted to Razorpay.'}</div>}

    {duplicate ? <div className={cn('rounded-xl border p-4 text-sm', integrity.completed ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : r.status === 'failed' ? 'border-red-200 bg-red-50 text-red-900' : 'border-amber-200 bg-amber-50 text-amber-900')}><div className="flex gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" /><div><strong>{integrity.completed ? 'Duplicate charge refund completed.' : r.status === 'processing' ? 'Razorpay is processing this refund.' : r.status === 'failed' ? 'Razorpay refund failed.' : 'Duplicate charge refund is queued.'}</strong><p className="mt-1 leading-6">{integrity.completed ? 'Razorpay confirmed the refund as processed.' : `Current state: ${label(r.status)}. Completion is not assumed until Razorpay reports processed.`} The primary payment, patient program and original doctor fee share remain unchanged.</p></div></div></div> : <div className={cn('rounded-xl border px-4 py-3 text-sm', integrity.completed ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-amber-200 bg-amber-50 text-amber-900')}><strong>Integrity:</strong> Payment {integrity.paymentWasVerified ? 'verified/refunded state' : 'not verified'} · Refund {integrity.completed ? 'completed' : 'not completed'} · Fee reversal {integrity.feeShareReversalRecorded ? 'recorded' : 'not recorded'}{integrity.feeShareAlreadyWithdrawn ? ' · Doctor share had already been withdrawn' : ''}</div>}

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[[RotateCcw, 'Refund amount', money(r.refundAmount)],[CircleDollarSign, duplicate ? 'Fee reversal' : 'Fee-share reversal', duplicate ? 'Not applicable' : money(r.feeShareReversal)],[CheckCircle2, 'Status', label(r.status)],[ShieldAlert, 'Type', label(r.refundType)]].map(([Icon, itemLabel, value]: any) => <div key={itemLabel} className="rounded-xl border bg-white p-4"><Icon className="h-5 w-5 text-neutral-500" /><p className="mt-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">{itemLabel}</p><p className="mt-1 text-lg font-bold capitalize">{value || '—'}</p></div>)}</section>

    <div className="grid gap-5 xl:grid-cols-2"><section className="rounded-xl border bg-white p-5"><h2 className="font-bold">Refund record</h2><dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">{[['Gateway refund ID', r.gatewayRefundId], ['Status', label(r.status)], ['Type', label(r.refundType)], ['Requested amount', money(r.refundAmount)], ['Reason', r.reason], ['Failure reason', r.rejectionReason], ['Requested by', r.requestedBy?.email || r.requestedBy?.mobile], ['Processed by', r.processedBy?.email || r.processedBy?.mobile], ['Created', r.createdAt ? new Date(r.createdAt).toLocaleString() : '—'], ['Processed at', r.processedAt ? new Date(r.processedAt).toLocaleString() : '—']].map(([key, value]) => <div key={key}><dt className="text-xs font-semibold uppercase text-neutral-500">{key}</dt><dd className="mt-1 break-words font-medium">{value || '—'}</dd></div>)}</dl></section>
      <section className="rounded-xl border bg-white p-5"><h2 className="font-bold">Payment & order</h2><dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">{[['Invoice', r.payment?.invoiceNumber], ['Transaction', r.payment?.gatewayTransactionId], ['Payment status', label(r.payment?.status)], ['Paid amount', money(r.payment?.paidAmount)], ['Order', r.order?.orderId], ['Order total', money(r.order?.finalAmount)], ['Doctor share', duplicate ? 'Not created for duplicate charge' : money(r.payment?.doctorFeeShare)], ['Platform share', duplicate ? 'Not created for duplicate charge' : money(r.payment?.platformShare)]].map(([key, value]) => <div key={key}><dt className="text-xs font-semibold uppercase text-neutral-500">{key}</dt><dd className="mt-1 break-all font-medium">{value || '—'}</dd></div>)}</dl></section></div>

    {duplicate && r.payment && <section className="rounded-xl border bg-white p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-bold">Duplicate payment control</h2><p className="mt-1 text-sm text-neutral-500">This refund belongs to the quarantined second capture, not the entitlement-owning payment.</p></div><button onClick={() => navigate(`/admin/payments/${r.payment._id}`)} className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold"><CreditCard className="h-4 w-4" />Open duplicate payment</button></div>{r.payment?.duplicateOf && <div className="mt-4 rounded-lg bg-neutral-50 p-3 text-sm"><strong>Primary payment:</strong> {r.payment.duplicateOf.invoiceNumber || r.payment.duplicateOf.gatewayTransactionId || '—'} · {money(r.payment.duplicateOf.paidAmount)} · {label(r.payment.duplicateOf.status)}</div>}</section>}

    <div className="grid gap-5 xl:grid-cols-2"><section className="rounded-xl border bg-white p-5"><h2 className="font-bold">Patient</h2><div className="mt-4 text-sm"><p className="font-semibold">{r.patient?.fullName || '—'}</p><p className="mt-1 text-neutral-500">{r.patient?.patientId || '—'} · {r.patient?.mobile || '—'}</p><p className="mt-1 text-neutral-500">Referral {r.patient?.referralLocked ? 'locked' : 'not locked'}</p></div></section><section className="rounded-xl border bg-white p-5"><h2 className="font-bold">Doctor & program</h2><div className="mt-4 text-sm"><p className="font-semibold">{r.doctor?.fullName || '—'}</p><p className="mt-1 text-neutral-500">{r.doctor?.doctorId || '—'} · {r.doctor?.clinicName || '—'}</p><p className="mt-3 font-medium">{r.payment?.program?.name || 'Program —'}</p></div></section></div>

    <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-600">{duplicate ? 'Send to Razorpay initiates the real gateway refund. Pending stays processing; only the verified refund.processed webhook closes it as completed.' : 'Primary refund records remain governed by the backend refund workflow and fee-share reversal rules.'}</div>
  </div>;
}
