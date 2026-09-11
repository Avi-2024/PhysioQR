import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Activity, ClipboardList, Plus, RefreshCw, Settings2, Stethoscope } from 'lucide-react';
import apiClient from '@/lib/api-client';
import { Modal } from '@/components/ui/Modal';

 type BodyRegion = { _id:string; name:string; nameHindi?:string; isActive:boolean };
 type CaseType = { _id:string; code:string; name:string; nameHindi?:string; description?:string; requiresSurgeryDetails:boolean; requiresPhysioReview:boolean; displayOrder:number; isActive:boolean };
 type SurgeryType = { _id:string; code:string; name:string; nameHindi?:string; description?:string; requiresPhysioReview:boolean; displayOrder:number; isActive:boolean; bodyRegion?:BodyRegion };
 type Payload = { caseTypes:CaseType[]; bodyRegions:BodyRegion[]; surgeryTypes:SurgeryType[]; summary:{activeCaseTypes:number;activeBodyRegions:number;activeSurgeryTypes:number} };

const emptyCase = { name:'', code:'', nameHindi:'', description:'', requiresSurgeryDetails:false, requiresPhysioReview:false, displayOrder:10, isActive:true };
const emptySurgery = { name:'', code:'', nameHindi:'', description:'', bodyRegion:'', requiresPhysioReview:true, displayOrder:10, isActive:true };

export default function AdminAssessmentPathwaysPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [caseEditor, setCaseEditor] = useState<CaseType | null | undefined>(undefined);
  const [surgeryEditor, setSurgeryEditor] = useState<SurgeryType | null | undefined>(undefined);

  const query = useQuery<Payload>({ queryKey:['admin-assessment-pathways'], queryFn:() => apiClient.get('/admin/assessment-pathways').then((response) => response.data) });
  const data = query.data;

  const caseMutation = useMutation({
    mutationFn:(payload:Record<string, unknown>) => caseEditor?._id
      ? apiClient.patch(`/admin/assessment-pathways/case-types/${caseEditor._id}`, payload)
      : apiClient.post('/admin/assessment-pathways/case-types', payload),
    onSuccess:async() => { setCaseEditor(undefined); await queryClient.invalidateQueries({ queryKey:['admin-assessment-pathways'] }); await queryClient.invalidateQueries({ queryKey:['assessment-pathways'] }); },
  });

  const surgeryMutation = useMutation({
    mutationFn:(payload:Record<string, unknown>) => surgeryEditor?._id
      ? apiClient.patch(`/admin/assessment-pathways/surgery-types/${surgeryEditor._id}`, payload)
      : apiClient.post('/admin/assessment-pathways/surgery-types', payload),
    onSuccess:async() => { setSurgeryEditor(undefined); await queryClient.invalidateQueries({ queryKey:['admin-assessment-pathways'] }); await queryClient.invalidateQueries({ queryKey:['assessment-surgery-types'] }); },
  });

  const groupedSurgeries = useMemo(() => {
    const map = new Map<string, SurgeryType[]>();
    (data?.surgeryTypes || []).forEach((item) => {
      const key = item.bodyRegion?.name || 'Unassigned';
      map.set(key, [...(map.get(key) || []), item]);
    });
    return Array.from(map.entries());
  }, [data?.surgeryTypes]);

  return <div className="space-y-6">
    <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-700">Clinical configuration</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-neutral-950 sm:text-3xl">Clinical Pathways</h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-neutral-500">Configure what brings a patient to physiotherapy and which surgery choices appear for each body region. Patient onboarding reads these values from the API; nothing in the patient UI is hardcoded.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => query.refetch()} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-700"><RefreshCw className="h-4 w-4"/>Refresh</button>
        <button type="button" onClick={() => setCaseEditor(null)} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white"><Plus className="h-4 w-4"/>Case type</button>
        <button type="button" onClick={() => setSurgeryEditor(null)} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-primary-200 bg-primary-50 px-4 text-sm font-semibold text-primary-700"><Plus className="h-4 w-4"/>Surgery type</button>
      </div>
    </header>

    <section className="rounded-xl border border-primary-200 bg-primary-50 p-4 text-sm leading-6 text-primary-900"><strong>Patient routing:</strong> Case Type → Body Region → Surgery Type + Surgery Date when required → Common + scoped assessment → clinical review when configured → programme.</section>

    <section className="grid gap-3 sm:grid-cols-3">
      <Summary label="Active case types" value={data?.summary.activeCaseTypes} icon={<ClipboardList className="h-5 w-5"/>}/>
      <Summary label="Active body regions" value={data?.summary.activeBodyRegions} icon={<Activity className="h-5 w-5"/>}/>
      <Summary label="Active surgery types" value={data?.summary.activeSurgeryTypes} icon={<Stethoscope className="h-5 w-5"/>}/>
    </section>

    <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-neutral-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-sm font-bold text-neutral-950">Case Types</h2><p className="mt-1 text-xs text-neutral-500">Use “Requires surgery details” for post-operative pathways. “Physio review required” blocks programme selection until the review is cleared.</p></div></div>
      {query.isLoading ? <Loading/> : !data?.caseTypes.length ? <Empty text="No case types configured yet."/> : <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500"><tr><th className="px-5 py-3">Case type</th><th className="px-4 py-3">Surgery details</th><th className="px-4 py-3">Clinical review</th><th className="px-4 py-3">Status</th><th className="px-5 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-neutral-100">{data.caseTypes.map((item) => <tr key={item._id}><td className="px-5 py-4"><div className="font-semibold text-neutral-950">{item.name}</div><div className="mt-1 text-xs text-neutral-500">{item.code} · order {item.displayOrder}</div></td><td className="px-4 py-4">{yesNo(item.requiresSurgeryDetails)}</td><td className="px-4 py-4">{yesNo(item.requiresPhysioReview)}</td><td className="px-4 py-4"><Status active={item.isActive}/></td><td className="px-5 py-4 text-right"><button type="button" onClick={() => setCaseEditor(item)} className="font-semibold text-primary-700">Edit</button></td></tr>)}</tbody></table></div>}
    </section>

    <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-neutral-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-sm font-bold text-neutral-950">Body Regions</h2><p className="mt-1 text-xs text-neutral-500">Programs still use the existing PainCategory model internally for backward compatibility.</p></div><button type="button" onClick={() => navigate('/admin/pain-categories')} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-neutral-200 px-3 text-sm font-semibold text-neutral-700"><Settings2 className="h-4 w-4"/>Manage body regions</button></div>
      <div className="flex flex-wrap gap-2 p-5">{(data?.bodyRegions || []).map((region) => <span key={region._id} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${region.isActive ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-neutral-200 bg-neutral-100 text-neutral-500'}`}>{region.name}</span>)}</div>
    </section>

    <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <div className="border-b border-neutral-100 px-5 py-4"><h2 className="text-sm font-bold text-neutral-950">Surgery Types by Body Region</h2><p className="mt-1 text-xs text-neutral-500">Patient surgery options are filtered dynamically by the selected body region.</p></div>
      {query.isLoading ? <Loading/> : !data?.surgeryTypes.length ? <Empty text="No surgery types configured yet."/> : <div className="divide-y divide-neutral-100">{groupedSurgeries.map(([region, items]) => <div key={region} className="p-5"><div className="mb-3 text-sm font-bold text-neutral-900">{region}</div><div className="grid gap-2 lg:grid-cols-2">{items.map((item) => <button type="button" key={item._id} onClick={() => setSurgeryEditor(item)} className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 p-3 text-left hover:bg-neutral-50"><div><div className="text-sm font-semibold text-neutral-900">{item.name}</div><div className="mt-1 text-xs text-neutral-500">{item.code} · Review {item.requiresPhysioReview ? 'required' : 'not required'}</div></div><Status active={item.isActive}/></button>)}</div></div>)}</div>}
    </section>

    <Modal isOpen={caseEditor !== undefined} onClose={() => setCaseEditor(undefined)} title={caseEditor?._id ? 'Edit case type' : 'Add case type'} size="lg">{caseEditor !== undefined && <CaseTypeForm value={caseEditor || undefined} saving={caseMutation.isPending} error={mutationMessage(caseMutation.error)} onCancel={() => setCaseEditor(undefined)} onSubmit={(payload) => caseMutation.mutate(payload)}/>}</Modal>
    <Modal isOpen={surgeryEditor !== undefined} onClose={() => setSurgeryEditor(undefined)} title={surgeryEditor?._id ? 'Edit surgery type' : 'Add surgery type'} size="lg">{surgeryEditor !== undefined && <SurgeryTypeForm value={surgeryEditor || undefined} bodyRegions={(data?.bodyRegions || []).filter((item) => item.isActive)} saving={surgeryMutation.isPending} error={mutationMessage(surgeryMutation.error)} onCancel={() => setSurgeryEditor(undefined)} onSubmit={(payload) => surgeryMutation.mutate(payload)}/>}</Modal>
  </div>;
}

function CaseTypeForm({ value, saving, error, onCancel, onSubmit }:{ value?:CaseType; saving:boolean; error:string; onCancel:()=>void; onSubmit:(payload:Record<string,unknown>)=>void }) {
  const [form, setForm] = useState({ ...emptyCase, ...(value || {}) });
  const submit = (event:FormEvent) => { event.preventDefault(); onSubmit({ name:form.name.trim(), code:form.code.trim(), nameHindi:form.nameHindi.trim(), description:form.description.trim(), requiresSurgeryDetails:form.requiresSurgeryDetails, requiresPhysioReview:form.requiresPhysioReview, displayOrder:Number(form.displayOrder), isActive:form.isActive }); };
  return <form onSubmit={submit} className="space-y-4 pt-4"><div className="grid gap-4 sm:grid-cols-2"><Field label="Name *"><input required value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} className={inputClass} placeholder="Post-Surgery Rehabilitation"/></Field><Field label="Code"><input value={form.code} onChange={(e)=>setForm({...form,code:e.target.value})} className={inputClass} placeholder="Auto-generated when blank"/></Field><Field label="Hindi name"><input value={form.nameHindi} onChange={(e)=>setForm({...form,nameHindi:e.target.value})} className={inputClass} placeholder="Optional"/></Field><Field label="Display order"><input type="number" min="0" value={form.displayOrder} onChange={(e)=>setForm({...form,displayOrder:Number(e.target.value)})} className={inputClass}/></Field></div><Field label="Description"><textarea rows={3} value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})} className={inputClass}/></Field><Check checked={form.requiresSurgeryDetails} onChange={(checked)=>setForm({...form,requiresSurgeryDetails:checked})} label="Requires body-region surgery details and surgery date"/><Check checked={form.requiresPhysioReview} onChange={(checked)=>setForm({...form,requiresPhysioReview:checked})} label="Physio review required before programme selection"/>{value && <Check checked={form.isActive} onChange={(checked)=>setForm({...form,isActive:checked})} label="Active"/>}{error && <ErrorText text={error}/>}<Actions saving={saving} onCancel={onCancel}/></form>;
}

function SurgeryTypeForm({ value, bodyRegions, saving, error, onCancel, onSubmit }:{ value?:SurgeryType; bodyRegions:BodyRegion[]; saving:boolean; error:string; onCancel:()=>void; onSubmit:(payload:Record<string,unknown>)=>void }) {
  const [form, setForm] = useState({ ...emptySurgery, ...(value ? { ...value, bodyRegion:value.bodyRegion?._id || '' } : {}) });
  const submit = (event:FormEvent) => { event.preventDefault(); onSubmit({ name:form.name.trim(), code:form.code.trim(), nameHindi:form.nameHindi.trim(), description:form.description.trim(), bodyRegion:form.bodyRegion, requiresPhysioReview:form.requiresPhysioReview, displayOrder:Number(form.displayOrder), isActive:form.isActive }); };
  return <form onSubmit={submit} className="space-y-4 pt-4"><div className="grid gap-4 sm:grid-cols-2"><Field label="Surgery name *"><input required value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} className={inputClass} placeholder="ACL Reconstruction"/></Field><Field label="Body region *"><select required value={form.bodyRegion} onChange={(e)=>setForm({...form,bodyRegion:e.target.value})} className={inputClass}><option value="">Select body region</option>{bodyRegions.map((region)=><option key={region._id} value={region._id}>{region.name}</option>)}</select></Field><Field label="Code"><input value={form.code} onChange={(e)=>setForm({...form,code:e.target.value})} className={inputClass} placeholder="Auto-generated when blank"/></Field><Field label="Display order"><input type="number" min="0" value={form.displayOrder} onChange={(e)=>setForm({...form,displayOrder:Number(e.target.value)})} className={inputClass}/></Field></div><Field label="Description"><textarea rows={3} value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})} className={inputClass}/></Field><Check checked={form.requiresPhysioReview} onChange={(checked)=>setForm({...form,requiresPhysioReview:checked})} label="Physio review required before programme selection"/>{value && <Check checked={form.isActive} onChange={(checked)=>setForm({...form,isActive:checked})} label="Active"/>}{error && <ErrorText text={error}/>}<Actions saving={saving} onCancel={onCancel}/></form>;
}

