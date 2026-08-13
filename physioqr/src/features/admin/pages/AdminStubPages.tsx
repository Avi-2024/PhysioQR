import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  FolderSearch,
  MapPin,
  MoreVertical,
  ShieldCheck,
  Star,
  UserPlus,
  Users,
  Wallet,
  CreditCard,
  PieChart,
  Settings,
  FileText,
  MessageSquare,
  Clock3,
  QrCode,
  ClipboardList,
  ReceiptText,
} from 'lucide-react';
import { SearchInput } from '@/components/ui/SearchInput';
import { DataTable, type DataTableColumn } from '@/components/data-display/DataTable';
import { cn } from '@/lib/cn';

type StubProps = {
  title: string;
  description: string;
  steps: string[];
  icon: React.ElementType;
};

// This page gives a focused phase-1 placeholder for each admin module until the real screen is built.
function StubPage({ title, description, steps, icon: Icon }: StubProps) {
  return (
    <div className="card p-5 sm:p-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-[11px] font-extrabold tracking-[0.08em] text-teal-700">
            <Icon className="h-3.5 w-3.5" />
            ADMIN MODULE
          </div>
          <h1 className="mt-3 text-2xl sm:text-3xl font-bold text-neutral-900">{title}</h1>
          <p className="mt-2 text-sm sm:text-base text-neutral-600 max-w-xl">{description}</p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {steps.map((step) => (
              <div key={step} className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700">
                {step}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-teal-200 bg-teal-50 p-5 lg:w-[320px]">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-600 text-white">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-teal-950">{title}</div>
              <div className="text-xs text-teal-700">Phase 1 admin surface</div>
            </div>
          </div>
          <div className="mt-5 space-y-3 text-sm text-teal-900">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" /> Role protected
            </div>
            <div className="flex items-center gap-2">
              <FolderSearch className="h-4 w-4" /> Search, filter, and review workflow
            </div>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" /> Audit-ready action log
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white">
          Open module <ArrowRight className="h-4 w-4" />
        </button>
        <button className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-semibold text-neutral-700">
          Review requirements
        </button>
      </div>
    </div>
  );
}

export const AdminAgentsPage = () => (
  <AgentsManagementPage />
);

export const AdminAgentDetailPage = () => (
  <StubPage
    title="Agent Details"
    description="Detailed profile for one field agent, including assigned doctors, visit log, and onboarding outcomes."
    steps={['Agent profile header', 'Registered doctors', 'Visit timeline', 'Follow-up and performance view']}
    icon={Users}
  />
);

export const AdminDoctorsPage = () => (
  <DoctorsApprovalPage />
);

export const AdminDoctorNewPage = () => (
  <StubPage
    title="Register New Doctor"
    description="Capture doctor identity, clinic details, referral program data, and onboarding documents in one flow."
    steps={['Personal details form', 'Clinic and professional details', 'Document upload', 'Submit for admin review']}
    icon={ShieldCheck}
  />
);

export const AdminDoctorDetailPage = () => (
  <StubPage
    title="Doctor Details"
    description="Inspect a single doctor record, referral QR status, patient conversion, payments, wallet, and approval history."
    steps={['Doctor summary', 'QR and referral info', 'Wallet and payout review', 'Audit log and status actions']}
    icon={ShieldCheck}
  />
);

export const AdminPatientsPage = () => (
  <PatientsManagementPage />
);

export const AdminPaymentsPage = () => (
  <PaymentsManagementPage />
);

export const AdminFeeSharesPage = () => (
  <StubPage
    title="Fee Shares"
    description="Track doctor rehabilitation programme fee share entries across estimated, pending, available, reversed, and paid states."
    steps={['Fee-share ledger list', 'Holding-period release queue', 'Refund reversal visibility', 'Doctor and payment filters']}
    icon={PieChart}
  />
);

export const AdminWalletsPage = () => (
  <StubPage
    title="Doctor Wallets"
    description="View doctor wallet balances from ledger entries instead of manually overwritten balances."
    steps={['Pending and available balance', 'Wallet ledger entries', 'Manual credit/debit with reason', 'Withdrawal blocking checks']}
    icon={Wallet}
  />
);

export const AdminWithdrawalsPage = () => (
  <WithdrawalsManagementPage />
);

export const AdminReportsPage = () => (
  <StubPage
    title="Reports"
    description="Business, clinical, referral, financial, doctor, agent, patient, program, operational, and risk reports."
    steps={['Date and role filters', 'Financial exports', 'Referral conversion funnel', 'Program completion analytics']}
    icon={FileText}
  />
);

export const AdminSettingsPage = () => (
  <StubPage
    title="Settings"
    description="Configure global pricing, fee-share defaults, withdrawal rules, refund rules, OTP, notifications, and legal documents."
    steps={['General platform settings', 'Commercial rules', 'Patient access controls', 'Legal and notification templates']}
    icon={Settings}
  />
);

type AgentStatus = 'active' | 'inactive' | 'suspended' | 'pending';

type AgentRecord = {
  id: string;
  name: string;
  mobile: string;
  city: string;
  region: string;
  status: AgentStatus;
  doctorsRegistered: number;
  patientsGenerated: number;
  pendingFollowUps: number;
  monthlyRevenue: number;
  lastVisit: string;
  performance: 'High' | 'Medium' | 'Low';
};

const AGENT_DATA: AgentRecord[] = [
  { id: 'AG-001', name: 'Amit Kumar', mobile: '+91 98765 10001', city: 'Noida', region: 'North Delhi NCR', status: 'active', doctorsRegistered: 14, patientsGenerated: 128, pendingFollowUps: 3, monthlyRevenue: 184000, lastVisit: '2026-08-11', performance: 'High' },
  { id: 'AG-002', name: 'Suresh Verma', mobile: '+91 98765 10002', city: 'Ghaziabad', region: 'East UP', status: 'active', doctorsRegistered: 9, patientsGenerated: 84, pendingFollowUps: 2, monthlyRevenue: 102000, lastVisit: '2026-08-10', performance: 'High' },
  { id: 'AG-003', name: 'Neha Singh', mobile: '+91 98765 10003', city: 'Lucknow', region: 'Central UP', status: 'pending', doctorsRegistered: 4, patientsGenerated: 21, pendingFollowUps: 5, monthlyRevenue: 26000, lastVisit: '2026-08-08', performance: 'Medium' },
  { id: 'AG-004', name: 'Rahul Joshi', mobile: '+91 98765 10004', city: 'Jaipur', region: 'Rajasthan West', status: 'suspended', doctorsRegistered: 6, patientsGenerated: 34, pendingFollowUps: 0, monthlyRevenue: 0, lastVisit: '2026-08-02', performance: 'Low' },
  { id: 'AG-005', name: 'Priya Mehta', mobile: '+91 98765 10005', city: 'Pune', region: 'Maharashtra South', status: 'inactive', doctorsRegistered: 7, patientsGenerated: 48, pendingFollowUps: 1, monthlyRevenue: 54000, lastVisit: '2026-08-06', performance: 'Medium' },
];

function AgentsManagementPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | AgentStatus>('all');

  const filteredAgents = useMemo(() => {
    const query = search.trim().toLowerCase();
    return AGENT_DATA.filter((agent) => {
      const matchesSearch =
        !query ||
        [agent.id, agent.name, agent.city, agent.region, agent.mobile].some((value) =>
          value.toLowerCase().includes(query)
        );
      const matchesStatus = statusFilter === 'all' || agent.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter]);

  const columns: DataTableColumn<AgentRecord>[] = [
    {
      key: 'name',
      header: 'Agent',
      render: (row) => (
        <div className="min-w-0">
          <div className="font-semibold text-neutral-900">{row.name}</div>
          <div className="text-xs text-neutral-500">{row.id}</div>
        </div>
      ),
    },
    {
      key: 'location',
      header: 'Location',
      render: (row) => (
        <div className="min-w-0">
          <div className="inline-flex items-center gap-1.5 text-sm text-neutral-700">
            <MapPin className="h-4 w-4 text-neutral-400" />
            {row.city}
          </div>
          <div className="text-xs text-neutral-500">{row.region}</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold', statusChipClass(row.status))}>
          {statusLabel(row.status)}
        </span>
      ),
    },
    {
      key: 'performance',
      header: 'Performance',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Star className={cn('h-4 w-4', row.performance === 'High' ? 'text-amber-500' : row.performance === 'Medium' ? 'text-sky-500' : 'text-neutral-400')} />
          <span className="text-sm text-neutral-700">{row.performance}</span>
        </div>
      ),
    },
    { key: 'doctorsRegistered', header: 'Doctors', render: (row) => <span className="font-semibold text-neutral-900">{row.doctorsRegistered}</span> },
    { key: 'patientsGenerated', header: 'Patients', render: (row) => <span className="font-semibold text-neutral-900">{row.patientsGenerated}</span> },
    { key: 'pendingFollowUps', header: 'Follow-ups', render: (row) => <span className="font-semibold text-neutral-900">{row.pendingFollowUps}</span> },
    { key: 'monthlyRevenue', header: 'Revenue', render: (row) => <span className="font-semibold text-neutral-900">₹{row.monthlyRevenue.toLocaleString('en-IN')}</span> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-[11px] font-extrabold tracking-[0.08em] text-teal-700">
            <Users className="h-3.5 w-3.5" />
            AGENT MANAGEMENT
          </div>
          <h1 className="mt-3 text-2xl sm:text-3xl font-bold text-neutral-900">Agents</h1>
          <p className="mt-1 max-w-2xl text-sm text-neutral-500">
            Track field onboarding, clinic visits, doctor registrations, follow-ups, and region-wise performance.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50">
            <Clock3 className="h-4 w-4" />
            Schedule visit
          </button>
          <button className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700">
            <UserPlus className="h-4 w-4" />
            Add agent
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total agents" value={AGENT_DATA.length} icon={Users} tone="bg-sky-50 text-sky-600" />
        <MetricCard label="Active agents" value={AGENT_DATA.filter((agent) => agent.status === 'active').length} icon={ShieldCheck} tone="bg-emerald-50 text-emerald-600" />
        <MetricCard label="Pending follow-ups" value={AGENT_DATA.reduce((sum, agent) => sum + agent.pendingFollowUps, 0)} icon={MessageSquare} tone="bg-amber-50 text-amber-600" />
        <MetricCard label="Monthly revenue" value={`₹${AGENT_DATA.reduce((sum, agent) => sum + agent.monthlyRevenue, 0).toLocaleString('en-IN')}`} icon={Wallet} tone="bg-violet-50 text-violet-600" />
      </div>

      <div className="card p-5 min-w-0">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <SearchInput value={search} onChange={setSearch} placeholder="Search agents, city, region, or mobile" className="max-w-xl" />

          <div className="flex flex-wrap gap-2">
            {(['all', 'active', 'pending', 'inactive', 'suspended'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={cn(
                  'rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition-colors',
                  statusFilter === status
                    ? 'bg-primary-600 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                )}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <DataTable
            columns={columns}
            data={filteredAgents}
            emptyMessage="No agents match the current filters."
            onRowClick={(row) => {
              window.location.href = `/admin/agents/${row.id}`;
            }}
          />
        </div>
      </div>
    </div>
  );
}

type DoctorReviewStatus = 'draft' | 'submitted' | 'under_review' | 'documents_required' | 'approved' | 'rejected' | 'suspended';

type DoctorRecord = {
  id: string;
  name: string;
  clinic: string;
  specialization: string;
  agent: string;
  city: string;
  status: DoctorReviewStatus;
  patientFee: number;
  feeSharePercent: number;
  kycStatus: 'verified' | 'under_review' | 'rejected';
  bankStatus: 'verified' | 'pending' | 'rejected';
  qrStatus: 'active' | 'disabled';
  patientCount: number;
  paidCount: number;
  submittedAt: string;
  lastUpdated: string;
};

const DOCTOR_DATA: DoctorRecord[] = [
  { id: 'DR-001', name: 'Dr. Rajesh Sharma', clinic: 'Sharma Physiotherapy Clinic', specialization: 'Orthopaedics & Rehabilitation', agent: 'Amit Kumar', city: 'Mumbai', status: 'approved', patientFee: 500, feeSharePercent: 60, kycStatus: 'verified', bankStatus: 'verified', qrStatus: 'active', patientCount: 41, paidCount: 29, submittedAt: '2026-07-10', lastUpdated: '2026-08-11' },
  { id: 'DR-002', name: 'Dr. Priya Patel', clinic: 'Joint Care Clinic', specialization: 'Sports Medicine', agent: 'Suresh Verma', city: 'Pune', status: 'submitted', patientFee: 450, feeSharePercent: 60, kycStatus: 'under_review', bankStatus: 'pending', qrStatus: 'disabled', patientCount: 18, paidCount: 11, submittedAt: '2026-08-09', lastUpdated: '2026-08-11' },
  { id: 'DR-003', name: 'Dr. Kiran Mehta', clinic: 'Mehta Ortho Centre', specialization: 'Orthopaedics', agent: 'Amit Kumar', city: 'Indore', status: 'under_review', patientFee: 550, feeSharePercent: 65, kycStatus: 'verified', bankStatus: 'verified', qrStatus: 'disabled', patientCount: 9, paidCount: 4, submittedAt: '2026-08-08', lastUpdated: '2026-08-10' },
  { id: 'DR-004', name: 'Dr. Ananya Sen', clinic: 'Sen Physio Point', specialization: 'Physiotherapy', agent: 'Neha Singh', city: 'Lucknow', status: 'documents_required', patientFee: 500, feeSharePercent: 55, kycStatus: 'rejected', bankStatus: 'pending', qrStatus: 'disabled', patientCount: 6, paidCount: 2, submittedAt: '2026-08-07', lastUpdated: '2026-08-09' },
  { id: 'DR-005', name: 'Dr. Rahul Joshi', clinic: 'Pulse Rehab Centre', specialization: 'Sports Injury Rehab', agent: 'Suresh Verma', city: 'Jaipur', status: 'suspended', patientFee: 500, feeSharePercent: 60, kycStatus: 'verified', bankStatus: 'verified', qrStatus: 'disabled', patientCount: 23, paidCount: 12, submittedAt: '2026-06-18', lastUpdated: '2026-08-01' },
];

function DoctorsApprovalPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | DoctorReviewStatus>('all');

  const filteredDoctors = useMemo(() => {
    const query = search.trim().toLowerCase();
    return DOCTOR_DATA.filter((doctor) => {
      const matchesSearch =
        !query ||
        [doctor.id, doctor.name, doctor.clinic, doctor.specialization, doctor.agent, doctor.city].some((value) =>
          value.toLowerCase().includes(query)
        );
      const matchesStatus = statusFilter === 'all' || doctor.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter]);

  const columns: DataTableColumn<DoctorRecord>[] = [
    {
      key: 'name',
      header: 'Doctor',
      render: (row) => (
        <div className="min-w-0">
          <div className="font-semibold text-neutral-900">{row.name}</div>
          <div className="text-xs text-neutral-500">{row.id}</div>
          <div className="text-xs text-neutral-500">{row.clinic}</div>
        </div>
      ),
    },
    {
      key: 'agent',
      header: 'Agent',
      render: (row) => <span className="text-sm text-neutral-700">{row.agent}</span>,
    },
    {
      key: 'status',
      header: 'Approval',
      render: (row) => <BadgePill tone={doctorStatusTone(row.status)} label={doctorStatusLabel(row.status)} />,
    },
    {
      key: 'pricing',
      header: 'Fee / Share',
      render: (row) => (
        <div className="text-sm text-neutral-700">
          <div className="font-semibold text-neutral-900">₹{row.patientFee} fee</div>
          <div className="text-xs text-neutral-500">{row.feeSharePercent}% fee share</div>
        </div>
      ),
    },
    {
      key: 'compliance',
      header: 'Compliance',
      render: (row) => (
        <div className="space-y-1 text-xs">
          <BadgePill tone={row.kycStatus === 'verified' ? 'success' : row.kycStatus === 'under_review' ? 'warning' : 'danger'} label={`KYC ${row.kycStatus.replace('_', ' ')}`} />
          <BadgePill tone={row.bankStatus === 'verified' ? 'success' : row.bankStatus === 'pending' ? 'neutral' : 'danger'} label={`Bank ${row.bankStatus}`} />
        </div>
      ),
    },
    {
      key: 'qrStatus',
      header: 'QR',
      render: (row) => (
        <div className="flex items-center gap-2">
          <QrCode className={cn('h-4 w-4', row.qrStatus === 'active' ? 'text-teal-600' : 'text-neutral-400')} />
          <span className="text-sm text-neutral-700 capitalize">{row.qrStatus}</span>
        </div>
      ),
    },
    { key: 'patientCount', header: 'Patients', render: (row) => <span className="font-semibold text-neutral-900">{row.patientCount}</span> },
    { key: 'submittedAt', header: 'Submitted', render: (row) => <span className="text-sm text-neutral-600">{row.submittedAt}</span> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-[11px] font-extrabold tracking-[0.08em] text-teal-700">
            <ClipboardList className="h-3.5 w-3.5" />
            DOCTOR APPROVALS
          </div>
          <h1 className="mt-3 text-2xl sm:text-3xl font-bold text-neutral-900">Doctors</h1>
          <p className="mt-1 max-w-2xl text-sm text-neutral-500">
            Review onboarding, approve or reject doctors, manage QR activation, and track fee share and compliance status.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50">
            <MoreVertical className="h-4 w-4" />
            Bulk actions
          </button>
          <button className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700">
            <ShieldCheck className="h-4 w-4" />
            Review queue
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total doctors" value={DOCTOR_DATA.length} icon={ShieldCheck} tone="bg-primary-50 text-primary-600" />
        <MetricCard label="Pending approvals" value={DOCTOR_DATA.filter((doctor) => doctor.status === 'submitted' || doctor.status === 'under_review' || doctor.status === 'documents_required').length} icon={Clock3} tone="bg-amber-50 text-amber-600" />
        <MetricCard label="Active QR codes" value={DOCTOR_DATA.filter((doctor) => doctor.qrStatus === 'active').length} icon={QrCode} tone="bg-teal-50 text-teal-600" />
        <MetricCard label="Suspended doctors" value={DOCTOR_DATA.filter((doctor) => doctor.status === 'suspended').length} icon={ShieldCheck} tone="bg-rose-50 text-rose-600" />
      </div>

      <div className="card p-5 min-w-0">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <SearchInput value={search} onChange={setSearch} placeholder="Search doctors, clinics, city, agent" className="max-w-xl" />

          <div className="flex flex-wrap gap-2">
            {(['all', 'submitted', 'under_review', 'documents_required', 'approved', 'rejected', 'suspended'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={cn(
                  'rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition-colors',
                  statusFilter === status ? 'bg-primary-600 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                )}
              >
                {status === 'all' ? 'All' : doctorStatusLabel(status)}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <DataTable
            columns={columns}
            data={filteredDoctors}
            emptyMessage="No doctors match the current filters."
            onRowClick={(row) => {
              window.location.href = `/admin/doctors/${row.id}`;
            }}
          />
        </div>
      </div>
    </div>
  );
}

type PatientAdminStatus = 'active' | 'pending' | 'paused' | 'completed' | 'expired';

type PatientRecord = {
  id: string;
  name: string;
  mobile: string;
  doctor: string;
  program: string;
  city: string;
  paymentStatus: 'successful' | 'pending' | 'failed' | 'refunded';
  programStatus: PatientAdminStatus;
  redFlag: boolean;
  currentDay: number;
  totalDays: number;
  completion: number;
  paymentAmount: number;
  registrationDate: string;
  lastActiveDate: string;
};

const PATIENT_DATA: PatientRecord[] = [
  { id: 'PAT-701', name: 'Priya Verma', mobile: '98XXXX4321', doctor: 'Dr. Rajesh Sharma', program: '14-Day Knee Strengthening & Mobility', city: 'Mumbai', paymentStatus: 'successful', programStatus: 'active', redFlag: false, currentDay: 7, totalDays: 14, completion: 45, paymentAmount: 500, registrationDate: '2026-08-01', lastActiveDate: '2026-08-11' },
  { id: 'PAT-702', name: 'Rahul Singh', mobile: '97XXXX9812', doctor: 'Dr. Rajesh Sharma', program: '14-Day Lumbar Recovery', city: 'Mumbai', paymentStatus: 'successful', programStatus: 'active', redFlag: false, currentDay: 10, totalDays: 14, completion: 70, paymentAmount: 500, registrationDate: '2026-07-28', lastActiveDate: '2026-08-11' },
  { id: 'PAT-703', name: 'Neha Patel', mobile: '99XXXX1122', doctor: 'Dr. Priya Patel', program: '14-Day Cervical Posture Care', city: 'Pune', paymentStatus: 'pending', programStatus: 'pending', redFlag: true, currentDay: 0, totalDays: 14, completion: 0, paymentAmount: 500, registrationDate: '2026-08-05', lastActiveDate: '2026-08-05' },
  { id: 'PAT-704', name: 'Arjun Mehta', mobile: '98XXXX6677', doctor: 'Dr. Kiran Mehta', program: '14-Day Rotator Cuff Recovery', city: 'Indore', paymentStatus: 'refunded', programStatus: 'expired', redFlag: false, currentDay: 2, totalDays: 14, completion: 15, paymentAmount: 500, registrationDate: '2026-07-20', lastActiveDate: '2026-07-22' },
  { id: 'PAT-705', name: 'Kavita Joshi', mobile: '96XXXX3344', doctor: 'Dr. Rajesh Sharma', program: '14-Day Knee Strengthening & Mobility', city: 'Mumbai', paymentStatus: 'successful', programStatus: 'completed', redFlag: false, currentDay: 14, totalDays: 14, completion: 100, paymentAmount: 500, registrationDate: '2026-07-10', lastActiveDate: '2026-07-24' },
];

function PatientsManagementPage() {
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'all' | PatientRecord['paymentStatus']>('all');
  const [programFilter, setProgramFilter] = useState<'all' | PatientAdminStatus>('all');

  const filteredPatients = useMemo(() => {
    const query = search.trim().toLowerCase();
    return PATIENT_DATA.filter((patient) => {
      const matchesSearch =
        !query ||
        [patient.id, patient.name, patient.mobile, patient.doctor, patient.program, patient.city].some((value) =>
          value.toLowerCase().includes(query)
        );
      const matchesPayment = paymentFilter === 'all' || patient.paymentStatus === paymentFilter;
      const matchesProgram = programFilter === 'all' || patient.programStatus === programFilter;
      return matchesSearch && matchesPayment && matchesProgram;
    });
  }, [search, paymentFilter, programFilter]);

  const columns: DataTableColumn<PatientRecord>[] = [
    {
      key: 'name',
      header: 'Patient',
      render: (row) => (
        <div className="min-w-0">
          <div className="font-semibold text-neutral-900">{row.name}</div>
          <div className="text-xs text-neutral-500">{row.id}</div>
          <div className="text-xs text-neutral-500">{row.mobile}</div>
        </div>
      ),
    },
    {
      key: 'doctor',
      header: 'Doctor',
      render: (row) => <span className="text-sm text-neutral-700">{row.doctor}</span>,
    },
    {
      key: 'paymentStatus',
      header: 'Payment',
      render: (row) => <BadgePill tone={patientPaymentTone(row.paymentStatus)} label={patientPaymentLabel(row.paymentStatus)} />,
    },
    {
      key: 'programStatus',
      header: 'Program',
      render: (row) => <BadgePill tone={programTone(row.programStatus)} label={programLabel(row.programStatus)} />,
    },
    {
      key: 'progress',
      header: 'Progress',
      render: (row) => (
        <div className="min-w-0">
          <div className="text-sm font-semibold text-neutral-900">{row.currentDay}/{row.totalDays} days</div>
          <div className="mt-1 h-2 rounded-full bg-neutral-100">
            <div className="h-2 rounded-full bg-primary-600" style={{ width: `${row.completion}%` }} />
          </div>
          <div className="mt-1 text-xs text-neutral-500">{row.completion}% complete</div>
        </div>
      ),
    },
    {
      key: 'risk',
      header: 'Safety',
      render: (row) => (
        <div className="flex items-center gap-2">
          <ShieldCheck className={cn('h-4 w-4', row.redFlag ? 'text-rose-600' : 'text-emerald-600')} />
          <span className={cn('text-sm font-medium', row.redFlag ? 'text-rose-700' : 'text-emerald-700')}>
            {row.redFlag ? 'Red flag' : 'Cleared'}
          </span>
        </div>
      ),
    },
    { key: 'paymentAmount', header: 'Fee', render: (row) => <span className="font-semibold text-neutral-900">₹{row.paymentAmount}</span> },
    { key: 'registrationDate', header: 'Registered', render: (row) => <span className="text-sm text-neutral-600">{row.registrationDate}</span> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-[11px] font-extrabold tracking-[0.08em] text-teal-700">
            <Users className="h-3.5 w-3.5" />
            PATIENT MANAGEMENT
          </div>
          <h1 className="mt-3 text-2xl sm:text-3xl font-bold text-neutral-900">Patients</h1>
          <p className="mt-1 max-w-2xl text-sm text-neutral-500">
            Review registrations, payment outcomes, program progress, and high-risk assessment flags.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50">
            <FileText className="h-4 w-4" />
            Export list
          </button>
          <button className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700">
            <FolderSearch className="h-4 w-4" />
            Open safety review
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total patients" value={PATIENT_DATA.length} icon={Users} tone="bg-sky-50 text-sky-600" />
        <MetricCard label="Paid patients" value={PATIENT_DATA.filter((patient) => patient.paymentStatus === 'successful').length} icon={CreditCard} tone="bg-emerald-50 text-emerald-600" />
        <MetricCard label="Active programs" value={PATIENT_DATA.filter((patient) => patient.programStatus === 'active').length} icon={ClipboardList} tone="bg-primary-50 text-primary-600" />
        <MetricCard label="Red flags" value={PATIENT_DATA.filter((patient) => patient.redFlag).length} icon={ShieldCheck} tone="bg-rose-50 text-rose-600" />
      </div>

      <div className="card p-5 min-w-0">
        <div className="grid gap-3 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <SearchInput value={search} onChange={setSearch} placeholder="Search patients, doctor, program, city, mobile" />
          </div>

          <div className="flex flex-wrap gap-2 lg:justify-end">
            {(['all', 'successful', 'pending', 'failed', 'refunded'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setPaymentFilter(status)}
                className={cn('rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition-colors', paymentFilter === status ? 'bg-primary-600 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200')}
              >
                {status === 'all' ? 'All payments' : paymentLabel(status)}
              </button>
            ))}
            {(['all', 'active', 'pending', 'paused', 'completed', 'expired'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setProgramFilter(status)}
                className={cn('rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition-colors', programFilter === status ? 'bg-teal-600 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200')}
              >
                {status === 'all' ? 'All programs' : programLabel(status)}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <DataTable
            columns={columns}
            data={filteredPatients}
            emptyMessage="No patients match the current filters."
            onRowClick={(row) => {
              window.location.href = `/admin/patients/${row.id}`;
            }}
          />
        </div>
      </div>
    </div>
  );
}

type PaymentRow = {
  id: string;
  patient: string;
  doctor: string;
  program: string;
  amount: number;
  paymentStatus: 'successful' | 'pending' | 'failed' | 'refunded' | 'disputed';
  feeShareStatus: 'pending' | 'on_hold' | 'available' | 'reversed';
  refundStatus: 'none' | 'requested' | 'processed';
  method: 'upi' | 'card' | 'netbanking' | 'wallet';
  paidAt: string;
  qrScanSource: string;
  gatewayRef: string;
};

const PAYMENT_DATA: PaymentRow[] = [
  { id: 'PAY-201', patient: 'Priya Verma', doctor: 'Dr. Rajesh Sharma', program: 'Knee Strengthening & Mobility', amount: 500, paymentStatus: 'successful', feeShareStatus: 'available', refundStatus: 'none', method: 'upi', paidAt: '2026-08-11 09:40', qrScanSource: 'Doctor QR', gatewayRef: 'PG-89A1-5566' },
  { id: 'PAY-202', patient: 'Rahul Singh', doctor: 'Dr. Rajesh Sharma', program: 'Lumbar Recovery', amount: 500, paymentStatus: 'successful', feeShareStatus: 'on_hold', refundStatus: 'none', method: 'card', paidAt: '2026-08-11 10:05', qrScanSource: 'Doctor QR', gatewayRef: 'PG-12K9-4451' },
  { id: 'PAY-203', patient: 'Neha Patel', doctor: 'Dr. Priya Patel', program: 'Cervical Posture Care', amount: 500, paymentStatus: 'pending', feeShareStatus: 'pending', refundStatus: 'none', method: 'upi', paidAt: '2026-08-11 10:20', qrScanSource: 'Referral Link', gatewayRef: 'PG-11Q2-2201' },
  { id: 'PAY-204', patient: 'Arjun Mehta', doctor: 'Dr. Kiran Mehta', program: 'Rotator Cuff Recovery', amount: 500, paymentStatus: 'refunded', feeShareStatus: 'reversed', refundStatus: 'processed', method: 'netbanking', paidAt: '2026-08-10 16:12', qrScanSource: 'Doctor QR', gatewayRef: 'PG-77M4-8830' },
  { id: 'PAY-205', patient: 'Kavita Joshi', doctor: 'Dr. Rajesh Sharma', program: 'Knee Strengthening & Mobility', amount: 500, paymentStatus: 'disputed', feeShareStatus: 'on_hold', refundStatus: 'requested', method: 'wallet', paidAt: '2026-08-09 11:08', qrScanSource: 'Doctor QR', gatewayRef: 'PG-08V1-1952' },
];

function PaymentsManagementPage() {
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'all' | PaymentRow['paymentStatus']>('all');
  const [refundFilter, setRefundFilter] = useState<'all' | PaymentRow['refundStatus']>('all');

  const filteredPayments = useMemo(() => {
    const query = search.trim().toLowerCase();
    return PAYMENT_DATA.filter((payment) => {
      const matchesSearch =
        !query ||
        [payment.id, payment.patient, payment.doctor, payment.program, payment.gatewayRef, payment.qrScanSource].some((value) =>
          value.toLowerCase().includes(query)
        );
      const matchesPayment = paymentFilter === 'all' || payment.paymentStatus === paymentFilter;
      const matchesRefund = refundFilter === 'all' || payment.refundStatus === refundFilter;
      return matchesSearch && matchesPayment && matchesRefund;
    });
  }, [search, paymentFilter, refundFilter]);

  const columns: DataTableColumn<PaymentRow>[] = [
    {
      key: 'id',
      header: 'Payment',
      render: (row) => (
        <div className="min-w-0">
          <div className="font-semibold text-neutral-900">{row.id}</div>
          <div className="text-xs text-neutral-500">{row.patient}</div>
          <div className="text-xs text-neutral-500">{row.program}</div>
        </div>
      ),
    },
    {
      key: 'doctor',
      header: 'Doctor',
      render: (row) => <span className="text-sm text-neutral-700">{row.doctor}</span>,
    },
    {
      key: 'paymentStatus',
      header: 'Payment Status',
      render: (row) => <BadgePill tone={paymentTone(row.paymentStatus)} label={paymentLabel(row.paymentStatus)} />,
    },
    {
      key: 'feeShareStatus',
      header: 'Fee Share',
      render: (row) => <BadgePill tone={feeShareTone(row.feeShareStatus)} label={feeShareLabel(row.feeShareStatus)} />,
    },
    {
      key: 'refundStatus',
      header: 'Refund',
      render: (row) => <BadgePill tone={refundTone(row.refundStatus)} label={refundLabel(row.refundStatus)} />,
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (row) => <span className="font-semibold text-neutral-900">₹{row.amount}</span>,
    },
    {
      key: 'method',
      header: 'Method',
      render: (row) => <span className="text-sm text-neutral-700 uppercase">{row.method}</span>,
    },
    { key: 'paidAt', header: 'Paid At', render: (row) => <span className="text-sm text-neutral-600">{row.paidAt}</span> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-[11px] font-extrabold tracking-[0.08em] text-teal-700">
            <ReceiptText className="h-3.5 w-3.5" />
            PAYMENTS AND REFUNDS
          </div>
          <h1 className="mt-3 text-2xl sm:text-3xl font-bold text-neutral-900">Payments</h1>
          <p className="mt-1 max-w-2xl text-sm text-neutral-500">
            Track patient collections, fee-share release states, refunds, disputes, and payment gateway references.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50">
            <FileText className="h-4 w-4" />
            Export CSV
          </button>
          <button className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700">
            <FolderSearch className="h-4 w-4" />
            Review disputes
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Successful payments" value={PAYMENT_DATA.filter((payment) => payment.paymentStatus === 'successful').length} icon={CreditCard} tone="bg-emerald-50 text-emerald-600" />
        <MetricCard label="Pending confirmations" value={PAYMENT_DATA.filter((payment) => payment.paymentStatus === 'pending').length} icon={Clock3} tone="bg-amber-50 text-amber-600" />
        <MetricCard label="Refunds / disputes" value={PAYMENT_DATA.filter((payment) => payment.refundStatus !== 'none').length} icon={ShieldCheck} tone="bg-rose-50 text-rose-600" />
        <MetricCard label="Fee shares on hold" value={PAYMENT_DATA.filter((payment) => payment.feeShareStatus === 'on_hold').length} icon={Wallet} tone="bg-violet-50 text-violet-600" />
      </div>

      <div className="card p-5 min-w-0">
        <div className="grid gap-3 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <SearchInput value={search} onChange={setSearch} placeholder="Search payments, patient, doctor, gateway ref, program" />
          </div>

          <div className="flex flex-wrap gap-2 lg:justify-end">
            {(['all', 'successful', 'pending', 'failed', 'refunded', 'disputed'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setPaymentFilter(status)}
                className={cn('rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition-colors', paymentFilter === status ? 'bg-primary-600 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200')}
              >
                {status === 'all' ? 'All payments' : paymentLabel(status)}
              </button>
            ))}
            {(['all', 'none', 'requested', 'processed'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setRefundFilter(status)}
                className={cn('rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition-colors', refundFilter === status ? 'bg-teal-600 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200')}
              >
                {status === 'all' ? 'All refunds' : refundLabel(status)}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <DataTable
            columns={columns}
            data={filteredPayments}
            emptyMessage="No payments match the current filters."
            onRowClick={(row) => {
              window.location.href = `/admin/payments/${row.id}`;
            }}
          />
        </div>
      </div>
    </div>
  );
}

type WithdrawalRecord = {
  id: string;
  doctor: string;
  clinic: string;
  amount: number;
  status: 'requested' | 'under_review' | 'approved' | 'rejected' | 'processing' | 'paid' | 'failed' | 'cancelled' | 'reversed';
  kycStatus: 'verified' | 'under_review' | 'rejected';
  bankStatus: 'verified' | 'pending' | 'rejected';
  availableBalance: number;
  holdBalance: number;
  requestDate: string;
  payoutCycle: string;
  bankRef: string;
  city: string;
};

const WITHDRAWAL_DATA: WithdrawalRecord[] = [
  { id: 'WD-901', doctor: 'Dr. Rajesh Sharma', clinic: 'Sharma Physiotherapy Clinic', amount: 3300, status: 'requested', kycStatus: 'verified', bankStatus: 'verified', availableBalance: 5400, holdBalance: 3600, requestDate: '2026-08-10', payoutCycle: 'Monthly (1st & 16th)', bankRef: 'HDFC-4829', city: 'Mumbai' },
  { id: 'WD-902', doctor: 'Dr. Priya Patel', clinic: 'Joint Care Clinic', amount: 1800, status: 'under_review', kycStatus: 'under_review', bankStatus: 'pending', availableBalance: 2800, holdBalance: 1200, requestDate: '2026-08-11', payoutCycle: 'Monthly (1st & 16th)', bankRef: 'ICICI-2210', city: 'Pune' },
  { id: 'WD-903', doctor: 'Dr. Kiran Mehta', clinic: 'Mehta Ortho Centre', amount: 2400, status: 'approved', kycStatus: 'verified', bankStatus: 'verified', availableBalance: 4100, holdBalance: 900, requestDate: '2026-08-09', payoutCycle: 'Weekly', bankRef: 'AXIS-6632', city: 'Indore' },
  { id: 'WD-904', doctor: 'Dr. Ananya Sen', clinic: 'Sen Physio Point', amount: 1200, status: 'processing', kycStatus: 'verified', bankStatus: 'verified', availableBalance: 2200, holdBalance: 500, requestDate: '2026-08-08', payoutCycle: 'Weekly', bankRef: 'HDFC-9918', city: 'Lucknow' },
  { id: 'WD-905', doctor: 'Dr. Rahul Joshi', clinic: 'Pulse Rehab Centre', amount: 4200, status: 'paid', kycStatus: 'verified', bankStatus: 'verified', availableBalance: 6500, holdBalance: 1300, requestDate: '2026-08-05', payoutCycle: 'Monthly (1st & 16th)', bankRef: 'SBI-4402', city: 'Jaipur' },
];

function WithdrawalsManagementPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | WithdrawalRecord['status']>('all');

  const filteredWithdrawals = useMemo(() => {
    const query = search.trim().toLowerCase();
    return WITHDRAWAL_DATA.filter((request) => {
      const matchesSearch =
        !query ||
        [request.id, request.doctor, request.clinic, request.bankRef, request.city].some((value) =>
          value.toLowerCase().includes(query)
        );
      const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter]);

  const columns: DataTableColumn<WithdrawalRecord>[] = [
    {
      key: 'id',
      header: 'Request',
      render: (row) => (
        <div className="min-w-0">
          <div className="font-semibold text-neutral-900">{row.id}</div>
          <div className="text-xs text-neutral-500">{row.doctor}</div>
          <div className="text-xs text-neutral-500">{row.clinic}</div>
        </div>
      ),
    },
    { key: 'city', header: 'City', render: (row) => <span className="text-sm text-neutral-700">{row.city}</span> },
    { key: 'status', header: 'Status', render: (row) => <BadgePill tone={withdrawalTone(row.status)} label={withdrawalLabel(row.status)} /> },
    {
      key: 'kyc',
      header: 'KYC / Bank',
      render: (row) => (
        <div className="space-y-1 text-xs">
          <BadgePill tone={row.kycStatus === 'verified' ? 'success' : row.kycStatus === 'under_review' ? 'warning' : 'danger'} label={`KYC ${row.kycStatus.replace('_', ' ')}`} />
          <BadgePill tone={row.bankStatus === 'verified' ? 'success' : row.bankStatus === 'pending' ? 'warning' : 'danger'} label={`Bank ${row.bankStatus}`} />
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (row) => <span className="font-semibold text-neutral-900">₹{row.amount}</span>,
    },
    {
      key: 'balances',
      header: 'Available / Hold',
      render: (row) => (
        <div className="text-sm text-neutral-700">
          <div className="font-semibold text-neutral-900">₹{row.availableBalance}</div>
          <div className="text-xs text-neutral-500">Hold ₹{row.holdBalance}</div>
        </div>
      ),
    },
    { key: 'requestDate', header: 'Requested', render: (row) => <span className="text-sm text-neutral-600">{row.requestDate}</span> },
    { key: 'bankRef', header: 'Bank Ref', render: (row) => <span className="text-sm text-neutral-700">{row.bankRef}</span> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-[11px] font-extrabold tracking-[0.08em] text-teal-700">
            <Wallet className="h-3.5 w-3.5" />
            WITHDRAWALS AND PAYOUTS
          </div>
          <h1 className="mt-3 text-2xl sm:text-3xl font-bold text-neutral-900">Withdrawals</h1>
          <p className="mt-1 max-w-2xl text-sm text-neutral-500">
            Approve, reject, and process doctor withdrawal requests with KYC, bank, and fee-share checks.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50">
            <FileText className="h-4 w-4" />
            Export queue
          </button>
          <button className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700">
            <Clock3 className="h-4 w-4" />
            Payout cycle
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Withdrawal requests" value={WITHDRAWAL_DATA.length} icon={Wallet} tone="bg-sky-50 text-sky-600" />
        <MetricCard label="Pending review" value={WITHDRAWAL_DATA.filter((request) => request.status === 'requested' || request.status === 'under_review').length} icon={Clock3} tone="bg-amber-50 text-amber-600" />
        <MetricCard label="Approved / processing" value={WITHDRAWAL_DATA.filter((request) => request.status === 'approved' || request.status === 'processing').length} icon={ShieldCheck} tone="bg-violet-50 text-violet-600" />
        <MetricCard label="Paid requests" value={WITHDRAWAL_DATA.filter((request) => request.status === 'paid').length} icon={ReceiptText} tone="bg-emerald-50 text-emerald-600" />
      </div>

      <div className="card p-5 min-w-0">
        <div className="grid gap-3 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <SearchInput value={search} onChange={setSearch} placeholder="Search withdrawal ID, doctor, clinic, bank ref, city" />
          </div>

          <div className="flex flex-wrap gap-2 lg:justify-end">
            {(['all', 'requested', 'under_review', 'approved', 'rejected', 'processing', 'paid', 'failed', 'cancelled', 'reversed'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={cn('rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition-colors', statusFilter === status ? 'bg-primary-600 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200')}
              >
                {status === 'all' ? 'All requests' : withdrawalLabel(status)}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <DataTable
            columns={columns}
            data={filteredWithdrawals}
            emptyMessage="No withdrawal requests match the current filters."
            onRowClick={(row) => {
              window.location.href = `/admin/withdrawals/${row.id}`;
            }}
          />
        </div>
      </div>
    </div>
  );
}

function withdrawalLabel(status: WithdrawalRecord['status']): string {
  switch (status) {
    case 'requested':
      return 'Requested';
    case 'under_review':
      return 'Under Review';
    case 'approved':
      return 'Approved';
    case 'rejected':
      return 'Rejected';
    case 'processing':
      return 'Processing';
    case 'paid':
      return 'Paid';
    case 'failed':
      return 'Failed';
    case 'cancelled':
      return 'Cancelled';
    case 'reversed':
      return 'Reversed';
  }
}

function withdrawalTone(status: WithdrawalRecord['status']): 'success' | 'warning' | 'danger' | 'neutral' {
  switch (status) {
    case 'approved':
    case 'paid':
      return 'success';
    case 'requested':
    case 'under_review':
    case 'processing':
      return 'warning';
    case 'rejected':
    case 'failed':
    case 'cancelled':
    case 'reversed':
      return 'danger';
  }
}

function paymentLabel(status: PaymentRow['paymentStatus']): string {
  switch (status) {
    case 'successful':
      return 'Successful';
    case 'pending':
      return 'Pending';
    case 'failed':
      return 'Failed';
    case 'refunded':
      return 'Refunded';
    case 'disputed':
      return 'Disputed';
  }
}

function paymentTone(status: PaymentRow['paymentStatus']): 'success' | 'warning' | 'danger' | 'neutral' {
  switch (status) {
    case 'successful':
      return 'success';
    case 'pending':
      return 'warning';
    case 'failed':
    case 'disputed':
    case 'refunded':
      return 'danger';
  }
}

function feeShareLabel(status: PaymentRow['feeShareStatus']): string {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'on_hold':
      return 'On Hold';
    case 'available':
      return 'Available';
    case 'reversed':
      return 'Reversed';
  }
}

function feeShareTone(status: PaymentRow['feeShareStatus']): 'success' | 'warning' | 'danger' | 'neutral' {
  switch (status) {
    case 'available':
      return 'success';
    case 'pending':
    case 'on_hold':
      return 'warning';
    case 'reversed':
      return 'danger';
  }
}

function refundLabel(status: PaymentRow['refundStatus'] | 'none'): string {
  switch (status) {
    case 'none':
      return 'No Refund';
    case 'requested':
      return 'Requested';
    case 'processed':
      return 'Processed';
  }
}

function refundTone(status: PaymentRow['refundStatus'] | 'none'): 'success' | 'warning' | 'danger' | 'neutral' {
  switch (status) {
    case 'none':
      return 'neutral';
    case 'requested':
      return 'warning';
    case 'processed':
      return 'danger';
  }
}

function patientPaymentLabel(status: PatientRecord['paymentStatus']): string {
  switch (status) {
    case 'successful':
      return 'Paid';
    case 'pending':
      return 'Pending';
    case 'failed':
      return 'Failed';
    case 'refunded':
      return 'Refunded';
  }
}

function patientPaymentTone(status: PatientRecord['paymentStatus']): 'success' | 'warning' | 'danger' | 'neutral' {
  switch (status) {
    case 'successful':
      return 'success';
    case 'pending':
      return 'warning';
    case 'failed':
    case 'refunded':
      return 'danger';
  }
}

function programLabel(status: PatientAdminStatus): string {
  switch (status) {
    case 'active':
      return 'Active';
    case 'pending':
      return 'Pending';
    case 'paused':
      return 'Paused';
    case 'completed':
      return 'Completed';
    case 'expired':
      return 'Expired';
  }
}

function programTone(status: PatientAdminStatus): 'success' | 'warning' | 'danger' | 'neutral' {
  switch (status) {
    case 'active':
      return 'success';
    case 'pending':
      return 'warning';
    case 'paused':
      return 'neutral';
    case 'completed':
      return 'success';
    case 'expired':
      return 'danger';
  }
}

function BadgePill({ label, tone }: { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral' }) {
  const toneClass =
    tone === 'success'
      ? 'bg-emerald-50 text-emerald-700'
      : tone === 'warning'
        ? 'bg-amber-50 text-amber-700'
        : tone === 'danger'
          ? 'bg-rose-50 text-rose-700'
          : 'bg-neutral-100 text-neutral-600';

  return <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize', toneClass)}>{label}</span>;
}

function doctorStatusLabel(status: DoctorReviewStatus): string {
  switch (status) {
    case 'draft':
      return 'Draft';
    case 'submitted':
      return 'Submitted';
    case 'under_review':
      return 'Under Review';
    case 'documents_required':
      return 'Docs Required';
    case 'approved':
      return 'Approved';
    case 'rejected':
      return 'Rejected';
    case 'suspended':
      return 'Suspended';
  }
}

function doctorStatusTone(status: DoctorReviewStatus): 'success' | 'warning' | 'danger' | 'neutral' {
  switch (status) {
    case 'approved':
      return 'success';
    case 'submitted':
    case 'under_review':
      return 'warning';
    case 'documents_required':
      return 'danger';
    case 'rejected':
    case 'suspended':
      return 'danger';
    case 'draft':
      return 'neutral';
  }
}

function MetricCard({ label, value, icon: Icon, tone }: { label: string; value: string | number; icon: React.ElementType; tone: string }) {
  return (
    <div className="card p-4 min-w-0">
      <div className={cn('mb-3 flex h-11 w-11 items-center justify-center rounded-xl', tone)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-2xl font-bold text-neutral-900">{value}</div>
      <div className="mt-1 text-sm font-medium text-neutral-600">{label}</div>
    </div>
  );
}

function statusLabel(status: AgentStatus): string {
  switch (status) {
    case 'active':
      return 'Active';
    case 'inactive':
      return 'Inactive';
    case 'suspended':
      return 'Suspended';
    case 'pending':
      return 'Pending';
  }
}

function statusChipClass(status: AgentStatus): string {
  switch (status) {
    case 'active':
      return 'bg-emerald-50 text-emerald-700';
    case 'inactive':
      return 'bg-neutral-100 text-neutral-600';
    case 'suspended':
      return 'bg-rose-50 text-rose-700';
    case 'pending':
      return 'bg-amber-50 text-amber-700';
  }
}
