import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  FileText,
  HeartPulse,
  Landmark,
  MessageSquare,
  QrCode,
  ShieldCheck,
  Stethoscope,
  UserCheck,
  Users,
  Wallet,
  XCircle,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Tabs } from '@/components/ui/Tabs';
import { cn } from '@/lib/cn';

type DetailTone = 'success' | 'warning' | 'danger' | 'neutral';

const detailTabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'profile', label: 'Profile' },
  { id: 'commercial', label: 'Commercial' },
  { id: 'activity', label: 'Activity' },
  { id: 'audit', label: 'Audit' },
];

const doctorReviewChecks = [
  { label: 'Professional details', status: 'Verified' },
  { label: 'Clinic details', status: 'Verified' },
  { label: 'KYC documents', status: 'Under Review' },
  { label: 'Revenue model', status: 'Configured' },
  { label: 'Fee-share rule', status: 'Configured' },
  { label: 'QR generation', status: 'Waiting approval' },
];

const auditEvents = [
  'Profile submitted by agent',
  'Clinic address verified',
  'Pricing rule drafted',
  'KYC moved to review',
  'Admin opened approval workspace',
];

function PageHeader({
  eyebrow,
  title,
  subtitle,
  status,
  tone = 'neutral',
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  status: string;
  tone?: DetailTone;
}) {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-neutral-600 hover:text-neutral-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-[11px] font-extrabold tracking-[0.08em] text-teal-700">
          <ShieldCheck className="h-3.5 w-3.5" />
          {eyebrow}
        </div>
        <h1 className="mt-3 text-2xl font-bold text-neutral-900 sm:text-3xl">{title}</h1>
        <p className="mt-1 max-w-3xl text-sm text-neutral-500">{subtitle}</p>
      </div>
      <StatusPill label={status} tone={tone} />
    </div>
  );
}

function WorkspaceShell({
  header,
  tabs,
  side,
}: {
  header: React.ReactNode;
  tabs: React.ReactNode;
  side: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      {header}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="card min-w-0 overflow-hidden">
          {tabs}
        </section>
        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">{side}</aside>
      </div>
    </div>
  );
}

function TabbedDetailContent({ entity }: { entity: 'doctor' | 'agent' | 'patient' | 'payment' | 'withdrawal' | 'support' }) {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <>
      <Tabs tabs={detailTabs} activeTab={activeTab} onChange={setActiveTab} />
      <div className="p-5">
        {activeTab === 'overview' && <OverviewPanel entity={entity} />}
        {activeTab === 'profile' && <ProfilePanel entity={entity} />}
        {activeTab === 'commercial' && <CommercialPanel entity={entity} />}
        {activeTab === 'activity' && <ActivityPanel />}
        {activeTab === 'audit' && <AuditPanel />}
      </div>
    </>
  );
}

function OverviewPanel({ entity }: { entity: string }) {
  const cards = [
    { label: 'Referral link', value: 'Active', icon: QrCode, tone: 'bg-emerald-50 text-emerald-700' },
    { label: 'Payments', value: 'INR 1.84L', icon: CreditCard, tone: 'bg-sky-50 text-sky-700' },
    { label: 'Fee share', value: 'INR 85,400', icon: Wallet, tone: 'bg-violet-50 text-violet-700' },
    { label: 'Risk', value: 'Clear', icon: ShieldCheck, tone: 'bg-teal-50 text-teal-700' },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-lg border border-neutral-200 bg-white p-4">
            <div className={cn('mb-3 flex h-10 w-10 items-center justify-center rounded-lg', card.tone)}>
              <card.icon className="h-5 w-5" />
            </div>
            <div className="text-lg font-bold text-neutral-900">{card.value}</div>
            <div className="text-sm text-neutral-500">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <InfoBlock
          title={`${entityLabel(entity)} Context`}
          rows={[
            ['Record ID', sampleId(entity)],
            ['Assigned owner', entity === 'agent' ? 'Regional Manager' : 'Central Admin'],
            ['Last update', '2026-08-12 12:42'],
            ['Current action', entity === 'doctor' ? 'Approval review' : 'Operational monitoring'],
          ]}
        />
        <InfoBlock
          title="Linked Records"
          rows={[
            ['Doctor', 'Dr. Rajesh Sharma'],
            ['Clinic', 'Sharma Physiotherapy Clinic'],
            ['Agent', 'Amit Kumar'],
            ['Active patients', '41'],
          ]}
        />
      </div>
    </div>
  );
}

