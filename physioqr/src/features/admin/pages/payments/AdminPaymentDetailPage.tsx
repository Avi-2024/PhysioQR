import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, CheckCircle2, CreditCard, RefreshCw, RotateCcw, ShieldCheck } from 'lucide-react';
import apiClient from '@/lib/api-client';
import ErrorState from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/cn';

const money = (value?: number) => value == null ? '—' : formatCurrency(value);
const label = (value?: string) => value ? value.replace(/_/g, ' ') : '—';

export default function AdminPaymentDetailPage() {
  const { paymentId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [refundReason, setRefundReason] = useState('Duplicate captured payment for an already paid order');

  const query = useQuery<any>({
    queryKey: ['admin-payment', paymentId],
    enabled: Boolean(paymentId),
    queryFn: () => apiClient.get(`/admin/payments/${paymentId}`).then((response) => response.data),
  });

  const refundMutation = useMutation({
    mutationFn: async ({ amount, reason }: { amount: number; reason: string }) => {
      const response = await apiClient.post('/refunds', {
        paymentId,
        refundType: 'duplicate_payment',
        refundAmount: amount,
        reason,
        idempotencyKey: `duplicate-charge:${paymentId}`,
      });
      return response.data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-payment', paymentId] }),
        queryClient.invalidateQueries({ queryKey: ['admin-refunds'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-reconciliation'] }),
      ]);
    },
  });

  if (query.isLoading) return <div className="space-y-4">{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-20 w-full" />)}</div>;
  if (query.isError || !query.data) return <ErrorState title="Payment could not load" message="The payment may not exist or the API is unavailable." onRetry={() => query.refetch()} />;

  const { payment: p, patientProgram: pp, refunds = [], integrity } = query.data;
  const duplicate = Boolean(integrity.duplicateCaptured);
  const duplicateRefund = duplicate
    ? refunds.find((refund: any) => refund.refundType === 'duplicate_payment' && ['requested', 'approved', 'processing', 'completed'].includes(refund.status))
    : null;
  const canQueueDuplicateRefund = duplicate && !duplicateRefund && Number(p.paidAmount || 0) > 0;

  return <div className="space-y-6">
    <header>
      <button onClick={() => navigate('/admin/payments')} className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-neutral-600"><ArrowLeft className="h-4 w-4" />Payments</button>
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-primary-700">{duplicate ? 'Duplicate charge review' : 'Payment verification'}</p>
          <h1 className="mt-2 text-2xl font-bold text-neutral-950">{p.invoiceNumber || p.gatewayTransactionId || 'Payment'}</h1>
          <p className="mt-1 text-sm text-neutral-500">{p.patient?.fullName || 'Patient'} · {p.program?.name || 'Program'}</p>
        </div>
        <button onClick={() => query.refetch()} className="inline-flex min-h-11 items-center gap-2 self-start rounded-lg border px-4 text-sm font-semibold"><RefreshCw className={cn('h-4 w-4', query.isFetching && 'animate-spin')} />Refresh</button>
      </div>
    </header>

    {duplicate ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
      <div className="flex gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" /><div className="flex-1">
        <strong>Second captured gateway charge quarantined.</strong>
        <p className="mt-1 leading-6">This charge did not create another invoice, doctor fee share, wallet credit, coupon redemption or program activation. The primary payment remains the only entitlement owner.</p>
        {p.duplicateOf && <button onClick={() => navigate(`/admin/payments/${p.duplicateOf._id}`)} className="mt-3 rounded-lg border border-rose-300 bg-white px-3 py-2 text-xs font-semibold">Open primary payment</button>}
      </div></div>
    </div> : <div className={cn('rounded-xl border px-4 py-3 text-sm', integrity.paymentVerified && integrity.programActivated ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-amber-200 bg-amber-50 text-amber-900')}><strong>Integrity:</strong> Payment {integrity.paymentVerified ? 'verified' : 'not verified'} · Program {integrity.programActivated ? 'active' : 'not active'} · Referral {integrity.referralLocked ? 'locked' : 'not locked'}</div>}

    {duplicate && <section className="rounded-xl border border-neutral-200 bg-white p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="font-bold text-neutral-950">Duplicate charge refund</h2>
          {duplicateRefund ? <p className="mt-2 text-sm text-neutral-600">Refund request is <strong className="capitalize">{label(duplicateRefund.status)}</strong>. {duplicateRefund.status === 'completed' ? 'The duplicate charge is recorded as refunded.' : 'It is queued for gateway processing; no primary entitlement or doctor earning is being reversed.'}</p> : <p className="mt-2 text-sm text-neutral-600">Queue a full duplicate-payment refund request. This does not mark money as refunded until gateway processing actually completes.</p>}
        </div>
        {duplicateRefund && <button onClick={() => navigate(`/admin/refunds/${duplicateRefund._id}`)} className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold">Open refund</button>}
      </div>

      {canQueueDuplicateRefund && <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
        <label className="text-sm font-medium text-neutral-700">Reason
          <input value={refundReason} onChange={(event) => setRefundReason(event.target.value)} className="mt-2 min-h-11 w-full rounded-lg border border-neutral-300 px-3 outline-none focus:border-primary-500" maxLength={500} />
        </label>
        <button
          type="button"
          disabled={refundMutation.isPending || refundReason.trim().length < 3}
          onClick={() => refundMutation.mutate({ amount: Number(p.paidAmount), reason: refundReason.trim() })}
          className="min-h-11 rounded-lg bg-neutral-950 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >{refundMutation.isPending ? 'Queuing…' : `Queue refund ${money(p.paidAmount)}`}</button>
      </div>}
      {refundMutation.isError && <p className="mt-3 text-sm text-rose-700">Refund request could not be queued. Refresh the payment and verify the finance refund setting before retrying.</p>}
      {refundMutation.isSuccess && <p className="mt-3 text-sm text-emerald-700">Duplicate charge refund request queued successfully.</p>}
    </section>}

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
      [CreditCard, duplicate ? 'Captured amount' : 'Paid amount', money(p.paidAmount)],
      [CheckCircle2, 'Doctor share', money(p.doctorFeeShare)],
      [ShieldCheck, 'Platform share', money(p.platformShare)],
      [RotateCcw, 'Refunded', money(p.refundAmount)],
    ].map(([Icon, itemLabel, value]: any) => <div key={itemLabel} className="rounded-xl border bg-white p-4"><Icon className="h-5 w-5 text-neutral-500" /><p className="mt-3 text-xs font-semibold uppercase text-neutral-500">{itemLabel}</p><p className="mt-1 text-xl font-bold">{value}</p></div>)}</section>

    <div className="grid gap-5 xl:grid-cols-2">
      <section className="rounded-xl border bg-white p-5"><h2 className="font-bold">Gateway & payment</h2><dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">{[['Status', label(p.status)], ['Method', p.paymentMethod], ['Gateway', p.gatewayProvider], ['Transaction ID', p.gatewayTransactionId], ['Gateway order', p.gatewayOrderId], ['Verified at', p.verifiedAt ? new Date(p.verifiedAt).toLocaleString() : '—'], ['Failure / control note', p.failureReason || '—'], ['Created', new Date(p.createdAt).toLocaleString()]].map(([key, value]) => <div key={key}><dt className="text-xs font-semibold uppercase text-neutral-500">{key}</dt><dd className="mt-1 break-all font-medium">{value || '—'}</dd></div>)}</dl></section>
      <section className="rounded-xl border bg-white p-5"><h2 className="font-bold">Order & patient</h2><dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">{[['Order', p.order?.orderId], ['Patient', p.patient?.fullName], ['Patient ID', p.patient?.patientId], ['Doctor', p.doctor?.fullName], ['Program', p.program?.name], ['Agent', p.agent?.fullName], ['Discount', money(p.discountAmount)], ['Gateway charges', money(p.gatewayCharges)]].map(([key, value]) => <div key={key}><dt className="text-xs font-semibold uppercase text-neutral-500">{key}</dt><dd className="mt-1 font-medium">{value || '—'}</dd></div>)}</dl></section>
    </div>

    {duplicate && p.duplicateOf && <section className="rounded-xl border bg-white p-5"><h2 className="font-bold">Primary payment</h2><div className="mt-4 grid gap-4 text-sm sm:grid-cols-4"><div>Invoice: <strong>{p.duplicateOf.invoiceNumber || '—'}</strong></div><div>Transaction: <strong className="break-all">{p.duplicateOf.gatewayTransactionId || '—'}</strong></div><div>Amount: <strong>{money(p.duplicateOf.paidAmount)}</strong></div><div>Status: <strong>{label(p.duplicateOf.status)}</strong></div></div></section>}

    <section className="rounded-xl border bg-white p-5"><h2 className="font-bold">Program activation</h2>{pp ? <div className="mt-4 grid gap-4 text-sm sm:grid-cols-4"><div>Status: <strong>{pp.status}</strong></div><div>Current day: <strong>{pp.currentDay ?? '—'}</strong></div><div>Completion: <strong>{pp.completionPercentage == null ? '—' : `${pp.completionPercentage}%`}</strong></div><div>Unlock: <strong>{pp.unlockMethod || '—'}</strong></div></div> : <p className="mt-3 text-sm text-neutral-500">{duplicate ? 'No PatientProgram is linked to this duplicate charge by design. The primary payment owns program activation.' : 'No PatientProgram is linked to this payment yet.'}</p>}</section>

    <section className="rounded-xl border bg-white p-5"><h2 className="font-bold">Refund history</h2>{refunds.length ? <div className="mt-4 space-y-3">{refunds.map((refund: any) => <button key={refund._id} type="button" onClick={() => navigate(`/admin/refunds/${refund._id}`)} className="block w-full rounded-lg border p-3 text-left text-sm hover:bg-neutral-50"><div className="flex justify-between gap-3"><strong>{money(refund.refundAmount ?? refund.amount)}</strong><span className="capitalize">{label(refund.status)}</span></div><p className="mt-1 text-neutral-500">{refund.reason || 'No reason recorded'} · {new Date(refund.createdAt).toLocaleString()}</p></button>)}</div> : <p className="mt-3 text-sm text-neutral-500">No refund records for this payment.</p>}</section>
  </div>;
}
