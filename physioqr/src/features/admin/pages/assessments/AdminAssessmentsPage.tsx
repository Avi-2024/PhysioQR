import { FormEvent, useDeferredValue, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ChevronLeft, ChevronRight, ClipboardList, ExternalLink, GitBranch, Plus, RefreshCw, ShieldCheck } from 'lucide-react';
import apiClient from '@/lib/api-client';
import ErrorState from '@/components/feedback/ErrorState';
import { SearchInput } from '@/components/ui/SearchInput';
import { Skeleton } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/cn';

type Category = { _id: string; name: string; isActive?: boolean };
type Question = {
  _id: string;
  questionText: string;
  questionTextHindi?: string;
  questionType: string;
  painCategory?: Category | null;
  isRedFlag: boolean;
  isActive: boolean;
  displayOrder: number;
  showIfQuestion?: { _id: string; questionText: string } | null;
  conditionalLogic?: { dependsOnQuestion?: { _id: string; questionText: string } | null };
};
type Response = {
  items: Question[];
  meta: { page: number; limit: number; total: number; totalPages: number };
  summary: { total: number; active: number; inactive: number; redFlags: number; conditional: number; categories: number };
};

const PAGE_SIZE = 20;
const emptyData: Response = { items: [], meta: { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 }, summary: { total: 0, active: 0, inactive: 0, redFlags: 0, conditional: 0, categories: 0 } };
const typeLabel = (value: string) => value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

