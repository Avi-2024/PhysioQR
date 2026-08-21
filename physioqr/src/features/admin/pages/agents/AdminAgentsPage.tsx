import { useDeferredValue, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  Plus,
  RefreshCw,
  ShieldAlert,
  UserCheck,
  Users,
  UserX,
} from 'lucide-react';
import apiClient from '@/lib/api-client';
import { AgentRecordForm } from '@/features/admin/components/AgentRecordForm';
import ErrorState from '@/components/feedback/ErrorState';
import { Modal } from '@/components/ui/Modal';
import { SearchInput } from '@/components/ui/SearchInput';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';
import { formatDate } from '@/features/admin/resources';

type AgentStatus = 'active' | 'inactive' | 'suspended' | 'terminated';

type AgentRecord = {
  _id: string;
  id?: string;
  agentId: string;
  fullName: string;
  mobile: string;
  whatsapp?: string;
  email?: string;
  city?: string;
  state?: string;
  assignedRegion?: string;
  joiningDate?: string;
  reportingPerson?: string;
  status: AgentStatus;
};

type AgentSummary = {
  total: number;
  active: number;
  inactive: number;
  suspended: number;
  terminated: number;
};

type AgentListResponse = {
  items: AgentRecord[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: AgentSummary;
};

type CreatedAgentResponse = {
  agent?: AgentRecord;
  user?: {
    email?: string;
    mobile?: string;
  };
  temporaryPassword?: string;
};

const PAGE_SIZE = 20;

const emptyResponse: AgentListResponse = {
  items: [],
  meta: { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 },
  summary: { total: 0, active: 0, inactive: 0, suspended: 0, terminated: 0 },
};

const STATUS_OPTIONS: { value: '' | AgentStatus; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'terminated', label: 'Terminated' },
];

function StatusPill({ status }: { status: AgentStatus }) {
  const tone = {
    active: 'bg-emerald-50 text-emerald-700 ring-emerald-600/10',
    inactive: 'bg-neutral-100 text-neutral-700 ring-neutral-600/10',
    suspended: 'bg-amber-50 text-amber-700 ring-amber-600/10',
    terminated: 'bg-rose-50 text-rose-700 ring-rose-600/10',
  }[status];

  return (
    <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset', tone)}>
      {status}
    </span>
  );
}

function displayText(value: string | undefined, fallback = '—') {
  return value?.trim() || fallback;
}

