import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Banknote,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  ExternalLink,
  FileText,
  HeartPulse,
  Landmark,
  MessageSquare,
  QrCode,
  ShieldCheck,
  Stethoscope,
  UserCheck,
  Wallet,
  XCircle,
} from 'lucide-react';
import apiClient from '@/lib/api-client';
import ErrorState from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import { Tabs } from '@/components/ui/Tabs';
import { cn } from '@/lib/cn';
import { AgentRecordForm } from '@/features/admin/components/AgentRecordForm';

type DetailTone = 'success' | 'warning' | 'danger' | 'neutral';
type DetailEntity =
  | 'doctor'
  | 'agent'
  | 'patient'
  | 'payment'
  | 'withdrawal'
  | 'support';

type ApiRecord = Record<string, unknown>;

const detailTabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'profile', label: 'Profile' },
  { id: 'commercial', label: 'Commercial' },
  { id: 'activity', label: 'Activity' },
  { id: 'audit', label: 'Audit' },
];

const agentTabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'audit', label: 'Audit' },
];

const entityConfig: Record<
  DetailEntity,
  {
    eyebrow: string;
    endpoint: (id: string) => string;
    title: (record: ApiRecord, id: string) => string;
    subtitle: string;
    status: (record: ApiRecord) => string;
  }
> = {
  doctor: {
    eyebrow: 'DOCTOR APPROVAL WORKSPACE',
    endpoint: (id) => `/admin/doctors/${id}`,
    title: (record, id) =>
      `${text(record.fullName, 'Doctor')} (${text(record.doctorId, id)})`,
    subtitle:
      'Review profile, clinic, documents, commercial rules, QR activation, wallet state, and audit history before approval.',
    status: (record) => text(record.status, 'Under Review'),
  },

  agent: {
    eyebrow: 'AGENT WORKSPACE',
    endpoint: (id) => `/admin/agents/${id}`,
    title: (record, id) =>
      `${text(record.fullName, 'Agent')} (${text(record.agentId, id)})`,
    subtitle:
      'Agent profile, doctor network, clinic visits, follow-ups, revenue attribution, and activity timeline.',
    status: (record) => text(record.status, 'Active'),
  },

  patient: {
    eyebrow: 'PATIENT CONTROL',
    endpoint: (id) => `/admin/patients/${id}`,
    title: (record, id) =>
      `${text(record.fullName, 'Patient')} (${text(record.patientId, id)})`,
    subtitle:
      'Patient referral, assessment, medical flags, program access, payment history, consent, support, and audit context.',
    status: (record) =>
      text(
        record.status || nested(record, 'programs.0.status'),
        'Patient Record',
      ),
  },

  payment: {
    eyebrow: 'PAYMENT CONTROL',
    endpoint: (id) => `/payments/${id}`,
    title: (record, id) =>
      `Payment ${text(
        record.invoiceNumber,
        text(record.gatewayTransactionId, id),
      )}`,
    subtitle:
      'Order snapshot, payment attempts, gateway reference, invoice, fee-share ledger, refund state, and reconciliation context.',
    status: (record) => text(record.status, 'Payment Record'),
  },

  withdrawal: {
    eyebrow: 'WITHDRAWAL REVIEW',
    endpoint: (id) => `/admin/withdrawals/${id}`,
    title: (record, id) =>
      `Withdrawal ${text(record._id, id)}`,
    subtitle:
      'Review doctor eligibility, available balance, KYC, bank details, risk status, and payout cycle before approval.',
    status: (record) => text(record.status, 'Requested'),
  },

  support: {
    eyebrow: 'SUPPORT WORKSPACE',
    endpoint: (id) => `/support/${id}`,
    title: (record, id) =>
      `${text(record.ticketId, id)}: ${text(
        record.subject,
        'Support ticket',
      )}`,
    subtitle:
      'Support request context with linked patient, doctor, order, payment, attachments, response history, and resolution notes.',
    status: (record) => text(record.status, 'Open'),
  },
};

function AdminHydratedDetailPage({
  entity,
  paramName,
}: {
  entity: DetailEntity;
  paramName: string;
}) {
  const params = useParams();
  const id = String(params[paramName] || '');
  const config = entityConfig[entity];

  const query = useQuery({
    queryKey: ['admin-detail', entity, id],
    queryFn: async () =>
      (await apiClient.get(config.endpoint(id))).data,
    enabled: Boolean(id),
  });

  const record = (query.data ?? {}) as ApiRecord;
  const status = config.status(record);
  const tone = statusTone(status);

  if (query.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_350px]">
          <Skeleton className="h-[600px] w-full" />
          <Skeleton className="h-[500px] w-full" />
        </div>
      </div>
    );
  }

  if (query.isError) {
    return (
      <ErrorState
        title={`${entityLabel(entity)} detail could not load`}
        message="Check the API server, admin auth session, and whether the selected record still exists."
        onRetry={() => query.refetch()}
      />
    );
  }

  return (
    <WorkspaceShell
      header={
        <PageHeader
          entity={entity}
          record={record}
          eyebrow={config.eyebrow}
          title={config.title(record, id)}
          subtitle={config.subtitle}
          status={status}
          tone={tone}
        />
      }
      tabs={
        <TabbedDetailContent
          entity={entity}
          record={record}
        />
      }
      side={
        <ReviewSidePanel
          entity={entity}
          record={record}
          onRefresh={() => query.refetch()}
        />
      }
    />
  );
}

/* =========================================================
   HEADER
========================================================= */

function PageHeader({
  entity,
  record,
  eyebrow,
  title,
  subtitle,
  status,
  tone = 'neutral',
}: {
  entity: DetailEntity;
  record: ApiRecord;
  eyebrow: string;
  title: string;
  subtitle: string;
  status: string;
  tone?: DetailTone;
}) {
  const navigate = useNavigate();
  const initials = getInitials(
    text(record.fullName, title),
  );

  const isDoctor = entity === 'doctor';

  if (isDoctor) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm">

        <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">

          <div className="flex min-w-0 items-start gap-4">

            <button
              type="button"
              onClick={() => navigate(-1)}
              className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-600 transition hover:bg-neutral-50 hover:text-neutral-900"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-base font-extrabold text-primary-700">
              {initials}
            </div>

            <div className="min-w-0">

              <div className="flex flex-wrap items-center gap-2">

                <h1 className="text-2xl font-bold tracking-tight text-neutral-950 sm:text-3xl">
                  {text(record.fullName, 'Doctor')}
                </h1>

                <StatusPill
                  label={status}
                  tone={tone}
                />

              </div>

              <p className="mt-1 text-sm text-neutral-600">

                {text(
                  record.specialization,
                  'Specialist',
                )}

                <span className="mx-2 text-neutral-300">
                  •
                </span>

                {text(
                  record.clinicName,
                  'Clinic not assigned',
                )}

                <span className="mx-2 text-neutral-300">
                  •
                </span>

                {text(
                  record.city,
                  'Location not available',
                )}

              </p>

              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-400">

                <span>
                  Doctor ID: {text(record.doctorId, '—')}
                </span>

                <span className="hidden h-1 w-1 rounded-full bg-neutral-300 sm:block" />

                <span>
                  {text(record.email, 'No email')}
                </span>

                <span className="hidden h-1 w-1 rounded-full bg-neutral-300 sm:block" />

                <span>
                  {text(record.mobile, 'No mobile')}
                </span>

              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pl-14 sm:pl-[5.5rem] lg:pl-0">

            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50"
            >
              Back to list
            </button>

          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white px-5 py-5 shadow-sm sm:px-6">

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">

        <div className="min-w-0">

          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-neutral-600 transition hover:text-neutral-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-[11px] font-extrabold tracking-[0.08em] text-teal-700">
            <ShieldCheck className="h-3.5 w-3.5" />
            {eyebrow}
          </div>

          <h1 className="mt-3 text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
            {title}
          </h1>

          <p className="mt-1 max-w-3xl text-sm leading-6 text-neutral-500">
            {subtitle}
          </p>

        </div>

        <div className="flex items-center gap-3">

          <StatusPill
            label={status}
            tone={tone}
          />

          <span className="hidden rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-500 sm:inline-flex">
            Admin workspace
          </span>

        </div>

      </div>
    </div>
  );
}

/* =========================================================
   WORKSPACE
========================================================= */

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
    <div className="mx-auto w-full max-w-[1600px] space-y-5">

      {header}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_350px]">

        <section className="min-w-0 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          {tabs}
        </section>

        <aside className="space-y-4 xl:sticky xl:top-5">
          {side}
        </aside>

      </div>
    </div>
  );
}

/* =========================================================
   TABS
========================================================= */

function TabbedDetailContent({
  entity,
  record,
}: {
  entity: DetailEntity;
  record: ApiRecord;
}) {
  const tabs =
    entity === 'agent'
      ? agentTabs
      : detailTabs;

  const [activeTab, setActiveTab] =
    useState(tabs[0].id);

  return (
    <>
      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      <div className="p-5">

        {activeTab === 'overview' && (
          <OverviewPanel
            entity={entity}
            record={record}
          />
        )}

        {activeTab === 'profile' && (
          <ProfilePanel
            entity={entity}
            record={record}
          />
        )}

        {activeTab === 'commercial' && (
          <CommercialPanel
            entity={entity}
            record={record}
          />
        )}

        {activeTab === 'activity' && (
          <ActivityPanel
            entity={entity}
            record={record}
          />
        )}

        {activeTab === 'audit' && (
          <AuditPanel
            record={record}
          />
        )}

      </div>
    </>
  );
}

/* =========================================================
   OVERVIEW
========================================================= */

