import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  Download,
  Dumbbell,
  ExternalLink,
  Eye,
  FileSearch,
  HeartPulse,
  ListChecks,
  MessageSquare,
  Plus,
  QrCode,
  QrCodeIcon,
  ReceiptText,
  RefreshCw,
  Save,
  ShieldCheck,
  ShieldOff,
  Trash2,
  Users,
  Video,
  Wallet,
  XCircle,
} from 'lucide-react';
import apiClient from '@/lib/api-client';
import { DataTable, type DataTableColumn } from '@/components/data-display/DataTable';
import ErrorState from '@/components/feedback/ErrorState';
import { SearchInput } from '@/components/ui/SearchInput';
import { Skeleton } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/cn';
import { AgentRecordForm } from '@/features/admin/components/AgentRecordForm';

type ApiRecord = Record<string, unknown>;
type AdminResourceKey =
  | 'agents'
  | 'clinicVisits'
  | 'clinics'
  | 'referrals'
  | 'doctors'
  | 'patients'
  | 'payments'
  | 'orders'
  | 'withdrawals'
  | 'wallets'
  | 'feeShares'
  | 'riskReviews'
  | 'fraudRisk'
  | 'auditLogs'
  | 'support'
  | 'notifications'
  | 'programs'
  | 'exercises'
  | 'videos'
  | 'refunds'
  | 'revenueModels';

type AdminResourceConfig = {
  title: string;
  eyebrow: string;
  description: string;
  endpoint: string;
  icon: React.ElementType;
  searchPlaceholder: string;
  primaryField: string;
  secondaryFields: string[];
  statusField?: string;
  amountField?: string;
  dateField?: string;
  ownerField?: string;
  idField?: string;
  queryParams?: Record<string, string>;
  createKind?: 'agent' | 'program' | 'exercise';
  columnLabels?: { record?: string; owner?: string; status?: string; amount?: string; updated?: string };
  extraField?: string;
};

type AdminResourceDrawerMode = 'details' | 'doctor-action' | 'risk-action' | 'fraud-action' | 'program-day' | 'record-form' | 'visit-detail';

type DrawerState = {
  mode: AdminResourceDrawerMode;
  row?: ApiRecord;
  action?: string;
};