export default function AdminAgentsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search.trim());
  const [status, setStatus] = useState<'' | AgentStatus>('');
  const [page, setPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createdAgent, setCreatedAgent] = useState<CreatedAgentResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const query = useQuery<AgentListResponse>({
    queryKey: ['admin-agents', page, deferredSearch, status],
    queryFn: () =>
      apiClient
        .get('/admin/agents', {
          params: {
            page,
            limit: PAGE_SIZE,
            ...(deferredSearch ? { search: deferredSearch } : {}),
            ...(status ? { status } : {}),
          },
        })
        .then((response) => response.data),
  });

  const data = query.data ?? emptyResponse;
  const rows = data.items ?? [];
  const summary = data.summary ?? emptyResponse.summary;
  const meta = data.meta ?? emptyResponse.meta;

  const summaryCards = useMemo(
    () => [
      { label: 'Total agents', value: summary.total, icon: Users, tone: 'bg-sky-50 text-sky-700' },
      { label: 'Active', value: summary.active, icon: UserCheck, tone: 'bg-emerald-50 text-emerald-700' },
      { label: 'Suspended', value: summary.suspended, icon: ShieldAlert, tone: 'bg-amber-50 text-amber-700' },
      { label: 'Terminated', value: summary.terminated, icon: UserX, tone: 'bg-rose-50 text-rose-700' },
    ],
    [summary],
  );

  const openCreate = () => {
    setCreatedAgent(null);
    setCopied(false);
    setIsCreateOpen(true);
  };

  const closeCreate = () => {
    setIsCreateOpen(false);
    setCreatedAgent(null);
    setCopied(false);
  };

  const copyPassword = async () => {
    if (!createdAgent?.temporaryPassword) return;
    await navigator.clipboard.writeText(createdAgent.temporaryPassword);
    setCopied(true);
  };

  const setSearchValue = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const setStatusValue = (value: '' | AgentStatus) => {
    setStatus(value);
    setPage(1);
  };

  return (
    <div className="space-y-6 min-w-0">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-700">Agent management</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-neutral-950 sm:text-3xl">Agents</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-neutral-500">
            Manage field agents, their assigned regions, contact details, status, and doctor onboarding ownership.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => query.refetch()}
            disabled={query.isFetching}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={cn('h-4 w-4', query.isFetching && 'animate-spin')} />
            Refresh
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white transition hover:bg-primary-700"
          >
            <Plus className="h-4 w-4" />
            Add agent
          </button>
        </div>
      </header>

      {!query.isError && (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((item) => (
            <div key={item.label} className="rounded-xl border border-neutral-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{item.label}</p>
                  <p className="mt-2 text-2xl font-bold text-neutral-950">{query.isLoading ? '—' : item.value}</p>
                </div>
                <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', item.tone)}>
                  <item.icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          ))}
        </section>
      )}

      <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <div className="border-b border-neutral-200 px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 flex-1 lg:max-w-xl">
              <SearchInput
                value={search}
                onChange={setSearchValue}
                placeholder="Search agent ID, name, mobile, email, city, state, or region"
              />
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <select
                value={status}
                onChange={(event) => setStatusValue(event.target.value as '' | AgentStatus)}
                className="min-h-11 rounded-lg border border-neutral-300 bg-white px-3 text-sm font-medium text-neutral-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
                aria-label="Filter agents by status"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value || 'all'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              {(search || status) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setStatus('');
                    setPage(1);
                  }}
                  className="min-h-11 rounded-lg px-3 text-sm font-semibold text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>

          {!query.isLoading && !query.isError && (
            <p className="mt-3 text-xs text-neutral-500">
              {meta.total} agent{meta.total === 1 ? '' : 's'} found
              {status ? ` with ${status} status` : ''}
              {deferredSearch ? ` matching “${deferredSearch}”` : ''}.
            </p>
          )}
        </div>

        {query.isError ? (
          <div className="p-5">
            <ErrorState
              title="Agents could not load"
              message="Check the API connection, admin session, and agent permissions."
              onRetry={() => query.refetch()}
            />
          </div>
        ) : query.isLoading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 7 }).map((_, index) => (
              <Skeleton key={index} className="h-14 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <Users className="mx-auto h-9 w-9 text-neutral-300" />
            <h2 className="mt-3 text-sm font-semibold text-neutral-900">No agents found</h2>
            <p className="mt-1 text-sm text-neutral-500">
              {search || status ? 'Try clearing the current search or status filter.' : 'Create the first field agent to start onboarding doctors.'}
            </p>
            {!search && !status && (
              <button
                type="button"
                onClick={openCreate}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
              >
                <Plus className="h-4 w-4" /> Add agent
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="border-b border-neutral-200 bg-neutral-50/80">
                  <tr className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    <th className="px-5 py-3">Agent</th>
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3">Region</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Joined</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {rows.map((agent) => (
                    <tr
                      key={agent._id}
                      className="cursor-pointer transition hover:bg-neutral-50"
                      onClick={() => navigate(`/admin/agents/${agent._id}`)}
                    >
                      <td className="px-5 py-4">
                        <div className="font-semibold text-neutral-950">{agent.fullName}</div>
                        <div className="mt-0.5 text-xs font-medium text-neutral-500">{agent.agentId}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-medium text-neutral-800">{agent.mobile}</div>
                        <div className="mt-0.5 max-w-[220px] truncate text-xs text-neutral-500">{displayText(agent.email)}</div>
                      </td>
                      <td className="px-4 py-4 text-neutral-700">
                        <div>{displayText(agent.city)}</div>
                        {agent.state && <div className="mt-0.5 text-xs text-neutral-500">{agent.state}</div>}
                      </td>
                      <td className="px-4 py-4 font-medium text-neutral-700">{displayText(agent.assignedRegion)}</td>
                      <td className="px-4 py-4"><StatusPill status={agent.status} /></td>
                      <td className="px-4 py-4 text-neutral-600">{formatDate(agent.joiningDate)}</td>
                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            navigate(`/admin/agents/${agent._id}`);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 transition hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700"
                        >
                          View
                          <ExternalLink className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-neutral-100 md:hidden">
              {rows.map((agent) => (
                <button
                  key={agent._id}
                  type="button"
                  onClick={() => navigate(`/admin/agents/${agent._id}`)}
                  className="block w-full px-4 py-4 text-left transition hover:bg-neutral-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-neutral-950">{agent.fullName}</div>
                      <div className="mt-0.5 text-xs font-medium text-neutral-500">{agent.agentId}</div>
                    </div>
                    <StatusPill status={agent.status} />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                    <div><span className="text-neutral-400">Mobile</span><div className="mt-0.5 font-medium text-neutral-700">{agent.mobile}</div></div>
                    <div><span className="text-neutral-400">Region</span><div className="mt-0.5 font-medium text-neutral-700">{displayText(agent.assignedRegion)}</div></div>
                    <div><span className="text-neutral-400">City</span><div className="mt-0.5 font-medium text-neutral-700">{displayText(agent.city)}</div></div>
                    <div><span className="text-neutral-400">Joined</span><div className="mt-0.5 font-medium text-neutral-700">{formatDate(agent.joiningDate)}</div></div>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-3 border-t border-neutral-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <p className="text-xs text-neutral-500">
                Page {meta.page} of {meta.totalPages} · {meta.total} result{meta.total === 1 ? '' : 's'}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={meta.page <= 1 || query.isFetching}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.min(meta.totalPages, current + 1))}
                  disabled={meta.page >= meta.totalPages || query.isFetching}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      <Modal isOpen={isCreateOpen} onClose={closeCreate} title={createdAgent ? 'Agent created' : 'Add agent'} size="xl">
        {createdAgent ? (
          <div className="space-y-5">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-emerald-700 ring-1 ring-emerald-200">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-emerald-950">Agent account created successfully</h3>
                  <p className="mt-1 text-sm text-emerald-800">Share the temporary login credentials securely with the agent.</p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <CredentialField label="Agent" value={createdAgent.agent?.fullName || '—'} />
              <CredentialField label="Agent ID" value={createdAgent.agent?.agentId || '—'} />
              <CredentialField label="Login email" value={createdAgent.user?.email || '—'} />
              <CredentialField label="Login mobile" value={createdAgent.user?.mobile || '—'} />
            </div>

            {createdAgent.temporaryPassword && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="text-xs font-bold uppercase tracking-wide text-amber-700">Temporary password</div>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <code className="break-all text-base font-bold text-amber-950">{createdAgent.temporaryPassword}</code>
                  <button
                    type="button"
                    onClick={copyPassword}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-amber-300 bg-white px-3 text-sm font-semibold text-amber-800 hover:bg-amber-100"
                  >
                    <Copy className="h-4 w-4" /> {copied ? 'Copied' : 'Copy password'}
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={closeCreate}
                className="rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <AgentRecordForm
            onCancel={closeCreate}
            onSaved={async (response) => {
              setCreatedAgent((response ?? {}) as CreatedAgentResponse);
              await query.refetch();
            }}
          />
        )}
      </Modal>
    </div>
  );
}

function CredentialField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{label}</div>
      <div className="mt-1 break-words text-sm font-semibold text-neutral-900">{value}</div>
    </div>
  );
}
