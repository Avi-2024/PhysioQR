import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, CheckCircle2, Dumbbell, Edit3, RefreshCw, ShieldCheck, Users } from 'lucide-react';
import apiClient from '@/lib/api-client';
import ErrorState from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/cn';
import { formatCurrency } from '@/lib/formatters';

type Category = { _id: string; name: string; nameHindi?: string; description?: string; isActive?: boolean };
type Exercise = { _id?: string; name?: string; nameHindi?: string; isActive?: boolean };
type Day = { _id: string; dayNumber: number; title?: string; exercises?: Array<{ exercise?: Exercise | null; displayOrder?: number }> };
type Program = {
  _id: string;
  programCode?: string;
  name: string;
  nameHindi?: string;
  painCategory?: Category | null;
  description?: string;
  objective?: string;
  difficultyLevel?: string;
  durationDays: number;
  sessionsPerDay?: number;
  recommendedAgeGroup?: string;
  eligibleConditions?: string[];
  excludedConditions?: string[];
  instructions?: string;
  precautions?: string;
  requiredEquipment?: string[];
  defaultPrice?: number;
  thumbnail?: string;
  isActive: boolean;
};
type DetailResponse = {
  program: Program;
  days: Day[];
  metrics: {
    configuredDays: number;
    totalExercises: number;
    enrollments: number;
    activeEnrollments: number;
    completedEnrollments: number;
    pendingPaymentEnrollments: number;
  };
};

type CategoryOption = { _id: string; name: string };
const difficultyLevels = ['beginner', 'intermediate', 'advanced', 'senior_friendly', 'post_operative', 'general_mobility', 'condition_specific'];
const labelize = (value?: string) => value ? value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()) : '—';
const csv = (values?: string[]) => values?.join(', ') || '';
const parseCsv = (value: FormDataEntryValue | null) => String(value || '').split(',').map((item) => item.trim()).filter(Boolean);