function OverviewPanel({
  entity,
  record,
}: {
  entity: DetailEntity;
  record: ApiRecord;
}) {
  const cards = metricCards(
    entity,
    record,
  );

  if (entity === 'doctor') {
    return (
      <DoctorOverviewPanel
        record={record}
        cards={cards}
      />
    );
  }

  if (entity === 'agent') {

    const doctors = Array.isArray(
      record.doctors,
    )
      ? (record.doctors as ApiRecord[])
      : [];

    return (
      <div className="space-y-5">

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">

          {cards.map((card) => (
            <div
              key={card.label}
              className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
            >

              <div
                className={cn(
                  'mb-3 flex h-10 w-10 items-center justify-center rounded-xl',
                  card.tone,
                )}
              >
                <card.icon className="h-5 w-5" />
              </div>

              <div className="text-lg font-bold text-neutral-900">
                {card.value}
              </div>

              <div className="mt-1 text-sm text-neutral-500">
                {card.label}
              </div>

            </div>
          ))}

        </div>

        <div className="grid gap-5 lg:grid-cols-2">

          <InfoBlock
            title="Agent Details"
            rows={[
              ['Agent ID', text(record.agentId, '—')],
              ['Mobile', text(record.mobile, '—')],
              ['WhatsApp', text(record.whatsapp, '—')],
              ['Email', text(record.email, '—')],
              ['City', text(record.city, '—')],
              ['State', text(record.state, '—')],
            ]}
          />

          <InfoBlock
            title="Assignment"
            rows={[
              [
                'Assigned Region',
                text(record.assignedRegion, '—'),
              ],
              [
                'Reporting Person',
                text(record.reportingPerson, '—'),
              ],
              [
                'Joining Date',
                dateText(record.joiningDate),
              ],
              [
                'Status',
                text(record.status, '—'),
              ],
              [
                'Created',
                dateText(record.createdAt),
              ],
              [
                'Last Updated',
                dateText(record.updatedAt),
              ],
            ]}
          />

        </div>

        {Boolean(record.address) && (
          <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">

            <h3 className="text-sm font-bold text-neutral-900">
              Address
            </h3>

            <p className="mt-2 rounded-lg bg-neutral-50 p-3 text-sm leading-6 text-neutral-700">
              {String(record.address)}
            </p>

          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">

          <div className="flex flex-col gap-1 border-b border-neutral-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <h3 className="text-sm font-bold text-neutral-900">
                Registered Doctors
              </h3>

              <p className="mt-0.5 text-xs text-neutral-500">
                Doctors attributed to this agent.
              </p>
            </div>

            <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-bold text-primary-700">
              {doctors.length} total
            </span>

          </div>

          {doctors.length === 0 ? (

            <div className="m-4 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center">

              <Stethoscope className="mx-auto h-8 w-8 text-neutral-400" />

              <p className="mt-2 text-sm font-semibold text-neutral-700">
                No doctors registered yet
              </p>

              <p className="mt-1 text-xs text-neutral-500">
                Doctor registrations linked to this agent will appear here.
              </p>

            </div>

          ) : (

            <div className="divide-y divide-neutral-100">

              {doctors.map(
                (
                  doctor,
                  i,
                ) => (

                  <div
                    key={String(
                      doctor._id ?? i,
                    )}
                    className="flex flex-col gap-3 px-5 py-4 transition hover:bg-neutral-50 sm:flex-row sm:items-center sm:justify-between"
                  >

                    <div className="flex min-w-0 items-center gap-3">

                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-sm font-bold text-primary-700">
                        {getInitials(
                          text(
                            doctor.fullName,
                            'Doctor',
                          ),
                        )}
                      </div>

                      <div className="min-w-0">

                        <div className="truncate text-sm font-semibold text-neutral-900">
                          {text(
                            doctor.fullName,
                            'Doctor',
                          )}
                        </div>

                        <div className="truncate text-xs text-neutral-500">
                          {text(
                            doctor.clinicName,
                            'Clinic not provided',
                          )}
                          {' · '}
                          {text(
                            doctor.city,
                            'City not provided',
                          )}
                        </div>

                      </div>

                    </div>

                    <div className="flex items-center gap-3 pl-13 sm:pl-0">

                      <span className="text-xs font-medium text-neutral-500">
                        {text(
                          doctor.doctorId,
                          '—',
                        )}
                      </span>

                      <AgentStatusBadge
                        status={String(
                          doctor.status ?? '',
                        )}
                      />

                    </div>

                  </div>

                ),
              )}

            </div>

          )}

        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
          >

            <div
              className={cn(
                'mb-3 flex h-10 w-10 items-center justify-center rounded-xl',
                card.tone,
              )}
            >
              <card.icon className="h-5 w-5" />
            </div>

            <div className="text-lg font-bold text-neutral-900">
              {card.value}
            </div>

            <div className="mt-1 text-sm text-neutral-500">
              {card.label}
            </div>

          </div>
        ))}

      </div>

      <div className="grid gap-5 lg:grid-cols-2">

        <InfoBlock
          title={`${entityLabel(entity)} Context`}
          rows={overviewRows(
            entity,
            record,
          )}
        />

        <InfoBlock
          title="Linked Records"
          rows={linkedRows(
            entity,
            record,
          )}
        />

      </div>

    </div>
  );
}

/* =========================================================
   DOCTOR OVERVIEW
========================================================= */

function DoctorOverviewPanel({
  record,
  cards,
}: {
  record: ApiRecord;
  cards: ReturnType<
    typeof metricCards
  >;
}) {
  const initials = getInitials(
    text(record.fullName, 'Doctor'),
  );

  return (
    <div className="space-y-5">

      {/* Doctor Summary */}

      <div className="rounded-2xl border border-neutral-200 bg-gradient-to-br from-white via-white to-neutral-50 p-5 shadow-sm">

        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

          <div className="flex min-w-0 items-center gap-4">

            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-xl font-extrabold text-primary-700">
              {initials}
            </div>

            <div className="min-w-0">

              <div className="flex flex-wrap items-center gap-2">

                <h2 className="truncate text-lg font-bold text-neutral-950">
                  {text(
                    record.fullName,
                    'Doctor',
                  )}
                </h2>

                <StatusPill
                  label={text(
                    record.status,
                    'Under Review',
                  )}
                  tone={statusTone(
                    text(
                      record.status,
                      'Under Review',
                    ),
                  )}
                />

              </div>

              <p className="mt-1 text-sm text-neutral-600">

                {text(
                  record.qualification,
                  'Qualification not available',
                )}

                <span className="mx-2 text-neutral-300">
                  •
                </span>

                {text(
                  record.specialization,
                  'Specialization not available',
                )}

              </p>

              <p className="mt-1 text-xs text-neutral-400">
                {text(
                  record.clinicName,
                  'Clinic not assigned',
                )}
                {' · '}
                {text(
                  record.city,
                  'Location not available',
                )}
              </p>

            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">

            <MiniSummary
              label="Experience"
              value={`${text(
                record.yearsOfExperience,
                '0',
              )} yrs`}
            />

            <MiniSummary
              label="Patient Fee"
              value={money(
                record.approvedPatientFee ||
                  record.requestedPatientFee,
              )}
            />

            <MiniSummary
              label="KYC"
              value={text(
                record.kycStatus,
                'Pending',
              )}
            />

          </div>

        </div>

      </div>

      {/* Metrics */}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">

        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
          >

            <div className="flex items-center justify-between gap-3">

              <span className="text-xs font-medium text-neutral-500">
                {card.label}
              </span>

              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-lg',
                  card.tone,
                )}
              >
                <card.icon className="h-4 w-4" />
              </div>

            </div>

            <div className="mt-3 text-2xl font-bold tracking-tight text-neutral-950">
              {card.value}
            </div>

          </div>
        ))}

      </div>

      {/* Main Information */}

      <div className="grid gap-5 lg:grid-cols-2">

        <InfoGroup title="Doctor Information">

          <DetailItem
            label="Doctor ID"
            value={text(
              record.doctorId,
              '—',
            )}
          />

          <DetailItem
            label="Qualification"
            value={text(
              record.qualification,
              '—',
            )}
          />

          <DetailItem
            label="Specialization"
            value={text(
              record.specialization,
              '—',
            )}
          />

          <DetailItem
            label="Registration"
            value={text(
              record.medicalRegNumber,
              '—',
            )}
          />

          <DetailItem
            label="Registration Council"
            value={text(
              record.registrationCouncil,
              '—',
            )}
          />

          <DetailItem
            label="Experience"
            value={`${text(
              record.yearsOfExperience,
              '0',
            )} years`}
          />

        </InfoGroup>

        <InfoGroup title="Contact & Clinic">

          <DetailItem
            label="Mobile"
            value={text(
              record.mobile,
              '—',
            )}
          />

          <DetailItem
            label="WhatsApp"
            value={text(
              record.whatsapp,
              '—',
            )}
          />

          <DetailItem
            label="Email"
            value={text(
              record.email,
              '—',
            )}
          />

          <DetailItem
            label="Clinic"
            value={text(
              record.clinicName,
              '—',
            )}
          />

          <DetailItem
            label="City"
            value={text(
              record.city,
              '—',
            )}
          />

          <DetailItem
            label="Working Hours"
            value={text(
              record.clinicWorkingHours,
              '—',
            )}
          />

        </InfoGroup>

      </div>

      <div className="grid gap-5 lg:grid-cols-2">

        <InfoGroup title="Compliance">

          <DetailItem
            label="KYC Status"
            value={text(
              record.kycStatus,
              '—',
            )}
          />

          <DetailItem
            label="Bank Verified"
            value={text(
              record.bankVerified,
              '—',
            )}
          />

          <DetailItem
            label="PAN"
            value={maskSensitive(
              record.panNumber,
            )}
          />

          <DetailItem
            label="Documents"
            value={documentCount(
              record,
            )}
          />

        </InfoGroup>

        <InfoGroup title="Commercial">

          <DetailItem
            label="Revenue Model"
            value={text(
              record.revenueModel,
              '—',
            )}
          />

          <DetailItem
            label="Patient Fee"
            value={money(
              record.approvedPatientFee ||
                record.requestedPatientFee,
            )}
          />

          <DetailItem
            label="Fee Share"
            value={percentage(
              record.feeSharePercentage,
            )}
          />

          <DetailItem
            label="Holding Period"
            value={`${text(
              record.feeShareHoldingDays,
              '0',
            )} days`}
          />

        </InfoGroup>

      </div>

      <div className="grid gap-5 lg:grid-cols-2">

        <InfoGroup title="Record Timeline">

          <DetailItem
            label="Created"
            value={dateText(
              record.createdAt,
            )}
          />

          <DetailItem
            label="Last Updated"
            value={dateText(
              record.updatedAt,
            )}
          />

          <DetailItem
            label="Status"
            value={text(
              record.status,
              '—',
            )}
          />

          <DetailItem
            label="QR Active"
            value={text(
              record.qrCodeActive,
              '—',
            )}
          />

        </InfoGroup>

        <InfoGroup title="Linked Records">

          <DetailItem
            label="Agent"
            value={text(
              nested(
                record,
                'agent.fullName',
              ),
              'Unassigned',
            )}
          />

          <DetailItem
            label="Clinic"
            value={text(
              record.clinicName,
              '—',
            )}
          />

          <DetailItem
            label="City"
            value={text(
              record.city,
              '—',
            )}
          />

          <DetailItem
            label="Business ID"
            value={text(
              record.doctorId,
              '—',
            )}
          />

        </InfoGroup>

      </div>
    </div>
  );
}

function InfoGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">

      <div className="border-b border-neutral-100 bg-neutral-50/50 px-5 py-4">

        <h3 className="text-sm font-bold text-neutral-950">
          {title}
        </h3>

      </div>

      <div className="grid grid-cols-1 gap-x-6 gap-y-4 p-5 sm:grid-cols-2">
        {children}
      </div>

    </section>
  );
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">

      <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
        {label}
      </div>

      <div className="mt-1 break-words text-sm font-semibold text-neutral-900">
        {value}
      </div>

    </div>
  );
}

function MiniSummary({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white px-3 py-2.5">

      <div className="text-[10px] font-bold uppercase tracking-wide text-neutral-400">
        {label}
      </div>

      <div className="mt-1 truncate text-sm font-bold text-neutral-900">
        {value}
      </div>

    </div>
  );
}

function maskSensitive(
  value: unknown,
) {
  const raw = text(
    value,
    '—',
  );

  if (raw === '—') {
    return raw;
  }

  if (raw.length <= 4) {
    return '••••';
  }

  return `${'•'.repeat(
    Math.max(
      0,
      raw.length - 4,
    ),
  )}${raw.slice(-4)}`;
}

function getInitials(
  value: string,
) {
  const initials = value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(
      (part) =>
        part
          .charAt(0)
          .toUpperCase(),
    )
    .join('');

  return initials || 'DR';
}

/* =========================================================
   STATUS BADGE
========================================================= */

function AgentStatusBadge({
  status,
}: {
  status: string;
}) {
  const tone =
    status === 'approved' ||
    status === 'active'
      ? 'bg-emerald-50 text-emerald-700'
      : status === 'submitted' ||
          status === 'pending'
        ? 'bg-amber-50 text-amber-700'
        : status === 'rejected' ||
            status === 'suspended'
          ? 'bg-rose-50 text-rose-700'
          : 'bg-neutral-100 text-neutral-600';

  return (
    <span
      className={cn(
        'rounded-full px-2.5 py-1 text-xs font-semibold capitalize',
        tone,
      )}
    >
      {status || '—'}
    </span>
  );
}

/* =========================================================
   PROFILE
========================================================= */

function ProfilePanel({
  entity,
  record,
}: {
  entity: DetailEntity;
  record: ApiRecord;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">

      <InfoBlock
        title="Identity"
        rows={identityRows(
          entity,
          record,
        )}
      />

      <InfoBlock
        title="Compliance"
        rows={complianceRows(
          entity,
          record,
        )}
      />

      {entity === 'doctor' && (
        <DocumentBlock
          record={record}
        />
      )}

      {entity === 'support' && (
        <MessagesBlock
          record={record}
        />
      )}

    </div>
  );
}

/* =========================================================
   COMMERCIAL
========================================================= */

function CommercialPanel({
  entity,
  record,
}: {
  entity: DetailEntity;
  record: ApiRecord;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">

      <InfoBlock
        title="Pricing Snapshot"
        rows={pricingRows(
          entity,
          record,
        )}
      />

      <InfoBlock
        title="Fee Share / Wallet"
        rows={feeRows(
          entity,
          record,
        )}
      />

    </div>
  );
}

/* =========================================================
   ACTIVITY
========================================================= */

