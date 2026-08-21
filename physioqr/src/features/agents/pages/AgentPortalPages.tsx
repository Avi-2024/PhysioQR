import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileText,
  MapPin,
  Plus,
  RefreshCw,
  ShieldCheck,
  Stethoscope,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react';
import apiClient from '@/lib/api-client';
import { DataTable, type DataTableColumn } from '@/components/data-display/DataTable';
import ErrorState from '@/components/feedback/ErrorState';
import { Modal } from '@/components/ui/Modal';
import { SearchInput } from '@/components/ui/SearchInput';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';
import { formatCurrency } from '@/lib/formatters';

type ApiRecord = Record<string, unknown>;

type DoctorRow = {
  id: string;
  fullName: string;
  doctorId: string;
  clinicName: string;
  city: string;
  status: string;
  specialization: string;
  mobile: string;
  requestedPatientFee: number;
  approvedPatientFee: number;
  createdAt: string;
  raw: ApiRecord;
};

type VisitRow = {
  id: string;
  doctorName: string;
  clinicName: string;
  visitDate: string;
  visitTime: string;
  clinicLocation: string;
  outcome: string;
  doctorInterestLevel: string;
  followUpDate: string;
  followUpStatus: string;
  nextAction: string;
  raw: ApiRecord;
};

const outcomeOptions = [
  ['doctor_registered', 'Doctor registered'],
  ['interested', 'Interested'],
  ['follow_up_required', 'Follow-up required'],
  ['not_interested', 'Not interested'],
  ['call_later', 'Call later'],
  ['clinic_closed', 'Clinic closed'],
  ['incorrect_location', 'Incorrect location'],
];

const interestOptions = [
  ['very_interested', 'Very interested'],
  ['interested', 'Interested'],
  ['neutral', 'Neutral'],
  ['not_interested', 'Not interested'],
];

// Renders the agent's assigned doctor list from the live agent backend.
export function AgentDoctorsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const doctorsQuery = useQuery({
    queryKey: ['agent-doctors'],
    queryFn: async () => (await apiClient.get('/agents/me/doctors')).data,
  });

  const rows = useMemo(() => extractItems(doctorsQuery.data).map(mapDoctor), [doctorsQuery.data]);
  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesSearch = !query || [row.fullName, row.doctorId, row.clinicName, row.city, row.specialization, row.mobile]
        .some((value) => value.toLowerCase().includes(query));
      const matchesStatus = status === 'all' || row.status === status;
      return matchesSearch && matchesStatus;
    });
  }, [rows, search, status]);

  const columns: DataTableColumn<DoctorRow>[] = [
    {
      key: 'fullName',
      header: 'Doctor',
      render: (row) => (
        <div className="min-w-0">
          <div className="font-semibold text-neutral-900">{row.fullName}</div>
          <div className="text-xs text-neutral-500">{row.doctorId}</div>
          <div className="text-xs text-neutral-500">{row.clinicName}</div>
        </div>
      ),
    },
    { key: 'city', header: 'City', render: (row) => <span className="text-sm text-neutral-700">{row.city}</span> },
    { key: 'specialization', header: 'Specialization', render: (row) => <span className="text-sm text-neutral-700">{row.specialization}</span> },
    { key: 'status', header: 'Approval', render: (row) => <StatusPill value={row.status} /> },
    {
      key: 'fee',
      header: 'Fee',
      render: (row) => (
        <div className="text-sm">
          <div className="font-semibold text-neutral-900">{formatCurrency(row.approvedPatientFee || row.requestedPatientFee || 0)}</div>
          <div className="text-xs text-neutral-500">{row.approvedPatientFee ? 'Admin approved' : 'Requested'}</div>
        </div>
      ),
    },
    { key: 'createdAt', header: 'Submitted', render: (row) => <span className="text-sm text-neutral-600">{dateText(row.createdAt)}</span> },
  ];

  return (
    <AgentWorkspace
      eyebrow="DOCTOR ONBOARDING"
      title="My Doctors"
      description="Doctors registered under your agent profile with approval, clinic, and fee status."
      actions={<a href="/agent/doctors/new" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"><Plus className="h-4 w-4" />Register doctor</a>}
    >
      <KpiGrid
        items={[
          ['Total doctors', rows.length, Stethoscope, 'bg-sky-50 text-sky-700'],
          ['Approved', rows.filter((row) => row.status === 'approved').length, ShieldCheck, 'bg-emerald-50 text-emerald-700'],
          ['Pending review', rows.filter((row) => ['submitted', 'under_review', 'documents_required'].includes(row.status)).length, Clock3, 'bg-amber-50 text-amber-700'],
          ['Suspended/rejected', rows.filter((row) => ['suspended', 'rejected'].includes(row.status)).length, RefreshCw, 'bg-rose-50 text-rose-700'],
        ]}
      />
      <section className="card p-5">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
          <SearchInput value={search} onChange={setSearch} placeholder="Search doctor, clinic, city, specialization, mobile" />
          <StatusFilters statuses={['all', ...Array.from(new Set(rows.map((row) => row.status))).filter(Boolean)]} active={status} onChange={setStatus} />
        </div>
        <div className="mt-5">
          {doctorsQuery.isError ? (
            <ErrorState title="Doctors could not load" message="Check agent login and backend availability." onRetry={() => doctorsQuery.refetch()} />
          ) : (
            <DataTable columns={columns} data={filteredRows} loading={doctorsQuery.isLoading} emptyMessage="No doctors match current filters." />
          )}
        </div>
      </section>
    </AgentWorkspace>
  );
}

