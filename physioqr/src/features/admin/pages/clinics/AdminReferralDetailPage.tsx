import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, LockKeyhole, QrCode, RefreshCw, Stethoscope, UserRound, Users } from 'lucide-react';
import apiClient from '@/lib/api-client';
import ErrorState from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';

type ReferralDetail = {
  _id: string;
  referralId: string;
  referralSource: 'qr_code' | 'referral_link';
  scanDate?: string;
  registrationDate?: string;
  paymentStatus: 'pending' | 'paid' | 'failed';
  conversionStage: 'scanned' | 'registered' | 'paid';
  clinicId?: string;
  deviceInfo?: string;
  doctor?: { _id?: string; doctorId?: string; fullName?: string; clinicName?: string; city?: string; state?: string; status?: string };
  patient?: { _id?: string; patientId?: string; fullName?: string; mobile?: string; referralLocked?: boolean; status?: string };
  agent?: { _id?: string; agentId?: string; fullName?: string; assignedRegion?: string };
  payment?: { status?: string; paidAmount?: number; paymentMethod?: string; gatewayProvider?: string; invoiceNumber?: string; verifiedAt?: string; createdAt?: string } | null;
  attribution: { referralLocked: boolean; editable: false; reason: string };
};

const dateTime = (value?: string) => value ? new Date(value).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const money = (value?: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value ?? 0);
const text = (value?: string | null) => value?.trim() || '—';

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white"><div className="border-b border-neutral-100 bg-neutral-50/60 px-5 py-4"><h2 className="text-sm font-bold text-neutral-950">{title}</h2></div><div className="grid gap-4 p-5 sm:grid-cols-2">{children}</div></section>;
}

function Item({ label, value }: { label: string; value: React.ReactNode }) {
  return <div><div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">{label}</div><div className="mt-1 break-words text-sm font-semibold text-neutral-900">{value}</div></div>;
}

