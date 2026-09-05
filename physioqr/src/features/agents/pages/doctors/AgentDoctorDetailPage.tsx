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
  ShieldCheck,
  Stethoscope,
  UserCheck,
  Users,
} from 'lucide-react';
import apiClient from '@/lib/api-client';
import ErrorState from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';

type ApiRecord = Record<string, unknown>;

export default function AgentDoctorDetailPage() {
  const { doctorId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [documentType, setDocumentType] = useState('medical_registration');
  const [file, setFile] = useState<File | null>(null);
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

  useEffect(() => {
    if (doctorId && searchParams.get('edit') === '1') {
      navigate(`/agent/doctors/${doctorId}/edit`, { replace: true });
    }
  }, [doctorId, navigate, searchParams]);

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
    const days = numberOrNull(preferredProgram.durationDays);
    return `${text(preferredProgram.name)}${days ? ` – ${days} Days` : ''}`;
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

  const revenueModel = text(doctor.revenueModel, 'split');
  const patientPrice = doctor.requestedPatientFee ?? doctor.approvedPatientFee;
  const commissionType = text(doctor.requestedFeeShareType || doctor.feeShareType, 'percentage');
  const commissionValue = commissionType === 'fixed'
    ? doctor.requestedFixedFeeShareAmount ?? doctor.fixedFeeShareAmount
    : doctor.requestedFeeSharePercentage ?? doctor.feeSharePercentage;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <button
            onClick={() => navigate('/agent/doctors')}
            className="inline-flex items-center gap-1 text-sm font-semibold text-neutral-600"
          >
            <ArrowLeft className="h-4 w-4" />
            My Doctors
          </button>

          {query.isLoading ? (
            <Skeleton className="mt-4 h-9 w-72" />
          ) : (
            <h1 className="mt-3 text-2xl font-bold text-neutral-900 sm:text-3xl">
              {text(doctor.fullName, 'Doctor')}
            </h1>
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
              onClick={() => navigate(`/agent/doctors/${doctorId}/edit`)}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-3.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
            >
              <Pencil className="h-4 w-4" />
              Edit Doctor
            </button>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric icon={Stethoscope} label="Doctor status" value={label(doctor.status)} loading={query.isLoading} />
        <Metric icon={QrCode} label="QR status" value={doctor.qrCodeActive ? 'Active' : 'Not active'} loading={query.isLoading} />
        <Metric icon={ShieldCheck} label="KYC status" value={label(doctor.kycStatus)} loading={query.isLoading} />
        <Metric icon={Users} label="Patient registrations" value={number(performance.patientRegistrations)} loading={query.isLoading} />
        <Metric icon={UserCheck} label="Paid patients" value={number(performance.paidPatients)} loading={query.isLoading} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="font-bold text-neutral-900">Doctor & Clinic Information</h2>
            {query.isLoading ? (
              <Skeleton className="mt-4 h-64" />
            ) : (
              <div className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2">
                <Info label="Doctor ID" value={doctor.doctorId} />
                <Info label="Mobile" value={doctor.mobile} />
                <Info label="Qualification" value={doctor.qualification} />
                <Info label="Specialization" value={doctor.specialization} />
                <Info label="Medical registration" value={doctor.medicalRegNumber} />
                <Info label="Clinic" value={doctor.clinicName} />
                <Info label="City" value={doctor.city} />
                <Info label="Rehab program" value={programLabel} />
                <Info label="Registration date" value={dateText(doctor.registrationDate || doctor.createdAt)} />
                <Info label="Approval date" value={dateText(doctor.approvalDate)} />
                <Info label="Referral code" value={doctor.referralCode || doctor.doctorId} />
                <Info label="KYC status" value={label(doctor.kycStatus)} />
              </div>
            )}
          </section>

          <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
            <div>
              <h2 className="font-bold text-neutral-900">Payment Setup</h2>
              <p className="mt-1 text-xs text-neutral-500">
                Patient payment is collected through Razorpay and becomes authoritative only after backend verification.
              </p>
            </div>

            {query.isLoading ? (
              <Skeleton className="mt-4 h-40" />
            ) : (
              <div className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2">
                <Info label="Payment model" value={paymentModelLabel(revenueModel)} />
                <Info label="Patient price" value={money(patientPrice)} />

                {revenueModel === 'split' ? (
                  <>
                    <Info label="Doctor commission type" value={commissionType === 'fixed' ? 'Fixed Amount' : 'Percentage'} />
                    <Info
                      label="Doctor commission"
                      value={commissionType === 'fixed' ? money(commissionValue) : percentage(commissionValue)}
                    />
                  </>
                ) : (
                  <>
                    <Info label="Doctor share from patient payment" value="₹0" />
                    <Info label="PhysioQR share" value="Full verified patient payment" />
                  </>
                )}
              </div>
            )}

            <div className="mt-5 rounded-lg bg-neutral-50 p-3 text-xs leading-5 text-neutral-600">
              Successful verified payment automatically drives payment records, patient activation and invoice generation. Agent does not handle manual payment confirmation.
            </div>
          </section>

          <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-bold text-neutral-900">Doctor KYC</h2>
                <p className="mt-1 text-xs text-neutral-500">
                  Agent can collect and upload operational KYC documents for the doctor.
                </p>
              </div>
              <Status value={text(doctor.kycStatus, 'pending')} />
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <KycItem label="Medical Registration" />
              <KycItem label="Identity Proof" />
              <KycItem label="Address Proof" />
              <KycItem label="Profile Photo" />
            </div>

            <p className="mt-4 text-xs leading-5 text-neutral-500">
              PAN, cancelled cheque, bank account, payout and wallet information remain protected and are not available in the Agent panel.
            </p>
          </section>
        </div>

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
                <p className="mt-3 text-center text-xs font-semibold text-neutral-600">
                  {text(doctor.referralCode, text(doctor.doctorId))}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={copyReferralLink}
                    disabled={!referralUrl}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 text-xs font-semibold text-neutral-700 disabled:opacity-50"
                  >
                    <Copy className="h-4 w-4" />
                    {copied ? 'Copied' : 'Copy Link'}
                  </button>
                  <button
                    type="button"
                    onClick={downloadQr}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary-600 px-3 text-xs font-semibold text-white"
                  >
                    <Download className="h-4 w-4" />
                    Download QR
                  </button>
                </div>
              </>
            ) : text(doctor.status) === 'submitted' ? (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <p className="font-semibold">Legacy doctor setup is incomplete.</p>
                <p className="mt-1 text-xs leading-5">
                  This doctor was registered before automatic Agent approval was enabled. Complete activation once to create the login, wallet and referral QR.
                </p>
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
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-neutral-900">KYC Upload</h2>
                <p className="mt-1 text-xs text-neutral-500">Upload doctor KYC documents collected during clinic onboarding.</p>
              </div>
              <ShieldCheck className="h-5 w-5 text-primary-600" />
            </div>

            <select
              value={documentType}
              onChange={(event) => setDocumentType(event.target.value)}
              className="mt-4 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            >
              <option value="medical_registration">Medical registration</option>
              <option value="identity_proof">Identity proof</option>
              <option value="address_proof">Address proof</option>
              <option value="profile_photo">Profile photo</option>
              <option value="other">Other</option>
            </select>

            <input
              type="file"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
              className="mt-3 block w-full text-sm"
            />

            <button
              type="button"
              disabled={!file || upload.isPending}
              onClick={() => upload.mutate()}
              className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              <FileUp className="h-4 w-4" />
              {upload.isPending ? 'Uploading...' : 'Upload KYC Document'}
            </button>

            {upload.error && <p className="mt-2 text-xs font-semibold text-rose-700">{errorMessage(upload.error)}</p>}
            {upload.isSuccess && <p className="mt-2 text-xs font-semibold text-emerald-700">KYC document uploaded successfully.</p>}
          </section>

          <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-neutral-900">Recent Visits</h2>
              <Link to="/agent/clinic-visits" className="text-xs font-semibold text-primary-700">All visits</Link>
            </div>

            <div className="mt-4 space-y-3">
              {query.isLoading && <Skeleton className="h-32" />}
              {!query.isLoading && visits.length === 0 && (
                <div className="rounded-lg bg-neutral-50 p-4 text-sm text-neutral-500">No clinic visits recorded.</div>
              )}
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
        Agent can manage doctor onboarding, QR, operational KYC and basic commercial setup. Doctor banking, PAN, payout, wallet and confidential patient medical information remain protected.
      </div>
    </div>
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

function KycItem({ label: itemLabel }: { label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-neutral-50 px-3 py-2.5 text-sm font-medium text-neutral-700">
      <ShieldCheck className="h-4 w-4 text-primary-600" />
      {itemLabel}
    </div>
  );
}

function Status({ value }: { value: string }) {
  const positive = ['approved', 'active'].includes(value);
  const warning = ['submitted', 'under_review', 'documents_required', 'pending'].includes(value);
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
  return Array.isArray(value)
    ? value.filter((item): item is ApiRecord => Boolean(item) && typeof item === 'object')
    : [];
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

function money(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? `₹${parsed.toLocaleString('en-IN')}` : '-';
}

function percentage(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? `${parsed}%` : '-';
}

function dateText(value: unknown) {
  if (!value) return '-';
  const date = new Date(String(value));
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function errorMessage(error: unknown) {
  if (error && typeof error === 'object') {
    const response = (error as { response?: { data?: { message?: unknown } } }).response;
    const message = response?.data?.message || (error as { message?: unknown }).message;
    if (message) return String(message);
  }
  return 'Unable to update doctor.';
}
