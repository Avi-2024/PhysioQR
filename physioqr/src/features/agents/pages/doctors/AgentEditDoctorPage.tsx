import { useEffect, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import apiClient from '@/lib/api-client';
import ErrorState from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';

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
  requestedFeeShareType: z.enum(['percentage', 'fixed']).optional(),
  requestedFeeSharePercentage: optionalNumber(0, 100),
  requestedFixedFeeShareAmount: optionalNumber(0, 100000),
}).superRefine((data, ctx) => {
  if (data.revenueModel !== 'split') return;

  if (!data.requestedFeeShareType) {
    ctx.addIssue({ code: 'custom', path: ['requestedFeeShareType'], message: 'Select doctor commission type' });
    return;
  }

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
type ApiRecord = Record<string, unknown>;
type ProgramOption = {
  _id: string;
  name: string;
  durationDays?: number;
};

export default function AgentEditDoctorPage() {
  const { doctorId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const doctorQuery = useQuery({
    queryKey: ['agent-doctor', doctorId],
    enabled: Boolean(doctorId),
    queryFn: async () => (await apiClient.get(`/agents/me/doctors/${doctorId}`)).data,
  });

  const programsQuery = useQuery<ProgramOption[]>({
    queryKey: ['agent-registration-programs'],
    queryFn: async () => {
      const response = await apiClient.get('/programs');
      return Array.isArray(response.data) ? response.data : [];
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      revenueModel: 'split',
      preferredProgram: '',
      requestedFeeShareType: 'percentage',
    },
  });

  const revenueModel = watch('revenueModel');
  const commissionType = watch('requestedFeeShareType');
  const payload = record(doctorQuery.data);
  const doctor = record(payload.doctor);
  const preferredProgram = record(doctor.preferredProgram);

  useEffect(() => {
    if (!doctor._id) return;
    const currentRevenueModel = text(doctor.revenueModel) === 'platform_fee' ? 'platform_fee' : 'split';
    const feeShareType = currentRevenueModel === 'split' && text(doctor.requestedFeeShareType || doctor.feeShareType) === 'fixed'
      ? 'fixed'
      : 'percentage';

    reset({
      fullName: text(doctor.fullName),
      mobile: text(doctor.mobile),
      qualification: text(doctor.qualification),
      specialization: text(doctor.specialization),
      medicalRegNumber: text(doctor.medicalRegNumber),
      clinicName: text(doctor.clinicName),
      city: text(doctor.city),
      preferredProgram: text(preferredProgram._id),
      revenueModel: currentRevenueModel,
      requestedPatientFee: numberValue(doctor.requestedPatientFee ?? doctor.approvedPatientFee),
      requestedFeeShareType: feeShareType,
      requestedFeeSharePercentage: currentRevenueModel === 'split' && feeShareType === 'percentage'
        ? optionalNumberValue(doctor.requestedFeeSharePercentage ?? doctor.feeSharePercentage)
        : undefined,
      requestedFixedFeeShareAmount: currentRevenueModel === 'split' && feeShareType === 'fixed'
        ? optionalNumberValue(doctor.requestedFixedFeeShareAmount ?? doctor.fixedFeeShareAmount)
        : undefined,
    });
  }, [
    doctor._id,
    doctor.fullName,
    doctor.mobile,
    doctor.qualification,
    doctor.specialization,
    doctor.medicalRegNumber,
    doctor.clinicName,
    doctor.city,
    doctor.revenueModel,
    doctor.requestedPatientFee,
    doctor.approvedPatientFee,
    doctor.requestedFeeShareType,
    doctor.feeShareType,
    doctor.requestedFeeSharePercentage,
    doctor.feeSharePercentage,
    doctor.requestedFixedFeeShareAmount,
    doctor.fixedFeeShareAmount,
    preferredProgram._id,
    reset,
  ]);

  const mutation = useMutation({
    mutationFn: async (data: FormData) => apiClient.patch(`/agents/me/doctors/${doctorId}`, clean(data)),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['agent-doctor', doctorId] }),
        queryClient.invalidateQueries({ queryKey: ['agent-doctors'] }),
        queryClient.invalidateQueries({ queryKey: ['agent-dashboard'] }),
      ]);
      navigate(`/agent/doctors/${doctorId}`, { replace: true });
    },
  });

  if (doctorQuery.isError) {
    return (
      <ErrorState
        title="Doctor could not load"
        message="This doctor may not belong to your agent account, or the record is unavailable."
        onRetry={() => doctorQuery.refetch()}
      />
    );
  }

  const programs = programsQuery.data || [];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => navigate(`/agent/doctors/${doctorId}`)} className="rounded-lg border border-neutral-300 p-2" aria-label="Go back">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Edit Doctor</h1>
          <p className="text-sm text-neutral-500">Update the same doctor profile, rehab program and payment setup used during registration.</p>
        </div>
      </div>

      {doctorQuery.isLoading ? (
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-7">
          <Skeleton className="h-96 w-full" />
        </div>
      ) : (
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
            <p className="mt-1 text-xs text-neutral-500">Update the payment model and patient price. Doctor commission applies only to Split Model.</p>
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

            {revenueModel === 'split' && (
              <>
                <Field label="Doctor Commission Type" required error={errors.requestedFeeShareType?.message}>
                  <select {...register('requestedFeeShareType')} className={inputClass}>
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (₹)</option>
                  </select>
                </Field>
                {commissionType === 'fixed' ? (
                  <Field label="Doctor Commission (₹)" required error={errors.requestedFixedFeeShareAmount?.message}>
                    <input {...register('requestedFixedFeeShareAmount')} type="number" min="0" max="100000" step="1" className={inputClass} placeholder="e.g. 500" />
                  </Field>
                ) : (
                  <Field label="Doctor Commission (%)" required error={errors.requestedFeeSharePercentage?.message}>
                    <input {...register('requestedFeeSharePercentage')} type="number" min="0" max="100" step="0.01" className={inputClass} placeholder="e.g. 60" />
                  </Field>
                )}
              </>
            )}
          </div>

          {revenueModel === 'platform_fee' && (
            <p className="mt-3 text-xs leading-5 text-neutral-500">Platform Fee: the verified patient payment belongs to PhysioQR, so no Doctor commission is created.</p>
          )}

          <p className="mt-4 text-xs leading-5 text-neutral-500">Commercial terms cannot be changed by Agent after a verified patient payment. Admin can manage them after that point.</p>

          {programsQuery.isError && <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-medium text-amber-800">Active rehab programs could not load. Please retry before saving.</div>}
          {mutation.error && <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">{errorMessage(mutation.error)}</div>}

          <button type="submit" disabled={mutation.isPending || programsQuery.isLoading || programs.length === 0} className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 py-3 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60">
            <Save className="h-4 w-4" />
            {mutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      )}
    </div>
  );
}

const inputClass = 'min-h-11 w-full rounded-lg border border-neutral-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-500';

function Field({ label, error, required, children }: { label: string; error?: string; required?: boolean; children: ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-sm font-semibold text-neutral-700">{label}{required && <span className="ml-0.5 text-rose-500">*</span>}</span>{children}{error && <p className="mt-1 text-xs font-medium text-rose-600">{error}</p>}</label>;
}

function clean(data: FormData) {
  const cleaned = { ...data } as Record<string, unknown>;
  if (data.revenueModel === 'platform_fee') {
    delete cleaned.requestedFeeShareType;
    delete cleaned.requestedFeeSharePercentage;
    delete cleaned.requestedFixedFeeShareAmount;
  } else if (data.requestedFeeShareType === 'percentage') {
    delete cleaned.requestedFixedFeeShareAmount;
  } else if (data.requestedFeeShareType === 'fixed') {
    delete cleaned.requestedFeeSharePercentage;
  }
  return Object.fromEntries(Object.entries(cleaned).filter(([, value]) => value !== '' && value !== undefined && value !== null));
}

function record(value: unknown): ApiRecord {
  return value && typeof value === 'object' ? value as ApiRecord : {};
}

function text(value: unknown, fallback = '') {
  return value === undefined || value === null || value === '' ? fallback : String(value);
}

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function optionalNumberValue(value: unknown) {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function errorMessage(error: unknown) {
  if (error && typeof error === 'object') {
    const response = (error as { response?: { data?: { message?: unknown } } }).response;
    const message = response?.data?.message || (error as { message?: unknown }).message;
    if (message) return String(message);
  }
  return 'Unable to update doctor.';
}