function ProfilePanel({ entity }: { entity: string }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <InfoBlock
        title="Identity"
        rows={[
          ['Name', entity === 'patient' ? 'Ramesh Gupta' : entity === 'agent' ? 'Amit Kumar' : 'Dr. Rajesh Sharma'],
          ['Mobile', '+91 98765 43210'],
          ['Email', `${entity}@physioqr.in`],
          ['City', 'Mumbai'],
        ]}
      />
      <InfoBlock
        title="Compliance"
        rows={[
          ['KYC', 'Verified'],
          ['Bank', entity === 'patient' ? 'Not applicable' : 'Verified'],
          ['Documents', '4 uploaded'],
          ['Data access', 'Role restricted'],
        ]}
      />
    </div>
  );
}

function CommercialPanel({ entity }: { entity: string }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <InfoBlock
        title="Pricing Snapshot"
        rows={[
          ['Revenue model', entity === 'payment' ? 'Split Model' : 'Doctor specific'],
          ['Patient fee', 'INR 500'],
          ['Platform fee', 'INR 200'],
          ['Effective from', '2026-08-01'],
        ]}
      />
      <InfoBlock
        title="Fee Share"
        rows={[
          ['Doctor fee share', '60%'],
          ['Calculation basis', 'Amount after discount'],
          ['Holding period', '15 days'],
          ['Minimum withdrawal', 'INR 1,000'],
        ]}
      />
    </div>
  );
}

