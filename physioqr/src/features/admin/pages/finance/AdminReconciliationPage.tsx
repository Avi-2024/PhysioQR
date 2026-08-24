import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, RefreshCw, Scale } from 'lucide-react';
import apiClient from '@/lib/api-client';
import ErrorState from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/cn';

type Issue = { type: string; severity: 'critical' | 'high'; reference: string; message: string; expected?: number; actual?: number; paymentId?: string; refundId?: string };
type Response = {
  summary: { issues: number; critical: number; high: number; orders: number; payments: number; duplicateCaptured?: number; duplicateRefundPending?: number; refunds: number; feeShares: number; withdrawals: number; payouts: number };
  totals: { orders: number; payments: number; refunds: number; feeShares: number; payouts: number; duplicateCapturedAmount?: number; duplicateRefundedAmount?: number };
  issues: Issue[];
};
const label = (value: string) => value.replace(/_/g, ' ');

export default function AdminReconciliationPage() {
  const navigate = useNavigate();
  const query = useQuery<Response>({ queryKey: ['admin-reconciliation'], queryFn: () => apiClient.get('/admin/reconciliation').then((response) => response.data) });
  if (query.isLoading) return <div className="space-y-3">{Array.from({ length: 7 }).map((_, index) => <Skeleton key={index} className="h-20" />)}</div>;
  if (query.isError || !query.data) return <ErrorState title="Reconciliation could not load" message="Check the finance API and retry." onRetry={() => query.refetch()} />;

  const { summary, totals, issues } = query.data;
  return <div className="space-y-6">
    <header className="flex flex-col gap-4 sm:flex-row sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-primary-700">Finance control</p><h1 className="mt-2 text-2xl font-bold sm:text-3xl">Reconciliation</h1><p className="mt-1 text-sm text-neutral-500">Cross-check Order → Payment → Duplicate Capture → Refund → Fee Share → Wallet → Withdrawal → Payout integrity.</p></div><button onClick={() => query.refetch()} className="inline-flex min-h-11 items-center gap-2 self-start rounded-lg border bg-white px-4 text-sm font-semibold"><RefreshCw className={cn('h-4 w-4', query.isFetching && 'animate-spin')} />Run check</button></header>

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[[Scale, 'Total issues', summary.issues], [AlertTriangle, 'Critical', summary.critical], [AlertTriangle, 'High', summary.high], [CheckCircle2, 'Payments checked', summary.payments]].map(([Icon, itemLabel, value]: any) => <div key={itemLabel} className="rounded-xl border bg-white p-4"><Icon className="h-5 w-5 text-neutral-500" /><p className="mt-3 text-xs font-semibold uppercase text-neutral-500">{itemLabel}</p><p className="mt-1 text-2xl font-bold">{value}</p></div>)}</section>

    {Number(summary.duplicateCaptured || 0) > 0 && <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><div className="flex gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" /><div><strong>Duplicate captured charges: {summary.duplicateCaptured}</strong><p className="mt-1">Captured value {formatCurrency(totals.duplicateCapturedAmount || 0)} · gateway-refund pending {summary.duplicateRefundPending || 0} · recorded duplicate refunds {formatCurrency(totals.duplicateRefundedAmount || 0)}. Duplicate captures are excluded from normal verified revenue totals.</p></div></div></section>}

    <section className="grid gap-3 md:grid-cols-5">{[['Orders', totals.orders], ['Payments', totals.payments], ['Refunded', totals.refunds], ['Fee shares', totals.feeShares], ['Payouts', totals.payouts]].map(([itemLabel, value]: any) => <div key={itemLabel} className="rounded-xl border bg-white p-4"><p className="text-xs font-semibold uppercase text-neutral-500">{itemLabel}</p><p className="mt-2 text-lg font-bold">{formatCurrency(value)}</p></div>)}</section>

    <section className="rounded-xl border bg-white p-5"><div className="flex flex-wrap gap-4 text-sm text-neutral-600"><span>Orders: <strong>{summary.orders}</strong></span><span>Verified payments: <strong>{summary.payments}</strong></span><span>Duplicate captures: <strong>{summary.duplicateCaptured || 0}</strong></span><span>Refunds: <strong>{summary.refunds}</strong></span><span>Fee shares: <strong>{summary.feeShares}</strong></span><span>Withdrawals: <strong>{summary.withdrawals}</strong></span><span>Payouts: <strong>{summary.payouts}</strong></span></div></section>

    <section className="overflow-hidden rounded-xl border bg-white"><div className="border-b p-4"><h2 className="font-bold">Detected mismatches</h2><p className="mt-1 text-sm text-neutral-500">Fix the source business event instead of manually changing wallet or payment balances.</p></div>{!issues.length ? <div className="p-12 text-center"><CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" /><p className="mt-3 font-semibold">No reconciliation mismatches detected</p><p className="mt-1 text-sm text-neutral-500">Current finance records passed the implemented integrity checks.</p></div> : <div className="divide-y">{issues.map((issue, index) => <div key={`${issue.type}-${issue.reference}-${index}`} className="p-4 sm:flex sm:items-start sm:justify-between sm:gap-6"><div><div className="flex items-center gap-2"><span className={cn('rounded-full px-2 py-1 text-[11px] font-bold uppercase', issue.severity === 'critical' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700')}>{issue.severity}</span><strong className="text-sm capitalize">{label(issue.type)}</strong></div><p className="mt-2 text-sm text-neutral-700">{issue.message}</p><p className="mt-1 text-xs text-neutral-500">Reference: {issue.reference}</p><div className="mt-3 flex flex-wrap gap-2">{issue.paymentId && <button onClick={() => navigate(`/admin/payments/${issue.paymentId}`)} className="rounded-lg border px-3 py-1.5 text-xs font-semibold">Open payment</button>}{issue.refundId && <button onClick={() => navigate(`/admin/refunds/${issue.refundId}`)} className="rounded-lg border px-3 py-1.5 text-xs font-semibold">Open refund</button>}</div></div>{(issue.expected != null || issue.actual != null) && <div className="mt-3 shrink-0 rounded-lg bg-neutral-50 px-3 py-2 text-xs sm:mt-0"><div>Expected: <strong>{issue.expected == null ? '—' : formatCurrency(issue.expected)}</strong></div><div className="mt-1">Actual: <strong>{issue.actual == null ? '—' : formatCurrency(issue.actual)}</strong></div></div>}</div>)}</div>}</section>
  </div>;
}