const adminResourceModules: Record<AdminResourceKey, AdminResourceConfig> = {
  agents: {
    title: 'Agents',
    eyebrow: 'AGENT MANAGEMENT',
    description: 'Live field-agent records with region, city, status, onboarding attribution, and contact details.',
    endpoint: '/admin/agents',
    icon: Users,
    searchPlaceholder: 'Search agent name, mobile, email, city, or region',
    primaryField: 'fullName',
    secondaryFields: ['mobile', 'email', 'city', 'assignedRegion'],
    statusField: 'status',
    dateField: 'joiningDate',
    idField: 'agentId',
    ownerField: 'assignedRegion',
    createKind: 'agent',
    extraField: 'city',
    columnLabels: { record: 'Agent', owner: 'Region', status: 'Status', amount: 'City', updated: 'Joined' },
  },
  clinicVisits: {
    title: 'Agent Clinic Visits',
    eyebrow: 'FIELD VISIT TRACKING',
    description: 'Admin view of field-agent clinic visits, follow-up outcomes, interest levels, and next actions.',
    endpoint: '/agents/visits',
    icon: ClipboardList,
    searchPlaceholder: 'Search agent, doctor, clinic, outcome, or follow-up note',
    primaryField: 'clinicName',
    secondaryFields: ['doctorName', 'agent.fullName', 'clinicLocation', 'outcome', 'followUpStatus'],
    statusField: 'followUpStatus',
    dateField: 'visitDate',
    ownerField: 'agent.fullName',
  },
  clinics: {
    title: 'Clinics',
    eyebrow: 'CLINIC NETWORK',
    description: 'Clinic records derived from approved and onboarding doctors, including location, branch, QR, and agent attribution.',
    endpoint: '/admin/clinics',
    icon: QrCode,
    searchPlaceholder: 'Search clinic, doctor, city, state, or agent',
    primaryField: 'clinicName',
    secondaryFields: ['clinicId', 'doctor.fullName', 'city', 'state', 'clinicContact'],
    statusField: 'status',
    dateField: 'updatedAt',
    ownerField: 'doctor.fullName',
    idField: 'clinicId',
  },
  referrals: {
    title: 'Referral Tracking',
    eyebrow: 'QR FUNNEL',
    description: 'QR scan and referral funnel records with doctor, agent, patient, registration, and payment conversion state.',
    endpoint: '/admin/referrals',
    icon: QrCode,
    searchPlaceholder: 'Search referral, doctor, clinic, patient, payment status',
    primaryField: 'referralId',
    secondaryFields: ['doctor.fullName', 'doctor.clinicName', 'patient.fullName', 'paymentStatus'],
    statusField: 'conversionStage',
    dateField: 'scanDate',
    ownerField: 'doctor.fullName',
    idField: 'referralId',
  },
  doctors: {
    title: 'Doctors',
    eyebrow: 'DOCTOR APPROVAL',
    description: 'Doctor approval, KYC review, QR control, pricing, and referral program configuration.',
    endpoint: '/admin/doctors',
    icon: ShieldCheck,
    searchPlaceholder: 'Search doctor, clinic, mobile, city, specialization',
    primaryField: 'fullName',
    secondaryFields: ['doctorId', 'clinicName', 'specialization', 'city', 'mobile'],
    statusField: 'status',
    amountField: 'approvedPatientFee',
    dateField: 'createdAt',
    ownerField: 'agent.fullName',
    idField: 'doctorId',
  },
  patients: {
    title: 'Patients',
    eyebrow: 'PATIENT CONTROL',
    description: 'Referred patient registrations, mobile verification, doctor attribution, and program access status.',
    endpoint: '/admin/patients',
    icon: HeartPulse,
    searchPlaceholder: 'Search patient, mobile, email, city',
    primaryField: 'fullName',
    secondaryFields: ['patientId', 'mobile', 'email', 'city', 'referringDoctor.fullName'],
    statusField: 'status',
    dateField: 'createdAt',
    ownerField: 'referringDoctor.fullName',
    idField: 'patientId',
  },
  payments: {
    title: 'Payments',
    eyebrow: 'PAYMENT LEDGER',
    description: 'Payment records, gateway references, invoices, fee share, and refund state.',
    endpoint: '/admin/payments',
    icon: CreditCard,
    searchPlaceholder: 'Search invoice or gateway transaction',
    primaryField: 'invoiceNumber',
    secondaryFields: ['gatewayTransactionId', 'patient.fullName', 'doctor.fullName', 'program.name'],
    statusField: 'status',
    amountField: 'paidAmount',
    dateField: 'createdAt',
    ownerField: 'doctor.fullName',
  },
  orders: {
    title: 'Orders',
    eyebrow: 'ORDER SNAPSHOTS',
    description: 'Immutable patient orders with locked pricing, gateway order IDs, status, and program assignment.',
    endpoint: '/admin/orders',
    icon: ReceiptText,
    searchPlaceholder: 'Search order, patient, doctor, program',
    primaryField: 'orderId',
    secondaryFields: ['patient.fullName', 'doctor.fullName', 'program.name', 'gatewayOrderId'],
    statusField: 'status',
    amountField: 'finalAmount',
    dateField: 'createdAt',
    ownerField: 'doctor.fullName',
    idField: 'orderId',
  },
  withdrawals: {
    title: 'Withdrawals',
    eyebrow: 'PAYOUT QUEUE',
    description: 'Doctor withdrawal requests with KYC, bank verification, payout state, and wallet linkage.',
    endpoint: '/admin/withdrawals',
    icon: Wallet,
    searchPlaceholder: 'Search doctor, request ID, status',
    primaryField: 'doctor.fullName',
    secondaryFields: ['doctor.doctorId', 'doctor.clinicName', 'status'],
    statusField: 'status',
    amountField: 'requestedAmount',
    dateField: 'createdAt',
    ownerField: 'doctor.clinicName',
  },
  wallets: {
    title: 'Doctor Wallets',
    eyebrow: 'WALLET CONTROL',
    description: 'Live doctor wallet balances backed by immutable ledger entries.',
    endpoint: '/admin/wallets',
    icon: Wallet,
    searchPlaceholder: 'Search doctor or clinic',
    primaryField: 'doctor.fullName',
    secondaryFields: ['doctor.doctorId', 'doctor.clinicName', 'doctor.revenueModel'],
    amountField: 'availableBalance',
    dateField: 'updatedAt',
    ownerField: 'doctor.clinicName',
  },
  feeShares: {
    title: 'Fee Shares',
    eyebrow: 'FEE SHARE LEDGER',
    description: 'Doctor rehabilitation programme fee share entries, holding state, reversal state, and payment links.',
    endpoint: '/admin/fee-shares',
    icon: ListChecks,
    searchPlaceholder: 'Search doctor, patient, invoice',
    primaryField: 'doctor.fullName',
    secondaryFields: ['patient.fullName', 'payment.invoiceNumber', 'calculationBasis'],
    statusField: 'status',
    amountField: 'amount',
    dateField: 'availableDate',
    ownerField: 'doctor.clinicName',
  },
  riskReviews: {
    title: 'Risk Reviews',
    eyebrow: 'CLINICAL SAFETY',
    description: 'Red-flag patient assessments requiring admin clinical safety review.',
    endpoint: '/admin/risk-reviews',
    icon: AlertTriangle,
    searchPlaceholder: 'Search patient, pain category, risk status',
    primaryField: 'patient.fullName',
    secondaryFields: ['patient.mobile', 'painCategory.name', 'adminReviewNote'],
    statusField: 'status',
    dateField: 'createdAt',
    queryParams: { status: 'all' },
  },
  fraudRisk: {
    title: 'Fraud & Risk',
    eyebrow: 'RISK INTELLIGENCE',
    description: 'Suspicious activity cases from QR scans, duplicate transactions, refunds, and bank reuse rules.',
    endpoint: '/admin/fraud-cases',
    icon: AlertTriangle,
    searchPlaceholder: 'Search fraud rule, summary, doctor, payment',
    primaryField: 'summary',
    secondaryFields: ['rule', 'doctor.fullName', 'payment.invoiceNumber'],
    statusField: 'status',
    dateField: 'createdAt',
  },
  auditLogs: {
    title: 'Audit Logs',
    eyebrow: 'GOVERNANCE',
    description: 'Immutable admin and system activity log with actor, module, route, and request ID.',
    endpoint: '/admin/audit-logs',
    icon: FileSearch,
    searchPlaceholder: 'Search action, module, record ID, request ID',
    primaryField: 'action',
    secondaryFields: ['module', 'recordId', 'performedBy.email', 'path', 'requestId'],
    statusField: 'userRole',
    dateField: 'createdAt',
    ownerField: 'performedBy.email',
  },
  support: {
    title: 'Support',
    eyebrow: 'SUPPORT QUEUE',
    description: 'Patient, doctor, and agent support tickets with status, priority, messages, and assignments.',
    endpoint: '/support',
    icon: MessageSquare,
    searchPlaceholder: 'Search ticket, user, subject, category',
    primaryField: 'subject',
    secondaryFields: ['ticketId', 'category', 'userName', 'userType'],
    statusField: 'status',
    dateField: 'createdAt',
    ownerField: 'userName',
  },
  notifications: {
    title: 'Notifications',
    eyebrow: 'DELIVERY LOGS',
    description: 'In-app, SMS, WhatsApp, and email notification records with retry/delivery state.',
    endpoint: '/notifications',
    icon: Bell,
    searchPlaceholder: 'Search notification title, type, recipient',
    primaryField: 'title',
    secondaryFields: ['type', 'recipientType', 'channel', 'message'],
    statusField: 'status',
    dateField: 'createdAt',
    ownerField: 'recipientType',
    queryParams: { all: 'true' },
  },
  programs: {
    title: 'Rehabilitation Programs',
    eyebrow: 'PROGRAM LIBRARY',
    description: 'Program records with category, duration, default price, status, and day-wise builder.',
    endpoint: '/programs',
    icon: Dumbbell,
    searchPlaceholder: 'Search program, code, pain category',
    primaryField: 'name',
    secondaryFields: ['programCode', 'painCategory.name', 'durationDays', 'difficultyLevel'],
    statusField: 'isActive',
    amountField: 'defaultPrice',
    dateField: 'createdAt',
    idField: 'programCode',
    createKind: 'program',
  },
  exercises: {
    title: 'Exercises',
    eyebrow: 'EXERCISE LIBRARY',
    description: 'Exercise/video records with YouTube unlisted URL validation, sets, reps, language, and category.',
    endpoint: '/exercises',
    icon: ClipboardList,
    searchPlaceholder: 'Search exercise, video ID, category, language',
    primaryField: 'name',
    secondaryFields: ['youtubeVideoId', 'painCategory.name', 'language', 'sets', 'repetitions'],
    statusField: 'isActive',
    dateField: 'createdAt',
    createKind: 'exercise',
  },
  videos: {
    title: 'Videos',
    eyebrow: 'VIDEO LIBRARY',
    description: 'Video management is backed by exercise records containing YouTube URL and normalized video ID.',
    endpoint: '/exercises',
    icon: Video,
    searchPlaceholder: 'Search video title, YouTube ID, category',
    primaryField: 'name',
    secondaryFields: ['youtubeVideoId', 'videoUrl', 'language', 'painCategory.name'],
    statusField: 'isActive',
    dateField: 'createdAt',
    createKind: 'exercise',
  },
  refunds: {
    title: 'Refunds',
    eyebrow: 'REFUND CONTROL',
    description: 'Refund records with payment linkage, fee share reversal, status, and reconciliation outcome.',
    endpoint: '/refunds',
    icon: RefreshCw,
    searchPlaceholder: 'Search refund reason, patient, doctor, invoice',
    primaryField: 'reason',
    secondaryFields: ['refundType', 'patient.fullName', 'doctor.fullName', 'payment.invoiceNumber'],
    statusField: 'status',
    amountField: 'refundAmount',
    dateField: 'createdAt',
  },
  revenueModels: {
    title: 'Revenue Models',
    eyebrow: 'COMMERCIAL CONTROL',
    description: 'Doctor-specific split/platform-fee pricing, fee-share basis, holding period, and withdrawal rules.',
    endpoint: '/admin/revenue-models',
    icon: Wallet,
    searchPlaceholder: 'Search doctor, clinic, city, revenue model',
    primaryField: 'fullName',
    secondaryFields: ['doctorId', 'clinicName', 'revenueModel', 'feeShareCalculationBasis'],
    statusField: 'revenueModel',
    amountField: 'approvedPatientFee',
    dateField: 'updatedAt',
    ownerField: 'clinicName',
    idField: 'modelId',
  },
};

const getValue = (record: ApiRecord, path?: string): unknown => {
  if (!path) return undefined;
  return path.split('.').reduce<unknown>((value, part) => {
    if (value && typeof value === 'object') return (value as Record<string, unknown>)[part];
    return undefined;
  }, record);
};

const asRecord = (value: unknown): ApiRecord => (value && typeof value === 'object' ? (value as ApiRecord) : {});

