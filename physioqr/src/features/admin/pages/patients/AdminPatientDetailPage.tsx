import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Ban, CircleCheckBig, ExternalLink, FileHeart, LockKeyhole, RefreshCw, ShieldAlert, Stethoscope, Trash2, UserRound, WalletCards } from 'lucide-react';
import apiClient from '@/lib/api-client';
import ErrorState from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';

type PatientStatus = 'active' | 'inactive' | 'blocked';
type PatientDetail = {
  _id: string; id: string; patientId?: string; fullName: string; mobile: string; whatsapp?: string; email?: string;
  age?: number; dateOfBirth?: string; gender?: string; address?: string; city?: string; state?: string; postalCode?: string;
  preferredLanguage?: string; emergencyContact?: string; mobileVerified?: boolean; consentAccepted?: boolean; consentVersion?: string;
  consentDate?: string; referralSource?: string; referralLocked?: boolean; directPatientFee?: number; directPatientFeeSetAt?: string;
  status: PatientStatus; createdAt?: string; updatedAt?: string;
  referringDoctor?: { _id?: string; doctorId?: string; fullName?: string; clinicName?: string; city?: string; state?: string; status?: string; revenueModel?: string; approvedPatientFee?: number };
  metrics: { programs: number; activePrograms: number; payments: number; successfulPayments: number; totalPaid: number; assessments: number; redFlags: number };
  programs: Array<{ _id: string; status?: string; startDate?: string; endDate?: string; program?: { programCode?: string; name?: string; durationDays?: number } }>;
  payments: Array<{ _id: string; status?: string; paidAmount?: number; invoiceNumber?: string; paymentMethod?: string; createdAt?: string; program?: { name?: string }; doctor?: { fullName?: string } }>;
  assessments: Array<{ _id: string; status?: string; totalScore?: number; riskLevel?: string; hasRedFlag?: boolean; createdAt?: string; painCategory?: { name?: string } }>;
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
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [feeDraft, setFeeDraft] = useState('');
  const [feeReason, setFeeReason] = useState('');

  const query = useQuery<PatientDetail>({ queryKey: ['admin-patient-detail', patientId], queryFn: () => apiClient.get(`/admin/patients/${patientId}`).then((response) => response.data), enabled: Boolean(patientId) });
  const patient = query.data;
  useEffect(() => { setFeeDraft(patient?.directPatientFee ? String(patient.directPatientFee) : ''); }, [patient?.directPatientFee]);

  const refreshPatient = async () => Promise.all([query.refetch(), queryClient.invalidateQueries({ queryKey: ['admin-patients'] })]);
  const statusMutation = useMutation({
    mutationFn: (payload: { status: PatientStatus; reason: string }) => apiClient.patch(`/admin/patients/${patientId}/status`, payload),
    onSuccess: async () => { setStatusTarget(null); setReason(''); setActionError(''); await refreshPatient(); },
    onError: (error: any) => setActionError(error?.response?.data?.message || 'Patient status could not be updated.'),
  });
  const feeMutation = useMutation({
    mutationFn: (payload: { fee: number; reason: string }) => apiClient.patch(`/admin/patients/${patientId}/direct-fee`, payload),
    onSuccess: async () => { setFeeReason(''); setActionError(''); await refreshPatient(); },
    onError: (error: any) => setActionError(error?.response?.data?.message || 'Patient fee could not be updated.'),
  });
  const deleteMutation = useMutation({
    mutationFn: (payload: { confirmation: string; reason: string }) => apiClient.delete(`/admin/patients/${patientId}`, { data: payload }),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['admin-patients'] }); navigate('/admin/patients', { replace: true }); },
    onError: (error: any) => setActionError(error?.response?.data?.message || 'Patient could not be deleted.'),
  });

  if (query.isLoading) return <div className="space-y-5"><Skeleton className="h-32 w-full" /><Skeleton className="h-28 w-full" /><Skeleton className="h-[460px] w-full" /></div>;
  if (query.isError || !patient) return <ErrorState title="Patient detail could not load" message="Check the patient record and admin API connection, then retry." onRetry={() => query.refetch()} />;

  const canDelete = patient.metrics.successfulPayments === 0 && !patient.referralLocked;
  const feeLocked = patient.metrics.successfulPayments > 0 || Boolean(patient.referralLocked);
  const isDirect = !patient.referringDoctor;
  const effectiveFee = isDirect ? patient.directPatientFee : patient.referringDoctor?.approvedPatientFee;
  const openStatus = (status: PatientStatus) => { setStatusTarget(status); setReason(''); setActionError(''); };
  const openDelete = () => { setDeleteOpen(true); setDeleteConfirmation(''); setDeleteReason(''); setActionError(''); };

  return <div className="mx-auto w-full max-w-[1500px] space-y-5">
    <header className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6"><div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between"><div className="flex min-w-0 items-start gap-4"><button type="button" onClick={() => navigate('/admin/patients')} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-neutral-200 text-neutral-600 hover:bg-neutral-50"><ArrowLeft className="h-5 w-5" /></button><div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-700"><UserRound className="h-7 w-7" /></div><div><div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-bold tracking-tight text-neutral-950 sm:text-3xl">{patient.fullName}</h1><StatusPill status={patient.status} /></div><p className="mt-1 text-sm text-neutral-600">{patient.patientId || patient._id} · {patient.mobile}</p><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500"><span>{patient.mobileVerified ? 'Mobile verified' : 'Mobile not verified'}</span><span>{isDirect ? 'Direct PhysioQR patient' : 'Doctor referral'}</span><span>Joined {dateTime(patient.createdAt)}</span></div></div></div><button type="button" onClick={() => query.refetch()} disabled={query.isFetching} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"><RefreshCw className={cn('h-4 w-4', query.isFetching && 'animate-spin')} />Refresh</button></div></header>

    {patient.referralLocked && <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><div className="flex items-start gap-3"><LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" /><div><div className="text-sm font-bold text-neutral-950">Commercial attribution is locked</div><p className="mt-1 text-sm leading-6 text-neutral-600">Verified payment has locked the fee/referral attribution. Commercial terms cannot be changed for this patient.</p></div></div></section>}

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Active programs" value={String(patient.metrics.activePrograms)} sub={`${patient.metrics.programs} total`} /><Metric label="Successful payments" value={String(patient.metrics.successfulPayments)} sub={`${patient.metrics.payments} payment records`} /><Metric label="Total paid" value={money(patient.metrics.totalPaid)} /><Metric label="Patient fee" value={effectiveFee ? money(effectiveFee) : 'Not set'} sub={isDirect ? 'Admin controlled' : 'Doctor controlled'} /></section>

    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_350px]"><main className="space-y-5">
      <Card title="Identity & contact"><Item label="Full name" value={patient.fullName} /><Item label="Patient ID" value={text(patient.patientId)} /><Item label="Mobile" value={patient.mobile} /><Item label="WhatsApp" value={text(patient.whatsapp)} /><Item label="Email" value={text(patient.email)} /><Item label="Emergency contact" value={text(patient.emergencyContact)} /><Item label="Gender" value={text(patient.gender)} /><Item label="Age" value={patient.age ?? '—'} /></Card>
      <Card title="Address & preferences"><Item label="Address" value={text(patient.address)} /><Item label="Location" value={[patient.city, patient.state].filter(Boolean).join(', ') || '—'} /><Item label="Postal code" value={text(patient.postalCode)} /><Item label="Preferred language" value={text(patient.preferredLanguage)} /></Card>
      <Card title="Referral, consent & fee authority"><Item label="Referral source" value={text(patient.referralSource)} /><Item label="Fee authority" value={isDirect ? 'Admin' : 'Doctor'} /><Item label="Patient fee" value={effectiveFee ? money(effectiveFee) : 'Not set'} /><Item label="Commercial lock" value={feeLocked ? 'Locked' : 'Editable before payment'} /><Item label="Mobile verified" value={patient.mobileVerified ? 'Yes' : 'No'} /><Item label="Consent accepted" value={patient.consentAccepted ? 'Yes' : 'No'} /></Card>

      <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white"><SectionTitle>Programs</SectionTitle>{patient.programs.length === 0 ? <Empty text="No programs assigned." /> : <div className="divide-y divide-neutral-100">{patient.programs.slice(0, 10).map((row) => <div key={row._id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="font-semibold text-neutral-900">{row.program?.name || 'Program'}</div><div className="mt-1 text-xs text-neutral-500">{row.program?.programCode || '—'} · started {dateTime(row.startDate)}</div></div><span className="text-xs font-semibold capitalize text-neutral-700">{row.status || '—'}</span></div>)}</div>}</section>
      <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white"><SectionTitle>Payments</SectionTitle>{patient.payments.length === 0 ? <Empty text="No payment records." /> : <div className="divide-y divide-neutral-100">{patient.payments.slice(0, 8).map((row) => <button key={row._id} type="button" onClick={() => navigate(`/admin/payments/${row._id}`)} className="flex w-full flex-col gap-2 px-5 py-4 text-left hover:bg-neutral-50 sm:flex-row sm:items-center sm:justify-between"><div><div className="font-semibold text-neutral-900">{row.invoiceNumber || row.program?.name || 'Payment'}</div><div className="mt-1 text-xs text-neutral-500">{dateTime(row.createdAt)} · {row.paymentMethod || 'method unavailable'}</div></div><div className="flex items-center gap-3"><span className="font-semibold text-neutral-900">{money(row.paidAmount)}</span><span className="text-xs font-semibold capitalize text-neutral-600">{row.status || '—'}</span><ExternalLink className="h-3.5 w-3.5 text-neutral-400" /></div></button>)}</div>}</section>
      <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white"><SectionTitle>Assessments</SectionTitle>{patient.assessments.length === 0 ? <Empty text="No assessment records." /> : <div className="divide-y divide-neutral-100">{patient.assessments.slice(0, 8).map((row) => <div key={row._id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2 font-semibold text-neutral-900">{row.painCategory?.name || 'Assessment'} {row.hasRedFlag && <ShieldAlert className="h-4 w-4 text-rose-600" />}</div><div className="mt-1 text-xs text-neutral-500">{dateTime(row.createdAt)}</div></div><span className="text-xs font-semibold capitalize text-neutral-700">{row.status || row.riskLevel || '—'}</span></div>)}</div>}</section>
    </main>

      <aside className="space-y-4 xl:sticky xl:top-5">
        <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white"><SectionTitle>Patient fee</SectionTitle><div className="space-y-3 p-4">{isDirect ? <>{feeLocked ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"><strong>{effectiveFee ? money(effectiveFee) : 'Fee'}</strong> is locked after verified payment.</div> : <><p className="text-xs leading-5 text-neutral-500">Direct patient fee is decided by Admin. It covers the clinically approved programme bundle; programmes do not have individual prices.</p><label className="block"><span className="text-xs font-semibold text-neutral-600">Patient fee (₹)</span><input type="number" min="1" value={feeDraft} onChange={(event) => setFeeDraft(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-neutral-300 px-3 text-sm" /></label><label className="block"><span className="text-xs font-semibold text-neutral-600">Reason *</span><textarea rows={2} value={feeReason} onChange={(event) => setFeeReason(event.target.value)} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm" placeholder="Why this patient fee is being set" /></label>{actionError && <p className="text-xs font-medium text-rose-600">{actionError}</p>}<button type="button" disabled={feeMutation.isPending || !(Number(feeDraft) > 0) || !feeReason.trim()} onClick={() => feeMutation.mutate({ fee: Number(feeDraft), reason: feeReason.trim() })} className="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{feeMutation.isPending ? 'Saving…' : 'Save patient fee'}</button></>}</> : <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-800">Fee is controlled by <strong>{patient.referringDoctor?.fullName || 'the referring Doctor'}</strong>. Admin does not price the programme.</div>}</div></section>

        <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white"><SectionTitle>Account actions</SectionTitle><div className="space-y-2 p-4">{patient.status !== 'active' && <Action onClick={() => openStatus('active')} className="border-emerald-200 bg-emerald-50 text-emerald-800"><CircleCheckBig className="h-4 w-4" />Activate patient</Action>}{patient.status !== 'inactive' && <Action onClick={() => openStatus('inactive')}><Ban className="h-4 w-4" />Set inactive</Action>}{patient.status !== 'blocked' && <Action onClick={() => openStatus('blocked')} className="border-rose-200 text-rose-700"><ShieldAlert className="h-4 w-4" />Block patient</Action>}{canDelete ? <Action onClick={openDelete} className="border-rose-200 bg-rose-50 text-rose-700"><Trash2 className="h-4 w-4" />Delete patient permanently</Action> : <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs leading-5 text-amber-800">Permanent deletion is disabled because this patient has financial or locked attribution history.</div>}</div></section>

        <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white"><SectionTitle>Related workspaces</SectionTitle><div className="space-y-2 p-4">{patient.referringDoctor?._id && <Action onClick={() => navigate(`/admin/doctors/${patient.referringDoctor?._id}`)}><Stethoscope className="h-4 w-4" />Open referring doctor <ExternalLink className="ml-auto h-3.5 w-3.5" /></Action>}<Action onClick={() => navigate('/admin/assessments')}><FileHeart className="h-4 w-4" />Open assessments <ExternalLink className="ml-auto h-3.5 w-3.5" /></Action><Action onClick={() => navigate('/admin/payments')}><WalletCards className="h-4 w-4" />Open payments <ExternalLink className="ml-auto h-3.5 w-3.5" /></Action></div></section>
      </aside>
    </div>

    {statusTarget && <ModalShell onClose={() => !statusMutation.isPending && setStatusTarget(null)}><h2 className="text-lg font-bold text-neutral-950">{statusTarget === 'blocked' ? 'Block patient' : statusTarget === 'active' ? 'Activate patient' : 'Set patient inactive'}</h2><p className="mt-1 text-sm text-neutral-500">This action changes account access and is audited.</p><textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} placeholder="Reason" className="mt-4 w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm" />{actionError && <p className="mt-2 text-sm text-rose-600">{actionError}</p>}<div className="mt-5 flex justify-end gap-2"><button onClick={() => setStatusTarget(null)} className="rounded-lg border px-4 py-2.5 text-sm font-semibold">Cancel</button><button disabled={statusMutation.isPending || !reason.trim()} onClick={() => statusMutation.mutate({ status: statusTarget, reason: reason.trim() })} className="rounded-lg bg-primary-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Confirm</button></div></ModalShell>}
    {deleteOpen && <ModalShell onClose={() => !deleteMutation.isPending && setDeleteOpen(false)}><h2 className="text-lg font-bold text-rose-700">Delete patient permanently</h2><p className="mt-2 text-sm text-neutral-600">This removes the unpaid patient account and linked onboarding data. This cannot be undone.</p><textarea value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} rows={3} placeholder="Deletion reason" className="mt-4 w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm" /><label className="mt-4 block text-sm font-semibold">Type {patient.mobile} to confirm<input value={deleteConfirmation} onChange={(e) => setDeleteConfirmation(e.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-neutral-300 px-3 text-sm" /></label><div className="mt-5 flex justify-end gap-2"><button onClick={() => setDeleteOpen(false)} className="rounded-lg border px-4 py-2.5 text-sm font-semibold">Cancel</button><button disabled={deleteMutation.isPending || !deleteReason.trim() || deleteConfirmation.trim() !== patient.mobile.trim()} onClick={() => deleteMutation.mutate({ confirmation: deleteConfirmation.trim(), reason: deleteReason.trim() })} className="rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40">Delete permanently</button></div></ModalShell>}
  </div>;
}

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) { return <div className="rounded-xl border border-neutral-200 bg-white p-4"><div className="text-xs text-neutral-500">{label}</div><div className="mt-2 text-2xl font-bold text-neutral-950">{value}</div>{sub && <div className="mt-1 text-xs text-neutral-400">{sub}</div>}</div>; }
function SectionTitle({ children }: { children: React.ReactNode }) { return <div className="border-b border-neutral-100 bg-neutral-50/60 px-5 py-4"><h2 className="text-sm font-bold text-neutral-950">{children}</h2></div>; }
function Empty({ text: value }: { text: string }) { return <div className="p-5 text-sm text-neutral-500">{value}</div>; }
function Action({ onClick, className, children }: { onClick: () => void; className?: string; children: React.ReactNode }) { return <button type="button" onClick={onClick} className={cn('flex w-full items-center gap-3 rounded-xl border border-neutral-200 px-4 py-3 text-left text-sm font-semibold text-neutral-700 hover:bg-neutral-50', className)}>{children}</button>; }
function ModalShell({ onClose, children }: { onClose: () => void; children: React.ReactNode }) { return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={onClose}><div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl" onMouseDown={(event) => event.stopPropagation()}>{children}</div></div>; }
