import type React from 'react';

export type ApiRecord = Record<string, unknown>;

export type AdminResourceKey =
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

export type AdminResourceConfig = {
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

export type AdminResourceDrawerMode =
  | 'details'
  | 'doctor-action'
  | 'risk-action'
  | 'fraud-action'
  | 'program-day'
  | 'record-form'
  | 'visit-detail';

export type DrawerState = {
  mode: AdminResourceDrawerMode;
  row?: ApiRecord;
  action?: string;
};