const displayValue = (value: unknown): string => {
  if (value === undefined || value === null || value === '') return '-';
  if (typeof value === 'boolean') return value ? 'Active' : 'Inactive';
  if (Array.isArray(value)) return `${value.length} items`;
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const toDateInputValue = (value: unknown) => {
  if (!value) return undefined;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString().slice(0, 10);
};

const formatDate = (value: unknown) => {
  if (!value) return '-';
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatAmount = (value: unknown) => {
  const numberValue = Number(value);
  if (Number.isNaN(numberValue)) return '-';
  return `INR ${numberValue.toLocaleString('en-IN')}`;
};

const extractItems = (data: unknown): ApiRecord[] => {
  if (Array.isArray(data)) return data as ApiRecord[];
  if (data && typeof data === 'object' && Array.isArray((data as { items?: unknown[] }).items)) {
    return (data as { items: ApiRecord[] }).items;
  }
  if (data && typeof data === 'object') return [data as ApiRecord];
  return [];
};

const recordObjectId = (record?: ApiRecord) => displayValue(getValue(record ?? {}, '_id'));

const getRecordId = (record: ApiRecord, config: AdminResourceConfig) => {
  const preferred = getValue(record, config.idField) || getValue(record, 'id') || getValue(record, '_id');
  return displayValue(preferred);
};

// Renders one backend-backed admin resource list from its module configuration.
export function AdminResourceListPage({ moduleKey }: { moduleKey: AdminResourceKey }) {
  const config = adminResourceModules[moduleKey];
  const [search, setSearch] = useState('');
  const [drawer, setDrawer] = useState<DrawerState | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const Icon = config.icon;
  const doctorFilters = useMemo(() => {
    if (moduleKey !== 'doctors') return {};
    const status = normalizeDoctorStatusFilter(searchParams.get('status'));
    const revenueModel = searchParams.get('revenueModel') || '';
    return {
      ...(status ? { status } : {}),
      ...(revenueModel ? { revenueModel } : {}),
    };
  }, [moduleKey, searchParams]);

  const query = useQuery({
    queryKey: ['admin-resource-page', moduleKey, search, doctorFilters],
    queryFn: async () => {
      const response = await apiClient.get(config.endpoint, {
        params: {
          limit: 50,
          ...(search ? { search } : {}),
          ...doctorFilters,
          ...config.queryParams,
        },
      });
      return response.data;
    },
  });

  const rows = useMemo(() => {
    const items = extractItems(query.data);
    const clientQuery = search.trim().toLowerCase();
    if (!clientQuery) return items;
    return items.filter((item) =>
      [config.primaryField, ...config.secondaryFields, config.statusField, config.ownerField]
        .filter(Boolean)
        .some((field) => displayValue(getValue(item, field)).toLowerCase().includes(clientQuery))
    );
  }, [config, query.data, search]);

  const openDetails = (row: ApiRecord) => setDrawer({ mode: 'details', row });
  const setDoctorFilter = (key: 'status' | 'revenueModel', value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };
  const resetDoctorFilters = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('status');
    next.delete('revenueModel');
    setSearchParams(next, { replace: true });
  };

  const labels = config.columnLabels ?? {};
  const columns: DataTableColumn<ApiRecord>[] = [
    {
      key: 'record',
      header: labels.record ?? 'Record',
      render: (row) => (
        <div className="min-w-0">
          <div className="font-semibold text-neutral-900">{displayValue(getValue(row, config.primaryField))}</div>
          <div className="text-xs text-neutral-500">{getRecordId(row, config)}</div>
          <div className="text-xs text-neutral-500">
            {config.secondaryFields.map((field) => displayValue(getValue(row, field))).filter((item) => item !== '-').slice(0, 2).join(' | ') || '-'}
          </div>
        </div>
      ),
    },
    {
      key: 'owner',
      header: labels.owner ?? 'Owner',
      render: (row) => <span className="text-sm text-neutral-700">{displayValue(getValue(row, config.ownerField))}</span>,
    },
    {
      key: 'status',
      header: labels.status ?? 'Status',
      render: (row) => <StatusPill value={getValue(row, config.statusField)} />,
    },
    {
      key: 'amount',
      header: labels.amount ?? 'Amount',
      render: (row) => (
        <span className="text-sm font-semibold text-neutral-900">
          {config.amountField
            ? formatAmount(getValue(row, config.amountField))
            : config.extraField
              ? displayValue(getValue(row, config.extraField))
              : '-'}
        </span>
      ),
    },
    {
      key: 'updated',
      header: labels.updated ?? 'Updated',
      render: (row) => <span className="text-sm text-neutral-600">{formatDate(getValue(row, config.dateField))}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '220px',
      render: (row) => (
        <RowActions
          moduleKey={moduleKey}
          row={row}
          onDetails={() => openDetails(row)}
          onAction={(action, mode) => setDrawer({ mode, row, action })}
        />
      ),
    },
  ];

  const activeCount = rows.filter((r) => {
    const s = displayValue(getValue(r, config.statusField)).toLowerCase();
    return s.includes('active') || s.includes('approved');
  }).length;
  const pendingCount = rows.filter((r) => {
    const s = displayValue(getValue(r, config.statusField)).toLowerCase();
    return s.includes('pending') || s.includes('review') || s.includes('submitted');
  }).length;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-[11px] font-extrabold tracking-[0.08em] text-teal-700">
            <Icon className="h-3.5 w-3.5" />
            {config.eyebrow}
          </div>
          <h1 className="mt-3 text-2xl font-bold text-neutral-900 sm:text-3xl">{config.title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-neutral-500">{config.description}</p>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          {moduleKey === 'auditLogs' && <AuditExportButton search={search} />}
          {config.createKind && (
            <button
              type="button"
              onClick={() => setDrawer({ mode: 'record-form' })}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
            >
              <Plus className="h-4 w-4" />
              {createButtonLabel(config.createKind)}
            </button>
          )}
          <button
            type="button"
            onClick={() => query.refetch()}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI strip — only when data is available */}
      {!query.isLoading && !query.isError && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <KpiCard label="Total records" value={rows.length} tone="teal" />
          <KpiCard label="Active" value={activeCount} tone="emerald" />
          <KpiCard label="Pending review" value={pendingCount} tone="amber" />
          <KpiCard label="Data source" value="Live API" tone="sky" />
        </div>
      )}

      {moduleKey === 'doctors' && (
        <DoctorListFilters
          status={searchParams.get('status') || ''}
          revenueModel={searchParams.get('revenueModel') || ''}
          onChange={setDoctorFilter}
          onReset={resetDoctorFilters}
        />
      )}

      {/* Main table card */}
      <section className="card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-neutral-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <SearchInput value={search} onChange={setSearch} placeholder={config.searchPlaceholder} />
          </div>
          <div className="text-xs font-semibold text-neutral-400">
            {rows.length} record{rows.length !== 1 ? 's' : ''}
            {search && ` matching "${search}"`}
          </div>
        </div>

        <div className="p-5">
          {query.isError ? (
            <ErrorState title={`${config.title} could not load`} message="Check API server, auth session, and role permissions." onRetry={() => query.refetch()} />
          ) : query.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-14 w-full" />
              ))}
            </div>
          ) : (
            <DataTable columns={columns} data={rows} emptyMessage={`No ${config.title.toLowerCase()} found.`} />
          )}
        </div>
      </section>

      <AdminActionDrawer
        drawer={drawer}
        moduleKey={moduleKey}
        config={config}
        onClose={() => setDrawer(null)}
        onRefresh={() => query.refetch()}
      />
    </div>
  );
}

const doctorStatusFilters: [string, string][] = [
  ['', 'All'],
  ['submitted', 'Submitted'],
  ['under_review', 'Under review'],
  ['documents_required', 'Docs required'],
  ['approved', 'Approved'],
  ['suspended', 'Suspended'],
  ['rejected', 'Rejected'],
];

const doctorRevenueFilters: [string, string][] = [
  ['', 'All models'],
  ['split', 'Split'],
  ['platform_fee', 'Platform fee'],
];

function normalizeDoctorStatusFilter(value: string | null) {
  if (!value || value === 'all') return '';
  if (value === 'pending') return 'submitted';
  return value;
}

