import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  MapPin,
  Stethoscope,
  TrendingUp,
  UserPlus,
  Users,
} from 'lucide-react';
import apiClient from '@/lib/api-client';
import ErrorState from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatCurrency } from '@/lib/formatters';

type ApiRecord = Record<string, unknown>;

export default function AgentDashboardPage() {
  const navigate = useNavigate();
  const dashboardQuery = useQuery({
    queryKey: ['agent-dashboard'],
    queryFn: async () => (await apiClient.get('/agents/me/dashboard')).data,
  });

  if (dashboardQuery.isError) {
    return (
      <ErrorState
        title="Agent dashboard could not load"
        message="Your field workspace is temporarily unavailable. Check your connection and try again."
        onRetry={() => dashboardQuery.refetch()}
      />
    );
  }

  const dashboard = asRecord(dashboardQuery.data);
  const agent = asRecord(dashboard.agent);
  const todayVisits = arrayOfRecords(dashboard.todaysVisits);
  const dueFollowUps = arrayOfRecords(dashboard.dueFollowUps);
  const recentApprovedDoctors = arrayOfRecords(dashboard.recentApprovedDoctors);

  const monthlyTarget = nullableNumber(dashboard.monthlyTarget);
  const monthlyOnboarded = number(dashboard.monthlyOnboarded);
  const targetPercent = nullableNumber(dashboard.targetAchievementPercentage);

  return (
    <div className="space-y-6 min-w-0">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-600">Field workspace</p>
          <h1 className="mt-1 text-2xl font-bold text-neutral-900 sm:text-3xl">
            {text(agent.fullName) ? `Welcome, ${text(agent.fullName)}` : 'Agent Dashboard'}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            {text(agent.assignedRegion)
              ? `Doctor onboarding and clinic activity for ${text(agent.assignedRegion)}.`
              : 'Doctor onboarding, clinic visits, follow-ups, and referral performance.'}
          </p>
        </div>
        <button
          onClick={() => navigate('/agent/doctors/new')}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700 sm:w-auto"
        >
          <UserPlus className="h-4 w-4" />
          Register Doctor
        </button>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          loading={dashboardQuery.isLoading}
          label="My Doctors"
          value={number(dashboard.totalDoctors)}
          helper={`${number(dashboard.activeDoctors)} active`}
          icon={Stethoscope}
        />
        <MetricCard
          loading={dashboardQuery.isLoading}
          label="Needs Review"
          value={number(dashboard.pendingApproval)}
          helper={`${number(dashboard.approved)} approved`}
          icon={CalendarClock}
        />
        <MetricCard
          loading={dashboardQuery.isLoading}
          label="Patients Generated"
          value={number(dashboard.totalPatients)}
          helper={`${number(dashboard.totalPaidPatients)} paid patients`}
          icon={Users}
        />
        <MetricCard
          loading={dashboardQuery.isLoading}
          label="Revenue Generated"
          value={formatCurrency(number(dashboard.revenueGenerated))}
          helper="Net verified collections"
          icon={TrendingUp}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <div className="space-y-6 min-w-0">
          <TargetPanel
            loading={dashboardQuery.isLoading}
            monthlyTarget={monthlyTarget}
            monthlyOnboarded={monthlyOnboarded}
            targetPercent={targetPercent}
            pendingFollowUps={number(dashboard.pendingFollowUps)}
            upcomingFollowUps={number(dashboard.upcomingFollowUps)}
            rejectedDoctors={number(dashboard.rejected)}
            onPerformance={() => navigate('/agent/performance')}
          />

          <WorkList
            title="Today's Clinic Visits"
            description="Visits scheduled or recorded for today"
            loading={dashboardQuery.isLoading}
            items={todayVisits}
            emptyTitle="No clinic visits today"
            emptyCopy="Create a visit when you meet a doctor or clinic."
            actionLabel="Open clinic visits"
            onAction={() => navigate('/agent/clinic-visits')}
            renderItem={(visit) => (
              <VisitRow key={text(visit._id || visit.id)} visit={visit} />
            )}
          />
        </div>

        <div className="space-y-6 min-w-0">
          <QuickActions
            onRegisterDoctor={() => navigate('/agent/doctors/new')}
            onClinicVisits={() => navigate('/agent/clinic-visits')}
            onDoctors={() => navigate('/agent/doctors')}
          />

          <WorkList
            title="Follow-ups Due"
            description="Scheduled follow-ups requiring attention"
            loading={dashboardQuery.isLoading}
            items={dueFollowUps}
            emptyTitle="No overdue follow-ups"
            emptyCopy="You're clear for now. Upcoming follow-ups will appear here when due."
            actionLabel="View follow-ups"
            onAction={() => navigate('/agent/clinic-visits')}
            renderItem={(visit) => (
              <FollowUpRow key={text(visit._id || visit.id)} visit={visit} />
            )}
          />

          <WorkList
            title="Recently Approved"
            description="Latest approved doctors from your onboarding"
            loading={dashboardQuery.isLoading}
            items={recentApprovedDoctors}
            emptyTitle="No doctors registered yet"
            emptyCopy="Doctors you register will appear here as Approved immediately."
            actionLabel="View my doctors"
            onAction={() => navigate('/agent/doctors')}
            renderItem={(doctor) => (
              <DoctorRow key={text(doctor._id || doctor.id)} doctor={doctor} />
            )}
          />
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  loading,
  label,
  value,
  helper,
  icon: Icon,
}: {
  loading: boolean;
  label: string;
  value: string | number;
  helper: string;
  icon: React.ElementType;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-neutral-500">{label}</p>
          {loading ? (
            <Skeleton className="mt-3 h-8 w-24" />
          ) : (
            <p className="mt-2 break-words text-2xl font-bold text-neutral-900">{value}</p>
          )}
        </div>
        <div className="rounded-lg bg-primary-50 p-2.5 text-primary-700">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-3 text-xs text-neutral-500">{helper}</p>
    </div>
  );
}

