import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Clock3, Plus, Search, ShieldCheck, Stethoscope, XCircle } from 'lucide-react';
import apiClient from '@/lib/api-client';
import { DataTable, type DataTableColumn } from '@/components/data-display/DataTable';
import ErrorState from '@/components/feedback/ErrorState';

type ApiRecord = Record<string, unknown>;
type DoctorRow = {
  id: string;
  doctorId: string;
  fullName: string;
  clinicName: string;
  city: string;
  specialization: string;
  mobile: string;
  status: string;
  qrCodeActive: boolean;
  createdAt: string;
};

export default function AgentDoctorsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const query = useQuery({ queryKey: ['agent-doctors'], queryFn: async () => (await apiClient.get('/agents/me/doctors')).data });

  const rows = useMemo(() => extractItems(query.data).map(mapDoctor), [query.data]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesSearch = !q || [row.fullName, row.doctorId, row.clinicName, row.city, row.specialization, row.mobile].some((value) => value.toLowerCase().includes(q));
      return matchesSearch && (status === 'all' || row.status === status);
    });
  }, [rows, search, status]);

  const needsReview = rows.filter((row) => ['submitted', 'under_review', 'documents_required'].includes(row.status)).length;
  const columns: DataTableColumn<DoctorRow>[] = [
    { key: 'fullName', header: 'Doctor', render: (row) => <div><p className="font-semibold text-neutral-900">{row.fullName}</p><p className="text-xs text-neutral-500">{row.doctorId}</p></div> },
    { key: 'clinicName', header: 'Clinic', render: (row) => <div><p className="text-sm font-medium text-neutral-800">{row.clinicName}</p><p className="text-xs text-neutral-500">{row.city}</p></div> },
    { key: 'specialization', header: 'Specialization', render: (row) => <span className="text-sm text-neutral-700">{row.specialization}</span> },
    { key: 'mobile', header: 'Contact', render: (row) => <span className="text-sm text-neutral-700">{row.mobile}</span> },
    { key: 'status', header: 'Status', render: (row) => <StatusPill value={row.status} /> },
    { key: 'qrCodeActive', header: 'QR', render: (row) => <span className={`text-xs font-semibold ${row.qrCodeActive ? 'text-emerald-700' : 'text-neutral-500'}`}>{row.qrCodeActive ? 'Active' : 'Not active'}</span> },
    { key: 'createdAt', header: 'Added', render: (row) => <span className="text-sm text-neutral-600">{dateText(row.createdAt)}</span> },
  ];

  if (query.isError) return <ErrorState title="Doctors could not load" message="Your assigned doctor list is temporarily unavailable." onRetry={() => query.refetch()} />;

  return <div className="space-y-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-600">Doctor onboarding</p><h1 className="mt-1 text-2xl font-bold text-neutral-900 sm:text-3xl">My Doctors</h1><p className="mt-1 text-sm text-neutral-500">Doctors registered by you are approved automatically and shown here immediately.</p></div>
      <button onClick={() => navigate('/agent/doctors/new')} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"><Plus className="h-4 w-4" /> Register Doctor</button>
    </div>

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Kpi icon={Stethoscope} label="Total doctors" value={rows.length} />
      <Kpi icon={ShieldCheck} label="Approved" value={rows.filter((row) => row.status === 'approved').length} />
      <Kpi icon={Clock3} label="Needs review" value={needsReview} />
      <Kpi icon={XCircle} label="Rejected / suspended" value={rows.filter((row) => ['rejected', 'suspended'].includes(row.status)).length} />
    </div>

    <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full max-w-xl"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search doctor, clinic, city, specialization or mobile" className="w-full rounded-lg border border-neutral-300 py-2.5 pl-9 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100" /></div>
        <div className="flex flex-wrap gap-2">{['all', 'approved', 'under_review', 'documents_required', 'rejected', 'suspended', 'inactive'].map((item) => <button key={item} type="button" onClick={() => setStatus(item)} className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${status === item ? 'bg-primary-600 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}>{item === 'all' ? 'All' : item.replace(/_/g, ' ')}</button>)}</div>
      </div>
      <div className="mt-5"><DataTable columns={columns} data={filtered} loading={query.isLoading} emptyMessage="No doctors match the current filters." onRowClick={(row) => navigate(`/agent/doctors/${row.id}`)} /></div>
    </section>

    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-xs text-neutral-600">Agent access is operational only. Banking, payout, fee-share and confidential patient medical information are not displayed.</div>
  </div>;
}

function Kpi({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) { return <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"><Icon className="h-5 w-5 text-primary-600" /><p className="mt-3 text-2xl font-bold text-neutral-900">{value}</p><p className="text-sm text-neutral-500">{label}</p></div>; }
function StatusPill({ value }: { value: string }) { const positive = value === 'approved'; const warning = ['submitted', 'under_review', 'documents_required'].includes(value); const negative = ['rejected', 'suspended'].includes(value); return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ${positive ? 'bg-emerald-50 text-emerald-700' : warning ? 'bg-amber-50 text-amber-700' : negative ? 'bg-rose-50 text-rose-700' : 'bg-neutral-100 text-neutral-700'}`}>{value.replace(/_/g, ' ')}</span>; }
function mapDoctor(record: ApiRecord): DoctorRow { return { id: text(record._id || record.id), doctorId: text(record.doctorId, '-'), fullName: text(record.fullName, 'Unnamed doctor'), clinicName: text(record.clinicName, 'Clinic not captured'), city: text(record.city, '-'), specialization: text(record.specialization, '-'), mobile: text(record.mobile, '-'), status: text(record.status, 'draft'), qrCodeActive: Boolean(record.qrCodeActive), createdAt: text(record.createdAt) }; }
function extractItems(value: unknown): ApiRecord[] { if (Array.isArray(value)) return value as ApiRecord[]; const record = value && typeof value === 'object' ? value as ApiRecord : {}; if (Array.isArray(record.items)) return record.items as ApiRecord[]; if (Array.isArray(record.data)) return record.data as ApiRecord[]; return []; }
function text(value: unknown, fallback = '') { return value === undefined || value === null || value === '' ? fallback : String(value); }
function dateText(value: unknown) { if (!value) return '-'; const date = new Date(String(value)); return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
