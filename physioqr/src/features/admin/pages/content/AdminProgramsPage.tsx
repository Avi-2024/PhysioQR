import { useDeferredValue, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Activity, BookOpenCheck, ChevronLeft, ChevronRight, ExternalLink, Layers3, Plus, RefreshCw } from 'lucide-react';
import apiClient from '@/lib/api-client';
import ErrorState from '@/components/feedback/ErrorState';
import { SearchInput } from '@/components/ui/SearchInput';
import { Skeleton } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/cn';
import { formatCurrency } from '@/lib/formatters';

type Category = { _id: string; name: string; isActive?: boolean };
type Program = {
  _id: string;
  programCode?: string;
  name: string;
  nameHindi?: string;
  painCategory?: Category | null;
  difficultyLevel?: string;
  durationDays: number;
  sessionsPerDay?: number;
  defaultPrice?: number;
  isActive: boolean;
  metrics?: { dayCount: number; enrollmentCount: number; activeEnrollmentCount: number };
};
type Response = {
  items: Program[];
  meta: { page: number; limit: number; total: number; totalPages: number };
  summary: { total: number; active: number; inactive: number; mappedCategories: number };
};

const PAGE_SIZE = 20;
const difficultyLevels = ['beginner', 'intermediate', 'advanced', 'senior_friendly', 'post_operative', 'general_mobility', 'condition_specific'];
const labelize = (value?: string) => value ? value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()) : '—';

