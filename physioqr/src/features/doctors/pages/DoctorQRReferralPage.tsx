import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Check, Copy, Download, ExternalLink, Link2, MapPin,
  Phone, Printer, QrCode, Share2, ShieldCheck, TrendingUp, UserRoundCheck,
  Users, Wallet, AlertCircle, Sparkles, Edit3, CheckCircle2,
} from 'lucide-react';
import apiClient from '@/lib/api-client';
import ErrorState from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';

type ApiRecord = Record<string, unknown>;
type PosterProps = {
  doctorName: string;
  doctorId: string;
  clinicName: string;
  location: string;
  mobile: string;
  referralLink: string;
  qrCodeUrl: string;
  imageLoaded?: () => void;
  imageFailed?: () => void;
  print?: boolean;
};

const text = (value: unknown, fallback = '') =>
  typeof value === 'string' && value.trim() ? value.trim() : fallback;
const asRecord = (value: unknown): ApiRecord =>
  value && typeof value === 'object' ? value as ApiRecord : {};
const formatPercent = (numerator: number, denominator: number) =>
  denominator > 0 ? `${((numerator / denominator) * 100).toFixed(1)}%` : '0%';

function ReferralPoster({
  doctorName, doctorId, clinicName, location, mobile, referralLink,
  qrCodeUrl, imageLoaded, imageFailed, print = false,
}: PosterProps) {
  return (
    <article className={print
      ? 'referral-print-sheet'
      : 'overflow-hidden rounded-[26px] border border-neutral-200 bg-white shadow-sm'}
    >
      <div className={print ? 'px-10 pb-4 pt-10 text-center' : 'border-b border-primary-100 bg-gradient-to-br from-emerald-50 via-white to-white px-5 py-6 text-center sm:px-8'}>
        <div className="flex items-center justify-center gap-2">
          <img src="/PhysioQR.png" alt="PhysioQR" className="h-10 w-10 object-contain" />
          <span className="text-xl font-extrabold tracking-tight text-primary-700">PhysioQR</span>
        </div>
        <p className="mt-4 text-xs font-bold uppercase tracking-[.22em] text-primary-700">Doctor referral</p>
        <h2 className={print ? 'mt-2 text-3xl font-bold text-neutral-950' : 'mt-2 text-2xl font-bold text-neutral-950'}>
          Start your recovery journey
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-neutral-600">
          Scan this QR code to register with your doctor for guided rehabilitation.
        </p>
      </div>

      <div className={print ? 'px-10 py-6 text-center' : 'px-5 py-6 text-center sm:px-8'}>
        <div className="mx-auto max-w-lg">
          <h3 className="text-2xl font-bold tracking-tight text-neutral-950">{doctorName}</h3>
          {clinicName && <p className="mt-1 text-base font-semibold text-primary-700">{clinicName}</p>}
          <p className="mt-1 text-sm font-medium text-neutral-500">Doctor ID: {doctorId}</p>
          {(location || mobile) && (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-neutral-600">
              {location && <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4 text-primary-600" />{location}</span>}
              {mobile && <span className="inline-flex items-center gap-1.5"><Phone className="h-4 w-4 text-primary-600" />{mobile}</span>}
            </div>
          )}
        </div>

        <div className={print
          ? 'mx-auto mt-8 flex h-[82mm] w-[82mm] items-center justify-center rounded-xl border border-neutral-200 bg-white p-3'
          : 'mx-auto mt-6 flex h-64 w-64 items-center justify-center rounded-2xl border-2 border-primary-100 bg-white p-4 shadow-sm sm:h-72 sm:w-72'}>
          <img
            src={qrCodeUrl}
            alt={`Scan to register with ${doctorName} at PhysioQR`}
            onLoad={imageLoaded}
            onError={imageFailed}
            className="h-full w-full object-contain"
          />
        </div>

        <p className="mt-4 text-base font-bold text-neutral-900">Scan to register</p>
        <p className="mt-1 text-sm text-neutral-500">Open your phone camera and point it at the QR code.</p>

        <div className={print
          ? 'mt-7 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-4 text-left'
          : 'mt-6 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-4 text-left'}>
          <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Or visit this referral link</p>
          <p className="mt-2 break-all font-mono text-xs leading-5 text-neutral-800">{referralLink}</p>
        </div>
      </div>
      
    </article>
  );
}

function DoctorFeeSetupCard({
  currentFee,
  doctorName,
  onFeeSaved,
}: {
  currentFee?: number;
  doctorName: string;
  onFeeSaved?: () => void;
}) {
  const [feeInput, setFeeInput] = useState<string>(currentFee && currentFee > 0 ? String(currentFee) : '1500');
  const [errorMsg, setErrorMsg] = useState('');
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (fee: number) => {
      return (await apiClient.put('/doctors/me/patient-fee', { approvedPatientFee: fee })).data;
    },
    onSuccess: async () => {
      setErrorMsg('');
      await queryClient.invalidateQueries({ queryKey: ['doctor-profile'] });
      await queryClient.invalidateQueries({ queryKey: ['doctor-qr-stats'] });
      await queryClient.invalidateQueries({ queryKey: ['doctor-summary'] });
      onFeeSaved?.();
    },
    onError: (err: unknown) => {
      const errRecord = asRecord((err as { response?: { data?: unknown } })?.response?.data);
      setErrorMsg(text(errRecord.message, 'Failed to update patient fee.'));
    },
  });

  const parsedFee = Math.max(0, Number(feeInput) || 0);
  const doctorShare = Math.round(parsedFee * 0.5);
  const platformShare = parsedFee - doctorShare;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedFee < 100 || parsedFee > 100000) {
      setErrorMsg('Please enter a fee between ₹100 and ₹1,00,000.');
      return;
    }
    mutation.mutate(parsedFee);
  };

  return (
    <div className="rounded-2xl border-2 border-primary-200 bg-white p-6 shadow-md sm:p-8">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-100 text-primary-700">
          <Sparkles className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-neutral-950">Set Patient Programme Fee</h2>
          <p className="text-xs text-neutral-500">Activate your clinic reception QR standee</p>
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-neutral-600">
        Welcome <strong>{doctorName}</strong>! Decide the rehabilitation programme fee for your referred patients.
        Once confirmed, your reception QR standee and referral link will be instantly activated.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div>
          <label htmlFor="patient-programme-fee-input" className="block text-sm font-bold text-neutral-900">
            Patient Programme Fee (₹) <span className="text-rose-500">*</span>
          </label>
          <div className="relative mt-2 max-w-sm">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-base font-bold text-neutral-400">
              ₹
            </span>
            <input
              id="patient-programme-fee-input"
              type="number"
              min={100}
              max={100000}
              step={50}
              required
              value={feeInput}
              onChange={(e) => { setFeeInput(e.target.value); setErrorMsg(''); }}
              placeholder="e.g. 1500"
              className="w-full rounded-xl border border-neutral-300 py-3 pl-9 pr-4 text-lg font-bold text-neutral-950 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
            />
          </div>
          <p className="mt-1.5 text-xs text-neutral-500">
            Recommended range: ₹1,000 – ₹3,000 per patient rehabilitation programme.
          </p>
        </div>

        <div className="rounded-xl border border-primary-100 bg-primary-50/60 p-4">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-primary-800">
            <span>Direct 50:50 Revenue Share</span>
            <span className="rounded bg-primary-200/80 px-2 py-0.5 text-[10px] text-primary-900">Fixed Partner Split</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-white p-3 border border-primary-100 shadow-sm">
              <span className="text-xs text-neutral-500 font-medium">Your Earning (50%)</span>
              <p className="mt-1 text-lg font-extrabold text-primary-700">{`₹${doctorShare.toLocaleString('en-IN')}`}</p>
            </div>
            <div className="rounded-lg bg-white p-3 border border-neutral-100 shadow-sm">
              <span className="text-xs text-neutral-500 font-medium">Platform Share (50%)</span>
              <p className="mt-1 text-lg font-bold text-neutral-700">{`₹${platformShare.toLocaleString('en-IN')}`}</p>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
            {errorMsg}
          </div>
        )}

        {mutation.isSuccess && (
          <div role="status" className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            Fee saved successfully! Your reception QR standee is now activated.
          </div>
        )}

        <button
          type="submit"
          disabled={mutation.isPending || parsedFee < 100}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 text-sm font-bold text-white shadow-sm hover:bg-primary-700 disabled:opacity-50 transition-colors"
        >
          {mutation.isPending ? 'Activating QR Standee...' : 'Set Fee & Activate QR Standee'}
        </button>
      </form>
    </div>
  );
}