function DoctorListFilters({
  status,
  revenueModel,
  onChange,
  onReset,
}: {
  status: string;
  revenueModel: string;
  onChange: (key: 'status' | 'revenueModel', value: string) => void;
  onReset: () => void;
}) {
  const normalizedStatus = normalizeDoctorStatusFilter(status);
  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-sm font-bold text-neutral-900">Doctor workflow filters</h2>
          <p className="mt-1 text-xs text-neutral-500">Filters are sent to the backend `/admin/doctors` API.</p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="self-start rounded-lg border border-neutral-300 px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 lg:self-auto"
        >
          Reset filters
        </button>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="flex flex-wrap gap-2">
          {doctorStatusFilters.map(([value, label]) => (
            <button
              key={value || 'all'}
              type="button"
              onClick={() => onChange('status', value)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-bold transition-colors',
                normalizedStatus === value
                  ? 'border-primary-600 bg-primary-600 text-white'
                  : 'border-neutral-200 bg-white text-neutral-600 hover:bg-primary-50 hover:text-primary-700'
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide text-neutral-400">Revenue model</span>
          <select
            value={revenueModel}
            onChange={(event) => onChange('revenueModel', event.target.value)}
            className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500"
          >
            {doctorRevenueFilters.map(([value, label]) => (
              <option key={value || 'all-models'} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}

function RowActions({
  moduleKey,
  row,
  onDetails,
  onAction,
}: {
  moduleKey: AdminResourceKey;
  row: ApiRecord;
  onDetails: () => void;
  onAction: (action: string, mode: AdminResourceDrawerMode) => void;
}) {
  const navigate = useNavigate();
  const rowId = getRecordId(row, adminResourceModules[moduleKey]);
  const objectId = recordObjectId(row);

  if (moduleKey === 'doctors') {
    const status = displayValue(getValue(row, 'status')).toLowerCase();
    const qrActive = getValue(row, 'qrCodeActive');
    const isPending = ['submitted', 'pending', 'under_review', 'documents_required'].includes(status);
    const isApproved = status === 'approved';
    const canRequestDocs = !isApproved && status !== 'suspended';
    return (
      <div className="flex flex-wrap gap-2">
        <IconButton label="Open workspace" onClick={() => navigate(`/admin/doctors/${objectId || rowId}`)} icon={ExternalLink} />
        {(isPending || isApproved) && (
          <IconButton label="Approve" onClick={() => onAction('approve', 'doctor-action')} icon={CheckCircle2} />
        )}
        {canRequestDocs && (
          <IconButton label="Request docs" onClick={() => onAction('request-documents', 'doctor-action')} icon={FileSearch} />
        )}
        {isPending && (
          <IconButton label="Reject" onClick={() => onAction('reject', 'doctor-action')} icon={XCircle} danger />
        )}
        {isApproved && (
          <IconButton label="Suspend" onClick={() => onAction('suspend', 'doctor-action')} icon={ShieldOff} danger />
        )}
        {isApproved && (
          qrActive
            ? <IconButton label="Disable QR" onClick={() => onAction('disable-qr', 'doctor-action')} icon={QrCodeIcon} danger />
            : <IconButton label="Reactivate QR" onClick={() => onAction('reactivate-qr', 'doctor-action')} icon={QrCode} />
        )}
      </div>
    );
  }

  if (moduleKey === 'clinicVisits') {
    return (
      <div className="flex flex-wrap gap-2">
        <IconButton label="View detail" onClick={() => onAction('view', 'visit-detail')} icon={Eye} />
      </div>
    );
  }

  if (moduleKey === 'agents') {
    return (
      <div className="flex flex-wrap gap-2">
        <IconButton label="Open workspace" onClick={() => navigate(`/admin/agents/${objectId || rowId}`)} icon={ExternalLink} />
        <IconButton label="Edit" onClick={() => onAction('edit', 'record-form')} icon={Save} />
        <IconButton label="Terminate" onClick={() => onAction('delete', 'record-form')} icon={Trash2} danger />
      </div>
    );
  }

  if (moduleKey === 'riskReviews') {
    return (
      <div className="flex flex-wrap gap-2">
        <IconButton label="Clear" onClick={() => onAction('cleared', 'risk-action')} icon={CheckCircle2} />
        <IconButton label="Block" onClick={() => onAction('blocked', 'risk-action')} icon={XCircle} danger />
      </div>
    );
  }

  if (moduleKey === 'fraudRisk') {
    return (
      <div className="flex flex-wrap gap-2">
        <IconButton label="Review" onClick={() => onAction('reviewing', 'fraud-action')} icon={Eye} />
        <IconButton label="Resolve" onClick={() => onAction('resolved', 'fraud-action')} icon={CheckCircle2} />
      </div>
    );
  }

  if (moduleKey === 'programs') {
    return (
      <div className="flex flex-wrap gap-2">
        <IconButton label="Manage days" onClick={() => onAction('days', 'program-day')} icon={ClipboardList} />
        <IconButton label="Edit" onClick={() => onAction('edit', 'record-form')} icon={Save} />
      </div>
    );
  }

  if (moduleKey === 'exercises' || moduleKey === 'videos') {
    return (
      <div className="flex flex-wrap gap-2">
        <IconButton label="Edit" onClick={() => onAction('edit', 'record-form')} icon={Save} />
        <IconButton label="Deactivate" onClick={() => onAction('delete', 'record-form')} icon={Trash2} danger />
      </div>
    );
  }

  if (moduleKey === 'revenueModels') {
    return (
      <div className="flex flex-wrap gap-2">
        <IconButton label="Edit model" onClick={() => onAction('edit', 'record-form')} icon={Save} />
        <IconButton label="Preview" onClick={onDetails} icon={Eye} />
      </div>
    );
  }

  if (['patients', 'payments', 'withdrawals', 'support'].includes(moduleKey)) {
    const base =
      moduleKey === 'patients'
          ? '/admin/patients'
          : moduleKey === 'payments'
            ? '/admin/payments'
            : moduleKey === 'withdrawals'
              ? '/admin/withdrawals'
              : '/admin/support';
    return <IconButton label="Open" onClick={() => navigate(`${base}/${objectId || rowId}`)} icon={ExternalLink} />;
  }

  return <IconButton label="Preview" onClick={onDetails} icon={Eye} />;
}

function createButtonLabel(createKind?: AdminResourceConfig['createKind']) {
  if (createKind === 'agent') return 'Add agent';
  if (createKind === 'program') return 'Create program';
  return 'Add exercise/video';
}

function AdminActionDrawer({
  drawer,
  moduleKey,
  config,
  onClose,
  onRefresh,
}: {
  drawer: DrawerState | null;
  moduleKey: AdminResourceKey;
  config: AdminResourceConfig;
  onClose: () => void;
  onRefresh: () => void;
}) {
  return (
    <Modal isOpen={!!drawer} onClose={onClose} title={drawerTitle(drawer, config)} size="xl">
      {drawer?.mode === 'details' && <RecordPreview row={drawer.row ?? {}} config={config} />}
      {drawer?.mode === 'doctor-action' && <DoctorActionForm row={drawer.row ?? {}} action={drawer.action ?? 'approve'} onClose={onClose} onRefresh={onRefresh} />}
      {drawer?.mode === 'risk-action' && <RiskReviewForm row={drawer.row ?? {}} status={drawer.action ?? 'cleared'} onClose={onClose} onRefresh={onRefresh} />}
      {drawer?.mode === 'fraud-action' && <FraudReviewForm row={drawer.row ?? {}} status={drawer.action ?? 'reviewing'} onClose={onClose} onRefresh={onRefresh} />}
      {drawer?.mode === 'program-day' && <ProgramDayBuilder row={drawer.row ?? {}} onClose={onClose} onRefresh={onRefresh} />}
      {drawer?.mode === 'record-form' && (
        <RecordForm moduleKey={moduleKey} row={drawer.row} action={drawer.action} onClose={onClose} onRefresh={onRefresh} />
      )}
      {drawer?.mode === 'visit-detail' && <ClinicVisitDetail row={drawer.row ?? {}} onClose={onClose} />}
    </Modal>
  );
}

function drawerTitle(drawer: DrawerState | null, config: AdminResourceConfig) {
  if (!drawer) return config.title;
  if (drawer.mode === 'record-form') return `${drawer.row ? 'Edit' : 'Create'} ${config.title}`;
  if (drawer.mode === 'program-day') return 'Program day-wise builder';
  if (drawer.mode === 'doctor-action') {
    const labels: Record<string, string> = {
      approve: 'Approve Doctor',
      'request-documents': 'Request Doctor Documents',
      reject: 'Reject Doctor',
      suspend: 'Suspend Doctor',
      'disable-qr': 'Disable QR Code',
      'reactivate-qr': 'Reactivate QR Code',
    };
    return labels[drawer.action ?? ''] ?? `Doctor ${drawer.action}`;
  }
  if (drawer.mode === 'risk-action') return 'Clinical risk decision';
  if (drawer.mode === 'fraud-action') return 'Fraud review decision';
  if (drawer.mode === 'visit-detail') return 'Clinic Visit Detail';
  return `${config.title} details`;
}

function ClinicVisitDetail({ row, onClose }: { row: ApiRecord; onClose: () => void }) {
  const OUTCOME_LABELS: Record<string, string> = {
    doctor_registered: 'Doctor Registered',
    interested: 'Interested',
    follow_up_required: 'Follow-up Required',
    not_interested: 'Not Interested',
    call_later: 'Call Later',
    clinic_closed: 'Clinic Closed',
    incorrect_location: 'Incorrect Location',
  };
  const FOLLOW_UP_LABELS: Record<string, string> = {
    not_required: 'Not Required',
    scheduled: 'Scheduled',
    completed: 'Completed',
    missed: 'Missed',
    cancelled: 'Cancelled',
  };
  const INTEREST_LABELS: Record<string, string> = {
    very_interested: 'Very Interested',
    interested: 'Interested',
    neutral: 'Neutral',
    not_interested: 'Not Interested',
  };

  const field = (label: string, value: unknown) => (
    <div className="rounded-lg border border-neutral-200 bg-white p-3">
      <div className="text-xs font-bold uppercase tracking-wide text-neutral-400">{label}</div>
      <div className="mt-1 break-words text-sm font-semibold text-neutral-900">{displayValue(value)}</div>
    </div>
  );

  const outcome = displayValue(row.outcome);
  const followUpStatus = displayValue(row.followUpStatus);
  const interestLevel = displayValue(row.doctorInterestLevel);

  return (
    <div className="space-y-5">
      {/* Visit identity */}
      <div className="grid gap-3 sm:grid-cols-2">
        {field('Clinic Name', row.clinicName || row.doctorName)}
        {field('Doctor', getValue(row, 'doctor.fullName') || row.doctorName)}
        {field('Agent', getValue(row, 'agent.fullName'))}
        {field('Visit Date', formatDate(row.visitDate))}
        {field('Visit Time', displayValue(row.visitTime))}
        {field('Location', displayValue(row.clinicLocation))}
      </div>

      {/* Outcome & interest */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-neutral-200 bg-white p-3">
          <div className="text-xs font-bold uppercase tracking-wide text-neutral-400">Outcome</div>
          <div className="mt-2">
            <StatusPill value={OUTCOME_LABELS[outcome] ?? outcome} />
          </div>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-3">
          <div className="text-xs font-bold uppercase tracking-wide text-neutral-400">Follow-up Status</div>
          <div className="mt-2">
            <StatusPill value={FOLLOW_UP_LABELS[followUpStatus] ?? followUpStatus} />
          </div>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-3">
          <div className="text-xs font-bold uppercase tracking-wide text-neutral-400">Interest Level</div>
          <div className="mt-2">
            <StatusPill value={INTEREST_LABELS[interestLevel] ?? interestLevel} />
          </div>
        </div>
      </div>

      {/* Discussion & follow-up notes */}
      {!!(row.discussionDetails || row.followUpNotes || row.nextAction || row.followUpCompletedNote) && (
        <div className="space-y-3">
          {!!row.discussionDetails && (
            <div className="rounded-lg border border-neutral-200 bg-white p-3">
              <div className="text-xs font-bold uppercase tracking-wide text-neutral-400">Discussion Details</div>
              <p className="mt-1 text-sm text-neutral-700">{displayValue(row.discussionDetails)}</p>
            </div>
          )}
          {!!row.followUpNotes && (
            <div className="rounded-lg border border-neutral-200 bg-white p-3">
              <div className="text-xs font-bold uppercase tracking-wide text-neutral-400">Follow-up Notes</div>
              <p className="mt-1 text-sm text-neutral-700">{displayValue(row.followUpNotes)}</p>
            </div>
          )}
          {!!row.nextAction && (
            <div className="rounded-lg border border-neutral-200 bg-white p-3">
              <div className="text-xs font-bold uppercase tracking-wide text-neutral-400">Next Action</div>
              <p className="mt-1 text-sm text-neutral-700">{displayValue(row.nextAction)}</p>
            </div>
          )}
        </div>
      )}

      {/* Follow-up dates */}
      {!!(row.followUpDate || row.followUpCompletedAt) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {!!row.followUpDate && field('Follow-up Date', formatDate(row.followUpDate))}
          {!!row.followUpCompletedAt && field('Completed At', formatDate(row.followUpCompletedAt))}
        </div>
      )}

      {/* Documents collected */}
      {Array.isArray(row.documentsCollected) && (row.documentsCollected as string[]).length > 0 && (
        <div className="rounded-lg border border-neutral-200 bg-white p-3">
          <div className="text-xs font-bold uppercase tracking-wide text-neutral-400">Documents Collected</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {(row.documentsCollected as string[]).map((doc) => (
              <span key={doc} className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700">{doc}</span>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button type="button" onClick={onClose} className="rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50">
          Close
        </button>
      </div>
    </div>
  );
}

function DoctorActionForm({ row, action, onClose, onRefresh }: { row: ApiRecord; action: string; onClose: () => void; onRefresh: () => void }) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const doctorId = recordObjectId(row);

  const mutation = useMutation({
    mutationFn: async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      if (action === 'approve') {
        return apiClient.post(`/doctors/${doctorId}/approve`, {
          approvedPatientFee: Number(form.get('approvedPatientFee') || 0),
          feeSharePercentage: Number(form.get('feeSharePercentage') || 0),
          feeShareHoldingDays: Number(form.get('feeShareHoldingDays') || 15),
          revenueModel: form.get('revenueModel'),
          feeShareType: form.get('feeShareType'),
          fixedFeeShareAmount: Number(form.get('fixedFeeShareAmount') || 0),
          password: String(form.get('password') || '') || undefined,
        });
      }
      if (action === 'request-documents') return apiClient.post(`/doctors/${doctorId}/request-documents`, { reason: form.get('reason') });
      if (action === 'suspend') return apiClient.post(`/doctors/${doctorId}/suspend`, { reason: form.get('reason') });
      if (action === 'disable-qr') return apiClient.post(`/doctors/${doctorId}/disable-qr`);
      if (action === 'reactivate-qr') return apiClient.post(`/doctors/${doctorId}/reactivate-qr`);
      return apiClient.post(`/doctors/${doctorId}/reject`, { reason: form.get('reason') });
    },
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ['admin-resource-page'] });
      onRefresh();
      const temporaryPassword = asRecord(response.data).temporaryPassword;
      setMessage(temporaryPassword ? `Doctor approved. Temporary password: ${temporaryPassword}` : 'Action completed and audit log generated.');
    },
  });

  const docs = Array.isArray(row.kycDocuments) ? (row.kycDocuments as ApiRecord[]) : [];

  return (
    <form className="space-y-5" onSubmit={(event) => mutation.mutate(event)}>
      <DecisionNotice title="This action changes doctor operational access" />
      <RecordSummary row={row} fields={['doctorId', 'fullName', 'clinicName', 'status', 'kycStatus', 'qrCodeActive']} />

      {action === 'approve' ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Input name="approvedPatientFee" label="Approved patient fee" type="number" defaultValue={displayValue(row.approvedPatientFee === undefined ? row.requestedPatientFee : row.approvedPatientFee)} required />
          <Input name="feeSharePercentage" label="Fee share percentage" type="number" defaultValue={displayValue(row.feeSharePercentage ?? 60)} required />
          <Input name="feeShareHoldingDays" label="Holding days" type="number" defaultValue={displayValue(row.feeShareHoldingDays ?? 15)} required />
          <Select name="revenueModel" label="Revenue model" defaultValue={displayValue(row.revenueModel ?? 'split')} options={[['split', 'Split Model'], ['platform_fee', 'Platform Fee Model']]} />
          <Select name="feeShareType" label="Fee share type" defaultValue={displayValue(row.feeShareType ?? 'percentage')} options={[['percentage', 'Percentage'], ['fixed', 'Fixed Amount'], ['slab', 'Slab Based']]} />
          <Input name="fixedFeeShareAmount" label="Fixed fee share amount" type="number" defaultValue={displayValue(row.fixedFeeShareAmount ?? 0)} />
          <Input name="password" label="Optional login password" placeholder="Leave blank to auto-generate" wide />
        </div>
      ) : action === 'disable-qr' || action === 'reactivate-qr' ? (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
          {action === 'disable-qr'
            ? "This will immediately deactivate the doctor's QR code. Patients cannot scan or register until it is reactivated."
            : "This will reactivate the doctor's QR code and allow patients to scan and register again."}
        </div>
      ) : (
        <label className="block">
          <span className="text-sm font-semibold text-neutral-700">Reason <span className="text-rose-500">*</span></span>
          <textarea name="reason" required className="mt-2 min-h-28 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500" placeholder="Decision reason required for audit trail" />
        </label>
      )}

      {docs.length > 0 && <KycDocumentList doctorId={doctorId} docs={docs} />}

      {message && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{message}</div>}
      <ActionError error={mutation.error} />
      <FormActions isSaving={mutation.isPending} onClose={onClose} submitLabel={`Confirm ${action}`} />
    </form>
  );
}

function KycDocumentList({ doctorId, docs }: { doctorId: string; docs: ApiRecord[] }) {
  const [error, setError] = useState<string | null>(null);

  const openDocument = async (documentId: string) => {
    try {
      setError(null);
      const response = await apiClient.get(`/doctors/${doctorId}/kyc-documents/${documentId}/access`);
      const url = displayValue(asRecord(response.data).url);
      if (url && url !== '-') window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-4">
      <h3 className="text-sm font-bold text-neutral-900">Secure KYC document access</h3>
      <p className="mt-1 text-xs text-neutral-500">Documents open through backend-generated short-lived URLs. Bank details stay masked in the UI.</p>
      <div className="mt-4 space-y-2">
        {docs.map((doc) => (
          <button
            key={recordObjectId(doc)}
            type="button"
            onClick={() => openDocument(recordObjectId(doc))}
            className="flex w-full items-center justify-between gap-3 rounded-lg border border-neutral-200 px-3 py-2 text-left text-sm hover:bg-neutral-50"
          >
            <span>
              <span className="block font-semibold text-neutral-900">{displayValue(doc.documentType)}</span>
              <span className="block text-xs text-neutral-500">{displayValue(doc.originalName)} | {displayValue(doc.storageProvider)}</span>
            </span>
            <ExternalLink className="h-4 w-4 text-neutral-500" />
          </button>
        ))}
      </div>
      {error && <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</div>}
    </section>
  );
}

function RiskReviewForm({ row, status, onClose, onRefresh }: { row: ApiRecord; status: string; onClose: () => void; onRefresh: () => void }) {
  const mutation = useDecisionMutation(`/admin/risk-reviews/${recordObjectId(row)}`, 'patch', onClose, onRefresh);
  return (
    <form className="space-y-5" onSubmit={(event) => mutation.mutate(formPayload(event, { status, noteField: 'adminReviewNote' }))}>
      <DecisionNotice title="Clinical safety decision" />
      <RecordSummary row={row} fields={['patient.fullName', 'patient.mobile', 'painCategory.name', 'status', 'adminReviewNote']} />
      <label className="block">
        <span className="text-sm font-semibold text-neutral-700">Admin review note</span>
        <textarea name="adminReviewNote" required className="mt-2 min-h-28 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500" />
      </label>
      <ActionError error={mutation.error} />
      <FormActions isSaving={mutation.isPending} onClose={onClose} submitLabel={`Mark ${status}`} />
    </form>
  );
}

function FraudReviewForm({ row, status, onClose, onRefresh }: { row: ApiRecord; status: string; onClose: () => void; onRefresh: () => void }) {
  const mutation = useDecisionMutation(`/admin/fraud-cases/${recordObjectId(row)}/review`, 'patch', onClose, onRefresh);
  return (
    <form className="space-y-5" onSubmit={(event) => mutation.mutate(formPayload(event, { status, noteField: 'note' }))}>
      <DecisionNotice title="Fraud review decision" />
      <RecordSummary row={row} fields={['rule', 'summary', 'severity', 'status', 'doctor.fullName', 'payment.invoiceNumber']} />
      <label className="block">
        <span className="text-sm font-semibold text-neutral-700">Review note</span>
        <textarea name="note" required className="mt-2 min-h-28 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500" />
      </label>
      <ActionError error={mutation.error} />
      <FormActions isSaving={mutation.isPending} onClose={onClose} submitLabel={`Mark ${status}`} />
    </form>
  );
}

function ProgramDayBuilder({ row, onClose, onRefresh }: { row: ApiRecord; onClose: () => void; onRefresh: () => void }) {
  const programId = recordObjectId(row);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>([]);
  const daysQuery = useQuery({
    queryKey: ['admin-program-days', programId],
    queryFn: async () => (await apiClient.get(`/programs/${programId}/days`)).data,
  });
  const exercisesQuery = useQuery({
    queryKey: ['admin-exercise-picker'],
    queryFn: async () => (await apiClient.get('/exercises', { params: { limit: 100, sortBy: 'name', sortOrder: 'asc' } })).data,
  });
  const mutation = useMutation({
    mutationFn: async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const manualExerciseIds = String(form.get('exerciseIds') || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      const exerciseIds = [...new Set([...selectedExerciseIds, ...manualExerciseIds])]
        .map((exercise, index) => ({ exercise, displayOrder: index + 1 }));
      return apiClient.post(`/programs/${programId}/days`, {
        dayNumber: Number(form.get('dayNumber') || 1),
        title: form.get('title'),
        exercises: exerciseIds,
      });
    },
    onSuccess: async () => {
      await daysQuery.refetch();
      onRefresh();
      setSelectedExerciseIds([]);
      setExerciseSearch('');
    },
  });

  const days = extractItems(daysQuery.data);
  const exercises = extractItems(exercisesQuery.data);
  const filteredExercises = exercises
    .filter((exercise) => {
      const query = exerciseSearch.trim().toLowerCase();
      if (!query) return true;
      return [exercise.name, exercise.description, exercise.videoUrl, exercise.language]
        .filter(Boolean)
        .some((value) => displayValue(value).toLowerCase().includes(query));
    })
    .slice(0, 12);
  const toggleExercise = (exerciseId: string) => {
    setSelectedExerciseIds((current) => (
      current.includes(exerciseId) ? current.filter((id) => id !== exerciseId) : [...current, exerciseId]
    ));
  };

  return (
    <div className="space-y-5">
      <RecordSummary row={row} fields={['programCode', 'name', 'durationDays', 'difficultyLevel', 'isActive']} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-lg border border-neutral-200 bg-white p-4">
          <h3 className="text-sm font-bold text-neutral-900">Existing days</h3>
          <div className="mt-4 space-y-3">
            {daysQuery.isLoading && <Skeleton className="h-24 w-full" />}
            {!daysQuery.isLoading && days.length === 0 && <div className="rounded-lg bg-neutral-50 p-4 text-sm text-neutral-500">No days added yet.</div>}
            {days.map((day) => (
              <div key={recordObjectId(day)} className="rounded-lg border border-neutral-200 p-3">
                <div className="font-semibold text-neutral-900">Day {displayValue(day.dayNumber)}: {displayValue(day.title)}</div>
                <div className="text-xs text-neutral-500">{Array.isArray(day.exercises) ? day.exercises.length : 0} exercises attached</div>
              </div>
            ))}
          </div>
        </section>
        <form className="rounded-lg border border-neutral-200 bg-neutral-50 p-4" onSubmit={(event) => mutation.mutate(event)}>
          <h3 className="text-sm font-bold text-neutral-900">Add program day</h3>
          <div className="mt-4 space-y-4">
            <Input name="dayNumber" label="Day number" type="number" defaultValue="1" required />
            <Input name="title" label="Day title" placeholder="Stability and balance" />
            <div className="rounded-lg border border-neutral-200 bg-white p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-neutral-700">Attach exercises</span>
                <span className="rounded-full bg-primary-50 px-2.5 py-1 text-xs font-bold text-primary-700">{selectedExerciseIds.length} selected</span>
              </div>
              <input
                value={exerciseSearch}
                onChange={(event) => setExerciseSearch(event.target.value)}
                placeholder="Search exercise title, language, or video"
                className="mt-3 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500"
              />
              <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
                {exercisesQuery.isLoading && <Skeleton className="h-20 w-full" />}
                {!exercisesQuery.isLoading && filteredExercises.length === 0 && (
                  <div className="rounded-lg bg-neutral-50 p-3 text-sm text-neutral-500">No exercises found.</div>
                )}
                {filteredExercises.map((exercise) => {
                  const exerciseId = recordObjectId(exercise);
                  const selected = selectedExerciseIds.includes(exerciseId);
                  return (
                    <button
                      key={exerciseId}
                      type="button"
                      onClick={() => toggleExercise(exerciseId)}
                      className={cn(
                        'w-full rounded-lg border p-3 text-left transition-colors',
                        selected ? 'border-primary-300 bg-primary-50' : 'border-neutral-200 bg-white hover:bg-neutral-50'
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-bold text-neutral-900">{displayValue(exercise.name)}</div>
                          <div className="mt-1 truncate text-xs text-neutral-500">{displayValue(exercise.videoUrl || exercise.description)}</div>
                        </div>
                        <span className={cn('mt-0.5 h-4 w-4 rounded border', selected ? 'border-primary-600 bg-primary-600' : 'border-neutral-300')} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            <label className="block">
              <span className="text-sm font-semibold text-neutral-700">Manual exercise IDs</span>
              <textarea name="exerciseIds" className="mt-2 min-h-20 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500" placeholder="Optional comma-separated ObjectIds" />
            </label>
            <ActionError error={mutation.error} />
            <button type="submit" disabled={mutation.isPending} className="inline-flex w-full min-h-11 items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60">
              <Plus className="h-4 w-4" />
              {mutation.isPending ? 'Saving...' : 'Add day'}
            </button>
          </div>
        </form>
      </div>
      <FormActions isSaving={false} onClose={onClose} submitLabel="Done" submitType="button" />
    </div>
  );
}

function validateAgentForm(form: FormData) {
  const errs: Record<string, string> = {};
  const fullName = String(form.get('fullName') || '').trim();
  const mobile = String(form.get('mobile') || '').trim();
  const email = String(form.get('email') || '').trim();
  const whatsapp = String(form.get('whatsapp') || '').trim();
  if (!fullName) errs.fullName = 'Full name is required.';
  else if (fullName.length < 2) errs.fullName = 'Full name must be at least 2 characters.';
  if (!mobile) errs.mobile = 'Mobile number is required.';

  else if (!/^\+?\d{10,15}$/.test(mobile)) errs.mobile = 'Enter a valid 10–15 digit mobile number.';
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Enter a valid email address.';
  if (whatsapp && !/^\+?\d{10,15}$/.test(whatsapp)) errs.whatsapp = 'Enter a valid 10–15 digit WhatsApp number.';
  return Object.keys(errs).length ? errs : null;
}

function RecordForm({ moduleKey, row, action, onClose, onRefresh }: { moduleKey: AdminResourceKey; row?: ApiRecord; action?: string; onClose: () => void; onRefresh: () => void }) {
  const isEdit = !!row && action !== 'delete';
  const isAgent = moduleKey === 'agents';
  const isExercise = moduleKey === 'exercises' || moduleKey === 'videos';
  const isRevenueModel = moduleKey === 'revenueModels';
  const endpoint = isRevenueModel ? '/admin/revenue-models' : isAgent ? '/agents' : isExercise ? '/exercises' : '/programs';
  const objectId = recordObjectId(row);
  const mutation = useMutation({
    mutationFn: async (form: FormData) => {
      if (action === 'delete' && row) return apiClient.delete(`${endpoint}/${objectId}`);

      const payload = isRevenueModel
        ? {
            revenueModel: form.get('revenueModel'),
            approvedPatientFee: Number(form.get('approvedPatientFee') || 0),
            feeSharePercentage: Number(form.get('feeSharePercentage') || 0),
            feeShareType: form.get('feeShareType') || 'percentage',
            fixedFeeShareAmount: Number(form.get('fixedFeeShareAmount') || 0),
            feeShareCalculationBasis: form.get('feeShareCalculationBasis') || 'gross',
            feeShareHoldingDays: Number(form.get('feeShareHoldingDays') || 15),
            minWithdrawal: Number(form.get('minWithdrawal') || 0),
            maxWithdrawal: Number(form.get('maxWithdrawal') || 0),
            payoutCycle: form.get('payoutCycle') || undefined,
            reason: form.get('reason') || undefined,
          }
        : isExercise
          ? {
              name: form.get('name'),
              description: form.get('description') || undefined,
              videoUrl: form.get('videoUrl') || undefined,
              sets: Number(form.get('sets') || 0),
              repetitions: Number(form.get('repetitions') || 0),
              language: form.get('language') || 'en',
          }
        : {
            name: form.get('name'),
            programCode: form.get('programCode') || undefined,
            durationDays: Number(form.get('durationDays') || 1),
            sessionsPerDay: Number(form.get('sessionsPerDay') || 1),
            difficultyLevel: form.get('difficultyLevel') || undefined,
            defaultPrice: Number(form.get('defaultPrice') || 0),
          };
      if (isRevenueModel) return apiClient.patch(`${endpoint}/${objectId}`, payload);
      return isEdit ? apiClient.put(`${endpoint}/${objectId}`, payload) : apiClient.post(endpoint, payload);
    },
    onSuccess: () => {
      onRefresh();
      onClose();
    },
  });

  if (isAgent && action !== 'delete') {
    return (
      <AgentRecordForm
        row={row}
        onCancel={onClose}
        onSaved={() => {
          onRefresh();
          onClose();
        }}
        submitLabel={isEdit ? 'Save changes' : 'Create agent'}
      />
    );
  }

  if (action === 'delete' && row) {
    return (
      <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); mutation.mutate(new FormData(e.currentTarget)); }}>
        <DecisionNotice title={isAgent ? 'Terminate agent account' : 'Deactivate exercise/video'} />
        <RecordSummary row={row} fields={isAgent ? ['agentId', 'fullName', 'mobile', 'email', 'status'] : ['name', 'youtubeVideoId', 'language', 'isActive']} />
        <ActionError error={mutation.error} />
        <FormActions isSaving={mutation.isPending} onClose={onClose} submitLabel={isAgent ? 'Terminate agent' : 'Deactivate record'} danger />
      </form>
    );
  }

  if (isRevenueModel) {
    return (
      <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); mutation.mutate(new FormData(e.currentTarget)); }}>
        <DecisionNotice title="Commercial configuration update" />
        <RecordSummary row={row ?? {}} fields={['doctorId', 'fullName', 'clinicName', 'status', 'revenueModel']} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select name="revenueModel" label="Revenue model" defaultValue={displayValue(row?.revenueModel ?? 'split')} options={[['split', 'Split Model'], ['platform_fee', 'Platform Fee Model']]} />
          <Input name="approvedPatientFee" label="Approved patient/platform fee" type="number" defaultValue={displayValue(row?.approvedPatientFee ?? row?.requestedPatientFee ?? 0)} />
          <Input name="feeSharePercentage" label="Fee-share percentage" type="number" defaultValue={displayValue(row?.feeSharePercentage ?? 0)} />
          <Select name="feeShareType" label="Fee-share type" defaultValue={displayValue(row?.feeShareType ?? 'percentage')} options={[['percentage', 'Percentage'], ['fixed', 'Fixed'], ['slab', 'Slab']]} />
          <Input name="fixedFeeShareAmount" label="Fixed fee-share amount" type="number" defaultValue={displayValue(row?.fixedFeeShareAmount ?? 0)} />
          <Select
            name="feeShareCalculationBasis"
            label="Calculation basis"
            defaultValue={displayValue(row?.feeShareCalculationBasis ?? 'gross')}
            options={[['gross', 'Gross'], ['after_discount', 'After discount'], ['net_after_charges', 'Net after charges']]}
          />
          <Input name="feeShareHoldingDays" label="Holding days" type="number" defaultValue={displayValue(row?.feeShareHoldingDays ?? 15)} />
          <Input name="minWithdrawal" label="Minimum withdrawal" type="number" defaultValue={displayValue(row?.minWithdrawal ?? 0)} />
          <Input name="maxWithdrawal" label="Maximum withdrawal" type="number" defaultValue={displayValue(row?.maxWithdrawal ?? 0)} />
          <Input name="payoutCycle" label="Payout cycle" defaultValue={displayValue(row?.payoutCycle)} placeholder="monthly" />
          <label className="block sm:col-span-2">
            <span className="text-sm font-semibold text-neutral-700">Reason for audit</span>
            <textarea name="reason" required className="mt-2 min-h-24 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500" placeholder="Why this commercial configuration is changing" />
          </label>
        </div>
        <ActionError error={mutation.error} />
        <FormActions isSaving={mutation.isPending} onClose={onClose} submitLabel="Save revenue model" />
      </form>
    );
  }

  return (
    <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); mutation.mutate(new FormData(e.currentTarget)); }}>
      <DecisionNotice title={isExercise ? 'Exercise and YouTube video record' : 'Rehabilitation program record'} />
      <div className="space-y-5">
        {isExercise ? (
          <>
            <Input name="name" label="Exercise title" defaultValue={displayValue(row?.name)} required wide />
            <Input name="videoUrl" label="YouTube unlisted URL" defaultValue={displayValue(row?.videoUrl)} placeholder="https://youtu.be/abcdefghijk" wide />
            <Input name="sets" label="Sets" type="number" defaultValue={displayValue(row?.sets ?? 3)} />
            <Input name="repetitions" label="Repetitions" type="number" defaultValue={displayValue(row?.repetitions ?? 10)} />
            <Select name="language" label="Language" defaultValue={displayValue(row?.language ?? 'en')} options={[['en', 'English'], ['hi', 'Hindi']]} />
            <label className="block sm:col-span-2">
              <span className="text-sm font-semibold text-neutral-700">Clinical instructions</span>
              <textarea name="description" defaultValue={displayValue(row?.description)} className="mt-2 min-h-24 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500" />
            </label>
          </>
        ) : (
          <>
            <Input name="name" label="Program name" defaultValue={displayValue(row?.name)} required wide />
            <Input name="programCode" label="Program code" defaultValue={displayValue(row?.programCode)} />
            <Input name="durationDays" label="Duration days" type="number" defaultValue={displayValue(row?.durationDays ?? 14)} required />
            <Input name="sessionsPerDay" label="Sessions per day" type="number" defaultValue={displayValue(row?.sessionsPerDay ?? 1)} />
            <Input name="defaultPrice" label="Default price" type="number" defaultValue={displayValue(row?.defaultPrice ?? 0)} />
            <Select
              name="difficultyLevel"
              label="Difficulty"
              defaultValue={displayValue(row?.difficultyLevel ?? 'beginner')}
              options={[
                ['beginner', 'Beginner'],
                ['intermediate', 'Intermediate'],
                ['advanced', 'Advanced'],
                ['senior_friendly', 'Senior-friendly'],
                ['post_operative', 'Post-operative'],
                ['general_mobility', 'General mobility'],
                ['condition_specific', 'Condition-specific'],
              ]}
            />
          </>
        )}
      </div>
      <ActionError error={mutation.error} />
      <FormActions isSaving={mutation.isPending} onClose={onClose} submitLabel={isEdit ? 'Save changes' : 'Create record'} />
    </form>
  );
}

function useDecisionMutation(endpoint: string, method: 'patch' | 'post', onClose: () => void, onRefresh: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ApiRecord) => (method === 'patch' ? apiClient.patch(endpoint, payload) : apiClient.post(endpoint, payload)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-resource-page'] });
      onRefresh();
      onClose();
    },
  });
}

function formPayload(event: React.FormEvent<HTMLFormElement>, options: { status: string; noteField: string }) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  return {
    status: options.status,
    [options.noteField]: form.get(options.noteField) || form.get('note'),
  };
}

