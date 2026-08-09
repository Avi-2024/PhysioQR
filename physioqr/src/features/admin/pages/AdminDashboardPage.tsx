import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { UserPlus, RefreshCw, TrendingUp, Users, CheckCircle, Clock, MapPin } from 'lucide-react';
import { queryKeys, queryClient } from '@/app/query-client';
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
  revenueChart: { month: string; doctorShare: number; platformShare: number }[];
  pendingDoctors: { id: string; name: string; specialization: string; agent: string; submittedAt: string }[];
  recentPatients: { id: string; name: string; doctor: string; programme: string; paymentStatus: string; date: string }[];
}

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useQuery<AdminStats>({
    queryKey: queryKeys.adminDashboard,
    queryFn: () => apiClient.get('/admin/dashboard').then((r) => r.data.data),
  });

  const KpiCard = ({ title, value, icon: Icon, color, sub, onClick }: { title: string; value: string | number; icon: React.ElementType; color: string; sub?: string; onClick?: () => void }) => (
    <button onClick={onClick} className={cn('card p-4 sm:p-5 text-left w-full min-w-0 hover:shadow-card-hover transition-shadow', onClick && 'cursor-pointer')}>
      {isLoading ? (
        <div className="space-y-2"><div className="w-10 h-10 rounded-lg bg-neutral-100 animate-pulse" /><div className="h-7 w-20 bg-neutral-100 animate-pulse rounded" /><div className="h-4 w-28 bg-neutral-100 animate-pulse rounded" /></div>
      ) : (
        <>
          <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center mb-3', color)}>
            <Icon className="w-5 h-5" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-neutral-900 break-words">{value}</p>
          <p className="text-sm text-neutral-500 mt-0.5">{title}</p>
          {sub && <p className="text-xs text-neutral-400 mt-1">{sub}</p>}
        </>
      )}
    </button>
  );

  const MOCK: AdminStats = {
    totalAgents: 8, totalDoctors: 34, activeDoctors: 28, pendingApprovals: 4,
    suspendedDoctors: 2, totalQrScans: 1240, totalPatients: 287, paidPatients: 234,
    activePrograms: 198, todayRevenue: 12500, monthlyRevenue: 287400,
    pendingPayouts: 45600, completedPayouts: 312000, totalRefunds: 4500,
    highRiskAssessments: 3, openSupportTickets: 7, platformRevenue: 112000,
    doctorFeeSharePayable: 175400,
    revenueChart: [
      { month: 'Mar', doctorShare: 28000, platformShare: 18000 },
      { month: 'Apr', doctorShare: 32000, platformShare: 22000 },
      { month: 'May', doctorShare: 41000, platformShare: 28000 },
      { month: 'Jun', doctorShare: 38000, platformShare: 26000 },
      { month: 'Jul', doctorShare: 52000, platformShare: 36000 },
      { month: 'Aug', doctorShare: 11400, platformShare: 8200 },
    ],
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

  const stats = data || MOCK;

  return (
    <div className="space-y-6 min-w-0">
      {/* Page Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900">Admin Dashboard</h1>
          <p className="text-sm text-neutral-500 mt-0.5">Platform overview · physioqr Command Centre</p>
        </div>
        <div className="flex w-full sm:w-auto flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <button onClick={() => refetch()} className="flex min-h-11 items-center justify-center gap-2 px-4 py-2.5 border border-neutral-300 text-neutral-700 text-sm font-medium rounded-lg hover:bg-neutral-50 transition-colors">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button onClick={() => navigate('/admin/doctors/new')} className="flex min-h-11 items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-lg transition-colors">
            <UserPlus className="w-4 h-4" /> Add Doctor
          </button>
        </div>
      </div>

      {/* Alert banners */}
      {stats.pendingApprovals > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-warning-50 border border-warning-200 rounded-xl">
          <Clock className="w-5 h-5 text-warning-600 flex-shrink-0" />
          <p className="text-sm text-warning-800 font-medium">{stats.pendingApprovals} doctor(s) pending approval — <button onClick={() => navigate('/admin/doctors?status=pending')} className="underline">Review now</button></p>
        </div>
      )}

      {/* KPI Row 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard title="Total Doctors" value={stats.totalDoctors} icon={Users} color="bg-primary-100 text-primary-600" sub={`${stats.activeDoctors} active`} onClick={() => navigate('/admin/doctors')} />
        <KpiCard title="Total Patients" value={stats.totalPatients} icon={Users} color="bg-purple-100 text-purple-600" sub={`${stats.paidPatients} paid`} onClick={() => navigate('/admin/patients')} />
        <KpiCard title="Today's Revenue" value={formatCurrency(stats.todayRevenue)} icon={TrendingUp} color="bg-success-100 text-success-600" sub="Gross collections" />
        <KpiCard title="Pending Payouts" value={formatCurrency(stats.pendingPayouts)} icon={TrendingUp} color="bg-warning-100 text-warning-600" sub="To process" onClick={() => navigate('/admin/withdrawals')} />
      </div>

      {/* KPI Row 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard title="Pending Approvals" value={stats.pendingApprovals} icon={Clock} color="bg-orange-100 text-orange-600" onClick={() => navigate('/admin/doctors?status=pending')} />
        <KpiCard title="Active Programmes" value={stats.activePrograms} icon={CheckCircle} color="bg-teal-100 text-teal-600" />
        <KpiCard title="High-Risk Flags" value={stats.highRiskAssessments} icon={CheckCircle} color="bg-danger-100 text-danger-600" />
        <KpiCard title="Open Support Tickets" value={stats.openSupportTickets} icon={MapPin} color="bg-indigo-100 text-indigo-600" />
      </div>

      {/* Revenue Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4 sm:p-5 min-w-0">
          <p className="text-sm text-neutral-500">Monthly Gross Revenue</p>
          <p className="text-2xl font-bold text-neutral-900 mt-1">{formatCurrency(stats.monthlyRevenue)}</p>
        </div>
        <div className="card p-4 sm:p-5 min-w-0">
          <p className="text-sm text-neutral-500">Doctor Fee Share Payable</p>
          <p className="text-2xl font-bold text-warning-600 mt-1">{formatCurrency(stats.doctorFeeSharePayable)}</p>
        </div>
        <div className="card p-4 sm:p-5 min-w-0">
          <p className="text-sm text-neutral-500">Platform Net Revenue</p>
          <p className="text-2xl font-bold text-success-600 mt-1">{formatCurrency(stats.platformRevenue)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Doctor Approvals */}
        <div className="card p-4 sm:p-5 min-w-0">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="font-semibold text-neutral-900">Pending Doctor Approvals</h3>
            <button onClick={() => navigate('/admin/doctors?status=pending')} className="text-sm text-primary-600 hover:text-primary-700 font-medium">View all →</button>
          </div>
          <div className="space-y-3">
            {stats.pendingDoctors.map((doc) => (
              <div key={doc.id} className="flex items-start justify-between gap-3 py-3 border-b border-neutral-100 last:border-0">
                <div className="min-w-0">
                  <p className="font-medium text-neutral-900 text-sm">{doc.name}</p>
                  <p className="text-xs text-neutral-500">{doc.specialization} · Via {doc.agent}</p>
                </div>
                <button onClick={() => navigate(`/admin/doctors/${doc.id}`)} className="px-3 py-1.5 bg-primary-50 hover:bg-primary-100 text-primary-700 text-xs font-semibold rounded-lg transition-colors">
                  Review
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Patients */}
        <div className="card p-4 sm:p-5 min-w-0">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="font-semibold text-neutral-900">Recent Registrations</h3>
            <button onClick={() => navigate('/admin/patients')} className="text-sm text-primary-600 hover:text-primary-700 font-medium">View all →</button>
          </div>
          <div className="space-y-3">
            {stats.recentPatients.map((pat) => (
              <div key={pat.id} className="flex items-start justify-between gap-3 py-3 border-b border-neutral-100 last:border-0">
                <div className="min-w-0">
                  <p className="font-medium text-neutral-900 text-sm">{pat.name}</p>
                  <p className="text-xs text-neutral-500">{pat.programme} · {pat.doctor}</p>
                </div>
                <span className={cn('px-2 py-1 rounded-full text-xs font-semibold', pat.paymentStatus === 'successful' ? 'bg-success-100 text-success-700' : 'bg-warning-100 text-warning-700')}>
                  {pat.paymentStatus === 'successful' ? 'Paid' : 'Pending'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card p-5">
        <h3 className="font-semibold text-neutral-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {[
            { label: 'Create Agent', icon: UserPlus, path: '/admin/agents', color: 'bg-primary-50 text-primary-700 hover:bg-primary-100' },
            { label: 'Register Doctor', icon: Users, path: '/admin/doctors/new', color: 'bg-purple-50 text-purple-700 hover:bg-purple-100' },
            { label: 'Process Payout', icon: TrendingUp, path: '/admin/withdrawals', color: 'bg-success-50 text-success-700 hover:bg-success-100' },
            { label: 'View Reports', icon: TrendingUp, path: '/admin/reports', color: 'bg-warning-50 text-warning-700 hover:bg-warning-100' },
          ].map((action) => (
            <button key={action.label} onClick={() => navigate(action.path)} className={cn('flex flex-col items-center gap-2 p-4 rounded-xl font-medium text-sm transition-colors', action.color)}>
              <action.icon className="w-6 h-6" />
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
