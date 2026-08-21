import { FormEvent, ReactNode, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, ClipboardList, GitBranch, RefreshCw, ShieldCheck } from 'lucide-react';
import apiClient from '@/lib/api-client';
import ErrorState from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/cn';

type Category = { _id: string; name: string; nameHindi?: string; description?: string; isActive?: boolean };
type ParentQuestion = { _id: string; questionText: string; questionType: string; isActive?: boolean };
type Question = {
  _id: string;
  questionText: string;
  questionTextHindi?: string;
  questionType: string;
  painCategory?: Category | null;
  options?: { label?: string; labelHindi?: string; value?: string }[];
  isRedFlag: boolean;
  redFlagAnswerValues?: unknown[];
  redFlagOperator?: string;
  redFlagMinValue?: number;
  redFlagMaxValue?: number;
  redFlagSafetyMessage?: string;
  displayOrder: number;
  isActive: boolean;
  showIfQuestion?: ParentQuestion | null;
  showIfAnswer?: string;
  conditionalLogic?: { dependsOnQuestion?: ParentQuestion | null; operator?: string; value?: unknown; values?: unknown[]; minValue?: number; maxValue?: number };
  createdAt?: string;
  updatedAt?: string;
};

const typeLabel = (value?: string) => value ? value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()) : '—';
const dateText = (value?: string) => value ? new Date(value).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const valuesText = (values?: unknown[]) => values?.length ? values.map((value) => String(value)).join(', ') : '—';

function Card({ title, children }: { title: string; children: ReactNode }) {
  return <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white"><div className="border-b border-neutral-100 bg-neutral-50/60 px-5 py-4"><h2 className="text-sm font-bold text-neutral-950">{title}</h2></div><div className="grid gap-4 p-5 sm:grid-cols-2">{children}</div></section>;
}
function Item({ label, value }: { label: string; value: ReactNode }) {
  return <div><div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">{label}</div><div className="mt-1 break-words text-sm font-semibold text-neutral-900">{value}</div></div>;
}

