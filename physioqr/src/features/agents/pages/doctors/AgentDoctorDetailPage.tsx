import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarClock, CheckCircle2, MapPin, Stethoscope, UserCheck, Users } from 'lucide-react';
import apiClient from '@/lib/api-client';
import ErrorState from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';

type ApiRecord = Record<string, unknown>;

export default function AgentDoctorDetailPage() {
  const { doctorId } = useParams();
  const navigate = useNavigate();
  const query = useQuery({
    queryKey: ['agent-doctor', doctorId],
    enabled: Boolean(doctorId),
    queryFn: async () => (await apiClient.get(`/agents/me/doctors/${doctorId}`)).data,
  });

  if (query.isError) {
    return <ErrorState title="Doctor could not load" message="This doctor may not belong to your agent account, or the record is unavailable." onRetry={() => query.refetch()} />;
  }

  const payload = asRecord(query.data);
  const doctor = asRecord(payload.doctor);
  const performance = asRecord(payload.performance);
  const visits = Array.isArray(payload.recentVisits) ? payload.recentVisits as ApiRecord[] : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <button onClick={() => navigate('/agent/doctors')} className="inline-flex items-center gap-1 text-sm font-semibold text-neutral-600 hover:text-neutral-900"><ArrowLeft className="h-4 w-4" /> My Doctors</button>
          {query.isLoading ? <Skeleton className="mt-4 h-9 w-72" /> : <h1 className="mt-3 text-2xl font-bold text-neutral-900 sm:text-3xl">{text(doctor.fullName, 'Doctor')}</h1>}
          <p className="mt-1 text-sm text-neutral-500">{text(doctor.doctorId, '-')} {text(doctor.clinicName) ? `• ${text(doctor.clinicName)}` : ''}</p>
        </div>
        {!query.isLoading && <Status value={text(doctor.status, 'draft')} />}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={Stethoscope} label="Approval status" value={labelize(doctor.status)} loading={query.isLoading} />
        <Metric icon={CheckCircle2} label="QR status" value={doctor.qrCodeActive ? 'Active' : 'Not active'} loading={query.isLoading} />
        <Metric icon={Users} label="Patient registrations" value={number(performance.patientRegistrations)} loading={query.isLoading} />
        <Metric icon={UserCheck} label="Paid patients" value={number(performance.paidPatients)} loading={query.isLoading} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="font-bold text-neutral-900">Doctor & Clinic</h2>
          {query.isLoading ? <Skeleton className="mt-4 h-64 w-full" /> : (
            <div className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2">
              <Info label="Mobile" value={doctor.mobile} />
              <Info label="Email" value={doctor.email} />
              <Info label="Qualification" value={doctor.qualification} />
              <Info label="Specialization" value={doctor.specialization} />
              <Info label="Medical registration" value={doctor.medicalRegNumber} />
              <Info label="Registration council" value={doctor.registrationCouncil} />
              <Info label="Experience" value={doctor.yearsOfExperience !== undefined ? `${doctor.yearsOfExperience} years` : undefined} />
              <Info label="KYC status" value={labelize(doctor.kycStatus)} />
              <Info label="Clinic" value={doctor.clinicName} />
              <Info label="Clinic contact" value={doctor.clinicContact} />
              <Info label="City / State" value={[text(doctor.city), text(doctor.state)].filter(Boolean).join(', ')} />
              <Info label="Clinic address" value={doctor.clinicAddress} />
              <Info label="Working hours" value={doctor.clinicWorkingHours} />
              <Info label="Approval date" value={dateText(doctor.approvalDate)} />
            </div>
          )}
          {text(doctor.googleMapsLink) && <a href={text(doctor.googleMapsLink)} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary-700"><MapPin className="h-4 w-4" /> Open clinic location</a>}
        </section>

        <aside className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3"><h2 className="font-bold text-neutral-900">Recent Visits</h2><Link to="/agent/clinic-visits" className="text-xs font-semibold text-primary-700">All visits</Link></div>
          <div className="mt-4 space-y-3">
            {query.isLoading && <Skeleton className="h-32 w-full" />}
            {!query.isLoading && visits.length === 0 && <div className="rounded-lg bg-neutral-50 p-4 text-sm text-neutral-500">No clinic visits recorded for this doctor.</div>}
            {visits.map((visit) => <div key={text(visit._id || visit.id)} className="rounded-lg border border-neutral-200 p-3"><div className="flex gap-2"><CalendarClock className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary-600" /><div className="min-w-0"><p className="text-sm font-semibold text-neutral-900">{dateText(visit.visitDate)} {text(visit.visitTime)}</p><p className="mt-1 text-xs text-neutral-500">{labelize(visit.outcome)}</p>{text(visit.nextAction) && <p className="mt-1 text-xs text-neutral-600">Next: {text(visit.nextAction)}</p>}</div></div></div>)}
          </div>
        </aside>
      </div>

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        This Agent view intentionally excludes doctor banking, fee-share, payout, and confidential patient medical information.
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value, loading }: { icon: React.ElementType; label: string; value: string | number; loading: boolean }) { return <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"><Icon className="h-5 w-5 text-primary-600" />{loading ? <Skeleton className="mt-3 h-7 w-24" /> : <p className="mt-3 text-xl font-bold text-neutral-900">{value}</p>}<p className="mt-1 text-xs text-neutral-500">{label}</p></div>; }
function Info({ label, value }: { label: string; value: unknown }) { return <div><p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{label}</p><p className="mt-1 text-sm font-medium text-neutral-800">{text(value, '-')}</p></div>; }
function Status({ value }: { value: string }) { const positive = value === 'approved'; const warning = ['submitted', 'under_review', 'documents_required'].includes(value); return <span className={`rounded-full px-3 py-1.5 text-xs font-bold capitalize ${positive ? 'bg-emerald-50 text-emerald-700' : warning ? 'bg-amber-50 text-amber-700' : 'bg-neutral-100 text-neutral-700'}`}>{labelize(value)}</span>; }
function asRecord(value: unknown): ApiRecord { return value && typeof value === 'object' ? value as ApiRecord : {}; }
function text(value: unknown, fallback = '') { return value === undefined || value === null || value === '' ? fallback : String(value); }
function number(value: unknown) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }
function labelize(value: unknown) { return text(value, '-').replace(/_/g, ' '); }
function dateText(value: unknown) { if (!value) return '-'; const date = new Date(String(value)); return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
