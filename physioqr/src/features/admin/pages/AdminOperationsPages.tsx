import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Building2,
  ClipboardList,
  CreditCard,
  Download,
  Dumbbell,
  FileSearch,
  Filter,
  HeartPulse,
  MessageSquare,
  PieChart,
  QrCode,
  ReceiptText,
  RefreshCw,
  Settings,
  ShieldCheck,
  Video,
  Wallet,
} from 'lucide-react';
import { DataTable, type DataTableColumn } from '@/components/data-display/DataTable';
import ErrorState from '@/components/feedback/ErrorState';
import { SearchInput } from '@/components/ui/SearchInput';
import { Modal } from '@/components/ui/Modal';
import apiClient from '@/lib/api-client';
import { cn } from '@/lib/cn';

type Tone = 'success' | 'warning' | 'danger' | 'neutral';

type AdminRow = {
  id: string;
  primary: string;
  secondary: string;
  owner: string;
  status: string;
  tone: Tone;
  metric: string;
  amount?: string;
  updated: string;
  raw?: AdminApiRecord;
};

type AdminApiRecord = Record<string, unknown>;

type AdminApiConfig = {
  endpoint: string;
  params?: Record<string, string>;
  mapRows: (payload: unknown) => AdminRow[];
};

type AdminOperationConfig = {
  eyebrow: string;
  title: string;
  description: string;
  icon: React.ElementType;
  primaryAction: string;
  secondaryAction: string;
  searchPlaceholder: string;
  filterLabel: string;
  rows: AdminRow[];
  kpis: { label: string; value: string | number; tone: string }[];
  panelTitle: string;
  panelItems: string[];
};

