import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Building2, IndianRupee, RefreshCw, Stethoscope, UserRoundCheck, UsersRound } from 'lucide-react';
import apiClient from '@/lib/api-client';
import ErrorState from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/cn';

type Doctor = {
  _id: string;
  doctorId?: string;
  fullName?: string;
  clinicName?: string;
  city?: string;
  status?: string;
  approvedPatientFee?: number;
  revenueModel?: string;
  createdAt?: string;
};

type AgentDetail = {
  _id: string;
  id?: string;
  agentId?: string;
  fullName?: string;
  mobile?: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  assignedRegion?: string;
  joiningDate?: string;
  reportingPerson?: string;
  photo?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  metrics?: {
    doctorsRegistered?: number;
    patientsGenerated?: number;
    paidPatients?: number;
    revenueGenerated?: number;
  };
  doctors?: Doctor[];
};

const label = (value?: string) => value ? value.replace(/_/g, ' ') : '—';
const money = (value?: number) => value == null ? '—' : formatCurrency(value);

export default function AdminAgentDetailPage() {
  const { agentId = '' } = useParams();
  const navigate = useNavigate();
  const query = useQuery<AgentDetail>({
    queryKey: ['admin-agent', agentId],
    enabled: Boolean(agentId),
    queryFn: () => apiClient.get(`/admin/agents/${agentId}`).then((response) => response.data),
  });

  if (query.isLoading) {
    return <div className="space-y-4">{Array.from({ length: 7 }).map((_, index) => <Skeleton key={index} className="h-20 w-full" />)}</div>;
  }

  if (query.isError || !query.data) {
    return <ErrorState title="Agent could not load" message="The agent may not exist or the admin API is unavailable." onRetry={() => query.refetch()} />;
  }

  const agent = query.data;
  const metrics = agent.metrics;
  const doctors = agent.doctors || [];

  return <div className="space-y-6">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <button type="button" onClick={() => navigate('/admin/agents')} className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-neutral-600"><ArrowLeft className="h-4 w-4" />Agents</button>
        <p className="text-xs font-bold uppercase tracking-[.16em] text-primary-700">Agent network</p>
        <div className="mt-2 flex flex-wrap items-center gap-3"><h1 className="text-2xl font-bold text-neutral-950 sm:text-3xl">{agent.fullName || 'Agent'}</h1><span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', agent.status === 'active' ? 'bg-emerald-50 text-emerald-700' : agent.status === 'suspended' || agent.status === 'terminated' ? 'bg-red-50 text-red-700' : 'bg-neutral-100 text-neutral-700')}>{label(agent.status)}</span></div>
        <p className="mt-1 text-sm text-neutral-500">{agent.agentId || agent.id || '—'} · {agent.assignedRegion || agent.city || 'Region not assigned'}</p>
      </div>
      <button type="button" onClick={() => query.refetch()} className="inline-flex min-h-11 items-center gap-2 self-start rounded-lg border bg-white px-4 text-sm font-semibold"><RefreshCw className={cn('h-4 w-4', query.isFetching && 'animate-spin')} />Refresh</button>
    </header>

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[[Stethoscope, 'Doctors registered', metrics?.doctorsRegistered], [UsersRound, 'Patients generated', metrics?.patientsGenerated], [UserRoundCheck, 'Paid patients', metrics?.paidPatients], [IndianRupee, 'Attributed revenue', metrics?.revenueGenerated == null ? '—' : money(metrics.revenueGenerated)]].map(([Icon, title, value]: any) => <div key={title} className="rounded-xl border bg-white p-4"><Icon className="h-5 w-5 text-neutral-500" /><p className="mt-3 text-xs font-semibold uppercase text-neutral-500">{title}</p><p className="mt-1 text-2xl font-bold">{value ?? '—'}</p></div>)}
    </section>

    <div className="grid gap-5 xl:grid-cols-2">
      <section className="rounded-xl border bg-white p-5"><h2 className="font-bold">Profile</h2><dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">{[['Agent ID', agent.agentId], ['Mobile', agent.mobile], ['WhatsApp', agent.whatsapp], ['Email', agent.email], ['City', agent.city], ['State', agent.state], ['Assigned region', agent.assignedRegion], ['Reporting person', agent.reportingPerson], ['Joining date', agent.joiningDate ? new Date(agent.joiningDate).toLocaleDateString() : '—']].map(([term, value]) => <div key={term}><dt className="text-xs font-semibold uppercase text-neutral-500">{term}</dt><dd className="mt-1 break-words font-medium">{value || '—'}</dd></div>)}</dl></section>
      <section className="rounded-xl border bg-white p-5"><h2 className="font-bold">Operational context</h2><dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">{[['Status', label(agent.status)], ['Created', agent.createdAt ? new Date(agent.createdAt).toLocaleString() : '—'], ['Updated', agent.updatedAt ? new Date(agent.updatedAt).toLocaleString() : '—'], ['Address', agent.address]].map(([term, value]) => <div key={term}><dt className="text-xs font-semibold uppercase text-neutral-500">{term}</dt><dd className="mt-1 break-words font-medium">{value || '—'}</dd></div>)}</dl><div className="mt-5 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">This page uses the admin agent detail contract only. Identity proof is intentionally excluded by the backend response, and no unsupported destructive action is exposed here.</div></section>
    </div>

    <section className="overflow-hidden rounded-xl border bg-white">
      <div className="flex items-center gap-3 border-b px-5 py-4"><Building2 className="h-5 w-5 text-neutral-500" /><div><h2 className="font-bold">Doctor network</h2><p className="mt-1 text-sm text-neutral-500">Doctors currently attributed to this agent.</p></div></div>
      {!doctors.length ? <div className="p-10 text-center text-sm text-neutral-500">No doctors are currently linked to this agent.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-neutral-50 text-xs uppercase text-neutral-500"><tr><th className="px-5 py-3">Doctor</th><th className="px-4 py-3">Clinic</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Patient fee</th><th className="px-4 py-3">Revenue model</th><th className="px-5 py-3 text-right">Action</th></tr></thead><tbody className="divide-y">{doctors.map((doctor) => <tr key={doctor._id}><td className="px-5 py-4"><div className="font-semibold">{doctor.fullName || '—'}</div><div className="text-xs text-neutral-500">{doctor.doctorId || '—'}</div></td><td className="px-4 py-4"><div>{doctor.clinicName || '—'}</div><div className="text-xs text-neutral-500">{doctor.city || '—'}</div></td><td className="px-4 py-4">{label(doctor.status)}</td><td className="px-4 py-4">{money(doctor.approvedPatientFee)}</td><td className="px-4 py-4">{label(doctor.revenueModel)}</td><td className="px-5 py-4 text-right"><button type="button" onClick={() => navigate(`/admin/doctors/${doctor._id}`)} className="rounded-lg border px-3 py-2 text-xs font-semibold">View doctor</button></td></tr>)}</tbody></table></div>}
    </section>
  </div>;
}
