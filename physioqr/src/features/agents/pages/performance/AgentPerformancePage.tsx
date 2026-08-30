import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, BadgeCheck, Building2, IndianRupee, Stethoscope, Target, Users } from 'lucide-react';
import apiClient from '@/lib/api-client';
import ErrorState from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatCurrency } from '@/lib/formatters';

type R = Record<string, unknown>;
export default function AgentPerformancePage() {
  const query = useQuery({ queryKey: ['agent-performance'], queryFn: async () => (await apiClient.get('/agents/me/performance')).data });
  if (query.isError) return <ErrorState title="Performance could not load" message="Live agent analytics are temporarily unavailable." onRetry={() => query.refetch()} />;
  const data = rec(query.data); const s = rec(data.summary); const target = rec(data.target); const months = arr(data.monthlyDoctors);
  return <div className="space-y-6">
    <header><p className="text-xs font-semibold uppercase tracking-[.18em] text-primary-600">Performance</p><h1 className="mt-1 text-2xl font-bold text-neutral-900">Field Performance</h1><p className="mt-1 text-sm text-neutral-500">Live onboarding, visit and referral outcomes from your assigned doctors.</p></header>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card loading={query.isLoading} icon={Stethoscope} label="Doctors Onboarded" value={num(s.totalDoctors)} helper={`${num(s.approvedDoctors)} approved`} />
      <Card loading={query.isLoading} icon={Building2} label="Clinic Visits" value={num(s.clinicVisits)} helper={`${num(s.followUpCompletionPercent)}% follow-up completion`} />
      <Card loading={query.isLoading} icon={Users} label="Patients Generated" value={num(s.patientRegistrations)} helper={`${num(s.paidPatients)} paid patients`} />
      <Card loading={query.isLoading} icon={IndianRupee} label="Net Revenue" value={formatCurrency(num(s.netRevenue))} helper="Verified collections after refunds" />
    </section>
    <section className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm"><div className="flex items-center gap-2"><Target className="h-5 w-5 text-primary-600"/><h2 className="font-bold">Monthly Target</h2></div>{query.isLoading?<Skeleton className="mt-5 h-24"/>: target.monthlyTarget == null ? <div className="mt-5 rounded-lg border border-dashed p-4 text-sm text-neutral-600">Admin has not configured a monthly target. This month: <b>{num(target.achieved)}</b> doctors onboarded.</div>:<div className="mt-5"><div className="flex justify-between"><div><b className="text-3xl">{num(target.achieved)}</b><span className="text-sm text-neutral-500"> / {num(target.monthlyTarget)}</span></div><b className="text-primary-700">{num(target.achievementPercent)}%</b></div><div className="mt-3 h-2.5 rounded-full bg-neutral-100 overflow-hidden"><div className="h-full bg-primary-600 rounded-full" style={{width:`${Math.min(num(target.achievementPercent),100)}%`}}/></div></div>}</div>
      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm"><h2 className="font-bold">Conversion Quality</h2><div className="mt-5 grid grid-cols-2 gap-4"><Quality icon={BadgeCheck} label="Doctor approval" value={`${num(s.approvalConversionPercent)}%`}/><Quality icon={Activity} label="Follow-up completion" value={`${num(s.followUpCompletionPercent)}%`}/></div></div>
    </section>
    <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm"><h2 className="font-bold">6-Month Onboarding Trend</h2><p className="mt-1 text-xs text-neutral-500">Actual doctor registrations grouped by month.</p><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{query.isLoading?<Skeleton className="h-24 sm:col-span-2"/>:months.length?months.map((m,i)=>{const id=rec(m._id);return <div key={i} className="rounded-lg border border-neutral-200 bg-neutral-50 p-4"><p className="text-xs text-neutral-500">{monthName(num(id.month))} {num(id.year)}</p><p className="mt-1 text-2xl font-bold">{num(m.count)}</p><p className="text-xs text-emerald-700">{num(m.approved)} approved</p></div>}):<p className="text-sm text-neutral-500">No onboarding activity in this period.</p>}</div></section>
  </div>;
}
function Card({loading,icon:Icon,label,value,helper}:{loading:boolean;icon:React.ElementType;label:string;value:string|number;helper:string}){return <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm"><div className="flex justify-between"><div><p className="text-sm text-neutral-500">{label}</p>{loading?<Skeleton className="mt-2 h-8 w-20"/>:<p className="mt-2 text-2xl font-bold">{value}</p>}</div><span className="h-fit rounded-lg bg-primary-50 p-2 text-primary-700"><Icon className="h-5 w-5"/></span></div><p className="mt-3 text-xs text-neutral-500">{helper}</p></div>}
function Quality({icon:Icon,label,value}:{icon:React.ElementType;label:string;value:string}){return <div className="rounded-lg bg-neutral-50 p-4"><Icon className="h-5 w-5 text-primary-600"/><p className="mt-3 text-2xl font-bold">{value}</p><p className="text-xs text-neutral-500">{label}</p></div>}
function rec(v:unknown):R{return v&&typeof v==='object'?v as R:{}} function arr(v:unknown):R[]{return Array.isArray(v)?v.filter(x=>x&&typeof x==='object') as R[]:[]} function num(v:unknown){const n=Number(v);return Number.isFinite(n)?n:0} function monthName(m:number){return ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m]||'-'}
