import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Banknote,
  CheckCircle2,
  CircleDollarSign,
  FileWarning,
  Landmark,
  MapPin,
  QrCode,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Stethoscope,
  UserRoundCheck,
  Users,
  Wallet,
  XCircle,
} from 'lucide-react';
import apiClient from '@/lib/api-client';
import ErrorState from '@/components/feedback/ErrorState';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';

type DoctorStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'documents_required'
  | 'approved'
  | 'rejected'
  | 'suspended'
  | 'inactive';

type KycStatus = 'pending' | 'submitted' | 'approved' | 'rejected';

type DoctorDetail = {
  _id: string;
  id?: string;
  doctorId?: string;
  fullName: string;
  mobile: string;
  whatsapp?: string;
  email?: string;
  gender?: string;
  dateOfBirth?: string;
  qualification?: string;
  specialization?: string;
  medicalRegNumber?: string;
  registrationCouncil?: string;
  yearsOfExperience?: number;
  languagesSpoken?: string[];
  consultationFee?: number;
  clinicName?: string;
  clinicAddress?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  clinicContact?: string;
  clinicEmail?: string;
  clinicWorkingHours?: string;
  googleMapsLink?: string;
  clinicBranches?: number;
  registrationDate?: string;
  approvalDate?: string;
  requestedPatientFee?: number;
  approvedPatientFee?: number;
  revenueModel?: 'split' | 'platform_fee';
  feeSharePercentage?: number;
  feeShareType?: 'percentage' | 'fixed' | 'slab';
  fixedFeeShareAmount?: number;
  feeShareHoldingDays?: number;
  minWithdrawal?: number;
  maxWithdrawal?: number;
  payoutCycle?: string;
  status: DoctorStatus;
  rejectionReason?: string;
  suspensionReason?: string;
  referralCode?: string;
  qrCodeUrl?: string;
  qrCodeActive?: boolean;
  kycStatus?: KycStatus;
  panNumber?: string;
  bankAccountHolder?: string;
  bankAccountNumber?: string;
  bankName?: string;
  branchName?: string;
  ifscCode?: string;
  upiId?: string;
  bankVerified?: boolean;
  kycDocuments?: Array<{
    _id: string;
    documentType: string;
    originalName?: string;
    uploadedAt?: string;
  }>;
  agent?: {
    _id?: string;
    agentId?: string;
    fullName?: string;
    assignedRegion?: string;
    mobile?: string;
  };
  metrics?: {
    qrScans?: number;
    patients?: number;
    paidPatients?: number;
    revenueGenerated?: number;
    feeShareGenerated?: number;
  };
  wallet?: {
    availableBalance?: number;
    pendingBalance?: number;
    totalEarned?: number;
    totalWithdrawn?: number;
  } | null;
  createdAt?: string;
  updatedAt?: string;
};

type ActionType =
  | 'approve'
  | 'request-documents'
  | 'reject'
  | 'suspend'
  | 'reactivate-doctor'
  | 'kyc-bank'
  | 'generate-qr'
  | 'disable-qr'
  | 'reactivate-qr';

const money = (value?: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value ?? 0);

const dateText = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const text = (value?: string | number | null, fallback = '—') => {
  if (value === undefined || value === null || String(value).trim() === '') return fallback;
  return String(value);
};

const humanize = (value?: string) => text(value, '—').replace(/_/g, ' ').replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

const maskSensitive = (value?: string) => {
  if (!value) return '—';
  if (value.length <= 4) return '••••';
  return `${'•'.repeat(Math.min(8, value.length - 4))}${value.slice(-4)}`;
};

