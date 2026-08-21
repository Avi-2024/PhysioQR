import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Building2, ExternalLink, MapPin, Pencil, QrCode, RefreshCw, Stethoscope, UserRoundCheck, Users } from 'lucide-react';
import apiClient from '@/lib/api-client';
import ErrorState from '@/components/feedback/ErrorState';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';

type DoctorStatus = 'draft' | 'submitted' | 'under_review' | 'documents_required' | 'approved' | 'rejected' | 'suspended' | 'inactive';

type ClinicDetail = {
  _id: string;
  id: string;
  clinicId: string;
  doctorId?: string;
  fullName: string;
  mobile?: string;
  email?: string;
  specialization?: string;
  qualification?: string;
  clinicName: string;
  clinicAddress?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  clinicContact?: string;
  clinicEmail?: string;
  clinicWorkingHours?: string;
  googleMapsLink?: string;
  clinicBranches?: number;
  status: DoctorStatus;
  qrCodeActive?: boolean;
  referralCode?: string;
  agent?: { agentId?: string; fullName?: string; assignedRegion?: string; mobile?: string; city?: string; state?: string };
  metrics?: { qrScans?: number; patients?: number; paidPatients?: number; revenueGenerated?: number };
  createdAt?: string;
  updatedAt?: string;
};

const money = (value?: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value ?? 0);
const text = (value?: string | number | null, fallback = '—') => value === undefined || value === null || String(value).trim() === '' ? fallback : String(value);
const dateText = (value?: string) => value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

function StatusPill({ status }: { status: DoctorStatus }) {
  const tone: Record<DoctorStatus, string> = {
    approved: 'bg-emerald-50 text-emerald-700', submitted: 'bg-amber-50 text-amber-700', under_review: 'bg-sky-50 text-sky-700', documents_required: 'bg-orange-50 text-orange-700', rejected: 'bg-rose-50 text-rose-700', suspended: 'bg-rose-50 text-rose-700', inactive: 'bg-neutral-100 text-neutral-700', draft: 'bg-neutral-100 text-neutral-700',
  };
  return <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize', tone[status])}>{status.replace(/_/g, ' ')}</span>;
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white"><div className="border-b border-neutral-100 bg-neutral-50/60 px-5 py-4"><h2 className="text-sm font-bold text-neutral-950">{title}</h2></div><div className="grid gap-x-6 gap-y-4 p-5 sm:grid-cols-2">{children}</div></section>;
}

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return <div><div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">{label}</div><div className="mt-1 break-words text-sm font-semibold text-neutral-900">{value}</div></div>;
}

