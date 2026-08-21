import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  Bell,
  Clock,
  CreditCard,
  RefreshCw,
  ShieldAlert,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
} from 'lucide-react';
import { queryKeys } from '@/app/query-client';
import apiClient from '@/lib/api-client';
import { formatCurrency } from '@/lib/formatters';

interface AdminStats {
  totalAgents: number;
  totalDoctors: number;
  activeDoctors: number;
  pendingApprovals: number;
  suspendedDoctors: number;
  totalQrScans: number;
  totalPatients: number;
  uniquePaidPatients: number;
  successfulPayments: number;
  activePrograms: number;
  todayRevenue: number;
  monthlyRevenue: number;
  totalDoctorFeeShare: number;
  physioQrEarnings: number;
  pendingWithdrawals: number;
  pendingWithdrawalAmount: number;
  completedPayouts: number;
  completedPayoutAmount: number;
  refundedPayments: number;
  totalRefundAmount: number;
  highRiskAssessments: number;
  openSupportTickets: number;
}

type ApiRecord = Record<string, unknown>;

const emptyAdminStats: AdminStats = {
  totalAgents: 0,
  totalDoctors: 0,
  activeDoctors: 0,
  pendingApprovals: 0,
  suspendedDoctors: 0,
  totalQrScans: 0,
  totalPatients: 0,
  uniquePaidPatients: 0,
  successfulPayments: 0,
  activePrograms: 0,
  todayRevenue: 0,
  monthlyRevenue: 0,
  totalDoctorFeeShare: 0,
  physioQrEarnings: 0,
  pendingWithdrawals: 0,
  pendingWithdrawalAmount: 0,
  completedPayouts: 0,
  completedPayoutAmount: 0,
  refundedPayments: 0,
  totalRefundAmount: 0,
  highRiskAssessments: 0,
  openSupportTickets: 0,
};

export function normalizeAdminDashboard(input: unknown = {}): AdminStats {
  const source = input && typeof input === 'object' ? (input as Record<string, unknown>) : {};
  const number = (key: string, fallbackKey?: string) =>
    Number(source[key] ?? (fallbackKey ? source[fallbackKey] : undefined) ?? 0);

  return {
    totalAgents: number('totalAgents'),
    totalDoctors: number('totalDoctors'),
    activeDoctors: number('activeDoctors'),
    pendingApprovals: number('pendingApprovals'),
    suspendedDoctors: number('suspendedDoctors'),
    totalQrScans: number('totalQrScans'),
    totalPatients: number('totalPatients'),
    uniquePaidPatients: number('uniquePaidPatients', 'totalPaidPatients'),
    successfulPayments: number('successfulPayments'),
    activePrograms: number('activePrograms'),
    todayRevenue: number('todayRevenue'),
    monthlyRevenue: number('monthlyRevenue'),
    totalDoctorFeeShare: number('totalDoctorFeeShare'),
    physioQrEarnings: number('physioQrEarnings'),
    pendingWithdrawals: number('pendingWithdrawals'),
    pendingWithdrawalAmount: number('pendingWithdrawalAmount'),
    completedPayouts: number('completedPayouts'),
    completedPayoutAmount: number('completedPayoutAmount'),
    refundedPayments: number('refundedPayments', 'totalRefunds'),
    totalRefundAmount: number('totalRefundAmount'),
    highRiskAssessments: number('highRiskAssessments'),
    openSupportTickets: number('openSupportTickets', 'openTickets'),
  };
}

function extractItems(payload: unknown): ApiRecord[] {
  if (Array.isArray(payload)) return payload as ApiRecord[];
  if (!payload || typeof payload !== 'object') return [];

  const record = payload as { items?: unknown; data?: unknown; docs?: unknown };
  if (Array.isArray(record.items)) return record.items as ApiRecord[];
  if (Array.isArray(record.data)) return record.data as ApiRecord[];
  if (Array.isArray(record.docs)) return record.docs as ApiRecord[];
  return [];
}