function QrMetric({ label, value, icon: Icon }: { label: string; value: string | number; icon: typeof QrCode }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-neutral-500">{label}</span>
        <Icon className="h-4 w-4 text-primary-600" />
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight text-neutral-950">{value}</p>
    </div>
  );
}

export default function DoctorQRReferralPage() {
  const [copied, setCopied] = useState(false);
  const [qrImageReady, setQrImageReady] = useState(false);
  const [qrImageFailed, setQrImageFailed] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const [isEditingFee, setIsEditingFee] = useState(false);

  const profileQuery = useQuery({
    queryKey: ['doctor-profile'],
    queryFn: async () => (await apiClient.get('/doctors/me/profile')).data,
  });
  const qrQuery = useQuery({
    queryKey: ['doctor-qr-stats'],
    queryFn: async () => (await apiClient.get('/doctors/me/qr-stats')).data,
  });

  const profile = asRecord(profileQuery.data);
  const qr = asRecord(qrQuery.data);
  const doctorId = text(profile.doctorId);
  const doctorName = text(profile.fullName, 'Your doctor');
  const clinicName = text(profile.clinicName);
  const location = [text(profile.clinicAddress), text(profile.city), text(profile.state), text(profile.postalCode)]
    .filter(Boolean).join(', ');
  const mobile = text(profile.clinicContact) || text(profile.mobile);
  const referralLink = text(qr.referralUrl);
  const qrCodeUrl = text(qr.qrCodeUrl);
  const hasPatientFee = Number(profile.approvedPatientFee || 0) > 0;
  const qrDisabled = profile.qrCodeActive === false && hasPatientFee;
  const isLoading = profileQuery.isLoading || qrQuery.isLoading;
  const canUseQr = Boolean(doctorId && referralLink && qrCodeUrl && qrImageReady && !qrImageFailed && hasPatientFee && profile.qrCodeActive !== false);
  const scans = Number(qr.totalScans || 0);
  const registrations = Number(qr.totalRegistrations || 0);
  const paid = Number(qr.totalPaid || 0);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setActionMessage('Referral link copied.');
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setActionMessage('Clipboard unavailable. Select the link below to copy it manually.');
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${doctorName} · PhysioQR registration`,
          text: `Register with ${doctorName}${clinicName ? ` at ${clinicName}` : ''} through PhysioQR.`,
          url: referralLink,
        });
      } else {
        window.open(`https://wa.me/?text=${encodeURIComponent(`Register with ${doctorName} on PhysioQR: ${referralLink}`)}`, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      if ((error as Error)?.name !== 'AbortError') setActionMessage('Unable to share. Use Copy link instead.');
    }
  };

  const handleDownload = () => {
    if (!canUseQr) return;
    if (qrCodeUrl.startsWith('data:image/')) {
      const anchor = document.createElement('a');
      anchor.href = qrCodeUrl;
      anchor.download = `PhysioQR-${doctorId}-referral.png`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } else {
      window.open(qrCodeUrl, '_blank', 'noopener,noreferrer');
      setActionMessage('QR opened in a new tab; save the image from there.');
    }
  };

  if (profileQuery.isError || qrQuery.isError) {
    return <ErrorState
      title="Doctor referral could not load"
      message="Check doctor login and backend availability, then retry."
      onRetry={() => { profileQuery.refetch(); qrQuery.refetch(); }}
    />;
  }

  const poster = { doctorName, doctorId, clinicName, location, mobile, referralLink, qrCodeUrl };

  return (
    <div className="doctor-qr-page mx-auto min-w-0 max-w-6xl space-y-6">
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 0; }
          html, body { margin: 0 !important; width: 210mm !important; height: 297mm !important; overflow: hidden !important; background: #fff !important; }
          body * { visibility: hidden !important; }
          #doctor-referral-print, #doctor-referral-print * { visibility: visible !important; }
          #doctor-referral-print {
            display: block !important; position: fixed !important; inset: 0 auto auto 0 !important;
            width: 210mm !important; height: 297mm !important; margin: 0 !important; padding: 12mm !important;
            box-sizing: border-box !important; background: #fff !important; overflow: hidden !important;
            z-index: 99999 !important; color: #111827 !important;
            print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important;
          }
          #doctor-referral-print .referral-print-sheet {
            display: block !important; height: 273mm !important; border: 1px solid #d1d5db !important;
            border-radius: 5mm !important; overflow: hidden !important; background: #fff !important;
          }
          #doctor-referral-print img { print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important; }
          .doctor-qr-page { margin: 0 !important; padding: 0 !important; }
        }
      `}</style>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-primary-700">Grow your practice</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-neutral-950 sm:text-3xl">QR code & referral</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-neutral-500">
            Welcome patients with a clinic-ready referral poster. Print it for your desk or share the link directly.
          </p>
        </div>
        <button
          type="button" onClick={() => window.print()} disabled={!canUseQr}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Printer className="h-4 w-4" /> Print A4 poster
        </button>
      </header>

      {/* Active Fee Status Banner with Edit Option */}
      {hasPatientFee && profile.qrCodeActive !== false && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-emerald-950">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold">
                {`Patient Programme Fee: ₹${Number(profile.approvedPatientFee).toLocaleString('en-IN')}`}
                <span className="ml-2 font-semibold text-xs text-emerald-800">
                  {`(Doctor Earning: ₹${Math.round(Number(profile.approvedPatientFee) * 0.5).toLocaleString('en-IN')} · 50% split)`}
                </span>
              </p>
              <p className="text-xs text-emerald-700 mt-0.5">
                Your clinic reception QR standee and referral link are active.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsEditingFee(!isEditingFee)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3.5 py-2 text-xs font-semibold text-emerald-900 hover:bg-emerald-50 transition-colors shrink-0 shadow-sm"
          >
            <Edit3 className="h-3.5 w-3.5" />
            {isEditingFee ? 'Close Editor' : 'Update Fee'}
          </button>
        </div>
      )}

      {/* Inline Fee Editor when Doctor clicks Update Fee */}
      {isEditingFee && (
        <DoctorFeeSetupCard
          currentFee={Number(profile.approvedPatientFee || 0)}
          doctorName={doctorName}
          onFeeSaved={() => setIsEditingFee(false)}
        />
      )}

      {qrDisabled && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" /> Your referral QR is currently disabled. Contact administration to reactivate it.
        </div>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.14fr)_minmax(320px,.86fr)]">
        <div>
          {isLoading ? (
            <Skeleton className="h-[620px] w-full rounded-2xl" />
          ) : !hasPatientFee || !referralLink || !qrCodeUrl || profile.qrCodeActive === false ? (
            <DoctorFeeSetupCard
              currentFee={Number(profile.approvedPatientFee || 0)}
              doctorName={doctorName}
            />
          ) : (
            <ReferralPoster
              {...poster} imageLoaded={() => { setQrImageReady(true); setQrImageFailed(false); }}
              imageFailed={() => { setQrImageReady(false); setQrImageFailed(true); }}
            />
          )}
          {qrImageFailed && <p role="alert" className="mt-2 text-sm text-rose-700">QR image failed to load. Check your connection and reload this page.</p>}
        </div>

        <div className="space-y-5">
          <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-700"><Share2 className="h-5 w-5" /></div>
              <div>
                <h2 className="text-lg font-bold text-neutral-950">Share your referral</h2>
                <p className="text-xs text-neutral-500">Invite patients in a few seconds</p>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              <button type="button" onClick={handleCopy} disabled={!canUseQr}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? 'Link copied' : 'Copy referral link'}
              </button>
              <button type="button" onClick={handleShare} disabled={!canUseQr}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 disabled:opacity-50">
                <Share2 className="h-4 w-4" /> Share with patient
              </button>
              <button type="button" onClick={handleDownload} disabled={!canUseQr}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 disabled:opacity-50">
                <Download className="h-4 w-4" /> Download QR image
              </button>
            </div>
            <div className="mt-5 rounded-xl bg-neutral-50 p-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-neutral-500"><Link2 className="h-4 w-4" /> Your referral URL</div>
              <p className="mt-2 select-all break-all font-mono text-xs leading-6 text-neutral-700">{canUseQr ? referralLink : 'Available after setting patient fee'}</p>
              {canUseQr && referralLink && <a href={referralLink} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary-700 hover:underline">
                Open registration page <ExternalLink className="h-3.5 w-3.5" />
              </a>}
            </div>
            {actionMessage && <p role="status" className="mt-3 text-xs text-neutral-600">{actionMessage}</p>}
          </section>

          <section className="rounded-2xl border border-primary-100 bg-primary-50/60 p-5 sm:p-6">
            <div className="flex items-center gap-2 font-semibold text-neutral-900"><ShieldCheck className="h-5 w-5 text-primary-700" /> Clinic display checklist</div>
            <ol className="mt-4 space-y-3 text-sm leading-6 text-neutral-700">
              <li className="flex gap-3"><span className="font-bold text-primary-700">01</span> Set your patient programme fee above.</li>
              <li className="flex gap-3"><span className="font-bold text-primary-700">02</span> Print the A4 poster with your doctor and clinic details.</li>
              <li className="flex gap-3"><span className="font-bold text-primary-700">03</span> Place it at reception where patients can scan easily.</li>
              <li className="flex gap-3"><span className="font-bold text-primary-700">04</span> Patients scan the code and complete rehabilitation online.</li>
            </ol>
            <p className="mt-4 border-t border-primary-100 pt-3 text-xs text-neutral-500">The print version excludes conversion statistics, account navigation and internal commercial details.</p>
          </section>
        </div>
      </div>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary-700" />
          <h2 className="text-base font-bold text-neutral-900">Referral performance</h2>
          <span className="ml-auto text-xs text-neutral-500">Live statistics</span>
        </div>
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
          <QrMetric icon={QrCode} label="QR scans" value={scans} />
          <QrMetric icon={Users} label="Registrations" value={registrations} />
          <QrMetric icon={Wallet} label="Paid patients" value={paid} />
          <QrMetric icon={UserRoundCheck} label="Registration rate" value={formatPercent(registrations, scans)} />
          <QrMetric icon={TrendingUp} label="Payment conversion" value={formatPercent(paid, scans)} />
        </div>
      </section>

      {/* A print-only, full-bleed A4 poster. It is never visible in the portal UI. */}
      {!isLoading && canUseQr && <div id="doctor-referral-print" className="hidden" aria-hidden="true">
        <ReferralPoster {...poster} print />
      </div>}
    </div>
  );
}