function TargetPanel({
  loading,
  monthlyTarget,
  monthlyOnboarded,
  targetPercent,
  pendingFollowUps,
  upcomingFollowUps,
  rejectedDoctors,
  onPerformance,
}: {
  loading: boolean;
  monthlyTarget: number | null;
  monthlyOnboarded: number;
  targetPercent: number | null;
  pendingFollowUps: number;
  upcomingFollowUps: number;
  rejectedDoctors: number;
  onPerformance: () => void;
}) {
  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-bold text-neutral-900">Monthly Onboarding</h2>
          <p className="mt-1 text-sm text-neutral-500">Track doctor onboarding against the target assigned by Admin.</p>
        </div>
        <button onClick={onPerformance} className="inline-flex items-center gap-1 text-sm font-semibold text-primary-700 hover:text-primary-800">
          Performance <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {loading ? (
        <Skeleton className="mt-5 h-24 w-full" />
      ) : monthlyTarget === null ? (
        <div className="mt-5 rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-4">
          <p className="text-sm font-semibold text-neutral-800">Monthly target is not configured</p>
          <p className="mt-1 text-xs text-neutral-500">Your live onboarding count is {monthlyOnboarded}. A target will appear once Admin assigns one.</p>
        </div>
      ) : (
        <div className="mt-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-3xl font-bold text-neutral-900">{monthlyOnboarded}</p>
              <p className="text-sm text-neutral-500">of {monthlyTarget} doctors this month</p>
            </div>
            <p className="text-lg font-bold text-primary-700">{targetPercent ?? 0}%</p>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-neutral-100">
            <div className="h-full rounded-full bg-primary-600" style={{ width: `${Math.min(targetPercent ?? 0, 100)}%` }} />
          </div>
        </div>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <SmallStat icon={CircleAlert} label="Follow-ups due" value={pendingFollowUps} />
        <SmallStat icon={CalendarCheck} label="Upcoming" value={upcomingFollowUps} />
        <SmallStat icon={CircleAlert} label="Rejected doctors" value={rejectedDoctors} />
      </div>
    </section>
  );
}

function SmallStat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
      <Icon className="h-4 w-4 text-primary-600" />
      <p className="mt-2 text-lg font-bold text-neutral-900">{value}</p>
      <p className="text-xs text-neutral-500">{label}</p>
    </div>
  );
}

function QuickActions({
  onRegisterDoctor,
  onClinicVisits,
  onDoctors,
}: {
  onRegisterDoctor: () => void;
  onClinicVisits: () => void;
  onDoctors: () => void;
}) {
  const actions = [
    { label: 'Register Doctor', description: 'Start a new onboarding', icon: UserPlus, onClick: onRegisterDoctor },
    { label: 'Record Clinic Visit', description: 'Add visit and follow-up', icon: MapPin, onClick: onClinicVisits },
    { label: 'My Doctors', description: 'Check doctor status', icon: Stethoscope, onClick: onDoctors },
  ];

  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
      <h2 className="font-bold text-neutral-900">Quick Actions</h2>
      <div className="mt-4 space-y-2">
        {actions.map(({ label, description, icon: Icon, onClick }) => (
          <button
            key={label}
            type="button"
            onClick={onClick}
            className="flex w-full items-center gap-3 rounded-lg border border-neutral-200 p-3 text-left transition-colors hover:border-primary-200 hover:bg-primary-50/40"
          >
            <span className="rounded-lg bg-primary-50 p-2 text-primary-700"><Icon className="h-4 w-4" /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-neutral-900">{label}</span>
              <span className="block text-xs text-neutral-500">{description}</span>
            </span>
            <ArrowRight className="h-4 w-4 flex-shrink-0 text-neutral-400" />
          </button>
        ))}
      </div>
    </section>
  );
}