export default function AdminAssessmentsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search.trim());
  const [status, setStatus] = useState('active');
  const [questionType, setQuestionType] = useState('');
  const [redFlag, setRedFlag] = useState('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [formError, setFormError] = useState('');

  const query = useQuery<Response>({
    queryKey: ['admin-assessment-questions', page, deferredSearch, status, questionType, redFlag],
    queryFn: () => apiClient.get('/admin/assessment-questions', { params: { page, limit: PAGE_SIZE, ...(deferredSearch ? { search: deferredSearch } : {}), ...(status ? { status } : {}), ...(questionType ? { questionType } : {}), ...(redFlag ? { redFlag } : {}) } }).then((response) => response.data),
  });
  const categoriesQuery = useQuery<Category[]>({ queryKey: ['assessment-categories'], queryFn: () => apiClient.get('/assessments/categories').then((response) => response.data) });

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => apiClient.post('/admin/assessment-questions', payload),
    onSuccess: () => {
      setShowCreate(false);
      setFormError('');
      queryClient.invalidateQueries({ queryKey: ['admin-assessment-questions'] });
    },
    onError: (error: any) => setFormError(error?.response?.data?.message || 'Question could not be created.'),
  });

  const data = query.data ?? emptyData;
  const cards = useMemo(() => [
    { label: 'Active questions', value: data.summary.active, icon: ClipboardList },
    { label: 'Red flag rules', value: data.summary.redFlags, icon: AlertTriangle },
    { label: 'Conditional questions', value: data.summary.conditional, icon: GitBranch },
    { label: 'Pain categories', value: data.summary.categories, icon: ShieldCheck },
  ], [data.summary]);

  const handleCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');
    const form = new FormData(event.currentTarget);
    createMutation.mutate({
      questionText: String(form.get('questionText') || '').trim(),
      questionTextHindi: String(form.get('questionTextHindi') || '').trim(),
      questionType: form.get('questionType'),
      painCategory: form.get('painCategory') || null,
      displayOrder: Number(form.get('displayOrder') || 0),
      isRedFlag: form.get('isRedFlag') === 'on',
      redFlagOperator: form.get('isRedFlag') === 'on' ? 'any_answer' : undefined,
    });
  };

  return <div className="min-w-0 space-y-6">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-700">Clinical configuration</p><h1 className="mt-2 text-2xl font-bold tracking-tight text-neutral-950 sm:text-3xl">Assessments</h1><p className="mt-1 max-w-3xl text-sm leading-6 text-neutral-500">Configure assessment questions, pain-category mapping, conditional visibility, and red-flag safety rules. Patient red-flag decisions remain in Risk Reviews.</p></div>
      <div className="flex flex-wrap gap-2"><button type="button" onClick={() => query.refetch()} disabled={query.isFetching} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"><RefreshCw className={cn('h-4 w-4', query.isFetching && 'animate-spin')} />Refresh</button><button type="button" onClick={() => setShowCreate(true)} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700"><Plus className="h-4 w-4" />New question</button></div>
    </header>

    {!query.isError && <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map((card) => <div key={card.label} className="rounded-xl border border-neutral-200 bg-white p-4"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{card.label}</p><p className="mt-2 text-2xl font-bold text-neutral-950">{query.isLoading ? '—' : card.value}</p></div><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-50 text-neutral-600"><card.icon className="h-5 w-5" /></div></div></div>)}</section>}

    <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <div className="border-b border-neutral-200 px-4 py-4 sm:px-5"><div className="flex flex-col gap-3 xl:flex-row xl:items-center"><div className="min-w-0 flex-1"><SearchInput value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Search question text or safety message" /></div><select value={questionType} onChange={(e) => { setQuestionType(e.target.value); setPage(1); }} className="min-h-11 rounded-lg border border-neutral-300 bg-white px-3 text-sm"><option value="">All types</option>{['single_choice','multiple_choice','yes_no','pain_scale','number','text','date','image'].map((type) => <option key={type} value={type}>{typeLabel(type)}</option>)}</select><select value={redFlag} onChange={(e) => { setRedFlag(e.target.value); setPage(1); }} className="min-h-11 rounded-lg border border-neutral-300 bg-white px-3 text-sm"><option value="">All safety rules</option><option value="true">Red flag only</option><option value="false">Non red flag</option></select><select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="min-h-11 rounded-lg border border-neutral-300 bg-white px-3 text-sm"><option value="active">Active</option><option value="inactive">Inactive</option><option value="">All statuses</option></select></div>{!query.isLoading && !query.isError && <p className="mt-3 text-xs text-neutral-500">{data.meta.total} question{data.meta.total === 1 ? '' : 's'} found.</p>}</div>

      {query.isError ? <div className="p-5"><ErrorState title="Assessments could not load" message="Check the admin API and session, then retry." onRetry={() => query.refetch()} /></div> : query.isLoading ? <div className="space-y-3 p-5">{Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div> : data.items.length === 0 ? <div className="px-5 py-14 text-center"><ClipboardList className="mx-auto h-9 w-9 text-neutral-300" /><h2 className="mt-3 text-sm font-semibold text-neutral-900">No assessment questions found</h2><p className="mt-1 text-sm text-neutral-500">Create a question or adjust the filters.</p></div> : <>
        <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[1120px] text-left text-sm"><thead className="border-b border-neutral-200 bg-neutral-50/80"><tr className="text-xs font-semibold uppercase tracking-wide text-neutral-500"><th className="px-5 py-3">Question</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Safety</th><th className="px-4 py-3">Logic</th><th className="px-4 py-3">Order</th><th className="px-4 py-3">Status</th><th className="px-5 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-neutral-100">{data.items.map((item) => { const conditional = Boolean(item.showIfQuestion || item.conditionalLogic?.dependsOnQuestion); return <tr key={item._id} onClick={() => navigate(`/admin/assessments/${item._id}`)} className="cursor-pointer hover:bg-neutral-50"><td className="max-w-[420px] px-5 py-4"><div className="line-clamp-2 font-semibold text-neutral-950">{item.questionText}</div>{item.questionTextHindi && <div className="mt-1 line-clamp-1 text-xs text-neutral-500">{item.questionTextHindi}</div>}</td><td className="px-4 py-4 text-neutral-700">{typeLabel(item.questionType)}</td><td className="px-4 py-4 text-neutral-700">{item.painCategory?.name || 'Global'}</td><td className="px-4 py-4">{item.isRedFlag ? <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700"><AlertTriangle className="h-3 w-3" />Red flag</span> : <span className="text-xs font-semibold text-neutral-500">Standard</span>}</td><td className="px-4 py-4"><span className={cn('text-xs font-semibold', conditional ? 'text-sky-700' : 'text-neutral-400')}>{conditional ? 'Conditional' : 'Always shown'}</span></td><td className="px-4 py-4 text-neutral-600">{item.displayOrder ?? 0}</td><td className="px-4 py-4"><span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', item.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-600')}>{item.isActive ? 'Active' : 'Inactive'}</span></td><td className="px-5 py-4 text-right"><button type="button" onClick={(e) => { e.stopPropagation(); navigate(`/admin/assessments/${item._id}`); }} className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-primary-50 hover:text-primary-700">Review <ExternalLink className="h-3.5 w-3.5" /></button></td></tr>; })}</tbody></table></div>
        <div className="divide-y divide-neutral-100 md:hidden">{data.items.map((item) => <button key={item._id} type="button" onClick={() => navigate(`/admin/assessments/${item._id}`)} className="block w-full px-4 py-4 text-left"><div className="flex items-start justify-between gap-3"><div><div className="font-semibold text-neutral-950">{item.questionText}</div><div className="mt-1 text-xs text-neutral-500">{typeLabel(item.questionType)} · {item.painCategory?.name || 'Global'}</div></div>{item.isRedFlag && <AlertTriangle className="h-4 w-4 text-rose-600" />}</div></button>)}</div>
        <div className="flex items-center justify-between border-t border-neutral-200 px-4 py-3 sm:px-5"><p className="text-xs text-neutral-500">Page {data.meta.page} of {Math.max(data.meta.totalPages, 1)}</p><div className="flex gap-2"><button disabled={data.meta.page <= 1} onClick={() => setPage((v) => Math.max(1, v - 1))} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button><button disabled={data.meta.page >= data.meta.totalPages} onClick={() => setPage((v) => v + 1)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button></div></div>
      </>}
    </section>

    <Modal isOpen={showCreate} onClose={() => { setShowCreate(false); setFormError(''); }} title="Create assessment question" size="lg"><form onSubmit={handleCreate} className="space-y-5 pt-5"><div><p className="text-sm text-neutral-600">Create the basic question record here. Advanced red-flag and conditional rules can be configured from the question detail workspace.</p></div>{formError && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{formError}</div>}<div className="grid gap-4 sm:grid-cols-2"><label className="sm:col-span-2"><span className="text-xs font-semibold text-neutral-600">Question text *</span><textarea name="questionText" required rows={3} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm" /></label><label className="sm:col-span-2"><span className="text-xs font-semibold text-neutral-600">Hindi text</span><textarea name="questionTextHindi" rows={2} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm" /></label><label><span className="text-xs font-semibold text-neutral-600">Question type *</span><select name="questionType" required className="mt-1 min-h-11 w-full rounded-lg border border-neutral-300 px-3 text-sm">{['single_choice','multiple_choice','yes_no','pain_scale','number','text','date','image'].map((type) => <option key={type} value={type}>{typeLabel(type)}</option>)}</select></label><label><span className="text-xs font-semibold text-neutral-600">Pain category</span><select name="painCategory" className="mt-1 min-h-11 w-full rounded-lg border border-neutral-300 px-3 text-sm"><option value="">Global question</option>{categoriesQuery.data?.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}</select></label><label><span className="text-xs font-semibold text-neutral-600">Display order</span><input name="displayOrder" type="number" min="0" defaultValue="0" className="mt-1 min-h-11 w-full rounded-lg border border-neutral-300 px-3 text-sm" /></label><label className="flex items-center gap-3 self-end rounded-lg border border-neutral-200 px-3 py-3"><input name="isRedFlag" type="checkbox" className="h-4 w-4" /><span className="text-sm font-semibold text-neutral-700">Red-flag safety question</span></label></div><div className="flex justify-end gap-2 border-t border-neutral-100 pt-4"><button type="button" onClick={() => setShowCreate(false)} className="rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-semibold text-neutral-700">Cancel</button><button type="submit" disabled={createMutation.isPending} className="rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{createMutation.isPending ? 'Creating…' : 'Create question'}</button></div></form></Modal>
  </div>;
}
