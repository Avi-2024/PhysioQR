import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Building2, IndianRupee, Pencil, RefreshCw, ShieldAlert,
  Stethoscope, Target, UserRoundCheck, UsersRound, UserX,
} from 'lucide-react';
import apiClient from '@/lib/api-client';
import { AgentRecordForm } from '@/features/admin/components/AgentRecordForm';
import ErrorState from '@/components/feedback/ErrorState';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/cn';

type AgentStatus = 'active' | 'inactive' | 'suspended' | 'terminated';
type Doctor = {
  _id: string; doctorId?: string; fullName?: string; clinicName?: string;
  status?: string; approvedPatientFee?: number; revenueModel?: string;
};
type AgentDetail = {
  _id: string; agentId: string; fullName: string; mobile: string; status: AgentStatus;
  whatsapp?: string; email?: string; address?: string; city?: string; state?: string;
  assignedRegion?: string; joiningDate?: string; reportingPerson?: string;
  monthlyOnboardingTarget?: number; createdAt?: string; updatedAt?: string;
  metrics?: { doctorsRegistered?: number; patientsGenerated?: number; paidPatients?: number; revenueGenerated?: number };
  doctors?: Doctor[];
};
const statusOptions: { value: AgentStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'suspended', label: 'Suspended' },
];
const label = (value?: string) => value ? value.replace(/_/g, ' ') : '—';
const money = (value?: number) => value == null ? '—' : formatCurrency(value);
const getError = (error: unknown) => {
  const result = error as { response?: { data?: { message?: string } }; message?: string };
  return result?.response?.data?.message || result?.message || 'Unable to complete this action.';
};