export default function AdminProgramDetailPage() {
  const { programId = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showEdit, setShowEdit] = useState(false);
  const [showStatus, setShowStatus] = useState(false);
  const [formError, setFormError] = useState('');

  const query = useQuery<DetailResponse>({
    queryKey: ['admin-program', programId],
    enabled: Boolean(programId),
    queryFn: () => apiClient.get(`/admin/programs/${programId}`).then((response) => response.data),
  });
  const categoriesQuery = useQuery<CategoryOption[]>({
    queryKey: ['assessment-categories'],
    queryFn: () => apiClient.get('/assessments/categories').then((response) => response.data),
  });

  const refreshRelated = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-program', programId] });
    queryClient.invalidateQueries({ queryKey: ['admin-programs'] });
    queryClient.invalidateQueries({ queryKey: ['admin-pain-categories'] });
  };

  const updateMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => apiClient.patch(`/admin/programs/${programId}`, payload),
    onSuccess: () => {
      setShowEdit(false);
      setFormError('');
      refreshRelated();
    },
    onError: (error: any) => setFormError(error?.response?.data?.message || 'Program could not be updated.'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ action, reason }: { action: 'deactivate' | 'reactivate'; reason: string }) => apiClient.post(`/admin/programs/${programId}/${action}`, { reason }),
    onSuccess: () => {
      setShowStatus(false);
      setFormError('');
      refreshRelated();
    },
    onError: (error: any) => setFormError(error?.response?.data?.message || 'Program status could not be updated.'),
  });

  const program = query.data?.program;
  const metrics = query.data?.metrics;
  const cards = useMemo(() => [
    { label: 'Configured days', value: metrics?.configuredDays ?? '—', icon: CalendarDays },
    { label: 'Exercises', value: metrics?.totalExercises ?? '—', icon: Dumbbell },
    { label: 'Active enrollments', value: metrics?.activeEnrollments ?? '—', icon: Users },
    { label: 'Completed', value: metrics?.completedEnrollments ?? '—', icon: CheckCircle2 },
  ], [metrics]);

  if (query.isLoading) return <div className="space-y-4">{Array.from({ length: 7 }).map((_, index) => <Skeleton key={index} className="h-20 w-full" />)}</div>;
  if (query.isError || !program) return <ErrorState title="Program could not load" message="The program may not exist or the admin API is unavailable." onRetry={() => query.refetch()} />;

  const handleEdit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');
    const form = new FormData(event.currentTarget);
    updateMutation.mutate({
      programCode: String(form.get('programCode') || '').trim() || undefined,
      name: String(form.get('name') || '').trim(),
      nameHindi: String(form.get('nameHindi') || '').trim(),
      painCategory: String(form.get('painCategory') || ''),
      difficultyLevel: String(form.get('difficultyLevel') || '') || undefined,
      durationDays: Number(form.get('durationDays')),
      sessionsPerDay: Number(form.get('sessionsPerDay') || 1),
      defaultPrice: form.get('defaultPrice') === '' ? undefined : Number(form.get('defaultPrice')),
      description: String(form.get('description') || '').trim(),
      objective: String(form.get('objective') || '').trim(),
      recommendedAgeGroup: String(form.get('recommendedAgeGroup') || '').trim(),
      eligibleConditions: parseCsv(form.get('eligibleConditions')),
      excludedConditions: parseCsv(form.get('excludedConditions')),
      requiredEquipment: parseCsv(form.get('requiredEquipment')),
      instructions: String(form.get('instructions') || '').trim(),
      precautions: String(form.get('precautions') || '').trim(),
    });
  };

  const handleStatus = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');
    const form = new FormData(event.currentTarget);
    statusMutation.mutate({ action: program.isActive ? 'deactivate' : 'reactivate', reason: String(form.get('reason') || '').trim() });
  };

  return <div className="min-w-0 space-y-6">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <button type="button" onClick={() => navigate('/admin/programs')} className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-neutral-500 hover:text-neutral-900"><ArrowLeft className="h-4 w-4" />Programs</button>
        <div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-bold tracking-tight text-neutral-950 sm:text-3xl">{program.name}</h1><span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', program.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-600')}>{program.isActive ? 'Active' : 'Inactive'}</span></div>
        <p className="mt-2 text-sm text-neutral-500">{program.programCode || 'No program code'} · {program.painCategory?.name || 'No pain category'} · {labelize(program.difficultyLevel)}</p>
      </div>
      <div className="flex flex-wrap gap-2"><button type="button" onClick={() => query.refetch()} disabled={query.isFetching} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-700"><RefreshCw className={cn('h-4 w-4', query.isFetching && 'animate-spin')} />Refresh</button><button type="button" onClick={() => setShowEdit(true)} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-700"><Edit3 className="h-4 w-4" />Edit</button><button type="button" onClick={() => setShowStatus(true)} className={cn('min-h-11 rounded-lg px-4 text-sm font-semibold text-white', program.isActive ? 'bg-neutral-800 hover:bg-neutral-900' : 'bg-primary-600 hover:bg-primary-700')}>{program.isActive ? 'Deactivate' : 'Reactivate'}</button></div>
    </header>

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map((card) => <div key={card.label} className="rounded-xl border border-neutral-200 bg-white p-4"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{card.label}</p><p className="mt-2 text-2xl font-bold text-neutral-950">{card.value}</p></div><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-50 text-neutral-600"><card.icon className="h-5 w-5" /></div></div></div>)}</section>

    <section className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
      <div className="space-y-5">
        <div className="rounded-xl border border-neutral-200 bg-white p-5"><h2 className="text-base font-bold text-neutral-950">Program configuration</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><Info label="Pain category" value={program.painCategory?.name} /><Info label="Difficulty" value={labelize(program.difficultyLevel)} /><Info label="Duration" value={`${program.durationDays} days`} /><Info label="Sessions per day" value={String(program.sessionsPerDay || 1)} /><Info label="Default price" value={typeof program.defaultPrice === 'number' ? formatCurrency(program.defaultPrice) : '—'} /><Info label="Recommended age" value={program.recommendedAgeGroup} /></div>{program.description && <TextBlock label="Description" value={program.description} />}{program.objective && <TextBlock label="Objective" value={program.objective} />}{program.instructions && <TextBlock label="Instructions" value={program.instructions} />}{program.precautions && <TextBlock label="Precautions" value={program.precautions} />}</div>
        <div className="rounded-xl border border-neutral-200 bg-white p-5"><div className="flex items-center justify-between gap-3"><div><h2 className="text-base font-bold text-neutral-950">Program schedule</h2><p className="mt-1 text-sm text-neutral-500">Configured days and exercises currently attached to this program.</p></div><span className="text-xs font-semibold text-neutral-500">{query.data?.days.length || 0} days</span></div><div className="mt-4 space-y-3">{!query.data?.days.length ? <div className="rounded-lg border border-dashed border-neutral-300 px-4 py-8 text-center text-sm text-neutral-500">No program days configured yet. Exercise/day management will be handled in the content workflow.</div> : query.data.days.map((day) => <div key={day._id} className="rounded-lg border border-neutral-200 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-primary-700">Day {day.dayNumber}</p><h3 className="mt-1 font-semibold text-neutral-900">{day.title || `Program day ${day.dayNumber}`}</h3></div><span className="text-xs font-semibold text-neutral-500">{day.exercises?.length || 0} exercises</span></div>{Boolean(day.exercises?.length) && <div className="mt-3 flex flex-wrap gap-2">{day.exercises?.map((entry, index) => <span key={`${day._id}-${index}`} className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-700">{entry.exercise?.name || 'Exercise'}</span>)}</div>}</div>)}</div></div>
      </div>
      <div className="space-y-5">
        <div className="rounded-xl border border-primary-200 bg-primary-50 p-5"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 text-primary-700" /><div><h2 className="text-sm font-bold text-primary-950">Assessment mapping</h2><p className="mt-1 text-sm leading-6 text-primary-800">The common assessment does not change by pain category. After a safe assessment, the selected pain category is used to resolve an active program such as this one.</p></div></div></div>
        <div className="rounded-xl border border-neutral-200 bg-white p-5"><h2 className="text-base font-bold text-neutral-950">Enrollment snapshot</h2><div className="mt-4 space-y-3"><StatRow label="Total enrollments" value={metrics?.enrollments} /><StatRow label="Active" value={metrics?.activeEnrollments} /><StatRow label="Completed" value={metrics?.completedEnrollments} /><StatRow label="Pending payment" value={metrics?.pendingPaymentEnrollments} /></div></div>
        <div className="rounded-xl border border-neutral-200 bg-white p-5"><h2 className="text-base font-bold text-neutral-950">Eligibility & equipment</h2><TagList label="Eligible conditions" values={program.eligibleConditions} /><TagList label="Excluded conditions" values={program.excludedConditions} /><TagList label="Required equipment" values={program.requiredEquipment} /></div>
      </div>
    </section>

    <Modal isOpen={showEdit} onClose={() => { setShowEdit(false); setFormError(''); }} title="Edit rehabilitation program" size="lg"><form onSubmit={handleEdit} className="space-y-5 pt-5">{formError && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{formError}</div>}<div className="grid gap-4 sm:grid-cols-2"><label className="sm:col-span-2"><span className="text-xs font-semibold text-neutral-600">Program name *</span><input name="name" required defaultValue={program.name} className="mt-1 min-h-11 w-full rounded-lg border border-neutral-300 px-3 text-sm" /></label><label><span className="text-xs font-semibold text-neutral-600">Program code</span><input name="programCode" defaultValue={program.programCode || ''} className="mt-1 min-h-11 w-full rounded-lg border border-neutral-300 px-3 text-sm" /></label><label><span className="text-xs font-semibold text-neutral-600">Hindi name</span><input name="nameHindi" defaultValue={program.nameHindi || ''} className="mt-1 min-h-11 w-full rounded-lg border border-neutral-300 px-3 text-sm" /></label><label><span className="text-xs font-semibold text-neutral-600">Pain category *</span><select name="painCategory" required defaultValue={program.painCategory?._id || ''} className="mt-1 min-h-11 w-full rounded-lg border border-neutral-300 px-3 text-sm"><option value="">Select category</option>{categoriesQuery.data?.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}</select></label><label><span className="text-xs font-semibold text-neutral-600">Difficulty</span><select name="difficultyLevel" defaultValue={program.difficultyLevel || ''} className="mt-1 min-h-11 w-full rounded-lg border border-neutral-300 px-3 text-sm"><option value="">Not specified</option>{difficultyLevels.map((level) => <option key={level} value={level}>{labelize(level)}</option>)}</select></label><label><span className="text-xs font-semibold text-neutral-600">Duration days *</span><input name="durationDays" type="number" min="1" max="365" required defaultValue={program.durationDays} className="mt-1 min-h-11 w-full rounded-lg border border-neutral-300 px-3 text-sm" /></label><label><span className="text-xs font-semibold text-neutral-600">Sessions per day</span><input name="sessionsPerDay" type="number" min="1" max="10" defaultValue={program.sessionsPerDay || 1} className="mt-1 min-h-11 w-full rounded-lg border border-neutral-300 px-3 text-sm" /></label><label><span className="text-xs font-semibold text-neutral-600">Default price</span><input name="defaultPrice" type="number" min="0" step="0.01" defaultValue={program.defaultPrice ?? ''} className="mt-1 min-h-11 w-full rounded-lg border border-neutral-300 px-3 text-sm" /></label><label><span className="text-xs font-semibold text-neutral-600">Recommended age</span><input name="recommendedAgeGroup" defaultValue={program.recommendedAgeGroup || ''} className="mt-1 min-h-11 w-full rounded-lg border border-neutral-300 px-3 text-sm" /></label><label className="sm:col-span-2"><span className="text-xs font-semibold text-neutral-600">Description</span><textarea name="description" rows={3} defaultValue={program.description || ''} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm" /></label><label className="sm:col-span-2"><span className="text-xs font-semibold text-neutral-600">Objective</span><textarea name="objective" rows={2} defaultValue={program.objective || ''} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm" /></label><label className="sm:col-span-2"><span className="text-xs font-semibold text-neutral-600">Eligible conditions</span><input name="eligibleConditions" defaultValue={csv(program.eligibleConditions)} placeholder="Comma separated" className="mt-1 min-h-11 w-full rounded-lg border border-neutral-300 px-3 text-sm" /></label><label className="sm:col-span-2"><span className="text-xs font-semibold text-neutral-600">Excluded conditions</span><input name="excludedConditions" defaultValue={csv(program.excludedConditions)} placeholder="Comma separated" className="mt-1 min-h-11 w-full rounded-lg border border-neutral-300 px-3 text-sm" /></label><label className="sm:col-span-2"><span className="text-xs font-semibold text-neutral-600">Required equipment</span><input name="requiredEquipment" defaultValue={csv(program.requiredEquipment)} placeholder="Comma separated" className="mt-1 min-h-11 w-full rounded-lg border border-neutral-300 px-3 text-sm" /></label><label className="sm:col-span-2"><span className="text-xs font-semibold text-neutral-600">Instructions</span><textarea name="instructions" rows={3} defaultValue={program.instructions || ''} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm" /></label><label className="sm:col-span-2"><span className="text-xs font-semibold text-neutral-600">Precautions</span><textarea name="precautions" rows={3} defaultValue={program.precautions || ''} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm" /></label></div><div className="flex justify-end gap-2"><button type="button" onClick={() => setShowEdit(false)} className="min-h-11 rounded-lg border border-neutral-300 px-4 text-sm font-semibold text-neutral-700">Cancel</button><button type="submit" disabled={updateMutation.isPending} className="min-h-11 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white disabled:opacity-60">{updateMutation.isPending ? 'Saving...' : 'Save changes'}</button></div></form></Modal>

    <Modal isOpen={showStatus} onClose={() => { setShowStatus(false); setFormError(''); }} title={program.isActive ? 'Deactivate program' : 'Reactivate program'} size="md"><form onSubmit={handleStatus} className="space-y-4 pt-5"><p className="text-sm leading-6 text-neutral-600">{program.isActive ? 'Deactivating removes this program from new patient program resolution while keeping historical enrollments intact.' : 'Reactivating makes this program eligible for new patient program resolution again.'}</p>{formError && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{formError}</div>}<label><span className="text-xs font-semibold text-neutral-600">Reason *</span><textarea name="reason" required rows={3} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm" /></label><div className="flex justify-end gap-2"><button type="button" onClick={() => setShowStatus(false)} className="min-h-11 rounded-lg border border-neutral-300 px-4 text-sm font-semibold text-neutral-700">Cancel</button><button type="submit" disabled={statusMutation.isPending} className={cn('min-h-11 rounded-lg px-4 text-sm font-semibold text-white disabled:opacity-60', program.isActive ? 'bg-neutral-800' : 'bg-primary-600')}>{statusMutation.isPending ? 'Saving...' : program.isActive ? 'Deactivate program' : 'Reactivate program'}</button></div></form></Modal>
  </div>;
}

function Info({ label, value }: { label: string; value?: string }) { return <div><p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{label}</p><p className="mt-1 text-sm font-semibold text-neutral-800">{value || '—'}</p></div>; }
function TextBlock({ label, value }: { label: string; value: string }) { return <div className="mt-5 border-t border-neutral-100 pt-4"><p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{label}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-neutral-700">{value}</p></div>; }
function StatRow({ label, value }: { label: string; value?: number }) { return <div className="flex items-center justify-between gap-3"><span className="text-sm text-neutral-600">{label}</span><span className="text-sm font-bold text-neutral-900">{value ?? '—'}</span></div>; }
function TagList({ label, values }: { label: string; values?: string[] }) { return <div className="mt-4 first:mt-0"><p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{label}</p><div className="mt-2 flex flex-wrap gap-2">{values?.length ? values.map((value) => <span key={value} className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-700">{value}</span>) : <span className="text-sm text-neutral-400">—</span>}</div></div>; }
