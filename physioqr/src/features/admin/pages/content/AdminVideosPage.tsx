import { useDeferredValue, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ExternalLink, Languages, PlayCircle, RefreshCw, Video } from 'lucide-react';
import apiClient from '@/lib/api-client';
import ErrorState from '@/components/feedback/ErrorState';
import { SearchInput } from '@/components/ui/SearchInput';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';

type Category = { _id: string; name: string };
type ExerciseVideo = {
  _id: string;
  name: string;
  nameHindi?: string;
  painCategory?: Category | null;
  language: 'en' | 'hi';
  videoUrl?: string;
  youtubeVideoId?: string;
  thumbnail?: string;
  isActive: boolean;
  usage?: { programDays: number; programs: number };
};
type ExerciseResponse = {
  items: ExerciseVideo[];
  meta: { page: number; limit: number; total: number; totalPages: number };
  summary: { total: number; active: number; inactive: number; withVideo: number };
};

const PAGE_SIZE = 20;

export default function AdminVideosPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search.trim());
  const [categoryId, setCategoryId] = useState('');
  const [language, setLanguage] = useState('');
  const [status, setStatus] = useState('active');
  const [page, setPage] = useState(1);

  const query = useQuery<ExerciseResponse>({
    queryKey: ['admin-videos', page, deferredSearch, categoryId, language, status],
    queryFn: () => apiClient.get('/exercises', { params: {
      page,
      limit: PAGE_SIZE,
      video: 'with',
      ...(deferredSearch ? { search: deferredSearch } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(language ? { language } : {}),
      ...(status ? { status } : {}),
    } }).then((response) => response.data),
  });

  const categoriesQuery = useQuery<Category[]>({
    queryKey: ['assessment-categories'],
    queryFn: () => apiClient.get('/assessments/categories').then((response) => response.data),
  });

  const cards = useMemo(() => [
    { label: 'Linked videos', value: query.data?.meta.total ?? '—', icon: Video },
    { label: 'Active video exercises', value: query.data?.items.filter((item) => item.isActive).length ?? '—', icon: PlayCircle },
    { label: 'English on page', value: query.data?.items.filter((item) => item.language === 'en').length ?? '—', icon: Languages },
    { label: 'Hindi on page', value: query.data?.items.filter((item) => item.language === 'hi').length ?? '—', icon: Languages },
  ], [query.data]);

  return <div className="min-w-0 space-y-6">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-700">Clinical media</p><h1 className="mt-2 text-2xl font-bold tracking-tight text-neutral-950 sm:text-3xl">Video Library</h1><p className="mt-1 max-w-3xl text-sm leading-6 text-neutral-500">Review rehabilitation videos already attached to exercises. Video metadata is owned by the exercise record, so this workspace avoids creating a duplicate video source of truth.</p></div>
      <button type="button" onClick={() => query.refetch()} disabled={query.isFetching} className="inline-flex min-h-11 items-center gap-2 self-start rounded-lg border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-700"><RefreshCw className={cn('h-4 w-4', query.isFetching && 'animate-spin')} />Refresh</button>
    </header>

    <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm leading-6 text-sky-900"><strong>Single source of truth:</strong> PhysioQR currently stores YouTube URL, video ID and thumbnail on an Exercise. Add or edit videos from the owning exercise instead of maintaining a second independent video record.</div>

    {!query.isError && <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map((card) => <div key={card.label} className="rounded-xl border border-neutral-200 bg-white p-4"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{card.label}</p><p className="mt-2 text-2xl font-bold text-neutral-950">{query.isLoading ? '—' : card.value}</p></div><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-50 text-neutral-600"><card.icon className="h-5 w-5" /></div></div></div>)}</section>}

    <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <div className="border-b border-neutral-200 px-4 py-4 sm:px-5"><div className="flex flex-col gap-3 xl:flex-row xl:items-center"><div className="min-w-0 flex-1"><SearchInput value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Search exercise, video ID or description" /></div><select value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setPage(1); }} className="min-h-11 rounded-lg border border-neutral-300 px-3 text-sm"><option value="">All categories</option>{categoriesQuery.data?.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}</select><select value={language} onChange={(e) => { setLanguage(e.target.value); setPage(1); }} className="min-h-11 rounded-lg border border-neutral-300 px-3 text-sm"><option value="">All languages</option><option value="en">English</option><option value="hi">Hindi</option></select><select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="min-h-11 rounded-lg border border-neutral-300 px-3 text-sm"><option value="active">Active</option><option value="inactive">Inactive</option><option value="">All statuses</option></select></div></div>

      {query.isError ? <div className="p-5"><ErrorState title="Video library could not load" message="Video records are read from the exercise API. Check the API and admin session, then retry." onRetry={() => query.refetch()} /></div> : query.isLoading ? <div className="space-y-3 p-5">{Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div> : !query.data?.items.length ? <div className="px-5 py-14 text-center"><Video className="mx-auto h-9 w-9 text-neutral-300" /><h2 className="mt-3 text-sm font-semibold text-neutral-900">No linked videos found</h2><p className="mt-1 text-sm text-neutral-500">Attach a valid YouTube URL to an exercise to make it appear here.</p><button type="button" onClick={() => navigate('/admin/exercises')} className="mt-4 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white">Open exercises</button></div> : <>
        <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[1050px] text-left text-sm"><thead className="border-b border-neutral-200 bg-neutral-50/80"><tr className="text-xs font-semibold uppercase tracking-wide text-neutral-500"><th className="px-5 py-3">Video / Exercise</th><th className="px-4 py-3">YouTube ID</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Language</th><th className="px-4 py-3">Program usage</th><th className="px-4 py-3">Status</th><th className="px-5 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-neutral-100">{query.data.items.map((item) => <tr key={item._id} className="hover:bg-neutral-50"><td className="px-5 py-4"><div className="flex items-center gap-3">{item.thumbnail ? <img src={item.thumbnail} alt="" className="h-12 w-20 rounded-lg border border-neutral-200 object-cover" /> : <div className="flex h-12 w-20 items-center justify-center rounded-lg bg-neutral-100 text-neutral-400"><PlayCircle className="h-5 w-5" /></div>}<div><div className="font-semibold text-neutral-950">{item.name}</div>{item.videoUrl && <a href={item.videoUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-primary-700">Open video <ExternalLink className="h-3 w-3" /></a>}</div></div></td><td className="px-4 py-4 font-mono text-xs text-neutral-600">{item.youtubeVideoId || '—'}</td><td className="px-4 py-4 text-neutral-700">{item.painCategory?.name || 'General'}</td><td className="px-4 py-4 text-neutral-600">{item.language === 'hi' ? 'Hindi' : 'English'}</td><td className="px-4 py-4 text-neutral-600">{item.usage?.programs ?? 0} programs</td><td className="px-4 py-4"><span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', item.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-600')}>{item.isActive ? 'Active' : 'Inactive'}</span></td><td className="px-5 py-4 text-right"><button type="button" onClick={() => navigate(`/admin/exercises/${item._id}`)} className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-700">Manage exercise <ExternalLink className="h-3.5 w-3.5" /></button></td></tr>)}</tbody></table></div>
        <div className="divide-y divide-neutral-100 md:hidden">{query.data.items.map((item) => <button key={item._id} type="button" onClick={() => navigate(`/admin/exercises/${item._id}`)} className="block w-full px-4 py-4 text-left"><div className="flex items-start justify-between gap-3"><div><div className="font-semibold text-neutral-950">{item.name}</div><div className="mt-1 text-xs text-neutral-500">{item.youtubeVideoId || 'YouTube video'} · {item.language === 'hi' ? 'Hindi' : 'English'}</div></div><span className="text-xs font-semibold text-primary-700">Manage</span></div></button>)}</div>
        <div className="flex items-center justify-between border-t border-neutral-200 px-4 py-3 sm:px-5"><p className="text-xs text-neutral-500">Page {query.data.meta.page} of {Math.max(query.data.meta.totalPages, 1)}</p><div className="flex gap-2"><button disabled={query.data.meta.page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button><button disabled={query.data.meta.page >= query.data.meta.totalPages} onClick={() => setPage((value) => value + 1)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button></div></div>
      </>}
    </section>
  </div>;
}