const operationConfigs: Record<string, AdminOperationConfig> = {
  clinics: {
    eyebrow: 'NETWORK CONTROL',
    title: 'Clinics',
    description: 'Manage clinic branches, doctor linkage, locations, and field-agent attribution.',
    icon: Building2,
    primaryAction: 'Add clinic',
    secondaryAction: 'Export clinics',
    searchPlaceholder: 'Search clinic, doctor, city, agent',
    filterLabel: 'Clinic status',
    rows: [],
    kpis: [
      { label: 'Total clinics', value: 48, tone: 'bg-sky-50 text-sky-700' },
      { label: 'Active branches', value: 42, tone: 'bg-emerald-50 text-emerald-700' },
      { label: 'Pending verification', value: 5, tone: 'bg-amber-50 text-amber-700' },
      { label: 'Suspended', value: 1, tone: 'bg-rose-50 text-rose-700' },
    ],
    panelTitle: 'Clinic Review Rules',
    panelItems: ['Confirm address and map location', 'Link clinic to approved doctor', 'Preserve agent attribution', 'Disable referral intake if doctor is suspended'],
  },
  referrals: {
    eyebrow: 'QR AND REFERRAL FUNNEL',
    title: 'Referral Tracking',
    description: 'Track QR scans, registrations, OTP completion, payments, and program activation conversion.',
    icon: QrCode,
    primaryAction: 'Generate QR',
    secondaryAction: 'Download report',
    searchPlaceholder: 'Search QR, doctor, clinic, referral ID',
    filterLabel: 'QR status',
    rows: [],
    kpis: [
      { label: 'QR scans', value: '12,840', tone: 'bg-teal-50 text-teal-700' },
      { label: 'Registrations', value: '4,126', tone: 'bg-sky-50 text-sky-700' },
      { label: 'Paid patients', value: '2,980', tone: 'bg-emerald-50 text-emerald-700' },
      { label: 'Avg conversion', value: '23.2%', tone: 'bg-violet-50 text-violet-700' },
    ],
    panelTitle: 'Referral Funnel',
    panelItems: ['QR scanned', 'Registration started', 'OTP verified', 'Assessment completed', 'Payment successful', 'Program activated'],
  },
  assessments: {
    eyebrow: 'CLINICAL CONFIGURATION',
    title: 'Assessments',
    description: 'Build pain assessment questions, answer options, conditional logic, and program assignment rules.',
    icon: ClipboardList,
    primaryAction: 'New question',
    secondaryAction: 'Version history',
    searchPlaceholder: 'Search question, pain category, risk rule',
    filterLabel: 'Assessment status',
    rows: [],
    kpis: [
      { label: 'Published flows', value: 8, tone: 'bg-emerald-50 text-emerald-700' },
      { label: 'Draft flows', value: 3, tone: 'bg-neutral-100 text-neutral-700' },
      { label: 'Conditional rules', value: 29, tone: 'bg-sky-50 text-sky-700' },
      { label: 'Red flag rules', value: 12, tone: 'bg-rose-50 text-rose-700' },
    ],
    panelTitle: 'Assessment Governance',
    panelItems: ['Version assessments before publishing', 'Map high-risk answers to risk review', 'Keep clinical questions concise', 'Do not auto-activate blocked programs'],
  },
  'risk-reviews': {
    eyebrow: 'CLINICAL SAFETY',
    title: 'Risk Reviews',
    description: 'Manual review queue for red-flag assessments and patients requiring clinical safety decisions.',
    icon: AlertTriangle,
    primaryAction: 'Open queue',
    secondaryAction: 'Export cases',
    searchPlaceholder: 'Search patient, doctor, risk flag',
    filterLabel: 'Risk level',
    rows: [],
    kpis: [
      { label: 'Open reviews', value: 9, tone: 'bg-amber-50 text-amber-700' },
      { label: 'Blocking risk', value: 3, tone: 'bg-rose-50 text-rose-700' },
      { label: 'Cleared today', value: 6, tone: 'bg-emerald-50 text-emerald-700' },
      { label: 'Avg review time', value: '3.4h', tone: 'bg-sky-50 text-sky-700' },
    ],
    panelTitle: 'Safety Decision Context',
    panelItems: ['Show full assessment answers', 'Show referring doctor and program', 'Require admin decision notes', 'Record every decision in audit log'],
  },
  'pain-categories': {
    eyebrow: 'CLINICAL TAXONOMY',
    title: 'Pain Categories',
    description: 'Control patient-facing pain categories, linked assessment flows, program eligibility, and multilingual labels.',
    icon: HeartPulse,
    primaryAction: 'Add category',
    secondaryAction: 'Review mappings',
    searchPlaceholder: 'Search pain category, program, assessment flow',
    filterLabel: 'Category status',
    rows: [],
    kpis: [
      { label: 'Active categories', value: 15, tone: 'bg-emerald-50 text-emerald-700' },
      { label: 'Linked programs', value: 28, tone: 'bg-teal-50 text-teal-700' },
      { label: 'Need translation', value: 4, tone: 'bg-amber-50 text-amber-700' },
      { label: 'Manual assignment', value: 2, tone: 'bg-neutral-100 text-neutral-700' },
    ],
    panelTitle: 'Category Rules',
    panelItems: ['Map every category to an assessment flow', 'Keep patient labels simple and translated', 'Block auto-assignment when risk review is required', 'Version mappings before changing live programs'],
  },
  programs: {
    eyebrow: 'CONTENT CONTROL',
    title: 'Rehabilitation Programs',
    description: 'Manage program versions, pain categories, day-wise plans, duration, eligibility, and publishing state.',
    icon: Dumbbell,
    primaryAction: 'Create program',
    secondaryAction: 'Review drafts',
    searchPlaceholder: 'Search program, category, version',
    filterLabel: 'Program status',
    rows: [],
    kpis: [
      { label: 'Published', value: 16, tone: 'bg-emerald-50 text-emerald-700' },
      { label: 'Draft versions', value: 5, tone: 'bg-neutral-100 text-neutral-700' },
      { label: 'Active patients', value: 198, tone: 'bg-teal-50 text-teal-700' },
      { label: 'Avg completion', value: '72%', tone: 'bg-sky-50 text-sky-700' },
    ],
    panelTitle: 'Versioning Rule',
    panelItems: ['Edit drafts, not live patient programs', 'Publish new version for new patients', 'Keep old versions for existing orders', 'Require notes for clinical changes'],
  },
  exercises: {
    eyebrow: 'EXERCISE LIBRARY',
    title: 'Exercises',
    description: 'Maintain reusable exercises with sets, repetitions, duration, equipment, precautions, and linked videos.',
    icon: ClipboardList,
    primaryAction: 'Add exercise',
    secondaryAction: 'Import library',
    searchPlaceholder: 'Search exercise, category, equipment',
    filterLabel: 'Exercise status',
    rows: [],
    kpis: [
      { label: 'Exercises', value: 84, tone: 'bg-teal-50 text-teal-700' },
      { label: 'Need video', value: 11, tone: 'bg-amber-50 text-amber-700' },
      { label: 'With precautions', value: 78, tone: 'bg-emerald-50 text-emerald-700' },
      { label: 'Archived', value: 6, tone: 'bg-neutral-100 text-neutral-700' },
    ],
    panelTitle: 'Exercise Quality Checks',
    panelItems: ['Use reusable exercise records', 'Attach precautions and mistakes', 'Define stable sets/reps metadata', 'Link videos by language and version'],
  },
  videos: {
    eyebrow: 'VIDEO LIBRARY',
    title: 'Videos',
    description: 'Manage YouTube unlisted video metadata, embed status, duration, language, and program placement.',
    icon: Video,
    primaryAction: 'Add video',
    secondaryAction: 'Validate embeds',
    searchPlaceholder: 'Search video, YouTube ID, exercise',
    filterLabel: 'Embed status',
    rows: [],
    kpis: [
      { label: 'Videos', value: 132, tone: 'bg-teal-50 text-teal-700' },
      { label: 'Validated', value: 121, tone: 'bg-emerald-50 text-emerald-700' },
      { label: 'Unavailable', value: 3, tone: 'bg-rose-50 text-rose-700' },
      { label: 'Hindi versions', value: 58, tone: 'bg-sky-50 text-sky-700' },
    ],
    panelTitle: 'Video Security Note',
    panelItems: ['YouTube unlisted is not fully private', 'Validate embed availability regularly', 'Store video ID and metadata snapshot', 'Plan secure hosting for phase 2'],
  },
  orders: {
    eyebrow: 'COMMERCE CONTROL',
    title: 'Orders',
    description: 'Inspect immutable patient orders, price snapshots, payment attempts, invoices, and program activation state.',
    icon: ReceiptText,
    primaryAction: 'Export orders',
    secondaryAction: 'Recheck pending',
    searchPlaceholder: 'Search order, patient, doctor, payment ID',
    filterLabel: 'Order status',
    rows: [],
    kpis: [
      { label: 'Orders today', value: 38, tone: 'bg-teal-50 text-teal-700' },
      { label: 'Payment pending', value: 7, tone: 'bg-amber-50 text-amber-700' },
      { label: 'Activated', value: 31, tone: 'bg-emerald-50 text-emerald-700' },
      { label: 'Refunded', value: 2, tone: 'bg-rose-50 text-rose-700' },
    ],
    panelTitle: 'Order Rule',
    panelItems: ['Never recalculate historical pricing', 'Store pricing rule snapshot', 'Allow multiple payment attempts', 'Activate program only after verified payment'],
  },
  refunds: {
    eyebrow: 'REFUND CONTROL',
    title: 'Refunds',
    description: 'Process full or partial refunds while reversing related doctor fee-share ledger entries.',
    icon: RefreshCw,
    primaryAction: 'Review refunds',
    secondaryAction: 'Export ledger',
    searchPlaceholder: 'Search refund, order, patient, gateway ref',
    filterLabel: 'Refund status',
    rows: [],
    kpis: [
      { label: 'Refund requests', value: 8, tone: 'bg-amber-50 text-amber-700' },
      { label: 'Processed', value: 21, tone: 'bg-emerald-50 text-emerald-700' },
      { label: 'Failed', value: 2, tone: 'bg-rose-50 text-rose-700' },
      { label: 'Fee share reversals', value: 'INR 18,400', tone: 'bg-violet-50 text-violet-700' },
    ],
    panelTitle: 'Refund Checklist',
    panelItems: ['Check program usage before approval', 'Create refund transaction record', 'Reverse related fee share', 'Keep wallet recovery visible if already paid'],
  },
  coupons: {
    eyebrow: 'DISCOUNT CONTROL',
    title: 'Coupons',
    description: 'Manage fixed, percentage, doctor-specific, program-specific, and campaign discounts with fee-share calculation rules.',
    icon: ReceiptText,
    primaryAction: 'Create coupon',
    secondaryAction: 'Export usage',
    searchPlaceholder: 'Search coupon, doctor, program, campaign',
    filterLabel: 'Coupon status',
    rows: [],
    kpis: [
      { label: 'Active coupons', value: 9, tone: 'bg-emerald-50 text-emerald-700' },
      { label: 'Scheduled', value: 3, tone: 'bg-amber-50 text-amber-700' },
      { label: 'Redemptions', value: 286, tone: 'bg-teal-50 text-teal-700' },
      { label: 'Discount given', value: 'INR 42,800', tone: 'bg-violet-50 text-violet-700' },
    ],
    panelTitle: 'Coupon Guardrails',
    panelItems: ['Define if fee share is before or after discount', 'Store coupon snapshot on every order', 'Support usage limits per patient and campaign', 'Expire coupons without deleting history'],
  },
  'revenue-models': {
    eyebrow: 'COMMERCIAL CONFIGURATION',
    title: 'Revenue Models',
    description: 'Configure Split Model and Platform Fee Model rules by doctor, program, category, and effective date.',
    icon: PieChart,
    primaryAction: 'New rule',
    secondaryAction: 'View history',
    searchPlaceholder: 'Search doctor, program, model, rule ID',
    filterLabel: 'Model status',
    rows: [],
    kpis: [
      { label: 'Split doctors', value: 22, tone: 'bg-teal-50 text-teal-700' },
      { label: 'Platform fee doctors', value: 12, tone: 'bg-sky-50 text-sky-700' },
      { label: 'Rules changing soon', value: 4, tone: 'bg-amber-50 text-amber-700' },
      { label: 'Versioned rules', value: 31, tone: 'bg-violet-50 text-violet-700' },
    ],
    panelTitle: 'Terminology',
    panelItems: ['Revenue Model: Split or Platform Fee', 'Fee Share applies only to Split Model', 'Platform Fee belongs to PhysioQR', 'Use effective dates, never overwrite history'],
  },
  'fee-shares': {
    eyebrow: 'FEE SHARE LEDGER',
    title: 'Fee Shares',
    description: 'Track doctor rehabilitation programme fee-share entries across estimated, pending, available, reversed, and paid states.',
    icon: PieChart,
    primaryAction: 'Create adjustment',
    secondaryAction: 'Export ledger',
    searchPlaceholder: 'Search fee share, doctor, payment, order',
    filterLabel: 'Fee-share status',
    rows: [],
    kpis: [
      { label: 'Pending fee share', value: 'INR 85,000', tone: 'bg-amber-50 text-amber-700' },
      { label: 'Available', value: 'INR 1.75L', tone: 'bg-emerald-50 text-emerald-700' },
      { label: 'On hold', value: 'INR 22,400', tone: 'bg-violet-50 text-violet-700' },
      { label: 'Reversed', value: 'INR 18,400', tone: 'bg-rose-50 text-rose-700' },
    ],
    panelTitle: 'Ledger Rule',
    panelItems: ['Create fee share only after successful payment', 'Release after holding period', 'Reverse fee share on refund', 'Never overwrite historical fee-share entries'],
  },
  wallets: {
    eyebrow: 'DOCTOR WALLETS',
    title: 'Doctor Wallets',
    description: 'View doctor wallet balances from append-only ledger entries: pending, available, blocked, paid, reversed, and adjusted.',
    icon: Wallet,
    primaryAction: 'Manual adjustment',
    secondaryAction: 'Export wallet ledger',
    searchPlaceholder: 'Search doctor, wallet, ledger entry',
    filterLabel: 'Wallet status',
    rows: [],
    kpis: [
      { label: 'Total available', value: 'INR 2.84L', tone: 'bg-emerald-50 text-emerald-700' },
      { label: 'Pending release', value: 'INR 85,000', tone: 'bg-amber-50 text-amber-700' },
      { label: 'Blocked', value: 'INR 31,200', tone: 'bg-rose-50 text-rose-700' },
      { label: 'Paid lifetime', value: 'INR 12.4L', tone: 'bg-sky-50 text-sky-700' },
    ],
    panelTitle: 'Wallet Principle',
    panelItems: ['Balance is derived from ledger entries', 'Manual changes require debit/credit entry', 'Withdrawals block available balance', 'Refund recovery stays visible'],
  },
  payouts: {
    eyebrow: 'PAYOUT OPERATIONS',
    title: 'Payouts',
    description: 'Track approved withdrawal settlements, payout references, failures, and completed doctor transfers.',
    icon: CreditCard,
    primaryAction: 'Process batch',
    secondaryAction: 'Export payouts',
    searchPlaceholder: 'Search payout, doctor, bank ref',
    filterLabel: 'Payout status',
    rows: [],
    kpis: [
      { label: 'Pending payouts', value: 'INR 1.45L', tone: 'bg-amber-50 text-amber-700' },
      { label: 'Paid this month', value: 'INR 3.12L', tone: 'bg-emerald-50 text-emerald-700' },
      { label: 'Failed', value: 5, tone: 'bg-rose-50 text-rose-700' },
      { label: 'Next cycle', value: '16 Aug', tone: 'bg-sky-50 text-sky-700' },
    ],
    panelTitle: 'Payout Safety',
    panelItems: ['Verify doctor active status', 'Verify KYC and bank', 'Check available wallet balance', 'Record transaction reference after payment'],
  },
  reconciliation: {
    eyebrow: 'FINANCIAL RECONCILIATION',
    title: 'Reconciliation',
    description: 'Compare orders, gateway payments, refunds, wallet ledger, and payout records for mismatches.',
    icon: FileSearch,
    primaryAction: 'Run check',
    secondaryAction: 'Export exceptions',
    searchPlaceholder: 'Search exception, order, payment, wallet',
    filterLabel: 'Exception type',
    rows: [],
    kpis: [
      { label: 'Open exceptions', value: 7, tone: 'bg-rose-50 text-rose-700' },
      { label: 'Resolved today', value: 11, tone: 'bg-emerald-50 text-emerald-700' },
      { label: 'Gateway mismatch', value: 3, tone: 'bg-amber-50 text-amber-700' },
      { label: 'Ledger mismatch', value: 4, tone: 'bg-violet-50 text-violet-700' },
    ],
    panelTitle: 'Compare Sources',
    panelItems: ['PhysioQR orders', 'Payment gateway transactions', 'Internal financial ledger', 'Doctor wallet ledger', 'Payout records'],
  },
  notifications: {
    eyebrow: 'COMMUNICATION OPERATIONS',
    title: 'Notifications',
    description: 'Manage WhatsApp, SMS, email, and in-app notification templates and delivery health.',
    icon: Bell,
    primaryAction: 'New template',
    secondaryAction: 'Delivery logs',
    searchPlaceholder: 'Search template, channel, trigger',
    filterLabel: 'Channel status',
    rows: [],
    kpis: [
      { label: 'Active templates', value: 42, tone: 'bg-teal-50 text-teal-700' },
      { label: 'Delivery rate', value: '97.2%', tone: 'bg-emerald-50 text-emerald-700' },
      { label: 'Failed today', value: 18, tone: 'bg-rose-50 text-rose-700' },
      { label: 'Needs review', value: 5, tone: 'bg-amber-50 text-amber-700' },
    ],
    panelTitle: 'Notification Types',
    panelItems: ['Patient program reminders', 'Doctor fee-share updates', 'Agent follow-up reminders', 'Admin risk and finance alerts'],
  },
  support: {
    eyebrow: 'SUPPORT OPERATIONS',
    title: 'Support Tickets',
    description: 'Handle patient, doctor, and agent support requests across payment, video access, QR, and payout issues.',
    icon: MessageSquare,
    primaryAction: 'Open queue',
    secondaryAction: 'Export tickets',
    searchPlaceholder: 'Search ticket, user, category, subject',
    filterLabel: 'Ticket status',
    rows: [],
    kpis: [
      { label: 'Open tickets', value: 17, tone: 'bg-amber-50 text-amber-700' },
      { label: 'Overdue', value: 4, tone: 'bg-rose-50 text-rose-700' },
      { label: 'Resolved today', value: 23, tone: 'bg-emerald-50 text-emerald-700' },
      { label: 'Avg first response', value: '28m', tone: 'bg-sky-50 text-sky-700' },
    ],
    panelTitle: 'Support Context',
    panelItems: ['Show linked patient/doctor/order', 'Keep admin response history', 'Support attachments and screenshots', 'Escalate finance and clinical cases'],
  },
  reports: {
    eyebrow: 'REPORTING AND ANALYTICS',
    title: 'Reports',
    description: 'Business, clinical, referral, financial, doctor, agent, patient, program, operational, and risk reports.',
    icon: FileSearch,
    primaryAction: 'Build report',
    secondaryAction: 'Export PDF',
    searchPlaceholder: 'Search report, metric, module, owner',
    filterLabel: 'Report type',
    rows: [],
    kpis: [
      { label: 'Saved reports', value: 18, tone: 'bg-teal-50 text-teal-700' },
      { label: 'Scheduled exports', value: 6, tone: 'bg-sky-50 text-sky-700' },
      { label: 'Financial reports', value: 5, tone: 'bg-violet-50 text-violet-700' },
      { label: 'Needs review', value: 2, tone: 'bg-amber-50 text-amber-700' },
    ],
    panelTitle: 'Report Filters',
    panelItems: ['Date range', 'Doctor and agent', 'Pain category and program', 'Payment and refund status', 'City and state'],
  },
  settings: {
    eyebrow: 'SYSTEM CONFIGURATION',
    title: 'Settings',
    description: 'Configure general, referral, pricing, fee-share, wallet, payout, payment, patient, program, notification, and legal settings.',
    icon: ShieldCheck,
    primaryAction: 'Save settings',
    secondaryAction: 'View versions',
    searchPlaceholder: 'Search setting, rule, template, policy',
    filterLabel: 'Setting group',
    rows: [],
    kpis: [
      { label: 'Rule groups', value: 11, tone: 'bg-teal-50 text-teal-700' },
      { label: 'Versioned configs', value: 28, tone: 'bg-violet-50 text-violet-700' },
      { label: 'Need review', value: 3, tone: 'bg-amber-50 text-amber-700' },
      { label: 'Audit protected', value: 'Yes', tone: 'bg-emerald-50 text-emerald-700' },
    ],
    panelTitle: 'Settings Safety',
    panelItems: ['Version money and clinical rules', 'Require reason for sensitive changes', 'Keep old rules for historical orders', 'Audit every settings update'],
  },
  'fraud-risk': {
    eyebrow: 'INTELLIGENCE',
    title: 'Fraud & Risk',
    description: 'Monitor suspicious referrals, duplicate patients, unusual refunds, payout restrictions, and payment anomalies.',
    icon: AlertTriangle,
    primaryAction: 'Review flags',
    secondaryAction: 'Export flags',
    searchPlaceholder: 'Search flag, doctor, patient, device, payment',
    filterLabel: 'Flag status',
    rows: [],
    kpis: [
      { label: 'Open flags', value: 14, tone: 'bg-amber-50 text-amber-700' },
      { label: 'Blocking flags', value: 3, tone: 'bg-rose-50 text-rose-700' },
      { label: 'Payout holds', value: 5, tone: 'bg-violet-50 text-violet-700' },
      { label: 'Resolved today', value: 8, tone: 'bg-emerald-50 text-emerald-700' },
    ],
    panelTitle: 'Risk Actions',
    panelItems: ['Put fee share on hold', 'Block withdrawal requests', 'Disable suspicious QR codes', 'Request additional doctor documents', 'Record every decision in audit logs'],
  },
  'audit-logs': {
    eyebrow: 'GOVERNANCE',
    title: 'Audit Logs',
    description: 'Immutable record of sensitive admin actions, pricing changes, doctor approvals, payouts, and configuration updates.',
    icon: FileSearch,
    primaryAction: 'Export audit',
    secondaryAction: 'Saved filters',
    searchPlaceholder: 'Search action, module, record ID, admin',
    filterLabel: 'Action type',
    rows: [],
    kpis: [
      { label: 'Events today', value: 128, tone: 'bg-teal-50 text-teal-700' },
      { label: 'Financial actions', value: 34, tone: 'bg-violet-50 text-violet-700' },
      { label: 'Clinical changes', value: 12, tone: 'bg-sky-50 text-sky-700' },
      { label: 'Doctor changes', value: 26, tone: 'bg-amber-50 text-amber-700' },
    ],
    panelTitle: 'Audit Rule',
    panelItems: ['Normal admin UI cannot edit logs', 'Record previous and new values', 'Require reason for financial changes', 'Store actor, IP, device, and timestamp'],
  },
};