function ActivityPanel({
  entity,
  record,
}: {
  entity: DetailEntity;
  record: ApiRecord;
}) {
  const items =
    relatedActivity(
      entity,
      record,
    );

  return (
    <div className="space-y-3">

      {items.length === 0 && (
        <div className="rounded-lg bg-neutral-50 p-4 text-sm text-neutral-500">
          No related activity returned by the API.
        </div>
      )}

      {items.map(
        (
          item,
          index,
        ) => (
          <div
            key={`${item.title}-${index}`}
            className="flex items-start gap-3 rounded-lg border border-neutral-200 bg-white p-4"
          >

            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-50 text-xs font-bold text-primary-700">
              {index + 1}
            </div>

            <div className="min-w-0">

              <div className="text-sm font-semibold text-neutral-900">
                {item.title}
              </div>

              <div className="text-xs text-neutral-500">
                {item.meta}
              </div>

            </div>

          </div>
        ),
      )}

    </div>
  );
}

/* =========================================================
   AUDIT
========================================================= */

function AuditPanel({
  record,
}: {
  record: ApiRecord;
}) {
  return (
    <div className="space-y-3">

      <InfoBlock
        title="Record Audit Context"
        rows={[
          [
            'Record ID',
            text(
              record._id ||
                record.id,
              'Not returned',
            ),
          ],
          [
            'Created',
            dateText(
              record.createdAt,
            ),
          ],
          [
            'Last update',
            dateText(
              record.updatedAt,
            ),
          ],
          [
            'Status',
            text(
              record.status,
              'Not returned',
            ),
          ],
          [
            'Actor / owner',
            text(
              nested(
                record,
                'agent.fullName',
              ) ||
                nested(
                  record,
                  'processedBy.email',
                ) ||
                nested(
                  record,
                  'assignedTo.email',
                ),
              'System or unassigned',
            ),
          ],
        ]}
      />

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Full immutable audit history is available from Admin Audit Logs with module, record ID, actor, IP, request ID, and before/after values.
      </div>

    </div>
  );
}

/* =========================================================
   ACTION HELPERS
========================================================= */

function ActionGroup({
  label,
  danger = false,
  children,
}: {
  label: string;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>

      <div
        className={cn(
          'mb-2 px-1 text-[10px] font-bold uppercase tracking-[0.14em]',
          danger
            ? 'text-rose-400'
            : 'text-neutral-400',
        )}
      >
        {label}
      </div>

      <div className="space-y-2">
        {children}
      </div>

    </div>
  );
}

function ActionButton({
  def,
  onClick,
}: {
  def: {
    label: string;
    icon: React.ElementType;
    danger?: boolean;
    description: string;
  };
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex min-h-11 w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition',

        def.danger
          ? 'border-rose-200 bg-rose-50/60 text-rose-700 hover:border-rose-300 hover:bg-rose-50'
          : 'border-neutral-200 bg-white text-neutral-700 hover:border-primary-200 hover:bg-primary-50/50 hover:text-primary-700',
      )}
    >

      <span
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',

          def.danger
            ? 'bg-rose-100 text-rose-600'
            : 'bg-neutral-100 text-neutral-600 group-hover:bg-primary-100 group-hover:text-primary-700',
        )}
      >
        <def.icon className="h-4 w-4" />
      </span>

      <span className="min-w-0 flex-1">

        <span className="block text-sm font-semibold">
          {def.label}
        </span>

        <span
          className={cn(
            'mt-0.5 block text-[11px] leading-4',
            def.danger
              ? 'text-rose-500'
              : 'text-neutral-400',
          )}
        >
          {def.description}
        </span>

      </span>

      <span className="text-neutral-300 transition-transform group-hover:translate-x-0.5">
        →
      </span>

    </button>
  );
}

/* =========================================================
   REVIEW SIDE PANEL
========================================================= */

