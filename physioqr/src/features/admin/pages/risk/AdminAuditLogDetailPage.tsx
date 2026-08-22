import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import apiClient from '@/lib/api-client';
import ErrorState from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';

type AuditLog={_id:string;action:string;module?:string;recordId?:string;previousValue?:unknown;newValue?:unknown;reason?:string;ipAddress?:string;deviceInfo?:string;requestId?:string;method?:string;path?:string;statusCode?:number;metadata?:unknown;userRole?:string;createdAt:string;performedBy?:{email?:string;mobile?:string;role?:string;status?:string}};

export default function AdminAuditLogDetailPage(){
  const {auditLogId}=useParams(); const nav=useNavigate();
  const q=useQuery<AuditLog>({queryKey:['admin-audit-log',auditLogId],enabled:Boolean(auditLogId),queryFn:()=>apiClient.get(`/admin/audit-logs/${auditLogId}`).then(r=>r.data)});
  if(q.isLoading)return <div className="space-y-4">{Array.from({length:6}).map((_,i)=><Skeleton key={i} className="h-24"/>)}</div>;
  if(q.isError||!q.data)return <ErrorState title="Audit log could not load" message="The record may not exist or the API request failed." onRetry={()=>q.refetch()}/>;
  const x=q.data;
  return <div className="space-y-6"><button onClick={()=>nav('/admin/audit-logs')} className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-600"><ArrowLeft className="h-4 w-4"/>Audit logs</button>
  <header className="rounded-xl border bg-white p-5"><div className="flex items-start gap-3"><div className="rounded-lg bg-primary-50 p-2"><ShieldCheck className="h-5 w-5 text-primary-700"/></div><div><p className="text-xs font-bold uppercase tracking-[.16em] text-primary-700">Immutable record</p><h1 className="mt-1 text-2xl font-bold">{x.action.replace(/_/g,' ')}</h1><p className="mt-1 text-sm text-neutral-500">{x.module||'System'} · {x.recordId||x._id}</p></div></div></header>
  <section className="grid gap-4 lg:grid-cols-2"><Card title="Actor & request"><Rows rows={[["Actor",x.performedBy?.email||x.performedBy?.mobile||'System'],['Role',x.userRole||x.performedBy?.role||'system'],['Method',x.method||'—'],['Path',x.path||'—'],['Status code',x.statusCode??'—'],['Request ID',x.requestId||'—'],['IP address',x.ipAddress||'—'],['Device',x.deviceInfo||'—'],['Created',new Date(x.createdAt).toLocaleString()]]}/></Card><Card title="Change context"><Rows rows={[["Module",x.module||'—'],['Record ID',x.recordId||'—'],['Reason',x.reason||'—']]}/></Card></section>
  <section className="grid gap-4 xl:grid-cols-2"><JsonCard title="Previous value" value={x.previousValue}/><JsonCard title="New value" value={x.newValue}/></section><JsonCard title="Metadata" value={x.metadata}/></div>}

function Card({title,children}:{title:string;children:React.ReactNode}){return <div className="rounded-xl border bg-white p-5"><h2 className="text-base font-bold">{title}</h2><div className="mt-4">{children}</div></div>}
function Rows({rows}:{rows:[string,unknown][]}){return <dl className="divide-y">{rows.map(([k,v])=><div key={k} className="grid grid-cols-[130px_1fr] gap-4 py-3 text-sm"><dt className="text-neutral-500">{k}</dt><dd className="break-all font-medium">{String(v)}</dd></div>)}</dl>}
function JsonCard({title,value}:{title:string;value:unknown}){return <Card title={title}>{value===undefined||value===null?<p className="text-sm text-neutral-500">No value recorded.</p>:<pre className="max-h-[440px] overflow-auto rounded-lg bg-neutral-950 p-4 text-xs leading-6 text-neutral-100">{JSON.stringify(value,null,2)}</pre>}</Card>}
