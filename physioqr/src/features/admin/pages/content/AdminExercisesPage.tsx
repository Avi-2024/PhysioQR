import { useDeferredValue, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Activity, ChevronLeft, ChevronRight, Dumbbell, ExternalLink, PlayCircle, Plus, RefreshCw } from 'lucide-react';
import apiClient from '@/lib/api-client';
import ErrorState from '@/components/feedback/ErrorState';
import { Modal } from '@/components/ui/Modal';
import { SearchInput } from '@/components/ui/SearchInput';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';

type Category = { _id: string; name: string };
type Exercise = {
  _id: string;
  name: string;
  nameHindi?: string;
  painCategory?: Category | null;
  language: 'en' | 'hi';
  sets?: number;
  repetitions?: number;
  frequency?: string;
  videoUrl?: string;
  isActive: boolean;
  usage?: { programDays: number; programs: number };
};
type Response = {
  items: Exercise[];
  meta: { page: number; limit: number; total: number; totalPages: number };
  summary: { total: number; active: number; inactive: number; withVideo: number };
};

const PAGE_SIZE = 20;
const inputClass = 'mt-1 min-h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100';

export default function AdminExercisesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search.trim());
  const [status, setStatus] = useState('active');
  const [categoryId, setCategoryId] = useState('');
  const [language, setLanguage] = useState('');
  const [video, setVideo] = useState('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [formError, setFormError] = useState('');

  const query = useQuery<Response>({
    queryKey: ['admin-exercises', page, deferredSearch, status, categoryId, language, video],
    queryFn: () => apiClient.get('/exercises', { params: {
      page, limit: PAGE_SIZE,
      ...(deferredSearch ? { search: deferredSearch } : {}),
      ...(status ? { status } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(language ? { language } : {}),
      ...(video ? { video } : {}),
    } }).then((response) => response.data),
  });

  const categoriesQuery = useQuery<Category[]>({
    queryKey: ['assessment-categories'],
    queryFn: () => apiClient.get('/assessments/categories').then((response) => response.data),
  });

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => apiClient.post('/exercises', payload),
    onSuccess: () => {
      setShowCreate(false);
      setFormError('');
      queryClient.invalidateQueries({ queryKey: ['admin-exercises'] });
    },
    onError: (error: any) => setFormError(error?.response?.data?.message || 'Exercise could not be created.'),
  });

  const cards = useMemo(() => [
    { label: 'Total exercises', value: query.data?.summary.total ?? '—', icon: Dumbbell },
    { label: 'Active', value: query.data?.summary.active ?? '—', icon: Activity },
    { label: 'Inactive', value: query.data?.summary.inactive ?? '—', icon: Dumbbell },
    { label: 'With video', value: query.data?.summary.withVideo ?? '—', icon: PlayCircle },
  ], [query.data?.summary]);

  const handleCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');
    const form = new FormData(event.currentTarget);
    createMutation.mutate({
      name: String(form.get('name') || '').trim(),
      nameHindi: String(form.get('nameHindi') || '').trim(),
      painCategory: String(form.get('painCategory') || '') || undefined,
      language: String(form.get('language') || 'en'),
      sets: form.get('sets') === '' ? undefined : Number(form.get('sets')),
      repetitions: form.get('repetitions') === '' ? undefined : Number(form.get('repetitions')),
      frequency: String(form.get('frequency') || '').trim(),
      holdDuration: String(form.get('holdDuration') || '').trim(),
      restDuration: String(form.get('restDuration') || '').trim(),
      videoUrl: String(form.get('videoUrl') || '').trim(),
      description: String(form.get('description') || '').trim(),
      safetyInstructions: String(form.get('safetyInstructions') || '').trim(),
      requiredEquipment: String(form.get('requiredEquipment') || '').split(',').map((item) => item.trim()).filter(Boolean),
    });
  };

  return <div className="min-w-0 space-y-6">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-700">Clinical content</p><h1 className="mt-2 text-2xl font-bold tracking-tight text-neutral-950 sm:text-3xl">Exercises</h1><p className="mt-1 max-w-3xl text-sm leading-6 text-neutral-500">Manage reusable rehabilitation exercises used inside program days. Keep instructions, safety guidance and video metadata clinically clear.</p></div>
      <div className="flex flex-wrap gap-2"><button type="button" onClick={() => query.refetch()} disabled={query.isFetching} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-700"><RefreshCw className={cn('h-4 w-4', query.isFetching && 'animate-spin')} />Refresh</button><button type="button" onClick={() => setShowCreate(true)} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white"><Plus className="h-4 w-4" />New exercise</button></div>
    </header>

    {!query.isError && <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map((card) => <div key={card.label} className="rounded-xl border border-neutral-200 bg-white p-4"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{card.label}</p><p className="mt-2 text-2xl font-bold text-neutral-950">{query.isLoading ? '—' : card.value}</p></div><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-50 text-neutral-600"><card.icon className="h-5 w-5" /></div></div></div>)}</section>}

    <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <div className="border-b border-neutral-200 px-4 py-4 sm:px-5"><div className="flex flex-col gap-3 xl:flex-row xl:items-center"><div className="min-w-0 flex-1"><SearchInput value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Search exercise name, description or frequency" /></div><select value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setPage(1); }} className="min-h-11 rounded-lg border border-neutral-300 px-3 text-sm"><option value="">All categories</option>{categoriesQuery.data?.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}</select><select value={language} onChange={(e) => { setLanguage(e.target.value); setPage(1); }} className="min-h-11 rounded-lg border border-neutral-300 px-3 text-sm"><option value="">All languages</option><option value="en">English</option><option value="hi">Hindi</option></select><select value={video} onChange={(e) => { setVideo(e.target.value); setPage(1); }} className="min-h-11 rounded-lg border border-neutral-300 px-3 text-sm"><option value="">Video: all</option><option value="with">With video</option><option value="without">Without video</option></select><select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="min-h-11 rounded-lg border border-neutral-300 px-3 text-sm"><option value="active">Active</option><option value="inactive">Inactive</option><option value="">All statuses</option></select></div>{!query.isLoading && !query.isError && <p className="mt-3 text-xs text-neutral-500">{query.data?.meta.total ?? 0} exercise{query.data?.meta.total === 1 ? '' : 's'} found.</p>}</div>

      {query.isError ? <div className="p-5"><ErrorState title="Exercises could not load" message="Check the exercise API and admin session, then retry." onRetry={() => query.refetch()} /></div> : query.isLoading ? <div className="space-y-3 p-5">{Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div> : !query.data?.items.length ? <div className="px-5 py-14 text-center"><Dumbbell className="mx-auto h-9 w-9 text-neutral-300" /><h2 className="mt-3 text-sm font-semibold text-neutral-900">No exercises found</h2><p className="mt-1 text-sm text-neutral-500">Create an exercise or adjust the filters.</p></div> : <>
        <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[1050px] text-left text-sm"><thead className="border-b border-neutral-200 bg-neutral-50/80"><tr className="text-xs font-semibold uppercase tracking-wide text-neutral-500"><th className="px-5 py-3">Exercise</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Prescription</th><th className="px-4 py-3">Usage</th><th className="px-4 py-3">Video</th><th className="px-4 py-3">Status</th><th className="px-5 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-neutral-100">{query.data.items.map((item) => <tr key={item._id} onClick={() => navigate(`/admin/exercises/${item._id}`)} className="cursor-pointer hover:bg-neutral-50"><td className="px-5 py-4"><div className="font-semibold text-neutral-950">{item.name}</div><div className="mt-1 text-xs text-neutral-500">{item.language === 'hi' ? 'Hindi' : 'English'}{item.frequency ? ` · ${item.frequency}` : ''}</div></td><td className="px-4 py-4 text-neutral-700">{item.painCategory?.name || 'General'}</td><td className="px-4 py-4 text-neutral-600">{item.sets ?? '—'} sets · {item.repetitions ?? '—'} reps</td><td className="px-4 py-4 text-neutral-600"><div>{item.usage?.programs ?? 0} programs</div><div className="text-xs text-neutral-400">{item.usage?.programDays ?? 0} program days</div></td><td className="px-4 py-4">{item.videoUrl ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary-700"><PlayCircle className="h-4 w-4" />Linked</span> : <span className="text-xs text-neutral-400">Not linked</span>}</td><td className="px-4 py-4"><span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', item.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-600')}>{item.isActive ? 'Active' : 'Inactive'}</span></td><td className="px-5 py-4 text-right"><button type="button" onClick={(e) => { e.stopPropagation(); navigate(`/admin/exercises/${item._id}`); }} className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-700">Manage <ExternalLink className="h-3.5 w-3.5" /></button></td></tr>)}</tbody></table></div>
        <div className="divide-y divide-neutral-100 md:hidden">{query.data.items.map((item) => <button key={item._id} type="button" onClick={() => navigate(`/admin/exercises/${item._id}`)} className="block w-full px-4 py-4 text-left"><div className="flex items-start justify-between gap-3"><div><div className="font-semibold text-neutral-950">{item.name}</div><div className="mt-1 text-xs text-neutral-500">{item.painCategory?.name || 'General'} · {item.usage?.programs ?? 0} programs</div></div><span className={cn('rounded-full px-2 py-1 text-xs font-semibold', item.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-600')}>{item.isActive ? 'Active' : 'Inactive'}</span></div></button>)}</div>
        <div className="flex items-center justify-between border-t border-neutral-200 px-4 py-3 sm:px-5"><p className="text-xs text-neutral-500">Page {query.data.meta.page} of {Math.max(query.data.meta.totalPages, 1)}</p><div className="flex gap-2"><button disabled={query.data.meta.page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button><button disabled={query.data.meta.page >= query.data.meta.totalPages} onClick={() => setPage((value) => value + 1)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button></div></div>
      </>}
    </section>

    <Modal isOpen={showCreate} onClose={() => { setShowCreate(false); setFormError(''); }} title="Create rehabilitation exercise" size="lg"><form onSubmit={handleCreate} className="space-y-5 pt-5">{formError && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{formError}</div>}<div className="grid gap-4 sm:grid-cols-2"><Field label="Exercise name *"><input name="name" required className={inputClass} /></Field><Field label="Hindi name"><input name="nameHindi" className={inputClass} /></Field><Field label="Pain category"><select name="painCategory" className={inputClass}><option value="">General / cross-category</option>{categoriesQuery.data?.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}</select></Field><Field label="Language"><select name="language" className={inputClass}><option value="en">English</option><option value="hi">Hindi</option></select></Field><Field label="Sets"><input name="sets" type="number" min="0" className={inputClass} /></Field><Field label="Repetitions"><input name="repetitions" type="number" min="0" className={inputClass} /></Field><Field label="Frequency"><input name="frequency" className={inputClass} placeholder="e.g. twice daily" /></Field><Field label="Hold duration"><input name="holdDuration" className={inputClass} placeholder="e.g. 10 seconds" /></Field><Field label="Rest duration"><input name="restDuration" className={inputClass} /></Field><Field label="YouTube URL"><input name="videoUrl" type="url" className={inputClass} /></Field><Field label="Required equipment"><input name="requiredEquipment" className={inputClass} placeholder="Band, chair" /></Field><label className="sm:col-span-2"><span className="text-xs font-semibold text-neutral-600">Description</span><textarea name="description" rows={3} className={`${inputClass} py-3`} /></label><label className="sm:col-span-2"><span className="text-xs font-semibold text-neutral-600">Safety instructions</span><textarea name="safetyInstructions" rows={3} className={`${inputClass} py-3`} /></label></div><div className="flex justify-end gap-2 border-t border-neutral-200 pt-4"><button type="button" onClick={() => setShowCreate(false)} className="min-h-10 rounded-lg border border-neutral-300 px-4 text-sm font-semibold text-neutral-700">Cancel</button><button disabled={createMutation.isPending} className="min-h-10 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white disabled:opacity-60">{createMutation.isPending ? 'Creating...' : 'Create exercise'}</button></div></form></Modal>
  </div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label><span className="text-xs font-semibold text-neutral-600">{label}</span>{children}</label>; }