const successStatuses = ['active', 'approved', 'published', 'successful', 'success', 'completed', 'paid', 'sent', 'delivered', 'cleared', 'resolved', 'recorded'];
const warningStatuses = ['pending', 'pending_review', 'review', 'manual review', 'requested', 'processing', 'draft', 'open', 'in_progress', 'waiting_for_user', 'created'];
const dangerStatuses = ['failed', 'rejected', 'blocked', 'suspended', 'cancelled', 'refunded', 'partially_refunded', 'critical', 'high', 'unavailable'];

const asRecord = (value: unknown): AdminApiRecord => (value && typeof value === 'object' ? value as AdminApiRecord : {});
const asArray = (payload: unknown): AdminApiRecord[] => {
  if (Array.isArray(payload)) return payload.map(asRecord);
  const record = asRecord(payload);
  if (Array.isArray(record.items)) return record.items.map(asRecord);
  if (Array.isArray(record.notifications)) return record.notifications.map(asRecord);
  return [];
};

const nested = (record: AdminApiRecord, path: string): unknown => (
  path.split('.').reduce<unknown>((current, part) => asRecord(current)[part], record)
);

const text = (value: unknown, fallback = '-'): string => {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'object') {
    const record = asRecord(value);
    return text(record.fullName ?? record.name ?? record.email ?? record.mobile ?? record.id ?? record._id, fallback);
  }
  return String(value);
};

const amount = (value: unknown): string | undefined => {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return undefined;
  return `INR ${numberValue.toLocaleString('en-IN')}`;
};

const dateText = (value: unknown): string => {
  if (!value) return '-';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return text(value);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const toneFromStatus = (status: string): Tone => {
  const normalized = status.toLowerCase();
  if (dangerStatuses.some((item) => normalized.includes(item))) return 'danger';
  if (warningStatuses.some((item) => normalized.includes(item))) return 'warning';
  if (successStatuses.some((item) => normalized.includes(item))) return 'success';
  return 'neutral';
};

const rowId = (record: AdminApiRecord, fallbackPrefix: string, index: number): string => (
  text(record.id ?? record._id ?? record.orderId ?? record.ticketId ?? record.programCode ?? record.doctorId ?? record.patientId ?? record.agentId, `${fallbackPrefix}-${index + 1}`)
);

const derivedKpis = (rows: AdminRow[]) => {
  const attention = rows.filter((row) => row.tone === 'warning' || row.tone === 'danger').length;
  const healthy = rows.filter((row) => row.tone === 'success').length;
  return [
    { label: 'Live records', value: rows.length, tone: 'bg-teal-50 text-teal-700' },
    { label: 'Healthy', value: healthy, tone: 'bg-emerald-50 text-emerald-700' },
    { label: 'Needs attention', value: attention, tone: attention ? 'bg-amber-50 text-amber-700' : 'bg-neutral-100 text-neutral-700' },
    { label: 'Data source', value: 'Live API', tone: 'bg-sky-50 text-sky-700' },
  ];
};

const emptyKpis = [
  { label: 'Live records', value: 0, tone: 'bg-teal-50 text-teal-700' },
  { label: 'Healthy', value: 0, tone: 'bg-emerald-50 text-emerald-700' },
  { label: 'Needs attention', value: 0, tone: 'bg-neutral-100 text-neutral-700' },
  { label: 'Data source', value: 'Static config', tone: 'bg-neutral-100 text-neutral-700' },
];

const apiConfigs: Partial<Record<keyof typeof operationConfigs, AdminApiConfig>> = {
  assessments: {
    endpoint: '/assessments/questions',
    mapRows: (payload) => asArray(payload).map((item, index) => {
      const status = text(item.isActive === false ? 'Inactive' : item.isRedFlag ? 'Red flag' : 'Active');
      return {
        id: rowId(item, 'ASM', index),
        primary: text(item.questionText, 'Assessment question'),
        secondary: `${text(item.questionType, 'question')} | ${text(nested(item, 'painCategory.name'), 'General')}`,
        owner: 'Clinical Admin',
        status,
        tone: item.isRedFlag ? 'danger' : toneFromStatus(status),
        metric: item.isRequired ? 'Required' : 'Optional',
        updated: dateText(item.updatedAt ?? item.createdAt),
        raw: item,
      };
    }),
  },
  'risk-reviews': {
    endpoint: '/admin/risk-reviews',
    params: { status: 'all' },
    mapRows: (payload) => asArray(payload).map((item, index) => {
      const status = text(item.status, 'pending_review');
      return {
        id: rowId(item, 'RISK', index),
        primary: text(nested(item, 'patient.fullName'), 'High-risk patient'),
        secondary: text(nested(item, 'painCategory.name'), 'Red-flag assessment'),
        owner: text(nested(item, 'reviewedBy.email'), 'Admin queue'),
        status,
        tone: toneFromStatus(status),
        metric: item.hasRedFlag ? 'Program held' : 'Review',
        updated: dateText(item.updatedAt ?? item.createdAt),
        raw: item,
      };
    }),
  },
  'pain-categories': {
    endpoint: '/assessments/categories',
    mapRows: (payload) => asArray(payload).map((item, index) => {
      const status = item.isActive === false ? 'Inactive' : 'Active';
      return {
        id: rowId(item, 'PAIN', index),
        primary: text(item.name, 'Pain category'),
        secondary: text(item.description, 'Patient-facing pain category'),
        owner: 'Clinical Admin',
        status,
        tone: toneFromStatus(status),
        metric: text(item.displayOrder !== undefined ? `Order ${item.displayOrder}` : 'Mapped category'),
        updated: dateText(item.updatedAt ?? item.createdAt),
        raw: item,
      };
    }),
  },
  programs: {
    endpoint: '/programs',
    mapRows: (payload) => asArray(payload).map((item, index) => {
      const status = item.isActive === false ? 'Inactive' : 'Published';
      return {
        id: rowId(item, 'PRG', index),
        primary: text(item.name, 'Rehabilitation program'),
        secondary: `${text(item.programCode, 'No code')} | ${text(item.durationDays, '0')} days | ${text(nested(item, 'painCategory.name'), 'Unmapped category')}`,
        owner: 'Clinical Admin',
        status,
        tone: toneFromStatus(status),
        metric: `${text(item.sessionsPerDay, '1')} session/day`,
        amount: amount(item.defaultPrice),
        updated: dateText(item.updatedAt ?? item.createdAt),
        raw: item,
      };
    }),
  },
  exercises: {
    endpoint: '/exercises',
    mapRows: (payload) => asArray(payload).map((item, index) => {
      const status = item.isActive === false ? 'Inactive' : item.videoUrl || item.youtubeVideoId ? 'Active' : 'Needs video';
      return {
        id: rowId(item, 'EX', index),
        primary: text(item.name, 'Exercise'),
        secondary: `${text(nested(item, 'painCategory.name'), 'General')} | ${text(item.language, 'en')} | ${text(item.equipment, 'No equipment')}`,
        owner: 'Clinical Admin',
        status,
        tone: toneFromStatus(status),
        metric: `${text(item.sets, '0')} sets / ${text(item.repetitions, '0')} reps`,
        updated: dateText(item.updatedAt ?? item.createdAt),
        raw: item,
      };
    }),
  },
  videos: {
    endpoint: '/exercises',
    mapRows: (payload) => asArray(payload)
      .filter((item) => item.videoUrl || item.youtubeVideoId)
      .map((item, index) => {
        const status = item.youtubeVideoId ? 'Embeddable' : 'Needs validation';
        return {
          id: rowId(item, 'VID', index),
          primary: text(item.name, 'Exercise video'),
          secondary: `YouTube ID ${text(item.youtubeVideoId, 'pending')} | ${text(item.language, 'en')}`,
          owner: text(nested(item, 'painCategory.name'), 'Video library'),
          status,
          tone: toneFromStatus(status),
          metric: text(item.duration || item.holdDuration || 'Unlisted'),
          updated: dateText(item.updatedAt ?? item.createdAt),
          raw: item,
        };
      }),
  },
  orders: {
    endpoint: '/admin/orders',
    mapRows: (payload) => asArray(payload).map((item, index) => {
      const status = text(item.status, 'created');
      return {
        id: rowId(item, 'ORD', index),
        primary: text(nested(item, 'patient.fullName'), 'Patient order'),
        secondary: text(nested(item, 'program.name'), 'Program snapshot'),
        owner: text(nested(item, 'doctor.fullName'), 'Unassigned doctor'),
        status,
        tone: toneFromStatus(status),
        metric: text(item.gatewayOrderId ?? item.paymentMethod ?? 'Order created'),
        amount: amount(item.finalAmount),
        updated: dateText(item.paidAt ?? item.updatedAt ?? item.createdAt),
        raw: item,
      };
    }),
  },
  refunds: {
    endpoint: '/refunds',
    mapRows: (payload) => asArray(payload).map((item, index) => {
      const status = text(item.status, 'requested');
      return {
        id: rowId(item, 'REF', index),
        primary: text(nested(item, 'patient.fullName'), 'Refund patient'),
        secondary: text(item.reason ?? item.refundType, 'Refund request'),
        owner: text(nested(item, 'doctor.fullName'), 'Finance Admin'),
        status,
        tone: toneFromStatus(status),
        metric: `Fee reversal ${amount(item.feeShareReversal) ?? 'pending'}`,
        amount: amount(item.refundAmount),
        updated: dateText(item.processedAt ?? item.updatedAt ?? item.createdAt),
        raw: item,
      };
    }),
  },
  'fee-shares': {
    endpoint: '/admin/fee-shares',
    mapRows: (payload) => asArray(payload).map((item, index) => {
      const status = text(item.status, 'pending');
      return {
        id: rowId(item, 'FS', index),
        primary: text(nested(item, 'doctor.fullName'), 'Doctor fee share'),
        secondary: text(nested(item, 'patient.fullName'), 'Referred patient'),
        owner: text(nested(item, 'payment.invoiceNumber'), 'Payment'),
        status,
        tone: toneFromStatus(status),
        metric: `Available ${dateText(item.availableDate)}`,
        amount: amount(item.amount),
        updated: dateText(item.updatedAt ?? item.createdAt),
        raw: item,
      };
    }),
  },
  wallets: {
    endpoint: '/admin/wallets',
    mapRows: (payload) => asArray(payload).map((item, index) => {
      const status = text(nested(item, 'doctor.status'), 'active');
      return {
        id: rowId(item, 'WAL', index),
        primary: text(nested(item, 'doctor.fullName'), 'Doctor wallet'),
        secondary: text(nested(item, 'doctor.clinicName'), 'Clinic wallet'),
        owner: text(nested(item, 'doctor.doctorId'), 'Doctor'),
        status,
        tone: toneFromStatus(status),
        metric: `Pending ${amount(item.pendingBalance) ?? 'INR 0'}`,
        amount: amount(item.availableBalance),
        updated: dateText(item.updatedAt ?? item.createdAt),
        raw: item,
      };
    }),
  },
  payouts: {
    endpoint: '/admin/withdrawals',
    mapRows: (payload) => asArray(payload).map((item, index) => {
      const status = text(item.status, 'requested');
      return {
        id: rowId(item, 'WD', index),
        primary: text(nested(item, 'doctor.fullName'), 'Withdrawal request'),
        secondary: text(nested(item, 'doctor.clinicName'), 'Doctor payout'),
        owner: text(item.transactionReference, 'Finance Admin'),
        status,
        tone: toneFromStatus(status),
        metric: text(item.rejectionReason ?? item.failureReason ?? 'Payout cycle'),
        amount: amount(item.requestedAmount),
        updated: dateText(item.paidAt ?? item.updatedAt ?? item.createdAt),
        raw: item,
      };
    }),
  },
  notifications: {
    endpoint: '/notifications',
    params: { all: 'true' },
    mapRows: (payload) => asArray(payload).map((item, index) => {
      const status = text(item.status, item.isRead ? 'read' : 'created');
      return {
        id: rowId(item, 'NTF', index),
        primary: text(item.title, 'Notification'),
        secondary: text(item.message, 'Notification message'),
        owner: `${text(item.recipientType, 'recipient')} | ${text(item.channel, 'in_app')}`,
        status,
        tone: toneFromStatus(status),
        metric: `Retries ${text(item.retryCount, '0')}`,
        updated: dateText(item.sentAt ?? item.updatedAt ?? item.createdAt),
        raw: item,
      };
    }),
  },
  support: {
    endpoint: '/support',
    mapRows: (payload) => asArray(payload).map((item, index) => {
      const status = text(item.status, 'open');
      return {
        id: rowId(item, 'TKT', index),
        primary: text(item.subject, 'Support ticket'),
        secondary: `${text(item.category, 'general')} | ${text(item.userType, 'user')}`,
        owner: text(nested(item, 'patient.fullName') ?? nested(item, 'doctor.fullName') ?? nested(item, 'agent.fullName'), 'Requester'),
        status,
        tone: toneFromStatus(status),
        metric: text(item.priority, 'medium'),
        updated: dateText(item.lastResponseAt ?? item.updatedAt ?? item.createdAt),
        raw: item,
      };
    }),
  },
  settings: {
    endpoint: '/settings',
    mapRows: (payload) => Object.entries(asRecord(payload)).map(([key, value], index) => {
      const status = value === undefined || value === null || value === '' ? 'Review' : 'Active';
      return {
        id: `SET-${index + 1}`,
        primary: key.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase()),
        secondary: typeof value === 'object' ? 'Structured configuration' : text(value),
        owner: 'Admin',
        status,
        tone: toneFromStatus(status),
        metric: 'Versioned setting',
        updated: 'Live',
      };
    }),
  },
  'fraud-risk': {
    endpoint: '/admin/fraud-cases',
    mapRows: (payload) => asArray(payload).map((item, index) => {
      const status = text(item.status, 'open');
      return {
        id: rowId(item, 'FRD', index),
        primary: text(item.summary, 'Fraud risk case'),
        secondary: text(item.rule, 'Risk rule'),
        owner: text(nested(item, 'doctor.fullName') ?? nested(item, 'patient.fullName'), 'Risk engine'),
        status,
        tone: toneFromStatus(text(item.severity, status)),
        metric: text(item.severity, 'medium'),
        updated: dateText(item.reviewedAt ?? item.updatedAt ?? item.createdAt),
        raw: item,
      };
    }),
  },
  'audit-logs': {
    endpoint: '/admin/audit-logs',
    mapRows: (payload) => asArray(payload).map((item, index) => {
      const status = 'Recorded';
      return {
        id: rowId(item, 'AUD', index),
        primary: text(item.action, 'Audit event'),
        secondary: `${text(item.module, 'Module')} | ${text(item.recordId, 'Record')}`,
        owner: text(nested(item, 'performedBy.email') ?? nested(item, 'performedBy.mobile') ?? item.userRole, 'System'),
        status,
        tone: toneFromStatus(status),
        metric: text(item.reason ?? item.method ?? 'Audit protected'),
        updated: dateText(item.createdAt),
        raw: item,
      };
    }),
  },
};

