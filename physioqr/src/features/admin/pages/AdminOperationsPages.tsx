import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Building2,
  ClipboardList,
  CreditCard,
  Dumbbell,
  FileSearch,
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
import { SearchInput } from '@/components/ui/SearchInput';
import { Modal } from '@/components/ui/Modal';
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
    rows: [
      { id: 'CLN-001', primary: 'Sharma Physiotherapy Clinic', secondary: 'Mumbai | 2 branches', owner: 'Dr. Rajesh Sharma', status: 'Active', tone: 'success', metric: '41 patients', updated: '2026-08-12' },
      { id: 'CLN-002', primary: 'Joint Care Clinic', secondary: 'Pune | Main branch', owner: 'Dr. Priya Patel', status: 'Review', tone: 'warning', metric: '18 patients', updated: '2026-08-11' },
      { id: 'CLN-003', primary: 'Pulse Rehab Centre', secondary: 'Jaipur | QR disabled', owner: 'Dr. Rahul Joshi', status: 'Suspended', tone: 'danger', metric: '23 patients', updated: '2026-08-09' },
    ],
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
    rows: [
      { id: 'QR-DR-001', primary: 'Dr. Rajesh Sharma', secondary: 'Sharma Physiotherapy Clinic', owner: 'Amit Kumar', status: 'Active', tone: 'success', metric: '31% conversion', amount: '1,240 scans', updated: '2026-08-12' },
      { id: 'QR-DR-002', primary: 'Dr. Priya Patel', secondary: 'Joint Care Clinic', owner: 'Suresh Verma', status: 'Active', tone: 'success', metric: '24% conversion', amount: '620 scans', updated: '2026-08-11' },
      { id: 'QR-DR-005', primary: 'Dr. Rahul Joshi', secondary: 'Pulse Rehab Centre', owner: 'Suresh Verma', status: 'Disabled', tone: 'danger', metric: 'Referral stopped', amount: '310 scans', updated: '2026-08-01' },
    ],
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
    rows: [
      { id: 'ASM-KNEE-01', primary: 'Knee Pain Intake v1.3', secondary: '16 questions | 4 conditional branches', owner: 'Clinical Admin', status: 'Published', tone: 'success', metric: 'Assigned to Knee Program', updated: '2026-08-10' },
      { id: 'ASM-BACK-02', primary: 'Lower Back Assessment v1.1', secondary: '14 questions | 3 safety rules', owner: 'Clinical Admin', status: 'Draft', tone: 'neutral', metric: 'Review pending', updated: '2026-08-08' },
      { id: 'ASM-RED-01', primary: 'High Pain Safety Questions', secondary: 'Pain score >= 8 trigger', owner: 'Medical Review', status: 'Review', tone: 'warning', metric: 'Manual approval', updated: '2026-08-07' },
    ],
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
    rows: [
      { id: 'RISK-021', primary: 'Sunita Kapoor', secondary: 'Severe knee pain with swelling', owner: 'Dr. Priya Patel', status: 'Blocking', tone: 'danger', metric: 'Program held', updated: '2026-08-12' },
      { id: 'RISK-022', primary: 'Mohit Arora', secondary: 'Recent surgery declared', owner: 'Dr. Kiran Mehta', status: 'Manual Review', tone: 'warning', metric: 'Awaiting admin', updated: '2026-08-11' },
      { id: 'RISK-023', primary: 'Ramesh Gupta', secondary: 'Pain score improved after Day 03', owner: 'Dr. Rajesh Sharma', status: 'Cleared', tone: 'success', metric: 'Program active', updated: '2026-08-10' },
    ],
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
    rows: [
      { id: 'PAIN-KNEE', primary: 'Knee Pain', secondary: 'Knee intake v1.3 | 2 active programs', owner: 'Clinical Admin', status: 'Active', tone: 'success', metric: '418 active patients', updated: '2026-08-10' },
      { id: 'PAIN-BACK', primary: 'Lower Back Pain', secondary: 'Back assessment v1.1 | 3 active programs', owner: 'Clinical Admin', status: 'Active', tone: 'success', metric: '362 active patients', updated: '2026-08-09' },
      { id: 'PAIN-SHOULDER', primary: 'Shoulder Pain', secondary: 'Needs Hindi label review', owner: 'Clinical Admin', status: 'Review', tone: 'warning', metric: '1 draft program', updated: '2026-08-07' },
      { id: 'PAIN-OTHER', primary: 'Other / General Mobility', secondary: 'Manual program assignment required', owner: 'Clinical Admin', status: 'Manual Review', tone: 'neutral', metric: 'Admin assignment', updated: '2026-08-06' },
    ],
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
    rows: [
      { id: 'PRG-KNEE-01', primary: 'Knee Strengthening Beginner', secondary: 'v1.4 | 14 days | Knee pain', owner: 'Clinical Admin', status: 'Published', tone: 'success', metric: '418 patients', updated: '2026-08-10' },
      { id: 'PRG-BACK-01', primary: 'Lower Back Recovery', secondary: 'v2.0 draft | 21 days', owner: 'Clinical Admin', status: 'Draft', tone: 'neutral', metric: 'Ready for review', updated: '2026-08-09' },
      { id: 'PRG-SHOULDER-01', primary: 'Shoulder Mobility Plan', secondary: 'v1.0 | 7 days', owner: 'Clinical Admin', status: 'Archived', tone: 'warning', metric: 'No new patients', updated: '2026-08-01' },
    ],
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
    rows: [
      { id: 'EX-101', primary: 'Quadriceps Isometric Hold', secondary: 'Knee | Beginner | No equipment', owner: 'Clinical Admin', status: 'Active', tone: 'success', metric: 'Used in 4 programs', updated: '2026-08-10' },
      { id: 'EX-102', primary: 'Patellar Tracking Drill', secondary: 'Knee | Intermediate', owner: 'Clinical Admin', status: 'Review', tone: 'warning', metric: 'Video required', updated: '2026-08-09' },
      { id: 'EX-103', primary: 'Lumbar Cat Camel', secondary: 'Back | Beginner', owner: 'Clinical Admin', status: 'Active', tone: 'success', metric: 'Used in 3 programs', updated: '2026-08-07' },
    ],
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
    rows: [
      { id: 'VID-501', primary: 'Knee Day 05 Instructions', secondary: 'YouTube ID yt-knee-05 | Hindi', owner: 'Knee Program', status: 'Embeddable', tone: 'success', metric: '04:30', updated: '2026-08-11' },
      { id: 'VID-502', primary: 'Back Warm-up Day 01', secondary: 'YouTube ID yt-back-01 | English', owner: 'Back Program', status: 'Embeddable', tone: 'success', metric: '03:45', updated: '2026-08-09' },
      { id: 'VID-503', primary: 'Shoulder Mobility Intro', secondary: 'YouTube ID yt-shoulder-01', owner: 'Shoulder Program', status: 'Unavailable', tone: 'danger', metric: 'Needs replacement', updated: '2026-08-07' },
    ],
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
    rows: [
      { id: 'ORD-004521', primary: 'Ramesh Gupta', secondary: 'Knee Strengthening Beginner', owner: 'Dr. Rajesh Sharma', status: 'Activated', tone: 'success', metric: 'Payment success', amount: 'INR 500', updated: '2026-08-12' },
      { id: 'ORD-004522', primary: 'Sunita Kapoor', secondary: 'Lower Back Recovery', owner: 'Dr. Priya Patel', status: 'Payment Pending', tone: 'warning', metric: 'Attempt 2 failed', amount: 'INR 450', updated: '2026-08-12' },
      { id: 'ORD-004523', primary: 'Vikram Malhotra', secondary: 'Knee Strengthening Beginner', owner: 'Dr. Rajesh Sharma', status: 'Refunded', tone: 'danger', metric: 'Full refund', amount: 'INR 500', updated: '2026-08-10' },
    ],
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
    rows: [
      { id: 'REF-1101', primary: 'Vikram Malhotra', secondary: 'Duplicate payment refund', owner: 'Dr. Rajesh Sharma', status: 'Processed', tone: 'success', metric: 'Fee share reversed', amount: 'INR 500', updated: '2026-08-10' },
      { id: 'REF-1102', primary: 'Neha Arora', secondary: 'Program cancellation request', owner: 'Dr. Kiran Mehta', status: 'Requested', tone: 'warning', metric: 'Review usage', amount: 'INR 550', updated: '2026-08-12' },
      { id: 'REF-1103', primary: 'Amit Sinha', secondary: 'Gateway mismatch', owner: 'Dr. Priya Patel', status: 'Failed', tone: 'danger', metric: 'Gateway retry', amount: 'INR 450', updated: '2026-08-11' },
    ],
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
    rows: [
      { id: 'CPN-FIRST100', primary: 'FIRST100', secondary: 'First-time patient | Fixed INR 100', owner: 'Growth Admin', status: 'Active', tone: 'success', metric: '142 redemptions', amount: 'Max INR 100', updated: '2026-08-12' },
      { id: 'CPN-KNEE10', primary: 'KNEE10', secondary: 'Knee programs | 10% discount', owner: 'Growth Admin', status: 'Active', tone: 'success', metric: 'Fee share after discount', amount: '10%', updated: '2026-08-10' },
      { id: 'CPN-DR001', primary: 'DRSHARMA50', secondary: 'Doctor-specific discount', owner: 'Admin', status: 'Scheduled', tone: 'warning', metric: 'Starts 2026-09-01', amount: 'INR 50', updated: '2026-08-09' },
      { id: 'CPN-OLD20', primary: 'OLD20', secondary: 'Expired campaign', owner: 'Growth Admin', status: 'Expired', tone: 'neutral', metric: 'Archived', amount: '20%', updated: '2026-07-31' },
    ],
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
    rows: [
      { id: 'REV-001', primary: 'Split Model', secondary: 'Dr. Rajesh Sharma | Knee Program', owner: 'Admin', status: 'Active', tone: 'success', metric: '60% fee share', amount: 'Patient fee INR 500', updated: '2026-08-01' },
      { id: 'REV-002', primary: 'Platform Fee Model', secondary: 'Dr. Priya Patel | All programs', owner: 'Admin', status: 'Active', tone: 'success', metric: 'Platform fee INR 200', amount: 'Doctor collects clinic fee', updated: '2026-08-05' },
      { id: 'REV-003', primary: 'Split Model v2 Draft', secondary: 'Back Pain Programs', owner: 'Admin', status: 'Draft', tone: 'neutral', metric: '65% fee share', amount: 'Effective Sep 1', updated: '2026-08-09' },
    ],
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
    rows: [
      { id: 'FS-8101', primary: 'Dr. Rajesh Sharma', secondary: 'ORD-004521 | Payment PAY-008812', owner: 'Ledger Engine', status: 'Available', tone: 'success', metric: '60% after discount', amount: 'INR 300', updated: '2026-08-12' },
      { id: 'FS-8102', primary: 'Dr. Priya Patel', secondary: 'ORD-004522 | Holding period', owner: 'Ledger Engine', status: 'Pending', tone: 'warning', metric: 'Releases 2026-08-27', amount: 'INR 270', updated: '2026-08-12' },
      { id: 'FS-8103', primary: 'Dr. Kiran Mehta', secondary: 'Refund REF-1102 linked', owner: 'Ledger Engine', status: 'Reversed', tone: 'danger', metric: 'Refund reversal', amount: 'INR 330', updated: '2026-08-11' },
    ],
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
    rows: [
      { id: 'WAL-001', primary: 'Dr. Rajesh Sharma', secondary: 'Pending INR 3,600 | Available INR 5,400', owner: 'Finance Admin', status: 'Active', tone: 'success', metric: 'Last release 2026-08-12', amount: 'INR 9,000', updated: '2026-08-12' },
      { id: 'WAL-002', primary: 'Dr. Priya Patel', secondary: 'Bank pending | Withdrawal blocked', owner: 'Finance Admin', status: 'Restricted', tone: 'warning', metric: 'KYC review', amount: 'INR 4,000', updated: '2026-08-11' },
      { id: 'WAL-003', primary: 'Dr. Rahul Joshi', secondary: 'Suspended doctor | QR disabled', owner: 'Risk Engine', status: 'On Hold', tone: 'danger', metric: 'Payout blocked', amount: 'INR 7,800', updated: '2026-08-09' },
    ],
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
    rows: [
      { id: 'PAYO-044', primary: 'Dr. Rajesh Sharma', secondary: 'HDFC ****4829', owner: 'Finance Admin', status: 'Paid', tone: 'success', metric: 'UTR HDFC92841', amount: 'INR 3,300', updated: '2026-08-12' },
      { id: 'PAYO-045', primary: 'Dr. Kiran Mehta', secondary: 'AXIS ****6632', owner: 'Finance Admin', status: 'Processing', tone: 'warning', metric: 'Bank pending', amount: 'INR 2,400', updated: '2026-08-12' },
      { id: 'PAYO-046', primary: 'Dr. Priya Patel', secondary: 'ICICI ****2210', owner: 'Finance Admin', status: 'Failed', tone: 'danger', metric: 'Bank validation failed', amount: 'INR 1,800', updated: '2026-08-11' },
    ],
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
    rows: [
      { id: 'REC-701', primary: 'Payment success, order pending', secondary: 'ORD-004522 | Razorpay PAY-2219', owner: 'Gateway', status: 'Open', tone: 'danger', metric: 'Needs verification', amount: 'INR 450', updated: '2026-08-12' },
      { id: 'REC-702', primary: 'Wallet not generated', secondary: 'ORD-004510 | Split Model', owner: 'Ledger', status: 'Open', tone: 'warning', metric: 'Fee share missing', amount: 'INR 300', updated: '2026-08-11' },
      { id: 'REC-703', primary: 'Refund matched', secondary: 'REF-1101 | ORD-004523', owner: 'Gateway', status: 'Resolved', tone: 'success', metric: 'Ledger balanced', amount: 'INR 500', updated: '2026-08-10' },
    ],
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
    rows: [
      { id: 'NTF-001', primary: 'Payment successful', secondary: 'WhatsApp + Email | Patient', owner: 'System', status: 'Active', tone: 'success', metric: '98.4% delivered', updated: '2026-08-11' },
      { id: 'NTF-002', primary: 'Withdrawal approved', secondary: 'SMS + In-app | Doctor', owner: 'Finance', status: 'Active', tone: 'success', metric: '96.1% delivered', updated: '2026-08-10' },
      { id: 'NTF-003', primary: 'Daily exercise reminder', secondary: 'WhatsApp | Patient', owner: 'Clinical', status: 'Review', tone: 'warning', metric: 'Hindi copy pending', updated: '2026-08-09' },
    ],
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
    rows: [
      { id: 'TKT-201', primary: 'Video access problem', secondary: 'Patient: Ramesh Gupta', owner: 'Support Team', status: 'Open', tone: 'warning', metric: 'SLA 4h', updated: '2026-08-12' },
      { id: 'TKT-202', primary: 'Withdrawal issue', secondary: 'Doctor: Dr. Priya Patel', owner: 'Finance Support', status: 'In Progress', tone: 'warning', metric: 'Bank pending', updated: '2026-08-12' },
      { id: 'TKT-203', primary: 'QR code print request', secondary: 'Agent: Amit Kumar', owner: 'Ops Team', status: 'Resolved', tone: 'success', metric: 'Closed', updated: '2026-08-10' },
    ],
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
    rows: [
      { id: 'RPT-FIN-01', primary: 'Financial Summary', secondary: 'Gross, net, discounts, refunds, fee share, payouts', owner: 'Finance Admin', status: 'Ready', tone: 'success', metric: 'Monthly', updated: '2026-08-12' },
      { id: 'RPT-REF-01', primary: 'Referral Conversion', secondary: 'QR scans to paid patients by doctor and agent', owner: 'Operations', status: 'Ready', tone: 'success', metric: 'Daily', updated: '2026-08-12' },
      { id: 'RPT-CLN-01', primary: 'Program Completion', secondary: 'Completion, drop-off, pain score improvement', owner: 'Clinical Admin', status: 'Review', tone: 'warning', metric: 'Weekly', updated: '2026-08-10' },
    ],
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
    rows: [
      { id: 'SET-GEN', primary: 'General', secondary: 'Platform name, currency, timezone', owner: 'Admin', status: 'Active', tone: 'success', metric: 'India - English', updated: '2026-08-12' },
      { id: 'SET-FEE', primary: 'Fee Share Defaults', secondary: 'Default percentage, basis, holding period', owner: 'Finance Admin', status: 'Active', tone: 'success', metric: '15-day hold', updated: '2026-08-10' },
      { id: 'SET-LEGAL', primary: 'Legal Documents', secondary: 'Terms, privacy, refund, medical disclaimer', owner: 'Admin', status: 'Review', tone: 'warning', metric: 'Privacy update due', updated: '2026-08-09' },
    ],
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
    rows: [
      { id: 'FRD-301', primary: 'High QR scans, low payments', secondary: 'Dr. Rahul Joshi | 310 scans, 12 paid', owner: 'Risk Engine', status: 'Open', tone: 'warning', metric: 'Watchlist', updated: '2026-08-12' },
      { id: 'FRD-302', primary: 'Duplicate device registrations', secondary: '5 patients | Same device fingerprint', owner: 'Risk Engine', status: 'Blocking', tone: 'danger', metric: 'Payout hold', updated: '2026-08-11' },
      { id: 'FRD-303', primary: 'Frequent refunds under one doctor', secondary: 'Dr. Priya Patel | 6 refunds this month', owner: 'Risk Engine', status: 'Review', tone: 'warning', metric: 'Refund audit', updated: '2026-08-10' },
      { id: 'FRD-304', primary: 'Bank account shared by doctors', secondary: '2 doctor profiles | Same account suffix', owner: 'Risk Engine', status: 'Resolved', tone: 'success', metric: 'KYC cleared', updated: '2026-08-08' },
    ],
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
    rows: [
      { id: 'AUD-9001', primary: 'Doctor pricing changed', secondary: 'DR-001 | INR 500 to INR 600', owner: 'Central Admin', status: 'Recorded', tone: 'success', metric: 'Reason captured', updated: '2026-08-12 12:42' },
      { id: 'AUD-9002', primary: 'Withdrawal approved', secondary: 'WD-901 | INR 3,300', owner: 'Central Admin', status: 'Recorded', tone: 'success', metric: 'Payout pending', updated: '2026-08-12 11:20' },
      { id: 'AUD-9003', primary: 'QR disabled', secondary: 'QR-DR-005 | Suspended doctor', owner: 'Central Admin', status: 'Recorded', tone: 'warning', metric: 'Referral stopped', updated: '2026-08-01 15:18' },
    ],
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