function WorkList({
  title,
  description,
  loading,
  items,
  emptyTitle,
  emptyCopy,
  actionLabel,
  onAction,
  renderItem,
}: {
  title: string;
  description: string;
  loading: boolean;
  items: ApiRecord[];
  emptyTitle: string;
  emptyCopy: string;
  actionLabel: string;
  onAction: () => void;
  renderItem: (item: ApiRecord) => React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-bold text-neutral-900">{title}</h2>
          <p className="mt-1 text-xs text-neutral-500">{description}</p>
        </div>
        <button onClick={onAction} className="text-xs font-semibold text-primary-700 hover:text-primary-800">{actionLabel}</button>
      </div>
      <div className="mt-4 space-y-2">
        {loading && <Skeleton className="h-28 w-full" />}
        {!loading && items.length === 0 && (
          <div className="rounded-lg bg-neutral-50 p-4">
            <p className="text-sm font-semibold text-neutral-800">{emptyTitle}</p>
            <p className="mt-1 text-xs text-neutral-500">{emptyCopy}</p>
          </div>
        )}
        {!loading && items.map(renderItem)}
      </div>
    </section>
  );
}

function VisitRow({ visit }: { visit: ApiRecord }) {
  const doctor = asRecord(visit.doctor);
  const name = text(doctor.fullName || visit.doctorName, 'Clinic visit');
  const clinic = text(visit.clinicName || doctor.clinicName, 'Clinic not specified');
  return (
    <div className="flex items-start gap-3 rounded-lg border border-neutral-200 p-3">
      <span className="rounded-lg bg-primary-50 p-2 text-primary-700"><MapPin className="h-4 w-4" /></span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-neutral-900">{name}</p>
        <p className="mt-0.5 truncate text-xs text-neutral-500">{clinic}</p>
        <p className="mt-1 text-xs font-medium text-neutral-600">{dateTimeText(visit.visitDate, visit.visitTime)}</p>
      </div>
      <StatusPill value={text(visit.outcome, 'scheduled')} />
    </div>
  );
}

function FollowUpRow({ visit }: { visit: ApiRecord }) {
  const doctor = asRecord(visit.doctor);
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3">
      <div className="flex items-start gap-3">
        <CalendarClock className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-700" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-neutral-900">{text(doctor.fullName || visit.doctorName, 'Clinic follow-up')}</p>
          <p className="mt-0.5 truncate text-xs text-neutral-500">{text(visit.clinicName || doctor.clinicName, 'Clinic not specified')}</p>
          <p className="mt-1 text-xs font-semibold text-amber-800">Due {dateText(visit.followUpDate)}</p>
        </div>
      </div>
    </div>
  );
}

function DoctorRow({ doctor }: { doctor: ApiRecord }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-neutral-200 p-3">
      <span className="rounded-full bg-emerald-50 p-2 text-emerald-700"><CheckCircle2 className="h-4 w-4" /></span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-neutral-900">{text(doctor.fullName, 'Approved doctor')}</p>
        <p className="truncate text-xs text-neutral-500">{text(doctor.clinicName, text(doctor.doctorId, 'Clinic not specified'))}</p>
      </div>
      <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${doctor.qrCodeActive ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-600'}`}>
        {doctor.qrCodeActive ? 'QR Active' : 'Approved'}
      </span>
    </div>
  );
}

function StatusPill({ value }: { value: string }) {
  return <span className="max-w-28 truncate rounded-full bg-neutral-100 px-2 py-1 text-[11px] font-semibold capitalize text-neutral-600">{value.replaceAll('_', ' ')}</span>;
}

function arrayOfRecords(value: unknown): ApiRecord[] {
  return Array.isArray(value) ? value.filter((item): item is ApiRecord => Boolean(item) && typeof item === 'object') : [];
}

function asRecord(value: unknown): ApiRecord {
  return value && typeof value === 'object' ? value as ApiRecord : {};
}

function number(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function nullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function text(value: unknown, fallback = '') {
  return value === undefined || value === null || value === '' ? fallback : String(value);
}

function dateText(value: unknown) {
  if (!value) return '-';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function dateTimeText(dateValue: unknown, timeValue: unknown) {
  const date = dateText(dateValue);
  const time = text(timeValue);
  return time ? `${date} • ${time}` : date;
}