function ActivityPanel() {
  return (
    <div className="space-y-3">
      {['QR scanned by patient', 'Assessment completed', 'Payment verified', 'Program activated', 'Fee share ledger generated'].map((item, index) => (
        <div key={item} className="flex items-start gap-3 rounded-lg border border-neutral-200 bg-white p-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-50 text-xs font-bold text-primary-700">{index + 1}</div>
          <div>
            <div className="text-sm font-semibold text-neutral-900">{item}</div>
            <div className="text-xs text-neutral-500">2026-08-{12 - index} 10:{20 + index}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function AuditPanel() {
  return (
    <div className="space-y-3">
      {auditEvents.map((event) => (
        <div key={event} className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3">
          <div className="text-sm font-semibold text-neutral-900">{event}</div>
          <div className="text-xs text-neutral-500">Central Admin | IP captured | reason stored</div>
        </div>
      ))}
    </div>
  );
}

function ReviewSidePanel({ entity }: { entity: 'doctor' | 'withdrawal' | 'payment' | 'support' | 'agent' | 'patient' }) {
  const [action, setAction] = useState<string | null>(null);
  const actions =
    entity === 'doctor'
      ? ['Approve Doctor', 'Request Documents', 'Reject', 'Suspend']
      : entity === 'withdrawal'
        ? ['Approve Withdrawal', 'Reject Withdrawal', 'Mark Paid']
        : entity === 'payment'
          ? ['Verify Payment', 'Process Refund', 'Open Reconciliation']
          : entity === 'support'
            ? ['Reply', 'Escalate', 'Resolve']
            : ['Edit Record', 'Add Note', 'View Audit'];

  return (
    <>
      <div className="card p-5">
        <h2 className="text-sm font-bold text-neutral-900">Action Required</h2>
        <div className="mt-4 space-y-2">
          {actions.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setAction(item)}
              className={cn(
                'flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm font-semibold transition-colors',
                item.includes('Reject') || item.includes('Suspend') || item.includes('Refund')
                  ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                  : 'border-neutral-200 bg-white text-neutral-700 hover:bg-primary-50 hover:text-primary-700'
              )}
            >
              {item}
              {item.includes('Reject') || item.includes('Suspend') ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
            </button>
          ))}
        </div>
      </div>

      <div className="card p-5">
        <h2 className="text-sm font-bold text-neutral-900">Decision Context</h2>
        <div className="mt-4 space-y-3">
          {doctorReviewChecks.map((check) => (
            <div key={check.label} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-neutral-600">{check.label}</span>
              <span className="font-semibold text-neutral-900">{check.status}</span>
            </div>
          ))}
        </div>
      </div>

      <Modal isOpen={!!action} onClose={() => setAction(null)} title={action ?? undefined} size="lg">
        <div className="space-y-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            This admin action will create an audit log entry with actor, timestamp, previous state, new state, and reason.
          </div>
          <label className="block">
            <span className="text-sm font-semibold text-neutral-700">Reason / admin note</span>
            <textarea className="mt-2 min-h-28 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500" placeholder="Enter decision reason" />
          </label>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setAction(null)} className="rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-semibold text-neutral-700">
              Cancel
            </button>
            <button type="button" onClick={() => setAction(null)} className="rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700">
              Confirm action
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function InfoBlock({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <h3 className="text-sm font-bold text-neutral-900">{title}</h3>
      <div className="mt-4 space-y-3">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-start justify-between gap-3 text-sm">
            <span className="text-neutral-500">{label}</span>
            <span className="text-right font-semibold text-neutral-900">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusPill({ label, tone }: { label: string; tone: DetailTone }) {
  const toneClass =
    tone === 'success'
      ? 'bg-emerald-50 text-emerald-700'
      : tone === 'warning'
        ? 'bg-amber-50 text-amber-700'
        : tone === 'danger'
          ? 'bg-rose-50 text-rose-700'
          : 'bg-neutral-100 text-neutral-700';
  return <span className={cn('inline-flex rounded-full px-3 py-1 text-xs font-bold', toneClass)}>{label}</span>;
}

function entityLabel(entity: string) {
  switch (entity) {
    case 'doctor':
      return 'Doctor';
    case 'agent':
      return 'Agent';
    case 'patient':
      return 'Patient';
    case 'payment':
      return 'Payment';
    case 'withdrawal':
      return 'Withdrawal';
    case 'support':
      return 'Support Ticket';
    default:
      return 'Record';
  }
}

function sampleId(entity: string) {
  switch (entity) {
    case 'doctor':
      return 'DR-001';
    case 'agent':
      return 'AG-001';
    case 'patient':
      return 'PAT-101';
    case 'payment':
      return 'PAY-008812';
    case 'withdrawal':
      return 'WD-901';
    case 'support':
      return 'TKT-201';
    default:
      return 'REC-001';
  }
}

export function AdminDoctorDetailWorkspacePage() {
  const { doctorId } = useParams();
  return (
    <WorkspaceShell
      header={
        <PageHeader
          eyebrow="DOCTOR APPROVAL WORKSPACE"
          title={`Dr. Rajesh Sharma (${doctorId ?? 'DR-001'})`}
          subtitle="Review profile, clinic, documents, commercial rules, QR activation, wallet state, and audit history before approval."
          status="Under Review"
          tone="warning"
        />
      }
      tabs={<TabbedDetailContent entity="doctor" />}
      side={<ReviewSidePanel entity="doctor" />}
    />
  );
}

export function AdminAgentDetailWorkspacePage() {
  const { agentId } = useParams();
  return (
    <WorkspaceShell
      header={<PageHeader eyebrow="AGENT WORKSPACE" title={`Amit Kumar (${agentId ?? 'AG-001'})`} subtitle="Agent profile, doctor network, clinic visits, follow-ups, revenue attribution, and activity timeline." status="Active" tone="success" />}
      tabs={<TabbedDetailContent entity="agent" />}
      side={<ReviewSidePanel entity="agent" />}
    />
  );
}

export function AdminPatientDetailWorkspacePage() {
  const { patientId } = useParams();
  return (
    <WorkspaceShell
      header={<PageHeader eyebrow="PATIENT CONTROL" title={`Ramesh Gupta (${patientId ?? 'PAT-101'})`} subtitle="Patient referral, assessment, medical flags, program access, payment history, consent, support, and audit context." status="Program Active" tone="success" />}
      tabs={<TabbedDetailContent entity="patient" />}
      side={<ReviewSidePanel entity="patient" />}
    />
  );
}

export function AdminPaymentDetailWorkspacePage() {
  const { paymentId } = useParams();
  return (
    <WorkspaceShell
      header={<PageHeader eyebrow="PAYMENT CONTROL" title={`Payment ${paymentId ?? 'PAY-008812'}`} subtitle="Order snapshot, payment attempts, gateway reference, invoice, fee-share ledger, refund state, and reconciliation context." status="Successful" tone="success" />}
      tabs={<TabbedDetailContent entity="payment" />}
      side={<ReviewSidePanel entity="payment" />}
    />
  );
}

export function AdminWithdrawalDetailWorkspacePage() {
  const { withdrawalId } = useParams();
  return (
    <WorkspaceShell
      header={<PageHeader eyebrow="WITHDRAWAL REVIEW" title={`Withdrawal ${withdrawalId ?? 'WD-901'}`} subtitle="Review doctor eligibility, available balance, KYC, bank details, risk status, and payout cycle before approval." status="Requested" tone="warning" />}
      tabs={<TabbedDetailContent entity="withdrawal" />}
      side={<ReviewSidePanel entity="withdrawal" />}
    />
  );
}

export function AdminSupportTicketDetailPage() {
  const { ticketId } = useParams();
  return (
    <WorkspaceShell
      header={<PageHeader eyebrow="SUPPORT WORKSPACE" title={`Ticket ${ticketId ?? 'TKT-201'}`} subtitle="Support request context with linked patient, doctor, order, payment, attachments, response history, and resolution notes." status="Open" tone="warning" />}
      tabs={<TabbedDetailContent entity="support" />}
      side={<ReviewSidePanel entity="support" />}
    />
  );
}

export function AdminDoctorCreatePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="DOCTOR ONBOARDING"
        title="Register New Doctor"
        subtitle="Capture profile, clinic, documents, revenue model, pricing, fee share, and approval settings in one structured workflow."
        status="Draft"
        tone="neutral"
      />

      <form className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="space-y-6">
          <FormSection title="Personal Details" icon={UserCheck}>
            <Field label="Full name" placeholder="Dr. Rajesh Sharma" />
            <Field label="Mobile number" placeholder="+91 98765 43210" />
            <Field label="Email address" placeholder="doctor@clinic.com" />
            <Field label="Specialization" placeholder="Orthopaedics and Rehabilitation" />
          </FormSection>

          <FormSection title="Clinic Details" icon={Landmark}>
            <Field label="Clinic name" placeholder="Sharma Physiotherapy Clinic" />
            <Field label="Clinic city" placeholder="Mumbai" />
            <Field label="Clinic address" placeholder="Full clinic address" wide />
            <Field label="Google Maps location" placeholder="Paste map link" wide />
          </FormSection>

          <FormSection title="Commercial Configuration" icon={Banknote}>
            <Field label="Revenue model" placeholder="Split Model / Platform Fee Model" />
            <Field label="Patient fee" placeholder="INR 500" />
            <Field label="Doctor fee share" placeholder="60%" />
            <Field label="Holding period" placeholder="15 days" />
            <Field label="Minimum withdrawal" placeholder="INR 1,000" />
            <Field label="Effective date" placeholder="2026-09-01" />
          </FormSection>
        </section>

        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <div className="card p-5">
            <h2 className="text-sm font-bold text-neutral-900">Submission Checklist</h2>
            <div className="mt-4 space-y-3">
              {['Doctor profile', 'Clinic details', 'Documents', 'Revenue model', 'Pricing rule', 'Fee-share rule'].map((item) => (
                <label key={item} className="flex items-center gap-3 text-sm text-neutral-700">
                  <input type="checkbox" className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500" />
                  {item}
                </label>
              ))}
            </div>
          </div>
          <div className="card p-5">
            <h2 className="text-sm font-bold text-neutral-900">Actions</h2>
            <div className="mt-4 space-y-2">
              <button type="button" className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-semibold text-neutral-700">Save Draft</button>
              <button type="button" className="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700">Submit for Review</button>
            </div>
          </div>
        </aside>
      </form>
    </div>
  );
}

function FormSection({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <section className="card p-5">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
          <Icon className="h-5 w-5" />
        </div>
        <h2 className="text-base font-bold text-neutral-900">{title}</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({ label, placeholder, wide = false }: { label: string; placeholder: string; wide?: boolean }) {
  return (
    <label className={cn('block', wide && 'md:col-span-2')}>
      <span className="text-sm font-semibold text-neutral-700">{label}</span>
      <input className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-primary-500" placeholder={placeholder} />
    </label>
  );
}

export default AdminDoctorDetailWorkspacePage;