export default function AdminAssessmentDetailPage() {
  const { assessmentId = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showEdit, setShowEdit] = useState(false);
  const [showStatus, setShowStatus] = useState(false);
  const [formError, setFormError] = useState('');

  const query = useQuery<Question>({ queryKey: ['admin-assessment-question', assessmentId], queryFn: () => apiClient.get(`/admin/assessment-questions/${assessmentId}`).then((response) => response.data), enabled: Boolean(assessmentId) });
  const categoriesQuery = useQuery<Category[]>({ queryKey: ['assessment-categories'], queryFn: () => apiClient.get('/assessments/categories').then((response) => response.data) });
  const parentQuery = useQuery<{ items: Question[] }>({ queryKey: ['assessment-parent-questions'], queryFn: () => apiClient.get('/admin/assessment-questions', { params: { page: 1, limit: 100, status: 'active', sortBy: 'displayOrder', sortOrder: 'asc' } }).then((response) => response.data) });

  const updateMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => apiClient.patch(`/admin/assessment-questions/${assessmentId}`, payload),
    onSuccess: () => {
      setShowEdit(false);
      setFormError('');
      queryClient.invalidateQueries({ queryKey: ['admin-assessment-question', assessmentId] });
      queryClient.invalidateQueries({ queryKey: ['admin-assessment-questions'] });
    },
    onError: (error: any) => setFormError(error?.response?.data?.message || 'Question could not be updated.'),
  });
  const statusMutation = useMutation({
    mutationFn: ({ active, reason }: { active: boolean; reason: string }) => apiClient.post(`/admin/assessment-questions/${assessmentId}/${active ? 'reactivate' : 'deactivate'}`, { reason }),
    onSuccess: () => {
      setShowStatus(false);
      setFormError('');
      queryClient.invalidateQueries({ queryKey: ['admin-assessment-question', assessmentId] });
      queryClient.invalidateQueries({ queryKey: ['admin-assessment-questions'] });
    },
    onError: (error: any) => setFormError(error?.response?.data?.message || 'Status could not be changed.'),
  });

  if (query.isLoading) return <div className="space-y-5"><Skeleton className="h-32 w-full" /><Skeleton className="h-28 w-full" /><Skeleton className="h-[420px] w-full" /></div>;
  if (query.isError || !query.data) return <ErrorState title="Assessment question could not load" message="Check the question ID and admin API connection, then retry." onRetry={() => query.refetch()} />;

  const question = query.data;
  const parent = question.conditionalLogic?.dependsOnQuestion || question.showIfQuestion;
  const conditional = Boolean(parent);

  const handleUpdate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');
    const form = new FormData(event.currentTarget);
    const redFlagValues = String(form.get('redFlagAnswerValues') || '').split(',').map((value) => value.trim()).filter(Boolean);
    const options = String(form.get('options') || '').split('\n').map((line) => line.trim()).filter(Boolean).map((line) => { const [label, value] = line.split('|').map((part) => part.trim()); return { label, value: value || label }; });
    const parentId = String(form.get('showIfQuestion') || '');
    updateMutation.mutate({
      questionText: String(form.get('questionText') || '').trim(),
      questionTextHindi: String(form.get('questionTextHindi') || '').trim(),
      questionType: form.get('questionType'),
      painCategory: form.get('painCategory') || null,
      displayOrder: Number(form.get('displayOrder') || 0),
      isRedFlag: form.get('isRedFlag') === 'on',
      redFlagOperator: form.get('redFlagOperator'),
      redFlagAnswerValues: redFlagValues,
      redFlagMinValue: form.get('redFlagMinValue') || undefined,
      redFlagMaxValue: form.get('redFlagMaxValue') || undefined,
      redFlagSafetyMessage: String(form.get('redFlagSafetyMessage') || '').trim(),
      options,
      showIfQuestion: parentId || null,
      showIfAnswer: String(form.get('showIfAnswer') || '').trim(),
    });
  };

  return <div className="mx-auto w-full max-w-[1500px] space-y-5">
    <header className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6"><div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between"><div className="flex min-w-0 items-start gap-4"><button type="button" onClick={() => navigate('/admin/assessments')} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-neutral-200 text-neutral-600 hover:bg-neutral-50"><ArrowLeft className="h-5 w-5" /></button><div className={cn('flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl', question.isRedFlag ? 'bg-rose-50 text-rose-700' : 'bg-primary-50 text-primary-700')}>{question.isRedFlag ? <AlertTriangle className="h-7 w-7" /> : <ClipboardList className="h-7 w-7" />}</div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h1 className="max-w-4xl text-xl font-bold tracking-tight text-neutral-950 sm:text-2xl">{question.questionText}</h1><span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', question.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-600')}>{question.isActive ? 'Active' : 'Inactive'}</span>{question.isRedFlag && <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">Red flag</span>}</div><p className="mt-2 text-sm text-neutral-600">{typeLabel(question.questionType)} · {question.painCategory?.name || 'Global assessment question'}</p><p className="mt-1 text-xs text-neutral-500">Updated {dateText(question.updatedAt)}</p></div></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => query.refetch()} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-neutral-300 px-3.5 text-sm font-semibold text-neutral-700"><RefreshCw className={cn('h-4 w-4', query.isFetching && 'animate-spin')} />Refresh</button><button type="button" onClick={() => setShowEdit(true)} className="inline-flex min-h-10 items-center rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white">Edit configuration</button></div></div></header>

    {question.isRedFlag && <section className="rounded-xl border border-rose-200 bg-rose-50 p-4"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-rose-700" /><div><div className="text-sm font-bold text-rose-950">Safety-sensitive question</div><p className="mt-1 text-sm leading-6 text-rose-800">Matching answers can send patient assessments to the Risk Reviews queue. Changes here affect future assessment submissions, so review the operator and safety message carefully.</p></div></div></section>}

    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]"><main className="space-y-5"><Card title="Question content"><Item label="English" value={question.questionText} /><Item label="Hindi" value={question.questionTextHindi || '—'} /><Item label="Type" value={typeLabel(question.questionType)} /><Item label="Pain category" value={question.painCategory?.name || 'Global'} /><Item label="Display order" value={String(question.displayOrder ?? 0)} /><Item label="Status" value={question.isActive ? 'Active' : 'Inactive'} /></Card><Card title="Answer configuration"><Item label="Options" value={question.options?.length ? question.options.map((option) => option.label || option.value).filter(Boolean).join(', ') : 'Not required / not configured'} /><Item label="Option count" value={String(question.options?.length || 0)} /></Card><Card title="Red-flag rule"><Item label="Enabled" value={question.isRedFlag ? 'Yes' : 'No'} /><Item label="Operator" value={typeLabel(question.redFlagOperator)} /><Item label="Trigger values" value={valuesText(question.redFlagAnswerValues)} /><Item label="Range" value={question.redFlagMinValue !== undefined || question.redFlagMaxValue !== undefined ? `${question.redFlagMinValue ?? '—'} to ${question.redFlagMaxValue ?? '—'}` : '—'} /><Item label="Safety message" value={question.redFlagSafetyMessage || '—'} /></Card><Card title="Conditional visibility"><Item label="Conditional" value={conditional ? 'Yes' : 'No'} /><Item label="Depends on" value={parent?.questionText || 'Always shown'} /><Item label="Expected answer" value={question.showIfAnswer || (question.conditionalLogic?.value !== undefined ? String(question.conditionalLogic.value) : '—')} /><Item label="Operator" value={typeLabel(question.conditionalLogic?.operator || (conditional ? 'equals' : undefined))} /></Card></main>

      <aside className="space-y-4 xl:sticky xl:top-5"><section className="overflow-hidden rounded-xl border border-neutral-200 bg-white"><div className="border-b border-neutral-100 bg-neutral-50/60 px-4 py-4"><h2 className="text-sm font-bold text-neutral-950">Configuration actions</h2><p className="mt-1 text-xs text-neutral-500">Use status changes instead of hard deletion so historical assessments remain explainable.</p></div><div className="space-y-2 p-4"><button type="button" onClick={() => setShowEdit(true)} className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-left text-sm font-semibold text-neutral-700 hover:bg-neutral-50">Edit question and rules</button><button type="button" onClick={() => { setFormError(''); setShowStatus(true); }} className={cn('w-full rounded-xl border px-4 py-3 text-left text-sm font-semibold', question.isActive ? 'border-rose-200 text-rose-700 hover:bg-rose-50' : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50')}>{question.isActive ? 'Deactivate question' : 'Reactivate question'}</button><button type="button" onClick={() => navigate('/admin/risk-reviews')} className="flex w-full items-center gap-2 rounded-xl border border-neutral-200 px-4 py-3 text-left text-sm font-semibold text-neutral-700 hover:bg-neutral-50"><AlertTriangle className="h-4 w-4" />Open Risk Reviews</button></div></section><section className="rounded-xl border border-neutral-200 bg-white p-4"><div className="flex items-center gap-2 text-sm font-bold text-neutral-950"><GitBranch className="h-4 w-4 text-primary-700" />Rule summary</div><div className="mt-4 space-y-3 text-sm"><div className="flex justify-between gap-3"><span className="text-neutral-500">Category</span><span className="text-right font-semibold text-neutral-900">{question.painCategory?.name || 'Global'}</span></div><div className="flex justify-between gap-3"><span className="text-neutral-500">Red flag</span><span className="font-semibold text-neutral-900">{question.isRedFlag ? 'Yes' : 'No'}</span></div><div className="flex justify-between gap-3"><span className="text-neutral-500">Conditional</span><span className="font-semibold text-neutral-900">{conditional ? 'Yes' : 'No'}</span></div></div></section></aside>
    </div>

    <Modal isOpen={showEdit} onClose={() => { setShowEdit(false); setFormError(''); }} title="Edit assessment question" size="xl"><form onSubmit={handleUpdate} className="space-y-6 pt-5">{formError && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{formError}</div>}<div><h3 className="text-sm font-bold text-neutral-900">Question</h3><div className="mt-3 grid gap-4 sm:grid-cols-2"><label className="sm:col-span-2"><span className="text-xs font-semibold text-neutral-600">Question text *</span><textarea name="questionText" required rows={3} defaultValue={question.questionText} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm" /></label><label className="sm:col-span-2"><span className="text-xs font-semibold text-neutral-600">Hindi text</span><textarea name="questionTextHindi" rows={2} defaultValue={question.questionTextHindi || ''} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm" /></label><label><span className="text-xs font-semibold text-neutral-600">Type</span><select name="questionType" defaultValue={question.questionType} className="mt-1 min-h-11 w-full rounded-lg border border-neutral-300 px-3 text-sm">{['single_choice','multiple_choice','yes_no','pain_scale','number','text','date','image'].map((type) => <option key={type} value={type}>{typeLabel(type)}</option>)}</select></label><label><span className="text-xs font-semibold text-neutral-600">Pain category</span><select name="painCategory" defaultValue={question.painCategory?._id || ''} className="mt-1 min-h-11 w-full rounded-lg border border-neutral-300 px-3 text-sm"><option value="">Global</option>{categoriesQuery.data?.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}</select></label><label><span className="text-xs font-semibold text-neutral-600">Display order</span><input name="displayOrder" type="number" min="0" defaultValue={question.displayOrder ?? 0} className="mt-1 min-h-11 w-full rounded-lg border border-neutral-300 px-3 text-sm" /></label><label className="flex items-center gap-3 self-end rounded-lg border border-neutral-200 px-3 py-3"><input name="isRedFlag" type="checkbox" defaultChecked={question.isRedFlag} className="h-4 w-4" /><span className="text-sm font-semibold text-neutral-700">Red-flag question</span></label></div></div><div><h3 className="text-sm font-bold text-neutral-900">Options</h3><p className="mt-1 text-xs text-neutral-500">One option per line. Use <code>Label | value</code>. Leave blank for non-choice questions.</p><textarea name="options" rows={5} defaultValue={question.options?.map((option) => `${option.label || option.value || ''} | ${option.value || option.label || ''}`).join('\n') || ''} className="mt-3 w-full rounded-lg border border-neutral-300 px-3 py-2.5 font-mono text-sm" /></div><div><h3 className="text-sm font-bold text-neutral-900">Red-flag safety rule</h3><div className="mt-3 grid gap-4 sm:grid-cols-2"><label><span className="text-xs font-semibold text-neutral-600">Operator</span><select name="redFlagOperator" defaultValue={question.redFlagOperator || 'any_answer'} className="mt-1 min-h-11 w-full rounded-lg border border-neutral-300 px-3 text-sm">{['any_answer','equals','not_equals','includes','gte','lte','between'].map((operator) => <option key={operator} value={operator}>{typeLabel(operator)}</option>)}</select></label><label><span className="text-xs font-semibold text-neutral-600">Trigger values</span><input name="redFlagAnswerValues" defaultValue={valuesText(question.redFlagAnswerValues) === '—' ? '' : valuesText(question.redFlagAnswerValues)} placeholder="yes, severe" className="mt-1 min-h-11 w-full rounded-lg border border-neutral-300 px-3 text-sm" /></label><label><span className="text-xs font-semibold text-neutral-600">Minimum</span><input name="redFlagMinValue" type="number" defaultValue={question.redFlagMinValue ?? ''} className="mt-1 min-h-11 w-full rounded-lg border border-neutral-300 px-3 text-sm" /></label><label><span className="text-xs font-semibold text-neutral-600">Maximum</span><input name="redFlagMaxValue" type="number" defaultValue={question.redFlagMaxValue ?? ''} className="mt-1 min-h-11 w-full rounded-lg border border-neutral-300 px-3 text-sm" /></label><label className="sm:col-span-2"><span className="text-xs font-semibold text-neutral-600">Safety message</span><textarea name="redFlagSafetyMessage" rows={3} defaultValue={question.redFlagSafetyMessage || ''} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm" /></label></div></div><div><h3 className="text-sm font-bold text-neutral-900">Conditional visibility</h3><div className="mt-3 grid gap-4 sm:grid-cols-2"><label><span className="text-xs font-semibold text-neutral-600">Depends on question</span><select name="showIfQuestion" defaultValue={parent?._id || ''} className="mt-1 min-h-11 w-full rounded-lg border border-neutral-300 px-3 text-sm"><option value="">Always show</option>{parentQuery.data?.items.filter((item) => item._id !== question._id).map((item) => <option key={item._id} value={item._id}>{item.questionText}</option>)}</select></label><label><span className="text-xs font-semibold text-neutral-600">Show when answer equals</span><input name="showIfAnswer" defaultValue={question.showIfAnswer || ''} className="mt-1 min-h-11 w-full rounded-lg border border-neutral-300 px-3 text-sm" /></label></div></div><div className="flex justify-end gap-2 border-t border-neutral-100 pt-4"><button type="button" onClick={() => setShowEdit(false)} className="rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-semibold text-neutral-700">Cancel</button><button type="submit" disabled={updateMutation.isPending} className="rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{updateMutation.isPending ? 'Saving…' : 'Save changes'}</button></div></form></Modal>

    <Modal isOpen={showStatus} onClose={() => { setShowStatus(false); setFormError(''); }} title={question.isActive ? 'Deactivate assessment question' : 'Reactivate assessment question'} size="md"><form onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const reason = String(form.get('reason') || '').trim(); if (!reason) { setFormError('Reason is required.'); return; } statusMutation.mutate({ active: !question.isActive, reason }); }} className="space-y-4 pt-5">{formError && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{formError}</div>}<p className="text-sm leading-6 text-neutral-600">{question.isActive ? 'The question will stop appearing in future assessments. Historical patient assessment records remain unchanged.' : 'The question will become available for future assessments again.'}</p><label><span className="text-xs font-semibold text-neutral-600">Reason *</span><textarea name="reason" required rows={3} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm" /></label><div className="flex justify-end gap-2"><button type="button" onClick={() => setShowStatus(false)} className="rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-semibold text-neutral-700">Cancel</button><button type="submit" disabled={statusMutation.isPending} className={cn('rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60', question.isActive ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700')}>{statusMutation.isPending ? 'Saving…' : question.isActive ? 'Deactivate' : 'Reactivate'}</button></div></form></Modal>
  </div>;
}
