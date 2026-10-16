import { useDeferredValue, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Activity, ChevronLeft, ChevronRight, Dumbbell, ExternalLink, PlayCircle, Plus, RefreshCw, CheckSquare, ShieldAlert } from 'lucide-react';
import apiClient from '@/lib/api-client';
import { formatApiValidationError } from '../../utils/formatApiValidationError';
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
  isDemoVideo?: boolean;
  videoCandidateReviewPending?: boolean;
  isActive: boolean;
  usage?: { programDays: number; programs: number };
};
type Response = {
  items: Exercise[];
  meta: { page: number; limit: number; total: number; totalPages: number };
  summary: { total: number; active: number; inactive: number; withVideo: number; demoVideos?: number };
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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<'activate' | 'deactivate' | null>(null);
  const [bulkReason, setBulkReason] = useState('');
  const [bulkError, setBulkError] = useState('');
  const [bulkNotice, setBulkNotice] = useState('');
  const [demoAction, setDemoAction] = useState<'apply' | 'remove' | null>(null);
  const [demoError, setDemoError] = useState('');
  const [kneeVideoModal, setKneeVideoModal] = useState(false);
  const [kneeVideoError, setKneeVideoError] = useState('');

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
    onError: (error: any) => setFormError(formatApiValidationError(error, 'Exercise could not be created.')),
  });

  const demoMutation = useMutation({
    mutationFn: (action: 'apply' | 'remove') =>
      apiClient.post('/exercises/demo-videos', { action, acknowledgeTestingOnly: true }),
    onSuccess: async (response) => {
      setDemoAction(null);
      setDemoError('');
      setBulkNotice(response.data?.message || 'Demo-video changes saved.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-exercises'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-exercise'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-program'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-programs'] }),
      ]);
    },
    onError: (error: any) => setDemoError(error?.response?.data?.message ||
      'Demo videos could not be updated. Check backend mode and API connection.'),
  });
  const openDemoAction = (action: 'apply' | 'remove') => {
    setDemoError('');
    setDemoAction(action);
  };

  const kneeVideoMutation = useMutation({
    mutationFn: () => apiClient.post('/exercises/knee-draft-video-candidates', {
      acknowledgeReviewPending: true,
    }),
    onSuccess: async (response) => {
      setKneeVideoModal(false);
      setKneeVideoError('');
      setBulkNotice(response.data?.message || 'Knee exercise video candidates assigned.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-exercises'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-exercise'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-program'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-programs'] }),
      ]);
    },
    onError: (error: any) => setKneeVideoError(error?.response?.data?.message ||
      'Unable to assign Knee exercise videos. Check the inactive draft and backend connection.'),
  });

  const visibleItems = query.data?.items || [];
  const visibleIds = visibleItems.map((item) => item._id);
  const selectedVisible = visibleItems.filter((item) => selectedIds.includes(item._id));
  const visibleAllSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
  const hasSelection = selectedVisible.length > 0;
  const selectAllVisible = (checked: boolean) => {
    setSelectedIds(checked ? visibleIds : []);
    setBulkNotice('');
  };
  const toggleSelected = (id: string, checked: boolean) => {
    setSelectedIds((current) => checked
      ? [...new Set([...current, id])]
      : current.filter((item) => item !== id));
    setBulkNotice('');
  };
  const clearSelection = () => { setSelectedIds([]); setBulkNotice(''); };
  const selectTarget = (action: 'activate' | 'deactivate') => {
    if (!selectedVisible.some((item) => item.isActive !== (action === 'activate'))) return;
    setBulkAction(action);
    setBulkReason('');
    setBulkError('');
  };
  const bulkMutation = useMutation({
    mutationFn: async ({ ids, action, reason }: { ids: string[]; action: 'activate' | 'deactivate'; reason: string }) =>
      apiClient.post('/exercises/bulk-status', { exerciseIds: ids, action, ...(reason ? { reason } : {}) }),
    onSuccess: async (response) => {
      setBulkNotice(response.data?.message || 'Selected exercise statuses updated.');
      setSelectedIds([]);
      setBulkAction(null);
      setBulkReason('');
      setBulkError('');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-exercises'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-program'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-programs'] }),
      ]);
    },
    onError: (error: any) => setBulkError(error?.response?.data?.message || 'Bulk action failed. Nothing has been confirmed; refresh and retry.'),
  });

  const cards = useMemo(() => [
    { label: 'Total exercises', value: query.data?.summary.total ?? '—', icon: Dumbbell },
    { label: 'Active', value: query.data?.summary.active ?? '—', icon: Activity },
    { label: 'Inactive', value: query.data?.summary.inactive ?? '—', icon: Dumbbell },
    { label: 'With video (incl. demo)', value: query.data?.summary.withVideo ?? '—', icon: PlayCircle },
    { label: 'Demo · testing only', value: query.data?.summary.demoVideos ?? '—', icon: PlayCircle },
  ], [query.data?.summary]);

  const resetFiltersSelection = () => { setSelectedIds([]); setBulkNotice(''); };

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
      <div className="flex flex-wrap gap-2"><button type="button" onClick={() => query.refetch()} disabled={query.isFetching} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-700"><RefreshCw className={cn('h-4 w-4', query.isFetching && 'animate-spin')} />Refresh</button><button type="button" onClick={() => { setKneeVideoError(''); setKneeVideoModal(true); }}
      className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-4 text-sm font-semibold text-emerald-900 hover:bg-emerald-100">
      <PlayCircle className="h-4 w-4"/>15 unique Knee videos
    </button><button type="button" onClick={() => openDemoAction('apply')} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 text-sm font-semibold text-amber-900 hover:bg-amber-100"><PlayCircle className="h-4 w-4" />Add Demo YouTube URLs</button>{(query.data?.summary.demoVideos || 0) > 0 && <button type="button" onClick={() => openDemoAction('remove')} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 text-sm font-semibold text-neutral-700">Remove demo links</button>}<button type="button" onClick={() => setShowCreate(true)} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white"><Plus className="h-4 w-4" />New exercise</button></div>
    </header>

    {!query.isError && <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{cards.map((card) => <div key={card.label} className="rounded-xl border border-neutral-200 bg-white p-4"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{card.label}</p><p className="mt-2 text-2xl font-bold text-neutral-950">{query.isLoading ? '—' : card.value}</p></div><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-50 text-neutral-600"><card.icon className="h-5 w-5" /></div></div></div>)}</section>}

    {bulkNotice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{bulkNotice} Refresh your programme to recheck its readiness. You may need to change the Status filter to see updated exercises.</p>}

    <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <div className="border-b border-neutral-200 px-4 py-4 sm:px-5"><div className="flex flex-col gap-3 xl:flex-row xl:items-center"><div className="min-w-0 flex-1"><SearchInput value={search} onChange={(value) => { setSearch(value); setPage(1); resetFiltersSelection(); }} placeholder="Search exercise name, description or frequency" /></div><select value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setPage(1); resetFiltersSelection(); }} className="min-h-11 rounded-lg border border-neutral-300 px-3 text-sm"><option value="">All categories</option>{categoriesQuery.data?.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}</select><select value={language} onChange={(e) => { setLanguage(e.target.value); setPage(1); resetFiltersSelection(); }} className="min-h-11 rounded-lg border border-neutral-300 px-3 text-sm"><option value="">All languages</option><option value="en">English</option><option value="hi">Hindi</option></select><select value={video} onChange={(e) => { setVideo(e.target.value); setPage(1); resetFiltersSelection(); }} className="min-h-11 rounded-lg border border-neutral-300 px-3 text-sm"><option value="">Video: all</option><option value="with">With video</option><option value="without">Without video</option></select><select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); resetFiltersSelection(); }} className="min-h-11 rounded-lg border border-neutral-300 px-3 text-sm"><option value="active">Active</option><option value="inactive">Inactive</option><option value="">All statuses</option></select></div>{!query.isLoading && !query.isError && <p className="mt-3 text-xs text-neutral-500">{query.data?.meta.total ?? 0} exercise{query.data?.meta.total === 1 ? '' : 's'} found.</p>}</div>

      {!query.isLoading && !query.isError && Boolean(query.data?.items.length) && <div className="border-b border-neutral-200 bg-neutral-50/70 px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-neutral-700">
            <input type="checkbox" checked={visibleAllSelected} onChange={(event) => selectAllVisible(event.target.checked)}
              aria-label="Select all exercises on this page"
              className="h-4 w-4 rounded border-neutral-300 accent-emerald-700"/>
            Select all on this page
          </label>
          <span className="text-sm text-neutral-500">{selectedVisible.length} selected</span>
          {hasSelection && <button type="button" onClick={clearSelection} className="text-xs font-semibold text-neutral-600 underline">Clear selection</button>}
          <div className="flex flex-wrap gap-2 sm:ml-auto">
            <button type="button" disabled={!selectedVisible.some((item) => !item.isActive)} onClick={() => selectTarget('activate')}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-emerald-700 px-3 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">
              <CheckSquare className="h-4 w-4" /> Activate selected
            </button>
            <button type="button" disabled={!selectedVisible.some((item) => item.isActive)} onClick={() => selectTarget('deactivate')}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 text-xs font-bold text-neutral-800 disabled:cursor-not-allowed disabled:opacity-40">
              Deactivate selected
            </button>
          </div>
        </div>
        <p className="mt-2 text-xs leading-5 text-neutral-500">Bulk actions apply to selected exercises on this page only. Activation does not add videos, approve content or publish a rehabilitation programme.</p>
      </div>}

      {query.isError ? <div className="p-5"><ErrorState title="Exercises could not load" message="Check the exercise API and admin session, then retry." onRetry={() => query.refetch()} /></div> : query.isLoading ? <div className="space-y-3 p-5">{Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div> : !query.data?.items.length ? <div className="px-5 py-14 text-center"><Dumbbell className="mx-auto h-9 w-9 text-neutral-300" /><h2 className="mt-3 text-sm font-semibold text-neutral-900">No exercises found</h2><p className="mt-1 text-sm text-neutral-500">No exercises match the current filters. If you just used a bulk action, switch Status to All or Active to see updated records.</p></div> : <>
        <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[1050px] text-left text-sm"><thead className="border-b border-neutral-200 bg-neutral-50/80"><tr className="text-xs font-semibold uppercase tracking-wide text-neutral-500"><th className="w-10 py-3 pl-4" scope="col">Select</th><th className="px-5 py-3">Exercise</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Prescription</th><th className="px-4 py-3">Usage</th><th className="px-4 py-3">Video</th><th className="px-4 py-3">Status</th><th className="px-5 py-3  ">Action</th></tr></thead><tbody className="divide-y divide-neutral-100">{query.data.items.map((item) => <tr key={item._id} onClick={() => navigate(`/admin/exercises/${item._id}`)} className="cursor-pointer hover:bg-neutral-50"><td className="py-4 pl-4" onClick={(event) => event.stopPropagation()}><input type="checkbox" checked={selectedIds.includes(item._id)} onChange={(event) => toggleSelected(item._id, event.target.checked)} aria-label={`Select ${item.name}`} className="h-4 w-4 rounded border-neutral-300 accent-emerald-700"/></td><td className="px-5 py-4"><div className="font-semibold text-neutral-950">{item.name}</div><div className="mt-1 text-xs text-neutral-500">{item.language === 'hi' ? 'Hindi' : 'English'}{item.frequency ? ` · ${item.frequency}` : ''}</div></td><td className="px-4 py-4 text-neutral-700">{item.painCategory?.name || 'General'}</td><td className="px-4 py-4 text-neutral-600">{item.sets ?? '—'} sets · {item.repetitions ?? '—'} reps</td><td className="px-4 py-4 text-neutral-600"><div>{item.usage?.programs ?? 0} programs</div><div className="text-xs text-neutral-400">{item.usage?.programDays ?? 0} program days</div></td><td className="px-4 py-4">{item.videoCandidateReviewPending ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700"><PlayCircle className="h-4 w-4" />Exercise video linked</span> : item.isDemoVideo ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700"><PlayCircle className="h-4 w-4" />Generic demo · testing only</span> : item.videoUrl ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary-700"><PlayCircle className="h-4 w-4" />Linked</span> : <span className="text-xs text-neutral-400">Not linked</span>}</td><td className="px-4 py-4"><span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', item.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-600')}>{item.isActive ? 'Active' : 'Inactive'}</span></td><td className="px-5 py-4  "><button type="button" onClick={(e) => { e.stopPropagation(); navigate(`/admin/exercises/${item._id}`); }} className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-700">Manage <ExternalLink className="h-3.5 w-3.5" /></button></td></tr>)}</tbody></table></div>
        <div className="divide-y divide-neutral-100 md:hidden">{query.data.items.map((item) => <div key={item._id} className="flex items-center gap-3 px-4 py-4"><input type="checkbox" checked={selectedIds.includes(item._id)} onChange={(event) => toggleSelected(item._id, event.target.checked)} aria-label={`Select ${item.name}`} className="h-4 w-4 shrink-0 rounded border-neutral-300 accent-emerald-700"/><button type="button" onClick={() => navigate(`/admin/exercises/${item._id}`)} className="min-w-0 flex-1 text-left"><div className="flex items-start justify-between gap-3"><div><div className="font-semibold text-neutral-950">{item.name}</div><div className="mt-1 text-xs text-neutral-500">{item.painCategory?.name || 'General'} · {item.usage?.programs ?? 0} programs</div></div><span className={cn('shrink-0 rounded-full px-2 py-1 text-xs font-semibold', item.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-600')}>{item.isActive ? 'Active' : 'Inactive'}</span></div></button></div>)}</div>
        <div className="flex items-center justify-between border-t border-neutral-200 px-4 py-3 sm:px-5"><p className="text-xs text-neutral-500">Page {query.data.meta.page} of {Math.max(query.data.meta.totalPages, 1)}</p><div className="flex gap-2"><button disabled={query.data.meta.page <= 1} onClick={() => { clearSelection(); setPage((value) => Math.max(1, value - 1)); }} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button><button disabled={query.data.meta.page >= query.data.meta.totalPages} onClick={() => { clearSelection(); setPage((value) => value + 1); }} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button></div></div>
      </>}
    </section>

    <Modal isOpen={kneeVideoModal} onClose={() => { if (!kneeVideoMutation.isPending) setKneeVideoModal(false); }}
      title="Assign 15 different Knee exercise videos?" size="md">
      <div className="space-y-4 pt-4">
        <p className="text-sm leading-6 text-neutral-700">
          Assign 15 different exercise-matched YouTube demonstrations to the General Knee Pain 30-day clinical draft.
          Only blank video fields and old PhysioQR sample links will be updated. Real/custom video links are preserved.
        </p>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-950">
          <strong>15 different exercise videos.</strong> Each video will be linked to its corresponding exercise.
          No individual review form is required: the complete 30-day programme, including its videos, is reviewed in one clinical sign-off before patient publication.
        </div>
        {kneeVideoError && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{kneeVideoError}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" disabled={kneeVideoMutation.isPending} onClick={() => setKneeVideoModal(false)}
            className="min-h-10 rounded-lg border border-neutral-300 px-4 text-sm font-semibold text-neutral-700">Cancel</button>
          <button type="button" disabled={kneeVideoMutation.isPending}
            onClick={() => kneeVideoMutation.mutate()}
            className="min-h-10 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white disabled:opacity-40">
            {kneeVideoMutation.isPending ? 'Assigning…' : 'Assign 15 review-pending videos'}
          </button>
        </div>
      </div>
    </Modal>

    <Modal isOpen={demoAction !== null} onClose={() => { if (!demoMutation.isPending) { setDemoAction(null); setDemoError(''); } }}
      title={demoAction === 'apply' ? 'Add demo YouTube URLs to exercises?' : 'Remove testing-only demo videos?'} size="md">
      <div className="space-y-4 pt-4">
        {demoAction === 'apply' ? <>
          <p className="text-sm leading-6 text-neutral-700">
            Exercises with empty YouTube video fields, plus exercises using the previous PhysioQR demo video, will receive your requested sample URL.
            Existing real exercise-specific video links will not be overwritten. This action uses the database connected to the running backend.
          </p>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
            <strong>Testing only — not an exercise video.</strong> The YouTube sample is for checking playback.
            It will stay excluded from clinical readiness and patient video content; knee programme publication will remain locked.
          </div>
          <p className="text-xs text-neutral-600">Sample: https://youtu.be/ml6cT4AZdqI?si=0VwhyxF63Vulcq5Z</p>
        </> : <>
          <p className="text-sm leading-6 text-neutral-700">
            Remove only the exact demo links previously added by PhysioQR. Any real videos you added will remain untouched.
          </p>
        </>}
        {demoError && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{demoError}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" disabled={demoMutation.isPending} onClick={() => { setDemoAction(null); setDemoError(''); }}
            className="min-h-10 rounded-lg border border-neutral-300 px-4 text-sm font-semibold text-neutral-700">Cancel</button>
          <button type="button" disabled={demoMutation.isPending || !demoAction}
            onClick={() => { if (demoAction) demoMutation.mutate(demoAction); }}
            className="min-h-10 rounded-lg bg-primary-700 px-4 text-sm font-semibold text-white disabled:opacity-40">
            {demoMutation.isPending ? 'Updating videos…' : demoAction === 'apply' ? 'Confirm: Add demo URLs' : 'Confirm: Remove demo URLs'}
          </button>
        </div>
      </div>
    </Modal>

    <Modal isOpen={bulkAction !== null} onClose={() => { if (!bulkMutation.isPending) { setBulkAction(null); setBulkError(''); } }} title={bulkAction === 'activate' ? 'Bulk activate exercises?' : 'Bulk deactivate exercises?'} size="md">
      <form onSubmit={(event) => { event.preventDefault(); if (bulkAction && selectedVisible.length) bulkMutation.mutate({ ids: selectedVisible.map((item) => item._id), action: bulkAction, reason: bulkReason.trim() }); }} className="space-y-4 pt-4">
        <p className="text-sm leading-6 text-neutral-700">
          {selectedVisible.filter((item) => item.isActive !== (bulkAction === 'activate')).length} exercise(s) will change status.
          {selectedVisible.length > 0 && selectedVisible.some((item) => item.isActive === (bulkAction === 'activate')) && ' Exercises already in the requested status will be skipped.'}
          All status changes will be audit-logged.
        </p>
        {bulkAction === 'activate' && selectedVisible.some((item) => !item.videoUrl) && <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
          <ShieldAlert className="h-5 w-5 shrink-0"/>
          <p>{selectedVisible.filter((item) => !item.videoUrl).length} selected exercise(s) have no video. Activating them does not make the Knee Programme publishable. Attach and review real videos before clinical sign-off.</p>
        </div>}
        <label className="block text-sm font-semibold text-neutral-800">Shared reason (optional)
          <textarea value={bulkReason} onChange={(event) => setBulkReason(event.target.value)} maxLength={500} rows={2}
            placeholder="e.g. Administrative status update — can leave blank"
            className={`${inputClass} py-3`}/>
          <span className="mt-1 block text-xs font-normal text-neutral-500">One reason applies to every selected exercise. If blank, the backend records a standard action reason.</span>
        </label>
        {bulkError && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{bulkError}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" disabled={bulkMutation.isPending} onClick={() => { setBulkAction(null); setBulkError(''); }} className="min-h-10 rounded-lg border border-neutral-300 px-4 text-sm font-semibold text-neutral-700">Cancel</button>
          <button type="submit" disabled={bulkMutation.isPending || !selectedVisible.some((item) => item.isActive !== (bulkAction === 'activate'))}
            className="min-h-10 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white disabled:opacity-40">
            {bulkMutation.isPending ? 'Updating…' : 'Confirm bulk action'}
          </button>
        </div>
      </form>
    </Modal>

    <Modal isOpen={showCreate} onClose={() => { setShowCreate(false); setFormError(''); }} title="Create rehabilitation exercise" size="lg"><form onSubmit={handleCreate} className="space-y-5 pt-5">{formError && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{formError}</div>}<div className="grid gap-4 sm:grid-cols-2"><Field label="Exercise name *"><input name="name" required className={inputClass} /></Field><Field label="Hindi name"><input name="nameHindi" className={inputClass} /></Field><Field label="Pain category"><select name="painCategory" className={inputClass}><option value="">General / cross-category</option>{categoriesQuery.data?.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}</select></Field><Field label="Language"><select name="language" className={inputClass}><option value="en">English</option><option value="hi">Hindi</option></select></Field><Field label="Sets"><input name="sets" type="number" min="0" className={inputClass} /></Field><Field label="Repetitions"><input name="repetitions" type="number" min="0" className={inputClass} /></Field><Field label="Frequency"><input name="frequency" className={inputClass} placeholder="e.g. twice daily" /></Field><Field label="Hold duration"><input name="holdDuration" className={inputClass} placeholder="e.g. 10 seconds" /></Field><Field label="Rest duration"><input name="restDuration" className={inputClass} /></Field><Field label="YouTube URL"><input name="videoUrl" type="url" className={inputClass} /></Field><Field label="Required equipment"><input name="requiredEquipment" className={inputClass} placeholder="Band, chair" /></Field><label className="sm:col-span-2"><span className="text-xs font-semibold text-neutral-600">Description</span><textarea name="description" rows={3} className={`${inputClass} py-3`} /></label><label className="sm:col-span-2"><span className="text-xs font-semibold text-neutral-600">Safety instructions</span><textarea name="safetyInstructions" rows={3} className={`${inputClass} py-3`} /></label></div><div className="flex justify-end gap-2 border-t border-neutral-200 pt-4"><button type="button" onClick={() => setShowCreate(false)} className="min-h-10 rounded-lg border border-neutral-300 px-4 text-sm font-semibold text-neutral-700">Cancel</button><button disabled={createMutation.isPending} className="min-h-10 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white disabled:opacity-60">{createMutation.isPending ? 'Creating...' : 'Create exercise'}</button></div></form></Modal>
  </div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label><span className="text-xs font-semibold text-neutral-600">{label}</span>{children}</label>; }
