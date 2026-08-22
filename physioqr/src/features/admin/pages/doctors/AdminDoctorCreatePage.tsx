import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, Save, Stethoscope, UserRound } from 'lucide-react';
import apiClient from '@/lib/api-client';

type CreatePayload = {
  fullName: string;
  mobile: string;
  whatsapp?: string;
  email?: string;
  gender?: 'male' | 'female' | 'other';
  dateOfBirth?: string;
  qualification?: string;
  specialization?: string;
  medicalRegNumber?: string;
  registrationCouncil?: string;
  yearsOfExperience?: number;
  consultationFee?: number;
  clinicName?: string;
  clinicAddress?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  clinicContact?: string;
  clinicEmail?: string;
  clinicWorkingHours?: string;
  googleMapsLink?: string;
  clinicBranches?: number;
  requestedPatientFee?: number;
  revenueModel?: 'split' | 'platform_fee';
};

const stringValue = (form: FormData, key: string) => String(form.get(key) || '').trim();
const optionalString = (form: FormData, key: string) => stringValue(form, key) || undefined;
const optionalNumber = (form: FormData, key: string) => {
  const value = stringValue(form, key);
  return value === '' ? undefined : Number(value);
};

export default function AdminDoctorCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: (payload: CreatePayload) => apiClient.post('/doctors', payload),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ['admin-doctors'] });
      const id = response.data?._id || response.data?.id || response.data?.doctorId;
      navigate(id ? `/admin/doctors/${id}` : '/admin/doctors');
    },
    onError: (err: any) => setError(err?.response?.data?.message || 'Doctor could not be created.'),
  });

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    const form = new FormData(event.currentTarget);
    const fullName = stringValue(form, 'fullName');
    const mobile = stringValue(form, 'mobile');
    if (!fullName || !mobile) {
      setError('Full name and mobile are required.');
      return;
    }

    const yearsOfExperience = optionalNumber(form, 'yearsOfExperience');
    const consultationFee = optionalNumber(form, 'consultationFee');
    const clinicBranches = optionalNumber(form, 'clinicBranches');
    const requestedPatientFee = optionalNumber(form, 'requestedPatientFee');
    if ([yearsOfExperience, consultationFee, clinicBranches, requestedPatientFee].some((value) => value != null && (!Number.isFinite(value) || value < 0))) {
      setError('Numeric values must be valid non-negative numbers.');
      return;
    }

    const gender = optionalString(form, 'gender') as CreatePayload['gender'];
    const revenueModel = (optionalString(form, 'revenueModel') || 'split') as CreatePayload['revenueModel'];
    mutation.mutate({
      fullName,
      mobile,
      whatsapp: optionalString(form, 'whatsapp'),
      email: optionalString(form, 'email'),
      gender,
      dateOfBirth: optionalString(form, 'dateOfBirth'),
      qualification: optionalString(form, 'qualification'),
      specialization: optionalString(form, 'specialization'),
      medicalRegNumber: optionalString(form, 'medicalRegNumber'),
      registrationCouncil: optionalString(form, 'registrationCouncil'),
      yearsOfExperience,
      consultationFee,
      clinicName: optionalString(form, 'clinicName'),
      clinicAddress: optionalString(form, 'clinicAddress'),
      city: optionalString(form, 'city'),
      state: optionalString(form, 'state'),
      postalCode: optionalString(form, 'postalCode'),
      clinicContact: optionalString(form, 'clinicContact'),
      clinicEmail: optionalString(form, 'clinicEmail'),
      clinicWorkingHours: optionalString(form, 'clinicWorkingHours'),
      googleMapsLink: optionalString(form, 'googleMapsLink'),
      clinicBranches,
      requestedPatientFee,
      revenueModel,
    });
  };

  return <div className="mx-auto max-w-5xl space-y-6">
    <header>
      <button type="button" onClick={() => navigate('/admin/doctors')} className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-neutral-600"><ArrowLeft className="h-4 w-4" />Doctors</button>
      <p className="text-xs font-bold uppercase tracking-[.16em] text-primary-700">Doctor onboarding</p>
      <h1 className="mt-2 text-2xl font-bold text-neutral-950 sm:text-3xl">Create doctor profile</h1>
      <p className="mt-1 max-w-3xl text-sm leading-6 text-neutral-500">Create the operational doctor record first. The backend stores it as submitted; approval, KYC documents, bank verification, QR activation and final commercial controls remain in the doctor detail workflow.</p>
    </header>

    <form onSubmit={submit} className="space-y-5">
      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <Section icon={UserRound} title="Identity & contact" description="Minimum identity needed to create the doctor record.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" required><input name="fullName" required maxLength={160} className="input" /></Field>
          <Field label="Mobile" required><input name="mobile" required maxLength={20} inputMode="tel" className="input" /></Field>
          <Field label="WhatsApp"><input name="whatsapp" maxLength={20} inputMode="tel" className="input" /></Field>
          <Field label="Email"><input name="email" type="email" maxLength={160} className="input" /></Field>
          <Field label="Gender"><select name="gender" className="input"><option value="">Not specified</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select></Field>
          <Field label="Date of birth"><input name="dateOfBirth" type="date" className="input" /></Field>
        </div>
      </Section>

      <Section icon={Stethoscope} title="Professional details" description="Professional context used for review and approval.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Qualification"><input name="qualification" maxLength={180} className="input" /></Field>
          <Field label="Specialization"><input name="specialization" maxLength={180} className="input" /></Field>
          <Field label="Medical registration number"><input name="medicalRegNumber" maxLength={120} className="input" /></Field>
          <Field label="Registration council"><input name="registrationCouncil" maxLength={180} className="input" /></Field>
          <Field label="Years of experience"><input name="yearsOfExperience" type="number" min="0" max="80" className="input" /></Field>
          <Field label="Consultation fee"><input name="consultationFee" type="number" min="0" className="input" /></Field>
        </div>
      </Section>

      <Section icon={Building2} title="Clinic & commercial request" description="Clinic identity plus the requested patient fee. Final fee-share rules are set during approval/revenue configuration.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Clinic name"><input name="clinicName" maxLength={180} className="input" /></Field>
          <Field label="Clinic contact"><input name="clinicContact" maxLength={30} className="input" /></Field>
          <Field label="Clinic email"><input name="clinicEmail" type="email" maxLength={160} className="input" /></Field>
          <Field label="Working hours"><input name="clinicWorkingHours" maxLength={200} className="input" /></Field>
          <Field label="City"><input name="city" maxLength={100} className="input" /></Field>
          <Field label="State"><input name="state" maxLength={100} className="input" /></Field>
          <Field label="Postal code"><input name="postalCode" maxLength={20} className="input" /></Field>
          <Field label="Number of branches"><input name="clinicBranches" type="number" min="0" className="input" /></Field>
          <Field label="Clinic address"><input name="clinicAddress" maxLength={500} className="input" /></Field>
          <Field label="Google Maps link"><input name="googleMapsLink" type="url" maxLength={1000} className="input" /></Field>
          <Field label="Requested patient fee"><input name="requestedPatientFee" type="number" min="0" className="input" /></Field>
          <Field label="Requested revenue model"><select name="revenueModel" defaultValue="split" className="input"><option value="split">Split</option><option value="platform_fee">Platform fee</option></select></Field>
        </div>
        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">Bank account, PAN, KYC documents, approved fee, fee-share percentage/type and payout settings are intentionally not collected here. They belong to reviewed admin workflows after the profile exists.</div>
      </Section>

      <div className="flex justify-end gap-3">
        <button type="button" onClick={() => navigate('/admin/doctors')} className="min-h-11 rounded-lg border bg-white px-4 text-sm font-semibold">Cancel</button>
        <button type="submit" disabled={mutation.isPending} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary-600 px-5 text-sm font-semibold text-white disabled:opacity-50"><Save className="h-4 w-4" />{mutation.isPending ? 'Creating...' : 'Create submitted profile'}</button>
      </div>
    </form>
  </div>;
}

function Section({ icon: Icon, title, description, children }: { icon: React.ElementType; title: string; description: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border bg-white p-5 sm:p-6"><div className="mb-5 flex items-start gap-3"><div className="rounded-lg bg-neutral-100 p-2 text-neutral-700"><Icon className="h-4 w-4" /></div><div><h2 className="font-bold text-neutral-950">{title}</h2><p className="mt-1 text-sm text-neutral-500">{description}</p></div></div>{children}</section>;
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <label className="block"><span className="text-xs font-semibold text-neutral-600">{label}{required && <span className="text-red-500"> *</span>}</span><div className="mt-1 [&_.input]:min-h-11 [&_.input]:w-full [&_.input]:rounded-lg [&_.input]:border [&_.input]:border-neutral-300 [&_.input]:px-3 [&_.input]:text-sm [&_.input]:outline-none focus-within:[&_.input]:border-primary-500">{children}</div></label>;
}
