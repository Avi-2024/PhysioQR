import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Clock,
  CreditCard,
  FileText,
  LayoutDashboard,
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
import { cn } from '@/lib/cn';

interface AdminStats {
  totalAgents: number;
  totalDoctors: number;
  activeDoctors: number;
  pendingApprovals: number;
  suspendedDoctors: number;
  totalQrScans: number;
  totalPatients: number;
  paidPatients: number;
  activePrograms: number;
  todayRevenue: number;
  monthlyRevenue: number;
  pendingPayouts: number;
  completedPayouts: number;
  totalRefunds: number;
  highRiskAssessments: number;
  openSupportTickets: number;
  platformRevenue: number;
  doctorFeeSharePayable: number;
  pendingDoctors: { id: string; name: string; specialization: string; agent: string; submittedAt: string }[];
  recentPatients: { id: string; name: string; doctor: string; programme: string; paymentStatus: string; date: string }[];
}

// This screen shows the main admin operating picture and links into the core management modules.
export default function AdminDashboardPage() {
  const navigate = useNavigate();

  const { data, isLoading, isError, refetch } = useQuery<AdminStats>({
    queryKey: queryKeys.adminDashboard,
    queryFn: () => apiClient.get('/admin/dashboard').then((r) => r.data.data),
  });

  const stats: AdminStats = data ?? {
    totalAgents: 8,
    totalDoctors: 34,
    activeDoctors: 28,
    pendingApprovals: 4,
    suspendedDoctors: 2,
    totalQrScans: 1240,
    totalPatients: 287,
    paidPatients: 234,
    activePrograms: 198,
    todayRevenue: 12500,
    monthlyRevenue: 287400,
    pendingPayouts: 45600,
    completedPayouts: 312000,
    totalRefunds: 4500,
    highRiskAssessments: 3,
    openSupportTickets: 7,
    platformRevenue: 112000,
    doctorFeeSharePayable: 175400,
    pendingDoctors: [
      { id: 'DR004', name: 'Dr. Ananya Sen', specialization: 'Physiotherapist', agent: 'Amit Kumar', submittedAt: '2026-08-05' },
      { id: 'DR005', name: 'Dr. Kiran Mehta', specialization: 'Orthopedic', agent: 'Suresh Verma', submittedAt: '2026-08-04' },
      { id: 'DR006', name: 'Dr. Rahul Joshi', specialization: 'Sports Medicine', agent: 'Amit Kumar', submittedAt: '2026-08-03' },
    ],
    recentPatients: [
      { id: 'PAT-101', name: 'Ramesh Gupta', doctor: 'Dr. Rajesh Sharma', programme: 'Lower Back Recovery', paymentStatus: 'successful', date: '2026-08-06' },
      { id: 'PAT-102', name: 'Sunita Kapoor', doctor: 'Dr. Priya Patel', programme: 'Knee Strengthening', paymentStatus: 'successful', date: '2026-08-06' },
      { id: 'PAT-103', name: 'Vikram Malhotra', doctor: 'Dr. Rajesh Sharma', programme: 'Lower Back Recovery', paymentStatus: 'pending', date: '2026-08-06' },
    ],
  };

  const metrics = [
    { title: 'Total Agents', value: stats.totalAgents, icon: Users, tone: 'bg-sky-50 text-sky-600', href: '/admin/agents' },
    { title: 'Total Doctors', value: stats.totalDoctors, icon: UserCheck, tone: 'bg-primary-50 text-primary-600', href: '/admin/doctors' },
    { title: 'Pending Approvals', value: stats.pendingApprovals, icon: Clock, tone: 'bg-amber-50 text-amber-600', href: '/admin/doctors?status=pending' },
    { title: 'Suspended Doctors', value: stats.suspendedDoctors, icon: ShieldAlert, tone: 'bg-rose-50 text-rose-600', href: '/admin/doctors?status=suspended' },
    { title: 'QR Scans', value: stats.totalQrScans, icon: Activity, tone: 'bg-teal-50 text-teal-600', href: '/admin/reports' },
    { title: 'Paid Patients', value: stats.paidPatients, icon: CreditCard, tone: 'bg-emerald-50 text-emerald-600', href: '/admin/patients' },
    { title: 'Monthly Revenue', value: formatCurrency(stats.monthlyRevenue), icon: TrendingUp, tone: 'bg-violet-50 text-violet-600', href: '/admin/reports' },
    { title: 'Pending Payouts', value: formatCurrency(stats.pendingPayouts), icon: Wallet, tone: 'bg-orange-50 text-orange-600', href: '/admin/withdrawals' },
  ];

  const moduleCards = [
    { title: 'Agents', desc: 'Register clinics, follow-ups, and onboarding flow.', href: '/admin/agents' },
    { title: 'Doctors', desc: 'Approve doctors, assign fees, and manage QR status.', href: '/admin/doctors' },
    { title: 'Patients', desc: 'Track registrations, payments, and program access.', href: '/admin/patients' },
    { title: 'Payments', desc: 'Review collections, refunds, and transaction status.', href: '/admin/payments' },
    { title: 'Withdrawals', desc: 'Approve doctor payout requests and settlement flow.', href: '/admin/withdrawals' },
    { title: 'Reports', desc: 'View financial, operational, and conversion reports.', href: '/admin/reports' },
    { title: 'Settings', desc: 'Configure platform defaults and admin controls.', href: '/admin/settings' },
  ];

  const actionItems = [
    { label: 'Doctors awaiting approval', value: stats.pendingApprovals, href: '/admin/doctors?status=pending', tone: 'text-amber-700 bg-amber-50' },
    { label: 'High-risk assessments', value: stats.highRiskAssessments, href: '/admin/risk-reviews', tone: 'text-rose-700 bg-rose-50' },
    { label: 'Pending doctor payouts', value: formatCurrency(stats.pendingPayouts), href: '/admin/withdrawals', tone: 'text-violet-700 bg-violet-50' },
    { label: 'Open support tickets', value: stats.openSupportTickets, href: '/admin/support', tone: 'text-sky-700 bg-sky-50' },
    { label: 'Payment reconciliation checks', value: 7, href: '/admin/reconciliation', tone: 'text-teal-700 bg-teal-50' },
  ];

  const financialOverview = [
    { label: "Today's Collection", value: formatCurrency(stats.todayRevenue) },
    { label: 'This Month', value: formatCurrency(stats.monthlyRevenue) },
    { label: 'Doctor Fee Share', value: formatCurrency(stats.doctorFeeSharePayable) },
    { label: 'PhysioQR Revenue', value: formatCurrency(stats.platformRevenue) },
    { label: 'Refunds', value: formatCurrency(stats.totalRefunds) },
    { label: 'Pending Payouts', value: formatCurrency(stats.pendingPayouts) },
  ];

  const referralFunnel = [
    { label: 'QR Scanned', value: stats.totalQrScans },
    { label: 'Registered', value: stats.totalPatients },
    { label: 'Paid', value: stats.paidPatients },
    { label: 'Program Active', value: stats.activePrograms },
  ];

  return (
    <div className="space-y-6 min-w-0">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-[11px] font-extrabold tracking-[0.08em] text-teal-700">
            <LayoutDashboard className="h-3.5 w-3.5" />
            ADMIN COMMAND CENTRE
          </div>
          <h1 className="mt-3 text-2xl sm:text-3xl font-bold text-neutral-900">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-neutral-500">Platform overview for doctors, agents, patients, payments, payouts, and support.</p>
        </div>

        <div className="flex w-full sm:w-auto flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <button onClick={() => refetch()} className="flex min-h-11 items-center justify-center gap-2 px-4 py-2.5 border border-neutral-300 text-neutral-700 text-sm font-medium rounded-lg hover:bg-neutral-50 transition-colors">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button onClick={() => navigate('/admin/doctors/new')} className="flex min-h-11 items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-lg transition-colors">
            <ArrowUpRight className="w-4 h-4" /> New Doctor
          </button>
        </div>
      </div>

      {isError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          Live dashboard data could not be loaded. Showing fallback admin metrics.
        </div>
      )}

      {stats.pendingApprovals > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <Bell className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-900 font-medium">
            {stats.pendingApprovals} doctor approvals are waiting.{' '}
            <button onClick={() => navigate('/admin/doctors?status=pending')} className="underline font-semibold">
              Review queue
            </button>
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {metrics.map((metric) => (
          <button key={metric.title} onClick={() => navigate(metric.href)} className="card p-4 sm:p-5 text-left min-w-0 hover:shadow-card-hover transition-shadow">
            <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center mb-3', metric.tone)}>
              <metric.icon className="w-5 h-5" />
            </div>
            <div className="text-2xl font-bold text-neutral-900 break-words">{metric.value}</div>
            <div className="mt-1 text-sm font-medium text-neutral-600">{metric.title}</div>
          </button>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="card p-5 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-neutral-900">Action Required</h2>
              <p className="text-sm text-neutral-500">Priority operational queues that need admin attention.</p>
            </div>
            <Bell className="h-5 w-5 text-neutral-400" />
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {actionItems.map((item) => (
              <button
                key={item.label}
                onClick={() => navigate(item.href)}
                className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-white px-4 py-3 text-left hover:border-primary-200 hover:bg-primary-50/40"
              >
                <span className="text-sm font-semibold text-neutral-800">{item.label}</span>
                <span className={cn('rounded-full px-2.5 py-1 text-xs font-bold', item.tone)}>{item.value}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="card p-5 min-w-0">
          <h2 className="font-semibold text-neutral-900">Financial Overview</h2>
          <p className="text-sm text-neutral-500">Ledger-facing values from payments, fee share, refunds, and payouts.</p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {financialOverview.map((item) => (
              <div key={item.label} className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                <div className="text-xs font-semibold text-neutral-500">{item.label}</div>
                <div className="mt-1 text-base font-bold text-neutral-900">{item.value}</div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="card p-5 min-w-0">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-neutral-900">Referral Funnel</h2>
            <p className="text-sm text-neutral-500">QR scan to active programme conversion snapshot.</p>
          </div>
          <button onClick={() => navigate('/admin/referrals')} className="text-sm font-semibold text-primary-700">
            Open referral tracking
          </button>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-4">
          {referralFunnel.map((step, index) => (
            <div key={step.label} className="relative rounded-lg border border-neutral-200 bg-white p-4">
              <div className="text-xs font-bold uppercase tracking-wide text-neutral-400">Step {index + 1}</div>
              <div className="mt-2 text-2xl font-bold text-neutral-900">{step.value}</div>
              <div className="mt-1 text-sm font-semibold text-neutral-600">{step.label}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="card p-5 min-w-0">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="font-semibold text-neutral-900">Pending Doctor Approvals</h2>
              <p className="text-sm text-neutral-500">Review submitted doctor profiles before QR activation.</p>
            </div>
            <button onClick={() => navigate('/admin/doctors?status=pending')} className="text-sm text-primary-600 hover:text-primary-700 font-medium">
              View all
            </button>
          </div>
          <div className="space-y-3">
            {stats.pendingDoctors.map((doctor) => (
              <div key={doctor.id} className="flex items-start justify-between gap-3 rounded-xl border border-neutral-100 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-medium text-neutral-900 text-sm">{doctor.name}</p>
                  <p className="text-xs text-neutral-500">{doctor.specialization} - Via {doctor.agent}</p>
                  <p className="text-xs text-neutral-400 mt-1">Submitted {doctor.submittedAt}</p>
                </div>
                <button onClick={() => navigate(`/admin/doctors/${doctor.id}`)} className="rounded-lg bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-700 hover:bg-primary-100">
                  Review
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="card p-5 min-w-0">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="font-semibold text-neutral-900">Recent Registrations</h2>
              <p className="text-sm text-neutral-500">Latest patient registrations and payment status.</p>
            </div>
            <button onClick={() => navigate('/admin/patients')} className="text-sm text-primary-600 hover:text-primary-700 font-medium">
              View all
            </button>
          </div>
          <div className="space-y-3">
            {stats.recentPatients.map((patient) => (
              <div key={patient.id} className="flex items-start justify-between gap-3 rounded-xl border border-neutral-100 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-medium text-neutral-900 text-sm">{patient.name}</p>
                  <p className="text-xs text-neutral-500">{patient.programme} - {patient.doctor}</p>
                  <p className="text-xs text-neutral-400 mt-1">{patient.date}</p>
                </div>
                <span
                  className={cn(
                    'px-2 py-1 rounded-full text-xs font-semibold',
                    patient.paymentStatus === 'successful' ? 'bg-success-100 text-success-700' : 'bg-warning-100 text-warning-700'
                  )}
                >
                  {patient.paymentStatus === 'successful' ? 'Paid' : 'Pending'}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="card p-5 min-w-0">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="font-semibold text-neutral-900">Admin Modules</h2>
            <p className="text-sm text-neutral-500">Main entry points for the phase-1 admin build.</p>
          </div>
          <FileText className="w-5 h-5 text-neutral-400" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {moduleCards.map((module) => (
            <button
              key={module.title}
              onClick={() => navigate(module.href)}
              className="rounded-xl border border-neutral-200 bg-white p-4 text-left hover:border-primary-200 hover:bg-primary-50/40 transition-colors"
            >
              <div className="font-semibold text-neutral-900">{module.title}</div>
              <div className="mt-1 text-sm text-neutral-500">{module.desc}</div>
              <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary-600">
                Open <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
