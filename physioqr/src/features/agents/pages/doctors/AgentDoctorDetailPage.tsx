import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Copy,
  Download,
  FileUp,
  Pencil,
  QrCode,
  Save,
  Stethoscope,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import apiClient from '@/lib/api-client';
import ErrorState from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';

type ApiRecord = Record<string, unknown>;
type ProgramOption = {
  _id: string;
  name: string;
  durationDays?: number;
};

type EditForm = {
  fullName: string;
  mobile: string;
  qualification: string;
  specialization: string;
  medicalRegNumber: string;
  clinicName: string;
  city: string;
  preferredProgram: string;
  revenueModel: 'split' | 'platform_fee';
};

const EMPTY_EDIT_FORM: EditForm = {
  fullName: '',
  mobile: '',
  qualification: '',
  specialization: '',
  medicalRegNumber: '',
  clinicName: '',
  city: '',
  preferredProgram: '',
  revenueModel: 'split',
};

export default function AgentDoctorDetailPage() {
  const { doctorId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [documentType, setDocumentType] = useState('medical_registration');
  const [file, setFile] = useState<File | null>(null);
  const [isEditing, setIsEditing] = useState(searchParams.get('edit') === '1');
  const [editForm, setEditForm] = useState<EditForm>(EMPTY_EDIT_FORM);
  const [editValidationError, setEditValidationError] = useState('');
  const [copied, setCopied] = useState(false);
  const [activationPassword, setActivationPassword] = useState('');

  const query = useQuery({
    queryKey: ['agent-doctor', doctorId],
    enabled: Boolean(doctorId),
    queryFn: async () => (await apiClient.get(`/agents/me/doctors/${doctorId}`)).data,
  });

  const payload = record(query.data);
  const doctor = record(payload.doctor);
  const performance = record(payload.performance);
  const visits = records(payload.recentVisits);
  const preferredProgram = record(doctor.preferredProgram);
  const referralUrl = text(payload.referralUrl);
  const qrCodeUrl = text(doctor.qrCodeUrl);
  const doctorKey = text(doctor._id);

  const programsQuery = useQuery<ProgramOption[]>({
    queryKey: ['agent-edit-programs'],
    enabled: isEditing,
    queryFn: async () => {
      const response = await apiClient.get('/programs');
      return Array.isArray(response.data) ? response.data : [];
    },
  });

  useEffect(() => {
    if (!isEditing || !doctorKey) return;
    setEditForm({
      fullName: text(doctor.fullName),
      mobile: text(doctor.mobile),
      qualification: text(doctor.qualification),
      specialization: text(doctor.specialization),
      medicalRegNumber: text(doctor.medicalRegNumber),
      clinicName: text(doctor.clinicName),
      city: text(doctor.city),
      preferredProgram: text(preferredProgram._id),
      revenueModel: text(doctor.revenueModel, 'split') === 'platform_fee' ? 'platform_fee' : 'split',
    });
    setEditValidationError('');
  }, [doctorKey, isEditing]);

  const upload = useMutation({
    mutationFn: async () => {
      if (!doctorId || !file) throw new Error('Choose a document first');
      const body = new FormData();
      body.append('documentType', documentType);
      body.append('document', file);
      return apiClient.post(`/agents/me/doctors/${doctorId}/documents`, body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: async () => {
      setFile(null);
      await queryClient.invalidateQueries({ queryKey: ['agent-doctor', doctorId] });
    },
  });

  const updateDoctor = useMutation({
    mutationFn: async (data: EditForm) => apiClient.patch(`/agents/me/doctors/${doctorId}`, data),
    onSuccess: async () => {
      setIsEditing(false);
      setSearchParams({}, { replace: true });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['agent-doctor', doctorId] }),
        queryClient.invalidateQueries({ queryKey: ['agent-doctors'] }),
        queryClient.invalidateQueries({ queryKey: ['agent-dashboard'] }),
      ]);
    },
  });

  const completeActivation = useMutation({
    mutationFn: async () => apiClient.post(`/agents/me/doctors/${doctorId}/complete-activation`),
    onSuccess: async (response) => {
      const temporaryPassword = text(response.data?.temporaryPassword);
      if (temporaryPassword) setActivationPassword(temporaryPassword);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['agent-doctor', doctorId] }),
        queryClient.invalidateQueries({ queryKey: ['agent-doctors'] }),
        queryClient.invalidateQueries({ queryKey: ['agent-dashboard'] }),
      ]);
    },
  });

  const programLabel = useMemo(() => {
    if (!text(preferredProgram.name)) return '-';
    return `${text(preferredProgram.name)}${numberOrNull(preferredProgram.durationDays) ? ` – ${numberOrNull(preferredProgram.durationDays)} Days` : ''}`;
  }, [preferredProgram.name, preferredProgram.durationDays]);

  if (query.isError) {
    return (
      <ErrorState
        title="Doctor could not load"
        message="This doctor may not belong to your agent account, or the record is unavailable."
        onRetry={() => query.refetch()}
      />
    );
  }

  const openEdit = () => {
    setIsEditing(true);
    setSearchParams({ edit: '1' }, { replace: true });
  };

  const closeEdit = () => {
    setIsEditing(false);
    setEditValidationError('');
    setSearchParams({}, { replace: true });
  };

  const submitEdit = () => {
    const requiredValues = [
      editForm.fullName,
      editForm.mobile,
      editForm.qualification,
      editForm.specialization,
      editForm.medicalRegNumber,
      editForm.clinicName,
      editForm.city,
      editForm.preferredProgram,
      editForm.revenueModel,
    ];
    if (requiredValues.some((value) => !value.trim())) {
      setEditValidationError('All doctor registration fields are required.');
      return;
    }
    if (!/^[6-9]\d{9}$/.test(editForm.mobile)) {
      setEditValidationError('Enter a valid 10-digit mobile number.');
      return;
    }
    setEditValidationError('');
    updateDoctor.mutate(editForm);
  };

  const copyReferralLink = async () => {
    if (!referralUrl) return;
    await navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  const downloadQr = () => {
    if (!qrCodeUrl) return;
    const anchor = document.createElement('a');
    anchor.href = qrCodeUrl;
    anchor.download = `${text(doctor.doctorId, 'PhysioQR')}-QR.png`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <button onClick={() => navigate('/agent/doctors')} className="inline-flex items-center gap-1 text-sm font-semibold text-neutral-600">
            <ArrowLeft className="h-4 w-4" />
            My Doctors
          </button>
          {query.isLoading ? (
            <Skeleton className="mt-4 h-9 w-72" />
          ) : (
            <h1 className="mt-3 text-2xl font-bold text-neutral-900 sm:text-3xl">{text(doctor.fullName, 'Doctor')}</h1>
          )}
          <p className="mt-1 text-sm text-neutral-500">
            {text(doctor.doctorId, '-')}
            {text(doctor.clinicName) ? ` • ${text(doctor.clinicName)}` : ''}
          </p>
        </div>

        {!query.isLoading && (
          <div className="flex flex-wrap items-center gap-2">
            <Status value={text(doctor.status, 'draft')} />
            <button
              type="button"
              onClick={openEdit}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-3.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
            >
              <Pencil className="h-4 w-4" />
              Edit Doctor
            </button>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={Stethoscope} label="Doctor status" value={label(doctor.status)} loading={query.isLoading} />
        <Metric icon={QrCode} label="QR status" value={doctor.qrCodeActive ? 'Active' : 'Not active'} loading={query.isLoading} />
        <Metric icon={Users} label="Patient registrations" value={number(performance.patientRegistrations)} loading={query.isLoading} />
        <Metric icon={UserCheck} label="Paid patients" value={number(performance.paidPatients)} loading={query.isLoading} />
      </div>

      {isEditing && (
        <section className="rounded-xl border border-primary-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-bold text-neutral-900">Edit Doctor</h2>
              <p className="mt-1 text-xs text-neutral-500">Edit only the basic registration details. Pricing, fee-share, bank and payout settings remain Admin-controlled.</p>
            </div>
            <button type="button" onClick={closeEdit} className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100" aria-label="Close edit form">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <EditField label="Doctor Full Name" value={editForm.fullName} onChange={(value) => setEditForm((current) => ({ ...current, fullName: value }))} />
            <EditField label="Mobile Number" value={editForm.mobile} onChange={(value) => setEditForm((current) => ({ ...current, mobile: value }))} inputMode="numeric" />
            <EditField label="Qualification" value={editForm.qualification} onChange={(value) => setEditForm((current) => ({ ...current, qualification: value }))} />
            <EditField label="Specialization" value={editForm.specialization} onChange={(value) => setEditForm((current) => ({ ...current, specialization: value }))} />
            <EditField label="Medical Registration Number" value={editForm.medicalRegNumber} onChange={(value) => setEditForm((current) => ({ ...current, medicalRegNumber: value }))} />
            <EditField label="Clinic Name" value={editForm.clinicName} onChange={(value) => setEditForm((current) => ({ ...current, clinicName: value }))} />
            <EditField label="City" value={editForm.city} onChange={(value) => setEditForm((current) => ({ ...current, city: value }))} />

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-neutral-700">Rehab Program *</span>
              <select
                value={editForm.preferredProgram}
                onChange={(event) => setEditForm((current) => ({ ...current, preferredProgram: event.target.value }))}
                disabled={programsQuery.isLoading}
                className={inputClass}
              >
                <option value="">{programsQuery.isLoading ? 'Loading programs...' : 'Select rehab program'}</option>
                {(programsQuery.data || []).map((program) => (
                  <option key={program._id} value={program._id}>
                    {program.name}{program.durationDays ? ` – ${program.durationDays} Days` : ''}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-neutral-700">Payment Model *</span>
              <select
                value={editForm.revenueModel}
                onChange={(event) => setEditForm((current) => ({ ...current, revenueModel: event.target.value as EditForm['revenueModel'] }))}
                className={inputClass}
              >
                <option value="split">Split Model</option>
                <option value="platform_fee">Platform Fee</option>
              </select>
              <p className="mt-1 text-[11px] text-neutral-500">After a verified patient payment, Agent cannot change the payment model. Admin can manage finance settings.</p>
            </label>
          </div>

          {(editValidationError || updateDoctor.error || programsQuery.isError) && (
            <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
              {editValidationError || (programsQuery.isError ? 'Active rehab programs could not load.' : errorMessage(updateDoctor.error))}
            </div>
          )}

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={closeEdit} className="min-h-10 rounded-lg border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-700">
              Cancel
            </button>
            <button
              type="button"
              disabled={updateDoctor.isPending || programsQuery.isLoading}
              onClick={submitEdit}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {updateDoctor.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </section>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="font-bold text-neutral-900">Doctor & Clinic</h2>
          {query.isLoading ? (
            <Skeleton className="mt-4 h-64" />
          ) : (
            <div className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2">
              <Info label="Mobile" value={doctor.mobile} />
              <Info label="Qualification" value={doctor.qualification} />
              <Info label="Specialization" value={doctor.specialization} />
              <Info label="Medical registration" value={doctor.medicalRegNumber} />
              <Info label="Clinic" value={doctor.clinicName} />
              <Info label="City" value={doctor.city} />
              <Info label="Rehab program" value={programLabel} />
              <Info label="Payment model" value={paymentModelLabel(doctor.revenueModel)} />
              <Info label="KYC status" value={label(doctor.kycStatus)} />
              <Info label="Approval date" value={dateText(doctor.approvalDate)} />
            </div>
          )}
        </section>

        <aside className="space-y-6">
          <section id="doctor-qr" className="scroll-mt-24 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-primary-600" />
              <h2 className="font-bold text-neutral-900">Doctor Referral QR</h2>
            </div>

            {query.isLoading ? (
              <Skeleton className="mt-4 h-64 w-full" />
            ) : doctor.qrCodeActive && qrCodeUrl ? (
              <>
                <div className="mt-4 flex justify-center rounded-xl border border-neutral-200 bg-white p-4">
                  <img
                    src={qrCodeUrl}
                    alt={`PhysioQR referral QR for ${text(doctor.fullName, 'doctor')}`}
                    className="h-56 w-56 max-w-full"
                  />
                </div>
                <p className="mt-3 text-center text-xs font-semibold text-neutral-600">{text(doctor.referralCode, text(doctor.doctorId))}</p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button type="button" onClick={copyReferralLink} disabled={!referralUrl} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 text-xs font-semibold text-neutral-700 disabled:opacity-50">
                    <Copy className="h-4 w-4" />
                    {copied ? 'Copied' : 'Copy Link'}
                  </button>
                  <button type="button" onClick={downloadQr} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary-600 px-3 text-xs font-semibold text-white">
                    <Download className="h-4 w-4" />
                    Download QR
                  </button>
                </div>
              </>
            ) : text(doctor.status) === 'submitted' ? (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <p className="font-semibold">Legacy doctor setup is incomplete.</p>
                <p className="mt-1 text-xs leading-5">This doctor was registered before automatic Agent approval was enabled. Complete activation once to create the login, wallet and referral QR.</p>
                <button
                  type="button"
                  onClick={() => completeActivation.mutate()}
                  disabled={completeActivation.isPending}
                  className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-3 text-sm font-semibold text-white disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {completeActivation.isPending ? 'Activating...' : 'Complete Activation & Generate QR'}
                </button>
                {completeActivation.error && <p className="mt-2 text-xs font-semibold text-rose-700">{errorMessage(completeActivation.error)}</p>}
              </div>
            ) : (
              <div className="mt-4 rounded-lg bg-neutral-50 p-4 text-sm text-neutral-600">
                <p className="font-semibold text-neutral-800">QR is not active for this record.</p>
                <p className="mt-1 text-xs leading-5">Suspended, rejected, inactive, or Admin-reviewed doctors cannot use an active referral QR.</p>
              </div>
            )}

            {activationPassword && (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Doctor temporary password</p>
                <code className="mt-1 block break-all text-sm font-bold text-amber-950">{activationPassword}</code>
                <p className="mt-1 text-[11px] text-amber-800">Share it securely. Doctor must create a new password on first login.</p>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h2 className="font-bold text-neutral-900">Onboarding Documents</h2>
            <p className="mt-1 text-xs text-neutral-500">Upload non-financial doctor documents collected in the field.</p>
            <select value={documentType} onChange={(event) => setDocumentType(event.target.value)} className="mt-4 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm">
              <option value="medical_registration">Medical registration</option>
              <option value="identity_proof">Identity proof</option>
              <option value="address_proof">Address proof</option>
              <option value="profile_photo">Profile photo</option>
              <option value="other">Other</option>
            </select>
            <input type="file" onChange={(event) => setFile(event.target.files?.[0] || null)} className="mt-3 block w-full text-sm" />
            <button
              disabled={!file || upload.isPending}
              onClick={() => upload.mutate()}
              className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              <FileUp className="h-4 w-4" />
              {upload.isPending ? 'Uploading...' : 'Upload Document'}
            </button>
            {upload.error && <p className="mt-2 text-xs font-semibold text-rose-700">{errorMessage(upload.error)}</p>}
            {upload.isSuccess && <p className="mt-2 text-xs font-semibold text-emerald-700">Document uploaded successfully.</p>}
            <p className="mt-3 text-[11px] text-neutral-500">PAN, cancelled cheque and bank documents are intentionally unavailable to agents.</p>
          </section>

          <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-neutral-900">Recent Visits</h2>
              <Link to="/agent/clinic-visits" className="text-xs font-semibold text-primary-700">All visits</Link>
            </div>
            <div className="mt-4 space-y-3">
              {query.isLoading && <Skeleton className="h-32" />}
              {!query.isLoading && visits.length === 0 && <div className="rounded-lg bg-neutral-50 p-4 text-sm text-neutral-500">No clinic visits recorded.</div>}
              {visits.map((visit) => (
                <div key={text(visit._id || visit.id)} className="rounded-lg border border-neutral-200 p-3">
                  <div className="flex gap-2">
                    <CalendarClock className="mt-0.5 h-4 w-4 text-primary-600" />
                    <div>
                      <p className="text-sm font-semibold">{dateText(visit.visitDate)} {text(visit.visitTime)}</p>
                      <p className="text-xs text-neutral-500">{label(visit.outcome)}</p>
                      {text(visit.nextAction) && <p className="mt-1 text-xs">Next: {text(visit.nextAction)}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        Agent access intentionally excludes doctor banking, detailed fee-share, payout, and confidential patient medical information.
      </div>
    </div>
  );
}

const inputClass = 'min-h-11 w-full rounded-lg border border-neutral-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:cursor-not-allowed disabled:bg-neutral-50';

function EditField({
  label: fieldLabel,
  value,
  onChange,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-neutral-700">{fieldLabel} *</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} inputMode={inputMode} className={inputClass} />
    </label>
  );
}

function Metric({
  icon: Icon,
  label: metricLabel,
  value,
  loading,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  loading: boolean;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <Icon className="h-5 w-5 text-primary-600" />
      {loading ? <Skeleton className="mt-3 h-7 w-24" /> : <p className="mt-3 text-xl font-bold text-neutral-900">{value}</p>}
      <p className="mt-1 text-xs text-neutral-500">{metricLabel}</p>
    </div>
  );
}

function Info({ label: infoLabel, value }: { label: string; value: unknown }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{infoLabel}</p>
      <p className="mt-1 text-sm font-medium text-neutral-900">{text(value, '-')}</p>
    </div>
  );
}

function Status({ value }: { value: string }) {
  const positive = value === 'approved';
  const warning = ['submitted', 'under_review', 'documents_required'].includes(value);
  const negative = ['rejected', 'suspended'].includes(value);
  return (
    <span className={`rounded-full px-3 py-1.5 text-xs font-bold capitalize ${positive ? 'bg-emerald-50 text-emerald-700' : warning ? 'bg-amber-50 text-amber-700' : negative ? 'bg-rose-50 text-rose-700' : 'bg-neutral-100 text-neutral-700'}`}>
      {label(value)}
    </span>
  );
}

function record(value: unknown): ApiRecord {
  return value && typeof value === 'object' ? value as ApiRecord : {};
}

function records(value: unknown): ApiRecord[] {
  return Array.isArray(value) ? value.filter((item): item is ApiRecord => Boolean(item) && typeof item === 'object') : [];
}

function text(value: unknown, fallback = '') {
  return value === undefined || value === null || value === '' ? fallback : String(value);
}

function number(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function numberOrNull(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function label(value: unknown) {
  return text(value, '-').replace(/_/g, ' ');
}

function paymentModelLabel(value: unknown) {
  return text(value) === 'platform_fee' ? 'Platform Fee' : 'Split Model';
}

function dateText(value: unknown) {
  if (!value) return '-';
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function errorMessage(error: unknown) {
  if (error && typeof error === 'object') {
    const response = (error as { response?: { data?: { message?: unknown } } }).response;
    const message = response?.data?.message || (error as { message?: unknown }).message;
    if (message) return String(message);
  }
  return 'Unable to update doctor.';
}