function ReviewSidePanel({
  entity,
  record,
  onRefresh,
}: {
  entity: DetailEntity;
  record: ApiRecord;
  onRefresh: () => void;
}) {
  const navigate = useNavigate();

  const [action, setAction] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState<string | null>(null);

  const doctorStatus = text(
    record.status,
    '',
  ).toLowerCase();

  const doctorQrActive =
    Boolean(
      record.qrCodeActive,
    );

  const canOperateQr =
    entity === 'doctor' &&
    doctorStatus === 'approved';

  const mutation = useMutation({
    mutationFn: async (
      form: FormData,
    ) => {
      if (!action) {
        return null;
      }

      const id = String(
        record._id ||
          record.id ||
          '',
      );

      return executeDetailAction(
        entity,
        action,
        id,
        form,
        record,
      );
    },

    onSuccess: async () => {
      const msg =
        action ===
        'Terminate Agent'
          ? 'Agent terminated.'
          : action ===
              'Suspend Agent'
            ? 'Agent suspended.'
            : 'Action completed.';

      setSuccess(msg);
      setAction(null);

      onRefresh();

      if (
        action ===
        'Terminate Agent'
      ) {
        setTimeout(
          () =>
            navigate(
              '/admin/agents',
            ),
          1500,
        );
      }
    },
  });

  const actionDefs: {
    label: string;
    icon: React.ElementType;
    danger?: boolean;
    description: string;
  }[] =
    entity === 'doctor'
      ? [
          {
            label:
              'Approve Doctor',
            icon: CheckCircle2,
            description:
              'Set approved status and configure commercial rules.',
          },

          {
            label:
              'Update KYC/Bank',
            icon: Landmark,
            description:
              'Update KYC decision and masked bank verification state.',
          },

          {
            label:
              'Request Documents',
            icon: FileText,
            description:
              'Ask doctor to upload missing KYC documents.',
          },

          {
            label:
              'Upload KYC Document',
            icon: FileText,
            description:
              'Upload one secure doctor KYC document through backend storage.',
          },

          ...(canOperateQr
            ? [
                {
                  label:
                    'Generate QR',
                  icon: QrCode,
                  description:
                    'Generate or refresh the doctor referral QR code.',
                },

                doctorQrActive
                  ? {
                      label:
                        'Disable QR',
                      icon: XCircle,
                      danger: true,
                      description:
                        'Disable new patient registrations from this doctor QR.',
                    }
                  : {
                      label:
                        'Reactivate QR',
                      icon: QrCode,
                      description:
                        'Reactivate patient registrations from this doctor QR.',
                    },
              ]
            : []),

          {
            label:
              'Reject',
            icon: XCircle,
            danger: true,
            description:
              'Reject this doctor application with a reason.',
          },

          {
            label:
              'Suspend',
            icon: XCircle,
            danger: true,
            description:
              'Suspend doctor access immediately.',
          },
        ]
      : entity === 'agent'
        ? [
            {
              label:
                'Edit Agent',
              icon: UserCheck,
              description:
                'Update agent profile, region, or contact details.',
            },

            {
              label:
                'Suspend Agent',
              icon: XCircle,
              danger: true,
              description:
                'Suspend agent login access immediately.',
            },

            {
              label:
                'Terminate Agent',
              icon: XCircle,
              danger: true,
              description:
                'Permanently terminate this agent account.',
            },
          ]
        : entity ===
            'withdrawal'
          ? [
              {
                label:
                  'Approve Withdrawal',
                icon: CheckCircle2,
                description:
                  'Approve and queue for payout.',
              },

              {
                label:
                  'Reject Withdrawal',
                icon: XCircle,
                danger: true,
                description:
                  'Reject with a reason.',
              },

              {
                label:
                  'Mark Paid',
                icon: CheckCircle2,
                description:
                  'Mark as paid with transaction reference.',
              },
            ]
          : entity ===
              'payment'
            ? [
                {
                  label:
                    'Verify Payment',
                  icon: CheckCircle2,
                  description:
                    'Manually verify gateway payment.',
                },

                {
                  label:
                    'Open Reconciliation',
                  icon: CheckCircle2,
                  description:
                    'Use the payments module.',
                },
              ]
            : entity ===
                'support'
              ? [
                  {
                    label:
                      'Reply',
                    icon: MessageSquare,
                    description:
                      'Send a reply to this ticket.',
                  },

                  {
                    label:
                      'Escalate',
                    icon: XCircle,
                    danger: true,
                    description:
                      'Escalate to high priority.',
                  },

                  {
                    label:
                      'Resolve',
                    icon: CheckCircle2,
                    description:
                      'Mark ticket as resolved.',
                  },
                ]
              : [
                  {
                    label:
                      'Edit Record',
                    icon: UserCheck,
                    description:
                      'Edit this record.',
                  },

                  {
                    label:
                      'View Audit',
                    icon: FileText,
                    description:
                      'View audit log.',
                  },
                ];

  const currentDef =
    actionDefs.find(
      (a) => a.label === action,
    );

  const showsReasonField = [
    'Reject',
    'Suspend',
    'Request Documents',
    'Reject Withdrawal',
    'Suspend Agent',
    'Reply',
    'Escalate',
    'Resolve',
  ].includes(action ?? '');

  const requiresReason = [
    'Reject',
    'Suspend',
    'Request Documents',
    'Reject Withdrawal',
    'Suspend Agent',
  ].includes(action ?? '');

  return (
    <>
      {/* ACTION PANEL */}

      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">

        <div className="border-b border-neutral-100 bg-neutral-50/60 px-5 py-4">

          <div className="flex items-center gap-3">

            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
              <UserCheck className="h-4 w-4" />
            </div>

            <div>

              <h2 className="text-sm font-bold text-neutral-950">
                {entity === 'doctor'
                  ? 'Doctor Actions'
                  : `Manage ${entityLabel(
                      entity,
                    )}`}
              </h2>

              <p className="mt-0.5 text-xs text-neutral-500">
                Manage this record safely
              </p>

            </div>

          </div>

        </div>

        {success && (
          <div className="mx-4 mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-700">

            <div className="flex items-center gap-2">

              <CheckCircle2 className="h-4 w-4 shrink-0" />

              {success}

            </div>

          </div>
        )}

        <div className="p-4">

          {entity ===
          'doctor' ? (

            <div className="space-y-5">

              <ActionGroup label="Primary">

                {actionDefs
                  .filter(
                    (def) =>
                      [
                        'Approve Doctor',
                        'Update KYC/Bank',
                      ].includes(
                        def.label,
                      ),
                  )
                  .map((def) => (
                    <ActionButton
                      key={def.label}
                      def={def}
                      onClick={() => {
                        setSuccess(null);
                        setAction(
                          def.label,
                        );
                      }}
                    />
                  ))}

              </ActionGroup>

              <ActionGroup label="Documents & QR">

                {actionDefs
                  .filter(
                    (def) =>
                      [
                        'Request Documents',
                        'Upload KYC Document',
                        'Generate QR',
                        'Disable QR',
                        'Reactivate QR',
                      ].includes(
                        def.label,
                      ),
                  )
                  .map((def) => (
                    <ActionButton
                      key={def.label}
                      def={def}
                      onClick={() => {
                        setSuccess(null);
                        setAction(
                          def.label,
                        );
                      }}
                    />
                  ))}

              </ActionGroup>

              <ActionGroup
                label="Danger Zone"
                danger
              >

                {actionDefs
                  .filter(
                    (def) =>
                      [
                        'Reject',
                        'Suspend',
                      ].includes(
                        def.label,
                      ),
                  )
                  .map((def) => (
                    <ActionButton
                      key={def.label}
                      def={def}
                      onClick={() => {
                        setSuccess(null);
                        setAction(
                          def.label,
                        );
                      }}
                    />
                  ))}

              </ActionGroup>

            </div>

          ) : (

            <div className="space-y-2">

              {actionDefs.map(
                (def) => (
                  <ActionButton
                    key={def.label}
                    def={def}
                    onClick={() => {
                      setSuccess(null);
                      setAction(
                        def.label,
                      );
                    }}
                  />
                ),
              )}

            </div>

          )}

        </div>
      </div>

      {/* QUICK INFO */}

      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">

        <div className="border-b border-neutral-100 px-5 py-4">

          <h2 className="text-sm font-bold text-neutral-950">
            Quick Info
          </h2>

          <p className="mt-0.5 text-xs text-neutral-500">
            Key values at a glance
          </p>

        </div>

        <div className="divide-y divide-neutral-100">

          {decisionRows(
            entity,
            record,
          ).map(
            (
              [label, value],
            ) => (
              <div
                key={label}
                className="flex items-center justify-between gap-4 px-5 py-3.5 text-sm"
              >

                <span className="text-neutral-500">
                  {label}
                </span>

                <span className="max-w-[58%] truncate text-right font-semibold text-neutral-950">
                  {value}
                </span>

              </div>
            ),
          )}

        </div>
      </div>

      {/* MODAL */}

      <Modal
        isOpen={!!action}
        onClose={() =>
          setAction(null)
        }
        title={
          action ?? undefined
        }
        size="lg"
      >

        {action ===
        'Edit Agent' ? (

          <AgentRecordForm
            row={record}
            onCancel={() =>
              setAction(null)
            }
            onSaved={() => {
              setSuccess(
                'Agent updated.',
              );

              setAction(null);

              onRefresh();
            }}
          />

        ) : (

          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();

              mutation.mutate(
                new FormData(
                  e.currentTarget,
                ),
              );
            }}
          >

            {currentDef?.danger ? (

              <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">

                <span className="font-bold">
                  Destructive action —{' '}
                </span>

                {currentDef.description}

              </div>

            ) : (

              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">

                {currentDef?.description ??
                  'This action is audit-logged on the backend.'}

              </div>

            )}

            {(action ===
              'Suspend Agent' ||
              action ===
                'Terminate Agent') && (

              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">

                <span className="font-semibold">
                  Agent:
                </span>{' '}

                {text(
                  record.fullName,
                  '—',
                )}{' '}

                (
                {text(
                  record.agentId,
                  '—',
                )}
                )

                <br />

                <span className="font-semibold">
                  Mobile:
                </span>{' '}

                {text(
                  record.mobile,
                  '—',
                )}

              </div>

            )}

            {action ===
              'Approve Doctor' && (

              <div className="grid gap-3 sm:grid-cols-2">

                <DetailInput
                  name="approvedPatientFee"
                  label="Patient fee"
                  type="number"
                  defaultValue={text(
                    record.approvedPatientFee ||
                      record.requestedPatientFee ||
                      0,
                    '0',
                  )}
                />

                <DetailInput
                  name="feeSharePercentage"
                  label="Fee share %"
                  type="number"
                  defaultValue={text(
                    record.feeSharePercentage ||
                      0,
                    '0',
                  )}
                />

                <DetailInput
                  name="feeShareHoldingDays"
                  label="Holding days"
                  type="number"
                  defaultValue={text(
                    record.feeShareHoldingDays ||
                      15,
                    '15',
                  )}
                />

                <DetailSelect
                  name="revenueModel"
                  label="Revenue model"
                  defaultValue={text(
                    record.revenueModel,
                    'split',
                  )}
                  options={[
                    [
                      'split',
                      'Split Model',
                    ],
                    [
                      'platform_fee',
                      'Platform Fee Model',
                    ],
                  ]}
                />

                <DetailSelect
                  name="feeShareType"
                  label="Fee share type"
                  defaultValue={text(
                    record.feeShareType,
                    'percentage',
                  )}
                  options={[
                    [
                      'percentage',
                      'Percentage',
                    ],
                    [
                      'fixed',
                      'Fixed Amount',
                    ],
                    [
                      'slab',
                      'Slab Based',
                    ],
                  ]}
                />

                <DetailInput
                  name="fixedFeeShareAmount"
                  label="Fixed fee share amount"
                  type="number"
                  defaultValue={text(
                    record.fixedFeeShareAmount ||
                      0,
                    '0',
                  )}
                />

                <DetailInput
                  name="password"
                  label="Optional login password"
                  placeholder="Leave blank to auto-generate"
                />

              </div>

            )}

            {action ===
              'Update KYC/Bank' && (

              <div className="grid gap-3 sm:grid-cols-2">

                <DetailSelect
                  name="kycStatus"
                  label="KYC status"
                  defaultValue={text(
                    record.kycStatus,
                    'pending',
                  )}
                  options={[
                    [
                      'pending',
                      'Pending',
                    ],
                    [
                      'submitted',
                      'Submitted',
                    ],
                    [
                      'approved',
                      'Approved',
                    ],
                    [
                      'rejected',
                      'Rejected',
                    ],
                  ]}
                />

                <DetailSelect
                  name="bankVerified"
                  label="Bank verified"
                  defaultValue={
                    record.bankVerified
                      ? 'true'
                      : 'false'
                  }
                  options={[
                    [
                      'false',
                      'No',
                    ],
                    [
                      'true',
                      'Yes',
                    ],
                  ]}
                />

                <DetailInput
                  name="bankAccountHolder"
                  label="Account holder"
                  defaultValue={text(
                    record.bankAccountHolder,
                    '',
                  )}
                />

                <DetailInput
                  name="bankName"
                  label="Bank name"
                  defaultValue={text(
                    record.bankName,
                    '',
                  )}
                />

                <DetailInput
                  name="branchName"
                  label="Branch name"
                  defaultValue={text(
                    record.branchName,
                    '',
                  )}
                />

                <DetailInput
                  name="ifscCode"
                  label="IFSC code"
                  defaultValue={text(
                    record.ifscCode,
                    '',
                  )}
                />

                <DetailInput
                  name="upiId"
                  label="UPI ID"
                  defaultValue={text(
                    record.upiId,
                    '',
                  )}
                />

                <DetailInput
                  name="panNumber"
                  label="PAN number"
                  defaultValue={text(
                    record.panNumber,
                    '',
                  )}
                />

                <DetailInput
                  name="bankAccountNumber"
                  label="Replace bank account number"
                  placeholder={text(
                    record.bankAccountNumber,
                    'Leave blank to keep existing',
                  )}
                />

              </div>

            )}

            {action ===
              'Upload KYC Document' && (

              <div className="space-y-3">

                <DetailSelect
                  name="documentType"
                  label="Document type"
                  defaultValue="identity_proof"
                  options={[
                    [
                      'identity_proof',
                      'Identity proof',
                    ],
                    [
                      'address_proof',
                      'Address proof',
                    ],
                    [
                      'medical_registration',
                      'Medical registration',
                    ],
                    [
                      'cancelled_cheque',
                      'Cancelled cheque',
                    ],
                    [
                      'pan',
                      'PAN',
                    ],
                    [
                      'profile_photo',
                      'Profile photo',
                    ],
                    [
                      'other',
                      'Other',
                    ],
                  ]}
                />

                <label className="block">

                  <span className="text-sm font-semibold text-neutral-700">
                    Document file
                  </span>

                  <input
                    name="document"
                    type="file"
                    required
                    accept="image/*,.pdf"
                    className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary-50 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-primary-700 focus:border-primary-500 focus:ring-primary-500"
                  />

                </label>

                <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-600">
                  Backend limit is 5 MB. In production, this stores private files through S3 and returns signed access URLs from the detail page.
                </div>

              </div>

            )}

            {(
              action ===
                'Generate QR' ||
              action ===
                'Disable QR' ||
              action ===
                'Reactivate QR'
            ) && (

              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">

                <div className="font-semibold text-neutral-900">
                  {text(
                    record.fullName,
                    'Doctor',
                  )}
                  {' '}
                  (
                  {text(
                    record.doctorId,
                    'Not assigned',
                  )}
                  )
                </div>

                <p className="mt-1">

                  {action ===
                  'Generate QR'
                    ? 'This refreshes the doctor referral QR code and keeps it active for approved doctors.'
                    : action ===
                        'Disable QR'
                      ? 'This disables new patient registrations through this QR code.'
                      : 'This reactivates patient registrations through this QR code.'}

                </p>

              </div>

            )}

            {action ===
              'Mark Paid' && (

              <DetailInput
                name="transactionReference"
                label="Payout transaction reference"
                required
                placeholder="Bank/UPI payout reference"
              />

            )}

            {showsReasonField && (

              <label className="block">

                <span className="text-sm font-semibold text-neutral-700">

                  {action === 'Reply'
                    ? 'Reply message'
                    : 'Reason / admin note'}

                  {requiresReason && (
                    <span className="ml-0.5 text-rose-500">
                      *
                    </span>
                  )}

                </span>

                <textarea
                  name="reason"
                  required={
                    requiresReason
                  }
                  className="mt-2 min-h-24 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500"
                  placeholder={
                    action === 'Reply'
                      ? 'Type your reply...'
                      : 'Enter reason for audit trail'
                  }
                />

              </label>

            )}

            {mutation.error && (

              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">
                {detailErrorMessage(
                  mutation.error,
                )}
              </div>

            )}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">

              <button
                type="button"
                onClick={() =>
                  setAction(null)
                }
                disabled={
                  mutation.isPending
                }
                className="rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-semibold text-neutral-700"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={
                  mutation.isPending ||
                  action ===
                    'Open Reconciliation'
                }
                className={cn(
                  'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60',

                  currentDef?.danger
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-primary-600 hover:bg-primary-700',
                )}
              >
                {mutation.isPending
                  ? 'Processing...'
                  : action ===
                      'Open Reconciliation'
                    ? 'Use payments module'
                    : `Confirm ${action}`}
              </button>

            </div>

          </form>
        )}

      </Modal>
    </>
  );
}

/* =========================================================
   INPUTS
========================================================= */

function DetailInput({
  name,
  label,
  type = 'text',
  defaultValue,
  placeholder,
  required,
}: {
  name: string;
  label: string;
  type?: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">

      <span className="text-sm font-semibold text-neutral-700">
        {label}
      </span>

      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500"
      />

    </label>
  );
}

function DetailSelect({
  name,
  label,
  defaultValue,
  options,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  options: [string, string][];
}) {
  return (
    <label className="block">

      <span className="text-sm font-semibold text-neutral-700">
        {label}
      </span>

      <select
        name={name}
        defaultValue={defaultValue}
        className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500"
      >
        {options.map(
          ([value, labelText]) => (
            <option
              key={value}
              value={value}
            >
              {labelText}
            </option>
          ),
        )}
      </select>

    </label>
  );
}

/* =========================================================
   API ACTIONS
========================================================= */

