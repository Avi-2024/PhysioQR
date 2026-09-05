import { useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Copy, Stethoscope } from 'lucide-react';
import apiClient from '@/lib/api-client';

const optionalNumber = (min: number, max: number) => z.preprocess(
  (value) => value === '' || value === undefined || value === null ? undefined : Number(value),
  z.number().min(min).max(max).optional(),
);

const schema = z.object({
  fullName: z.string().min(2, 'Enter doctor full name'),
  mobile: z.string().regex(/^[6-9]\d{9}$/, 'Enter valid 10-digit mobile number'),
  qualification: z.string().min(2, 'Qualification required'),
  specialization: z.string().min(2, 'Specialization required'),
  medicalRegNumber: z.string().min(2, 'Medical registration number required'),
  clinicName: z.string().min(2, 'Clinic name required'),
  city: z.string().min(2, 'City required'),
  preferredProgram: z.string().min(1, 'Select a rehab program'),
  revenueModel: z.enum(['split', 'platform_fee']),
  requestedPatientFee: z.coerce.number().min(1, 'Enter the patient price').max(100000, 'Price is too high'),
  requestedFeeShareType: z.enum(['percentage', 'fixed']),
  requestedFeeSharePercentage: optionalNumber(0, 100),
  requestedFixedFeeShareAmount: optionalNumber(0, 100000),
}).superRefine((data, ctx) => {
  if (data.requestedFeeShareType === 'percentage' && data.requestedFeeSharePercentage === undefined) {
    ctx.addIssue({ code: 'custom', path: ['requestedFeeSharePercentage'], message: 'Enter commission percentage' });
  }
  if (data.requestedFeeShareType === 'fixed') {
    if (data.requestedFixedFeeShareAmount === undefined) {
      ctx.addIssue({ code: 'custom', path: ['requestedFixedFeeShareAmount'], message: 'Enter fixed commission' });
    } else if (data.requestedFixedFeeShareAmount > data.requestedPatientFee) {
      ctx.addIssue({ code: 'custom', path: ['requestedFixedFeeShareAmount'], message: 'Commission cannot exceed patient price' });
    }
  }
});

type FormData = z.infer<typeof schema>;
type ProgramOption = {
  _id: string;
  programCode?: string;
  name: string;
  durationDays?: number;
  painCategory?: { name?: string } | null;
};
type CreatedDoctor = {
  _id: string;
  doctorId?: string;
  fullName?: string;
  mobile?: string;
  temporaryPassword?: string;
  status?: string;
};

