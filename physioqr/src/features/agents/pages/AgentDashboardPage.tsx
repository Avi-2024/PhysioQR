import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { CalendarClock, CheckCircle, Clock, MapPin, Stethoscope, TrendingUp, UserPlus, Users } from 'lucide-react';
import apiClient from '@/lib/api-client';
import ErrorState from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatCurrency } from '@/lib/formatters';

type ApiRecord = Record<string, unknown>;

// Renders the live field-agent dashboard from the agent backend summary endpoint.
export default function AgentDashboardPage() {
  const navigate = useNavigate();
  const dashboardQuery = useQuery({
    queryKey: ['agent-dashboard'],
    queryFn: async () => (await apiClient.get('/agents/me/dashboard')).data,
  });

  const dashboard = asRecord(dashboardQuery.data);
  const recentVisits = Array.isArray(dashboard.recentVisits) ? dashboard.recentVisits as ApiRecord[] : [];
  const totalDoctors = Number(dashboard.totalDoctors || 0);
  const approved = Number(dashboard.approved || 0);
  const target = Math.max(Number(dashboard.monthlyTarget || 10), 1);
  const targetPercent = Math.min(100, Math.round((totalDoctors / target) * 100));

  if (dashboardQuery.isError) {
    return <ErrorState title="Agent dashboard could not load" message="Check agent login and backend availability." onRetry={() => dashboardQuery.refetch()} />;
  }

  return (
    <div className="space-y-6 min-w-0">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900">Agent Field Portal</h1>
          <p className="text-sm text-neutral-500">Doctor onboarding, clinic visits, follow-ups, and generated patient performance.</p>
        </div>
        <button
          onClick={() => navigate('/agent/doctors/new')}
          className="flex min-h-11 w-full sm:w-auto items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm rounded-lg transition-colors"
        >
          <UserPlus className="w-4 h-4" /> Register New Doctor
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard loading={dashboardQuery.isLoading} label="Doctors Registered" value={totalDoctors} icon={Stethoscope} tone="text-primary-600" />
        <MetricCard loading={dashboardQuery.isLoading} label="Approved Doctors" value={approved} icon={CheckCircle} tone="text-emerald-600" />
        <MetricCard loading={dashboardQuery.isLoading} label="Pending Review" value={Number(dashboard.pendingApproval || 0)} icon={Clock} tone="text-amber-600" />
        <MetricCard loading={dashboardQuery.isLoading} label="Revenue Generated" value={formatCurrency(Number(dashboard.revenueGenerated || 0))} icon={TrendingUp} tone="text-violet-600" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="bg-white border border-neutral-200 rounded-xl p-5 sm:p-6 shadow-sm space-y-4 min-w-0">
          <h3 className="font-bold text-neutral-900">Monthly Onboarding Target</h3>
          {dashboardQuery.isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : (
            <div>
              <div className="flex justify-between gap-3 text-sm mb-1 font-medium">
                <span className="text-neutral-600 min-w-0">{totalDoctors} of {target} doctors onboarded</span>
                <span className="text-primary-600 font-bold flex-shrink-0">{targetPercent}%</span>
              </div>
              <div className="w-full h-3 bg-neutral-100 rounded-full overflow-hidden">
                <div className="h-full bg-primary-600 rounded-full" style={{ width: `${targetPercent}%` }} />
              </div>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-3">
            <MiniStat label="Patients generated" value={Number(dashboard.totalPatients || 0)} icon={Users} />
            <MiniStat label="Paid patients" value={Number(dashboard.totalPaidPatients || 0)} icon={CheckCircle} />
            <MiniStat label="Due follow-ups" value={Number(dashboard.pendingFollowUps || 0)} icon={CalendarClock} />
          </div>
        </section>

        <aside className="bg-white border border-neutral-200 rounded-xl p-5 sm:p-6 shadow-sm">
          <h3 className="font-bold text-neutral-900">Recent Clinic Visits</h3>
          <div className="mt-4 space-y-3">
            {dashboardQuery.isLoading && <Skeleton className="h-28 w-full" />}
            {!dashboardQuery.isLoading && recentVisits.length === 0 && <div className="rounded-lg bg-neutral-50 p-4 text-sm text-neutral-500">No clinic visits recorded yet.</div>}
            {recentVisits.map((visit) => (
              <div key={text(visit._id || visit.id)} className="rounded-lg border border-neutral-200 p-3">
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary-600" />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-neutral-900">{text(visit.clinicName || nested(visit, 'doctor.clinicName'), 'Clinic visit')}</div>
                    <div className="mt-1 text-xs text-neutral-500">{text(nested(visit, 'doctor.fullName') || visit.doctorName, 'Unlinked doctor')} | {dateText(visit.visitDate)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

// Renders a dashboard KPI with stable loading state.
function MetricCard({ loading, label, value, icon: Icon, tone }: { loading: boolean; label: string; value: string | number; icon: React.ElementType; tone: string }) {
  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-4 sm:p-5 shadow-sm min-w-0">
      <Icon className={`w-8 h-8 ${tone} mb-2`} />
      {loading ? <Skeleton className="h-8 w-24" /> : <p className="text-xl sm:text-2xl font-bold text-neutral-900 break-words">{value}</p>}
      <p className="text-sm text-neutral-500">{label}</p>
    </div>
  );
}

// Renders a compact supporting metric inside the target panel.
function MiniStat({ label, value, icon: Icon }: { label: string; value: number; icon: React.ElementType }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
      <Icon className="mb-2 h-4 w-4 text-primary-600" />
      <div className="text-lg font-bold text-neutral-900">{value}</div>
      <div className="text-xs text-neutral-500">{label}</div>
    </div>
  );
}

function asRecord(value: unknown): ApiRecord {
  return value && typeof value === 'object' ? value as ApiRecord : {};
}

function nested(record: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    if (current && typeof current === 'object') return (current as ApiRecord)[key];
    return undefined;
  }, record);
}

function text(value: unknown, fallback = '') {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value);
}

function dateText(value: unknown) {
  if (!value) return '-';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
