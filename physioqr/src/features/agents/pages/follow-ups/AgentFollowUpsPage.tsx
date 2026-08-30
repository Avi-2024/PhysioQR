import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarCheck, CalendarClock, CheckCircle2, Clock3, MapPin, RefreshCw, XCircle } from 'lucide-react';
import apiClient from '@/lib/api-client';
import ErrorState from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/cn';

type ApiRecord = Record<string, unknown>;
type Queue = 'due' | 'upcoming' | 'completed' | 'missed' | 'cancelled';

const QUEUES: { key: Queue; label: string }[] = [
  { key: 'due', label: 'Due' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'completed', label: 'Completed' },
  { key: 'missed', label: 'Missed' },
  { key: 'cancelled', label: 'Cancelled' },
];

export default function AgentFollowUpsPage() {
  const queryClient = useQueryClient();
  const [queue, setQueue] = useState<Queue>('due');
  const [selected, setSelected] = useState<ApiRecord | null>(null);

  const followUpsQuery = useQuery({
    queryKey: ['agent-follow-ups', queue],
    queryFn: async () => {
      const params: Record<string, string | number | boolean> = { limit: 100 };
      if (queue === 'due') {
        params.followUpStatus = 'scheduled';
        params.due = true;
      } else if (queue === 'upcoming') {
        params.followUpStatus = 'scheduled';
      } else {
        params.followUpStatus = queue;
      }
      return (await apiClient.get('/agents/me/follow-ups', { params })).data;
    },
  });

  const allRows = useMemo(() => extractItems(followUpsQuery.data), [followUpsQuery.data]);
  const now = Date.now();
  const rows = useMemo(() => {
    if (queue !== 'upcoming') return allRows;
    return allRows.filter((row) => {
      const dueAt = dateMs(row.followUpDate);
      return dueAt !== null && dueAt > now;
    });
  }, [allRows, now, queue]);

  const mutation = useMutation({
    mutationFn: async ({ visitId, payload }: { visitId: string; payload: ApiRecord }) => (
      await apiClient.patch(`/agents/me/visits/${visitId}/follow-up`, payload)
    ).data,
    onSuccess: async () => {
      setSelected(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['agent-follow-ups'] }),
        queryClient.invalidateQueries({ queryKey: ['agent-dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['agent-visits'] }),
      ]);
    },
  });

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-600">Relationship management</p>
        <h1 className="mt-1 text-2xl font-bold text-neutral-900 sm:text-3xl">Follow-ups</h1>
        <p className="mt-1 max-w-3xl text-sm text-neutral-500">Work through doctor and clinic follow-ups without mixing them into the full visit history.</p>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <SummaryCard icon={CalendarClock} label="Current queue" value={followUpsQuery.isLoading ? null : rows.length} helper={QUEUES.find((item) => item.key === queue)?.label || queue} />
        <SummaryCard icon={Clock3} label="Due handling" value={queue === 'due' && !followUpsQuery.isLoading ? rows.length : null} helper="Scheduled up to today" />
        <SummaryCard icon={CheckCircle2} label="Workflow" value={null} helper="Complete, miss, cancel or reschedule" />
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-200 p-4 sm:p-5">
          <div className="flex flex-wrap gap-2">
            {QUEUES.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setQueue(item.key)}
                className={cn(
                  'rounded-full px-3 py-2 text-xs font-semibold transition-colors',
                  queue === item.key ? 'bg-primary-600 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200',
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 sm:p-5">
          {followUpsQuery.isError && (
            <ErrorState title="Follow-ups could not load" message="Check your connection and try again." onRetry={() => followUpsQuery.refetch()} />
          )}
          {followUpsQuery.isLoading && <Skeleton className="h-56 w-full" />}
          {!followUpsQuery.isLoading && !followUpsQuery.isError && rows.length === 0 && (
            <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center">
              <CalendarCheck className="mx-auto h-8 w-8 text-neutral-400" />
              <p className="mt-3 text-sm font-semibold text-neutral-800">No follow-ups in this queue</p>
              <p className="mt-1 text-xs text-neutral-500">Follow-ups move here automatically as their status changes.</p>
            </div>
          )}
          {!followUpsQuery.isLoading && rows.length > 0 && (
            <div className="space-y-3">
              {rows.map((row) => <FollowUpCard key={text(row._id || row.id)} row={row} onUpdate={() => setSelected(row)} />)}
            </div>
          )}
        </div>
      </section>

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title="Update follow-up" size="lg">
        {selected && (
          <FollowUpUpdateForm
            row={selected}
            saving={mutation.isPending}
            error={mutation.error}
            onSubmit={(payload) => mutation.mutate({ visitId: text(selected._id || selected.id), payload })}
          />
        )}
      </Modal>
    </div>
  );
}

function FollowUpCard({ row, onUpdate }: { row: ApiRecord; onUpdate: () => void }) {
  const doctor = asRecord(row.doctor);
  const overdue = row.followUpStatus === 'scheduled' && dateMs(row.followUpDate) !== null && (dateMs(row.followUpDate) as number) <= Date.now();
  return (
    <article className={cn('rounded-xl border p-4', overdue ? 'border-amber-200 bg-amber-50/40' : 'border-neutral-200 bg-white')}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-neutral-900">{text(doctor.fullName || row.doctorName, 'Clinic follow-up')}</p>
            <StatusPill value={text(row.followUpStatus, 'scheduled')} />
          </div>
          <p className="mt-1 text-sm text-neutral-600">{text(row.clinicName || doctor.clinicName, 'Clinic not specified')}</p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-neutral-500">
            <span className="inline-flex items-center gap-1.5"><CalendarClock className="h-3.5 w-3.5" />{dateText(row.followUpDate)}</span>
            {text(row.clinicLocation) && <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{text(row.clinicLocation)}</span>}
          </div>
          {text(row.followUpNotes || row.nextAction) && (
            <div className="mt-3 rounded-lg bg-neutral-50 p-3 text-sm text-neutral-700">
              {text(row.followUpNotes || row.nextAction)}
            </div>
          )}
        </div>
        <button type="button" onClick={onUpdate} className="inline-flex min-h-10 flex-shrink-0 items-center justify-center gap-2 rounded-lg border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50">
          <RefreshCw className="h-4 w-4" /> Update
        </button>
      </div>
    </article>
  );
}

function FollowUpUpdateForm({ row, saving, error, onSubmit }: { row: ApiRecord; saving: boolean; error: unknown; onSubmit: (payload: ApiRecord) => void }) {
  const [status, setStatus] = useState(text(row.followUpStatus, 'completed'));
  const [followUpDate, setFollowUpDate] = useState(toDateInput(row.followUpDate));
  const [note, setNote] = useState('');
  const [nextAction, setNextAction] = useState(text(row.nextAction));

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (status === 'scheduled' && !followUpDate) return;
    onSubmit({
      followUpStatus: status,
      followUpDate: status === 'scheduled' ? followUpDate : undefined,
      note: note || undefined,
      nextAction: nextAction || undefined,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
        <p className="text-sm font-semibold text-neutral-900">{text(asRecord(row.doctor).fullName || row.doctorName, 'Clinic follow-up')}</p>
        <p className="mt-1 text-xs text-neutral-500">Current due date: {dateText(row.followUpDate)}</p>
      </div>
      <label className="block">
        <span className="text-sm font-semibold text-neutral-700">Status</span>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm">
          <option value="completed">Completed</option>
          <option value="scheduled">Reschedule</option>
          <option value="missed">Missed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </label>
      {status === 'scheduled' && (
        <label className="block">
          <span className="text-sm font-semibold text-neutral-700">New follow-up date</span>
          <input type="date" required value={followUpDate} onChange={(event) => setFollowUpDate(event.target.value)} className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm" />
        </label>
      )}
      <label className="block">
        <span className="text-sm font-semibold text-neutral-700">Follow-up note</span>
        <textarea value={note} onChange={(event) => setNote(event.target.value)} className="mt-2 min-h-24 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm" placeholder="What happened in this follow-up?" />
      </label>
      <label className="block">
        <span className="text-sm font-semibold text-neutral-700">Next action</span>
        <input value={nextAction} onChange={(event) => setNextAction(event.target.value)} className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm" placeholder="Optional next action" />
      </label>
      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{errorMessage(error)}</div>}
      <div className="flex justify-end border-t border-neutral-100 pt-4">
        <button type="submit" disabled={saving} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60">
          {saving ? 'Saving...' : 'Update follow-up'}
        </button>
      </div>
    </form>
  );
}

function SummaryCard({ icon: Icon, label, value, helper }: { icon: React.ElementType; label: string; value: number | null; helper: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-neutral-500">{label}</p>
          {value === null ? <p className="mt-2 text-lg font-bold text-neutral-900">{helper}</p> : <p className="mt-2 text-2xl font-bold text-neutral-900">{value}</p>}
        </div>
        <span className="rounded-lg bg-primary-50 p-2.5 text-primary-700"><Icon className="h-5 w-5" /></span>
      </div>
      {value !== null && <p className="mt-2 text-xs text-neutral-500">{helper}</p>}
    </div>
  );
}

function StatusPill({ value }: { value: string }) {
  const styles: Record<string, string> = {
    scheduled: 'bg-amber-50 text-amber-700',
    completed: 'bg-emerald-50 text-emerald-700',
    missed: 'bg-rose-50 text-rose-700',
    cancelled: 'bg-neutral-100 text-neutral-600',
  };
  return <span className={cn('rounded-full px-2.5 py-1 text-xs font-bold capitalize', styles[value] || 'bg-neutral-100 text-neutral-600')}>{value.replace(/_/g, ' ')}</span>;
}

function extractItems(payload: unknown): ApiRecord[] {
  if (Array.isArray(payload)) return payload as ApiRecord[];
  const record = asRecord(payload);
  if (Array.isArray(record.items)) return record.items as ApiRecord[];
  if (Array.isArray(record.data)) return record.data as ApiRecord[];
  return [];
}
function asRecord(value: unknown): ApiRecord { return value && typeof value === 'object' ? value as ApiRecord : {}; }
function text(value: unknown, fallback = '') { return value === undefined || value === null || value === '' ? fallback : String(value); }
function dateMs(value: unknown) { if (!value) return null; const time = new Date(String(value)).getTime(); return Number.isNaN(time) ? null : time; }
function dateText(value: unknown) { if (!value) return '-'; const date = new Date(String(value)); return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
function toDateInput(value: unknown) { const time = dateMs(value); if (time === null) return ''; return new Date(time).toISOString().slice(0, 10); }
function errorMessage(error: unknown) { const response = asRecord(asRecord(error).response); const data = asRecord(response.data); return text(data.message || asRecord(error).message, 'Request failed. Please try again.'); }
