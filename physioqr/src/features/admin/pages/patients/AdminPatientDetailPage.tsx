import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Ban, CircleCheckBig, ExternalLink, FileHeart, LockKeyhole, RefreshCw, ShieldAlert, Stethoscope, UserRound, WalletCards } from 'lucide-react';
import apiClient from '@/lib/api-client';
import ErrorState from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';

type PatientStatus = 'active' | 'inactive' | 'blocked';
type PatientDetail = {
  _id: string;
  id: string;
  patientId?: string;
  fullName: string;
  mobile: string;
  whatsapp?: string;
  email?: string;
  age?: number;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  preferredLanguage?: string;
  emergencyContact?: string;
  mobileVerified?: boolean;
  consentAccepted?: boolean;
  consentVersion?: string;
  consentDate?: string;
  referralSource?: string;
  referralLocked?: boolean;
  status: PatientStatus;
  createdAt?: string;
  updatedAt?: string;
  referringDoctor?: { _id?: string; doctorId?: string; fullName?: string; clinicName?: string; city?: string; state?: string; status?: string; revenueModel?: string; approvedPatientFee?: number };
  metrics: { programs: number; activePrograms: number; payments: number; successfulPayments: number; totalPaid: number; assessments: number; redFlags: number };
  programs: Array<{ _id: string; status?: string; startDate?: string; endDate?: string; program?: { programCode?: string; name?: string; durationDays?: number } }>;
  payments: Array<{ _id: string; status?: string; paidAmount?: number; invoiceNumber?: string; paymentMethod?: string; createdAt?: string; program?: { name?: string }; doctor?: { fullName?: string } }>;
  assessments: Array<{ _id: string; status?: string; totalScore?: number; riskLevel?: string; hasRedFlag?: boolean; createdAt?: string; painCategory?: { name?: string } }>;
  orders: Array<{ _id: string; orderId?: string; status?: string; finalAmount?: number; createdAt?: string; program?: { name?: string } }>;
};

const dateTime = (value?: string) => value ? new Date(value).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const money = (value?: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value ?? 0);
const text = (value?: string | null) => value?.trim() || '—';

function StatusPill({ status }: { status: PatientStatus }) {
  return <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize', status === 'active' ? 'bg-emerald-50 text-emerald-700' : status === 'blocked' ? 'bg-rose-50 text-rose-700' : 'bg-neutral-100 text-neutral-700')}>{status}</span>;
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white"><div className="border-b border-neutral-100 bg-neutral-50/60 px-5 py-4"><h2 className="text-sm font-bold text-neutral-950">{title}</h2></div><div className="grid gap-4 p-5 sm:grid-cols-2">{children}</div></section>;
}

function Item({ label, value }: { label: string; value: React.ReactNode }) {
  return <div><div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">{label}</div><div className="mt-1 break-words text-sm font-semibold text-neutral-900">{value}</div></div>;
}

