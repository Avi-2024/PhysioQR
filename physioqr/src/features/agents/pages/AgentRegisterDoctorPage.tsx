import React from 'react';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, UserPlus } from 'lucide-react';
import apiClient from '@/lib/api-client';

const schema = z.object({
  fullName: z.string().min(2, 'Enter doctor full name'),
  mobile: z.string().regex(/^[6-9]\d{9}$/, 'Enter valid 10-digit mobile number'),
  whatsapp: z.string().optional(),
  email: z.string().email('Enter valid email address').optional().or(z.literal('')),
  qualification: z.string().min(2, 'Qualification required'),
  specialization: z.string().min(2, 'Specialization required'),
  medicalRegNumber: z.string().min(2, 'Medical registration number required'),
  registrationCouncil: z.string().optional(),
  yearsOfExperience: z.coerce.number().min(0).optional(),
  clinicName: z.string().min(2, 'Clinic name required'),
  clinicAddress: z.string().optional(),
  city: z.string().min(2, 'City required'),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  clinicContact: z.string().optional(),
  clinicWorkingHours: z.string().optional(),
  googleMapsLink: z.string().url('Enter a valid URL').optional().or(z.literal('')),
  requestedPatientFee: z.coerce.number().min(0).optional(),
});
type FormData = z.infer<typeof schema>;

export default function AgentRegisterDoctorPage() {
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });
  const mutation = useMutation({
    mutationFn: async (data: FormData) => apiClient.post('/doctors', clean(data)),
    onSuccess: (response) => {
      const id = String(response.data?._id || '');
      navigate(id ? `/agent/doctors/${id}` : '/agent/doctors');
    },
  });

  return <div className="mx-auto max-w-4xl space-y-6">
    <div className="flex items-center gap-3"><button type="button" onClick={() => navigate(-1)} className="rounded-lg border border-neutral-300 p-2" aria-label="Go back"><ArrowLeft className="h-4 w-4"/></button><div><h1 className="text-2xl font-bold text-neutral-900">Register New Doctor</h1><p className="text-sm text-neutral-500">Capture verified onboarding details for Admin review.</p></div></div>
    <form onSubmit={handleSubmit((data)=>mutation.mutate(data))} className="space-y-7 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
      <Section title="1. Personal & Contact Details" icon={<UserPlus className="h-5 w-5 text-primary-600"/>}/><div className="grid gap-4 sm:grid-cols-2">
        <Field label="Doctor Full Name" required error={errors.fullName?.message}><input {...register('fullName')} className={inputClass}/></Field>
        <Field label="Mobile Number" required error={errors.mobile?.message}><input {...register('mobile')} className={inputClass}/></Field>
        <Field label="WhatsApp Number"><input {...register('whatsapp')} className={inputClass}/></Field>
        <Field label="Email" error={errors.email?.message}><input {...register('email')} type="email" className={inputClass}/></Field>
      </div>
      <Section title="2. Professional Details"/><div className="grid gap-4 sm:grid-cols-2">
        <Field label="Qualification" required error={errors.qualification?.message}><input {...register('qualification')} className={inputClass}/></Field>
        <Field label="Specialization" required error={errors.specialization?.message}><input {...register('specialization')} className={inputClass}/></Field>
        <Field label="Medical Registration Number" required error={errors.medicalRegNumber?.message}><input {...register('medicalRegNumber')} className={inputClass}/></Field>
        <Field label="Registration Council"><input {...register('registrationCouncil')} className={inputClass}/></Field>
        <Field label="Years of Experience"><input {...register('yearsOfExperience')} type="number" min="0" className={inputClass}/></Field>
      </div>
      <Section title="3. Clinic Details"/><div className="grid gap-4 sm:grid-cols-2">
        <Field label="Clinic Name" required error={errors.clinicName?.message}><input {...register('clinicName')} className={inputClass}/></Field>
        <Field label="Clinic Contact"><input {...register('clinicContact')} className={inputClass}/></Field>
        <Field label="City" required error={errors.city?.message}><input {...register('city')} className={inputClass}/></Field>
        <Field label="State"><input {...register('state')} className={inputClass}/></Field>
        <Field label="Postal Code"><input {...register('postalCode')} className={inputClass}/></Field>
        <Field label="Working Hours"><input {...register('clinicWorkingHours')} placeholder="e.g. 10 AM - 7 PM" className={inputClass}/></Field>
        <Field label="Google Maps Link" error={errors.googleMapsLink?.message} wide><input {...register('googleMapsLink')} className={inputClass}/></Field>
        <Field label="Clinic Address" wide><textarea {...register('clinicAddress')} className={`${inputClass} min-h-24`}/></Field>
      </div>
      <Section title="4. Referral Programme"/><div className="grid gap-4 sm:grid-cols-2"><Field label="Doctor Requested Patient Fee" error={errors.requestedPatientFee?.message}><input {...register('requestedPatientFee')} type="number" min="0" className={inputClass}/></Field><div className="rounded-lg bg-neutral-50 p-4 text-xs text-neutral-600">This is only the doctor-requested fee. Admin remains the authority for approved patient pricing and fee-share settings.</div></div>
      {mutation.error&&<div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">{errorMessage(mutation.error)}</div>}
      <button type="submit" disabled={mutation.isPending} className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 py-3 text-sm font-semibold text-white disabled:opacity-60"><CheckCircle className="h-4 w-4"/>{mutation.isPending?'Submitting...':'Submit for Admin Approval'}</button>
    </form>
  </div>;
}

const inputClass='w-full rounded-lg border border-neutral-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';
function Section({title,icon}:{title:string;icon?:React.ReactNode}){return <div className="border-b border-neutral-100 pb-3"><h2 className="flex items-center gap-2 text-lg font-bold text-neutral-900">{icon}{title}</h2></div>}
function Field({label,error,wide,required,children}:{label:string;error?:string;wide?:boolean;required?:boolean;children:React.ReactNode}){return <label className={wide?'block sm:col-span-2':'block'}><span className="mb-1 block text-xs font-semibold text-neutral-700">{label}{required&&' *'}</span>{children}{error&&<p className="mt-1 text-xs text-danger-600">{error}</p>}</label>}
function clean(data:FormData){return Object.fromEntries(Object.entries(data).filter(([,v])=>v!==''&&v!==undefined&&v!==null))}
function errorMessage(error:unknown){if(error&&typeof error==='object'){const response=(error as {response?:{data?:{message?:unknown}}}).response;const message=response?.data?.message||(error as {message?:unknown}).message;if(message)return String(message)}return'Unable to register doctor.'}