// Renders clinic visit creation, filtering, and follow-up completion for agents.
export function AgentClinicVisitsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [followUpFilter, setFollowUpFilter] = useState('all');
  const [modal, setModal] = useState<{ mode: 'create' | 'follow-up'; row?: VisitRow } | null>(null);

  const visitsQuery = useQuery({
    queryKey: ['agent-visits'],
    queryFn: async () => (await apiClient.get('/agents/me/visits', { params: { limit: 100 } })).data,
  });
  const doctorsQuery = useQuery({
    queryKey: ['agent-doctors'],
    queryFn: async () => (await apiClient.get('/agents/me/doctors')).data,
  });

  const rows = useMemo(() => extractItems(visitsQuery.data).map(mapVisit), [visitsQuery.data]);
  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesSearch = !query || [row.doctorName, row.clinicName, row.clinicLocation, row.outcome, row.nextAction]
        .some((value) => value.toLowerCase().includes(query));
      const matchesFollowUp = followUpFilter === 'all' || row.followUpStatus === followUpFilter;
      return matchesSearch && matchesFollowUp;
    });
  }, [followUpFilter, rows, search]);

  const columns: DataTableColumn<VisitRow>[] = [
    {
      key: 'clinicName',
      header: 'Clinic',
      render: (row) => (
        <div className="min-w-0">
          <div className="font-semibold text-neutral-900">{row.clinicName}</div>
          <div className="text-xs text-neutral-500">{row.doctorName}</div>
          <div className="text-xs text-neutral-500">{row.clinicLocation}</div>
        </div>
      ),
    },
    { key: 'visitDate', header: 'Visit', render: (row) => <span className="text-sm text-neutral-700">{dateText(row.visitDate)} {row.visitTime}</span> },
    { key: 'outcome', header: 'Outcome', render: (row) => <StatusPill value={labelize(row.outcome)} /> },
    { key: 'doctorInterestLevel', header: 'Interest', render: (row) => <span className="text-sm text-neutral-700">{labelize(row.doctorInterestLevel)}</span> },
    { key: 'followUpStatus', header: 'Follow-up', render: (row) => <StatusPill value={labelize(row.followUpStatus)} /> },
    { key: 'followUpDate', header: 'Due', render: (row) => <span className="text-sm text-neutral-600">{dateText(row.followUpDate)}</span> },
    {
      key: 'actions',
      header: 'Action',
      render: (row) => (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setModal({ mode: 'follow-up', row });
          }}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
        >
          Update
        </button>
      ),
    },
  ];

  return (
    <AgentWorkspace
      eyebrow="CLINIC VISIT TRACKING"
      title="Clinic Visits"
      description="Record clinic visits, follow-up notes, doctor interest, and next actions from the field."
      actions={<button type="button" onClick={() => setModal({ mode: 'create' })} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"><Plus className="h-4 w-4" />Add visit</button>}
    >
      <KpiGrid
        items={[
          ['Total visits', rows.length, MapPin, 'bg-sky-50 text-sky-700'],
          ['Scheduled follow-ups', rows.filter((row) => row.followUpStatus === 'scheduled').length, CalendarClock, 'bg-amber-50 text-amber-700'],
          ['Completed', rows.filter((row) => row.followUpStatus === 'completed').length, CheckCircle2, 'bg-emerald-50 text-emerald-700'],
          ['Interested clinics', rows.filter((row) => ['interested', 'doctor_registered', 'follow_up_required'].includes(row.outcome)).length, TrendingUp, 'bg-violet-50 text-violet-700'],
        ]}
      />
      <section className="card p-5">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
          <SearchInput value={search} onChange={setSearch} placeholder="Search clinic, doctor, location, outcome, next action" />
          <StatusFilters statuses={['all', 'scheduled', 'completed', 'missed', 'cancelled', 'not_required']} active={followUpFilter} onChange={setFollowUpFilter} />
        </div>
        <div className="mt-5">
          {visitsQuery.isError ? (
            <ErrorState title="Clinic visits could not load" message="Check agent login and backend availability." onRetry={() => visitsQuery.refetch()} />
          ) : (
            <DataTable columns={columns} data={filteredRows} loading={visitsQuery.isLoading} emptyMessage="No clinic visits match current filters." />
          )}
        </div>
      </section>

      <Modal isOpen={!!modal} onClose={() => setModal(null)} title={modal?.mode === 'follow-up' ? 'Update follow-up' : 'Add clinic visit'} size="xl">
        {modal?.mode === 'follow-up' ? (
          <FollowUpForm
            row={modal.row}
            onDone={async () => {
              setModal(null);
              await queryClient.invalidateQueries({ queryKey: ['agent-visits'] });
            }}
          />
        ) : (
          <VisitForm
            doctors={extractItems(doctorsQuery.data).map(mapDoctor)}
            onDone={async () => {
              setModal(null);
              await queryClient.invalidateQueries({ queryKey: ['agent-visits'] });
            }}
          />
        )}
      </Modal>
    </AgentWorkspace>
  );
}