function executeDetailAction(
  entity: DetailEntity,
  action: string,
  id: string,
  form: FormData,
  record: ApiRecord,
) {
  const reason = text(
    form.get('reason'),
    '',
  );

  if (entity === 'doctor') {

    if (
      action ===
      'Approve Doctor'
    ) {
      return apiClient.post(
        `/doctors/${id}/approve`,
        {
          approvedPatientFee:
            Number(
              form.get(
                'approvedPatientFee',
              ) ||
                record.approvedPatientFee ||
                0,
            ),

          feeSharePercentage:
            Number(
              form.get(
                'feeSharePercentage',
              ) ||
                record.feeSharePercentage ||
                0,
            ),

          feeShareHoldingDays:
            Number(
              form.get(
                'feeShareHoldingDays',
              ) ||
                record.feeShareHoldingDays ||
                15,
            ),

          revenueModel:
            form.get(
              'revenueModel',
            ) ||
            record.revenueModel ||
            'split',

          feeShareType:
            form.get(
              'feeShareType',
            ) ||
            record.feeShareType ||
            'percentage',

          fixedFeeShareAmount:
            Number(
              form.get(
                'fixedFeeShareAmount',
              ) ||
                record.fixedFeeShareAmount ||
                0,
            ),

          password:
            String(
              form.get(
                'password',
              ) || '',
            ) || undefined,
        },
      );
    }

    if (
      action ===
      'Update KYC/Bank'
    ) {
      return apiClient.patch(
        `/doctors/${id}/kyc-bank`,
        compactPayload({
          kycStatus:
            form.get(
              'kycStatus',
            ),

          bankVerified:
            form.get(
              'bankVerified',
            ) === 'true',

          bankAccountHolder:
            form.get(
              'bankAccountHolder',
            ),

          bankAccountNumber:
            form.get(
              'bankAccountNumber',
            ),

          bankName:
            form.get(
              'bankName',
            ),

          branchName:
            form.get(
              'branchName',
            ),

          ifscCode:
            form.get(
              'ifscCode',
            ),

          upiId:
            form.get(
              'upiId',
            ),

          panNumber:
            form.get(
              'panNumber',
            ),
        }),
      );
    }

    if (
      action ===
      'Upload KYC Document'
    ) {
      const payload =
        new FormData();

      payload.append(
        'documentType',
        String(
          form.get(
            'documentType',
          ) || 'other',
        ),
      );

      const document =
        form.get(
          'document',
        );

      if (
        document instanceof File &&
        document.size > 0
      ) {
        payload.append(
          'document',
          document,
        );
      }

      return apiClient.post(
        `/doctors/${id}/kyc-documents`,
        payload,
        {
          headers: {
            'Content-Type':
              'multipart/form-data',
          },
        },
      );
    }

    if (
      action ===
      'Generate QR'
    ) {
      return apiClient.post(
        `/doctors/${id}/qr-code`,
      );
    }

    if (
      action ===
      'Disable QR'
    ) {
      return apiClient.post(
        `/doctors/${id}/disable-qr`,
      );
    }

    if (
      action ===
      'Reactivate QR'
    ) {
      return apiClient.post(
        `/doctors/${id}/reactivate-qr`,
      );
    }

    if (
      action ===
      'Suspend'
    ) {
      return apiClient.post(
        `/doctors/${id}/suspend`,
        {
          reason,
        },
      );
    }

    if (
      action ===
      'Reject'
    ) {
      return apiClient.post(
        `/doctors/${id}/reject`,
        {
          reason,
        },
      );
    }

    if (
      action ===
      'Request Documents'
    ) {
      return apiClient.post(
        `/doctors/${id}/request-documents`,
        {
          reason,
        },
      );
    }
  }

  if (entity === 'agent') {

    if (
      action ===
      'Suspend Agent'
    ) {
      return apiClient.put(
        `/agents/${id}`,
        {
          status:
            'suspended',
        },
      );
    }

    if (
      action ===
      'Terminate Agent'
    ) {
      return apiClient.delete(
        `/agents/${id}`,
      );
    }
  }

  if (
    entity ===
    'withdrawal'
  ) {

    if (
      action ===
      'Reject Withdrawal'
    ) {
      return apiClient.post(
        `/withdrawals/${id}/reject`,
        {
          reason,
        },
      );
    }

    if (
      action ===
      'Mark Paid'
    ) {
      return apiClient.post(
        `/withdrawals/${id}/paid`,
        {
          transactionReference:
            form.get(
              'transactionReference',
            ),
        },
      );
    }
  }

  if (
    entity ===
    'support'
  ) {

    if (
      action ===
      'Reply'
    ) {
      return apiClient.post(
        `/support/${id}/messages`,
        {
          message:
            reason,
        },
      );
    }

    if (
      action ===
      'Escalate'
    ) {
      return apiClient.patch(
        `/support/${id}/status`,
        {
          status:
            'in_progress',
          priority:
            'high',
          adminResponse:
            reason,
        },
      );
    }

    if (
      action ===
      'Resolve'
    ) {
      return apiClient.patch(
        `/support/${id}/status`,
        {
          status:
            'resolved',
          adminResponse:
            reason,
          resolutionNotes:
            reason,
        },
      );
    }
  }

  return Promise.resolve(null);
}

function compactPayload(
  payload: ApiRecord,
) {
  return Object.fromEntries(
    Object.entries(
      payload,
    ).filter(
      ([, value]) =>
        value !==
          undefined &&
        value !== null &&
        value !== '',
    ),
  );
}

/* =========================================================
   INFO BLOCK
========================================================= */

function InfoBlock({
  title,
  rows,
}: {
  title: string;
  rows: [string, string][];
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">

      <div className="border-b border-neutral-100 bg-neutral-50/40 px-5 py-4">

        <h3 className="text-sm font-bold text-neutral-950">
          {title}
        </h3>

      </div>

      <div className="divide-y divide-neutral-100">

        {rows.map(
          (
            [label, value],
          ) => (

            <div
              key={label}
              className="flex items-start justify-between gap-4 px-5 py-3.5 text-sm"
            >

              <span className="shrink-0 text-neutral-500">
                {label}
              </span>

              <span className="max-w-[65%] break-words text-right font-semibold text-neutral-900">
                {value}
              </span>

            </div>

          ),
        )}

      </div>

    </div>
  );
}

/* =========================================================
   DOCUMENTS
========================================================= */

function DocumentBlock({
  record,
}: {
  record: ApiRecord;
}) {
  const [error, setError] =
    useState<string | null>(
      null,
    );

  const doctorId = String(
    record._id ||
      record.id ||
      '',
  );

  const kycDocs =
    Array.isArray(
      record.kycDocuments,
    )
      ? (record.kycDocuments as ApiRecord[])
      : [];

  const legacyDocs = [
    record.identityProof,
    record.addressProof,
    record.medicalRegDoc,
    record.cancelledCheque,
  ].filter(Boolean);

  const openDocument =
    async (
      documentId: string,
    ) => {
      try {
        setError(null);

        const response =
          await apiClient.get(
            `/doctors/${doctorId}/kyc-documents/${documentId}/access`,
          );

        const url = text(
          (
            response.data as ApiRecord
          ).url,
          '',
        );

        if (url) {
          window.open(
            url,
            '_blank',
            'noopener,noreferrer',
          );
        }
      } catch (err) {
        setError(
          detailErrorMessage(
            err,
          ),
        );
      }
    };

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 lg:col-span-2">

      <h3 className="text-sm font-bold text-neutral-900">
        KYC Documents
      </h3>

      <p className="mt-1 text-xs text-neutral-500">
        Documents open through backend-generated short-lived URLs when uploaded through the KYC document API.
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">

        {kycDocs.length === 0 &&
          legacyDocs.length === 0 && (
            <div className="rounded-lg bg-neutral-50 p-4 text-sm text-neutral-500">
              No document references returned.
            </div>
          )}

        {kycDocs.map(
          (doc) => (
            <button
              key={String(
                doc._id,
              )}
              type="button"
              onClick={() =>
                openDocument(
                  String(
                    doc._id,
                  ),
                )
              }
              className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 p-3 text-left text-sm transition hover:border-primary-200 hover:bg-primary-50/40"
            >

              <span className="min-w-0">

                <span className="block font-semibold text-neutral-900">
                  {text(
                    doc.documentType,
                    'KYC document',
                  )}
                </span>

                <span className="block truncate text-xs text-neutral-500">
                  {text(
                    doc.originalName,
                    text(
                      doc.storageProvider,
                      'stored document',
                    ),
                  )}
                </span>

              </span>

              <ExternalLink className="h-4 w-4 shrink-0 text-neutral-500" />

            </button>
          ),
        )}

        {kycDocs.length === 0 &&
          legacyDocs.map(
            (
              doc,
              index,
            ) => (
              <div
                key={`${String(
                  doc,
                )}-${index}`}
                className="rounded-lg border border-neutral-200 p-3 text-sm"
              >

                <div className="font-semibold text-neutral-900">
                  Legacy document{' '}
                  {index + 1}
                </div>

                <div className="mt-1 break-all text-xs text-neutral-500">
                  {String(
                    doc,
                  )}
                </div>

              </div>
            ),
          )}

      </div>

      {error && (
        <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">
          {error}
        </div>
      )}

    </div>
  );
}

/* =========================================================
   MESSAGES
========================================================= */

function MessagesBlock({
  record,
}: {
  record: ApiRecord;
}) {
  const messages =
    Array.isArray(
      record.messages,
    )
      ? (record.messages as ApiRecord[])
      : [];

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 lg:col-span-2">

      <h3 className="text-sm font-bold text-neutral-900">
        Conversation
      </h3>

      <div className="mt-4 space-y-3">

        {messages.length === 0 && (
          <div className="rounded-lg bg-neutral-50 p-4 text-sm text-neutral-500">
            No ticket messages returned.
          </div>
        )}

        {messages.map(
          (
            message,
            index,
          ) => (
            <div
              key={index}
              className="rounded-lg border border-neutral-200 p-3"
            >

              <div className="text-xs font-bold uppercase text-neutral-500">
                {text(
                  message.senderRole,
                  'Message',
                )}
              </div>

              <div className="mt-1 text-sm text-neutral-800">
                {text(
                  message.message,
                  'No message body',
                )}
              </div>

            </div>
          ),
        )}

      </div>

    </div>
  );
}

/* =========================================================
   STATUS
========================================================= */

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: DetailTone;
}) {
  const toneClass =
    tone === 'success'
      ? 'bg-emerald-50 text-emerald-700'
      : tone === 'warning'
        ? 'bg-amber-50 text-amber-700'
        : tone === 'danger'
          ? 'bg-rose-50 text-rose-700'
          : 'bg-neutral-100 text-neutral-700';

  return (
    <span
      className={cn(
        'inline-flex rounded-full px-3 py-1 text-xs font-bold',
        toneClass,
      )}
    >
      {label}
    </span>
  );
}

/* =========================================================
   METRICS
========================================================= */

function metricCards(
  entity: DetailEntity,
  record: ApiRecord,
) {
  if (entity === 'agent') {
    return [
      {
        label: 'Doctors',
        value: text(
          nested(
            record,
            'metrics.doctorsRegistered',
          ),
          '0',
        ),
        icon: Stethoscope,
        tone:
          'bg-teal-50 text-teal-700',
      },

      {
        label: 'Patients',
        value: text(
          nested(
            record,
            'metrics.patientsGenerated',
          ),
          '0',
        ),
        icon: HeartPulse,
        tone:
          'bg-emerald-50 text-emerald-700',
      },

      {
        label: 'Paid Patients',
        value: text(
          nested(
            record,
            'metrics.paidPatients',
          ),
          '0',
        ),
        icon: CreditCard,
        tone:
          'bg-sky-50 text-sky-700',
      },

      {
        label: 'Revenue',
        value: money(
          nested(
            record,
            'metrics.revenueGenerated',
          ),
        ),
        icon: Wallet,
        tone:
          'bg-violet-50 text-violet-700',
      },
    ];
  }

  if (entity === 'patient') {
    return [
      {
        label: 'Programs',
        value: String(
          arrayCount(
            record.programs,
          ),
        ),
        icon: ClipboardCheck,
        tone:
          'bg-teal-50 text-teal-700',
      },

      {
        label: 'Payments',
        value: String(
          arrayCount(
            record.payments,
          ),
        ),
        icon: CreditCard,
        tone:
          'bg-sky-50 text-sky-700',
      },

      {
        label: 'Assessments',
        value: String(
          arrayCount(
            record.assessments,
          ),
        ),
        icon: HeartPulse,
        tone:
          'bg-rose-50 text-rose-700',
      },

      {
        label: 'Mobile',
        value: text(
          record.mobileVerified,
          'false',
        ),
        icon: ShieldCheck,
        tone:
          'bg-emerald-50 text-emerald-700',
      },
    ];
  }

  if (entity === 'payment') {
    return [
      {
        label: 'Paid Amount',
        value: money(
          record.paidAmount ||
            record.finalPaidAmount,
        ),
        icon: CreditCard,
        tone:
          'bg-sky-50 text-sky-700',
      },

      {
        label: 'Doctor Share',
        value: money(
          record.doctorFeeShare,
        ),
        icon: Wallet,
        tone:
          'bg-violet-50 text-violet-700',
      },

      {
        label: 'Platform Share',
        value: money(
          record.platformShare,
        ),
        icon: Banknote,
        tone:
          'bg-teal-50 text-teal-700',
      },

      {
        label: 'Refund',
        value: money(
          record.refundAmount,
        ),
        icon: FileText,
        tone:
          'bg-amber-50 text-amber-700',
      },
    ];
  }

  if (entity === 'withdrawal') {
    return [
      {
        label: 'Requested',
        value: money(
          record.requestedAmount,
        ),
        icon: Wallet,
        tone:
          'bg-violet-50 text-violet-700',
      },

      {
        label: 'Available',
        value: money(
          nested(
            record,
            'wallet.availableBalance',
          ),
        ),
        icon: Banknote,
        tone:
          'bg-emerald-50 text-emerald-700',
      },

      {
        label: 'Paid',
        value: money(
          nested(
            record,
            'wallet.paidBalance',
          ),
        ),
        icon: CreditCard,
        tone:
          'bg-sky-50 text-sky-700',
      },

      {
        label: 'Doctor Status',
        value: text(
          nested(
            record,
            'doctor.status',
          ),
          'Unknown',
        ),
        icon: ShieldCheck,
        tone:
          'bg-teal-50 text-teal-700',
      },
    ];
  }

  if (entity === 'support') {
    return [
      {
        label: 'Priority',
        value: text(
          record.priority,
          'Normal',
        ),
        icon: MessageSquare,
        tone:
          'bg-amber-50 text-amber-700',
      },

      {
        label: 'Category',
        value: text(
          record.category,
          'Support',
        ),
        icon: FileText,
        tone:
          'bg-sky-50 text-sky-700',
      },

      {
        label: 'Messages',
        value: String(
          arrayCount(
            record.messages,
          ),
        ),
        icon: ClipboardCheck,
        tone:
          'bg-teal-50 text-teal-700',
      },

      {
        label: 'User Type',
        value: text(
          record.userType,
          'User',
        ),
        icon: UserCheck,
        tone:
          'bg-violet-50 text-violet-700',
      },
    ];
  }

  return [
    {
      label: 'QR Scans',
      value: text(
        nested(
          record,
          'metrics.qrScans',
        ),
        '0',
      ),
      icon: QrCode,
      tone:
        'bg-emerald-50 text-emerald-700',
    },

    {
      label: 'Patients',
      value: text(
        nested(
          record,
          'metrics.patients',
        ),
        '0',
      ),
      icon: HeartPulse,
      tone:
        'bg-sky-50 text-sky-700',
    },

    {
      label: 'Revenue',
      value: money(
        nested(
          record,
          'metrics.revenueGenerated',
        ),
      ),
      icon: CreditCard,
      tone:
        'bg-teal-50 text-teal-700',
    },

    {
      label: 'Fee Share',
      value: money(
        nested(
          record,
          'metrics.feeShareGenerated',
        ),
      ),
      icon: Wallet,
      tone:
        'bg-violet-50 text-violet-700',
    },
  ];
}

