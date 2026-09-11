import { useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpenCheck, Edit3, Power, RefreshCw, Stethoscope } from 'lucide-react';
import apiClient from '@/lib/api-client';
import { Modal } from '@/components/ui/Modal';

type Program = { _id:string; programCode?:string; name:string; durationDays:number; difficultyLevel?:string; defaultPrice?:number; isActive:boolean };
type Detail = { _id:string; name:string; nameHindi?:string; description?:string; isActive:boolean; linkedPrograms:number; activePrograms:number; assessmentUsage:number; programs:Program[]; createdAt:string; updatedAt:string };
const pretty = (value?:string) => String(value || '—').replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase());

export default function AdminPainCategoryDetailPage() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [form, setForm] = useState({ name:'', nameHindi:'', description:'' });

  const query = useQuery({
    queryKey: ['admin-pain-category', categoryId],
    enabled: Boolean(categoryId),
    queryFn: async () => (await apiClient.get<Detail>(`/admin/pain-categories/${categoryId}`)).data,
  });
  const data = query.data;

  const openEdit = () => {
    if (!data) return;
    setForm({ name:data.name, nameHindi:data.nameHindi || '', description:data.description || '' });
    setEditOpen(true);
  };

  const update = useMutation({
    mutationFn: async () => apiClient.patch(`/admin/pain-categories/${categoryId}`, form),
    onSuccess: async () => {
      setEditOpen(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey:['admin-pain-category', categoryId] }),
        queryClient.invalidateQueries({ queryKey:['admin-pain-categories'] }),
        queryClient.invalidateQueries({ queryKey:['pain-categories'] }),
        queryClient.invalidateQueries({ queryKey:['admin-assessment-pathways'] }),
        queryClient.invalidateQueries({ queryKey:['assessment-pathways'] }),
      ]);
    },
  });

  const statusMutation = useMutation({
    mutationFn: async () => apiClient.post(`/admin/pain-categories/${categoryId}/${data?.isActive ? 'deactivate' : 'reactivate'}`, { reason }),
    onSuccess: async () => {
      setStatusOpen(false);
      setReason('');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey:['admin-pain-category', categoryId] }),
        queryClient.invalidateQueries({ queryKey:['admin-pain-categories'] }),
        queryClient.invalidateQueries({ queryKey:['pain-categories'] }),
        queryClient.invalidateQueries({ queryKey:['admin-assessment-pathways'] }),
        queryClient.invalidateQueries({ queryKey:['assessment-pathways'] }),
      ]);
    },
  });

  const save = (event:FormEvent) => {
    event.preventDefault();
    if (form.name.trim()) update.mutate();
  };

  if (query.isLoading) return <div className="p-8 text-sm text-slate-500">Loading body region…</div>;
  if (query.isError || !data) return <div className="space-y-3"><button onClick={() => navigate('/admin/pain-categories')} className="text-sm font-semibold text-emerald-700">← Body Regions</button><div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">Body region could not be loaded.</div></div>;

  return <div className="space-y-6">
    <button onClick={() => navigate('/admin/pain-categories')} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600"><ArrowLeft size={16}/>Body Regions</button>

    <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 lg:flex-row lg:items-start lg:justify-between">
      <div><p className="text-xs font-semibold tracking-[0.16em] text-emerald-700">BODY REGION</p><h1 className="mt-1 text-2xl font-semibold text-slate-950">{data.name}</h1><p className="mt-1 text-sm text-slate-500">{data.nameHindi || 'No Hindi label'} · {data.isActive ? 'Active' : 'Inactive'}</p><p className="mt-3 max-w-3xl text-sm text-slate-600">{data.description || 'No description recorded.'}</p></div>
      <div className="flex flex-wrap gap-2"><button onClick={() => query.refetch()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold"><RefreshCw size={15}/>Refresh</button><button onClick={openEdit} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold"><Edit3 size={15}/>Edit</button><button onClick={() => setStatusOpen(true)} className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${data.isActive ? 'border border-red-200 bg-red-50 text-red-700' : 'bg-emerald-600 text-white'}`}><Power size={15}/>{data.isActive ? 'Deactivate' : 'Reactivate'}</button></div>
    </header>

    <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><div className="flex items-start gap-3"><Stethoscope className="mt-0.5 h-5 w-5 text-emerald-700"/><div><p className="font-semibold text-emerald-950">Assessment & programme routing</p><p className="mt-1 text-sm leading-6 text-emerald-800">This body region can have its own assessment questions in addition to common questions. It also maps patients to relevant rehabilitation programmes and filters surgery choices in post-operative pathways.</p></div></div></section>

    <section className="grid gap-3 sm:grid-cols-3">
      {[['Linked programs', data.linkedPrograms], ['Active programs', data.activePrograms], ['Historical assessment usage', data.assessmentUsage]].map(([label, value]) => <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-sm text-slate-500">{String(label)}</p><p className="mt-2 text-2xl font-semibold text-slate-950">{String(value)}</p></div>)}
    </section>

    <section className="rounded-2xl border border-slate-200 bg-white"><div className="flex items-center gap-2 border-b border-slate-100 p-4"><BookOpenCheck size={18}/><h2 className="font-semibold text-slate-950">Rehabilitation programs</h2></div>{!data.programs.length ? <p className="p-5 text-sm text-slate-500">No programs are mapped to this body region yet.</p> : <div className="divide-y divide-slate-100">{data.programs.map((program) => <div key={program._id} className="p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-medium text-slate-900">{program.name}</p><p className="mt-1 text-xs text-slate-500">{program.programCode || '—'} · {program.durationDays} days · {pretty(program.difficultyLevel)}</p></div><span className={`rounded-full px-2 py-1 text-xs font-semibold ${program.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{program.isActive ? 'Active' : 'Inactive'}</span></div></div>)}</div>}</section>

    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><strong>Lifecycle rule:</strong> body regions are deactivated instead of deleted so historical assessments, surgery mappings and programme records remain explainable.</div>

    <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Edit body region" size="lg"><form onSubmit={save} className="space-y-4 pt-4"><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Body region name<input value={form.name} onChange={(event) => setForm({ ...form, name:event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 p-3"/></label><label className="text-sm font-medium">Hindi name<input value={form.nameHindi} onChange={(event) => setForm({ ...form, nameHindi:event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 p-3"/></label></div><label className="block text-sm font-medium">Description<textarea value={form.description} onChange={(event) => setForm({ ...form, description:event.target.value })} rows={5} className="mt-1 w-full rounded-xl border border-slate-200 p-3"/></label>{update.isError && <p className="text-sm text-red-700">Changes could not be saved.</p>}<div className="flex justify-end gap-2"><button type="button" onClick={() => setEditOpen(false)} className="rounded-xl border px-4 py-2 text-sm font-semibold">Cancel</button><button disabled={!form.name.trim() || update.isPending} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{update.isPending ? 'Saving…' : 'Save changes'}</button></div></form></Modal>

    <Modal isOpen={statusOpen} onClose={() => setStatusOpen(false)} title={data.isActive ? 'Deactivate body region' : 'Reactivate body region'} size="md"><div className="space-y-4 pt-4"><p className="text-sm text-slate-600">{data.isActive ? 'This removes the body region from new patient pathway choices without deleting historical records.' : 'This makes the body region selectable in patient pathways again.'}</p><textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={4} placeholder="Reason (required)" className="w-full rounded-xl border border-slate-200 p-3 text-sm"/>{statusMutation.isError && <p className="text-sm text-red-700">Status could not be changed.</p>}<div className="flex justify-end gap-2"><button onClick={() => setStatusOpen(false)} className="rounded-xl border px-4 py-2 text-sm font-semibold">Cancel</button><button disabled={!reason.trim() || statusMutation.isPending} onClick={() => statusMutation.mutate()} className={`rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${data.isActive ? 'bg-red-600' : 'bg-emerald-600'}`}>{statusMutation.isPending ? 'Saving…' : data.isActive ? 'Deactivate' : 'Reactivate'}</button></div></div></Modal>
  </div>;
}
