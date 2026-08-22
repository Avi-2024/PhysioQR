import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Activity, Dumbbell, Edit3, PlayCircle, RefreshCw, ShieldCheck } from 'lucide-react';
import apiClient from '@/lib/api-client';
import ErrorState from '@/components/feedback/ErrorState';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';

type Category = { _id: string; name: string; nameHindi?: string; description?: string; isActive?: boolean };
type Exercise = {
  _id: string; name: string; nameHindi?: string; description?: string; videoUrl?: string; youtubeVideoId?: string;
  thumbnail?: string; repetitions?: number; sets?: number; holdDuration?: string; restDuration?: string; frequency?: string;
  requiredEquipment?: string[]; safetyInstructions?: string; commonMistakes?: string; painCategory?: Category | null;
  language: 'en' | 'hi'; displayOrder?: number; isActive: boolean;
};
type ProgramDay = { _id: string; dayNumber: number; title?: string; program?: { _id: string; name: string; programCode?: string; isActive?: boolean } | null };
type Response = { exercise: Exercise; usage: { programDays: number; programs: number }; programDays: ProgramDay[] };
const inputClass = 'mt-1 min-h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100';
const csv = (values?: string[]) => values?.join(', ') || '';

export default function AdminExerciseDetailPage() {
  const { exerciseId = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showEdit, setShowEdit] = useState(false);
  const [showStatus, setShowStatus] = useState(false);
  const [formError, setFormError] = useState('');

  const query = useQuery<Response>({ queryKey: ['admin-exercise', exerciseId], enabled: Boolean(exerciseId), queryFn: () => apiClient.get(`/exercises/${exerciseId}`).then((response) => response.data) });
  const categoriesQuery = useQuery<Category[]>({ queryKey: ['assessment-categories'], queryFn: () => apiClient.get('/assessments/categories').then((response) => response.data) });
  const refreshRelated = () => { queryClient.invalidateQueries({ queryKey: ['admin-exercise', exerciseId] }); queryClient.invalidateQueries({ queryKey: ['admin-exercises'] }); };

  const updateMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => apiClient.put(`/exercises/${exerciseId}`, payload),
    onSuccess: () => { setShowEdit(false); setFormError(''); refreshRelated(); },
    onError: (error: any) => setFormError(error?.response?.data?.message || 'Exercise could not be updated.'),
  });
  const statusMutation = useMutation({
    mutationFn: ({ action, reason }: { action: 'deactivate' | 'reactivate'; reason: string }) => apiClient.post(`/exercises/${exerciseId}/${action}`, { reason }),
    onSuccess: () => { setShowStatus(false); setFormError(''); refreshRelated(); },
    onError: (error: any) => setFormError(error?.response?.data?.message || 'Exercise status could not be updated.'),
  });

  const exercise = query.data?.exercise;
  const usage = query.data?.usage;
  const cards = useMemo(() => [
    { label: 'Programs', value: usage?.programs ?? '—', icon: Dumbbell },
    { label: 'Program days', value: usage?.programDays ?? '—', icon: Activity },
    { label: 'Sets', value: exercise?.sets ?? '—', icon: Dumbbell },
    { label: 'Repetitions', value: exercise?.repetitions ?? '—', icon: Activity },
  ], [usage, exercise]);

  if (query.isLoading) return <div className="space-y-4">{Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>;
  if (query.isError || !exercise) return <ErrorState title="Exercise could not load" message="The exercise may not exist or the API is unavailable." onRetry={() => query.refetch()} />;

  const handleEdit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setFormError(''); const form = new FormData(event.currentTarget);
    updateMutation.mutate({
      name: String(form.get('name') || '').trim(), nameHindi: String(form.get('nameHindi') || '').trim(),
      painCategory: String(form.get('painCategory') || '') || null, language: String(form.get('language') || 'en'),
      sets: form.get('sets') === '' ? undefined : Number(form.get('sets')), repetitions: form.get('repetitions') === '' ? undefined : Number(form.get('repetitions')),
      frequency: String(form.get('frequency') || '').trim(), holdDuration: String(form.get('holdDuration') || '').trim(), restDuration: String(form.get('restDuration') || '').trim(),
      videoUrl: String(form.get('videoUrl') || '').trim(), description: String(form.get('description') || '').trim(),
      safetyInstructions: String(form.get('safetyInstructions') || '').trim(), commonMistakes: String(form.get('commonMistakes') || '').trim(),
      requiredEquipment: String(form.get('requiredEquipment') || '').split(',').map((item) => item.trim()).filter(Boolean),
    });
  };
  const handleStatus = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    statusMutation.mutate({ action: exercise.isActive ? 'deactivate' : 'reactivate', reason: String(form.get('reason') || '').trim() });
  };

  return <div className="min-w-0 space-y-6">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><button type="button" onClick={() => navigate('/admin/exercises')} className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-neutral-500"><ArrowLeft className="h-4 w-4" />Exercises</button><div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-bold tracking-tight text-neutral-950 sm:text-3xl">{exercise.name}</h1><span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', exercise.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-600')}>{exercise.isActive ? 'Active' : 'Inactive'}</span></div><p className="mt-2 text-sm text-neutral-500">{exercise.painCategory?.name || 'General / cross-category'} · {exercise.language === 'hi' ? 'Hindi' : 'English'}</p></div><div className="flex flex-wrap gap-2"><button onClick={() => query.refetch()} disabled={query.isFetching} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-700"><RefreshCw className={cn('h-4 w-4', query.isFetching && 'animate-spin')} />Refresh</button><button onClick={() => setShowEdit(true)} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-700"><Edit3 className="h-4 w-4" />Edit</button><button onClick={() => setShowStatus(true)} className={cn('min-h-11 rounded-lg px-4 text-sm font-semibold text-white', exercise.isActive ? 'bg-neutral-800' : 'bg-primary-600')}>{exercise.isActive ? 'Deactivate' : 'Reactivate'}</button></div></header>

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map((card) => <div key={card.label} className="rounded-xl border border-neutral-200 bg-white p-4"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{card.label}</p><p className="mt-2 text-2xl font-bold text-neutral-950">{card.value}</p></div><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-50 text-neutral-600"><card.icon className="h-5 w-5" /></div></div></div>)}</section>

    <section className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]"><div className="space-y-5"><div className="rounded-xl border border-neutral-200 bg-white p-5"><h2 className="text-base font-bold text-neutral-950">Exercise prescription</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><Info label="Sets" value={exercise.sets} /><Info label="Repetitions" value={exercise.repetitions} /><Info label="Hold duration" value={exercise.holdDuration} /><Info label="Rest duration" value={exercise.restDuration} /><Info label="Frequency" value={exercise.frequency} /><Info label="Language" value={exercise.language === 'hi' ? 'Hindi' : 'English'} /></div>{exercise.description && <TextBlock label="Description" value={exercise.description} />}{exercise.safetyInstructions && <TextBlock label="Safety instructions" value={exercise.safetyInstructions} />}{exercise.commonMistakes && <TextBlock label="Common mistakes" value={exercise.commonMistakes} />}</div>
      <div className="rounded-xl border border-neutral-200 bg-white p-5"><h2 className="text-base font-bold text-neutral-950">Program usage</h2><p className="mt-1 text-sm text-neutral-500">Where this exercise is currently scheduled.</p><div className="mt-4 space-y-3">{!query.data?.programDays.length ? <div className="rounded-lg border border-dashed border-neutral-300 px-4 py-8 text-center text-sm text-neutral-500">This exercise is not assigned to any active program day.</div> : query.data.programDays.map((day) => <button key={day._id} type="button" onClick={() => day.program?._id && navigate(`/admin/programs/${day.program._id}`)} className="flex w-full items-center justify-between rounded-lg border border-neutral-200 p-4 text-left hover:bg-neutral-50"><div><p className="font-semibold text-neutral-900">{day.program?.name || 'Program'}</p><p className="mt-1 text-xs text-neutral-500">Day {day.dayNumber}{day.title ? ` · ${day.title}` : ''}</p></div><span className="text-xs font-semibold text-primary-700">Open program</span></button>)}</div></div></div>
      <div className="space-y-5"><div className="rounded-xl border border-primary-200 bg-primary-50 p-5"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 text-primary-700"/><div><h2 className="text-sm font-bold text-primary-950">Clinical content rule</h2><p className="mt-1 text-sm leading-6 text-primary-800">Exercises are reusable content. Pain-category mapping can narrow discovery, while final delivery is controlled by the program day that includes the exercise.</p></div></div></div><div className="rounded-xl border border-neutral-200 bg-white p-5"><h2 className="text-base font-bold text-neutral-950">Video</h2>{exercise.videoUrl ? <a href={exercise.videoUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary-700"><PlayCircle className="h-5 w-5" />Open YouTube video</a> : <p className="mt-3 text-sm text-neutral-500">No video linked.</p>}</div><div className="rounded-xl border border-neutral-200 bg-white p-5"><h2 className="text-base font-bold text-neutral-950">Equipment</h2><div className="mt-3 flex flex-wrap gap-2">{exercise.requiredEquipment?.length ? exercise.requiredEquipment.map((item) => <span key={item} className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-700">{item}</span>) : <span className="text-sm text-neutral-500">No equipment specified.</span>}</div></div></div></section>

    <Modal isOpen={showEdit} onClose={() => { setShowEdit(false); setFormError(''); }} title="Edit exercise" size="lg"><form onSubmit={handleEdit} className="space-y-5 pt-5">{formError && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{formError}</div>}<div className="grid gap-4 sm:grid-cols-2"><Field label="Exercise name *"><input name="name" required defaultValue={exercise.name} className={inputClass}/></Field><Field label="Hindi name"><input name="nameHindi" defaultValue={exercise.nameHindi || ''} className={inputClass}/></Field><Field label="Pain category"><select name="painCategory" defaultValue={exercise.painCategory?._id || ''} className={inputClass}><option value="">General / cross-category</option>{categoriesQuery.data?.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}</select></Field><Field label="Language"><select name="language" defaultValue={exercise.language} className={inputClass}><option value="en">English</option><option value="hi">Hindi</option></select></Field><Field label="Sets"><input name="sets" type="number" min="0" defaultValue={exercise.sets ?? ''} className={inputClass}/></Field><Field label="Repetitions"><input name="repetitions" type="number" min="0" defaultValue={exercise.repetitions ?? ''} className={inputClass}/></Field><Field label="Frequency"><input name="frequency" defaultValue={exercise.frequency || ''} className={inputClass}/></Field><Field label="Hold duration"><input name="holdDuration" defaultValue={exercise.holdDuration || ''} className={inputClass}/></Field><Field label="Rest duration"><input name="restDuration" defaultValue={exercise.restDuration || ''} className={inputClass}/></Field><Field label="YouTube URL"><input name="videoUrl" type="url" defaultValue={exercise.videoUrl || ''} className={inputClass}/></Field><Field label="Equipment"><input name="requiredEquipment" defaultValue={csv(exercise.requiredEquipment)} className={inputClass}/></Field><label className="sm:col-span-2"><span className="text-xs font-semibold text-neutral-600">Description</span><textarea name="description" rows={3} defaultValue={exercise.description || ''} className={`${inputClass} py-3`}/></label><label className="sm:col-span-2"><span className="text-xs font-semibold text-neutral-600">Safety instructions</span><textarea name="safetyInstructions" rows={3} defaultValue={exercise.safetyInstructions || ''} className={`${inputClass} py-3`}/></label><label className="sm:col-span-2"><span className="text-xs font-semibold text-neutral-600">Common mistakes</span><textarea name="commonMistakes" rows={3} defaultValue={exercise.commonMistakes || ''} className={`${inputClass} py-3`}/></label></div><div className="flex justify-end gap-2 border-t border-neutral-200 pt-4"><button type="button" onClick={() => setShowEdit(false)} className="min-h-10 rounded-lg border border-neutral-300 px-4 text-sm font-semibold text-neutral-700">Cancel</button><button disabled={updateMutation.isPending} className="min-h-10 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white disabled:opacity-60">{updateMutation.isPending ? 'Saving...' : 'Save changes'}</button></div></form></Modal>

    <Modal isOpen={showStatus} onClose={() => { setShowStatus(false); setFormError(''); }} title={exercise.isActive ? 'Deactivate exercise' : 'Reactivate exercise'} size="sm"><form onSubmit={handleStatus} className="space-y-4 pt-5">{formError && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{formError}</div>}<p className="text-sm text-neutral-600">{exercise.isActive ? 'Deactivation prevents new use while preserving existing program history.' : 'Reactivation makes this exercise available for active content workflows again.'}</p><label><span className="text-xs font-semibold text-neutral-600">Reason *</span><textarea name="reason" required rows={3} className={`${inputClass} py-3`}/></label><div className="flex justify-end gap-2"><button type="button" onClick={() => setShowStatus(false)} className="min-h-10 rounded-lg border border-neutral-300 px-4 text-sm font-semibold text-neutral-700">Cancel</button><button disabled={statusMutation.isPending} className="min-h-10 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white disabled:opacity-60">Confirm</button></div></form></Modal>
  </div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label><span className="text-xs font-semibold text-neutral-600">{label}</span>{children}</label>; }
function Info({ label, value }: { label: string; value: unknown }) { return <div><p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{label}</p><p className="mt-1 text-sm font-medium text-neutral-800">{value === undefined || value === null || value === '' ? '—' : String(value)}</p></div>; }
function TextBlock({ label, value }: { label: string; value: string }) { return <div className="mt-5 border-t border-neutral-100 pt-4"><p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{label}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-neutral-700">{value}</p></div>; }
