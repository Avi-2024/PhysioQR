import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, CheckCircle2, Dumbbell, Edit3, PlayCircle, Plus, RefreshCw, ShieldCheck, Users } from 'lucide-react';
import apiClient from '@/lib/api-client';
import ErrorState from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/cn';
import { formatCurrency } from '@/lib/formatters';

type Category = { _id: string; name: string; nameHindi?: string; description?: string; isActive?: boolean };
type Exercise = { _id: string; name: string; nameHindi?: string; isActive?: boolean; videoUrl?: string; youtubeVideoId?: string; painCategory?: Category | null };
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
  isActive: boolean;
};
type DetailResponse = {
  program: Program;
  days: Day[];
  metrics: { configuredDays: number; totalExercises: number; enrollments: number; activeEnrollments: number; completedEnrollments: number; pendingPaymentEnrollments: number };
};
type ExerciseResponse = { items: Exercise[]; meta: { total: number } };
type CategoryOption = { _id: string; name: string };

type DayEditorState = { day?: Day; selectedIds: string[] };

const difficultyLevels = ['beginner', 'intermediate', 'advanced', 'senior_friendly', 'post_operative', 'general_mobility', 'condition_specific'];
const labelize = (value?: string) => value ? value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()) : '—';
const csv = (values?: string[]) => values?.join(', ') || '';
const parseCsv = (value: FormDataEntryValue | null) => String(value || '').split(',').map((item) => item.trim()).filter(Boolean);
const inputClass = 'mt-1 min-h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100';