/* =========================================================
   ROW HELPERS
========================================================= */

function overviewRows(
  entity: DetailEntity,
  record: ApiRecord,
): [string, string][] {
  return [
    [
      'Record ID',
      text(
        record._id ||
          record.id,
        'Not returned',
      ),
    ],

    [
      'Business ID',
      text(
        record.doctorId ||
          record.agentId ||
          record.patientId ||
          record.ticketId ||
          record.invoiceNumber,
        'Not assigned',
      ),
    ],

    [
      'Status',
      text(
        record.status,
        'Not returned',
      ),
    ],

    [
      'Created',
      dateText(
        record.createdAt,
      ),
    ],

    [
      'Updated',
      dateText(
        record.updatedAt,
      ),
    ],

    [
      'Workspace',
      entityLabel(entity),
    ],
  ];
}

function linkedRows(
  entity: DetailEntity,
  record: ApiRecord,
): [string, string][] {

  if (entity === 'doctor') {
    return [
      [
        'Agent',
        text(
          nested(
            record,
            'agent.fullName',
          ),
          'Unassigned',
        ),
      ],

      [
        'Clinic',
        text(
          record.clinicName,
          'Not returned',
        ),
      ],

      [
        'City',
        text(
          record.city,
          'Not returned',
        ),
      ],

      [
        'QR Active',
        text(
          record.qrCodeActive,
          'Not returned',
        ),
      ],
    ];
  }

  if (entity === 'agent') {
    return [
      [
        'Doctors',
        String(
          arrayCount(
            record.doctors,
          ),
        ),
      ],

      [
        'Region',
        text(
          record.assignedRegion,
          'Not returned',
        ),
      ],

      [
        'Reporting',
        text(
          record.reportingPerson,
          'Not returned',
        ),
      ],

      [
        'City',
        text(
          record.city,
          'Not returned',
        ),
      ],
    ];
  }

  if (entity === 'patient') {
    return [
      [
        'Doctor',
        text(
          nested(
            record,
            'referringDoctor.fullName',
          ),
          'Unassigned',
        ),
      ],

      [
        'Clinic',
        text(
          nested(
            record,
            'referringDoctor.clinicName',
          ),
          'Not returned',
        ),
      ],

      [
        'Referral locked',
        text(
          record.referralLocked,
          'Not returned',
        ),
      ],

      [
        'Preferred language',
        text(
          record.preferredLanguage,
          'Not returned',
        ),
      ],
    ];
  }

  return [
    [
      'Doctor',
      text(
        nested(
          record,
          'doctor.fullName',
        ),
        'Not linked',
      ),
    ],

    [
      'Patient',
      text(
        nested(
          record,
          'patient.fullName',
        ),
        'Not linked',
      ),
    ],

    [
      'Program',
      text(
        nested(
          record,
          'program.name',
        ),
        'Not linked',
      ),
    ],

    [
      'Transaction',
      text(
        record.gatewayTransactionId ||
          record.payoutTransactionRef,
        'Not returned',
      ),
    ],
  ];
}

function identityRows(
  entity: DetailEntity,
  record: ApiRecord,
): [string, string][] {

  if (entity === 'payment') {
    return [
      [
        'Invoice',
        text(
          record.invoiceNumber,
          'Not returned',
        ),
      ],

      [
        'Gateway transaction',
        text(
          record.gatewayTransactionId,
          'Not returned',
        ),
      ],

      [
        'Method',
        text(
          record.paymentMethod,
          'Not returned',
        ),
      ],

      [
        'Paid date',
        dateText(
          record.paymentDate ||
            record.createdAt,
        ),
      ],
    ];
  }

  if (
    entity ===
    'withdrawal'
  ) {
    return [
      [
        'Doctor',
        text(
          nested(
            record,
            'doctor.fullName',
          ),
          'Not linked',
        ),
      ],

      [
        'Doctor ID',
        text(
          nested(
            record,
            'doctor.doctorId',
          ),
          'Not returned',
        ),
      ],

      [
        'Bank holder',
        text(
          record.bankAccountHolder,
          'Not returned',
        ),
      ],

      [
        'UPI ID',
        text(
          record.upiId,
          'Not returned',
        ),
      ],
    ];
  }

  if (
    entity ===
    'support'
  ) {
    return [
      [
        'Ticket',
        text(
          record.ticketId,
          'Not returned',
        ),
      ],

      [
        'Subject',
        text(
          record.subject,
          'Not returned',
        ),
      ],

      [
        'User',
        text(
          record.userName ||
            nested(
              record,
              'patient.fullName',
            ) ||
            nested(
              record,
              'doctor.fullName',
            ) ||
            nested(
              record,
              'agent.fullName',
            ),
          'Not linked',
        ),
      ],

      [
        'Category',
        text(
          record.category,
          'Not returned',
        ),
      ],
    ];
  }

  return [
    [
      'Name',
      text(
        record.fullName,
        'Not returned',
      ),
    ],

    [
      'Mobile',
      text(
        record.mobile,
        'Not returned',
      ),
    ],

    [
      'Email',
      text(
        record.email,
        'Not returned',
      ),
    ],

    [
      'City',
      text(
        record.city,
        'Not returned',
      ),
    ],
  ];
}

function complianceRows(
  entity: DetailEntity,
  record: ApiRecord,
): [string, string][] {

  if (entity === 'patient') {
    return [
      [
        'Mobile verified',
        text(
          record.mobileVerified,
          'Not returned',
        ),
      ],

      [
        'Consent accepted',
        text(
          record.consentAccepted,
          'Not returned',
        ),
      ],

      [
        'Emergency contact',
        text(
          record.emergencyContact,
          'Not returned',
        ),
      ],

      [
        'Data access',
        'Admin restricted',
      ],
    ];
  }

  if (entity === 'payment') {
    return [
      [
        'Order',
        text(
          nested(
            record,
            'order.orderId',
          ),
          'Not returned',
        ),
      ],

      [
        'Payment status',
        text(
          record.status,
          'Not returned',
        ),
      ],

      [
        'Refund status',
        text(
          record.refundStatus,
          'Not returned',
        ),
      ],

      [
        'Gateway verified',
        text(
          record.gatewayVerified,
          'Not returned',
        ),
      ],
    ];
  }

  if (
    entity ===
    'withdrawal'
  ) {
    return [
      [
        'KYC',
        text(
          nested(
            record,
            'doctor.kycStatus',
          ),
          'Not returned',
        ),
      ],

      [
        'Bank verified',
        text(
          nested(
            record,
            'doctor.bankVerified',
          ),
          'Not returned',
        ),
      ],

      [
        'Processed by',
        text(
          nested(
            record,
            'processedBy.email',
          ),
          'Not processed',
        ),
      ],

      [
        'Processed at',
        dateText(
          record.processedAt,
        ),
      ],
    ];
  }

  if (
    entity ===
    'support'
  ) {
    return [
      [
        'Priority',
        text(
          record.priority,
          'Not returned',
        ),
      ],

      [
        'Assigned to',
        text(
          nested(
            record,
            'assignedTo.email',
          ),
          'Unassigned',
        ),
      ],

      [
        'Last response',
        dateText(
          record.lastResponseAt,
        ),
      ],

      [
        'Closed at',
        dateText(
          record.closedAt,
        ),
      ],
    ];
  }

  return [
    [
      'KYC',
      text(
        record.kycStatus,
        'Not returned',
      ),
    ],

    [
      'Bank',
      text(
        record.bankVerified,
        'Not returned',
      ),
    ],

    [
      'Documents',
      documentCount(record),
    ],

    [
      'Data access',
      'Role restricted',
    ],
  ];
}

function pricingRows(
  entity: DetailEntity,
  record: ApiRecord,
): [string, string][] {

  const source =
    entity === 'payment' ||
    entity === 'withdrawal'
      ? (nested(
          record,
          'doctor',
        ) as
          | ApiRecord
          | undefined) ||
        record
      : record;

  return [
    [
      'Revenue model',
      text(
        source.revenueModel,
        'Not configured',
      ),
    ],

    [
      'Patient fee',
      money(
        source.approvedPatientFee ||
          record.originalAmount,
      ),
    ],

    [
      'Platform fee',
      money(
        record.platformShare ||
          source.platformFee,
      ),
    ],

    [
      'Effective record date',
      dateText(
        record.createdAt,
      ),
    ],
  ];
}

function feeRows(
  entity: DetailEntity,
  record: ApiRecord,
): [string, string][] {

  if (entity === 'payment') {
    return [
      [
        'Doctor fee share',
        money(
          record.doctorFeeShare,
        ),
      ],

      [
        'Calculation basis',
        text(
          record.feeShareCalculationBasis,
          'Stored on order',
        ),
      ],

      [
        'Gateway charges',
        money(
          record.gatewayCharges,
        ),
      ],

      [
        'Tax amount',
        money(
          record.taxAmount,
        ),
      ],
    ];
  }

  if (
    entity ===
    'withdrawal'
  ) {
    return [
      [
        'Available balance',
        money(
          nested(
            record,
            'wallet.availableBalance',
          ),
        ),
      ],

      [
        'Requested amount',
        money(
          record.requestedAmount,
        ),
      ],

      [
        'Payout ref',
        text(
          record.payoutTransactionRef,
          'Not added',
        ),
      ],

      [
        'Rejection reason',
        text(
          record.rejectionReason,
          'None',
        ),
      ],
    ];
  }

  return [
    [
      'Doctor fee share',
      percentage(
        record.feeSharePercentage,
      ),
    ],

    [
      'Calculation basis',
      text(
        record.feeShareCalculationBasis,
        'Not configured',
      ),
    ],

    [
      'Holding period',
      `${text(
        record.feeShareHoldingDays,
        '0',
      )} days`,
    ],

    [
      'Minimum withdrawal',
      money(
        record.minWithdrawal,
      ),
    ],
  ];
}

/* =========================================================
   ACTIVITY / DECISION
========================================================= */