function AuditExportButton({ search }: { search: string }) {
  const [error, setError] = useState<string | null>(null);
  const exportLogs = async () => {
    try {
      setError(null);
      const response = await apiClient.get('/admin/audit-logs/export', {
        params: search ? { search } : undefined,
        responseType: 'blob',
      });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'audit-logs.csv';
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={exportLogs}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-primary-200 bg-primary-50 px-4 py-2.5 text-sm font-semibold text-primary-700 hover:bg-primary-100"
      >
        <Download className="h-4 w-4" />
        Export CSV
      </button>
      {error && <div className="mt-2 text-xs font-semibold text-rose-700">{error}</div>}
    </div>
  );
}

function RecordPreview({ row, config }: { row: ApiRecord; config: AdminResourceConfig }) {
  const fields = ['_id', config.idField, config.primaryField, ...config.secondaryFields, config.statusField, config.ownerField, config.amountField, config.dateField].filter(Boolean) as string[];
  return <RecordSummary row={row} fields={fields} />;
}

function RecordSummary({ row, fields }: { row: ApiRecord; fields: string[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {fields.map((field) => (
        <div key={field} className="rounded-lg border border-neutral-200 bg-white p-3">
          <div className="text-xs font-bold uppercase tracking-wide text-neutral-400">{field}</div>
          <div className="mt-1 break-words text-sm font-semibold text-neutral-900">{displayValue(getValue(row, field))}</div>
        </div>
      ))}
    </div>
  );
}

function DecisionNotice({ title }: { title: string }) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
     
    </div>
  );
}

