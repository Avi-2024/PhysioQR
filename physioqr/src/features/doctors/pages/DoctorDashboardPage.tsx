import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, Banknote, Clock3, QrCode, TrendingUp, Users, Wallet } from 'lucide-react';
import apiClient from '@/lib/api-client';
import ErrorState from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatCurrency } from '@/lib/formatters';

type ApiRecord = Record<string, unknown>;

// Renders the doctor dashboard from live profile, QR, patient, and wallet APIs.
export default function DoctorDashboardPage() {
  const navigate = useNavigate();
  const profileQuery = useQuery({ queryKey: ['doctor-profile'], queryFn: async () => (await apiClient.get('/doctors/me/profile')).data });
  const summaryQuery = useQuery({ queryKey: ['doctor-summary'], queryFn: async () => (await apiClient.get('/doctors/me/summary')).data });
  const qrQuery = useQuery({ queryKey: ['doctor-qr-stats'], queryFn: async () => (await apiClient.get('/doctors/me/qr-stats')).data });

  const profile = asRecord(profileQuery.data);
  const summary = asRecord(summaryQuery.data);
  const summaryDoctor = asRecord(summary.doctor);
  const totals = asRecord(summary.totals);
  const qr = asRecord(qrQuery.data);
  const wallet = asRecord(summary.wallet);
  const isSplitModel = text(summaryDoctor.revenueModel || profile.revenueModel, 'split') === 'split';

  if (profileQuery.isError || summaryQuery.isError || qrQuery.isError) {
    return <ErrorState title="Doctor dashboard could not load" message="Check doctor login and backend availability." onRetry={() => { profileQuery.refetch(); summaryQuery.refetch(); qrQuery.refetch(); }} />;
  }

  return (
    <div className="space-y-6 min-w-0">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 break-words">
            Good morning, {text(profile.fullName, 'Doctor')}
          </h1>
          <p className="text-sm text-neutral-500">
            {text(profile.clinicName, 'Clinic not configured')} | Revenue Model:{' '}
            <strong className="text-primary-600">{isSplitModel ? `Split Model (${text(summaryDoctor.feeSharePercentage || profile.feeSharePercentage, '0')}%)` : 'Platform Fee Model'}</strong>
          </p>
        </div>
        <button onClick={() => navigate('/doctor/qr-referral')} className="flex min-h-11 w-full sm:w-auto items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm rounded-lg transition-colors">
          <QrCode className="w-4 h-4" /> View My QR Code
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard loading={qrQuery.isLoading} icon={QrCode} label="Total QR Scans" value={Number(qr.totalScans || 0)} tone="text-primary-600" />
        <MetricCard loading={summaryQuery.isLoading} icon={Users} label="Patient Registrations" value={Number(totals.referredPatients || 0)} tone="text-purple-600" />
        <MetricCard loading={summaryQuery.isLoading} icon={TrendingUp} label="Paid Patients" value={Number(totals.paidPatients || 0)} tone="text-emerald-600" />
        <MetricCard loading={summaryQuery.isLoading} icon={Users} label="Active Patients" value={Number(totals.activePatients || 0)} tone="text-sky-600" />
        <MetricCard loading={summaryQuery.isLoading} icon={Banknote} label="Total Revenue Generated" value={formatCurrency(Number(totals.totalRevenue || 0))} tone="text-violet-600" />
        <MetricCard loading={summaryQuery.isLoading} icon={Clock3} label="Pending Fee Share" value={formatCurrency(Number(totals.pendingFeeShare || 0))} tone="text-amber-600" />
        <MetricCard loading={summaryQuery.isLoading} icon={Wallet} label={isSplitModel ? 'Available Fee Share' : 'Platform Fee Active'} value={isSplitModel ? formatCurrency(Number(totals.availableFeeShare || 0)) : 'Active'} tone="text-teal-600" />
        <MetricCard loading={summaryQuery.isLoading} icon={ArrowUpRight} label="Withdrawal Requested" value={formatCurrency(Number(totals.withdrawalRequested || 0))} tone="text-orange-600" />
        <MetricCard loading={summaryQuery.isLoading} icon={Banknote} label="Paid Fee Share" value={formatCurrency(Number(totals.paidFeeShare || 0))} tone="text-emerald-700" />
      </div>

      {isSplitModel && (
        <div className="bg-gradient-to-r from-primary-900 to-neutral-900 text-white rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="min-w-0">
            <h3 className="text-lg font-bold">Doctor Wallet Balance</h3>
            <p className="text-xs text-primary-200 mt-1">
              Approved patient fee {formatCurrency(Number(summaryDoctor.approvedPatientFee || 0))} | Basis {labelize(summaryDoctor.feeShareCalculationBasis)} | Holding {Number(summaryDoctor.feeShareHoldingDays || 0)} days
            </p>
          </div>
          <div className="flex w-full md:w-auto flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <span className="text-2xl sm:text-3xl font-extrabold text-amber-400">{formatCurrency(Number(wallet.availableBalance || 0))}</span>
            <button onClick={() => navigate('/doctor/withdrawals')} className="min-h-11 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-neutral-900 font-bold text-sm rounded-lg transition-colors flex items-center justify-center gap-1.5">
              <ArrowUpRight className="w-4 h-4" /> Request Withdrawal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function labelize(value: unknown) {
  return text(value, '-').replace(/_/g, ' ');
}

function MetricCard({ loading, icon: Icon, label, value, tone }: { loading: boolean; icon: React.ElementType; label: string; value: string | number; tone: string }) {
  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-4 sm:p-5 shadow-sm min-w-0">
      <Icon className={`w-8 h-8 ${tone} mb-2`} />
      {loading ? <Skeleton className="h-8 w-24" /> : <p className="text-xl sm:text-2xl font-bold text-neutral-900 break-words">{value}</p>}
      <p className="text-sm text-neutral-500">{label}</p>
    </div>
  );
}

function asRecord(value: unknown): ApiRecord {
  return value && typeof value === 'object' ? value as ApiRecord : {};
}

function text(value: unknown, fallback = '') {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value);
}