export default function AdminClinicDetailPage() {
  const { clinicId = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [success, setSuccess] = useState('');

  const query = useQuery<ClinicDetail>({
    queryKey: ['admin-clinic-detail', clinicId],
    queryFn: () => apiClient.get(`/admin/clinics/${clinicId}`).then((response) => response.data),
    enabled: Boolean(clinicId),
  });

  const clinic = query.data;
  const mutation = useMutation({
    mutationFn: async (form: FormData) => {
      if (!clinic) return;
      return apiClient.patch(`/admin/clinics/${clinic.clinicId}`, {
        clinicName: form.get('clinicName'),
        clinicAddress: form.get('clinicAddress'),
        city: form.get('city'),
        state: form.get('state'),
        postalCode: form.get('postalCode'),
        clinicContact: form.get('clinicContact'),
        clinicEmail: form.get('clinicEmail'),
        clinicWorkingHours: form.get('clinicWorkingHours'),
        googleMapsLink: form.get('googleMapsLink'),
        clinicBranches: Number(form.get('clinicBranches') || 1),
      });
    },
    onSuccess: async () => {
      setIsEditOpen(false);
      setSuccess('Clinic profile updated successfully.');
      await queryClient.invalidateQueries({ queryKey: ['admin-clinic-detail', clinicId] });
      await queryClient.invalidateQueries({ queryKey: ['admin-clinics'] });
    },
  });

  if (query.isLoading) return <div className="space-y-5"><Skeleton className="h-36 w-full" /><div className="grid gap-3 md:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-24 w-full" />)}</div><Skeleton className="h-[420px] w-full" /></div>;
  if (query.isError || !clinic) return <ErrorState title="Clinic detail could not load" message="Check the admin API connection and whether this clinic profile still exists." onRetry={() => query.refetch()} />;

  const location = [clinic.city, clinic.state].filter(Boolean).join(', ') || 'Location not provided';
  const metrics = [
    { label: 'QR scans', value: clinic.metrics?.qrScans ?? 0, icon: QrCode },
    { label: 'Patients', value: clinic.metrics?.patients ?? 0, icon: Users },
    { label: 'Paid patients', value: clinic.metrics?.paidPatients ?? 0, icon: UserRoundCheck },
    { label: 'Revenue generated', value: money(clinic.metrics?.revenueGenerated), icon: Building2 },
  ];

  return <div className="mx-auto w-full max-w-[1600px] space-y-5">
    <header className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6"><div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between"><div className="flex min-w-0 items-start gap-4"><button type="button" onClick={() => navigate('/admin/clinics')} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-neutral-200 text-neutral-600 hover:bg-neutral-50"><ArrowLeft className="h-5 w-5" /></button><div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-700"><Building2 className="h-7 w-7" /></div><div><div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-bold tracking-tight text-neutral-950 sm:text-3xl">{clinic.clinicName}</h1><StatusPill status={clinic.status} /></div><p className="mt-1 text-sm text-neutral-600">Doctor-owned clinic profile · {clinic.fullName}</p><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500"><span>{clinic.clinicId}</span><span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{location}</span><span>{clinic.clinicContact || 'No clinic contact'}</span></div></div></div><div className="flex gap-2"><button type="button" onClick={() => query.refetch()} disabled={query.isFetching} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-neutral-300 px-3.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"><RefreshCw className={cn('h-4 w-4', query.isFetching && 'animate-spin')} />Refresh</button><button type="button" onClick={() => setIsEditOpen(true)} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary-600 px-3.5 text-sm font-semibold text-white hover:bg-primary-700"><Pencil className="h-4 w-4" />Edit clinic</button></div></div></header>

    {success && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{success}</div>}

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{metrics.map((metric) => <div key={metric.label} className="rounded-xl border border-neutral-200 bg-white p-4"><div className="flex items-center justify-between"><div><p className="text-xs font-medium text-neutral-500">{metric.label}</p><p className="mt-2 text-xl font-bold text-neutral-950">{metric.value}</p></div><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-50 text-neutral-600"><metric.icon className="h-4.5 w-4.5" /></div></div></div>)}</section>

    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]"><main className="space-y-5"><InfoCard title="Clinic information"><InfoItem label="Clinic name" value={clinic.clinicName} /><InfoItem label="Branches" value={text(clinic.clinicBranches, '1')} /><InfoItem label="Address" value={text(clinic.clinicAddress)} /><InfoItem label="City / State" value={location} /><InfoItem label="Postal code" value={text(clinic.postalCode)} /><InfoItem label="Working hours" value={text(clinic.clinicWorkingHours)} /><InfoItem label="Clinic contact" value={text(clinic.clinicContact)} /><InfoItem label="Clinic email" value={text(clinic.clinicEmail)} /></InfoCard><InfoCard title="Doctor ownership"><InfoItem label="Doctor" value={clinic.fullName} /><InfoItem label="Doctor ID" value={text(clinic.doctorId)} /><InfoItem label="Specialization" value={text(clinic.specialization)} /><InfoItem label="Qualification" value={text(clinic.qualification)} /><InfoItem label="Doctor mobile" value={text(clinic.mobile)} /><InfoItem label="Doctor email" value={text(clinic.email)} /></InfoCard><InfoCard title="Referral & record context"><InfoItem label="QR status" value={clinic.qrCodeActive ? 'Active' : 'Inactive'} /><InfoItem label="Referral code" value={text(clinic.referralCode)} /><InfoItem label="Created" value={dateText(clinic.createdAt)} /><InfoItem label="Last updated" value={dateText(clinic.updatedAt)} /></InfoCard></main>

    <aside className="space-y-4 xl:sticky xl:top-5"><section className="overflow-hidden rounded-xl border border-neutral-200 bg-white"><div className="border-b border-neutral-100 bg-neutral-50/60 px-4 py-4"><h2 className="text-sm font-bold text-neutral-950">Clinic actions</h2><p className="mt-1 text-xs text-neutral-500">Clinic details are stored on the owning doctor profile.</p></div><div className="space-y-2 p-4"><button type="button" onClick={() => setIsEditOpen(true)} className="flex w-full items-center gap-3 rounded-xl bg-primary-600 px-4 py-3 text-left text-sm font-semibold text-white"><Pencil className="h-4 w-4" />Edit clinic details</button><button type="button" onClick={() => navigate(`/admin/doctors/${clinic._id}`)} className="flex w-full items-center gap-3 rounded-xl border border-neutral-200 px-4 py-3 text-left text-sm font-semibold text-neutral-700 hover:bg-neutral-50"><Stethoscope className="h-4 w-4" />Open doctor workspace</button>{clinic.googleMapsLink && <a href={clinic.googleMapsLink} target="_blank" rel="noreferrer" className="flex w-full items-center gap-3 rounded-xl border border-neutral-200 px-4 py-3 text-left text-sm font-semibold text-neutral-700 hover:bg-neutral-50"><ExternalLink className="h-4 w-4" />Open map location</a>}</div></section><section className="rounded-xl border border-neutral-200 bg-white p-4"><h2 className="text-sm font-bold text-neutral-950">Assigned agent</h2><div className="mt-3 text-sm"><div className="font-semibold text-neutral-900">{clinic.agent?.fullName || 'Unassigned'}</div><div className="mt-1 text-xs text-neutral-500">{clinic.agent?.agentId || 'No agent ID'}{clinic.agent?.assignedRegion ? ` · ${clinic.agent.assignedRegion}` : ''}</div></div></section></aside></div>

    <Modal isOpen={isEditOpen} onClose={() => !mutation.isPending && setIsEditOpen(false)} title="Edit clinic details" size="lg"><form className="space-y-4" onSubmit={(event) => { event.preventDefault(); mutation.mutate(new FormData(event.currentTarget)); }}><div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">This updates clinic fields only. Doctor approval, KYC, QR, and suspension actions stay in the Doctor workspace.</div><div className="grid gap-4 sm:grid-cols-2"><Field name="clinicName" label="Clinic name" defaultValue={clinic.clinicName} required /><Field name="clinicContact" label="Clinic contact" defaultValue={clinic.clinicContact} /><Field name="clinicEmail" label="Clinic email" type="email" defaultValue={clinic.clinicEmail} /><Field name="clinicBranches" label="Branches" type="number" defaultValue={clinic.clinicBranches ?? 1} /><Field name="city" label="City" defaultValue={clinic.city} /><Field name="state" label="State" defaultValue={clinic.state} /><Field name="postalCode" label="Postal code" defaultValue={clinic.postalCode} /><Field name="clinicWorkingHours" label="Working hours" defaultValue={clinic.clinicWorkingHours} /><div className="sm:col-span-2"><Field name="clinicAddress" label="Clinic address" defaultValue={clinic.clinicAddress} /></div><div className="sm:col-span-2"><Field name="googleMapsLink" label="Google Maps link" type="url" defaultValue={clinic.googleMapsLink} /></div></div>{mutation.isError && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{(mutation.error as any)?.response?.data?.message || 'The backend could not update this clinic profile.'}</div>}<div className="flex justify-end gap-2"><button type="button" onClick={() => setIsEditOpen(false)} disabled={mutation.isPending} className="rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-semibold text-neutral-700">Cancel</button><button type="submit" disabled={mutation.isPending} className="rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{mutation.isPending ? 'Saving…' : 'Save clinic'}</button></div></form></Modal>
  </div>;
}

function Field({ name, label, type = 'text', defaultValue, required }: { name: string; label: string; type?: string; defaultValue?: string | number; required?: boolean }) {
  return <label className="block"><span className="text-sm font-semibold text-neutral-700">{label}{required && <span className="text-rose-500"> *</span>}</span><input name={name} type={type} defaultValue={defaultValue} required={required} min={type === 'number' ? 1 : undefined} className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100" /></label>;
}