function StatusPill({ status }: { status: DoctorStatus }) {
  const tone: Record<DoctorStatus, string> = {
    approved: 'bg-emerald-50 text-emerald-700 ring-emerald-600/10',
    submitted: 'bg-amber-50 text-amber-700 ring-amber-600/10',
    under_review: 'bg-sky-50 text-sky-700 ring-sky-600/10',
    documents_required: 'bg-orange-50 text-orange-700 ring-orange-600/10',
    rejected: 'bg-rose-50 text-rose-700 ring-rose-600/10',
    suspended: 'bg-rose-50 text-rose-700 ring-rose-600/10',
    inactive: 'bg-neutral-100 text-neutral-700 ring-neutral-600/10',
    draft: 'bg-neutral-100 text-neutral-700 ring-neutral-600/10',
  };

  return (
    <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset', tone[status])}>
      {humanize(status)}
    </span>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <div className="border-b border-neutral-100 bg-neutral-50/60 px-5 py-4">
        <h2 className="text-sm font-bold text-neutral-950">{title}</h2>
      </div>
      <div className="grid gap-x-6 gap-y-4 p-5 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">{label}</div>
      <div className="mt-1 break-words text-sm font-semibold text-neutral-900">{value}</div>
    </div>
  );
}

export default function AdminDoctorDetailPage() {
  const { doctorId = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [action, setAction] = useState<ActionType | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  const query = useQuery<DoctorDetail>({
    queryKey: ['admin-doctor-detail', doctorId],
    queryFn: () => apiClient.get(`/admin/doctors/${doctorId}`).then((response) => response.data),
    enabled: Boolean(doctorId),
  });

  const doctor = query.data;

  const mutation = useMutation({
    mutationFn: async (form: FormData) => {
      if (!doctor || !action) return;
      const id = doctor._id;
      const reason = String(form.get('reason') || '').trim();

      if (action === 'approve') {
        return apiClient.post(`/doctors/${id}/approve`, {
          approvedPatientFee: Number(form.get('approvedPatientFee') || doctor.approvedPatientFee || doctor.requestedPatientFee || 0),
          feeSharePercentage: Number(form.get('feeSharePercentage') || doctor.feeSharePercentage || 0),
          feeShareHoldingDays: Number(form.get('feeShareHoldingDays') || doctor.feeShareHoldingDays || 15),
          revenueModel: String(form.get('revenueModel') || doctor.revenueModel || 'split'),
          feeShareType: String(form.get('feeShareType') || doctor.feeShareType || 'percentage'),
          fixedFeeShareAmount: Number(form.get('fixedFeeShareAmount') || doctor.fixedFeeShareAmount || 0),
        });
      }
      if (action === 'request-documents') return apiClient.post(`/doctors/${id}/request-documents`, { reason });
      if (action === 'reject') return apiClient.post(`/doctors/${id}/reject`, { reason });
      if (action === 'suspend') return apiClient.post(`/doctors/${id}/suspend`, { reason });
      if (action === 'reactivate-doctor') return apiClient.post(`/doctors/${id}/reactivate`, { reason });
      if (action === 'generate-qr') return apiClient.post(`/doctors/${id}/qr-code`);
      if (action === 'disable-qr') return apiClient.post(`/doctors/${id}/disable-qr`);
      if (action === 'reactivate-qr') return apiClient.post(`/doctors/${id}/reactivate-qr`);
      if (action === 'kyc-bank') {
        const bankAccountNumber = String(form.get('bankAccountNumber') || '').trim();
        return apiClient.patch(`/doctors/${id}/kyc-bank`, {
          kycStatus: form.get('kycStatus'),
          bankVerified: form.get('bankVerified') === 'true',
          bankAccountHolder: form.get('bankAccountHolder'),
          bankName: form.get('bankName'),
          branchName: form.get('branchName'),
          ifscCode: form.get('ifscCode'),
          upiId: form.get('upiId'),
          ...(bankAccountNumber ? { bankAccountNumber } : {}),
        });
      }
    },
    onSuccess: async () => {
      const message = action === 'approve'
        ? 'Doctor approved. Login, wallet and referral QR are now enabled.'
        : action === 'suspend'
          ? 'Doctor suspended. Portal access and QR referrals are disabled.'
          : action === 'reactivate-doctor'
            ? 'Doctor reactivated successfully.'
            : 'Doctor record updated successfully.';
      setSuccessMessage(message);
      setAction(null);
      await queryClient.invalidateQueries({ queryKey: ['admin-doctor-detail', doctorId] });
      await queryClient.invalidateQueries({ queryKey: ['admin-doctors'] });
    },
  });

  const metrics = useMemo(() => {
    if (!doctor) return [];
    return [
      { label: 'QR scans', value: doctor.metrics?.qrScans ?? 0, icon: QrCode },
      { label: 'Patients', value: doctor.metrics?.patients ?? 0, icon: Users },
      { label: 'Paid patients', value: doctor.metrics?.paidPatients ?? 0, icon: UserRoundCheck },
      { label: 'Revenue generated', value: money(doctor.metrics?.revenueGenerated), icon: CircleDollarSign },
      { label: 'Doctor fee share', value: money(doctor.metrics?.feeShareGenerated), icon: Banknote },
      { label: 'Wallet available', value: money(doctor.wallet?.availableBalance), icon: Wallet },
    ];
  }, [doctor]);

  if (query.isLoading) {
    return <div className="space-y-5"><Skeleton className="h-36 w-full" /><div className="grid gap-4 md:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-24 w-full" />)}</div><Skeleton className="h-[480px] w-full" /></div>;
  }

  if (query.isError || !doctor) {
    return <ErrorState title="Doctor detail could not load" message="Check the backend API, admin session, and whether this doctor record still exists." onRetry={() => query.refetch()} />;
  }

  const canReview = ['submitted', 'under_review', 'documents_required'].includes(doctor.status);
  const canSuspend = doctor.status === 'approved';
  const canReactivate = doctor.status === 'suspended';
  const canOperateQr = doctor.status === 'approved';
  const location = [doctor.city, doctor.state].filter(Boolean).join(', ') || 'Location not provided';

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5">
      <header className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <button type="button" onClick={() => navigate('/admin/doctors')} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-neutral-200 text-neutral-600 hover:bg-neutral-50" aria-label="Back to doctors">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-700"><Stethoscope className="h-7 w-7" /></div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-bold tracking-tight text-neutral-950 sm:text-3xl">{doctor.fullName}</h1><StatusPill status={doctor.status} /></div>
              <p className="mt-1 text-sm text-neutral-600">{text(doctor.specialization, 'Specialization not provided')} · {text(doctor.clinicName, 'Clinic not assigned')}</p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500"><span>{text(doctor.doctorId, doctor._id)}</span><span>{doctor.mobile}</span><span>{text(doctor.email, 'No email')}</span><span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{location}</span></div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => query.refetch()} disabled={query.isFetching} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"><RefreshCw className={cn('h-4 w-4', query.isFetching && 'animate-spin')} />Refresh</button>
          </div>
        </div>
      </header>

      {successMessage && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{successMessage}</div>}

      {(doctor.status === 'documents_required' || doctor.status === 'rejected' || doctor.status === 'suspended') && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <div className="font-semibold">Attention required</div>
          <div className="mt-1">{doctor.status === 'documents_required' ? 'Additional documents have been requested from this doctor.' : doctor.status === 'rejected' ? text(doctor.rejectionReason, 'This doctor application was rejected.') : text(doctor.suspensionReason, 'This doctor account is suspended.')}</div>
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {metrics.map((metric) => <div key={metric.label} className="rounded-xl border border-neutral-200 bg-white p-4"><div className="flex items-center justify-between gap-3"><div><div className="text-xs font-medium text-neutral-500">{metric.label}</div><div className="mt-2 text-xl font-bold text-neutral-950">{metric.value}</div></div><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-50 text-neutral-600"><metric.icon className="h-4.5 w-4.5" /></div></div></div>)}
      </section>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <main className="space-y-5">
          <InfoCard title="Professional profile">
            <InfoItem label="Qualification" value={text(doctor.qualification)} />
            <InfoItem label="Specialization" value={text(doctor.specialization)} />
            <InfoItem label="Medical registration" value={text(doctor.medicalRegNumber)} />
            <InfoItem label="Registration council" value={text(doctor.registrationCouncil)} />
            <InfoItem label="Experience" value={doctor.yearsOfExperience !== undefined ? `${doctor.yearsOfExperience} years` : '—'} />
            <InfoItem label="Languages" value={doctor.languagesSpoken?.length ? doctor.languagesSpoken.join(', ') : '—'} />
          </InfoCard>

          <InfoCard title="Clinic & contact">
            <InfoItem label="Clinic" value={text(doctor.clinicName)} />
            <InfoItem label="Clinic contact" value={text(doctor.clinicContact)} />
            <InfoItem label="Address" value={text(doctor.clinicAddress)} />
            <InfoItem label="City / State" value={location} />
            <InfoItem label="Working hours" value={text(doctor.clinicWorkingHours)} />
            <InfoItem label="Assigned agent" value={doctor.agent?.fullName ? `${doctor.agent.fullName}${doctor.agent.agentId ? ` (${doctor.agent.agentId})` : ''}` : 'Unassigned'} />
          </InfoCard>

          <div className="grid gap-5 lg:grid-cols-2">
            <InfoCard title="KYC & bank verification">
              <InfoItem label="KYC status" value={humanize(doctor.kycStatus)} />
              <InfoItem label="Bank verified" value={doctor.bankVerified ? 'Yes' : 'No'} />
              <InfoItem label="Account holder" value={text(doctor.bankAccountHolder)} />
              <InfoItem label="Account number" value={maskSensitive(doctor.bankAccountNumber)} />
              <InfoItem label="Bank" value={text(doctor.bankName)} />
              <InfoItem label="IFSC" value={text(doctor.ifscCode)} />
            </InfoCard>

            <InfoCard title="Commercial configuration">
              <InfoItem label="Revenue model" value={humanize(doctor.revenueModel)} />
              <InfoItem label="Approved patient fee" value={money(doctor.approvedPatientFee)} />
              <InfoItem label="Requested patient fee" value={money(doctor.requestedPatientFee)} />
              <InfoItem label="Fee share" value={doctor.feeShareType === 'fixed' ? money(doctor.fixedFeeShareAmount) : doctor.feeSharePercentage !== undefined ? `${doctor.feeSharePercentage}%` : '—'} />
              <InfoItem label="Holding period" value={doctor.feeShareHoldingDays !== undefined ? `${doctor.feeShareHoldingDays} days` : '—'} />
              <InfoItem label="Payout cycle" value={text(doctor.payoutCycle)} />
            </InfoCard>
          </div>

          <InfoCard title="Referral QR & record timeline">
            <InfoItem label="Referral code" value={text(doctor.referralCode)} />
            <InfoItem label="QR status" value={doctor.qrCodeActive ? 'Active' : 'Inactive'} />
            <InfoItem label="Registered" value={dateText(doctor.registrationDate || doctor.createdAt)} />
            <InfoItem label="Approved" value={dateText(doctor.approvalDate)} />
            <InfoItem label="Last updated" value={dateText(doctor.updatedAt)} />
            <InfoItem label="KYC documents" value={`${doctor.kycDocuments?.length ?? 0} uploaded`} />
          </InfoCard>
        </main>

        <aside className="space-y-4 xl:sticky xl:top-5">
          <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
            <div className="border-b border-neutral-100 bg-neutral-50/60 px-4 py-4"><h2 className="text-sm font-bold text-neutral-950">Review actions</h2><p className="mt-1 text-xs text-neutral-500">Only actions valid for the doctor’s current backend state are shown.</p></div>
            <div className="space-y-2 p-4">
              {canReview && <button type="button" onClick={() => setAction('approve')} className="flex w-full items-center gap-3 rounded-xl bg-primary-600 px-4 py-3 text-left text-sm font-semibold text-white hover:bg-primary-700"><CheckCircle2 className="h-4 w-4" />Approve doctor</button>}
              {canReactivate && <button type="button" onClick={() => setAction('reactivate-doctor')} className="flex w-full items-center gap-3 rounded-xl bg-primary-600 px-4 py-3 text-left text-sm font-semibold text-white hover:bg-primary-700"><RotateCcw className="h-4 w-4" />Reactivate doctor</button>}
              <button type="button" onClick={() => setAction('kyc-bank')} className="flex w-full items-center gap-3 rounded-xl border border-neutral-200 px-4 py-3 text-left text-sm font-semibold text-neutral-700 hover:bg-neutral-50"><Landmark className="h-4 w-4" />Update KYC / bank</button>
              {canReview && <button type="button" onClick={() => setAction('request-documents')} className="flex w-full items-center gap-3 rounded-xl border border-neutral-200 px-4 py-3 text-left text-sm font-semibold text-neutral-700 hover:bg-neutral-50"><FileWarning className="h-4 w-4" />Request documents</button>}
              {canOperateQr && <button type="button" onClick={() => setAction(doctor.qrCodeActive ? 'disable-qr' : doctor.qrCodeUrl ? 'reactivate-qr' : 'generate-qr')} className="flex w-full items-center gap-3 rounded-xl border border-neutral-200 px-4 py-3 text-left text-sm font-semibold text-neutral-700 hover:bg-neutral-50"><QrCode className="h-4 w-4" />{doctor.qrCodeActive ? 'Disable QR' : doctor.qrCodeUrl ? 'Reactivate QR' : 'Generate QR'}</button>}
            </div>
            {(canReview || canSuspend) && <div className="border-t border-neutral-100 p-4"><div className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-rose-400">Danger zone</div><div className="space-y-2">{canReview && <button type="button" onClick={() => setAction('reject')} className="flex w-full items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-left text-sm font-semibold text-rose-700"><XCircle className="h-4 w-4" />Reject application</button>}{canSuspend && <button type="button" onClick={() => setAction('suspend')} className="flex w-full items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-left text-sm font-semibold text-rose-700"><XCircle className="h-4 w-4" />Suspend doctor</button>}</div></div>}
          </section>

          <section className="rounded-xl border border-neutral-200 bg-white p-4">
            <div className="flex items-center gap-2 text-sm font-bold text-neutral-950"><ShieldCheck className="h-4 w-4 text-primary-700" />Decision checklist</div>
            <div className="mt-4 space-y-3 text-sm">
              {[['KYC', humanize(doctor.kycStatus)], ['Bank', doctor.bankVerified ? 'Verified' : 'Not verified'], ['Medical registration', doctor.medicalRegNumber ? 'Provided' : 'Missing'], ['Agent', doctor.agent?.fullName || 'Unassigned'], ['Documents', `${doctor.kycDocuments?.length ?? 0} uploaded`]].map(([label, value]) => <div key={label} className="flex items-center justify-between gap-3"><span className="text-neutral-500">{label}</span><span className="text-right font-semibold text-neutral-900">{value}</span></div>)}
            </div>
          </section>
        </aside>
      </div>

      <Modal isOpen={Boolean(action)} onClose={() => !mutation.isPending && setAction(null)} title={action ? humanize(action) : undefined} size="lg">
        <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); mutation.mutate(new FormData(event.currentTarget)); }}>
          {action === 'approve' && <><div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">Approval creates/enables the doctor login, creates the wallet and automatically generates an active referral QR on the backend.</div><div className="grid gap-4 sm:grid-cols-2"><Field name="approvedPatientFee" label="Approved patient fee" type="number" defaultValue={doctor.approvedPatientFee ?? doctor.requestedPatientFee ?? 0} /><Field name="feeSharePercentage" label="Fee share %" type="number" defaultValue={doctor.feeSharePercentage ?? 0} /><Field name="feeShareHoldingDays" label="Holding days" type="number" defaultValue={doctor.feeShareHoldingDays ?? 15} /><SelectField name="revenueModel" label="Revenue model" defaultValue={doctor.revenueModel ?? 'split'} options={[['split', 'Split'], ['platform_fee', 'Platform fee']]} /><SelectField name="feeShareType" label="Fee share type" defaultValue={doctor.feeShareType ?? 'percentage'} options={[['percentage', 'Percentage'], ['fixed', 'Fixed'], ['slab', 'Slab']]} /><Field name="fixedFeeShareAmount" label="Fixed share amount" type="number" defaultValue={doctor.fixedFeeShareAmount ?? 0} /></div></>}
          {action === 'kyc-bank' && <div className="grid gap-4 sm:grid-cols-2"><SelectField name="kycStatus" label="KYC status" defaultValue={doctor.kycStatus ?? 'pending'} options={[['pending', 'Pending'], ['submitted', 'Submitted'], ['approved', 'Approved'], ['rejected', 'Rejected']]} /><SelectField name="bankVerified" label="Bank verified" defaultValue={doctor.bankVerified ? 'true' : 'false'} options={[['false', 'No'], ['true', 'Yes']]} /><Field name="bankAccountHolder" label="Account holder" defaultValue={doctor.bankAccountHolder ?? ''} /><Field name="bankName" label="Bank name" defaultValue={doctor.bankName ?? ''} /><Field name="branchName" label="Branch" defaultValue={doctor.branchName ?? ''} /><Field name="ifscCode" label="IFSC" defaultValue={doctor.ifscCode ?? ''} /><Field name="upiId" label="UPI ID" defaultValue={doctor.upiId ?? ''} /><Field name="bankAccountNumber" label="Replace account number" placeholder="Leave blank to keep current" /></div>}
          {['request-documents', 'reject', 'suspend', 'reactivate-doctor'].includes(action ?? '') && <label className="block"><span className="text-sm font-semibold text-neutral-700">Reason / admin note <span className="text-rose-500">*</span></span><textarea name="reason" required className="mt-2 min-h-28 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100" placeholder="Enter a clear reason for the audit trail" /></label>}
          {action === 'reactivate-doctor' && <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">Reactivation restores the doctor to <strong>Approved</strong>, enables portal login, and re-enables the existing referral QR when one already exists.</div>}
          {['generate-qr', 'disable-qr', 'reactivate-qr'].includes(action ?? '') && <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">This action will update referral QR availability for <strong>{doctor.fullName}</strong>.</div>}
          {mutation.isError && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{(mutation.error as any)?.response?.data?.message || 'The backend could not complete this action.'}</div>}
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setAction(null)} disabled={mutation.isPending} className="rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-semibold text-neutral-700">Cancel</button><button type="submit" disabled={mutation.isPending} className={cn('rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60', ['reject', 'suspend', 'disable-qr'].includes(action ?? '') ? 'bg-rose-600 hover:bg-rose-700' : 'bg-primary-600 hover:bg-primary-700')}>{mutation.isPending ? 'Processing…' : 'Confirm action'}</button></div>
        </form>
      </Modal>
    </div>
  );
}

function Field({ name, label, type = 'text', defaultValue, placeholder }: { name: string; label: string; type?: string; defaultValue?: string | number; placeholder?: string }) {
  return <label className="block"><span className="text-sm font-semibold text-neutral-700">{label}</span><input name={name} type={type} defaultValue={defaultValue} placeholder={placeholder} className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100" /></label>;
}

function SelectField({ name, label, defaultValue, options }: { name: string; label: string; defaultValue: string; options: Array<[string, string]> }) {
  return <label className="block"><span className="text-sm font-semibold text-neutral-700">{label}</span><select name={name} defaultValue={defaultValue} className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100">{options.map(([value, optionLabel]) => <option key={value} value={value}>{optionLabel}</option>)}</select></label>;
}
