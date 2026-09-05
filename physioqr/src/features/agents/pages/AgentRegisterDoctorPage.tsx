import type { ReactNode } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import apiClient from '@/lib/api-client';

const schema = z.object({
  fullName: z.string().min(2, 'Enter doctor full name'),
  mobile: z.string().regex(/^[6-9]\d{9}$/, 'Enter valid 10-digit mobile number'),
  qualification: z.string().min(2, 'Qualification required'),
  specialization: z.string().min(2, 'Specialization required'),
  medicalRegNumber: z.string().min(2, 'Medical registration number required'),
  clinicName: z.string().min(2, 'Clinic name required'),
  city: z.string().min(2, 'City required'),
});

type FormData = z.infer<typeof schema>;

export default function AgentRegisterDoctorPage() {
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });
  const mutation = useMutation({
    mutationFn: async (data: FormData) => apiClient.post('/doctors', data),
    onSuccess: (response) => {
      const id = String(response.data?._id || '');
      navigate(id ? `/agent/doctors/${id}` : '/agent/doctors');
    },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => navigate(-1)} className="rounded-lg border border-neutral-300 p-2" aria-label="Go back"><ArrowLeft className="h-4 w-4" /></button>
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Register New Doctor</h1>
          <p className="text-sm text-neutral-500">Only essential details are needed for Admin review.</p>
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
          <Field label="City" required error={errors.city?.message} wide><input {...register('city')} className={inputClass} /></Field>
        </div>

        <p className="mt-5 text-xs leading-5 text-neutral-500">Additional profile, clinic, KYC, bank and pricing details can be completed later in the appropriate workflow.</p>

        {mutation.error && <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">{errorMessage(mutation.error)}</div>}

        <button type="submit" disabled={mutation.isPending} className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 py-3 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"><CheckCircle className="h-4 w-4" />{mutation.isPending ? 'Submitting...' : 'Submit for Admin Approval'}</button>
      </form>
    </div>
  );
}

const inputClass = 'min-h-11 w-full rounded-lg border border-neutral-300 px-3.5 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100';

function Field({ label, error, wide, required, children }: { label: string; error?: string; wide?: boolean; required?: boolean; children: ReactNode }) {
  return <label className={wide ? 'block sm:col-span-2' : 'block'}><span className="mb-1.5 block text-sm font-semibold text-neutral-700">{label}{required && <span className="ml-0.5 text-rose-500">*</span>}</span>{children}{error && <p className="mt-1 text-xs font-medium text-rose-600">{error}</p>}</label>;
}

function errorMessage(error: unknown) {
  if (error && typeof error === 'object') {
    const response = (error as { response?: { data?: { message?: unknown } } }).response;
    const message = response?.data?.message || (error as { message?: unknown }).message;
    if (message) return String(message);
  }
  return 'Unable to register doctor.';
}
