import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Activity, Calendar, CreditCard, FileText, MessageSquare, PlayCircle, Send, Stethoscope } from 'lucide-react';
import apiClient from '@/lib/api-client';
import { DataTable, type DataTableColumn } from '@/components/data-display/DataTable';
import ErrorState from '@/components/feedback/ErrorState';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/cn';

type ApiRecord = Record<string, unknown>;

type PaymentRow = {
  id: string;
  invoiceNumber: string;
  programName: string;
  amount: number;
  status: string;
  method: string;
  paidAt: string;
};

type ProgressRow = {
  dayNumber: number;
  dayStarted: string;
  dayCompleted: string;
  completedExercises: number;
  skippedExercises: number;
  painScoreBefore: string;
  painScoreAfter: string;
};

type SupportTicketRow = {
  id: string;
  ticketId: string;
  category: string;
  subject: string;
  priority: string;
  status: string;
  createdAt: string;
};

// Shows the patient's active program with all day access states.
export function PatientProgrammePage() {
  const navigate = useNavigate();
  const programQuery = useQuery({ queryKey: ['patient-program'], queryFn: async () => (await apiClient.get('/patients/me/program')).data, retry: false });
  const program = asRecord(programQuery.data);
  const rehabProgram = asRecord(program.program);
  const doctor = asRecord(program.doctor);
  const durationDays = Number(rehabProgram.durationDays || 0);
  const currentDay = Math.max(1, Number(program.currentDay || 1));
  const days = Array.from({ length: durationDays || currentDay }, (_, index) => index + 1);

  if (programQuery.isError) return <ErrorState title="Programme could not load" message="Your active programme is unavailable or not yet activated." onRetry={() => programQuery.refetch()} />;

  return (
    <PatientWorkspace eyebrow="PROGRAMME" title={text(rehabProgram.name, 'My Programme')} description={text(rehabProgram.description, 'Day-wise recovery access with video guidance and exercise tracking.')}>
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard icon={Calendar} label="Current day" value={`Day ${currentDay}`} />
        <KpiCard icon={Activity} label="Completion" value={`${Number(program.completionPercentage || 0)}%`} />
        <KpiCard icon={Stethoscope} label="Referring doctor" value={text(doctor.fullName, '-')} />
      </div>

      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-bold text-neutral-900">Day-wise Access</h2>
          <span className="text-xs font-semibold text-neutral-500">Unlock method: {labelize(program.unlockMethod || 'every_24_hours')}</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {days.map((day) => {
            const completed = day < currentDay || Number(program.completionPercentage || 0) === 100;
            const isToday = day === currentDay;
            const locked = day > currentDay;
            return (
              <button
                key={day}
                type="button"
                disabled={locked}
                onClick={() => navigate(`/patient/programme/day/${day}`)}
                className={cn(
                  'rounded-xl border p-4 text-left transition-colors',
                  locked ? 'cursor-not-allowed border-neutral-200 bg-neutral-50 opacity-70' : 'border-primary-200 bg-white hover:border-primary-400 hover:bg-primary-50',
                  isToday && 'border-primary-500 bg-primary-50'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-bold text-neutral-900">Day {day}</div>
                    <div className="mt-1 text-sm text-neutral-500">{isToday ? 'Today session' : completed ? 'Completed / available' : 'Future session'}</div>
                  </div>
                  <StatusPill value={locked ? 'locked' : completed ? 'completed' : 'available'} />
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </PatientWorkspace>
  );
}

// Shows patient progress summary and day-level feedback history.
export function PatientProgressPage() {
  const programQuery = useQuery({ queryKey: ['patient-program'], queryFn: async () => (await apiClient.get('/patients/me/program')).data, retry: false });
  const program = asRecord(programQuery.data);
  const programId = text(program._id || program.id);
  const summaryQuery = useQuery({
    queryKey: ['patient-progress-summary', programId],
    enabled: Boolean(programId),
    queryFn: async () => (await apiClient.get(`/progress/${programId}/summary`)).data,
  });
  const summary = asRecord(summaryQuery.data);
  const rows = extractItems(summary.progress).map(mapProgressRow);
  const columns: DataTableColumn<ProgressRow>[] = [
    { key: 'dayNumber', header: 'Day', render: (row) => <span className="font-bold text-neutral-900">Day {row.dayNumber}</span> },
    { key: 'dayStarted', header: 'Started', render: (row) => <StatusPill value={row.dayStarted} /> },
    { key: 'dayCompleted', header: 'Completed', render: (row) => <StatusPill value={row.dayCompleted} /> },
    { key: 'completedExercises', header: 'Exercises', render: (row) => <span className="text-sm text-neutral-700">{row.completedExercises} done / {row.skippedExercises} skipped</span> },
    { key: 'painScoreBefore', header: 'Pain Before', render: (row) => <span className="text-sm text-neutral-700">{row.painScoreBefore}</span> },
    { key: 'painScoreAfter', header: 'Pain After', render: (row) => <span className="text-sm text-neutral-700">{row.painScoreAfter}</span> },
  ];

  if (programQuery.isError || summaryQuery.isError) return <ErrorState title="Progress could not load" message="Check your active programme and backend availability." onRetry={() => { programQuery.refetch(); summaryQuery.refetch(); }} />;

  return (
    <PatientWorkspace eyebrow="PROGRESS" title="Progress Tracker" description="Completed days, exercise completion, skipped exercises, and pain feedback history.">
      <div className="grid gap-4 sm:grid-cols-4">
        <KpiCard icon={Activity} label="Completion" value={`${Number(summary.completionPercentage || 0)}%`} />
        <KpiCard icon={Calendar} label="Completed days" value={String(summary.completedDays || 0)} />
        <KpiCard icon={PlayCircle} label="Exercises completed" value={String(summary.completedExercises || 0)} />
        <KpiCard icon={FileText} label="Skipped exercises" value={String(summary.skippedExercises || 0)} />
      </div>
      <DataTable columns={columns} data={rows} loading={summaryQuery.isLoading} emptyMessage="No progress submitted yet." />
    </PatientWorkspace>
  );
}

// Shows patient payment history from the secure patient endpoint.
export function PatientPaymentsPage() {
  const paymentsQuery = useQuery({ queryKey: ['patient-payments'], queryFn: async () => (await apiClient.get('/patients/me/payments')).data });
  const rows = extractItems(paymentsQuery.data).map(mapPaymentRow);
  const columns: DataTableColumn<PaymentRow>[] = [
    { key: 'invoiceNumber', header: 'Invoice', render: (row) => <span className="font-semibold text-neutral-900">{row.invoiceNumber || row.id.slice(-8).toUpperCase()}</span> },
    { key: 'programName', header: 'Programme', render: (row) => <span className="text-sm text-neutral-700">{row.programName || '-'}</span> },
    { key: 'amount', header: 'Amount', render: (row) => <span className="font-bold text-neutral-900">{formatCurrency(row.amount)}</span> },
    { key: 'status', header: 'Status', render: (row) => <StatusPill value={row.status} /> },
    { key: 'method', header: 'Method', render: (row) => <span className="text-sm text-neutral-700">{labelize(row.method || '-')}</span> },
    { key: 'paidAt', header: 'Paid At', render: (row) => <span className="text-sm text-neutral-600">{dateText(row.paidAt)}</span> },
  ];

  if (paymentsQuery.isError) return <ErrorState title="Payments could not load" message="Check patient login and backend availability." onRetry={() => paymentsQuery.refetch()} />;

  return (
    <PatientWorkspace eyebrow="PAYMENTS" title="Payment History" description="Receipts, payment status, amount paid, and payment method for your recovery programme.">
      <DataTable columns={columns} data={rows} loading={paymentsQuery.isLoading} emptyMessage="No payments found." />
    </PatientWorkspace>
  );
}

// Lets patients contact support and review their own tickets.
export function PatientSupportPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ category: 'technical', priority: 'medium', subject: '', description: '' });
  const ticketsQuery = useQuery({ queryKey: ['patient-support-tickets'], queryFn: async () => (await apiClient.get('/support')).data });
  const mutation = useMutation({
    mutationFn: async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      return apiClient.post('/support', form);
    },
    onSuccess: async () => {
      setForm({ category: 'technical', priority: 'medium', subject: '', description: '' });
      await queryClient.invalidateQueries({ queryKey: ['patient-support-tickets'] });
    },
  });
  const rows = extractItems(ticketsQuery.data).map(mapSupportTicket);
  const columns: DataTableColumn<SupportTicketRow>[] = [
    { key: 'ticketId', header: 'Ticket', render: (row) => <div><div className="font-semibold text-neutral-900">{row.ticketId}</div><div className="text-xs text-neutral-500">{dateText(row.createdAt)}</div></div> },
    { key: 'category', header: 'Category', render: (row) => <StatusPill value={labelize(row.category)} /> },
    { key: 'subject', header: 'Subject', render: (row) => <span className="text-sm font-semibold text-neutral-900">{row.subject}</span> },
    { key: 'priority', header: 'Priority', render: (row) => <StatusPill value={row.priority} /> },
    { key: 'status', header: 'Status', render: (row) => <StatusPill value={labelize(row.status)} /> },
  ];

  if (ticketsQuery.isError) return <ErrorState title="Support could not load" message="Check patient login and backend availability." onRetry={() => ticketsQuery.refetch()} />;

  return (
    <PatientWorkspace eyebrow="SUPPORT" title="Support" description="Create support requests for payment, video access, programme, refund, profile, or technical issues.">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <DataTable columns={columns} data={rows} loading={ticketsQuery.isLoading} emptyMessage="No support tickets yet." />
        <form className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm space-y-4" onSubmit={(event) => mutation.mutate(event)}>
          <h2 className="flex items-center gap-2 text-base font-bold text-neutral-900"><MessageSquare className="h-5 w-5 text-primary-600" /> New Ticket</h2>
          <Select label="Category" value={form.category} onChange={(value) => setForm((current) => ({ ...current, category: value }))} options={['technical', 'payment', 'video_access', 'program', 'refund', 'profile']} />
          <Select label="Priority" value={form.priority} onChange={(value) => setForm((current) => ({ ...current, priority: value }))} options={['low', 'medium', 'high']} />
          <label className="block">
            <span className="text-sm font-semibold text-neutral-700">Subject</span>
            <input value={form.subject} onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))} required className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-primary-500" />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-neutral-700">Description</span>
            <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} className="mt-2 min-h-24 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-primary-500" />
          </label>
          {mutation.isSuccess && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">Support ticket created.</div>}
          <ActionError error={mutation.error} />
          <button disabled={mutation.isPending} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60">
            <Send className="h-4 w-4" />
            {mutation.isPending ? 'Creating...' : 'Create Ticket'}
          </button>
        </form>
      </div>
    </PatientWorkspace>
  );
}