export default function AdminPatientDetailPage() {
  const { patientId = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [statusTarget, setStatusTarget] = useState<PatientStatus | null>(null);
  const [reason, setReason] = useState('');
  const [actionError, setActionError] = useState('');

  const query = useQuery<PatientDetail>({ queryKey: ['admin-patient-detail', patientId], queryFn: () => apiClient.get(`/admin/patients/${patientId}`).then((response) => response.data), enabled: Boolean(patientId) });
  const statusMutation = useMutation({
    mutationFn: (payload: { status: PatientStatus; reason: string }) => apiClient.patch(`/admin/patients/${patientId}/status`, payload),
    onSuccess: async () => {
      setStatusTarget(null); setReason(''); setActionError('');
      await Promise.all([query.refetch(), queryClient.invalidateQueries({ queryKey: ['admin-patients'] })]);
    },
    onError: (error: any) => setActionError(error?.response?.data?.message || 'Patient status could not be updated.'),
  });

  if (query.isLoading) return <div className="space-y-5"><Skeleton className="h-32 w-full" /><Skeleton className="h-28 w-full" /><Skeleton className="h-[460px] w-full" /></div>;
  if (query.isError || !query.data) return <ErrorState title="Patient detail could not load" message="Check the patient record and admin API connection, then retry." onRetry={() => query.refetch()} />;

  const patient = query.data;
  const openStatus = (status: PatientStatus) => { setStatusTarget(status); setReason(''); setActionError(''); };

  return <div className="mx-auto w-full max-w-[1500px] space-y-5">
    <header className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6"><div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between"><div className="flex min-w-0 items-start gap-4"><button type="button" onClick={() => navigate('/admin/patients')} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-neutral-200 text-neutral-600 hover:bg-neutral-50"><ArrowLeft className="h-5 w-5" /></button><div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-700"><UserRound className="h-7 w-7" /></div><div><div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-bold tracking-tight text-neutral-950 sm:text-3xl">{patient.fullName}</h1><StatusPill status={patient.status} /></div><p className="mt-1 text-sm text-neutral-600">{patient.patientId || patient._id} · {patient.mobile}</p><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500"><span>{patient.mobileVerified ? 'Mobile verified' : 'Mobile not verified'}</span><span>{patient.referralLocked ? 'Referral locked' : 'Referral not locked'}</span><span>Joined {dateTime(patient.createdAt)}</span></div></div></div><button type="button" onClick={() => query.refetch()} disabled={query.isFetching} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"><RefreshCw className={cn('h-4 w-4', query.isFetching && 'animate-spin')} /> Refresh</button></div></header>

    {patient.referralLocked && <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><div className="flex items-start gap-3"><LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" /><div><div className="text-sm font-bold text-neutral-950">Referral attribution is locked</div><p className="mt-1 text-sm leading-6 text-neutral-600">The patient has a locked referral. This admin workspace does not expose doctor reassignment because attribution must remain stable after the qualifying payment flow.</p></div></div></section>}

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><div className="rounded-xl border border-neutral-200 bg-white p-4"><div className="text-xs text-neutral-500">Active programs</div><div className="mt-2 text-2xl font-bold text-neutral-950">{patient.metrics.activePrograms}</div><div className="mt-1 text-xs text-neutral-400">{patient.metrics.programs} total</div></div><div className="rounded-xl border border-neutral-200 bg-white p-4"><div className="text-xs text-neutral-500">Successful payments</div><div className="mt-2 text-2xl font-bold text-neutral-950">{patient.metrics.successfulPayments}</div><div className="mt-1 text-xs text-neutral-400">{patient.metrics.payments} payment records</div></div><div className="rounded-xl border border-neutral-200 bg-white p-4"><div className="text-xs text-neutral-500">Total paid</div><div className="mt-2 text-2xl font-bold text-neutral-950">{money(patient.metrics.totalPaid)}</div></div><div className="rounded-xl border border-neutral-200 bg-white p-4"><div className="text-xs text-neutral-500">Assessment red flags</div><div className={cn('mt-2 text-2xl font-bold', patient.metrics.redFlags ? 'text-rose-700' : 'text-neutral-950')}>{patient.metrics.redFlags}</div><div className="mt-1 text-xs text-neutral-400">{patient.metrics.assessments} assessments</div></div></section>

    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_350px]"><main className="space-y-5">
      <Card title="Identity & contact"><Item label="Full name" value={patient.fullName} /><Item label="Patient ID" value={text(patient.patientId)} /><Item label="Mobile" value={patient.mobile} /><Item label="WhatsApp" value={text(patient.whatsapp)} /><Item label="Email" value={text(patient.email)} /><Item label="Emergency contact" value={text(patient.emergencyContact)} /><Item label="Gender" value={text(patient.gender)} /><Item label="Age" value={patient.age ?? '—'} /></Card>
      <Card title="Address & preferences"><Item label="Address" value={text(patient.address)} /><Item label="Location" value={[patient.city, patient.state].filter(Boolean).join(', ') || '—'} /><Item label="Postal code" value={text(patient.postalCode)} /><Item label="Preferred language" value={text(patient.preferredLanguage)} /></Card>
      <Card title="Referral & consent"><Item label="Referral source" value={text(patient.referralSource)} /><Item label="Referral locked" value={patient.referralLocked ? 'Yes' : 'No'} /><Item label="Mobile verified" value={patient.mobileVerified ? 'Yes' : 'No'} /><Item label="Consent accepted" value={patient.consentAccepted ? 'Yes' : 'No'} /><Item label="Consent version" value={text(patient.consentVersion)} /><Item label="Consent date" value={dateTime(patient.consentDate)} /></Card>

      <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white"><div className="border-b border-neutral-100 bg-neutral-50/60 px-5 py-4"><h2 className="text-sm font-bold text-neutral-950">Programs</h2></div>{patient.programs.length === 0 ? <div className="p-5 text-sm text-neutral-500">No programs assigned.</div> : <div className="divide-y divide-neutral-100">{patient.programs.slice(0, 8).map((row) => <div key={row._id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="font-semibold text-neutral-900">{row.program?.name || 'Program'}</div><div className="mt-1 text-xs text-neutral-500">{row.program?.programCode || '—'} · started {dateTime(row.startDate)}</div></div><span className="text-xs font-semibold capitalize text-neutral-700">{row.status || '—'}</span></div>)}</div>}</section>

      <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white"><div className="border-b border-neutral-100 bg-neutral-50/60 px-5 py-4"><h2 className="text-sm font-bold text-neutral-950">Payments</h2></div>{patient.payments.length === 0 ? <div className="p-5 text-sm text-neutral-500">No payment records.</div> : <div className="divide-y divide-neutral-100">{patient.payments.slice(0, 8).map((row) => <button key={row._id} type="button" onClick={() => navigate(`/admin/payments/${row._id}`)} className="flex w-full flex-col gap-2 px-5 py-4 text-left hover:bg-neutral-50 sm:flex-row sm:items-center sm:justify-between"><div><div className="font-semibold text-neutral-900">{row.invoiceNumber || row.program?.name || 'Payment'}</div><div className="mt-1 text-xs text-neutral-500">{dateTime(row.createdAt)} · {row.paymentMethod || 'method unavailable'}</div></div><div className="flex items-center gap-3"><span className="font-semibold text-neutral-900">{money(row.paidAmount)}</span><span className="text-xs font-semibold capitalize text-neutral-600">{row.status || '—'}</span><ExternalLink className="h-3.5 w-3.5 text-neutral-400" /></div></button>)}</div>}</section>

      <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white"><div className="border-b border-neutral-100 bg-neutral-50/60 px-5 py-4"><h2 className="text-sm font-bold text-neutral-950">Assessments</h2></div>{patient.assessments.length === 0 ? <div className="p-5 text-sm text-neutral-500">No assessment records.</div> : <div className="divide-y divide-neutral-100">{patient.assessments.slice(0, 8).map((row) => <div key={row._id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2 font-semibold text-neutral-900">{row.painCategory?.name || 'Assessment'} {row.hasRedFlag && <ShieldAlert className="h-4 w-4 text-rose-600" />}</div><div className="mt-1 text-xs text-neutral-500">{dateTime(row.createdAt)} · score {row.totalScore ?? '—'}</div></div><span className="text-xs font-semibold capitalize text-neutral-700">{row.status || row.riskLevel || '—'}</span></div>)}</div>}</section>
    </main>

      <aside className="space-y-4 xl:sticky xl:top-5">
        <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white"><div className="border-b border-neutral-100 bg-neutral-50/60 px-4 py-4"><h2 className="text-sm font-bold text-neutral-950">Account actions</h2><p className="mt-1 text-xs text-neutral-500">Status changes are audited and require a reason.</p></div><div className="space-y-2 p-4">{patient.status !== 'active' && <button type="button" onClick={() => openStatus('active')} className="flex w-full items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-left text-sm font-semibold text-emerald-800"><CircleCheckBig className="h-4 w-4" />Activate patient</button>}{patient.status !== 'inactive' && <button type="button" onClick={() => openStatus('inactive')} className="flex w-full items-center gap-3 rounded-xl border border-neutral-200 px-4 py-3 text-left text-sm font-semibold text-neutral-700 hover:bg-neutral-50"><Ban className="h-4 w-4" />Set inactive</button>}{patient.status !== 'blocked' && <button type="button" onClick={() => openStatus('blocked')} className="flex w-full items-center gap-3 rounded-xl border border-rose-200 px-4 py-3 text-left text-sm font-semibold text-rose-700 hover:bg-rose-50"><ShieldAlert className="h-4 w-4" />Block patient</button>}</div></section>

        <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white"><div className="border-b border-neutral-100 bg-neutral-50/60 px-4 py-4"><h2 className="text-sm font-bold text-neutral-950">Related workspaces</h2></div><div className="space-y-2 p-4">{patient.referringDoctor?._id && <button type="button" onClick={() => navigate(`/admin/doctors/${patient.referringDoctor?._id}`)} className="flex w-full items-center gap-3 rounded-xl border border-neutral-200 px-4 py-3 text-left text-sm font-semibold text-neutral-700 hover:bg-neutral-50"><Stethoscope className="h-4 w-4" />Open referring doctor <ExternalLink className="ml-auto h-3.5 w-3.5" /></button>}<button type="button" onClick={() => navigate('/admin/assessments')} className="flex w-full items-center gap-3 rounded-xl border border-neutral-200 px-4 py-3 text-left text-sm font-semibold text-neutral-700 hover:bg-neutral-50"><FileHeart className="h-4 w-4" />Open assessments <ExternalLink className="ml-auto h-3.5 w-3.5" /></button><button type="button" onClick={() => navigate('/admin/payments')} className="flex w-full items-center gap-3 rounded-xl border border-neutral-200 px-4 py-3 text-left text-sm font-semibold text-neutral-700 hover:bg-neutral-50"><WalletCards className="h-4 w-4" />Open payments <ExternalLink className="ml-auto h-3.5 w-3.5" /></button></div></section>

        <section className="rounded-xl border border-neutral-200 bg-white p-4"><div className="text-sm font-bold text-neutral-950">Referring doctor</div><div className="mt-3 text-sm font-semibold text-neutral-900">{patient.referringDoctor?.fullName || 'No referring doctor'}</div><div className="mt-1 text-xs text-neutral-500">{patient.referringDoctor?.clinicName || patient.referringDoctor?.doctorId || 'Direct acquisition'}</div></section>
      </aside>
    </div>

    {statusTarget && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={() => !statusMutation.isPending && setStatusTarget(null)}><div className="w-full max-w-lg rounded-2xl border border-neutral-200 bg-white shadow-xl" onMouseDown={(e) => e.stopPropagation()}><div className="border-b border-neutral-100 px-5 py-4"><h2 className="text-lg font-bold text-neutral-950">{statusTarget === 'blocked' ? 'Block patient' : statusTarget === 'active' ? 'Activate patient' : 'Set patient inactive'}</h2><p className="mt-1 text-sm text-neutral-500">This action changes account access and will be recorded in the audit log.</p></div><div className="p-5"><label className="text-sm font-semibold text-neutral-800">Reason</label><textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} placeholder="Explain why this status change is required" className="mt-2 w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-primary-500" />{actionError && <p className="mt-2 text-sm font-medium text-rose-600">{actionError}</p>}<div className="mt-5 flex justify-end gap-2"><button type="button" disabled={statusMutation.isPending} onClick={() => setStatusTarget(null)} className="rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-semibold text-neutral-700">Cancel</button><button type="button" disabled={statusMutation.isPending || !reason.trim()} onClick={() => statusMutation.mutate({ status: statusTarget, reason: reason.trim() })} className={cn('rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50', statusTarget === 'blocked' ? 'bg-rose-600' : 'bg-primary-700')}>{statusMutation.isPending ? 'Saving…' : 'Confirm status change'}</button></div></div></div></div>}
  </div>;
}