function relatedActivity(
  entity: DetailEntity,
  record: ApiRecord,
) {
  const rows: {
    title: string;
    meta: string;
  }[] = [];

  if (
    entity === 'agent' &&
    Array.isArray(
      record.doctors,
    )
  ) {
    (
      record.doctors as ApiRecord[]
    )
      .slice(0, 8)
      .forEach(
        (
          doctor,
        ) =>
          rows.push({
            title: `${text(
              doctor.fullName,
              'Doctor',
            )} - ${text(
              doctor.status,
              'status unknown',
            )}`,

            meta: `${text(
              doctor.clinicName,
              'Clinic not returned',
            )} | ${dateText(
              doctor.createdAt,
            )}`,
          }),
      );
  }

  if (
    entity ===
    'patient'
  ) {
    if (
      Array.isArray(
        record.programs,
      )
    ) {
      (
        record.programs as ApiRecord[]
      )
        .slice(0, 4)
        .forEach(
          (
            program,
          ) =>
            rows.push({
              title: `Program ${text(
                nested(
                  program,
                  'program.name',
                ),
                text(
                  program.status,
                  'assigned',
                ),
              )}`,

              meta: `${text(
                program.status,
                'Status unknown',
              )} | ${dateText(
                program.createdAt,
              )}`,
            }),
        );
    }

    if (
      Array.isArray(
        record.payments,
      )
    ) {
      (
        record.payments as ApiRecord[]
      )
        .slice(0, 4)
        .forEach(
          (
            payment,
          ) =>
            rows.push({
              title: `Payment ${text(
                payment.invoiceNumber,
                text(
                  payment.status,
                  'record',
                ),
              )}`,

              meta: `${money(
                payment.paidAmount,
              )} | ${dateText(
                payment.createdAt,
              )}`,
            }),
        );
    }
  }

  if (
    entity ===
      'support' &&
    Array.isArray(
      record.messages,
    )
  ) {
    (
      record.messages as ApiRecord[]
    )
      .slice(0, 8)
      .forEach(
        (
          message,
        ) =>
          rows.push({
            title: text(
              message.senderRole,
              'Message',
            ),

            meta: text(
              message.message,
              'No body',
            ),
          }),
      );
  }

  if (
    rows.length === 0
  ) {
    rows.push({
      title: `${entityLabel(
        entity,
      )} record loaded`,

      meta: `Created ${dateText(
        record.createdAt,
      )} | Updated ${dateText(
        record.updatedAt,
      )}`,
    });
  }

  return rows;
}

function decisionRows(
  entity: DetailEntity,
  record: ApiRecord,
): [string, string][] {

  if (
    entity ===
    'doctor'
  ) {
    return [
      [
        'KYC',
        text(
          record.kycStatus,
          'Not returned',
        ),
      ],

      [
        'QR Active',
        text(
          record.qrCodeActive,
          'Not returned',
        ),
      ],

      [
        'Revenue Model',
        text(
          record.revenueModel,
          'Not configured',
        ),
      ],

      [
        'Fee Share',
        percentage(
          record.feeSharePercentage,
        ),
      ],
    ];
  }

  if (
    entity ===
    'agent'
  ) {
    return [
      [
        'Status',
        text(
          record.status,
          '—',
        ),
      ],

      [
        'Region',
        text(
          record.assignedRegion,
          '—',
        ),
      ],

      [
        'Doctors',
        text(
          nested(
            record,
            'metrics.doctorsRegistered',
          ),
          '0',
        ),
      ],

      [
        'Revenue',
        money(
          nested(
            record,
            'metrics.revenueGenerated',
          ),
        ),
      ],
    ];
  }

  if (
    entity ===
    'withdrawal'
  ) {
    return [
      [
        'Requested',
        money(
          record.requestedAmount,
        ),
      ],

      [
        'Available',
        money(
          nested(
            record,
            'wallet.availableBalance',
          ),
        ),
      ],

      [
        'Doctor KYC',
        text(
          nested(
            record,
            'doctor.kycStatus',
          ),
          'Not returned',
        ),
      ],

      [
        'Bank Verified',
        text(
          nested(
            record,
            'doctor.bankVerified',
          ),
          'Not returned',
        ),
      ],
    ];
  }

  return [
    [
      'Status',
      text(
        record.status,
        'Not returned',
      ),
    ],

    [
      'Priority',
      text(
        record.priority,
        'Normal',
      ),
    ],

    [
      'Record ID',
      text(
        record._id ||
          record.id,
        'Not returned',
      ),
    ],

    [
      'Updated',
      dateText(
        record.updatedAt,
      ),
    ],
  ];
}

function entityLabel(
  entity: DetailEntity,
) {
  const labels: Record<
    DetailEntity,
    string
  > = {
    doctor: 'Doctor',
    agent: 'Agent',
    patient: 'Patient',
    payment: 'Payment',
    withdrawal:
      'Withdrawal',
    support:
      'Support Ticket',
  };

  return labels[entity];
}

function statusTone(
  status: string,
): DetailTone {
  const normalized =
    status.toLowerCase();

  if (
    [
      'approved',
      'active',
      'successful',
      'paid',
      'resolved',
      'cleared',
      'completed',
    ].some((item) =>
      normalized.includes(
        item,
      ),
    )
  ) {
    return 'success';
  }

  if (
    [
      'reject',
      'suspend',
      'failed',
      'blocked',
      'cancel',
      'closed',
    ].some((item) =>
      normalized.includes(
        item,
      ),
    )
  ) {
    return 'danger';
  }

  if (
    [
      'pending',
      'review',
      'requested',
      'open',
      'submitted',
      'processing',
    ].some((item) =>
      normalized.includes(
        item,
      ),
    )
  ) {
    return 'warning';
  }

  return 'neutral';
}

/* =========================================================
   GENERIC HELPERS
========================================================= */

function nested(
  record: unknown,
  path: string,
): unknown {
  return path
    .split('.')
    .reduce<unknown>(
      (
        current,
        key,
      ) => {

        if (
          Array.isArray(
            current,
          )
        ) {
          return current[
            Number(key)
          ];
        }

        if (
          current &&
          typeof current ===
            'object'
        ) {
          return (
            current as ApiRecord
          )[key];
        }

        return undefined;
      },
      record,
    );
}

function text(
  value: unknown,
  fallback: string,
) {
  if (
    value ===
      undefined ||
    value === null ||
    value === ''
  ) {
    return fallback;
  }

  if (
    typeof value ===
    'boolean'
  ) {
    return value
      ? 'Yes'
      : 'No';
  }

  if (
    typeof value ===
    'number'
  ) {
    return String(value);
  }

  if (
    value instanceof Date
  ) {
    return value.toLocaleDateString();
  }

  return String(value);
}

function money(
  value: unknown,
) {
  const amount =
    Number(value || 0);

  return `INR ${amount.toLocaleString(
    'en-IN',
  )}`;
}

function percentage(
  value: unknown,
) {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return 'Not configured';
  }

  return `${Number(value)}%`;
}

function dateText(
  value: unknown,
) {
  if (!value) {
    return 'Not returned';
  }

  const date = new Date(
    String(value),
  );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return String(value);
  }

  return date.toLocaleString(
    'en-IN',
    {
      dateStyle: 'medium',
      timeStyle: 'short',
    },
  );
}

function arrayCount(
  value: unknown,
) {
  return Array.isArray(
    value,
  )
    ? value.length
    : 0;
}

function documentCount(
  record: ApiRecord,
) {
  const count = [
    record.identityProof,
    record.addressProof,
    record.medicalRegDoc,
    record.cancelledCheque,
  ].filter(Boolean)
    .length;

  return count
    ? `${count} uploaded`
    : 'Not returned';
}

function detailErrorMessage(
  error: unknown,
) {
  if (
    error &&
    typeof error ===
      'object'
  ) {

    const response =
      (
        error as {
          response?: {
            data?: {
              message?: unknown;
            };
          };
        }
      ).response;

    const message =
      response?.data
        ?.message ||
      (
        error as {
          message?: unknown;
        }
      ).message;

    if (message) {
      return String(
        message,
      );
    }
  }

  return 'Action failed. Check validation and try again.';
}

/* =========================================================
   DOCTOR / ADMIN ROUTES
========================================================= */

export function AdminDoctorDetailWorkspacePage() {
  return (
    <AdminHydratedDetailPage
      entity="doctor"
      paramName="doctorId"
    />
  );
}

export function AdminAgentDetailWorkspacePage() {
  return (
    <AdminHydratedDetailPage
      entity="agent"
      paramName="agentId"
    />
  );
}

export function AdminPatientDetailWorkspacePage() {
  return (
    <AdminHydratedDetailPage
      entity="patient"
      paramName="patientId"
    />
  );
}

export function AdminPaymentDetailWorkspacePage() {
  return (
    <AdminHydratedDetailPage
      entity="payment"
      paramName="paymentId"
    />
  );
}

export function AdminWithdrawalDetailWorkspacePage() {
  return (
    <AdminHydratedDetailPage
      entity="withdrawal"
      paramName="withdrawalId"
    />
  );
}

export function AdminSupportTicketDetailPage() {
  return (
    <AdminHydratedDetailPage
      entity="support"
      paramName="ticketId"
    />
  );
}

/* =========================================================
   DOCTOR CREATE PAGE
========================================================= */