export default function AdminProgramDetailPage() {
  const { programId = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showEdit, setShowEdit] = useState(false);
  const [showStatus, setShowStatus] = useState(false);
  const [dayEditor, setDayEditor] = useState<DayEditorState | null>(null);
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
  const exercisesQuery = useQuery<ExerciseResponse>({
    queryKey: ['admin-program-exercises', programId],
    enabled: Boolean(programId),
    queryFn: () => apiClient.get('/exercises', { params: { status: 'active', limit: 200 } }).then((response) => response.data),
  });

  const refreshRelated = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-program', programId] });
    queryClient.invalidateQueries({ queryKey: ['admin-programs'] });
    queryClient.invalidateQueries({ queryKey: ['admin-pain-categories'] });
    queryClient.invalidateQueries({ queryKey: ['admin-exercises'] });
  };

  const updateMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => apiClient.patch(`/admin/programs/${programId}`, payload),
    onSuccess: () => { setShowEdit(false); setFormError(''); refreshRelated(); },
    onError: (error: any) => setFormError(error?.response?.data?.message || 'Program could not be updated.'),
  });
  const statusMutation = useMutation({
    mutationFn: ({ action, reason }: { action: 'deactivate' | 'reactivate'; reason: string }) => apiClient.post(`/admin/programs/${programId}/${action}`, { reason }),
    onSuccess: () => { setShowStatus(false); setFormError(''); refreshRelated(); },
    onError: (error: any) => setFormError(error?.response?.data?.message || 'Program status could not be updated.'),
  });
  const dayMutation = useMutation({
    mutationFn: ({ day, payload }: { day?: Day; payload: Record<string, unknown> }) => day
      ? apiClient.put(`/programs/${programId}/days/${day._id}`, payload)
      : apiClient.post(`/programs/${programId}/days`, payload),
    onSuccess: () => { setDayEditor(null); setFormError(''); refreshRelated(); },
    onError: (error: any) => setFormError(error?.response?.data?.message || 'Program day could not be saved.'),
  });

  const program = query.data?.program;
  const metrics = query.data?.metrics;
  const exercises = exercisesQuery.data?.items || [];
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

  const handleDaySave = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!dayEditor) return;
    setFormError('');
    const form = new FormData(event.currentTarget);
    dayMutation.mutate({
      day: dayEditor.day,
      payload: {
        dayNumber: Number(form.get('dayNumber')),
        title: String(form.get('title') || '').trim(),
        exercises: dayEditor.selectedIds.map((exerciseId, index) => ({ exercise: exerciseId, displayOrder: index + 1 })),
      },
    });
  };

  const openNewDay = () => {
    const used = new Set((query.data?.days || []).map((day) => day.dayNumber));
    let nextDay = 1;
    while (used.has(nextDay) && nextDay <= program.durationDays) nextDay += 1;
    setDayEditor({ day: undefined, selectedIds: [] });
    setFormError('');
    setTimeout(() => {
      const input = document.querySelector<HTMLInputElement>('input[name="dayNumber"]');
      if (input && nextDay <= program.durationDays) input.value = String(nextDay);
    }, 0);
  };

  return <div className="min-w-0 space-y-6">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0"><button type="button" onClick={() => navigate('/admin/programs')} className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-neutral-500 hover:text-neutral-900"><ArrowLeft className="h-4 w-4" />Programs</button><div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-bold tracking-tight text-neutral-950 sm:text-3xl">{program.name}</h1><span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', program.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-600')}>{program.isActive ? 'Active' : 'Inactive'}</span></div><p className="mt-2 text-sm text-neutral-500">{program.programCode || 'No program code'} · {program.painCategory?.name || 'No pain category'} · {labelize(program.difficultyLevel)}</p></div>
      <div className="flex flex-wrap gap-2"><button type="button" onClick={() => query.refetch()} disabled={query.isFetching} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-700"><RefreshCw className={cn('h-4 w-4', query.isFetching && 'animate-spin')} />Refresh</button><button type="button" onClick={() => setShowEdit(true)} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-700"><Edit3 className="h-4 w-4" />Edit program</button><button type="button" onClick={() => setShowStatus(true)} className={cn('min-h-11 rounded-lg px-4 text-sm font-semibold text-white', program.isActive ? 'bg-neutral-800' : 'bg-primary-600')}>{program.isActive ? 'Deactivate' : 'Reactivate'}</button></div>
    </header>

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map((card) => <div key={card.label} className="rounded-xl border border-neutral-200 bg-white p-4"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{card.label}</p><p className="mt-2 text-2xl font-bold text-neutral-950">{card.value}</p></div><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-50 text-neutral-600"><card.icon className="h-5 w-5" /></div></div></div>)}</section>

    <section className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
      <div className="space-y-5">
        <div className="rounded-xl border border-neutral-200 bg-white p-5"><h2 className="text-base font-bold text-neutral-950">Program configuration</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><Info label="Pain category" value={program.painCategory?.name} /><Info label="Difficulty" value={labelize(program.difficultyLevel)} /><Info label="Duration" value={`${program.durationDays} days`} /><Info label="Sessions per day" value={String(program.sessionsPerDay || 1)} /><Info label="Default price" value={typeof program.defaultPrice === 'number' ? formatCurrency(program.defaultPrice) : '—'} /><Info label="Recommended age" value={program.recommendedAgeGroup} /></div>{program.description && <TextBlock label="Description" value={program.description} />}{program.precautions && <TextBlock label="Precautions" value={program.precautions} />}</div>

        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-base font-bold text-neutral-950">Day-wise rehab plan</h2><p className="mt-1 text-sm text-neutral-500">Assign reusable exercises to each day. Any video attached to the exercise is delivered automatically with that day.</p></div><button type="button" onClick={openNewDay} disabled={(query.data?.days.length || 0) >= program.durationDays} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary-600 px-3 text-sm font-semibold text-white disabled:opacity-40"><Plus className="h-4 w-4" />Add day</button></div>
          <div className="mt-4 space-y-3">{!query.data?.days.length ? <div className="rounded-lg border border-dashed border-neutral-300 px-4 py-8 text-center"><CalendarDays className="mx-auto h-8 w-8 text-neutral-300" /><p className="mt-2 text-sm font-semibold text-neutral-800">No days configured</p><p className="mt-1 text-sm text-neutral-500">Create Day 1 and select exercises from the reusable exercise library.</p></div> : query.data.days.map((day) => <div key={day._id} className="rounded-xl border border-neutral-200 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-primary-700">Day {day.dayNumber}</p><h3 className="mt-1 font-semibold text-neutral-950">{day.title || `Program day ${day.dayNumber}`}</h3></div><button type="button" onClick={() => { setDayEditor({ day, selectedIds: (day.exercises || []).map((entry) => entry.exercise?._id).filter(Boolean) as string[] }); setFormError(''); }} className="rounded-lg border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-700">Edit day</button></div><div className="mt-4 grid gap-2">{!day.exercises?.length ? <p className="text-sm text-neutral-400">No exercises assigned.</p> : day.exercises.map((entry, index) => <div key={`${day._id}-${index}`} className="flex items-center justify-between gap-3 rounded-lg bg-neutral-50 px-3 py-2.5"><div><p className="text-sm font-semibold text-neutral-800">{entry.exercise?.name || 'Exercise'}</p><p className="mt-0.5 text-xs text-neutral-500">{entry.exercise?.videoUrl ? 'Video linked' : 'No video linked'}</p></div>{entry.exercise?.videoUrl ? <PlayCircle className="h-4 w-4 text-primary-600" /> : <Dumbbell className="h-4 w-4 text-neutral-300" />}</div>)}</div></div>)}</div>
        </div>
      </div>

      <div className="space-y-5"><div className="rounded-xl border border-primary-200 bg-primary-50 p-5"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 text-primary-700" /><div><h2 className="text-sm font-bold text-primary-950">Clinical flow</h2><p className="mt-1 text-sm leading-6 text-primary-800">Common Assessment → Pain Category → Safe/Risk Review → Program → Day-wise Exercises → Exercise Video.</p></div></div></div><div className="rounded-xl border border-neutral-200 bg-white p-5"><h2 className="text-base font-bold text-neutral-950">Enrollment snapshot</h2><div className="mt-4 space-y-3"><StatRow label="Total enrollments" value={metrics?.enrollments} /><StatRow label="Active" value={metrics?.activeEnrollments} /><StatRow label="Completed" value={metrics?.completedEnrollments} /><StatRow label="Pending payment" value={metrics?.pendingPaymentEnrollments} /></div></div><div className="rounded-xl border border-neutral-200 bg-white p-5"><h2 className="text-base font-bold text-neutral-950">Eligibility & equipment</h2><TagList label="Eligible conditions" values={program.eligibleConditions} /><TagList label="Excluded conditions" values={program.excludedConditions} /><TagList label="Required equipment" values={program.requiredEquipment} /></div></div>
    </section>

    <Modal isOpen={Boolean(dayEditor)} onClose={() => { setDayEditor(null); setFormError(''); }} title={dayEditor?.day ? `Edit Day ${dayEditor.day.dayNumber}` : 'Add program day'} size="lg">{dayEditor && <form onSubmit={handleDaySave} className="space-y-5 pt-5">{formError && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{formError}</div>}<div className="grid gap-4 sm:grid-cols-2"><label><span className="text-xs font-semibold text-neutral-600">Day number *</span><input name="dayNumber" type="number" min="1" max={program.durationDays} required defaultValue={dayEditor.day?.dayNumber || Math.min((query.data?.days.length || 0) + 1, program.durationDays)} className={inputClass} /></label><label><span className="text-xs font-semibold text-neutral-600">Day title</span><input name="title" defaultValue={dayEditor.day?.title || ''} placeholder="Mobility & pain relief" className={inputClass} /></label></div><div><div className="flex items-center justify-between"><div><p className="text-sm font-bold text-neutral-900">Exercises</p><p className="mt-1 text-xs text-neutral-500">Select exercises in the order they should appear. Videos come from each exercise record.</p></div><button type="button" onClick={() => navigate('/admin/exercises')} className="text-xs font-semibold text-primary-700">Manage library</button></div>{exercisesQuery.isLoading ? <div className="mt-3 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div> : <div className="mt-3 max-h-80 space-y-2 overflow-y-auto rounded-lg border border-neutral-200 p-2">{exercises.map((exercise) => { const checked = dayEditor.selectedIds.includes(exercise._id); return <label key={exercise._id} className={cn('flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-3', checked ? 'border-primary-300 bg-primary-50' : 'border-neutral-100 bg-white')}><div className="flex items-center gap-3"><input type="checkbox" checked={checked} onChange={() => setDayEditor((current) => current ? { ...current, selectedIds: checked ? current.selectedIds.filter((id) => id !== exercise._id) : [...current.selectedIds, exercise._id] } : current)} /><div><p className="text-sm font-semibold text-neutral-800">{exercise.name}</p><p className="mt-0.5 text-xs text-neutral-500">{exercise.painCategory?.name || 'General'} · {exercise.videoUrl ? 'Video linked' : 'No video'}</p></div></div>{exercise.videoUrl && <PlayCircle className="h-4 w-4 text-primary-600" />}</label>; })}{!exercises.length && <p className="p-4 text-center text-sm text-neutral-500">No active exercises available. Create exercises first.</p>}</div>}</div><div className="flex justify-end gap-2"><button type="button" onClick={() => setDayEditor(null)} className="min-h-11 rounded-lg border border-neutral-300 px-4 text-sm font-semibold text-neutral-700">Cancel</button><button type="submit" disabled={dayMutation.isPending} className="min-h-11 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white disabled:opacity-60">{dayMutation.isPending ? 'Saving...' : 'Save day'}</button></div></form>}</Modal>

    <Modal isOpen={showEdit} onClose={() => { setShowEdit(false); setFormError(''); }} title="Edit rehabilitation program" size="lg"><form onSubmit={handleEdit} className="space-y-5 pt-5">{formError && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{formError}</div>}<div className="grid gap-4 sm:grid-cols-2"><Field label="Program name *"><input name="name" required defaultValue={program.name} className={inputClass} /></Field><Field label="Program code"><input name="programCode" defaultValue={program.programCode || ''} className={inputClass} /></Field><Field label="Hindi name"><input name="nameHindi" defaultValue={program.nameHindi || ''} className={inputClass} /></Field><Field label="Pain category *"><select name="painCategory" required defaultValue={program.painCategory?._id || ''} className={inputClass}><option value="">Select category</option>{categoriesQuery.data?.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}</select></Field><Field label="Difficulty"><select name="difficultyLevel" defaultValue={program.difficultyLevel || ''} className={inputClass}><option value="">Not specified</option>{difficultyLevels.map((level) => <option key={level} value={level}>{labelize(level)}</option>)}</select></Field><Field label="Duration days *"><input name="durationDays" type="number" min="1" max="365" required defaultValue={program.durationDays} className={inputClass} /></Field><Field label="Sessions/day"><input name="sessionsPerDay" type="number" min="1" max="10" defaultValue={program.sessionsPerDay || 1} className={inputClass} /></Field><Field label="Default price"><input name="defaultPrice" type="number" min="0" defaultValue={program.defaultPrice ?? ''} className={inputClass} /></Field><Field label="Recommended age"><input name="recommendedAgeGroup" defaultValue={program.recommendedAgeGroup || ''} className={inputClass} /></Field><label className="sm:col-span-2"><span className="text-xs font-semibold text-neutral-600">Description</span><textarea name="description" rows={3} defaultValue={program.description || ''} className={`${inputClass} py-3`} /></label><label className="sm:col-span-2"><span className="text-xs font-semibold text-neutral-600">Objective</span><textarea name="objective" rows={2} defaultValue={program.objective || ''} className={`${inputClass} py-3`} /></label><Field label="Eligible conditions"><input name="eligibleConditions" defaultValue={csv(program.eligibleConditions)} className={inputClass} /></Field><Field label="Excluded conditions"><input name="excludedConditions" defaultValue={csv(program.excludedConditions)} className={inputClass} /></Field><Field label="Required equipment"><input name="requiredEquipment" defaultValue={csv(program.requiredEquipment)} className={inputClass} /></Field><label className="sm:col-span-2"><span className="text-xs font-semibold text-neutral-600">Instructions</span><textarea name="instructions" rows={3} defaultValue={program.instructions || ''} className={`${inputClass} py-3`} /></label><label className="sm:col-span-2"><span className="text-xs font-semibold text-neutral-600">Precautions</span><textarea name="precautions" rows={3} defaultValue={program.precautions || ''} className={`${inputClass} py-3`} /></label></div><div className="flex justify-end gap-2"><button type="button" onClick={() => setShowEdit(false)} className="min-h-11 rounded-lg border border-neutral-300 px-4 text-sm font-semibold text-neutral-700">Cancel</button><button type="submit" disabled={updateMutation.isPending} className="min-h-11 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white">{updateMutation.isPending ? 'Saving...' : 'Save changes'}</button></div></form></Modal>

    <Modal isOpen={showStatus} onClose={() => { setShowStatus(false); setFormError(''); }} title={program.isActive ? 'Deactivate program' : 'Reactivate program'} size="md"><form onSubmit={handleStatus} className="space-y-4 pt-5"><p className="text-sm leading-6 text-neutral-600">{program.isActive ? 'Deactivating removes this program from new patient resolution while preserving historical enrollments.' : 'Reactivating makes this program eligible for future matching again.'}</p>{formError && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{formError}</div>}<label><span className="text-xs font-semibold text-neutral-600">Reason *</span><textarea name="reason" required rows={3} className={`${inputClass} py-3`} /></label><div className="flex justify-end gap-2"><button type="button" onClick={() => setShowStatus(false)} className="min-h-11 rounded-lg border border-neutral-300 px-4 text-sm font-semibold text-neutral-700">Cancel</button><button type="submit" disabled={statusMutation.isPending} className={cn('min-h-11 rounded-lg px-4 text-sm font-semibold text-white', program.isActive ? 'bg-neutral-800' : 'bg-primary-600')}>{statusMutation.isPending ? 'Saving...' : program.isActive ? 'Deactivate' : 'Reactivate'}</button></div></form></Modal>
  </div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label><span className="text-xs font-semibold text-neutral-600">{label}</span>{children}</label>; }
function Info({ label, value }: { label: string; value?: string }) { return <div><p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{label}</p><p className="mt-1 text-sm font-semibold text-neutral-800">{value || '—'}</p></div>; }
function TextBlock({ label, value }: { label: string; value: string }) { return <div className="mt-5 border-t border-neutral-100 pt-4"><p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{label}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-neutral-700">{value}</p></div>; }
function StatRow({ label, value }: { label: string; value?: number }) { return <div className="flex items-center justify-between gap-3"><span className="text-sm text-neutral-600">{label}</span><span className="text-sm font-bold text-neutral-900">{value ?? '—'}</span></div>; }
function TagList({ label, values }: { label: string; values?: string[] }) { return <div className="mt-4 first:mt-0"><p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{label}</p><div className="mt-2 flex flex-wrap gap-2">{values?.length ? values.map((value) => <span key={value} className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-700">{value}</span>) : <span className="text-sm text-neutral-400">—</span>}</div></div>; }
