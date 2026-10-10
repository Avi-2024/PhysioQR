import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight, Check, Copy, Download, ExternalLink, Link2, MapPin,
  Phone, Printer, QrCode, Share2, ShieldCheck, TrendingUp, UserRoundCheck,
  Users, Wallet, AlertCircle,
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
      <div className="border-t border-neutral-100 px-6 py-4 text-center text-xs text-neutral-500">
        Powered by PhysioQR · Doctor-guided rehabilitation
      </div>
    </article>
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
  // The backend referral URL and generated QR must point to the same registration destination.
  const referralLink = text(qr.referralUrl);
  const qrCodeUrl = text(qr.qrCodeUrl) || text(profile.qrCodeUrl) ||
    (referralLink ? `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(referralLink)}` : '');
  const qrDisabled = profile.qrCodeActive === false;
  const isLoading = profileQuery.isLoading || qrQuery.isLoading;
  const canUseQr = Boolean(doctorId && referralLink && qrCodeUrl && qrImageReady && !qrImageFailed && !qrDisabled);
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
      // Cross-origin images cannot always be downloaded with an anchor's download attribute.
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

      {qrDisabled && <div role="alert" className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" /> Your referral QR is currently disabled. Contact administration to reactivate it.
      </div>}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.14fr)_minmax(320px,.86fr)]">
        <div>
          {isLoading ? <Skeleton className="h-[620px] w-full rounded-2xl" /> :
            !doctorId || !referralLink || !qrCodeUrl ? (
              <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center">
                <AlertCircle className="mx-auto h-8 w-8 text-amber-500" />
                <h2 className="mt-3 font-semibold">Referral details are not configured</h2>
                <p className="mt-2 text-sm text-neutral-500">Ask administration to generate an active doctor QR and referral URL.</p>
              </div>
            ) : <ReferralPoster
              {...poster} imageLoaded={() => { setQrImageReady(true); setQrImageFailed(false); }}
              imageFailed={() => { setQrImageReady(false); setQrImageFailed(true); }}
            />
          }
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
              <p className="mt-2 select-all break-all font-mono text-xs leading-6 text-neutral-700">{referralLink || 'Not available'}</p>
              {referralLink && <a href={referralLink} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary-700 hover:underline">
                Open registration page <ExternalLink className="h-3.5 w-3.5" />
              </a>}
            </div>
            {actionMessage && <p role="status" className="mt-3 text-xs text-neutral-600">{actionMessage}</p>}
          </section>

          <section className="rounded-2xl border border-primary-100 bg-primary-50/60 p-5 sm:p-6">
            <div className="flex items-center gap-2 font-semibold text-neutral-900"><ShieldCheck className="h-5 w-5 text-primary-700" /> Clinic display checklist</div>
            <ol className="mt-4 space-y-3 text-sm leading-6 text-neutral-700">
              <li className="flex gap-3"><span className="font-bold text-primary-700">01</span> Print the A4 poster with your doctor and clinic details.</li>
              <li className="flex gap-3"><span className="font-bold text-primary-700">02</span> Place it at reception where patients can scan easily.</li>
              <li className="flex gap-3"><span className="font-bold text-primary-700">03</span> Patients scan the code and complete registration online.</li>
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
