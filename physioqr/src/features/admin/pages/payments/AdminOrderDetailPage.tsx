import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, CreditCard, ExternalLink, ReceiptText, RefreshCw, ShieldCheck } from 'lucide-react';
import apiClient from '@/lib/api-client';
import ErrorState from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';
import { formatCurrency } from '@/lib/formatters';

type Person = { _id?: string; patientId?: string; doctorId?: string; agentId?: string; fullName?: string; mobile?: string; email?: string; clinicName?: string; city?: string; state?: string; status?: string; referralLocked?: boolean };
type Program = { _id?: string; programCode?: string; name?: string; durationDays?: number; sessionsPerDay?: number; defaultPrice?: number; isActive?: boolean };
type Payment = { _id: string; invoiceNumber?: string; gatewayTransactionId?: string; gatewayOrderId?: string; paymentMethod?: string; paidAmount?: number; discountAmount?: number; taxAmount?: number; gatewayCharges?: number; refundAmount?: number; doctorFeeShare?: number; platformShare?: number; status: string; failureReason?: string; verifiedAt?: string; createdAt?: string };
type Order = {
  _id: string;
  orderId?: string;
  patient?: Person | null;
  doctor?: Person | null;
  agent?: Person | null;
  program?: Program | null;
  originalAmount?: number;
  discountAmount?: number;
  taxAmount?: number;
  gatewayCharges?: number;
  finalAmount?: number;
  currency?: string;
  couponCode?: string;
  paymentMethod?: string;
  gatewayProvider?: string;
  gatewayOrderId?: string;
  gatewayReceipt?: string;
  pricingSnapshot?: Record<string, unknown>;
  status: string;
  failureReason?: string;
  paidAt?: string;
  expiresAt?: string;
  createdAt?: string;
  updatedAt?: string;
};
type Activation = { _id?: string; status?: string; startDate?: string; expiryDate?: string; currentDay?: number; completionPercentage?: number; unlockMethod?: string; pauseCount?: number; pausedAt?: string; pauseReason?: string };
type DetailResponse = {
  order: Order;
  payments: Payment[];
  verifiedPayment?: Payment | null;
  activation?: Activation | null;
  integrity: { paymentVerified: boolean; programActivated: boolean; paymentAttemptCount: number };
};

const labelize = (value?: string | null) => value ? value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()) : '—';
const dateTime = (value?: string) => value ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';
const money = (value?: number) => typeof value === 'number' ? formatCurrency(value) : '—';