export default function AgentRegisterDoctorPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [createdDoctor, setCreatedDoctor] = useState<CreatedDoctor | null>(null);
  const [copied, setCopied] = useState(false);

  const programsQuery = useQuery<ProgramOption[]>({
    queryKey: ['agent-registration-programs'],
    queryFn: async () => {
      const response = await apiClient.get('/programs');
      return Array.isArray(response.data) ? response.data : [];
    },
  });

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      revenueModel: 'split',
      preferredProgram: '',
      requestedFeeShareType: 'percentage',
    },
  });

  const commissionType = watch('requestedFeeShareType');
  const mutation = useMutation({
    mutationFn: async (data: FormData) => apiClient.post('/doctors', clean(data)),
    onSuccess: async (response) => {
      setCreatedDoctor(response.data as CreatedDoctor);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['agent-doctors'] }),
        queryClient.invalidateQueries({ queryKey: ['agent-dashboard'] }),
      ]);
    },
  });

  const programs = programsQuery.data || [];

  if (createdDoctor) {
    const copyPassword = async () => {
      if (!createdDoctor.temporaryPassword) return;
      await navigator.clipboard.writeText(createdDoctor.temporaryPassword);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    };

    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <div className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"><CheckCircle className="h-6 w-6" /></div>
          <h1 className="mt-4 text-2xl font-bold text-neutral-950">Doctor registered & approved</h1>
          <p className="mt-2 text-sm text-neutral-600">The doctor is active immediately. Admin can review or change the doctor status and commercial settings later.</p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Info label="Doctor" value={createdDoctor.fullName || '—'} />
            <Info label="Doctor ID" value={createdDoctor.doctorId || '—'} />
            <Info label="Login mobile" value={createdDoctor.mobile || '—'} />
            <Info label="Status" value="Approved" />
          </div>

          {createdDoctor.temporaryPassword && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="text-xs font-bold uppercase tracking-wide text-amber-700">Doctor temporary password</div>
              <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <code className="break-all text-base font-bold text-amber-950">{createdDoctor.temporaryPassword}</code>
                <button type="button" onClick={copyPassword} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-amber-300 bg-white px-3 text-sm font-semibold text-amber-800 hover:bg-amber-100"><Copy className="h-4 w-4" />{copied ? 'Copied' : 'Copy password'}</button>
              </div>
              <p className="mt-2 text-xs text-amber-800">Share this securely. On first login, the doctor must create a new password.</p>
            </div>
          )}

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => { setCreatedDoctor(null); reset(); }} className="min-h-11 rounded-lg border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-700">Register another</button>
            <button type="button" onClick={() => navigate(`/agent/doctors/${createdDoctor._id}`)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white"><Stethoscope className="h-4 w-4" />View doctor</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => navigate(-1)} className="rounded-lg border border-neutral-300 p-2" aria-label="Go back"><ArrowLeft className="h-4 w-4" /></button>
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Register New Doctor</h1>
          <p className="text-sm text-neutral-500">Add the doctor profile, rehab program and payment setup.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Doctor Full Name" required error={errors.fullName?.message}><input {...register('fullName')} className={inputClass} placeholder="Doctor name" /></Field>
          <Field label="Mobile Number" required error={errors.mobile?.message}><input {...register('mobile')} inputMode="numeric" className={inputClass} placeholder="10-digit mobile" /></Field>
          <Field label="Qualification" required error={errors.qualification?.message}><input {...register('qualification')} className={inputClass} placeholder="e.g. BPT, MPT" /></Field>
          <Field label="Specialization" required error={errors.specialization?.message}><input {...register('specialization')} className={inputClass} placeholder="e.g. Orthopaedic Physio" /></Field>
          <Field label="Medical Registration Number" required error={errors.medicalRegNumber?.message}><input {...register('medicalRegNumber')} className={inputClass} /></Field>
          <Field label="Clinic Name" required error={errors.clinicName?.message}><input {...register('clinicName')} className={inputClass} /></Field>
          <Field label="City" required error={errors.city?.message}><input {...register('city')} className={inputClass} /></Field>
          <Field label="Rehab Program" required error={errors.preferredProgram?.message}>
            <select {...register('preferredProgram')} className={inputClass} disabled={programsQuery.isLoading || programs.length === 0}>
              <option value="">{programsQuery.isLoading ? 'Loading rehab programs...' : programs.length ? 'Select rehab program' : 'No active rehab programs available'}</option>
              {programs.map((program) => (
                <option key={program._id} value={program._id}>
                  {program.name}{program.durationDays ? ` – ${program.durationDays} Days` : ''}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="my-6 border-t border-neutral-200" />
        <div>
          <h2 className="text-base font-bold text-neutral-900">Payment Setup</h2>
          <p className="mt-1 text-xs text-neutral-500">Set the doctor payment model, patient price and commission.</p>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Payment Model" required error={errors.revenueModel?.message}>
            <select {...register('revenueModel')} className={inputClass}>
              <option value="split">Split Model</option>
              <option value="platform_fee">Platform Fee</option>
            </select>
          </Field>
          <Field label="Patient Price (₹)" required error={errors.requestedPatientFee?.message}>
            <input {...register('requestedPatientFee')} type="number" min="1" max="100000" step="1" className={inputClass} placeholder="e.g. 999" />
          </Field>
          <Field label="Doctor Commission Type" required error={errors.requestedFeeShareType?.message}>
            <select {...register('requestedFeeShareType')} className={inputClass}>
              <option value="percentage">Percentage (%)</option>
              <option value="fixed">Fixed Amount (₹)</option>
            </select>
          </Field>
          {commissionType === 'percentage' ? (
            <Field label="Doctor Commission (%)" required error={errors.requestedFeeSharePercentage?.message}>
              <input {...register('requestedFeeSharePercentage')} type="number" min="0" max="100" step="0.01" className={inputClass} placeholder="e.g. 60" />
            </Field>
          ) : (
            <Field label="Doctor Commission (₹)" required error={errors.requestedFixedFeeShareAmount?.message}>
              <input {...register('requestedFixedFeeShareAmount')} type="number" min="0" max="100000" step="1" className={inputClass} placeholder="e.g. 500" />
            </Field>
          )}
        </div>

        {programsQuery.isError && <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-medium text-amber-800">Active rehab programs could not load. Please retry before registering the doctor.</div>}
        {mutation.error && <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">{errorMessage(mutation.error)}</div>}

        <button type="submit" disabled={mutation.isPending || programsQuery.isLoading || programs.length === 0} className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 py-3 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"><CheckCircle className="h-4 w-4" />{mutation.isPending ? 'Registering...' : 'Register Doctor'}</button>
      </form>
    </div>
  );
}

const inputClass = 'min-h-11 w-full rounded-lg border border-neutral-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-500';
function Field({ label, error, required, children }: { label: string; error?: string; required?: boolean; children: ReactNode }) { return <label className="block"><span className="mb-1.5 block text-sm font-semibold text-neutral-700">{label}{required && <span className="ml-0.5 text-rose-500">*</span>}</span>{children}{error && <p className="mt-1 text-xs font-medium text-rose-600">{error}</p>}</label>; }
function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3"><div className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{label}</div><div className="mt-1 text-sm font-semibold text-neutral-900">{value}</div></div>; }
function clean(data: FormData) { const payload = { ...data } as Record<string, unknown>; if (data.requestedFeeShareType === 'percentage') delete payload.requestedFixedFeeShareAmount; if (data.requestedFeeShareType === 'fixed') delete payload.requestedFeeSharePercentage; return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== '' && value !== undefined && value !== null)); }
function errorMessage(error: unknown) { if (error && typeof error === 'object') { const response = (error as { response?: { data?: { message?: unknown } } }).response; const message = response?.data?.message || (error as { message?: unknown }).message; if (message) return String(message); } return 'Unable to register doctor.'; }
