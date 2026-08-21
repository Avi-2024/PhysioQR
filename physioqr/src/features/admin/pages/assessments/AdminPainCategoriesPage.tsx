import { useDeferredValue, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Activity, ChevronLeft, ChevronRight, FolderHeart, Plus, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import apiClient from '@/lib/api-client';
import { Modal } from '@/components/ui/Modal';

type Category = {
  _id: string;
  name: string;
  nameHindi?: string;
  description?: string;
  isActive: boolean;
  linkedPrograms: number;
  activePrograms: number;
  assessmentUsage: number;
};
type Payload = {
  items: Category[];
  meta: { page: number; total: number; totalPages: number };
  summary: { total: number; active: number; inactive: number };
};

export default function AdminPainCategoriesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search.trim());
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', nameHindi: '', description: '' });

  const query = useQuery({
    queryKey: ['admin-pain-categories', deferredSearch, status, page],
    queryFn: async () => (await apiClient.get<Payload>('/admin/pain-categories', {
      params: { search: deferredSearch || undefined, status, page, limit: 20 },
    })).data,
  });

  const create = useMutation({
    mutationFn: async () => apiClient.post('/admin/pain-categories', form),
    onSuccess: async () => {
      setOpen(false);
      setForm({ name: '', nameHindi: '', description: '' });
      await queryClient.invalidateQueries({ queryKey: ['admin-pain-categories'] });
      await queryClient.invalidateQueries({ queryKey: ['pain-categories'] });
    },
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (form.name.trim()) create.mutate();
  };

  const data = query.data;
  return <div className="space-y-6">
    <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <p className="text-xs font-semibold tracking-[0.18em] text-emerald-700">CLINICAL TAXONOMY</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-950">Pain Categories</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">These are the pain-area choices shown inside the common patient assessment. They do not create separate assessment question sets. Categories map to rehabilitation programs and remain attached to historical assessment records.</p>
      </div>
      <div className="flex gap-2">
        <button onClick={() => query.refetch()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700"><RefreshCw size={16}/>Refresh</button>
        <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white"><Plus size={16}/>Add Category</button>
      </div>
    </header>

    <section className="grid gap-3 sm:grid-cols-3">
      <Summary label="Total categories" value={query.isLoading ? '—' : data?.summary.total ?? '—'} icon={<FolderHeart size={17}/>} />
      <Summary label="Active" value={query.isLoading ? '—' : data?.summary.active ?? '—'} icon={<ShieldCheck size={17}/>} />
      <Summary label="Inactive" value={query.isLoading ? '—' : data?.summary.inactive ?? '—'} icon={<Activity size={17}/>} />
    </section>

    <section className="rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row">
        <label className="relative flex-1"><Search size={16} className="absolute left-3 top-3 text-slate-400"/><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search name, Hindi name, or description" className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-emerald-500"/></label>
        <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"><option value="all">All status</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
      </div>

      {query.isLoading ? <div className="p-8 text-sm text-slate-500">Loading pain categories…</div> : query.isError ? <div className="p-8 text-sm text-red-700">Pain categories could not be loaded. <button onClick={() => query.refetch()} className="font-semibold underline">Retry</button></div> : !data?.items.length ? <div className="p-10 text-center"><FolderHeart className="mx-auto text-slate-400"/><p className="mt-3 font-medium">No pain categories found</p><p className="mt-1 text-sm text-slate-500">Create the first category or change the current filters.</p></div> : <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Category</th><th className="px-4 py-3">Programs</th><th className="px-4 py-3">Assessment usage</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{data.items.map((row) => <tr key={row._id} className="hover:bg-slate-50"><td className="px-4 py-4"><p className="font-medium text-slate-900">{row.name}</p><p className="mt-1 text-xs text-slate-500">{row.nameHindi || row.description || '—'}</p></td><td className="px-4 py-4 text-slate-700">{row.activePrograms} active <span className="text-slate-400">/ {row.linkedPrograms}</span></td><td className="px-4 py-4 text-slate-700">{row.assessmentUsage}</td><td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${row.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{row.isActive ? 'Active' : 'Inactive'}</span></td><td className="px-4 py-4 text-right"><button onClick={() => navigate(`/admin/pain-categories/${row._id}`)} className="font-semibold text-emerald-700">View</button></td></tr>)}</tbody></table></div>}

      {data && data.meta.totalPages > 1 && <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm"><span className="text-slate-500">Page {data.meta.page} of {data.meta.totalPages} · {data.meta.total} categories</span><div className="flex gap-2"><button disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded-lg border p-2 disabled:opacity-40"><ChevronLeft size={16}/></button><button disabled={page >= data.meta.totalPages} onClick={() => setPage((value) => value + 1)} className="rounded-lg border p-2 disabled:opacity-40"><ChevronRight size={16}/></button></div></div>}
    </section>

    <Modal isOpen={open} onClose={() => setOpen(false)} title="Add pain category" size="lg"><form onSubmit={submit} className="space-y-4 pt-4"><div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-800">This category will appear as a choice inside the same common assessment for every patient.</div><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium text-slate-700">Category name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 p-3" placeholder="e.g. Lower Back Pain"/></label><label className="text-sm font-medium text-slate-700">Hindi name<input value={form.nameHindi} onChange={(event) => setForm({ ...form, nameHindi: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 p-3" placeholder="Optional"/></label></div><label className="block text-sm font-medium text-slate-700">Description<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={4} className="mt-1 w-full rounded-xl border border-slate-200 p-3" placeholder="Patient-facing category purpose and scope"/></label>{create.isError && <p className="text-sm text-red-700">Category could not be created. Check for a duplicate name and retry.</p>}<div className="flex justify-end gap-2"><button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold">Cancel</button><button disabled={!form.name.trim() || create.isPending} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{create.isPending ? 'Creating…' : 'Create category'}</button></div></form></Modal>
  </div>;
}

function Summary({ label, value, icon }: { label: string; value: number | string; icon: ReactNode }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-center justify-between"><p className="text-sm text-slate-500">{label}</p><span className="text-slate-400">{icon}</span></div><p className="mt-3 text-2xl font-semibold text-slate-950">{value}</p></div>;
}
