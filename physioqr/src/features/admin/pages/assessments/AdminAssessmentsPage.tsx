import { useDeferredValue, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  ExternalLink,
  GitBranch,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import apiClient from '@/lib/api-client';
import ErrorState from '@/components/feedback/ErrorState';
import { SearchInput } from '@/components/ui/SearchInput';
import { Skeleton } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/cn';

type Question = {
  _id: string;
  questionText: string;
  questionTextHindi?: string;
  questionType: string;
  isRedFlag: boolean;
  isActive: boolean;
  displayOrder: number;
  showIfQuestion?: { _id: string; questionText: string } | null;
  conditionalLogic?: { dependsOnQuestion?: { _id: string; questionText: string } | null };
};

type Response = {
  items: Question[];
  meta: { page: number; limit: number; total: number; totalPages: number };
  summary: { total: number; active: number; inactive: number; redFlags: number; conditional: number };
};

type CreateOption = {
  label: string;
  labelHindi: string;
};

type CreatePayload = Record<string, unknown>;

type QuestionType = 'single_choice' | 'multiple_choice' | 'yes_no' | 'pain_scale' | 'number' | 'text' | 'date' | 'image';

type RedFlagOperator = 'equals' | 'includes' | 'gte' | 'lte' | 'between';

const PAGE_SIZE = 20;
const QUESTION_TYPES: QuestionType[] = ['single_choice', 'multiple_choice', 'yes_no', 'pain_scale', 'number', 'text', 'date', 'image'];
const CHOICE_TYPES: QuestionType[] = ['single_choice', 'multiple_choice'];
const RED_FLAG_TYPES: QuestionType[] = ['single_choice', 'multiple_choice', 'yes_no', 'pain_scale', 'number'];
const emptyData: Response = {
  items: [],
  meta: { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 },
  summary: { total: 0, active: 0, inactive: 0, redFlags: 0, conditional: 0 },
};

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
    queryFn: () => apiClient.get('/admin/assessment-questions', {
      params: {
        page,
        limit: PAGE_SIZE,
        ...(deferredSearch ? { search: deferredSearch } : {}),
        ...(status ? { status } : {}),
        ...(questionType ? { questionType } : {}),
        ...(redFlag ? { redFlag } : {}),
      },
    }).then((response) => response.data),
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreatePayload) => apiClient.post('/admin/assessment-questions', payload),
    onSuccess: () => {
      setShowCreate(false);
      setFormError('');
      queryClient.invalidateQueries({ queryKey: ['admin-assessment-questions'] });
      queryClient.invalidateQueries({ queryKey: ['assessment-questions'] });
    },
    onError: (error: any) => setFormError(error?.response?.data?.message || 'Question could not be created.'),
  });

  const data = query.data ?? emptyData;
  const cards = useMemo(() => [
    { label: 'Active common questions', value: data.summary.active, icon: ClipboardList },
    { label: 'Red flag rules', value: data.summary.redFlags, icon: AlertTriangle },
    { label: 'Conditional questions', value: data.summary.conditional, icon: GitBranch },
    { label: 'Assessment mode', value: 'Common', icon: ShieldCheck },
  ], [data.summary]);

  return (
    <div className="min-w-0 space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-700">Clinical configuration</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-neutral-950 sm:text-3xl">Common Assessment</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-neutral-500">
            Every patient receives this same active question set. Pain category is selected inside the patient assessment, while red-flag and conditional rules are configured here. Pain categories no longer own separate questions.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => query.refetch()} disabled={query.isFetching} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-60">
            <RefreshCw className={cn('h-4 w-4', query.isFetching && 'animate-spin')} />Refresh
          </button>
          <button type="button" onClick={() => { setFormError(''); setShowCreate(true); }} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700">
            <Plus className="h-4 w-4" />New question
          </button>
        </div>
      </header>

      <section className="rounded-xl border border-primary-200 bg-primary-50 p-4 text-sm leading-6 text-primary-900">
        <strong>Flow:</strong> Common questions → patient selects pain category inside assessment → red-flag evaluation → safe assessment uses selected category for program mapping; flagged assessment goes to Risk Reviews.
      </section>

      {!query.isError && (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <div key={card.label} className="rounded-xl border border-neutral-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{card.label}</p>
                  <p className="mt-2 text-2xl font-bold text-neutral-950">{query.isLoading ? '—' : card.value}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-50 text-neutral-600"><card.icon className="h-5 w-5" /></div>
              </div>
            </div>
          ))}
        </section>
      )}

      <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <div className="border-b border-neutral-200 px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="min-w-0 flex-1">
              <SearchInput value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Search question text or safety message" />
            </div>
            <select value={questionType} onChange={(event) => { setQuestionType(event.target.value); setPage(1); }} className="min-h-11 rounded-lg border border-neutral-300 bg-white px-3 text-sm">
              <option value="">All types</option>
              {QUESTION_TYPES.map((type) => <option key={type} value={type}>{typeLabel(type)}</option>)}
            </select>
            <select value={redFlag} onChange={(event) => { setRedFlag(event.target.value); setPage(1); }} className="min-h-11 rounded-lg border border-neutral-300 bg-white px-3 text-sm">
              <option value="">All safety rules</option>
              <option value="true">Red flag only</option>
              <option value="false">Non red flag</option>
            </select>
            <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="min-h-11 rounded-lg border border-neutral-300 bg-white px-3 text-sm">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="">All statuses</option>
            </select>
          </div>
          {!query.isLoading && !query.isError && <p className="mt-3 text-xs text-neutral-500">{data.meta.total} question{data.meta.total === 1 ? '' : 's'} found.</p>}
        </div>

        {query.isError ? (
          <div className="p-5"><ErrorState title="Assessment could not load" message="Check the admin API and session, then retry." onRetry={() => query.refetch()} /></div>
        ) : query.isLoading ? (
          <div className="space-y-3 p-5">{Array.from({ length: 7 }).map((_, index) => <Skeleton key={index} className="h-14 w-full" />)}</div>
        ) : data.items.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <ClipboardList className="mx-auto h-9 w-9 text-neutral-300" />
            <h2 className="mt-3 text-sm font-semibold text-neutral-900">No common assessment questions found</h2>
            <p className="mt-1 text-sm text-neutral-500">Create a question or adjust the filters.</p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[960px] text-left text-sm">
                <thead className="border-b border-neutral-200 bg-neutral-50/80">
                  <tr className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    <th className="px-5 py-3">Question</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Safety</th><th className="px-4 py-3">Logic</th><th className="px-4 py-3">Order</th><th className="px-4 py-3">Status</th><th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {data.items.map((item) => {
                    const conditional = Boolean(item.showIfQuestion || item.conditionalLogic?.dependsOnQuestion);
                    return (
                      <tr key={item._id} onClick={() => navigate(`/admin/assessments/${item._id}`)} className="cursor-pointer hover:bg-neutral-50">
                        <td className="max-w-[440px] px-5 py-4"><div className="line-clamp-2 font-semibold text-neutral-950">{item.questionText}</div>{item.questionTextHindi && <div className="mt-1 line-clamp-1 text-xs text-neutral-500">{item.questionTextHindi}</div>}</td>
                        <td className="px-4 py-4 text-neutral-700">{typeLabel(item.questionType)}</td>
                        <td className="px-4 py-4">{item.isRedFlag ? <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700"><AlertTriangle className="h-3 w-3" />Red flag</span> : <span className="text-xs font-semibold text-neutral-500">Standard</span>}</td>
                        <td className="px-4 py-4"><span className={cn('text-xs font-semibold', conditional ? 'text-sky-700' : 'text-neutral-400')}>{conditional ? 'Conditional' : 'Always shown'}</span></td>
                        <td className="px-4 py-4 text-neutral-600">{item.displayOrder ?? 0}</td>
                        <td className="px-4 py-4"><span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', item.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-600')}>{item.isActive ? 'Active' : 'Inactive'}</span></td>
                        <td className="px-5 py-4 text-right"><button type="button" onClick={(event) => { event.stopPropagation(); navigate(`/admin/assessments/${item._id}`); }} className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-primary-50 hover:text-primary-700">Review <ExternalLink className="h-3.5 w-3.5" /></button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="divide-y divide-neutral-100 md:hidden">
              {data.items.map((item) => <button key={item._id} type="button" onClick={() => navigate(`/admin/assessments/${item._id}`)} className="block w-full px-4 py-4 text-left"><div className="flex items-start justify-between gap-3"><div><div className="font-semibold text-neutral-950">{item.questionText}</div><div className="mt-1 text-xs text-neutral-500">{typeLabel(item.questionType)} · Common assessment</div></div>{item.isRedFlag && <AlertTriangle className="h-4 w-4 text-rose-600" />}</div></button>)}
            </div>
            <div className="flex items-center justify-between border-t border-neutral-200 px-4 py-3 sm:px-5">
              <p className="text-xs text-neutral-500">Page {data.meta.page} of {Math.max(data.meta.totalPages, 1)}</p>
              <div className="flex gap-2">
                <button disabled={data.meta.page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
                <button disabled={data.meta.page >= data.meta.totalPages} onClick={() => setPage((value) => value + 1)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
              </div>
            </div>
          </>
        )}
      </section>

      <Modal isOpen={showCreate} onClose={() => { setShowCreate(false); setFormError(''); }} title="Create common assessment question" size="xl">
        {showCreate && (
          <CreateQuestionForm
            saving={createMutation.isPending}
            error={formError}
            onCancel={() => { setShowCreate(false); setFormError(''); }}
            onSubmit={(payload) => { setFormError(''); createMutation.mutate(payload); }}
          />
        )}
      </Modal>
    </div>
  );
}

function CreateQuestionForm({ saving, error, onCancel, onSubmit }: { saving: boolean; error: string; onCancel: () => void; onSubmit: (payload: CreatePayload) => void }) {
  const [questionText, setQuestionText] = useState('');
  const [questionTextHindi, setQuestionTextHindi] = useState('');
  const [type, setType] = useState<QuestionType>('single_choice');
  const [options, setOptions] = useState<CreateOption[]>([
    { label: '', labelHindi: '' },
    { label: '', labelHindi: '' },
  ]);
  const [isRedFlag, setIsRedFlag] = useState(false);
  const [choiceTriggerIndex, setChoiceTriggerIndex] = useState('0');
  const [yesNoTrigger, setYesNoTrigger] = useState('yes');
  const [numericOperator, setNumericOperator] = useState<RedFlagOperator>('gte');
  const [minValue, setMinValue] = useState('');
  const [maxValue, setMaxValue] = useState('');
  const [safetyMessage, setSafetyMessage] = useState('');
  const [localError, setLocalError] = useState('');

  const usesOptions = CHOICE_TYPES.includes(type);
  const supportsRedFlag = RED_FLAG_TYPES.includes(type);

  const updateOption = (index: number, field: keyof CreateOption, value: string) => {
    setOptions((current) => current.map((option, optionIndex) => optionIndex === index ? { ...option, [field]: value } : option));
  };

  const addOption = () => setOptions((current) => [...current, { label: '', labelHindi: '' }]);
  const removeOption = (index: number) => setOptions((current) => current.length <= 2 ? current : current.filter((_, optionIndex) => optionIndex !== index));

  const handleTypeChange = (nextType: QuestionType) => {
    setType(nextType);
    setLocalError('');
    if (!RED_FLAG_TYPES.includes(nextType)) setIsRedFlag(false);
    if (CHOICE_TYPES.includes(nextType) && options.length < 2) setOptions([{ label: '', labelHindi: '' }, { label: '', labelHindi: '' }]);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError('');

    const englishQuestion = questionText.trim();
    if (!englishQuestion) {
      setLocalError('Question text is required.');
      return;
    }

    const configuredOptions = usesOptions
      ? options.map((option, index) => ({
          label: option.label.trim(),
          labelHindi: option.labelHindi.trim(),
          value: optionValue(option.label, index),
        }))
      : type === 'yes_no'
        ? [
            { label: 'Yes', labelHindi: 'हाँ', value: 'yes' },
            { label: 'No', labelHindi: 'नहीं', value: 'no' },
          ]
        : [];

    if (usesOptions) {
      if (configuredOptions.length < 2 || configuredOptions.some((option) => !option.label)) {
        setLocalError('Add at least two answer options and fill every English option label.');
        return;
      }
      if (new Set(configuredOptions.map((option) => option.value)).size !== configuredOptions.length) {
        setLocalError('Answer options must be unique.');
        return;
      }
    }

    if (isRedFlag && !safetyMessage.trim()) {
      setLocalError('Add a safety message for this red-flag question.');
      return;
    }

    const payload: CreatePayload = {
      questionText: englishQuestion,
      questionTextHindi: questionTextHindi.trim(),
      questionType: type,
      options: configuredOptions,
      isRedFlag,
    };

    if (isRedFlag) {
      payload.redFlagSafetyMessage = safetyMessage.trim();

      if (type === 'yes_no') {
        payload.redFlagOperator = 'equals';
        payload.redFlagAnswerValues = [yesNoTrigger];
      } else if (type === 'single_choice' || type === 'multiple_choice') {
        const triggerIndex = Number(choiceTriggerIndex);
        const trigger = configuredOptions[Number.isFinite(triggerIndex) ? triggerIndex : 0];
        if (!trigger) {
          setLocalError('Choose which answer should trigger the red flag.');
          return;
        }
        payload.redFlagOperator = type === 'multiple_choice' ? 'includes' : 'equals';
        payload.redFlagAnswerValues = [trigger.value];
      } else if (type === 'pain_scale' || type === 'number') {
        payload.redFlagOperator = numericOperator;
        if (numericOperator === 'gte') {
          if (minValue === '') return setLocalError('Enter the minimum value that should trigger the red flag.');
          payload.redFlagMinValue = Number(minValue);
        } else if (numericOperator === 'lte') {
          if (maxValue === '') return setLocalError('Enter the maximum value that should trigger the red flag.');
          payload.redFlagMaxValue = Number(maxValue);
        } else {
          if (minValue === '' || maxValue === '') return setLocalError('Enter both minimum and maximum values for the red-flag range.');
          payload.redFlagMinValue = Number(minValue);
          payload.redFlagMaxValue = Number(maxValue);
        }
      }
    }

    onSubmit(payload);
  };

  return (
    <form onSubmit={submit} className="space-y-6 pt-5">
      <div className="rounded-lg border border-primary-100 bg-primary-50 px-4 py-3 text-sm leading-6 text-primary-800">
        Build the full patient-facing question here. Answer options and safety rules are saved together, while display order is assigned automatically in steps of 10. Conditional visibility can still be configured from the question detail page.
      </div>

      {(error || localError) && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{localError || error}</div>}

      <section className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-neutral-600">Question text *</label>
          <textarea value={questionText} onChange={(event) => setQuestionText(event.target.value)} required rows={3} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100" placeholder="e.g. When did your current problem start?" />
        </div>
        <div>
          <label className="text-xs font-semibold text-neutral-600">Hindi text</label>
          <textarea value={questionTextHindi} onChange={(event) => setQuestionTextHindi(event.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100" placeholder="Optional Hindi translation" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className="text-xs font-semibold text-neutral-600">Question type *</span>
            <select value={type} onChange={(event) => handleTypeChange(event.target.value as QuestionType)} className="mt-1 min-h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm">
              {QUESTION_TYPES.map((questionType) => <option key={questionType} value={questionType}>{typeLabel(questionType)}</option>)}
            </select>
          </label>
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5">
            <div className="text-xs font-semibold text-neutral-600">Display order</div>
            <div className="mt-1 text-sm font-semibold text-neutral-900">Automatic</div>
            <div className="text-xs text-neutral-500">Next available 10, 20, 30… sequence</div>
          </div>
        </div>
      </section>

      {usesOptions && (
        <section className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-neutral-950">Answer options</h3>
              <p className="mt-1 text-xs leading-5 text-neutral-500">These are shown directly to the patient. English label is required; Hindi is optional.</p>
            </div>
            <button type="button" onClick={addOption} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-primary-200 bg-white px-3 text-xs font-semibold text-primary-700"><Plus className="h-3.5 w-3.5" />Add option</button>
          </div>
          <div className="mt-4 space-y-3">
            {options.map((option, index) => (
              <div key={index} className="grid gap-2 rounded-lg border border-neutral-200 bg-white p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                <label><span className="text-xs font-semibold text-neutral-600">Option {index + 1} *</span><input value={option.label} onChange={(event) => updateOption(index, 'label', event.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm" placeholder="English label" /></label>
                <label><span className="text-xs font-semibold text-neutral-600">Hindi label</span><input value={option.labelHindi} onChange={(event) => updateOption(index, 'labelHindi', event.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm" placeholder="Optional" /></label>
                <button type="button" disabled={options.length <= 2} onClick={() => removeOption(index)} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-30" aria-label={`Remove option ${index + 1}`}><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        </section>
      )}

      {type === 'yes_no' && (
        <section className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-4">
          <h3 className="text-sm font-bold text-neutral-950">Answer options</h3>
          <p className="mt-1 text-xs text-neutral-500">Yes and No are generated automatically for the patient.</p>
          <div className="mt-3 flex gap-2"><span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700">Yes</span><span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700">No</span></div>
        </section>
      )}

      {type === 'pain_scale' && (
        <section className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-4">
          <h3 className="text-sm font-bold text-neutral-950">Pain scale</h3>
          <p className="mt-1 text-xs text-neutral-500">Patient receives the standard 0–10 scale automatically: 0 = no pain, 10 = worst pain.</p>
        </section>
      )}

      <section className="rounded-xl border border-neutral-200 p-4">
        <label className={cn('flex items-start gap-3', !supportsRedFlag && 'opacity-60')}>
          <input type="checkbox" checked={isRedFlag} disabled={!supportsRedFlag} onChange={(event) => setIsRedFlag(event.target.checked)} className="mt-0.5 h-4 w-4" />
          <span><span className="block text-sm font-semibold text-neutral-800">Safety-sensitive / red-flag question</span><span className="mt-1 block text-xs leading-5 text-neutral-500">A red flag must have an explicit trigger. Any-answer red flags are not created from this form.</span></span>
        </label>
        {!supportsRedFlag && <p className="mt-3 rounded-lg bg-neutral-50 px-3 py-2 text-xs text-neutral-500">Red-flag rules are available for Single Choice, Multiple Choice, Yes/No, Pain Scale and Number questions.</p>}

        {isRedFlag && (
          <div className="mt-4 space-y-4 border-t border-neutral-100 pt-4">
            {type === 'yes_no' && (
              <label className="block"><span className="text-xs font-semibold text-neutral-600">Trigger when answer is *</span><select value={yesNoTrigger} onChange={(event) => setYesNoTrigger(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm"><option value="yes">Yes</option><option value="no">No</option></select></label>
            )}

            {(type === 'single_choice' || type === 'multiple_choice') && (
              <label className="block"><span className="text-xs font-semibold text-neutral-600">Trigger when patient selects *</span><select value={choiceTriggerIndex} onChange={(event) => setChoiceTriggerIndex(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm"><option value="">Choose an option</option>{options.map((option, index) => option.label.trim() ? <option key={index} value={String(index)}>{option.label.trim()}</option> : null)}</select></label>
            )}

            {(type === 'pain_scale' || type === 'number') && (
              <div className="grid gap-3 sm:grid-cols-3">
                <label><span className="text-xs font-semibold text-neutral-600">Trigger rule *</span><select value={numericOperator} onChange={(event) => setNumericOperator(event.target.value as RedFlagOperator)} className="mt-1 min-h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm"><option value="gte">At or above</option><option value="lte">At or below</option><option value="between">Between</option></select></label>
                {(numericOperator === 'gte' || numericOperator === 'between') && <label><span className="text-xs font-semibold text-neutral-600">Minimum *</span><input type="number" min={type === 'pain_scale' ? 0 : undefined} max={type === 'pain_scale' ? 10 : undefined} value={minValue} onChange={(event) => setMinValue(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-neutral-300 px-3 text-sm" /></label>}
                {(numericOperator === 'lte' || numericOperator === 'between') && <label><span className="text-xs font-semibold text-neutral-600">Maximum *</span><input type="number" min={type === 'pain_scale' ? 0 : undefined} max={type === 'pain_scale' ? 10 : undefined} value={maxValue} onChange={(event) => setMaxValue(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-neutral-300 px-3 text-sm" /></label>}
              </div>
            )}

            <label className="block"><span className="text-xs font-semibold text-neutral-600">Safety message *</span><textarea value={safetyMessage} onChange={(event) => setSafetyMessage(event.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm" placeholder="e.g. Medical review is recommended before starting the programme." /></label>
          </div>
        )}
      </section>

      <div className="flex justify-end gap-2 border-t border-neutral-100 pt-5">
        <button type="button" onClick={onCancel} className="rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-semibold">Cancel</button>
        <button disabled={saving} className="rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Creating…' : 'Create question'}</button>
      </div>
    </form>
  );
}

function optionValue(label: string, index: number) {
  const normalized = label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return normalized || `option_${index + 1}`;
}