function AdminOperationPage({ configKey }: { configKey: keyof typeof operationConfigs }) {
  const config = operationConfigs[configKey];
  const apiConfig = apiConfigs[configKey];
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [selectedRow, setSelectedRow] = useState<AdminRow | null>(null);

  const liveRowsQuery = useQuery({
    queryKey: ['admin-operation', configKey, apiConfig?.endpoint, apiConfig?.params],
    enabled: Boolean(apiConfig),
    queryFn: async () => {
      const response = await apiClient.get(apiConfig?.endpoint ?? '', {
        params: { limit: 50, ...apiConfig?.params },
      });
      return apiConfig?.mapRows(response.data) ?? [];
    },
  });

  const rows = useMemo(() => (apiConfig ? liveRowsQuery.data ?? [] : []), [apiConfig, liveRowsQuery.data]);
  const isLoading = Boolean(apiConfig && liveRowsQuery.isLoading);
  const isError = Boolean(apiConfig && liveRowsQuery.isError);
  const kpis = apiConfig ? derivedKpis(rows) : emptyKpis;

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesQuery =
        !query ||
        [row.id, row.primary, row.secondary, row.owner, row.status, row.metric, row.amount ?? ''].some((value) =>
          value.toLowerCase().includes(query)
        );
      const matchesFilter = filter === 'all' || row.status === filter;
      return matchesQuery && matchesFilter;
    });
  }, [filter, rows, search]);

  const statuses = Array.from(new Set(rows.map((row) => row.status)));
  const Icon = config.icon;

  if (configKey === 'reports') {
    return <AdminReportsWorkspace config={config} />;
  }

  if (configKey === 'settings') {
    return <AdminSettingsWorkspace config={config} />;
  }

  const columns: DataTableColumn<AdminRow>[] = [
    {
      key: 'record',
      header: 'Record',
      render: (row) => (
        <div className="min-w-0">
          <div className="font-semibold text-neutral-900">{row.primary}</div>
          <div className="text-xs text-neutral-500">{row.id}</div>
          <div className="text-xs text-neutral-500">{row.secondary}</div>
        </div>
      ),
    },
    { key: 'owner', header: 'Owner', render: (row) => <span className="text-sm text-neutral-700">{row.owner}</span> },
    { key: 'status', header: 'Status', render: (row) => <StatusPill tone={row.tone} label={row.status} /> },
    { key: 'metric', header: 'Metric', render: (row) => <span className="text-sm font-semibold text-neutral-900">{row.metric}</span> },
    { key: 'amount', header: 'Amount', render: (row) => <span className="text-sm text-neutral-700">{row.amount ?? '-'}</span> },
    { key: 'updated', header: 'Updated', render: (row) => <span className="text-sm text-neutral-600">{row.updated}</span> },
  ];

  const healthyCount = filteredRows.filter((r) => r.tone === 'success').length;
  const attentionCount = filteredRows.filter((r) => r.tone === 'warning' || r.tone === 'danger').length;

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

        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveAction(config.secondaryAction)}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
          >
            <Download className="h-4 w-4" />
            {config.secondaryAction}
          </button>
          <button
            type="button"
            onClick={() => setActiveAction(config.primaryAction)}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
          >
            <ArrowRight className="h-4 w-4" />
            {config.primaryAction}
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="card p-4">
            <div className={cn('mb-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold', kpi.tone)}>
              {kpi.label}
            </div>
            <div className="text-2xl font-bold text-neutral-900">{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Main content + side panel */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <section className="card overflow-hidden min-w-0">
          {/* Toolbar */}
          <div className="flex flex-col gap-3 border-b border-neutral-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 flex-wrap items-center gap-2">
              <div className="min-w-[200px] flex-1">
                <SearchInput value={search} onChange={setSearch} placeholder={config.searchPlaceholder} />
              </div>
              <button
                onClick={() => setFilter('all')}
                className={cn('rounded-full px-3 py-1.5 text-xs font-semibold transition-colors', filter === 'all' ? 'bg-primary-600 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200')}
              >
                All
              </button>
              {statuses.map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={cn('rounded-full px-3 py-1.5 text-xs font-semibold transition-colors', filter === status ? 'bg-primary-600 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200')}
                >
                  {status}
                </button>
              ))}
            </div>
            <div className="flex shrink-0 items-center gap-2 text-xs text-neutral-400">
              <span className="font-semibold">{filteredRows.length} record{filteredRows.length !== 1 ? 's' : ''}</span>
              {apiConfig && (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Live API</span>
              )}
            </div>
          </div>

          <div className="p-5">
            {isError ? (
              <ErrorState
                title={`${config.title} could not load`}
                message="Check admin login, backend availability, and API permissions."
                onRetry={() => liveRowsQuery.refetch()}
              />
            ) : (
              <DataTable
                columns={columns}
                data={filteredRows}
                loading={isLoading}
                emptyMessage={`No ${config.title.toLowerCase()} match the current filters.`}
                onRowClick={setSelectedRow}
              />
            )}
          </div>
        </section>

        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          {/* Stats mini-card */}
          <div className="card p-4">
            <div className="text-xs font-bold uppercase tracking-wide text-neutral-400">Quick stats</div>
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-500">Healthy</span>
                <span className="font-bold text-emerald-700">{healthyCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-500">Needs attention</span>
                <span className={cn('font-bold', attentionCount ? 'text-amber-700' : 'text-neutral-400')}>{attentionCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-500">Total shown</span>
                <span className="font-bold text-neutral-900">{filteredRows.length}</span>
              </div>
            </div>
          </div>

          {/* Guardrails panel */}
          <div className="card p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-neutral-900">{config.panelTitle}</h2>
                <p className="text-xs text-neutral-500">Operational guardrails</p>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {config.panelItems.map((item) => (
                <div key={item} className="flex items-start gap-2 text-sm text-neutral-700">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary-500" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      <Modal isOpen={!!activeAction} onClose={() => setActiveAction(null)} title={activeAction ?? undefined} size="lg">
        <AdminActionForm
          configKey={configKey}
          moduleTitle={config.title}
          action={activeAction ?? ''}
          onClose={() => setActiveAction(null)}
        />
      </Modal>

      <Modal isOpen={!!selectedRow} onClose={() => setSelectedRow(null)} title={selectedRow?.primary} size="xl">
        {selectedRow && <AdminRowPreview row={selectedRow} moduleTitle={config.title} onClose={() => setSelectedRow(null)} />}
      </Modal>
    </div>
  );
}

type ReportType = 'financial' | 'patients' | 'programs' | 'doctor' | 'agent';

const reportOptions: { value: ReportType; label: string; description: string; endpoint: string }[] = [
  { value: 'financial', label: 'Financial', description: 'Revenue, discounts, tax, gateway charges, fee share, refunds.', endpoint: '/reports/financial' },
  { value: 'patients', label: 'Patients', description: 'Registrations, paid and unpaid patients, active and completed programs.', endpoint: '/reports/patients' },
  { value: 'programs', label: 'Programs', description: 'Program purchases and revenue grouped by rehabilitation program.', endpoint: '/reports/programs' },
  { value: 'doctor', label: 'Doctor', description: 'Doctor revenue, scans, registrations, conversions, and payments.', endpoint: '/reports/doctor' },
  { value: 'agent', label: 'Agent', description: 'Agent onboarding, doctor approvals, generated patients, visits, and revenue.', endpoint: '/reports/agent' },
];

const settingsSections = [
  { id: 'commercial', label: 'Commercial', description: 'Pricing, doctor fee share, tax, and invoice defaults.' },
  { id: 'wallet', label: 'Wallet & Payouts', description: 'Withdrawal windows, payout cadence, limits, and holding period.' },
  { id: 'access', label: 'Patient Access', description: 'Referral validity, program access, pause rules, refunds, and OTP limits.' },
  { id: 'support', label: 'Support', description: 'Support phone, email, WhatsApp, and login security limits.' },
  { id: 'legal', label: 'Legal', description: 'Consent version, terms, privacy policy, and medical disclaimer.' },
] as const;

type SettingsSectionId = typeof settingsSections[number]['id'];

// Builds the same settings DTO used by the backend singleton settings endpoint.
function buildSettingsPayload(formData: FormData) {
  const payload = Object.fromEntries(formData.entries());
  return {
    globalProgramFee: Number(payload.globalProgramFee || 0),
    minDoctorPrice: Number(payload.minDoctorPrice || 0),
    maxDoctorPrice: Number(payload.maxDoctorPrice || 0),
    defaultFeeSharePercentage: Number(payload.defaultFeeSharePercentage || 0),
    feeShareCalculationBasis: text(payload.feeShareCalculationBasis, 'gross'),
    feeShareHoldingDays: Number(payload.feeShareHoldingDays || 15),
    minWithdrawal: Number(payload.minWithdrawal || 1000),
    maxWithdrawal: Number(payload.maxWithdrawal || 50000),
    withdrawalRequestStartDay: Number(payload.withdrawalRequestStartDay || 1),
    withdrawalRequestEndDay: Number(payload.withdrawalRequestEndDay || 5),
    payoutCycle: text(payload.payoutCycle, 'monthly'),
    referralValidityDays: Number(payload.referralValidityDays || 30),
    programAccessDuration: Number(payload.programAccessDuration || 0),
    maxPausesAllowed: Number(payload.maxPausesAllowed || 2),
    maxPauseDurationDays: Number(payload.maxPauseDurationDays || 7),
    extendExpiryOnPause: payload.extendExpiryOnPause === 'on',
    refundPeriodDays: Number(payload.refundPeriodDays || 2),
    otpExpiryMinutes: Number(payload.otpExpiryMinutes || 10),
    maxOtpAttempts: Number(payload.maxOtpAttempts || 5),
    maxLoginAttempts: Number(payload.maxLoginAttempts || 5),
    currency: text(payload.currency, 'INR'),
    taxPercentage: Number(payload.taxPercentage || 0),
    invoicePrefix: text(payload.invoicePrefix, 'RC'),
    supportPhone: text(payload.supportPhone, undefined),
    supportEmail: text(payload.supportEmail, undefined),
    supportWhatsApp: text(payload.supportWhatsApp, undefined),
    termsAndConditions: text(payload.termsAndConditions, undefined),
    privacyPolicy: text(payload.privacyPolicy, undefined),
    medicalDisclaimer: text(payload.medicalDisclaimer, undefined),
    consentVersion: text(payload.consentVersion, 'v1.0'),
  };
}

function AdminWorkspaceHeading({ config }: { config: AdminOperationConfig }) {
  const Icon = config.icon;
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-[11px] font-extrabold tracking-[0.08em] text-teal-700">
          <Icon className="h-3.5 w-3.5" />
          {config.eyebrow}
        </div>
        <h1 className="mt-3 text-2xl font-bold text-neutral-900 sm:text-3xl">{config.title}</h1>
        <p className="mt-1 max-w-3xl text-sm text-neutral-500">{config.description}</p>
      </div>
    </div>
  );
}

function AdminReportsWorkspace({ config }: { config: AdminOperationConfig }) {
  const [result, setResult] = useState<unknown>(null);
  const [reportType, setReportType] = useState<ReportType>('financial');
  const [lastReportLabel, setLastReportLabel] = useState('Financial');

  const reportMutation = useMutation({
    mutationFn: async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      const type = text(formData.get('reportType'), 'financial') as ReportType;
      const selected = reportOptions.find((item) => item.value === type) ?? reportOptions[0];
      const subjectId = text(formData.get('subjectId'), '').trim();
      const params = {
        startDate: text(formData.get('startDate'), undefined),
        endDate: text(formData.get('endDate'), undefined),
      };

      if ((type === 'doctor' || type === 'agent') && !subjectId) {
        throw new Error(`${selected.label} report requires a ${type} ObjectId.`);
      }

      setReportType(type);
      setLastReportLabel(selected.label);
      const endpoint = type === 'doctor' || type === 'agent' ? `${selected.endpoint}/${subjectId}` : selected.endpoint;
      return apiClient.get(endpoint, { params });
    },
    onSuccess: (response) => setResult(response.data),
  });

  const rows = reportRows(result);
  const metrics = reportMetrics(result, rows);
  const selectedReport = reportOptions.find((item) => item.value === reportType) ?? reportOptions[0];

  return (
    <div className="space-y-6">
      <AdminWorkspaceHeading config={config} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {config.kpis.map((kpi) => (
          <div key={kpi.label} className="card p-4">
            <div className={cn('mb-3 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold', kpi.tone)}>
              {kpi.label}
            </div>
            <div className="text-2xl font-bold text-neutral-900">{kpi.value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="card min-w-0 p-5">
          <form className="space-y-5" onSubmit={(event) => reportMutation.mutate(event)}>
            <div className="flex flex-col gap-3 border-b border-neutral-100 pb-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-base font-bold text-neutral-900">Report Builder</h2>
                <p className="mt-1 text-sm text-neutral-500">{selectedReport.description}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!rows.length}
                  onClick={() => downloadCsv(`${lastReportLabel.toLowerCase()}-report.csv`, rows)}
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </button>
                <button
                  type="submit"
                  disabled={reportMutation.isPending}
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary-600 px-3 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <Filter className="h-4 w-4" />
                  {reportMutation.isPending ? 'Generating...' : 'Apply filters'}
                </button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="block">
                <span className="text-sm font-semibold text-neutral-700">Report type</span>
                <select
                  name="reportType"
                  value={reportType}
                  onChange={(event) => setReportType(event.target.value as ReportType)}
                  className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-primary-500"
                >
                  {reportOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-neutral-700">Start date</span>
                <input name="startDate" type="date" className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-primary-500" />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-neutral-700">End date</span>
                <input name="endDate" type="date" className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-primary-500" />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-neutral-700">{reportType === 'agent' ? 'Agent ObjectId' : 'Doctor ObjectId'}</span>
                <input
                  name="subjectId"
                  disabled={reportType !== 'doctor' && reportType !== 'agent'}
                  className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-primary-500 disabled:bg-neutral-50 disabled:text-neutral-400"
                  placeholder={reportType === 'doctor' || reportType === 'agent' ? 'Paste ObjectId' : 'Not required'}
                />
              </label>
            </div>

            {reportMutation.error && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">
                {text(asRecord(asRecord(asRecord(reportMutation.error).response).data).message, text(asRecord(reportMutation.error).message, 'Unable to generate report.'))}
              </div>
            )}
          </form>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => (
              <div key={metric.label} className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                <div className="text-xs font-bold uppercase tracking-wide text-neutral-400">{metric.label}</div>
                <div className="mt-1 text-xl font-bold text-neutral-900">{metric.value}</div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-neutral-200">
                  <div className="h-full rounded-full bg-primary-600" style={{ width: `${metric.width}%` }} />
                </div>
              </div>
            ))}
          </div>

          <ReportResultTable rows={rows} result={result} />
        </section>

        <aside className="card p-5 xl:sticky xl:top-24 xl:self-start">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-neutral-900">{config.panelTitle}</h2>
              <p className="text-xs text-neutral-500">Export governance</p>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {config.panelItems.map((item) => (
              <div key={item} className="flex items-start gap-2 text-sm text-neutral-700">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary-500" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

function AdminSettingsWorkspace({ config }: { config: AdminOperationConfig }) {
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState<SettingsSectionId>('commercial');
  const [formError, setFormError] = useState<string | null>(null);

  const settingsQuery = useQuery({
    queryKey: ['admin-settings-workspace'],
    queryFn: async () => (await apiClient.get('/settings')).data,
  });

  const settingsMutation = useMutation({
    mutationFn: async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setFormError(null);
      return apiClient.put('/settings', buildSettingsPayload(new FormData(event.currentTarget)));
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-settings-workspace'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-operation', 'settings'] });
    },
    onError: (error) => {
      const message = asRecord(asRecord(error).response).data;
      setFormError(text(asRecord(message).message, text(asRecord(error).message, 'Unable to save settings.')));
    },
  });

  const settings = asRecord(settingsQuery.data);
  const active = settingsSections.find((section) => section.id === activeSection) ?? settingsSections[0];

  return (
    <div className="space-y-6">
      <AdminWorkspaceHeading config={config} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Currency', value: text(settings.currency, 'INR'), tone: 'bg-teal-50 text-teal-700' },
          { label: 'Fee share basis', value: text(settings.feeShareCalculationBasis, 'gross'), tone: 'bg-sky-50 text-sky-700' },
          { label: 'Holding days', value: text(settings.feeShareHoldingDays, '15'), tone: 'bg-amber-50 text-amber-700' },
          { label: 'Consent', value: text(settings.consentVersion, 'v1.0'), tone: 'bg-emerald-50 text-emerald-700' },
        ].map((kpi) => (
          <div key={kpi.label} className="card p-4">
            <div className={cn('mb-3 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold', kpi.tone)}>{kpi.label}</div>
            <div className="truncate text-2xl font-bold text-neutral-900">{kpi.value}</div>
          </div>
        ))}
      </div>

      {settingsQuery.isError ? (
        <ErrorState
          title="Settings could not load"
          message="Check admin login, backend availability, and settings permissions."
          onRetry={() => settingsQuery.refetch()}
        />
      ) : (
        <form
          key={text(settings._id ?? settings.updatedAt, 'settings-form')}
          className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]"
          onSubmit={(event) => settingsMutation.mutate(event)}
        >
          <aside className="card p-3 xl:sticky xl:top-24 xl:self-start">
            <div className="px-2 py-2">
              <div className="text-sm font-bold text-neutral-900">Settings Groups</div>
              <p className="mt-1 text-xs text-neutral-500">SRS-aligned platform controls</p>
            </div>
            <div className="mt-2 space-y-1">
              {settingsSections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    'w-full rounded-lg px-3 py-3 text-left transition-colors',
                    activeSection === section.id ? 'bg-primary-600 text-white' : 'text-neutral-700 hover:bg-neutral-50'
                  )}
                >
                  <div className="text-sm font-bold">{section.label}</div>
                  <div className={cn('mt-0.5 text-xs', activeSection === section.id ? 'text-primary-50' : 'text-neutral-500')}>
                    {section.description}
                  </div>
                </button>
              ))}
            </div>
          </aside>

          <section className="card min-w-0 p-5">
            <div className="flex flex-col gap-3 border-b border-neutral-100 pb-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-base font-bold text-neutral-900">{active.label}</h2>
                <p className="mt-1 text-sm text-neutral-500">{active.description}</p>
              </div>
              <button
                type="submit"
                disabled={settingsMutation.isPending || settingsQuery.isLoading}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {settingsMutation.isPending ? 'Saving...' : 'Save settings'}
              </button>
            </div>

            {settingsQuery.isLoading && <div className="mt-5 rounded-lg bg-neutral-50 p-4 text-sm text-neutral-500">Loading current settings...</div>}
            {formError && <div className="mt-5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{formError}</div>}
            {settingsMutation.isSuccess && (
              <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
                Settings saved. Changes are ready for backend audit review.
              </div>
            )}

            <div className="mt-5">
              <SettingsHiddenFields settings={settings} />
              <SettingsFields section={activeSection} settings={settings} />
            </div>
          </section>
        </form>
      )}
    </div>
  );
}