function PatientWorkspace({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div>
        <div className="inline-flex items-center rounded-full bg-teal-50 px-3 py-1 text-[11px] font-extrabold tracking-[0.08em] text-teal-700">{eyebrow}</div>
        <h1 className="mt-3 text-2xl font-bold text-neutral-900 sm:text-3xl">{title}</h1>
        <p className="mt-1 max-w-3xl text-sm text-neutral-500">{description}</p>
      </div>
      {children}
    </div>
  );
}

function KpiCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"><Icon className="mb-2 h-5 w-5 text-primary-600" /><div className="break-words text-lg font-bold text-neutral-900">{value}</div><div className="text-xs text-neutral-500">{label}</div></div>;
}

function StatusPill({ value }: { value: string }) {
  const normalized = value.toLowerCase();
  const tone = normalized.includes('paid') || normalized.includes('completed') || normalized.includes('active') || normalized.includes('successful') || normalized.includes('available') || normalized === 'yes'
    ? 'bg-emerald-50 text-emerald-700'
    : normalized.includes('pending') || normalized.includes('open') || normalized.includes('waiting')
      ? 'bg-amber-50 text-amber-700'
      : normalized.includes('failed') || normalized.includes('refund') || normalized.includes('locked')
        ? 'bg-rose-50 text-rose-700'
        : 'bg-neutral-100 text-neutral-700';
  return <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize', tone)}>{value}</span>;
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-neutral-700">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm capitalize focus:border-primary-500 focus:ring-primary-500">
        {options.map((option) => <option key={option} value={option}>{labelize(option)}</option>)}
      </select>
    </label>
  );
}

