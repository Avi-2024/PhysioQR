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
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { revenueModel: 'split', preferredProgram: '' },
  });

  const payload = record(doctorQuery.data);
  const doctor = record(payload.doctor);
  const preferredProgram = record(doctor.preferredProgram);

  useEffect(() => {
    if (!doctor._id) return;
    reset({
      fullName: text(doctor.fullName),
      mobile: text(doctor.mobile),
      qualification: text(doctor.qualification),
      specialization: text(doctor.specialization),
      medicalRegNumber: text(doctor.medicalRegNumber),
      clinicName: text(doctor.clinicName),
      city: text(doctor.city),
      preferredProgram: text(preferredProgram._id),
      revenueModel: text(doctor.revenueModel) === 'platform_fee' ? 'platform_fee' : 'split',
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
    preferredProgram._id,
    reset,
  ]);

  const mutation = useMutation({
    mutationFn: async (data: FormData) => apiClient.patch(`/agents/me/doctors/${doctorId}`, data),
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
        <button
          type="button"
          onClick={() => navigate(`/agent/doctors/${doctorId}`)}
          className="rounded-lg border border-neutral-300 p-2"
          aria-label="Go back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Edit Doctor</h1>
          <p className="text-sm text-neutral-500">Update the same essential details used during doctor registration.</p>
        </div>
      </div>

      {doctorQuery.isLoading ? (
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-7">
          <Skeleton className="h-96 w-full" />
        </div>
      ) : (
        <form
          onSubmit={handleSubmit((data) => mutation.mutate(data))}
          className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-7"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Doctor Full Name" required error={errors.fullName?.message}>
              <input {...register('fullName')} className={inputClass} placeholder="Doctor name" />
            </Field>
            <Field label="Mobile Number" required error={errors.mobile?.message}>
              <input {...register('mobile')} inputMode="numeric" className={inputClass} placeholder="10-digit mobile" />
            </Field>
            <Field label="Qualification" required error={errors.qualification?.message}>
              <input {...register('qualification')} className={inputClass} placeholder="e.g. BPT, MPT" />
            </Field>
            <Field label="Specialization" required error={errors.specialization?.message}>
              <input {...register('specialization')} className={inputClass} placeholder="e.g. Orthopaedic Physio" />
            </Field>
            <Field label="Medical Registration Number" required error={errors.medicalRegNumber?.message}>
              <input {...register('medicalRegNumber')} className={inputClass} />
            </Field>
            <Field label="Clinic Name" required error={errors.clinicName?.message}>
              <input {...register('clinicName')} className={inputClass} />
            </Field>
            <Field label="City" required error={errors.city?.message}>
              <input {...register('city')} className={inputClass} />
            </Field>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Rehab Program" required error={errors.preferredProgram?.message}>
              <select
                {...register('preferredProgram')}
                className={inputClass}
                disabled={programsQuery.isLoading || programs.length === 0}
              >
                <option value="">
                  {programsQuery.isLoading
                    ? 'Loading rehab programs...'
                    : programs.length
                      ? 'Select rehab program'
                      : 'No active rehab programs available'}
                </option>
                {programs.map((program) => (
                  <option key={program._id} value={program._id}>
                    {program.name}{program.durationDays ? ` – ${program.durationDays} Days` : ''}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Payment Model" required error={errors.revenueModel?.message}>
              <select {...register('revenueModel')} className={inputClass}>
                <option value="split">Split Model</option>
                <option value="platform_fee">Platform Fee</option>
              </select>
            </Field>
          </div>

          <p className="mt-4 text-xs leading-5 text-neutral-500">
            Detailed pricing, fee-share, bank and payout settings remain Admin-controlled.
          </p>

          {programsQuery.isError && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-medium text-amber-800">
              Active rehab programs could not load. Please retry before saving.
            </div>
          )}
          {mutation.error && (
            <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
              {errorMessage(mutation.error)}
            </div>
          )}

          <button
            type="submit"
            disabled={mutation.isPending || programsQuery.isLoading || programs.length === 0}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 py-3 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {mutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      )}
    </div>
  );
}

const inputClass = 'min-h-11 w-full rounded-lg border border-neutral-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-500';

function Field({
  label,
  error,
  required,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-neutral-700">
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </span>
      {children}
      {error && <p className="mt-1 text-xs font-medium text-rose-600">{error}</p>}
    </label>
  );
}

function record(value: unknown): ApiRecord {
  return value && typeof value === 'object' ? value as ApiRecord : {};
}

function text(value: unknown, fallback = '') {
  return value === undefined || value === null || value === '' ? fallback : String(value);
}

function errorMessage(error: unknown) {
  if (error && typeof error === 'object') {
    const response = (error as { response?: { data?: { message?: unknown } } }).response;
    const message = response?.data?.message || (error as { message?: unknown }).message;
    if (message) return String(message);
  }
  return 'Unable to update doctor.';
}