export default function AdminProgramsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search.trim());
  const [status, setStatus] = useState('active');
  const [categoryId, setCategoryId] = useState('');
  const [difficultyLevel, setDifficultyLevel] = useState('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [formError, setFormError] = useState('');

  const query = useQuery<Response>({
    queryKey: ['admin-programs', page, deferredSearch, status, categoryId, difficultyLevel],
    queryFn: () => apiClient.get('/admin/programs', {
      params: {
        page,
        limit: PAGE_SIZE,
        ...(deferredSearch ? { search: deferredSearch } : {}),
        ...(status ? { status } : {}),
        ...(categoryId ? { categoryId } : {}),
        ...(difficultyLevel ? { difficultyLevel } : {}),
      },
    }).then((response) => response.data),
  });

  const categoriesQuery = useQuery<Category[]>({
    queryKey: ['assessment-categories'],
    queryFn: () => apiClient.get('/assessments/categories').then((response) => response.data),
  });

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => apiClient.post('/admin/programs', payload),
    onSuccess: () => {
      setShowCreate(false);
      setFormError('');
      queryClient.invalidateQueries({ queryKey: ['admin-programs'] });
      queryClient.invalidateQueries({ queryKey: ['admin-pain-categories'] });
    },
    onError: (error: any) => setFormError(error?.response?.data?.message || 'Program could not be created.'),
  });

  const cards = useMemo(() => [
    { label: 'Total programs', value: query.data?.summary.total ?? '—', icon: Layers3 },
    { label: 'Active programs', value: query.data?.summary.active ?? '—', icon: Activity },
    { label: 'Inactive programs', value: query.data?.summary.inactive ?? '—', icon: BookOpenCheck },
    { label: 'Mapped categories', value: query.data?.summary.mappedCategories ?? '—', icon: BookOpenCheck },
  ], [query.data?.summary]);

  const handleCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');
    const form = new FormData(event.currentTarget);
    createMutation.mutate({
      programCode: String(form.get('programCode') || '').trim() || undefined,
      name: String(form.get('name') || '').trim(),
      nameHindi: String(form.get('nameHindi') || '').trim(),
      painCategory: String(form.get('painCategory') || ''),
      difficultyLevel: String(form.get('difficultyLevel') || '') || undefined,
      durationDays: Number(form.get('durationDays')),
      sessionsPerDay: Number(form.get('sessionsPerDay') || 1),
      defaultPrice: form.get('defaultPrice') === '' ? undefined : Number(form.get('defaultPrice')),
      description: String(form.get('description') || '').trim(),
    });
  };

  return <div className="min-w-0 space-y-6">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-700">Clinical content</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-neutral-950 sm:text-3xl">Programs</h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-neutral-500">Manage rehabilitation programs that are matched from the pain category selected inside the common assessment.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => query.refetch()} disabled={query.isFetching} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"><RefreshCw className={cn('h-4 w-4', query.isFetching && 'animate-spin')} />Refresh</button>
        <button type="button" onClick={() => setShowCreate(true)} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700"><Plus className="h-4 w-4" />New program</button>
      </div>
    </header>

    {!query.isError && <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map((card) => <div key={card.label} className="rounded-xl border border-neutral-200 bg-white p-4"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{card.label}</p><p className="mt-2 text-2xl font-bold text-neutral-950">{query.isLoading ? '—' : card.value}</p></div><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-50 text-neutral-600"><card.icon className="h-5 w-5" /></div></div></div>)}</section>}

    <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <div className="border-b border-neutral-200 px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="min-w-0 flex-1"><SearchInput value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Search program name, code, or description" /></div>
          <select value={categoryId} onChange={(event) => { setCategoryId(event.target.value); setPage(1); }} className="min-h-11 rounded-lg border border-neutral-300 bg-white px-3 text-sm"><option value="">All pain categories</option>{categoriesQuery.data?.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}</select>
          <select value={difficultyLevel} onChange={(event) => { setDifficultyLevel(event.target.value); setPage(1); }} className="min-h-11 rounded-lg border border-neutral-300 bg-white px-3 text-sm"><option value="">All difficulty levels</option>{difficultyLevels.map((level) => <option key={level} value={level}>{labelize(level)}</option>)}</select>
          <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="min-h-11 rounded-lg border border-neutral-300 bg-white px-3 text-sm"><option value="active">Active</option><option value="inactive">Inactive</option><option value="">All statuses</option></select>
        </div>
        {!query.isLoading && !query.isError && <p className="mt-3 text-xs text-neutral-500">{query.data?.meta.total ?? 0} program{query.data?.meta.total === 1 ? '' : 's'} found.</p>}
      </div>

      {query.isError ? <div className="p-5"><ErrorState title="Programs could not load" message="Check the admin API and session, then retry." onRetry={() => query.refetch()} /></div> : query.isLoading ? <div className="space-y-3 p-5">{Array.from({ length: 7 }).map((_, index) => <Skeleton key={index} className="h-14 w-full" />)}</div> : !query.data?.items.length ? <div className="px-5 py-14 text-center"><Layers3 className="mx-auto h-9 w-9 text-neutral-300" /><h2 className="mt-3 text-sm font-semibold text-neutral-900">No programs found</h2><p className="mt-1 text-sm text-neutral-500">Create a program or adjust the filters.</p></div> : <>
        <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[1120px] text-left text-sm"><thead className="border-b border-neutral-200 bg-neutral-50/80"><tr className="text-xs font-semibold uppercase tracking-wide text-neutral-500"><th className="px-5 py-3">Program</th><th className="px-4 py-3">Pain category</th><th className="px-4 py-3">Plan</th><th className="px-4 py-3">Content</th><th className="px-4 py-3">Enrollments</th><th className="px-4 py-3">Price</th><th className="px-4 py-3">Status</th><th className="px-5 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-neutral-100">{query.data.items.map((item) => <tr key={item._id} onClick={() => navigate(`/admin/programs/${item._id}`)} className="cursor-pointer hover:bg-neutral-50"><td className="px-5 py-4"><div className="font-semibold text-neutral-950">{item.name}</div><div className="mt-1 text-xs text-neutral-500">{item.programCode || 'No program code'} · {labelize(item.difficultyLevel)}</div></td><td className="px-4 py-4 font-medium text-neutral-700">{item.painCategory?.name || '—'}</td><td className="px-4 py-4 text-neutral-600">{item.durationDays} days · {item.sessionsPerDay || 1}/day</td><td className="px-4 py-4 text-neutral-600">{item.metrics?.dayCount ?? '—'} configured days</td><td className="px-4 py-4 text-neutral-600"><div>{item.metrics?.activeEnrollmentCount ?? '—'} active</div><div className="text-xs text-neutral-400">{item.metrics?.enrollmentCount ?? '—'} total</div></td><td className="px-4 py-4 font-semibold text-neutral-800">{typeof item.defaultPrice === 'number' ? formatCurrency(item.defaultPrice) : '—'}</td><td className="px-4 py-4"><span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', item.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-600')}>{item.isActive ? 'Active' : 'Inactive'}</span></td><td className="px-5 py-4 text-right"><button type="button" onClick={(event) => { event.stopPropagation(); navigate(`/admin/programs/${item._id}`); }} className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-primary-50 hover:text-primary-700">Manage <ExternalLink className="h-3.5 w-3.5" /></button></td></tr>)}</tbody></table></div>
        <div className="divide-y divide-neutral-100 md:hidden">{query.data.items.map((item) => <button key={item._id} type="button" onClick={() => navigate(`/admin/programs/${item._id}`)} className="block w-full px-4 py-4 text-left"><div className="flex items-start justify-between gap-3"><div><div className="font-semibold text-neutral-950">{item.name}</div><div className="mt-1 text-xs text-neutral-500">{item.painCategory?.name || 'No category'} · {item.durationDays} days</div></div><span className={cn('rounded-full px-2 py-1 text-xs font-semibold', item.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-600')}>{item.isActive ? 'Active' : 'Inactive'}</span></div></button>)}</div>
        <div className="flex items-center justify-between border-t border-neutral-200 px-4 py-3 sm:px-5"><p className="text-xs text-neutral-500">Page {query.data.meta.page} of {Math.max(query.data.meta.totalPages, 1)}</p><div className="flex gap-2"><button disabled={query.data.meta.page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button><button disabled={query.data.meta.page >= query.data.meta.totalPages} onClick={() => setPage((value) => value + 1)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button></div></div>
      </>}
    </section>

    <Modal isOpen={showCreate} onClose={() => { setShowCreate(false); setFormError(''); }} title="Create rehabilitation program" size="lg">
      <form onSubmit={handleCreate} className="space-y-5 pt-5">
        <p className="text-sm text-neutral-600">Every program must map to an active pain category so patient onboarding can resolve the correct rehabilitation content after a safe assessment.</p>
        {formError && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{formError}</div>}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2"><span className="text-xs font-semibold text-neutral-600">Program name *</span><input name="name" required className="mt-1 min-h-11 w-full rounded-lg border border-neutral-300 px-3 text-sm" /></label>
          <label><span className="text-xs font-semibold text-neutral-600">Program code</span><input name="programCode" className="mt-1 min-h-11 w-full rounded-lg border border-neutral-300 px-3 text-sm" placeholder="KNEE-001" /></label>
          <label><span className="text-xs font-semibold text-neutral-600">Hindi name</span><input name="nameHindi" className="mt-1 min-h-11 w-full rounded-lg border border-neutral-300 px-3 text-sm" /></label>
          <label><span className="text-xs font-semibold text-neutral-600">Pain category *</span><select name="painCategory" required className="mt-1 min-h-11 w-full rounded-lg border border-neutral-300 px-3 text-sm"><option value="">Select category</option>{categoriesQuery.data?.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}</select></label>
          <label><span className="text-xs font-semibold text-neutral-600">Difficulty</span><select name="difficultyLevel" className="mt-1 min-h-11 w-full rounded-lg border border-neutral-300 px-3 text-sm"><option value="">Not specified</option>{difficultyLevels.map((level) => <option key={level} value={level}>{labelize(level)}</option>)}</select></label>
          <label><span className="text-xs font-semibold text-neutral-600">Duration days *</span><input name="durationDays" type="number" min="1" max="365" required className="mt-1 min-h-11 w-full rounded-lg border border-neutral-300 px-3 text-sm" /></label>
          <label><span className="text-xs font-semibold text-neutral-600">Sessions per day</span><input name="sessionsPerDay" type="number" min="1" max="10" defaultValue="1" className="mt-1 min-h-11 w-full rounded-lg border border-neutral-300 px-3 text-sm" /></label>
          <label><span className="text-xs font-semibold text-neutral-600">Default price</span><input name="defaultPrice" type="number" min="0" step="0.01" className="mt-1 min-h-11 w-full rounded-lg border border-neutral-300 px-3 text-sm" /></label>
          <label className="sm:col-span-2"><span className="text-xs font-semibold text-neutral-600">Description</span><textarea name="description" rows={3} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm" /></label>
        </div>
        <div className="flex justify-end gap-2"><button type="button" onClick={() => setShowCreate(false)} className="min-h-11 rounded-lg border border-neutral-300 px-4 text-sm font-semibold text-neutral-700">Cancel</button><button type="submit" disabled={createMutation.isPending} className="min-h-11 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white disabled:opacity-60">{createMutation.isPending ? 'Creating...' : 'Create program'}</button></div>
      </form>
    </Modal>
  </div>;
}