export default function AdminAgentDetailPage() {
  const { agentId = '' } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(searchParams.get('edit') === '1');
  const [action, setAction] = useState<'status' | 'terminate' | null>(null);
  const [nextStatus, setNextStatus] = useState<AgentStatus>('inactive');
  const [reason, setReason] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [notice, setNotice] = useState('');

  const query = useQuery<AgentDetail>({
    queryKey: ['admin-agent', agentId],
    enabled: Boolean(agentId),
    queryFn: () => apiClient.get(`/admin/agents/${agentId}`).then((response) => response.data),
  });

  const refreshRecords = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin-agent', agentId] }),
      queryClient.invalidateQueries({ queryKey: ['admin-agents'] }),
    ]);
  };

  const statusMutation = useMutation({
    mutationFn: () => apiClient.put(`/agents/${agentId}`, { status: nextStatus, reason: reason.trim() }),
    onSuccess: async () => {
      await refreshRecords();
      setNotice('Agent status updated. Previous login sessions have been revoked.');
      closeAction();
    },
  });

  const terminateMutation = useMutation({
    mutationFn: () => apiClient.delete(`/agents/${agentId}`, { data: { confirmation: confirmation.trim(), reason: reason.trim() } }),
    onSuccess: async () => {
      await refreshRecords();
      setNotice('Agent terminated. Doctor, referral, and payment history has been retained.');
      closeAction();
    },
  });

  function closeAction() {
    setAction(null);
    setReason('');
    setConfirmation('');
  }

  if (query.isLoading) return (
    <div className="space-y-4">{Array.from({ length: 7 }).map((_, index) => <Skeleton key={index} className="h-20 w-full" />)}</div>
  );
  if (query.isError || !query.data) return (
    <ErrorState title="Agent could not load" message="The agent may not exist or the admin API is unavailable." onRetry={() => query.refetch()} />
  );

  const agent = query.data;
  const doctors = agent.doctors || [];
  const editable = agent.status !== 'terminated';
  const pending = statusMutation.isPending || terminateMutation.isPending;

  return (
    <div className="min-w-0 space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <button type="button" onClick={() => navigate('/admin/agents')} className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-neutral-600 hover:text-primary-700">
            <ArrowLeft className="h-4 w-4" /> All agents
          </button>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-primary-700">Agent management</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-neutral-950 sm:text-3xl">{agent.fullName}</h1>
            <span className={cn(
              'rounded-full px-3 py-1 text-xs font-semibold capitalize',
              agent.status === 'active' ? 'bg-emerald-50 text-emerald-700' :
              agent.status === 'suspended' ? 'bg-amber-50 text-amber-700' :
              agent.status === 'terminated' ? 'bg-rose-50 text-rose-700' : 'bg-neutral-100 text-neutral-700',
            )}>{agent.status}</span>
          </div>
          <p className="mt-1 text-sm text-neutral-500">{agent.agentId} · {agent.assignedRegion || agent.city || 'Region not assigned'}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => query.refetch()} disabled={query.isFetching} className="inline-flex min-h-10 items-center gap-2 rounded-lg border bg-white px-3 text-sm font-semibold text-neutral-700 disabled:opacity-50">
            <RefreshCw className={cn('h-4 w-4', query.isFetching && 'animate-spin')} /> Refresh
          </button>
          {editable && (
            <>
              <button type="button" onClick={() => setEditOpen(true)} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-primary-200 bg-white px-3 text-sm font-semibold text-primary-700 hover:bg-primary-50">
                <Pencil className="h-4 w-4" /> Edit profile
              </button>
              <button type="button" onClick={() => { setNextStatus(agent.status === 'active' ? 'inactive' : 'active'); setAction('status'); }} className="inline-flex min-h-10 items-center gap-2 rounded-lg border bg-white px-3 text-sm font-semibold text-neutral-700 hover:bg-neutral-50">
                <ShieldAlert className="h-4 w-4" /> Manage status
              </button>
              <button type="button" onClick={() => setAction('terminate')} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 text-sm font-semibold text-rose-700 hover:bg-rose-100">
                <UserX className="h-4 w-4" /> Terminate
              </button>
            </>
          )}
        </div>
      </header>

      {notice && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>}
      {agent.status === 'terminated' && <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">This agent is terminated. Their login is blocked and their business records remain available for audit.</p>}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={Stethoscope} title="Doctors registered" value={agent.metrics?.doctorsRegistered} />
        <Kpi icon={UsersRound} title="Patients generated" value={agent.metrics?.patientsGenerated} />
        <Kpi icon={UserRoundCheck} title="Paid patients" value={agent.metrics?.paidPatients} />
        <Kpi icon={IndianRupee} title="Net attributed revenue" value={agent.metrics?.revenueGenerated == null ? '—' : money(agent.metrics.revenueGenerated)} />
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="rounded-xl border bg-white p-5">
          <div className="flex items-center gap-2"><Target className="h-5 w-5 text-primary-600" /><h2 className="font-bold">Operational details</h2></div>
          <p className="mt-2 text-sm text-neutral-500">Monthly doctor onboarding target: <b>{agent.monthlyOnboardingTarget ?? 'Not configured'}</b></p>
          <Details entries={[
            ['Agent ID', agent.agentId], ['Mobile', agent.mobile], ['WhatsApp', agent.whatsapp],
            ['Email', agent.email], ['City', agent.city], ['State', agent.state],
            ['Assigned region', agent.assignedRegion], ['Reporting person', agent.reportingPerson],
            ['Joining date', agent.joiningDate ? new Date(agent.joiningDate).toLocaleDateString() : undefined],
          ]} />
        </section>
        <section className="rounded-xl border bg-white p-5">
          <h2 className="font-bold">Account and audit context</h2>
          <Details entries={[
            ['Status', label(agent.status)],
            ['Created', agent.createdAt ? new Date(agent.createdAt).toLocaleString() : undefined],
            ['Last updated', agent.updatedAt ? new Date(agent.updatedAt).toLocaleString() : undefined],
            ['Address', agent.address],
          ]} />
          <p className="mt-5 text-xs text-neutral-500">Changes to contact details and status revoke existing login sessions. Termination never removes financial or doctor records.</p>
        </section>
      </div>

      <section className="overflow-hidden rounded-xl border bg-white">
        <div className="flex items-center gap-3 border-b px-5 py-4">
          <Building2 className="h-5 w-5 text-neutral-500" />
          <div><h2 className="font-bold">Doctor network</h2><p className="mt-1 text-sm text-neutral-500">Doctors attributed to this agent.</p></div>
        </div>
        {!doctors.length ? <p className="p-10 text-center text-sm text-neutral-500">No doctors are linked to this agent.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="bg-neutral-50 text-xs uppercase text-neutral-500"><tr>
                <th className="px-5 py-3">Doctor</th><th className="px-4 py-3">Clinic</th>
                <th className="px-4 py-3">Status</th><th className="px-4 py-3">Patient fee</th>
                <th className="px-4 py-3">Revenue model</th><th className="px-5 py-3">Action</th>
              </tr></thead>
              <tbody className="divide-y">{doctors.map((doctor) => (
                <tr key={doctor._id}>
                  <td className="px-5 py-4"><b>{doctor.fullName || '—'}</b><div className="text-xs text-neutral-500">{doctor.doctorId || '—'}</div></td>
                  <td className="px-4 py-4">{doctor.clinicName || '—'}</td>
                  <td className="px-4 py-4 capitalize">{label(doctor.status)}</td>
                  <td className="px-4 py-4">{money(doctor.approvedPatientFee)}</td>
                  <td className="px-4 py-4">{label(doctor.revenueModel)}</td>
                  <td className="px-5 py-4"><button type="button" onClick={() => navigate(`/admin/doctors/${doctor._id}`)} className="rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-neutral-50">View doctor</button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>

      <Modal isOpen={editOpen && editable} onClose={() => setEditOpen(false)} title="Edit agent profile" size="xl">
        <AgentRecordForm key={agent._id + String(agent.updatedAt)} row={agent as unknown as Record<string, unknown>} onCancel={() => setEditOpen(false)} onSaved={async () => {
          setEditOpen(false);
          setNotice('Agent profile saved successfully.');
          await refreshRecords();
        }} />
      </Modal>

      <Modal isOpen={action === 'status'} onClose={() => !pending && closeAction()} title="Change agent access" size="md">
        <div className="space-y-4">
          <p className="text-sm text-neutral-600">Changing access immediately revokes existing login sessions. Doctor and payment records remain unchanged.</p>
          <label className="block text-sm font-semibold text-neutral-700">New status
            <select value={nextStatus} onChange={(event) => setNextStatus(event.target.value as AgentStatus)} className="mt-2 block w-full rounded-lg border border-neutral-300 p-3">
              {statusOptions.filter((item) => item.value !== agent.status).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <ReasonInput value={reason} onChange={setReason} />
          {statusMutation.isError && <p role="alert" className="text-sm text-rose-700">{getError(statusMutation.error)}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={closeAction} disabled={pending} className="rounded-lg border px-4 py-2.5 text-sm font-semibold">Cancel</button>
            <button type="button" onClick={() => statusMutation.mutate()} disabled={pending || nextStatus === agent.status || reason.trim().length < 5} className="rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{pending ? 'Saving…' : 'Confirm status'}</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={action === 'terminate'} onClose={() => !pending && closeAction()} title="Terminate agent access" size="md">
        <div className="space-y-4">
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
            <b>Permanent access decision:</b> the agent will no longer log in. All doctors, visits, referrals and financial records remain intact. This action does not delete the agent document.
          </div>
          <ReasonInput value={reason} onChange={setReason} />
          <label className="block text-sm font-semibold text-neutral-700">Type <b>{agent.agentId}</b> to confirm
            <input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" className="mt-2 block w-full rounded-lg border border-neutral-300 p-3" placeholder={agent.agentId} />
          </label>
          {terminateMutation.isError && <p role="alert" className="text-sm text-rose-700">{getError(terminateMutation.error)}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={closeAction} disabled={pending} className="rounded-lg border px-4 py-2.5 text-sm font-semibold">Cancel</button>
            <button type="button" onClick={() => terminateMutation.mutate()} disabled={pending || confirmation.trim() !== agent.agentId || reason.trim().length < 5} className="rounded-lg bg-rose-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{pending ? 'Terminating…' : 'Terminate agent'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function ReasonInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <label className="block text-sm font-semibold text-neutral-700">Reason (required)
    <textarea value={value} maxLength={500} rows={3} onChange={(event) => onChange(event.target.value)} placeholder="Explain why access is being changed (minimum 5 characters)" className="mt-2 block w-full rounded-lg border border-neutral-300 p-3 font-normal" />
  </label>;
}

function Details({ entries }: { entries: [string, string | undefined][] }) {
  return <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">{entries.map(([title, value]) =>
    <div key={title}><dt className="text-xs font-semibold uppercase text-neutral-500">{title}</dt><dd className="mt-1 break-words font-medium text-neutral-900">{value || '—'}</dd></div>,
  )}</dl>;
}

function Kpi({ icon: Icon, title, value }: { icon: typeof Stethoscope; title: string; value: unknown }) {
  return <div className="rounded-xl border bg-white p-4"><Icon className="h-5 w-5 text-neutral-500" /><p className="mt-3 text-xs font-semibold uppercase text-neutral-500">{title}</p><p className="mt-1 text-2xl font-bold">{String(value ?? '—')}</p></div>;
}