function KpiCard({ label, value, tone }: { label: string; value: string | number; tone: 'teal' | 'emerald' | 'amber' | 'sky' }) {
  const toneClass =
    tone === 'teal' ? 'bg-teal-50 text-teal-700' :
    tone === 'emerald' ? 'bg-emerald-50 text-emerald-700' :
    tone === 'amber' ? 'bg-amber-50 text-amber-700' :
    'bg-sky-50 text-sky-700';
  return (
    <div className="card p-4">
      <div className={cn('mb-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold', toneClass)}>{label}</div>
      <div className="text-2xl font-bold text-neutral-900">{value}</div>
    </div>
  );
}

function StatusPill({ value }: { value: unknown }) {
  const label = displayValue(value);
  const normalized = label.toLowerCase();
  const tone =
    normalized.includes('approved') || normalized.includes('active') || normalized.includes('success') || normalized.includes('paid') || normalized === 'true'
      ? 'bg-emerald-50 text-emerald-700'
      : normalized.includes('pending') || normalized.includes('review') || normalized.includes('processing') || normalized.includes('submitted')
        ? 'bg-amber-50 text-amber-700'
        : normalized.includes('failed') || normalized.includes('reject') || normalized.includes('suspend') || normalized.includes('refund') || normalized === 'false' || normalized.includes('block')
          ? 'bg-rose-50 text-rose-700'
          : 'bg-neutral-100 text-neutral-600';
  return <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize', tone)}>{label}</span>;
}

