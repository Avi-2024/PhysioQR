import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, Copy, Download, Share2 } from 'lucide-react';
import apiClient from '@/lib/api-client';
import ErrorState from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';

type ApiRecord = Record<string, unknown>;

// Renders the live doctor QR code, referral link, and conversion metrics.
export default function DoctorQRReferralPage() {
  const [copied, setCopied] = useState(false);
  const profileQuery = useQuery({ queryKey: ['doctor-profile'], queryFn: async () => (await apiClient.get('/doctors/me/profile')).data });
  const qrQuery = useQuery({ queryKey: ['doctor-qr-stats'], queryFn: async () => (await apiClient.get('/doctors/me/qr-stats')).data });
  const profile = asRecord(profileQuery.data);
  const qr = asRecord(qrQuery.data);
  const referralLink = text(qr.referralUrl, `${window.location.origin}/register?doctor=${text(profile.doctorId)}`);
  const qrCodeUrl = text(qr.qrCodeUrl) || `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(referralLink)}`;
  const canShare = useMemo(() => typeof navigator !== 'undefined' && Boolean(navigator.share), []);
  const scans = Number(qr.totalScans || 0);
  const registrations = Number(qr.totalRegistrations || 0);
  const paid = Number(qr.totalPaid || 0);
  const registrationRate = scans > 0 ? `${((registrations / scans) * 100).toFixed(1)}%` : '0%';
  const paymentConversionRate = text(qr.conversionRate, scans > 0 ? `${((paid / scans) * 100).toFixed(1)}%` : '0%');

  const handleCopy = async () => {
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (canShare) {
      await navigator.share({ title: 'PhysioQR referral link', text: 'Start your doctor-guided rehabilitation program.', url: referralLink });
      return;
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(referralLink)}`, '_blank', 'noopener,noreferrer');
  };

  if (profileQuery.isError || qrQuery.isError) return <ErrorState title="QR code could not load" message="Check doctor login and backend availability." onRetry={() => { profileQuery.refetch(); qrQuery.refetch(); }} />;

  return (
    <div className="space-y-6 max-w-3xl mx-auto min-w-0">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-bold text-neutral-900">QR Code & Referral Link</h1>
        <p className="text-sm text-neutral-500">Display this QR code at your clinic desk or share the referral link.</p>
      </div>

      <div className="bg-white border border-neutral-200 rounded-2xl p-4 sm:p-6 md:p-8 text-center space-y-6 shadow-sm min-w-0">
        <div className="inline-block p-4 bg-white border-2 border-primary-100 rounded-2xl shadow-card">
          {qrQuery.isLoading ? <Skeleton className="w-56 h-56" /> : <img src={qrCodeUrl} alt="Doctor Referral QR Code" className="w-48 h-48 sm:w-56 sm:h-56 mx-auto rounded-lg" />}
        </div>

        <div>
          <h2 className="text-lg font-bold text-neutral-900">{text(profile.fullName, 'Doctor')}</h2>
          <p className="text-sm text-neutral-500">{text(profile.clinicName, 'Clinic')} | {text(profile.doctorId, 'Doctor ID')}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-5">
          <QrStat label="Scans" value={scans} />
          <QrStat label="Registrations" value={registrations} />
          <QrStat label="Paid" value={paid} />
          <QrStat label="Registration Rate" value={registrationRate} />
          <QrStat label="Payment Conversion" value={paymentConversionRate} />
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2 max-w-md mx-auto bg-neutral-50 border border-neutral-200 rounded-lg p-2 text-xs">
          <span className="truncate text-neutral-600 font-mono flex-1">{referralLink}</span>
          <button onClick={handleCopy} className="min-h-10 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded font-medium flex items-center justify-center gap-1 transition-colors">
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
          <a href={qrCodeUrl} download="physioqr-referral-qr.png" className="min-h-11 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm rounded-lg flex items-center justify-center gap-2 transition-colors">
            <Download className="w-4 h-4" /> Download QR
          </a>
          <button onClick={handleShare} className="min-h-11 px-4 py-2.5 border border-neutral-300 text-neutral-700 font-semibold text-sm rounded-lg flex items-center justify-center gap-2 hover:bg-neutral-50 transition-colors">
            <Share2 className="w-4 h-4" /> Share
          </button>
        </div>
      </div>
    </div>
  );
}

function QrStat({ label, value }: { label: string; value: number | string }) {
  return <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3"><div className="text-xl font-bold text-neutral-900">{value}</div><div className="text-xs text-neutral-500">{label}</div></div>;
}

function asRecord(value: unknown): ApiRecord {
  return value && typeof value === 'object' ? value as ApiRecord : {};
}

function text(value: unknown, fallback = '') {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value);
}