function AdminActionForm({
  configKey,
  moduleTitle,
  action,
  onClose,
}: {
  configKey: keyof typeof operationConfigs;
  moduleTitle: string;
  action: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setFormError(null);
      const formData = new FormData(event.currentTarget);
      const payload = Object.fromEntries(formData.entries());

      if (configKey === 'programs') {
        return apiClient.post('/programs', {
          name: text(payload.name),
          programCode: text(payload.programCode, undefined),
          durationDays: Number(payload.durationDays || 1),
          sessionsPerDay: Number(payload.sessionsPerDay || 1),
          difficultyLevel: text(payload.difficultyLevel, undefined),
          defaultPrice: Number(payload.defaultPrice || 0),
        });
      }

      if (configKey === 'exercises' || configKey === 'videos') {
        return apiClient.post('/exercises', {
          name: text(payload.name),
          description: text(payload.description, undefined),
          videoUrl: text(payload.videoUrl, undefined),
          sets: Number(payload.sets || 0),
          repetitions: Number(payload.repetitions || 0),
          language: text(payload.language, 'en'),
        });
      }

      if (configKey === 'assessments') {
        return apiClient.post('/assessments/questions', {
          questionText: text(payload.questionText),
          questionType: text(payload.questionType, 'yes_no'),
          painCategory: text(payload.painCategory, undefined),
          displayOrder: Number(payload.displayOrder || 0),
          isRequired: payload.isRequired === 'on',
          isRedFlag: payload.isRedFlag === 'on',
          redFlagSafetyMessage: text(payload.redFlagSafetyMessage, undefined),
          options: text(payload.options, '')
            .split('\n')
            .map((item) => item.trim())
            .filter(Boolean)
            .map((label, index) => ({ label, value: label.toLowerCase().replace(/\s+/g, '_'), displayOrder: index + 1 })),
        });
      }

      if (configKey === 'pain-categories') {
        return apiClient.post('/assessments/categories', {
          name: text(payload.name),
          nameHindi: text(payload.nameHindi, undefined),
          description: text(payload.description, undefined),
          displayOrder: Number(payload.displayOrder || 0),
          isActive: payload.isActive !== 'off',
        });
      }

      if (configKey === 'settings') {
        return apiClient.put('/settings', buildSettingsPayload(formData));
      }

      throw new Error(`${moduleTitle} creation form is not connected yet.`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-operation', configKey] });
      onClose();
    },
    onError: (error) => {
      const message = asRecord(asRecord(error).response).data;
      setFormError(text(asRecord(message).message, text(asRecord(error).message, 'Unable to save this record.')));
    },
  });

  const settingsQuery = useQuery({
    queryKey: ['admin-settings-form'],
    enabled: configKey === 'settings',
    queryFn: async () => (await apiClient.get('/settings')).data,
  });

  if (configKey === 'programs') {
    return (
      <form className="space-y-5" onSubmit={(event) => createMutation.mutate(event)}>
        <div className="rounded-lg border border-teal-200 bg-teal-50 p-4 text-sm text-teal-900">
          Create a backend-backed rehabilitation program. Program day and exercise linking can be managed after the program exists.
        </div>
        {formError && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{formError}</div>}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-sm font-semibold text-neutral-700">Program name</span>
            <input name="name" required minLength={2} className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-primary-500" placeholder="Knee Strengthening Beginner" />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-neutral-700">Program code</span>
            <input name="programCode" className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-primary-500" placeholder="PRG-KNEE-01" />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-neutral-700">Difficulty</span>
            <select name="difficultyLevel" className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-primary-500">
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
              <option value="senior_friendly">Senior-friendly</option>
              <option value="post_operative">Post-operative</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-neutral-700">Duration days</span>
            <input name="durationDays" type="number" min={1} max={365} defaultValue={14} required className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-primary-500" />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-neutral-700">Sessions per day</span>
            <input name="sessionsPerDay" type="number" min={1} max={10} defaultValue={1} className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-primary-500" />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-neutral-700">Default price</span>
            <input name="defaultPrice" type="number" min={0} defaultValue={0} className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-primary-500" />
          </label>
        </div>
        <AdminFormActions isSaving={createMutation.isPending} onClose={onClose} submitLabel="Create program" />
      </form>
    );
  }

  if (configKey === 'exercises' || configKey === 'videos') {
    return (
      <form className="space-y-5" onSubmit={(event) => createMutation.mutate(event)}>
        <div className="rounded-lg border border-teal-200 bg-teal-50 p-4 text-sm text-teal-900">
          Add an exercise record with an optional YouTube unlisted video URL. The backend validates and stores the YouTube video ID.
        </div>
        {formError && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{formError}</div>}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-sm font-semibold text-neutral-700">Exercise title</span>
            <input name="name" required minLength={2} className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-primary-500" placeholder="Quadriceps Isometric Hold" />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm font-semibold text-neutral-700">YouTube unlisted URL</span>
            <input name="videoUrl" type="url" className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-primary-500" placeholder="https://youtu.be/abcdefghijk" />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-neutral-700">Sets</span>
            <input name="sets" type="number" min={0} max={100} defaultValue={3} className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-primary-500" />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-neutral-700">Repetitions</span>
            <input name="repetitions" type="number" min={0} max={1000} defaultValue={10} className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-primary-500" />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-neutral-700">Language</span>
            <select name="language" className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-primary-500">
              <option value="en">English</option>
              <option value="hi">Hindi</option>
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm font-semibold text-neutral-700">Instructions</span>
            <textarea name="description" className="mt-2 min-h-24 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-primary-500" placeholder="Clinical instructions, precautions, and common mistakes" />
          </label>
        </div>
        <AdminFormActions isSaving={createMutation.isPending} onClose={onClose} submitLabel="Save exercise/video" />
      </form>
    );
  }

  if (configKey === 'assessments') {
    return (
      <form className="space-y-5" onSubmit={(event) => createMutation.mutate(event)}>
        <div className="rounded-lg border border-teal-200 bg-teal-50 p-4 text-sm text-teal-900">
          Create a backend-backed assessment question. Marking a question as red flag allows assessment answers to route into manual safety review.
        </div>
        {formError && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{formError}</div>}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-sm font-semibold text-neutral-700">Question text</span>
            <input name="questionText" required minLength={3} className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-primary-500" placeholder="Do you have unexplained swelling?" />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-neutral-700">Question type</span>
            <select name="questionType" className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-primary-500">
              <option value="yes_no">Yes / No</option>
              <option value="single_choice">Single choice</option>
              <option value="multiple_choice">Multiple choice</option>
              <option value="pain_scale">Pain scale</option>
              <option value="number">Number</option>
              <option value="text">Text</option>
              <option value="date">Date</option>
              <option value="image">Image</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-neutral-700">Pain category ObjectId</span>
            <input name="painCategory" className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-primary-500" placeholder="Optional Mongo ObjectId" />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-neutral-700">Display order</span>
            <input name="displayOrder" type="number" min={0} defaultValue={0} className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-primary-500" />
          </label>
          <div className="flex flex-col justify-end gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
            <label className="flex items-center gap-3 text-sm font-semibold text-neutral-700">
              <input name="isRequired" type="checkbox" className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500" defaultChecked />
              Required question
            </label>
            <label className="flex items-center gap-3 text-sm font-semibold text-rose-700">
              <input name="isRedFlag" type="checkbox" className="h-4 w-4 rounded border-neutral-300 text-rose-600 focus:ring-rose-500" />
              Red-flag answer
            </label>
          </div>
          <label className="block sm:col-span-2">
            <span className="text-sm font-semibold text-neutral-700">Options</span>
            <textarea name="options" className="mt-2 min-h-24 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-primary-500" placeholder="One option per line" />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm font-semibold text-neutral-700">Red-flag message</span>
            <textarea name="redFlagMessage" className="mt-2 min-h-20 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-primary-500" placeholder="Safety message shown when this answer blocks auto activation" />
          </label>
        </div>
        <AdminFormActions isSaving={createMutation.isPending} onClose={onClose} submitLabel="Create question" />
      </form>
    );
  }

  if (configKey === 'pain-categories') {
    return (
      <form className="space-y-5" onSubmit={(event) => createMutation.mutate(event)}>
        <div className="rounded-lg border border-teal-200 bg-teal-50 p-4 text-sm text-teal-900">
          Create a patient-facing pain category. Assessment and program mappings can reference this category by ObjectId.
        </div>
        {formError && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{formError}</div>}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-semibold text-neutral-700">Category name</span>
            <input name="name" required minLength={2} className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-primary-500" placeholder="Knee Pain" />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-neutral-700">Hindi label</span>
            <input name="nameHindi" className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-primary-500" placeholder="Ghutne ka dard" />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-neutral-700">Display order</span>
            <input name="displayOrder" type="number" min={0} defaultValue={0} className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-primary-500" />
          </label>
          <label className="flex items-center gap-3 self-end rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-3 text-sm font-semibold text-neutral-700">
            <input name="isActive" type="checkbox" className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500" defaultChecked />
            Active for patients
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm font-semibold text-neutral-700">Description</span>
            <textarea name="description" className="mt-2 min-h-24 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-primary-500" placeholder="Short patient-facing category guidance" />
          </label>
        </div>
        <AdminFormActions isSaving={createMutation.isPending} onClose={onClose} submitLabel="Create category" />
      </form>
    );
  }

  if (configKey === 'settings') {
    const settings = asRecord(settingsQuery.data);
    return (
      <form className="space-y-5" onSubmit={(event) => createMutation.mutate(event)}>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Settings changes affect pricing, fee share, OTP, login limits, invoices, support contacts, and consent text. Backend audit logging is required for this operation.
        </div>
        {settingsQuery.isLoading && <div className="rounded-lg bg-neutral-50 p-4 text-sm text-neutral-500">Loading current settings...</div>}
        {formError && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{formError}</div>}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block"><span className="text-sm font-semibold text-neutral-700">Global program fee</span><input name="globalProgramFee" type="number" defaultValue={text(settings.globalProgramFee, '0')} className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-primary-500" /></label>
          <label className="block"><span className="text-sm font-semibold text-neutral-700">Minimum doctor price</span><input name="minDoctorPrice" type="number" defaultValue={text(settings.minDoctorPrice, '0')} className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-primary-500" /></label>
          <label className="block"><span className="text-sm font-semibold text-neutral-700">Maximum doctor price</span><input name="maxDoctorPrice" type="number" defaultValue={text(settings.maxDoctorPrice, '0')} className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-primary-500" /></label>
          <label className="block"><span className="text-sm font-semibold text-neutral-700">Default fee share %</span><input name="defaultFeeSharePercentage" type="number" min={0} max={100} defaultValue={text(settings.defaultFeeSharePercentage, '0')} className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-primary-500" /></label>
          <label className="block"><span className="text-sm font-semibold text-neutral-700">Fee share calculation</span><select name="feeShareCalculationBasis" defaultValue={text(settings.feeShareCalculationBasis, 'gross')} className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-primary-500"><option value="gross">Gross</option><option value="after_discount">After discount</option><option value="net_after_charges">Net after charges</option></select></label>
          <label className="block"><span className="text-sm font-semibold text-neutral-700">Holding days</span><input name="feeShareHoldingDays" type="number" defaultValue={text(settings.feeShareHoldingDays, '15')} className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-primary-500" /></label>
          <label className="block"><span className="text-sm font-semibold text-neutral-700">Minimum withdrawal</span><input name="minWithdrawal" type="number" defaultValue={text(settings.minWithdrawal, '1000')} className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-primary-500" /></label>
          <label className="block"><span className="text-sm font-semibold text-neutral-700">Maximum withdrawal</span><input name="maxWithdrawal" type="number" defaultValue={text(settings.maxWithdrawal, '50000')} className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-primary-500" /></label>
          <label className="block"><span className="text-sm font-semibold text-neutral-700">Payout cycle</span><select name="payoutCycle" defaultValue={text(settings.payoutCycle, 'monthly')} className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-primary-500"><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></label>
          <label className="block"><span className="text-sm font-semibold text-neutral-700">OTP expiry minutes</span><input name="otpExpiryMinutes" type="number" defaultValue={text(settings.otpExpiryMinutes, '10')} className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-primary-500" /></label>
          <label className="block"><span className="text-sm font-semibold text-neutral-700">Max OTP attempts</span><input name="maxOtpAttempts" type="number" defaultValue={text(settings.maxOtpAttempts, '5')} className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-primary-500" /></label>
          <label className="block"><span className="text-sm font-semibold text-neutral-700">Max login attempts</span><input name="maxLoginAttempts" type="number" defaultValue={text(settings.maxLoginAttempts, '5')} className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-primary-500" /></label>
          <label className="block"><span className="text-sm font-semibold text-neutral-700">Currency</span><input name="currency" defaultValue={text(settings.currency, 'INR')} className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-primary-500" /></label>
          <label className="block"><span className="text-sm font-semibold text-neutral-700">Tax percentage</span><input name="taxPercentage" type="number" defaultValue={text(settings.taxPercentage, '0')} className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-primary-500" /></label>
          <label className="block"><span className="text-sm font-semibold text-neutral-700">Invoice prefix</span><input name="invoicePrefix" defaultValue={text(settings.invoicePrefix, 'RC')} className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-primary-500" /></label>
          <label className="block"><span className="text-sm font-semibold text-neutral-700">Consent version</span><input name="consentVersion" defaultValue={text(settings.consentVersion, 'v1.0')} className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-primary-500" /></label>
          <label className="block"><span className="text-sm font-semibold text-neutral-700">Support phone</span><input name="supportPhone" defaultValue={text(settings.supportPhone, '')} className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-primary-500" /></label>
          <label className="block"><span className="text-sm font-semibold text-neutral-700">Support email</span><input name="supportEmail" type="email" defaultValue={text(settings.supportEmail, '')} className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-primary-500" /></label>
          <label className="block"><span className="text-sm font-semibold text-neutral-700">Support WhatsApp</span><input name="supportWhatsApp" defaultValue={text(settings.supportWhatsApp, '')} className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-primary-500" /></label>
          <label className="block sm:col-span-2"><span className="text-sm font-semibold text-neutral-700">Medical disclaimer</span><textarea name="medicalDisclaimer" defaultValue={text(settings.medicalDisclaimer, '')} className="mt-2 min-h-24 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-primary-500" /></label>
        </div>
        <AdminFormActions isSaving={createMutation.isPending} onClose={onClose} submitLabel="Save settings" />
      </form>
    );
  }

  if (configKey === 'reports') {
    return <AdminReportGenerator onClose={onClose} />;
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-teal-200 bg-teal-50 p-4 text-sm text-teal-900">
        {moduleTitle} data is API-backed where the backend endpoint exists. This action still needs a dedicated approval/edit workflow.
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-semibold text-neutral-700">Record name</span>
          <input className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-primary-500" placeholder={`${moduleTitle} record`} />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-neutral-700">Status</span>
          <select className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-primary-500">
            <option>Draft</option>
            <option>Active</option>
            <option>Review</option>
            <option>Suspended</option>
          </select>
        </label>
        <label className="block sm:col-span-2">
          <span className="text-sm font-semibold text-neutral-700">Admin note</span>
          <textarea className="mt-2 min-h-28 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-primary-500" placeholder={`Reason for ${action.toLowerCase()}`} />
        </label>
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onClose} className="rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-semibold text-neutral-700">
          Cancel
        </button>
        <button type="button" onClick={onClose} className="rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700">
          Save action
        </button>
      </div>
    </div>
  );
}