function text(value: unknown, fallback = '—') {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value);
}

function nested(record: ApiRecord, path: string) {
  return path.split('.').reduce<unknown>((current, key) => {
    if (!current || typeof current !== 'object') return undefined;
    return (current as ApiRecord)[key];
  }, record);
}

function formatDate(value: unknown) {
  if (!value) return '—';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

function statusClasses(status: string) {
  const value = status.toLowerCase();
  if (['successful', 'paid', 'approved', 'active'].includes(value)) return 'bg-emerald-50 text-emerald-700 ring-emerald-600/10';
  if (['failed', 'rejected', 'suspended', 'cancelled'].includes(value)) return 'bg-rose-50 text-rose-700 ring-rose-600/10';
  if (['pending', 'submitted', 'under_review', 'processing'].includes(value)) return 'bg-amber-50 text-amber-700 ring-amber-600/10';
  return 'bg-neutral-100 text-neutral-700 ring-neutral-600/10';
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" aria-label="Loading admin dashboard">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-32 rounded-2xl border border-neutral-200 bg-neutral-100" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="h-80 rounded-2xl border border-neutral-200 bg-neutral-100" />
        <div className="h-80 rounded-2xl border border-neutral-200 bg-neutral-100" />
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const navigate = useNavigate();

  const dashboardQuery = useQuery<AdminStats>({
    queryKey: queryKeys.adminDashboard,
    queryFn: () => apiClient.get('/admin/dashboard').then((response) => response.data),
  });

  const pendingDoctorsQuery = useQuery({
    queryKey: ['admin-dashboard', 'pending-doctors'],
    queryFn: () =>
      apiClient
        .get('/admin/doctors', {
          params: { status: 'submitted', limit: 5, sortBy: 'createdAt', sortOrder: 'desc' },
        })
        .then((response) => response.data),
  });

  const recentPatientsQuery = useQuery({
    queryKey: ['admin-dashboard', 'recent-patients'],
    queryFn: () =>
      apiClient
        .get('/admin/patients', { params: { limit: 5, sortBy: 'createdAt', sortOrder: 'desc' } })
        .then((response) => response.data),
  });

  const refreshAll = () => {
    void Promise.all([
      dashboardQuery.refetch(),
      pendingDoctorsQuery.refetch(),
      recentPatientsQuery.refetch(),
    ]);
  };

  if (dashboardQuery.isLoading) {
    return (
      <div className="min-w-0 space-y-6">
        <PageHeader isFetching={false} onRefresh={refreshAll} />
        <DashboardSkeleton />
      </div>
    );
  }

  if (dashboardQuery.isError || !dashboardQuery.data) {
    return (
      <div className="min-w-0 space-y-6">
        <PageHeader isFetching={dashboardQuery.isFetching} onRefresh={refreshAll} />
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
            <div>
              <h2 className="font-semibold text-rose-900">Dashboard data is unavailable</h2>
              <p className="mt-1 text-sm leading-6 text-rose-700">
                No fallback business values are being shown because the live admin dashboard API could not be loaded.
              </p>
              <button
                type="button"
                onClick={refreshAll}
                className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-800"
              >
                <RefreshCw className="h-4 w-4" /> Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const stats = normalizeAdminDashboard(dashboardQuery.data);
  const pendingDoctors = extractItems(pendingDoctorsQuery.data);
  const recentPatients = extractItems(recentPatientsQuery.data);

  const primaryMetrics = [
    {
      label: 'Total Doctors',
      value: stats.totalDoctors.toLocaleString('en-IN'),
      detail: `${stats.activeDoctors.toLocaleString('en-IN')} approved`,
      icon: UserCheck,
      href: '/admin/doctors',
    },
    {
      label: 'Total Patients',
      value: stats.totalPatients.toLocaleString('en-IN'),
      detail: `${stats.uniquePaidPatients.toLocaleString('en-IN')} paid patients`,
      icon: Users,
      href: '/admin/patients',
    },
    {
      label: 'Monthly Revenue',
      value: formatCurrency(stats.monthlyRevenue),
      detail: `${formatCurrency(stats.todayRevenue)} today`,
      icon: TrendingUp,
      href: '/admin/reports',
    },
    {
      label: 'Active Programs',
      value: stats.activePrograms.toLocaleString('en-IN'),
      detail: `${stats.successfulPayments.toLocaleString('en-IN')} verified payments`,
      icon: Activity,
      href: '/admin/programs',
    },
  ];

  const actionItems = [
    {
      label: 'Doctor approvals',
      value: stats.pendingApprovals.toLocaleString('en-IN'),
      description: 'Submitted doctors waiting for admin review',
      href: '/admin/doctors?status=submitted',
      icon: Clock,
      tone: 'bg-amber-50 text-amber-700',
    },
    {
      label: 'High-risk assessments',
      value: stats.highRiskAssessments.toLocaleString('en-IN'),
      description: 'Assessments requiring manual safety review',
      href: '/admin/risk-reviews',
      icon: ShieldAlert,
      tone: 'bg-rose-50 text-rose-700',
    },
    {
      label: 'Open withdrawals',
      value: stats.pendingWithdrawals.toLocaleString('en-IN'),
      description: `${formatCurrency(stats.pendingWithdrawalAmount)} requested`,
      href: '/admin/withdrawals',
      icon: Wallet,
      tone: 'bg-violet-50 text-violet-700',
    },
    {
      label: 'Open support tickets',
      value: stats.openSupportTickets.toLocaleString('en-IN'),
      description: 'Open, in-progress, waiting, and reopened tickets',
      href: '/admin/support',
      icon: Bell,
      tone: 'bg-sky-50 text-sky-700',
    },
  ];

  const financialItems = [
    { label: "Today's collection", value: formatCurrency(stats.todayRevenue) },
    { label: 'This month', value: formatCurrency(stats.monthlyRevenue) },
    { label: 'Doctor fee share', value: formatCurrency(stats.totalDoctorFeeShare) },
    { label: 'PhysioQR earnings', value: formatCurrency(stats.physioQrEarnings) },
    { label: 'Completed refunds', value: formatCurrency(stats.totalRefundAmount) },
    { label: 'Completed payouts', value: formatCurrency(stats.completedPayoutAmount) },
  ];

  const funnelItems = [
    { label: 'QR scans', value: stats.totalQrScans },
    { label: 'Registered patients', value: stats.totalPatients },
    { label: 'Paid patients', value: stats.uniquePaidPatients },
    { label: 'Active programs', value: stats.activePrograms },
  ];

  return (
    <div className="min-w-0 space-y-6">
      <PageHeader isFetching={dashboardQuery.isFetching} onRefresh={refreshAll} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {primaryMetrics.map((metric) => (
          <button
            key={metric.label}
            type="button"
            onClick={() => navigate(metric.href)}
            className="group rounded-2xl border border-neutral-200 bg-white p-5 text-left transition hover:border-primary-200 hover:shadow-sm focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-100"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-neutral-500">{metric.label}</p>
                <p className="mt-2 break-words text-2xl font-bold tracking-tight text-neutral-950">{metric.value}</p>
                <p className="mt-1 text-xs text-neutral-500">{metric.detail}</p>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
                <metric.icon className="h-5 w-5" />
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-2xl border border-neutral-200 bg-white">
          <div className="border-b border-neutral-200 px-5 py-4 sm:px-6">
            <h2 className="font-semibold text-neutral-950">Action required</h2>
            <p className="mt-1 text-sm text-neutral-500">Queues that need an admin decision or follow-up.</p>
          </div>
          <div className="divide-y divide-neutral-100">
            {actionItems.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => navigate(item.href)}
                className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-neutral-50 sm:px-6"
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.tone}`}>
                  <item.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="font-medium text-neutral-900">{item.label}</p>
                    <p className="text-lg font-bold text-neutral-950">{item.value}</p>
                  </div>
                  <p className="mt-0.5 text-xs text-neutral-500">{item.description}</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-neutral-400" />
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-neutral-950">Financial overview</h2>
              <p className="mt-1 text-sm text-neutral-500">Verified backend totals.</p>
            </div>
            <CreditCard className="h-5 w-5 text-neutral-400" />
          </div>
          <dl className="mt-5 divide-y divide-neutral-100">
            {financialItems.map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <dt className="text-sm text-neutral-500">{item.label}</dt>
                <dd className="text-sm font-semibold text-neutral-950">{item.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      <section className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-semibold text-neutral-950">Referral and program flow</h2>
            <p className="mt-1 text-sm text-neutral-500">Operational counts from QR scan through active rehabilitation access.</p>
          </div>
          <button type="button" onClick={() => navigate('/admin/referrals')} className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-700 hover:text-primary-800">
            View referrals <ArrowRight className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {funnelItems.map((item, index) => (
            <div key={item.label} className="relative rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-4">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{item.label}</p>
              <p className="mt-2 text-2xl font-bold text-neutral-950">{item.value.toLocaleString('en-IN')}</p>
              {index < funnelItems.length - 1 && (
                <ArrowRight className="absolute -right-2 top-1/2 hidden h-4 w-4 -translate-y-1/2 text-neutral-300 lg:block" />
              )}
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <DashboardTableShell
          title="Doctors awaiting approval"
          description="Latest submitted doctor profiles. Approval actions stay on the doctor detail page."
          actionLabel="View all"
          onAction={() => navigate('/admin/doctors?status=submitted')}
        >
          {pendingDoctorsQuery.isLoading ? (
            <TableLoading />
          ) : pendingDoctorsQuery.isError ? (
            <TableMessage message="Doctor approval queue could not be loaded." />
          ) : pendingDoctors.length === 0 ? (
            <TableMessage message="No submitted doctors are waiting for approval." />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200 text-sm">
                <thead className="bg-neutral-50">
                  <tr>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Specialization</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead align="right">Action</TableHead>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 bg-white">
                  {pendingDoctors.map((record) => {
                    const id = text(record.doctorId || record.id || record._id, '');
                    return (
                      <tr key={id || text(record._id)} className="hover:bg-neutral-50/70">
                        <TableCell strong>{text(record.fullName || record.name)}</TableCell>
                        <TableCell>{text(record.specialization || record.qualification)}</TableCell>
                        <TableCell>{text(nested(record, 'agent.fullName'), 'Direct/Admin')}</TableCell>
                        <TableCell>{formatDate(record.submittedAt || record.createdAt)}</TableCell>
                        <TableCell align="right">
                          <button
                            type="button"
                            disabled={!id}
                            onClick={() => id && navigate(`/admin/doctors/${id}`)}
                            className="inline-flex items-center gap-1 text-sm font-semibold text-primary-700 hover:text-primary-800 disabled:cursor-not-allowed disabled:text-neutral-400"
                          >
                            Review <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        </TableCell>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </DashboardTableShell>

        <DashboardTableShell
          title="Recent patients"
          description="Latest patient registrations from the live patient API."
          actionLabel="View all"
          onAction={() => navigate('/admin/patients')}
        >
          {recentPatientsQuery.isLoading ? (
            <TableLoading />
          ) : recentPatientsQuery.isError ? (
            <TableMessage message="Recent patients could not be loaded." />
          ) : recentPatients.length === 0 ? (
            <TableMessage message="No patient registrations are available yet." />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200 text-sm">
                <thead className="bg-neutral-50">
                  <tr>
                    <TableHead>Patient</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Registered</TableHead>
                    <TableHead align="right">Action</TableHead>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 bg-white">
                  {recentPatients.map((record) => {
                    const id = text(record.patientId || record.id || record._id, '');
                    const paymentStatus = text(record.paymentStatus || record.lastPaymentStatus);
                    return (
                      <tr key={id || text(record._id)} className="hover:bg-neutral-50/70">
                        <TableCell strong>{text(record.fullName || record.name)}</TableCell>
                        <TableCell>{text(nested(record, 'referringDoctor.fullName') || nested(record, 'doctor.fullName'))}</TableCell>
                        <TableCell>
                          {paymentStatus === '—' ? (
                            <span className="text-neutral-400">—</span>
                          ) : (
                            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ring-1 ring-inset ${statusClasses(paymentStatus)}`}>
                              {paymentStatus.replaceAll('_', ' ')}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{formatDate(record.registrationDate || record.createdAt)}</TableCell>
                        <TableCell align="right">
                          <button
                            type="button"
                            disabled={!id}
                            onClick={() => id && navigate(`/admin/patients/${id}`)}
                            className="inline-flex items-center gap-1 text-sm font-semibold text-primary-700 hover:text-primary-800 disabled:cursor-not-allowed disabled:text-neutral-400"
                          >
                            View <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        </TableCell>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </DashboardTableShell>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <CompactStat label="Agents" value={stats.totalAgents} onClick={() => navigate('/admin/agents')} />
        <CompactStat label="Suspended doctors" value={stats.suspendedDoctors} onClick={() => navigate('/admin/doctors?status=suspended')} />
        <CompactStat label="Refunded payments" value={stats.refundedPayments} onClick={() => navigate('/admin/refunds')} />
        <CompactStat label="Completed payouts" value={stats.completedPayouts} onClick={() => navigate('/admin/payouts')} />
      </div>
    </div>
  );
}

function PageHeader({ isFetching, onRefresh }: { isFetching: boolean; onRefresh: () => void }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-950 sm:text-3xl">Admin Dashboard</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-neutral-500">
          Live operational and financial overview of the PhysioQR platform.
        </p>
      </div>
      <button
        type="button"
        onClick={onRefresh}
        disabled={isFetching}
        className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3.5 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-wait disabled:opacity-60"
      >
        <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
        Refresh
      </button>
    </div>
  );
}

function DashboardTableShell({
  title,
  description,
  actionLabel,
  onAction,
  children,
}: {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
      <div className="flex items-start justify-between gap-4 border-b border-neutral-200 px-5 py-4 sm:px-6">
        <div>
          <h2 className="font-semibold text-neutral-950">{title}</h2>
          <p className="mt-1 text-sm text-neutral-500">{description}</p>
        </div>
        <button type="button" onClick={onAction} className="shrink-0 text-sm font-semibold text-primary-700 hover:text-primary-800">
          {actionLabel}
        </button>
      </div>
      {children}
    </section>
  );
}

function TableHead({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <th className={`whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-neutral-500 ${align === 'right' ? 'text-right' : 'text-left'}`}>
      {children}
    </th>
  );
}

function TableCell({
  children,
  align = 'left',
  strong = false,
}: {
  children: React.ReactNode;
  align?: 'left' | 'right';
  strong?: boolean;
}) {
  return (
    <td className={`whitespace-nowrap px-4 py-3.5 ${align === 'right' ? 'text-right' : 'text-left'} ${strong ? 'font-medium text-neutral-900' : 'text-neutral-600'}`}>
      {children}
    </td>
  );
}

function TableLoading() {
  return (
    <div className="space-y-3 p-5 sm:p-6">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="h-10 animate-pulse rounded-lg bg-neutral-100" />
      ))}
    </div>
  );
}

function TableMessage({ message }: { message: string }) {
  return <div className="px-5 py-10 text-center text-sm text-neutral-500 sm:px-6">{message}</div>;
}

function CompactStat({ label, value, onClick }: { label: string; value: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-left transition hover:border-primary-200 hover:bg-primary-50/30"
    >
      <p className="text-xs font-medium text-neutral-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-neutral-950">{value.toLocaleString('en-IN')}</p>
    </button>
  );
}
