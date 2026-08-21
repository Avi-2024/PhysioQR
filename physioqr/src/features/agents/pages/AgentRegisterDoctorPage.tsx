import React from 'react';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, UserPlus } from 'lucide-react';
import apiClient from '@/lib/api-client';

const doctorRegistrationSchema = z.object({
  name: z.string().min(2, 'Enter doctor full name'),
  mobile: z.string().regex(/^[6-9]\d{9}$/, 'Enter valid 10-digit mobile number'),
  email: z.string().email('Enter valid email address'),
  qualification: z.string().min(2, 'Qualification required'),
  specialization: z.string().min(2, 'Specialization required'),
  registrationNumber: z.string().min(2, 'Medical registration number required'),
  clinicName: z.string().min(2, 'Clinic name required'),
  clinicAddress: z.string().optional(),
  city: z.string().min(2, 'City required'),
  state: z.string().optional(),
  patientFee: z.coerce.number().min(100, 'Minimum fee is INR 100'),
});

type DoctorRegistrationForm = z.infer<typeof doctorRegistrationSchema>;

// Renders the Agent doctor onboarding form and submits to the backend doctor registration API.
export default function AgentRegisterDoctorPage() {
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<DoctorRegistrationForm>({
    resolver: zodResolver(doctorRegistrationSchema),
    defaultValues: {
      patientFee: 500,
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: DoctorRegistrationForm) => apiClient.post('/doctors', {
      fullName: data.name,
      mobile: data.mobile,
      email: data.email,
      qualification: data.qualification,
      specialization: data.specialization,
      medicalRegistrationNumber: data.registrationNumber,
      clinicName: data.clinicName,
      clinicAddress: data.clinicAddress,
      city: data.city,
      state: data.state,
      requestedPatientFee: data.patientFee,
    }),
    onSuccess: () => navigate('/agent/doctors'),
  });

  const onSubmit = (data: DoctorRegistrationForm) => mutation.mutate(data);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => navigate(-1)} className="p-2 border border-neutral-300 rounded-lg hover:bg-neutral-100" aria-label="Go back">
          <ArrowLeft className="w-4 h-4 text-neutral-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Register New Doctor</h1>
          <p className="text-sm text-neutral-500">Onboard a new doctor or clinic under your agent profile for admin approval.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white border border-neutral-200 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="border-b border-neutral-100 pb-4">
          <h2 className="font-bold text-neutral-900 text-lg flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary-600" /> 1. Personal & Contact Details
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Doctor Full Name" error={errors.name?.message}>
            <input {...register('name')} placeholder="e.g. Dr. Rajesh Sharma" className={inputClass} />
          </Field>
          <Field label="Mobile Number" error={errors.mobile?.message}>
            <input {...register('mobile')} placeholder="10-digit mobile" className={inputClass} />
          </Field>
          <Field label="Email Address" error={errors.email?.message} wide>
            <input {...register('email')} type="email" placeholder="doctor@clinic.com" className={inputClass} />
          </Field>
        </div>

        <div className="border-b border-neutral-100 pb-4 pt-4">
          <h2 className="font-bold text-neutral-900 text-lg">2. Professional Details</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Qualification" error={errors.qualification?.message}>
            <input {...register('qualification')} placeholder="e.g. MBBS, MS Orthopedics" className={inputClass} />
          </Field>
          <Field label="Specialization" error={errors.specialization?.message}>
            <input {...register('specialization')} placeholder="e.g. Orthopedic Specialist" className={inputClass} />
          </Field>
          <Field label="Medical Registration Number" error={errors.registrationNumber?.message} wide>
            <input {...register('registrationNumber')} placeholder="e.g. MMC-2018-98234" className={inputClass} />
          </Field>
        </div>

        <div className="border-b border-neutral-100 pb-4 pt-4">
          <h2 className="font-bold text-neutral-900 text-lg">3. Clinic & Fee Details</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Clinic Name" error={errors.clinicName?.message}>
            <input {...register('clinicName')} placeholder="e.g. City Spine & Joint Clinic" className={inputClass} />
          </Field>
          <Field label="City" error={errors.city?.message}>
            <input {...register('city')} placeholder="e.g. Mumbai" className={inputClass} />
          </Field>
          <Field label="State">
            <input {...register('state')} placeholder="e.g. Maharashtra" className={inputClass} />
          </Field>
          <Field label="Requested Patient Programme Fee (INR)" error={errors.patientFee?.message}>
            <input {...register('patientFee')} type="number" className={inputClass} />
          </Field>
          <Field label="Clinic Address" wide>
            <textarea {...register('clinicAddress')} placeholder="Full clinic address for field records" className={`${inputClass} min-h-24`} />
          </Field>
        </div>

        {mutation.error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
            {errorMessage(mutation.error)}
          </div>
        )}

        <button type="submit" disabled={isSubmitting || mutation.isPending} className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors text-sm flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60">
          <CheckCircle className="w-4 h-4" /> {mutation.isPending ? 'Submitting...' : 'Submit Profile for Admin Approval'}
        </button>
      </form>
    </div>
  );
}

const inputClass = 'w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';

// Renders a labeled form field with validation text.
function Field({ label, error, wide, children }: { label: string; error?: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <label className={wide ? 'sm:col-span-2 block' : 'block'}>
      <span className="block text-xs font-semibold text-neutral-700 mb-1">{label} *</span>
      {children}
      {error && <p className="mt-1 text-xs text-danger-600">{error}</p>}
    </label>
  );
}

function errorMessage(error: unknown) {
  if (error && typeof error === 'object') {
    const response = (error as { response?: { data?: { message?: unknown } } }).response;
    const message = response?.data?.message || (error as { message?: unknown }).message;
    if (message) return String(message);
  }
  return 'Unable to register doctor.';
}