const inputClass = 'mt-1 min-h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100';
function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="block text-xs font-semibold text-neutral-600">{label}{children}</label>}
function Check({checked,onChange,label}:{checked:boolean;onChange:(value:boolean)=>void;label:string}){return <label className="flex items-start gap-3 rounded-lg border border-neutral-200 px-3 py-3"><input type="checkbox" checked={checked} onChange={(e)=>onChange(e.target.checked)} className="mt-0.5 h-4 w-4"/><span className="text-sm font-semibold text-neutral-700">{label}</span></label>}
function Actions({saving,onCancel}:{saving:boolean;onCancel:()=>void}){return <div className="flex justify-end gap-2 border-t border-neutral-100 pt-4"><button type="button" onClick={onCancel} className="rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-semibold">Cancel</button><button disabled={saving} className="rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving?'Saving…':'Save'}</button></div>}
function Summary({label,value,icon}:{label:string;value?:number;icon:React.ReactNode}){return <div className="rounded-xl border border-neutral-200 bg-white p-4"><div className="flex items-center justify-between"><span className="text-sm text-neutral-500">{label}</span><span className="text-neutral-400">{icon}</span></div><div className="mt-3 text-2xl font-bold text-neutral-950">{value ?? '—'}</div></div>}
function Status({active}:{active:boolean}){return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${active?'bg-emerald-50 text-emerald-700':'bg-neutral-100 text-neutral-600'}`}>{active?'Active':'Inactive'}</span>}
function Loading(){return <div className="p-6 text-sm text-neutral-500">Loading clinical pathways…</div>}
function Empty({text}:{text:string}){return <div className="p-8 text-center text-sm text-neutral-500">{text}</div>}
function ErrorText({text}:{text:string}){return <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{text}</div>}
function yesNo(value:boolean){return <span className={`text-xs font-semibold ${value?'text-emerald-700':'text-neutral-500'}`}>{value?'Yes':'No'}</span>}
function mutationMessage(error:unknown){const record=error as {response?:{data?:{message?:string}}};return record?.response?.data?.message||''}