function AdminReportGenerator({ onClose }: { onClose: () => void }) {
  const [result, setResult] = useState<unknown>(null);
  const [reportType, setReportType] = useState('financial');

  const reportMutation = useMutation({
    mutationFn: async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      const type = text(formData.get('reportType'), 'financial');
      setReportType(type);
      const params = {
        startDate: text(formData.get('startDate'), undefined),
        endDate: text(formData.get('endDate'), undefined),
      };
      const endpoint = type === 'patients' ? '/reports/patients' : type === 'programs' ? '/reports/programs' : '/reports/financial';
      return apiClient.get(endpoint, { params });
    },
    onSuccess: (response) => setResult(response.data),
  });

  const rows = Array.isArray(result)
    ? result.map((item, index) => ({ id: `RPT-${index + 1}`, ...asRecord(item) }))
    : Object.entries(asRecord(result)).map(([key, value]) => ({ key, value: text(value) }));

  return (
    <div className="space-y-5">
      <form className="space-y-5" onSubmit={(event) => reportMutation.mutate(event)}>
        <div className="rounded-lg border border-teal-200 bg-teal-50 p-4 text-sm text-teal-900">
          Generate live admin reports from backend report APIs. Financial reports accept date filters; patient and program reports return current operational totals.
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="text-sm font-semibold text-neutral-700">Report type</span>
            <select name="reportType" defaultValue={reportType} className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-primary-500">
              <option value="financial">Financial</option>
              <option value="patients">Patients</option>
              <option value="programs">Programs</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-neutral-700">Start date</span>
            <input name="startDate" type="date" className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-primary-500" />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-neutral-700">End date</span>
            <input name="endDate" type="date" className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-primary-500" />
          </label>
        </div>
        {reportMutation.error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">
            {text(asRecord(asRecord(asRecord(reportMutation.error).response).data).message, text(asRecord(reportMutation.error).message, 'Unable to generate report.'))}
          </div>
        )}
        <AdminFormActions isSaving={reportMutation.isPending} onClose={onClose} submitLabel="Generate report" />
      </form>

      {result !== null && (
        <section className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="mb-3 text-sm font-bold text-neutral-900">Report result</div>
          <div className="max-h-80 overflow-auto rounded-lg border border-neutral-200">
            <table className="w-full text-left text-sm">
              <tbody className="divide-y divide-neutral-100">
                {rows.map((row, index) => (
                  <tr key={index}>
                    {Object.entries(row).map(([key, value]) => (
                      <td key={key} className="px-3 py-2 align-top">
                        <div className="text-[10px] font-bold uppercase tracking-wide text-neutral-400">{key}</div>
                        <div className="break-words text-neutral-800">{text(value)}</div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function SettingsFields({ section, settings }: { section: SettingsSectionId; settings: AdminApiRecord }) {
  if (section === 'commercial') {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField name="globalProgramFee" label="Global program fee" value={settings.globalProgramFee} fallback="0" />
        <NumberField name="minDoctorPrice" label="Minimum doctor price" value={settings.minDoctorPrice} fallback="0" />
        <NumberField name="maxDoctorPrice" label="Maximum doctor price" value={settings.maxDoctorPrice} fallback="0" />
        <NumberField name="defaultFeeSharePercentage" label="Default fee share %" value={settings.defaultFeeSharePercentage} fallback="0" min={0} max={100} />
        <SelectField
          name="feeShareCalculationBasis"
          label="Fee share calculation"
          value={settings.feeShareCalculationBasis}
          options={[
            ['gross', 'Gross payment amount'],
            ['after_discount', 'Amount after discount'],
            ['net_after_charges', 'Net after gateway charges'],
          ]}
        />
        <NumberField name="taxPercentage" label="Tax percentage" value={settings.taxPercentage} fallback="0" min={0} />
        <TextField name="currency" label="Currency" value={settings.currency} fallback="INR" />
        <TextField name="invoicePrefix" label="Invoice prefix" value={settings.invoicePrefix} fallback="RC" />
      </div>
    );
  }

  if (section === 'wallet') {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField name="feeShareHoldingDays" label="Fee share holding days" value={settings.feeShareHoldingDays} fallback="15" min={0} />
        <NumberField name="minWithdrawal" label="Minimum withdrawal" value={settings.minWithdrawal} fallback="1000" min={0} />
        <NumberField name="maxWithdrawal" label="Maximum withdrawal" value={settings.maxWithdrawal} fallback="50000" min={0} />
        <NumberField name="withdrawalRequestStartDay" label="Withdrawal start day" value={settings.withdrawalRequestStartDay} fallback="1" min={1} max={31} />
        <NumberField name="withdrawalRequestEndDay" label="Withdrawal end day" value={settings.withdrawalRequestEndDay} fallback="5" min={1} max={31} />
        <SelectField name="payoutCycle" label="Payout cycle" value={settings.payoutCycle} options={[['weekly', 'Weekly'], ['monthly', 'Monthly']]} />
      </div>
    );
  }

  if (section === 'access') {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField name="referralValidityDays" label="Referral validity days" value={settings.referralValidityDays} fallback="30" min={0} />
        <NumberField name="programAccessDuration" label="Program access duration" value={settings.programAccessDuration} fallback="0" min={0} />
        <NumberField name="maxPausesAllowed" label="Maximum pauses allowed" value={settings.maxPausesAllowed} fallback="2" min={0} />
        <NumberField name="maxPauseDurationDays" label="Maximum pause duration days" value={settings.maxPauseDurationDays} fallback="7" min={0} />
        <NumberField name="refundPeriodDays" label="Refund period days" value={settings.refundPeriodDays} fallback="2" min={0} />
        <NumberField name="otpExpiryMinutes" label="OTP expiry minutes" value={settings.otpExpiryMinutes} fallback="10" min={1} />
        <NumberField name="maxOtpAttempts" label="Max OTP attempts" value={settings.maxOtpAttempts} fallback="5" min={1} />
        <CheckboxField name="extendExpiryOnPause" label="Extend expiry when program is paused" checked={settings.extendExpiryOnPause !== false} />
      </div>
    );
  }

  if (section === 'support') {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField name="supportPhone" label="Support phone" value={settings.supportPhone} fallback="" />
        <TextField name="supportEmail" label="Support email" value={settings.supportEmail} fallback="" type="email" />
        <TextField name="supportWhatsApp" label="Support WhatsApp" value={settings.supportWhatsApp} fallback="" />
        <NumberField name="maxLoginAttempts" label="Max login attempts" value={settings.maxLoginAttempts} fallback="5" min={1} />
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TextField name="consentVersion" label="Consent version" value={settings.consentVersion} fallback="v1.0" />
      <TextAreaField name="termsAndConditions" label="Terms and conditions" value={settings.termsAndConditions} />
      <TextAreaField name="privacyPolicy" label="Privacy policy" value={settings.privacyPolicy} />
      <TextAreaField name="medicalDisclaimer" label="Medical disclaimer" value={settings.medicalDisclaimer} />
    </div>
  );
}

function SettingsHiddenFields({ settings }: { settings: AdminApiRecord }) {
  const values = {
    globalProgramFee: text(settings.globalProgramFee, '0'),
    minDoctorPrice: text(settings.minDoctorPrice, '0'),
    maxDoctorPrice: text(settings.maxDoctorPrice, '0'),
    defaultFeeSharePercentage: text(settings.defaultFeeSharePercentage, '0'),
    feeShareCalculationBasis: text(settings.feeShareCalculationBasis, 'gross'),
    feeShareHoldingDays: text(settings.feeShareHoldingDays, '15'),
    minWithdrawal: text(settings.minWithdrawal, '1000'),
    maxWithdrawal: text(settings.maxWithdrawal, '50000'),
    withdrawalRequestStartDay: text(settings.withdrawalRequestStartDay, '1'),
    withdrawalRequestEndDay: text(settings.withdrawalRequestEndDay, '5'),
    payoutCycle: text(settings.payoutCycle, 'monthly'),
    referralValidityDays: text(settings.referralValidityDays, '30'),
    programAccessDuration: text(settings.programAccessDuration, '0'),
    maxPausesAllowed: text(settings.maxPausesAllowed, '2'),
    maxPauseDurationDays: text(settings.maxPauseDurationDays, '7'),
    extendExpiryOnPause: settings.extendExpiryOnPause === false ? 'off' : 'on',
    refundPeriodDays: text(settings.refundPeriodDays, '2'),
    otpExpiryMinutes: text(settings.otpExpiryMinutes, '10'),
    maxOtpAttempts: text(settings.maxOtpAttempts, '5'),
    maxLoginAttempts: text(settings.maxLoginAttempts, '5'),
    currency: text(settings.currency, 'INR'),
    taxPercentage: text(settings.taxPercentage, '0'),
    invoicePrefix: text(settings.invoicePrefix, 'RC'),
    supportPhone: text(settings.supportPhone, ''),
    supportEmail: text(settings.supportEmail, ''),
    supportWhatsApp: text(settings.supportWhatsApp, ''),
    termsAndConditions: text(settings.termsAndConditions, ''),
    privacyPolicy: text(settings.privacyPolicy, ''),
    medicalDisclaimer: text(settings.medicalDisclaimer, ''),
    consentVersion: text(settings.consentVersion, 'v1.0'),
  };

  return (
    <div className="hidden">
      {Object.entries(values).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} readOnly />
      ))}
    </div>
  );
}

function TextField({ name, label, value, fallback, type = 'text' }: { name: string; label: string; value: unknown; fallback: string; type?: string }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-neutral-700">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={text(value, fallback)}
        className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-primary-500"
      />
    </label>
  );
}

function NumberField({ name, label, value, fallback, min, max }: { name: string; label: string; value: unknown; fallback: string; min?: number; max?: number }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-neutral-700">{label}</span>
      <input
        name={name}
        type="number"
        min={min}
        max={max}
        defaultValue={text(value, fallback)}
        className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-primary-500"
      />
    </label>
  );
}