export default function AdminOrderDetailPage() {
  const { orderId = '' } = useParams();
  const navigate = useNavigate();
  const query = useQuery<DetailResponse>({
    queryKey: ['admin-order', orderId],
    enabled: Boolean(orderId),
    queryFn: () => apiClient.get(`/admin/orders/${encodeURIComponent(orderId)}`).then((response) => response.data),
  });

  if (query.isLoading) return <div className="space-y-4">{Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="h-20 w-full" />)}</div>;
  if (query.isError || !query.data?.order) return <ErrorState title="Order could not load" message="The order may not exist or the admin order API is unavailable." onRetry={() => query.refetch()} />;

  const { order, payments, verifiedPayment, activation, integrity } = query.data;

  return <div className="min-w-0 space-y-6">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div><button type="button" onClick={() => navigate('/admin/orders')} className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-neutral-500 hover:text-neutral-900"><ArrowLeft className="h-4 w-4" />Orders</button><div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-bold tracking-tight text-neutral-950 sm:text-3xl">{order.orderId || order._id}</h1><Status status={order.status} /></div><p className="mt-2 text-sm text-neutral-500">Created {dateTime(order.createdAt)} · {order.gatewayProvider || 'Payment gateway not set'}</p></div>
      <button type="button" onClick={() => query.refetch()} disabled={query.isFetching} className="inline-flex min-h-11 items-center gap-2 self-start rounded-lg border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-700"><RefreshCw className={cn('h-4 w-4', query.isFetching && 'animate-spin')} />Refresh</button>
    </header>

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Metric label="Final amount" value={money(order.finalAmount)} icon={ReceiptText} />
      <Metric label="Payment attempts" value={String(integrity.paymentAttemptCount)} icon={CreditCard} />
      <Metric label="Payment verified" value={integrity.paymentVerified ? 'Yes' : 'No'} icon={CheckCircle2} />
      <Metric label="Program activation" value={activation?.status ? labelize(activation.status) : 'Not activated'} icon={ShieldCheck} />
    </section>

    <div className={cn('rounded-xl border px-4 py-3 text-sm leading-6', integrity.paymentVerified && integrity.programActivated ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : integrity.paymentVerified ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-neutral-200 bg-neutral-50 text-neutral-700')}>
      {integrity.paymentVerified && integrity.programActivated ? 'Verified payment is linked to a patient program activation.' : integrity.paymentVerified ? 'Payment is verified, but no linked program activation was found for the verified payment. Review Payments before taking any manual action.' : 'No successful or manually verified payment is linked to this order yet. Program activation should not occur before verified payment.'}
    </div>

    <section className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
      <div className="space-y-5">
        <Card title="Order & pricing"><div className="grid gap-4 sm:grid-cols-2"><Info label="Original amount" value={money(order.originalAmount)} /><Info label="Discount" value={money(order.discountAmount)} /><Info label="Tax" value={money(order.taxAmount)} /><Info label="Gateway charges" value={money(order.gatewayCharges)} /><Info label="Final amount" value={money(order.finalAmount)} /><Info label="Coupon" value={order.couponCode || '—'} /><Info label="Payment method" value={order.paymentMethod || '—'} /><Info label="Gateway order ID" value={order.gatewayOrderId || '—'} /></div>{order.failureReason && <Text label="Failure reason" value={order.failureReason} />}</Card>

        <Card title="Payment attempts"><div className="space-y-3">{!payments.length ? <p className="text-sm text-neutral-500">No payment attempts recorded for this order.</p> : payments.map((payment) => <div key={payment._id} className="rounded-lg border border-neutral-200 p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-neutral-900">{payment.invoiceNumber || payment.gatewayTransactionId || payment._id}</p><Status status={payment.status} /></div><p className="mt-1 text-xs text-neutral-500">{dateTime(payment.createdAt)}{payment.paymentMethod ? ` · ${payment.paymentMethod}` : ''}</p></div><div className="text-left sm:text-right"><p className="font-bold text-neutral-900">{money(payment.paidAmount)}</p>{payment.refundAmount ? <p className="mt-1 text-xs text-violet-700">Refunded {money(payment.refundAmount)}</p> : null}</div></div><div className="mt-3 grid gap-3 border-t border-neutral-100 pt-3 sm:grid-cols-3"><Info label="Gateway transaction" value={payment.gatewayTransactionId || '—'} /><Info label="Verified at" value={dateTime(payment.verifiedAt)} /><Info label="Failure reason" value={payment.failureReason || '—'} /></div></div>)}</div></Card>

        {order.pricingSnapshot && <Card title="Pricing snapshot"><pre className="overflow-x-auto whitespace-pre-wrap rounded-lg bg-neutral-50 p-4 text-xs leading-5 text-neutral-700">{JSON.stringify(order.pricingSnapshot, null, 2)}</pre></Card>}
      </div>

      <div className="space-y-5">
        <Card title="Patient"><Info label="Name" value={order.patient?.fullName || '—'} /><div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-1"><Info label="Patient ID" value={order.patient?.patientId || '—'} /><Info label="Mobile" value={order.patient?.mobile || '—'} /><Info label="Referral lock" value={order.patient?.referralLocked ? 'Locked after payment' : 'Not locked'} /></div>{order.patient?._id && <button type="button" onClick={() => navigate(`/admin/patients/${order.patient?.patientId || order.patient?._id}`)} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-700">Open patient <ExternalLink className="h-3.5 w-3.5" /></button>}</Card>

        <Card title="Program"><Info label="Program" value={order.program?.name || '—'} /><div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-1"><Info label="Code" value={order.program?.programCode || '—'} /><Info label="Duration" value={order.program?.durationDays ? `${order.program.durationDays} days` : '—'} /></div>{order.program?._id && <button type="button" onClick={() => navigate(`/admin/programs/${order.program?._id}`)} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-700">Open program <ExternalLink className="h-3.5 w-3.5" /></button>}</Card>

        <Card title="Referral context"><Info label="Doctor" value={order.doctor?.fullName || 'Direct / not linked'} />{order.doctor?.clinicName && <div className="mt-3"><Info label="Clinic" value={order.doctor.clinicName} /></div>}{order.agent?.fullName && <div className="mt-3"><Info label="Agent" value={order.agent.fullName} /></div>}{order.doctor?._id && <button type="button" onClick={() => navigate(`/admin/doctors/${order.doctor?.doctorId || order.doctor?._id}`)} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-700">Open doctor <ExternalLink className="h-3.5 w-3.5" /></button>}</Card>

        <Card title="Program activation">{activation ? <div className="space-y-3"><Info label="Status" value={labelize(activation.status)} /><Info label="Current day" value={activation.currentDay ? String(activation.currentDay) : '—'} /><Info label="Completion" value={typeof activation.completionPercentage === 'number' ? `${activation.completionPercentage}%` : '—'} /><Info label="Start date" value={dateTime(activation.startDate)} /><Info label="Expiry" value={dateTime(activation.expiryDate)} /><Info label="Unlock method" value={labelize(activation.unlockMethod)} /></div> : <p className="text-sm text-neutral-500">No PatientProgram is linked to a payment attempt for this order.</p>}</Card>

        {verifiedPayment?._id && <button type="button" onClick={() => navigate(`/admin/payments/${verifiedPayment._id}`)} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white">Open verified payment <ExternalLink className="h-4 w-4" /></button>}
      </div>
    </section>
  </div>;
}

function Metric({ label, value, icon: Icon }: { label: string; value: string; icon: typeof ReceiptText }) { return <div className="rounded-xl border border-neutral-200 bg-white p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{label}</p><p className="mt-2 text-xl font-bold text-neutral-950">{value}</p></div><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-50 text-neutral-600"><Icon className="h-5 w-5" /></div></div></div>; }
function Card({ title, children }: { title: string; children: React.ReactNode }) { return <div className="rounded-xl border border-neutral-200 bg-white p-5"><h2 className="text-base font-bold text-neutral-950">{title}</h2><div className="mt-4">{children}</div></div>; }
function Info({ label, value }: { label: string; value: string }) { return <div><p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{label}</p><p className="mt-1 break-words text-sm font-semibold text-neutral-800">{value}</p></div>; }
function Text({ label, value }: { label: string; value: string }) { return <div className="mt-4 border-t border-neutral-100 pt-4"><p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{label}</p><p className="mt-2 text-sm leading-6 text-neutral-700">{value}</p></div>; }
function Status({ status }: { status: string }) { const paid = ['successful', 'manually_verified'].includes(status); const bad = ['failed', 'cancelled', 'chargeback', 'disputed'].includes(status); const refunded = ['refunded', 'partially_refunded'].includes(status); return <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold', paid ? 'bg-emerald-50 text-emerald-700' : bad ? 'bg-rose-50 text-rose-700' : refunded ? 'bg-violet-50 text-violet-700' : 'bg-amber-50 text-amber-700')}>{labelize(status)}</span>; }