// Renders agent performance summaries from dashboard, doctors, visits, and follow-up data.
export function AgentPerformancePage() {
  const dashboardQuery = useQuery({
    queryKey: ['agent-dashboard'],
    queryFn: async () => (await apiClient.get('/agents/me/dashboard')).data,
  });
  const doctorsQuery = useQuery({
    queryKey: ['agent-doctors'],
    queryFn: async () => (await apiClient.get('/agents/me/doctors')).data,
  });
  const visitsQuery = useQuery({
    queryKey: ['agent-visits'],
    queryFn: async () => (await apiClient.get('/agents/me/visits', { params: { limit: 100 } })).data,
  });
  const followUpsQuery = useQuery({
    queryKey: ['agent-follow-ups'],
    queryFn: async () => (await apiClient.get('/agents/me/follow-ups', { params: { limit: 50 } })).data,
  });

  const dashboard = asRecord(dashboardQuery.data);
  const doctors = extractItems(doctorsQuery.data).map(mapDoctor);
  const visits = extractItems(visitsQuery.data).map(mapVisit);
  const followUps = extractItems(followUpsQuery.data).map(mapVisit);
  const approvalRate = doctors.length ? Math.round((doctors.filter((doctor) => doctor.status === 'approved').length / doctors.length) * 100) : 0;
  const paidConversion = Number(dashboard.totalPatients || 0) ? Math.round((Number(dashboard.totalPaidPatients || 0) / Number(dashboard.totalPatients || 1)) * 100) : 0;
  const followUpCompletion = visits.length ? Math.round((visits.filter((visit) => visit.followUpStatus === 'completed').length / visits.length) * 100) : 0;

  if (dashboardQuery.isError || doctorsQuery.isError || visitsQuery.isError) {
    return <ErrorState title="Performance could not load" message="Check agent login and backend availability." onRetry={() => { dashboardQuery.refetch(); doctorsQuery.refetch(); visitsQuery.refetch(); }} />;
  }

  return (
    <AgentWorkspace eyebrow="PERFORMANCE REPORTS" title="Performance" description="Doctor onboarding, patient generation, paid conversion, and follow-up execution for your field region.">
      <KpiGrid
        items={[
          ['Revenue generated', formatCurrency(Number(dashboard.revenueGenerated || 0)), TrendingUp, 'bg-violet-50 text-violet-700'],
          ['Approval rate', `${approvalRate}%`, ShieldCheck, 'bg-emerald-50 text-emerald-700'],
          ['Paid conversion', `${paidConversion}%`, UserCheck, 'bg-sky-50 text-sky-700'],
          ['Follow-up completion', `${followUpCompletion}%`, CheckCircle2, 'bg-teal-50 text-teal-700'],
        ]}
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="card p-5">
          <h2 className="text-base font-bold text-neutral-900">Doctor Pipeline</h2>
          <div className="mt-5 space-y-4">
            <ProgressRow label="Approved doctors" value={doctors.filter((doctor) => doctor.status === 'approved').length} total={Math.max(doctors.length, 1)} />
            <ProgressRow label="Pending review" value={doctors.filter((doctor) => ['submitted', 'under_review', 'documents_required'].includes(doctor.status)).length} total={Math.max(doctors.length, 1)} />
            <ProgressRow label="Paid patient conversion" value={Number(dashboard.totalPaidPatients || 0)} total={Math.max(Number(dashboard.totalPatients || 0), 1)} />
            <ProgressRow label="Follow-ups completed" value={visits.filter((visit) => visit.followUpStatus === 'completed').length} total={Math.max(visits.length, 1)} />
          </div>
        </section>
        <aside className="card p-5">
          <h2 className="text-base font-bold text-neutral-900">Follow-up Queue</h2>
          <div className="mt-4 space-y-3">
            {followUps.length === 0 && !followUpsQuery.isLoading && <div className="rounded-lg bg-neutral-50 p-4 text-sm text-neutral-500">No scheduled follow-ups returned.</div>}
            {followUpsQuery.isLoading && <Skeleton className="h-28 w-full" />}
            {followUps.slice(0, 6).map((visit) => (
              <div key={visit.id} className="rounded-lg border border-neutral-200 p-3">
                <div className="text-sm font-semibold text-neutral-900">{visit.clinicName}</div>
                <div className="mt-1 text-xs text-neutral-500">{visit.doctorName} | Due {dateText(visit.followUpDate)}</div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </AgentWorkspace>
  );
}

// Creates a new clinic visit through the agent visit API.
function VisitForm({ doctors, onDone }: { doctors: DoctorRow[]; onDone: () => void }) {
  const mutation = useMutation({
    mutationFn: async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const doctor = String(form.get('doctor') || '');
      return apiClient.post('/agents/me/visits', {
        doctor: doctor || undefined,
        doctorName: form.get('doctorName') || undefined,
        clinicName: form.get('clinicName'),
        visitDate: form.get('visitDate'),
        visitTime: form.get('visitTime') || undefined,
        clinicLocation: form.get('clinicLocation') || undefined,
        discussionDetails: form.get('discussionDetails') || undefined,
        doctorInterestLevel: form.get('doctorInterestLevel') || undefined,
        followUpDate: form.get('followUpDate') || undefined,
        followUpNotes: form.get('followUpNotes') || undefined,
        nextAction: form.get('nextAction') || undefined,
        outcome: form.get('outcome'),
      });
    },
    onSuccess: onDone,
  });

  return (
    <form className="space-y-4" onSubmit={(event) => mutation.mutate(event)}>
      <div className="grid gap-4 sm:grid-cols-2">
        <FieldSelect name="doctor" label="Linked doctor" options={[['', 'Unlinked clinic visit'], ...doctors.map((doctor) => [doctor.id, `${doctor.fullName} - ${doctor.clinicName}`])]} />
        <FieldInput name="doctorName" label="Doctor name" placeholder="For unlinked visits" />
        <FieldInput name="clinicName" label="Clinic name" required />
        <FieldInput name="clinicLocation" label="Clinic location" />
        <FieldInput name="visitDate" label="Visit date" type="date" required />
        <FieldInput name="visitTime" label="Visit time" type="time" />
        <FieldSelect name="outcome" label="Visit outcome" required options={outcomeOptions} />
        <FieldSelect name="doctorInterestLevel" label="Interest level" options={[['', 'Not captured'], ...interestOptions]} />
        <FieldInput name="followUpDate" label="Follow-up date" type="date" />
        <FieldInput name="nextAction" label="Next action" />
        <FieldTextarea name="discussionDetails" label="Discussion details" />
        <FieldTextarea name="followUpNotes" label="Follow-up notes" />
      </div>
      <ActionError error={mutation.error} />
      <FormFooter isSaving={mutation.isPending} submitLabel="Save visit" />
    </form>
  );
}

// Updates a follow-up status for a selected clinic visit.
function FollowUpForm({ row, onDone }: { row?: VisitRow; onDone: () => void }) {
  const mutation = useMutation({
    mutationFn: async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      return apiClient.patch(`/agents/me/visits/${row?.id}/follow-up`, {
        followUpStatus: form.get('followUpStatus'),
        note: form.get('note') || undefined,
        nextAction: form.get('nextAction') || undefined,
        followUpDate: form.get('followUpDate') || undefined,
      });
    },
    onSuccess: onDone,
  });

  return (
    <form className="space-y-4" onSubmit={(event) => mutation.mutate(event)}>
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
        <div className="text-sm font-bold text-neutral-900">{row?.clinicName}</div>
        <div className="mt-1 text-sm text-neutral-500">{row?.doctorName} | Current: {labelize(row?.followUpStatus)}</div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FieldSelect name="followUpStatus" label="Follow-up status" required defaultValue={row?.followUpStatus || 'completed'} options={[['completed', 'Completed'], ['missed', 'Missed'], ['cancelled', 'Cancelled'], ['scheduled', 'Reschedule']]} />
        <FieldInput name="followUpDate" label="Rescheduled date" type="date" />
        <FieldInput name="nextAction" label="Next action" />
        <FieldTextarea name="note" label="Completion note" />
      </div>
      <ActionError error={mutation.error} />
      <FormFooter isSaving={mutation.isPending} submitLabel="Update follow-up" />
    </form>
  );
}

// Provides the repeated heading treatment for agent pages.
function AgentWorkspace({ eyebrow, title, description, actions, children }: { eyebrow: string; title: string; description: string; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-[11px] font-extrabold tracking-[0.08em] text-teal-700">
            <Users className="h-3.5 w-3.5" />
            {eyebrow}
          </div>
          <h1 className="mt-3 text-2xl font-bold text-neutral-900 sm:text-3xl">{title}</h1>
          <p className="mt-1 max-w-3xl text-sm text-neutral-500">{description}</p>
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

// Renders compact KPI cards for agent workspaces.
function KpiGrid({ items }: { items: [string, string | number, React.ElementType, string][] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map(([label, value, Icon, tone]) => (
        <div key={label} className="card p-4">
          <div className={cn('mb-3 flex h-10 w-10 items-center justify-center rounded-lg', tone)}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="text-2xl font-bold text-neutral-900">{value}</div>
          <div className="text-sm text-neutral-500">{label}</div>
        </div>
      ))}
    </div>
  );
}

// Renders status filter buttons with stable sizing.
function StatusFilters({ statuses, active, onChange }: { statuses: string[]; active: string; onChange: (value: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2 lg:justify-end">
      {statuses.map((status) => (
        <button
          key={status}
          type="button"
          onClick={() => onChange(status)}
          className={cn('rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition-colors', active === status ? 'bg-primary-600 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200')}
        >
          {status === 'all' ? 'All' : labelize(status)}
        </button>
      ))}
    </div>
  );
}

// Shows a professional pill for approval, visit, and follow-up states.
function StatusPill({ value }: { value: string }) {
  const normalized = value.toLowerCase();
  const tone = normalized.includes('approved') || normalized.includes('active') || normalized.includes('completed') || normalized.includes('registered')
    ? 'bg-emerald-50 text-emerald-700'
    : normalized.includes('pending') || normalized.includes('review') || normalized.includes('scheduled') || normalized.includes('interested') || normalized.includes('required')
      ? 'bg-amber-50 text-amber-700'
      : normalized.includes('reject') || normalized.includes('suspend') || normalized.includes('missed') || normalized.includes('cancel') || normalized.includes('closed')
        ? 'bg-rose-50 text-rose-700'
        : 'bg-neutral-100 text-neutral-700';
  return <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize', tone)}>{value}</span>;
}

// Renders a proportional progress bar for performance metrics.
function ProgressRow({ label, value, total }: { label: string; value: number; total: number }) {
  const percent = Math.min(100, Math.round((value / Math.max(total, 1)) * 100));
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3 text-sm">
        <span className="font-semibold text-neutral-700">{label}</span>
        <span className="font-bold text-neutral-900">{value}/{total}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-neutral-100">
        <div className="h-full rounded-full bg-primary-600" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function FieldInput({ name, label, type = 'text', placeholder, required }: { name: string; label: string; type?: string; placeholder?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-neutral-700">{label}</span>
      <input name={name} type={type} placeholder={placeholder} required={required} className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-primary-500" />
    </label>
  );
}

function FieldTextarea({ name, label }: { name: string; label: string }) {
  return (
    <label className="block sm:col-span-2">
      <span className="text-sm font-semibold text-neutral-700">{label}</span>
      <textarea name={name} className="mt-2 min-h-24 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-primary-500" />
    </label>
  );
}

function FieldSelect({ name, label, options, required, defaultValue }: { name: string; label: string; options: string[][]; required?: boolean; defaultValue?: string }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-neutral-700">{label}</span>
      <select name={name} required={required} defaultValue={defaultValue} className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-primary-500">
        {options.map(([value, optionLabel]) => <option key={value} value={value}>{optionLabel}</option>)}
      </select>
    </label>
  );
}

function FormFooter({ isSaving, submitLabel }: { isSaving: boolean; submitLabel: string }) {
  return (
    <div className="flex justify-end border-t border-neutral-100 pt-4">
      <button type="submit" disabled={isSaving} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60">
        {isSaving ? 'Saving...' : submitLabel}
      </button>
    </div>
  );
}

function ActionError({ error }: { error: unknown }) {
  if (!error) return null;
  const message = String(asRecord(asRecord(error).response).data ? asRecord(asRecord(asRecord(error).response).data).message || 'Request failed.' : asRecord(error).message || 'Request failed.');
  return <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{message}</div>;
}

function mapDoctor(record: ApiRecord): DoctorRow {
  return {
    id: text(record._id || record.id),
    fullName: text(record.fullName, 'Unnamed doctor'),
    doctorId: text(record.doctorId, '-'),
    clinicName: text(record.clinicName, 'Clinic not captured'),
    city: text(record.city, '-'),
    status: text(record.status, 'submitted'),
    specialization: text(record.specialization, '-'),
    mobile: text(record.mobile, '-'),
    requestedPatientFee: Number(record.requestedPatientFee || 0),
    approvedPatientFee: Number(record.approvedPatientFee || 0),
    createdAt: text(record.createdAt),
    raw: record,
  };
}

function mapVisit(record: ApiRecord): VisitRow {
  return {
    id: text(record._id || record.id),
    doctorName: text(nested(record, 'doctor.fullName') || record.doctorName, 'Unlinked doctor'),
    clinicName: text(record.clinicName || nested(record, 'doctor.clinicName'), 'Clinic not captured'),
    visitDate: text(record.visitDate),
    visitTime: text(record.visitTime),
    clinicLocation: text(record.clinicLocation),
    outcome: text(record.outcome, 'not_recorded'),
    doctorInterestLevel: text(record.doctorInterestLevel, '-'),
    followUpDate: text(record.followUpDate),
    followUpStatus: text(record.followUpStatus, 'not_required'),
    nextAction: text(record.nextAction || record.followUpNotes),
    raw: record,
  };
}

function extractItems(payload: unknown): ApiRecord[] {
  if (Array.isArray(payload)) return payload as ApiRecord[];
  const record = asRecord(payload);
  if (Array.isArray(record.items)) return record.items as ApiRecord[];
  if (Array.isArray(record.data)) return record.data as ApiRecord[];
  return [];
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

function labelize(value: unknown) {
  return text(value, '-').replace(/_/g, ' ');
}

function dateText(value: unknown) {
  if (!value) return '-';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default AgentDoctorsPage;