function ActionError({ error }: { error: unknown }) {
  if (!error) return null;
  const response = asRecord(asRecord(error).response);
  const data = asRecord(response.data);
  return <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{text(data.message || asRecord(error).message, 'Request failed.')}</div>;
}

function mapPaymentRow(record: ApiRecord): PaymentRow {
  const program = asRecord(record.program);
  return {
    id: text(record._id || record.id),
    invoiceNumber: text(record.invoiceNumber),
    programName: text(program.name),
    amount: Number(record.paidAmount || 0),
    status: text(record.status, 'pending'),
    method: text(record.paymentMethod),
    paidAt: text(record.verifiedAt || record.createdAt),
  };
}

function mapProgressRow(record: ApiRecord): ProgressRow {
  const exercises = Array.isArray(record.exercises) ? record.exercises as ApiRecord[] : [];
  return {
    dayNumber: Number(record.dayNumber || 0),
    dayStarted: text(record.dayStarted, 'No'),
    dayCompleted: text(record.dayCompleted, 'No'),
    completedExercises: exercises.filter((item) => Boolean(item.markedCompleted)).length,
    skippedExercises: exercises.filter((item) => Boolean(item.skipped)).length,
    painScoreBefore: text(record.painScoreBefore, '-'),
    painScoreAfter: text(record.painScoreAfter, '-'),
  };
}

function mapSupportTicket(record: ApiRecord): SupportTicketRow {
  return {
    id: text(record._id || record.id),
    ticketId: text(record.ticketId || record._id || record.id),
    category: text(record.category),
    subject: text(record.subject, '-'),
    priority: text(record.priority, 'medium'),
    status: text(record.status, 'open'),
    createdAt: text(record.createdAt),
  };
}

function extractItems(payload: unknown): ApiRecord[] {
  if (Array.isArray(payload)) return payload as ApiRecord[];
  const record = asRecord(payload);
  if (Array.isArray(record.items)) return record.items as ApiRecord[];
  if (Array.isArray(record.data)) return record.data as ApiRecord[];
  if (Array.isArray(record.progress)) return record.progress as ApiRecord[];
  return [];
}

function asRecord(value: unknown): ApiRecord {
  return value && typeof value === 'object' ? value as ApiRecord : {};
}

function text(value: unknown, fallback = '') {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
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

export default PatientProgrammePage;