function IconButton({ label, onClick, icon: Icon, danger = false }: { label: string; onClick: () => void; icon: React.ElementType; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      title={label}
      className={cn(
        'inline-flex h-9 min-w-9 items-center justify-center gap-1 rounded-lg border px-2 text-xs font-semibold transition-colors',
        danger ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100' : 'border-neutral-200 bg-white text-neutral-700 hover:bg-primary-50 hover:text-primary-700'
      )}
    >
      <Icon className="h-4 w-4" />
      <span className="hidden xl:inline">{label}</span>
    </button>
  );
}

function Input({
  name,
  label,
  type = 'text',
  defaultValue,
  placeholder,
  required,
  wide,
  error,
}: {
  name: string;
  label: string;
  type?: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  wide?: boolean;
  error?: string;
}) {
  return (
    <label className={cn('block', wide && 'sm:col-span-2')}>
      <span className="text-sm font-semibold text-neutral-700">
        {label}{required && <span className="ml-0.5 text-rose-500">*</span>}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue === '-' ? '' : defaultValue}
        placeholder={placeholder}
        className={cn(
          'mt-2 w-full rounded-lg border px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-primary-500',
          error ? 'border-rose-400 bg-rose-50' : 'border-neutral-300'
        )}
      />
      {error && <p className="mt-1 text-xs font-semibold text-rose-600">{error}</p>}
    </label>
  );
}