function AdminOperationPage({ configKey }: { configKey: keyof typeof operationConfigs }) {
  const config = operationConfigs[configKey];
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [selectedRow, setSelectedRow] = useState<AdminRow | null>(null);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return config.rows.filter((row) => {
      const matchesQuery =
        !query ||
        [row.id, row.primary, row.secondary, row.owner, row.status, row.metric, row.amount ?? ''].some((value) =>
          value.toLowerCase().includes(query)
        );
      const matchesFilter = filter === 'all' || row.status === filter;
      return matchesQuery && matchesFilter;
    });
  }, [config.rows, filter, search]);

  const statuses = Array.from(new Set(config.rows.map((row) => row.status)));
  const Icon = config.icon;

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-[11px] font-extrabold tracking-[0.08em] text-teal-700">
            <Icon className="h-3.5 w-3.5" />
            {config.eyebrow}
          </div>
          <h1 className="mt-3 text-2xl font-bold text-neutral-900 sm:text-3xl">{config.title}</h1>
          <p className="mt-1 max-w-3xl text-sm text-neutral-500">{config.description}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveAction(config.secondaryAction)}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
          >
            <FileSearch className="h-4 w-4" />
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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="card p-5 min-w-0">
          <div className="grid gap-3 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <SearchInput value={search} onChange={setSearch} placeholder={config.searchPlaceholder} />
            </div>
            <div className="flex flex-wrap gap-2 lg:justify-end">
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
          </div>

          <div className="mt-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
            {config.filterLabel}
          </div>

          <div className="mt-5">
            <DataTable
              columns={columns}
              data={filteredRows}
              emptyMessage={`No ${config.title.toLowerCase()} match the current filters.`}
              onRowClick={setSelectedRow}
            />
          </div>
        </section>

        <aside className="card p-5 xl:sticky xl:top-24 xl:self-start">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-neutral-900">{config.panelTitle}</h2>
              <p className="text-xs text-neutral-500">Operational guardrails</p>
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

      <Modal isOpen={!!activeAction} onClose={() => setActiveAction(null)} title={activeAction ?? undefined} size="lg">
        <AdminActionForm moduleTitle={config.title} action={activeAction ?? ''} onClose={() => setActiveAction(null)} />
      </Modal>

      <Modal isOpen={!!selectedRow} onClose={() => setSelectedRow(null)} title={selectedRow?.primary} size="xl">
        {selectedRow && <AdminRowPreview row={selectedRow} moduleTitle={config.title} onClose={() => setSelectedRow(null)} />}
      </Modal>
    </div>
  );
}

function AdminActionForm({ moduleTitle, action, onClose }: { moduleTitle: string; action: string; onClose: () => void }) {
  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-teal-200 bg-teal-50 p-4 text-sm text-teal-900">
        {moduleTitle} action is frontend-ready. Backend API wiring can replace this mock submit without changing the page structure.
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