function SelectField({ name, label, value, options }: { name: string; label: string; value: unknown; options: [string, string][] }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-neutral-700">{label}</span>
      <select
        name={name}
        defaultValue={text(value, options[0]?.[0] ?? '')}
        className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-primary-500"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>{optionLabel}</option>
        ))}
      </select>
    </label>
  );
}

function CheckboxField({ name, label, checked }: { name: string; label: string; checked: boolean }) {
  return (
    <label className="flex min-h-[72px] items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5">
      <input type="hidden" name={name} value="off" readOnly />
      <input name={name} type="checkbox" value="on" defaultChecked={checked} className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500" />
      <span className="text-sm font-semibold text-neutral-700">{label}</span>
    </label>
  );
}

function TextAreaField({ name, label, value }: { name: string; label: string; value: unknown }) {
  return (
    <label className="block sm:col-span-2">
      <span className="text-sm font-semibold text-neutral-700">{label}</span>
      <textarea
        name={name}
        defaultValue={text(value, '')}
        className="mt-2 min-h-28 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-primary-500"
      />
    </label>
  );
}

function ReportResultTable({ rows, result }: { rows: AdminApiRecord[]; result: unknown }) {
  if (result === null) {
    return (
      <div className="mt-6 rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-6 text-center text-sm text-neutral-500">
        Select filters and generate a report to review live backend data here.
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="mt-6 rounded-lg border border-neutral-200 bg-white p-6 text-center text-sm text-neutral-500">
        This report returned no rows for the selected filters.
      </div>
    );
  }

  const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row)))).slice(0, 8);

  return (
    <section className="mt-6 rounded-lg border border-neutral-200 bg-white">
      <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
        <div>
          <div className="text-sm font-bold text-neutral-900">Report Result</div>
          <div className="text-xs text-neutral-500">{rows.length} row{rows.length === 1 ? '' : 's'} returned</div>
        </div>
      </div>
      <div className="max-h-[420px] overflow-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="sticky top-0 bg-neutral-50 text-xs font-bold uppercase tracking-wide text-neutral-500">
            <tr>
              {columns.map((column) => (
                <th key={column} className="px-4 py-3">{column.replace(/([A-Z])/g, ' $1')}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {rows.map((row, index) => (
              <tr key={index} className="hover:bg-neutral-50">
                {columns.map((column) => (
                  <td key={column} className="px-4 py-3 align-top text-neutral-700">
                    <span className="line-clamp-3 break-words">{text(row[column])}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function reportRows(result: unknown): AdminApiRecord[] {
  if (result === null || result === undefined) return [];
  if (Array.isArray(result)) return result.map(asRecord);
  return Object.entries(asRecord(result)).map(([metric, value]) => ({ metric, value: text(value) }));
}

function reportMetrics(result: unknown, rows: AdminApiRecord[]) {
  const numericValues = rows
    .flatMap((row) => Object.values(row))
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));

  if (result === null) {
    return [
      { label: 'Rows', value: '0', width: 8 },
      { label: 'Data source', value: 'API', width: 100 },
      { label: 'Filters', value: 'Ready', width: 40 },
      { label: 'Export', value: 'CSV', width: 60 },
    ];
  }

  const max = Math.max(...numericValues, rows.length, 1);
  const firstMetrics = rows
    .filter((row) => row.metric || row.value || row.totalRevenue || row.grossRevenue || row.total)
    .slice(0, 3)
    .map((row) => {
      const label = text(row.metric ?? row.programName ?? row.programCode ?? 'Metric');
      const rawValue = row.value ?? row.totalRevenue ?? row.grossRevenue ?? row.total ?? row.count ?? '-';
      const numeric = Number(rawValue);
      return {
        label,
        value: text(rawValue),
        width: Number.isFinite(numeric) ? Math.max(10, Math.min(100, (numeric / max) * 100)) : 48,
      };
    });

  return [
    { label: 'Rows', value: String(rows.length), width: Math.max(10, Math.min(100, (rows.length / max) * 100)) },
    ...firstMetrics,
  ].slice(0, 4);
}

function downloadCsv(filename: string, rows: AdminApiRecord[]) {
  if (!rows.length) return;
  const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  const escapeCell = (value: unknown) => `"${text(value, '').replace(/"/g, '""')}"`;
  const csv = [
    columns.map(escapeCell).join(','),
    ...rows.map((row) => columns.map((column) => escapeCell(row[column])).join(',')),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function AdminFormActions({ isSaving, onClose, submitLabel }: { isSaving: boolean; onClose: () => void; submitLabel: string }) {
  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <button type="button" onClick={onClose} className="rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-semibold text-neutral-700">
        Cancel
      </button>
      <button
        type="submit"
        disabled={isSaving}
        className="rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSaving ? 'Saving...' : submitLabel}
      </button>
    </div>
  );
}

function AdminRowPreview({ row, moduleTitle, onClose }: { row: AdminRow; moduleTitle: string; onClose: () => void }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          ['Module', moduleTitle],
          ['Record ID', row.id],
          ['Owner', row.owner],
          ['Status', row.status],
          ['Metric', row.metric],
          ['Amount', row.amount ?? '-'],
          ['Updated', row.updated],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
            <div className="text-xs font-bold uppercase tracking-wide text-neutral-400">{label}</div>
            <div className="mt-1 text-sm font-semibold text-neutral-900">{value}</div>
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-neutral-200 p-4">
        <div className="text-sm font-bold text-neutral-900">Context</div>
        <p className="mt-2 text-sm text-neutral-600">{row.secondary}</p>
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onClose} className="rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-semibold text-neutral-700">
          Close
        </button>
        <button type="button" onClick={onClose} className="rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700">
          Open review
        </button>
      </div>
    </div>
  );
}

function StatusPill({ label, tone }: { label: string; tone: Tone }) {
  const toneClass =
    tone === 'success'
      ? 'bg-emerald-50 text-emerald-700'
      : tone === 'warning'
        ? 'bg-amber-50 text-amber-700'
        : tone === 'danger'
          ? 'bg-rose-50 text-rose-700'
          : 'bg-neutral-100 text-neutral-600';

  return <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold', toneClass)}>{label}</span>;
}

export const AdminClinicsPage = () => <AdminOperationPage configKey="clinics" />;
export const AdminReferralsPage = () => <AdminOperationPage configKey="referrals" />;
export const AdminAssessmentsPage = () => <AdminOperationPage configKey="assessments" />;
export const AdminRiskReviewsPage = () => <AdminOperationPage configKey="risk-reviews" />;
export const AdminPainCategoriesPage = () => <AdminOperationPage configKey="pain-categories" />;
export const AdminProgramsPage = () => <AdminOperationPage configKey="programs" />;
export const AdminExercisesPage = () => <AdminOperationPage configKey="exercises" />;
export const AdminVideosPage = () => <AdminOperationPage configKey="videos" />;
export const AdminOrdersPage = () => <AdminOperationPage configKey="orders" />;
export const AdminRefundsPage = () => <AdminOperationPage configKey="refunds" />;
export const AdminCouponsPage = () => <AdminOperationPage configKey="coupons" />;
export const AdminRevenueModelsPage = () => <AdminOperationPage configKey="revenue-models" />;
export const AdminFeeSharesPage = () => <AdminOperationPage configKey="fee-shares" />;
export const AdminWalletsPage = () => <AdminOperationPage configKey="wallets" />;
export const AdminPayoutsPage = () => <AdminOperationPage configKey="payouts" />;
export const AdminReconciliationPage = () => <AdminOperationPage configKey="reconciliation" />;
export const AdminNotificationsPage = () => <AdminOperationPage configKey="notifications" />;
export const AdminSupportPage = () => <AdminOperationPage configKey="support" />;
export const AdminReportsPage = () => <AdminOperationPage configKey="reports" />;
export const AdminSettingsPage = () => <AdminOperationPage configKey="settings" />;
export const AdminFraudRiskPage = () => <AdminOperationPage configKey="fraud-risk" />;
export const AdminAuditLogsPage = () => <AdminOperationPage configKey="audit-logs" />;
export default AdminOperationPage;