export function AdminDoctorCreatePage() {
  const navigate =
    useNavigate();

  const queryClient =
    useQueryClient();

  const [
    success,
    setSuccess,
  ] = useState<string | null>(
    null,
  );

  const checklist =
    useMemo(
      () => [
        'Profile identity',
        'Clinic location',
        'Commercial rules',
        'KYC and bank state',
        'Approval workspace',
      ],
      [],
    );

  const mutation = useMutation({
    mutationFn:
      async (
        form: FormData,
      ) => {

        const payload =
          compactPayload({
            fullName:
              formString(
                form,
                'fullName',
              ),

            mobile:
              formString(
                form,
                'mobile',
              ),

            whatsapp:
              formString(
                form,
                'whatsapp',
              ),

            email:
              formString(
                form,
                'email',
              ),

            gender:
              formString(
                form,
                'gender',
              ),

            dateOfBirth:
              formString(
                form,
                'dateOfBirth',
              ),

            qualification:
              formString(
                form,
                'qualification',
              ),

            specialization:
              formString(
                form,
                'specialization',
              ),

            medicalRegNumber:
              formString(
                form,
                'medicalRegNumber',
              ),

            registrationCouncil:
              formString(
                form,
                'registrationCouncil',
              ),

            yearsOfExperience:
              optionalNumber(
                form,
                'yearsOfExperience',
              ),

            consultationFee:
              optionalNumber(
                form,
                'consultationFee',
              ),

            clinicName:
              formString(
                form,
                'clinicName',
              ),

            clinicAddress:
              formString(
                form,
                'clinicAddress',
              ),

            city:
              formString(
                form,
                'city',
              ),

            state:
              formString(
                form,
                'state',
              ),

            postalCode:
              formString(
                form,
                'postalCode',
              ),

            clinicContact:
              formString(
                form,
                'clinicContact',
              ),

            clinicEmail:
              formString(
                form,
                'clinicEmail',
              ),

            clinicWorkingHours:
              formString(
                form,
                'clinicWorkingHours',
              ),

            googleMapsLink:
              formString(
                form,
                'googleMapsLink',
              ),

            clinicBranches:
              optionalNumber(
                form,
                'clinicBranches',
              ),

            requestedPatientFee:
              optionalNumber(
                form,
                'requestedPatientFee',
              ),

            approvedPatientFee:
              optionalNumber(
                form,
                'approvedPatientFee',
              ),

            revenueModel:
              formString(
                form,
                'revenueModel',
              ) ||
              'split',

            feeSharePercentage:
              optionalNumber(
                form,
                'feeSharePercentage',
              ),

            feeShareType:
              formString(
                form,
                'feeShareType',
              ) ||
              'percentage',

            fixedFeeShareAmount:
              optionalNumber(
                form,
                'fixedFeeShareAmount',
              ),

            feeShareCalculationBasis:
              formString(
                form,
                'feeShareCalculationBasis',
              ) ||
              'gross',

            feeShareHoldingDays:
              optionalNumber(
                form,
                'feeShareHoldingDays',
              ),

            minWithdrawal:
              optionalNumber(
                form,
                'minWithdrawal',
              ),

            maxWithdrawal:
              optionalNumber(
                form,
                'maxWithdrawal',
              ),

            payoutCycle:
              formString(
                form,
                'payoutCycle',
              ),

            kycStatus:
              formString(
                form,
                'kycStatus',
              ) ||
              'pending',

            panNumber:
              formString(
                form,
                'panNumber',
              ),

            bankVerified:
              formString(
                form,
                'bankVerified',
              ) === 'true',

            bankAccountHolder:
              formString(
                form,
                'bankAccountHolder',
              ),

            bankAccountNumber:
              formString(
                form,
                'bankAccountNumber',
              ),

            bankName:
              formString(
                form,
                'bankName',
              ),

            branchName:
              formString(
                form,
                'branchName',
              ),

            ifscCode:
              formString(
                form,
                'ifscCode',
              ),

            upiId:
              formString(
                form,
                'upiId',
              ),
          });

        return apiClient.post(
          '/doctors',
          payload,
        );
      },

    onSuccess:
      async (
        response,
      ) => {

        await queryClient.invalidateQueries(
          {
            queryKey: [
              'admin-resource-page',
            ],
          },
        );

        const created =
          (response.data ??
            {}) as ApiRecord;

        const createdId =
          text(
            created._id ||
              created.id ||
              created.doctorId,
            '',
          );

        if (createdId) {
          navigate(
            `/admin/doctors/${createdId}`,
          );
          return;
        }

        setSuccess(
          'Doctor registered and submitted for admin review.',
        );
      },
  });

  return (
    <div className="space-y-6">

      <PageHeader
        entity="doctor"
        record={{}}
        eyebrow="DOCTOR ONBOARDING"
        title="Register New Doctor"
        subtitle="Create a backend doctor record with profile, clinic, KYC, bank, pricing, and fee-share fields. Approval, QR, and document upload continue in the doctor detail workspace."
        status="Submitted on save"
        tone="warning"
      />

      <form
        className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]"
        onSubmit={(event) => {
          event.preventDefault();

          mutation.mutate(
            new FormData(
              event.currentTarget,
            ),
          );
        }}
      >

        <section className="space-y-6">

          <FormSection
            title="Personal Details"
            icon={UserCheck}
          >

            <Field
              name="fullName"
              label="Full name"
              placeholder="Dr. Rajesh Sharma"
              required
            />

            <Field
              name="mobile"
              label="Mobile number"
              placeholder="+91 98765 43210"
              required
            />

            <Field
              name="whatsapp"
              label="WhatsApp number"
              placeholder="+91 98765 43210"
            />

            <Field
              name="email"
              label="Email address"
              type="email"
              placeholder="doctor@clinic.com"
            />

            <SelectField
              name="gender"
              label="Gender"
              defaultValue=""
              options={[
                [
                  '',
                  'Not selected',
                ],
                [
                  'male',
                  'Male',
                ],
                [
                  'female',
                  'Female',
                ],
                [
                  'other',
                  'Other',
                ],
              ]}
            />

            <Field
              name="dateOfBirth"
              label="Date of birth"
              type="date"
              placeholder=""
            />

            <Field
              name="qualification"
              label="Qualification"
              placeholder="BPT, MPT"
            />

            <Field
              name="specialization"
              label="Specialization"
              placeholder="Orthopaedics and Rehabilitation"
            />

            <Field
              name="medicalRegNumber"
              label="Medical registration number"
              placeholder="REG-12345"
            />

            <Field
              name="registrationCouncil"
              label="Registration council"
              placeholder="State council"
            />

            <Field
              name="yearsOfExperience"
              label="Years of experience"
              type="number"
              min="0"
              placeholder="8"
            />

            <Field
              name="consultationFee"
              label="Consultation fee"
              type="number"
              min="0"
              placeholder="500"
            />

          </FormSection>

          <FormSection
            title="Clinic Details"
            icon={Landmark}
          >

            <Field
              name="clinicName"
              label="Clinic name"
              placeholder="Sharma Physiotherapy Clinic"
            />

            <Field
              name="clinicContact"
              label="Clinic contact"
              placeholder="+91 98765 43210"
            />

            <Field
              name="clinicEmail"
              label="Clinic email"
              type="email"
              placeholder="frontdesk@clinic.com"
            />

            <Field
              name="city"
              label="Clinic city"
              placeholder="Mumbai"
            />

            <Field
              name="state"
              label="State"
              placeholder="Maharashtra"
            />

            <Field
              name="postalCode"
              label="Postal code"
              placeholder="400001"
            />

            <Field
              name="clinicAddress"
              label="Clinic address"
              placeholder="Full clinic address"
              wide
            />

            <Field
              name="googleMapsLink"
              label="Google Maps location"
              placeholder="Paste map link"
              wide
            />

            <Field
              name="clinicWorkingHours"
              label="Working hours"
              placeholder="Mon-Sat, 10 AM - 7 PM"
            />

            <Field
              name="clinicBranches"
              label="Clinic branches"
              type="number"
              min="0"
              placeholder="1"
            />

          </FormSection>

          <FormSection
            title="Commercial Configuration"
            icon={Banknote}
          >

            <SelectField
              name="revenueModel"
              label="Revenue model"
              defaultValue="split"
              options={[
                [
                  'split',
                  'Split Model',
                ],
                [
                  'platform_fee',
                  'Platform Fee Model',
                ],
              ]}
            />

            <Field
              name="requestedPatientFee"
              label="Requested patient fee"
              type="number"
              min="0"
              placeholder="500"
            />

            <Field
              name="approvedPatientFee"
              label="Pre-approved patient fee"
              type="number"
              min="0"
              placeholder="500"
            />

            <Field
              name="feeSharePercentage"
              label="Doctor fee share %"
              type="number"
              min="0"
              max="100"
              step="0.01"
              placeholder="60"
            />

            <SelectField
              name="feeShareType"
              label="Fee-share type"
              defaultValue="percentage"
              options={[
                [
                  'percentage',
                  'Percentage',
                ],
                [
                  'fixed',
                  'Fixed Amount',
                ],
                [
                  'slab',
                  'Slab Based',
                ],
              ]}
            />

            <Field
              name="fixedFeeShareAmount"
              label="Fixed fee-share amount"
              type="number"
              min="0"
              placeholder="0"
            />

            <SelectField
              name="feeShareCalculationBasis"
              label="Calculation basis"
              defaultValue="gross"
              options={[
                [
                  'gross',
                  'Gross',
                ],
                [
                  'after_discount',
                  'After Discount',
                ],
                [
                  'net_after_charges',
                  'Net After Charges',
                ],
              ]}
            />

            <Field
              name="feeShareHoldingDays"
              label="Holding period"
              type="number"
              min="0"
              placeholder="15"
            />

            <Field
              name="minWithdrawal"
              label="Minimum withdrawal"
              type="number"
              min="0"
              placeholder="1000"
            />

            <Field
              name="maxWithdrawal"
              label="Maximum withdrawal"
              type="number"
              min="0"
              placeholder="50000"
            />

            <Field
              name="payoutCycle"
              label="Payout cycle"
              placeholder="monthly"
            />

          </FormSection>

          <FormSection
            title="KYC and Bank Setup"
            icon={ShieldCheck}
          >

            <SelectField
              name="kycStatus"
              label="KYC status"
              defaultValue="pending"
              options={[
                [
                  'pending',
                  'Pending',
                ],
                [
                  'submitted',
                  'Submitted',
                ],
                [
                  'approved',
                  'Approved',
                ],
                [
                  'rejected',
                  'Rejected',
                ],
              ]}
            />

            <SelectField
              name="bankVerified"
              label="Bank verified"
              defaultValue="false"
              options={[
                [
                  'false',
                  'No',
                ],
                [
                  'true',
                  'Yes',
                ],
              ]}
            />

            <Field
              name="panNumber"
              label="PAN number"
              placeholder="ABCDE1234F"
            />

            <Field
              name="bankAccountHolder"
              label="Account holder"
              placeholder="Dr. Rajesh Sharma"
            />

            <Field
              name="bankAccountNumber"
              label="Bank account number"
              placeholder="123456789012"
            />

            <Field
              name="ifscCode"
              label="IFSC code"
              placeholder="HDFC0001234"
            />

            <Field
              name="bankName"
              label="Bank name"
              placeholder="HDFC Bank"
            />

            <Field
              name="branchName"
              label="Branch name"
              placeholder="Andheri West"
            />

            <Field
              name="upiId"
              label="UPI ID"
              placeholder="doctor@upi"
            />

          </FormSection>

        </section>

        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">

          <div className="card p-5">

            <h2 className="text-sm font-bold text-neutral-900">
              Submission Checklist
            </h2>

            <div className="mt-4 space-y-3">

              {checklist.map(
                (item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-700"
                  >

                    <CheckCircle2 className="h-4 w-4 text-primary-600" />

                    <span>
                      {item}
                    </span>

                  </div>
                ),
              )}

            </div>
          </div>

          <div className="card p-5">

            <h2 className="text-sm font-bold text-neutral-900">
              Actions
            </h2>

            <p className="mt-1 text-xs text-neutral-500">
              This creates a submitted doctor. Approval, QR activation, and secure document upload are handled from the detail workspace.
            </p>

            {success && (
              <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
                {success}
              </div>
            )}

            {mutation.error && (
              <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">
                {detailErrorMessage(
                  mutation.error,
                )}
              </div>
            )}

            <div className="mt-4 space-y-2">

              <button
                type="button"
                onClick={() =>
                  navigate(
                    '/admin/doctors',
                  )
                }
                disabled={
                  mutation.isPending
                }
                className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={
                  mutation.isPending
                }
                className="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {mutation.isPending
                  ? 'Submitting...'
                  : 'Submit for Review'}
              </button>

            </div>
          </div>

        </aside>

      </form>
    </div>
  );
}

/* =========================================================
   CREATE FORM COMPONENTS
========================================================= */

function FormSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-5">

      <div className="mb-5 flex items-center gap-3">

        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
          <Icon className="h-5 w-5" />
        </div>

        <h2 className="text-base font-bold text-neutral-900">
          {title}
        </h2>

      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {children}
      </div>

    </section>
  );
}

function Field({
  name,
  label,
  placeholder,
  type = 'text',
  wide = false,
  required = false,
  min,
  max,
  step,
}: {
  name: string;
  label: string;
  placeholder: string;
  type?: string;
  wide?: boolean;
  required?: boolean;
  min?: string;
  max?: string;
  step?: string;
}) {
  return (
    <label
      className={cn(
        'block',
        wide &&
          'md:col-span-2',
      )}
    >

      <span className="text-sm font-semibold text-neutral-700">

        {label}

        {required && (
          <span className="ml-0.5 text-rose-500">
            *
          </span>
        )}

      </span>

      <input
        name={name}
        type={type}
        min={min}
        max={max}
        step={step}
        required={required}
        className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-primary-500"
        placeholder={
          placeholder
        }
      />

    </label>
  );
}

function SelectField({
  name,
  label,
  defaultValue,
  options,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  options: [string, string][];
}) {
  return (
    <label className="block">

      <span className="text-sm font-semibold text-neutral-700">
        {label}
      </span>

      <select
        name={name}
        defaultValue={
          defaultValue
        }
        className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-primary-500"
      >

        {options.map(
          (
            [
              value,
              labelText,
            ],
          ) => (
            <option
              key={value}
              value={value}
            >
              {labelText}
            </option>
          ),
        )}

      </select>

    </label>
  );
}

function formString(
  form: FormData,
  field: string,
) {
  const value =
    form.get(field);

  return typeof value ===
    'string'
    ? value.trim()
    : '';
}

function optionalNumber(
  form: FormData,
  field: string,
) {
  const raw =
    formString(
      form,
      field,
    );

  if (!raw) {
    return undefined;
  }

  const value =
    Number(raw);

  return Number.isFinite(
    value,
  )
    ? value
    : undefined;
}

export default AdminDoctorDetailWorkspacePage;