function Select({ name, label, defaultValue, options }: { name: string; label: string; defaultValue?: string; options: [string, string][] }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-neutral-700">{label}</span>
      <select name={name} defaultValue={defaultValue} className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-primary-500">
        {options.map(([value, labelText]) => (
          <option key={value} value={value}>
            {labelText}
          </option>
        ))}
      </select>
    </label>
  );
}

function ActionError({ error }: { error: unknown }) {
  if (!error) return null;
  return <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{errorMessage(error)}</div>;
}

function errorMessage(error: unknown) {
  const data = asRecord(asRecord(error).response).data;
  return displayValue(asRecord(data).message || asRecord(error).message || 'Request failed.');
}

function FormActions({
  isSaving,
  onClose,
  submitLabel,
  danger,
  submitType = 'submit',
}: {
  isSaving: boolean;
  onClose: () => void;
  submitLabel: string;
  danger?: boolean;
  submitType?: 'submit' | 'button';
}) {
  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <button type="button" onClick={onClose} className="rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-semibold text-neutral-700">
        Cancel
      </button>
      <button
        type={submitType}
        onClick={submitType === 'button' ? onClose : undefined}
        disabled={isSaving}
        className={cn(
          'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60',
          danger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-primary-600 hover:bg-primary-700'
        )}
      >
        {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {isSaving ? 'Saving...' : submitLabel}
      </button>
    </div>
  );
}

export default AdminResourceListPage;