export default function AdminReferralDetailPage() {
  const { referralId = '' } = useParams();
  const navigate = useNavigate();
  const query = useQuery<ReferralDetail>({ queryKey: ['admin-referral-detail', referralId], queryFn: () => apiClient.get(`/admin/referrals/${referralId}`).then((response) => response.data), enabled: Boolean(referralId) });

  if (query.isLoading) return <div className="space-y-5"><Skeleton className="h-32 w-full" /><Skeleton className="h-28 w-full" /><Skeleton className="h-[420px] w-full" /></div>;
  if (query.isError || !query.data) return <ErrorState title="Referral detail could not load" message="Check the referral record and admin API connection, then retry." onRetry={() => query.refetch()} />;

  const referral = query.data;
  const paymentTone = referral.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-700' : referral.paymentStatus === 'failed' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700';

  return <div className="mx-auto w-full max-w-[1500px] space-y-5">
    <header className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6"><div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between"><div className="flex min-w-0 items-start gap-4"><button type="button" onClick={() => navigate('/admin/referrals')} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-neutral-200 text-neutral-600 hover:bg-neutral-50"><ArrowLeft className="h-5 w-5" /></button><div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-700"><QrCode className="h-7 w-7" /></div><div><div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-bold tracking-tight text-neutral-950 sm:text-3xl">{referral.referralId}</h1><span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold capitalize', paymentTone)}>{referral.paymentStatus}</span></div><p className="mt-1 text-sm text-neutral-600">{referral.referralSource === 'qr_code' ? 'QR code referral' : 'Referral link'} · {referral.conversionStage} stage</p><p className="mt-2 text-xs text-neutral-500">Scanned {dateTime(referral.scanDate)}</p></div></div><button type="button" onClick={() => query.refetch()} disabled={query.isFetching} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"><RefreshCw className={cn('h-4 w-4', query.isFetching && 'animate-spin')} /> Refresh</button></div></header>

    <section className={cn('rounded-xl border p-4', referral.attribution.referralLocked ? 'border-emerald-200 bg-emerald-50' : 'border-neutral-200 bg-neutral-50')}><div className="flex items-start gap-3"><LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-neutral-700" /><div><div className="text-sm font-bold text-neutral-950">Referral attribution is read-only</div><p className="mt-1 text-sm leading-6 text-neutral-600">{referral.attribution.reason} Admin can inspect the journey, but this workspace does not expose reassignment or payment-status editing.</p></div></div></section>

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><div className="rounded-xl border border-neutral-200 bg-white p-4"><div className="text-xs text-neutral-500">Conversion stage</div><div className="mt-2 text-xl font-bold capitalize text-neutral-950">{referral.conversionStage}</div></div><div className="rounded-xl border border-neutral-200 bg-white p-4"><div className="text-xs text-neutral-500">Payment status</div><div className="mt-2 text-xl font-bold capitalize text-neutral-950">{referral.paymentStatus}</div></div><div className="rounded-xl border border-neutral-200 bg-white p-4"><div className="text-xs text-neutral-500">Paid amount</div><div className="mt-2 text-xl font-bold text-neutral-950">{money(referral.payment?.paidAmount)}</div></div><div className="rounded-xl border border-neutral-200 bg-white p-4"><div className="text-xs text-neutral-500">Referral locked</div><div className="mt-2 text-xl font-bold text-neutral-950">{referral.attribution.referralLocked ? 'Yes' : 'No'}</div></div></section>

    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]"><main className="space-y-5"><InfoCard title="Doctor & clinic"><Item label="Doctor" value={text(referral.doctor?.fullName)} /><Item label="Doctor ID" value={text(referral.doctor?.doctorId)} /><Item label="Clinic" value={text(referral.doctor?.clinicName || referral.clinicId)} /><Item label="Location" value={[referral.doctor?.city, referral.doctor?.state].filter(Boolean).join(', ') || '—'} /></InfoCard><InfoCard title="Patient journey"><Item label="Patient" value={text(referral.patient?.fullName)} /><Item label="Patient ID" value={text(referral.patient?.patientId)} /><Item label="Mobile" value={text(referral.patient?.mobile)} /><Item label="Registered at" value={dateTime(referral.registrationDate)} /><Item label="Patient status" value={text(referral.patient?.status)} /><Item label="Referral locked" value={referral.patient?.referralLocked ? 'Yes' : 'No'} /></InfoCard><InfoCard title="Payment context"><Item label="Payment status" value={text(referral.payment?.status || referral.paymentStatus)} /><Item label="Paid amount" value={money(referral.payment?.paidAmount)} /><Item label="Method" value={text(referral.payment?.paymentMethod)} /><Item label="Gateway" value={text(referral.payment?.gatewayProvider)} /><Item label="Invoice" value={text(referral.payment?.invoiceNumber)} /><Item label="Verified at" value={dateTime(referral.payment?.verifiedAt)} /></InfoCard><InfoCard title="Referral metadata"><Item label="Source" value={referral.referralSource === 'qr_code' ? 'QR code' : 'Referral link'} /><Item label="Scan date" value={dateTime(referral.scanDate)} /><Item label="Device" value={text(referral.deviceInfo)} /><Item label="Agent" value={text(referral.agent?.fullName)} /><Item label="Agent ID" value={text(referral.agent?.agentId)} /><Item label="Region" value={text(referral.agent?.assignedRegion)} /></InfoCard></main>

      <aside className="space-y-4 xl:sticky xl:top-5"><section className="overflow-hidden rounded-xl border border-neutral-200 bg-white"><div className="border-b border-neutral-100 bg-neutral-50/60 px-4 py-4"><h2 className="text-sm font-bold text-neutral-950">Related workspaces</h2><p className="mt-1 text-xs text-neutral-500">Use owning modules for operational changes.</p></div><div className="space-y-2 p-4">{referral.doctor?._id && <button type="button" onClick={() => navigate(`/admin/doctors/${referral.doctor?._id}`)} className="flex w-full items-center gap-3 rounded-xl border border-neutral-200 px-4 py-3 text-left text-sm font-semibold text-neutral-700 hover:bg-neutral-50"><Stethoscope className="h-4 w-4" />Open doctor <ExternalLink className="ml-auto h-3.5 w-3.5" /></button>}{referral.patient?._id && <button type="button" onClick={() => navigate(`/admin/patients/${referral.patient?._id}`)} className="flex w-full items-center gap-3 rounded-xl border border-neutral-200 px-4 py-3 text-left text-sm font-semibold text-neutral-700 hover:bg-neutral-50"><UserRound className="h-4 w-4" />Open patient <ExternalLink className="ml-auto h-3.5 w-3.5" /></button>}</div></section><section className="rounded-xl border border-neutral-200 bg-white p-4"><div className="flex items-center gap-2 text-sm font-bold text-neutral-950"><Users className="h-4 w-4 text-primary-700" />Attribution chain</div><div className="mt-4 space-y-3 text-sm"><div className="flex justify-between gap-3"><span className="text-neutral-500">Agent</span><span className="text-right font-semibold text-neutral-900">{referral.agent?.fullName || 'None'}</span></div><div className="flex justify-between gap-3"><span className="text-neutral-500">Doctor</span><span className="text-right font-semibold text-neutral-900">{referral.doctor?.fullName || '—'}</span></div><div className="flex justify-between gap-3"><span className="text-neutral-500">Patient</span><span className="text-right font-semibold text-neutral-900">{referral.patient?.fullName || 'Not registered'}</span></div><div className="flex justify-between gap-3"><span className="text-neutral-500">Payment</span><span className="text-right font-semibold capitalize text-neutral-900">{referral.paymentStatus}</span></div></div></section></aside>
    </div>
  </div>;
}
