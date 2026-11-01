import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, ShieldCheck, Stethoscope } from 'lucide-react';
import apiClient from '@/lib/api-client';

type Application = {
  fullName: string; mobile: string; email: string; qualification: string;
  specialization: string; medicalRegNumber: string; clinicName: string; city: string;
};
const empty: Application = {
  fullName: '', mobile: '', email: '', qualification: '', specialization: '',
  medicalRegNumber: '', clinicName: '', city: '',
};
const fields: { key: keyof Application; label: string; required: boolean; hint?: string }[] = [
  { key: 'fullName', label: 'Doctor full name', required: true },
  { key: 'mobile', label: 'Mobile number', required: true, hint: '10-digit mobile number' },
  { key: 'email', label: 'Email address', required: false },
  { key: 'qualification', label: 'Qualification', required: true, hint: 'e.g. MBBS, BPT, MPT' },
  { key: 'specialization', label: 'Specialization', required: true },
  { key: 'medicalRegNumber', label: 'Medical registration number', required: true },
  { key: 'clinicName', label: 'Clinic name', required: true },
  { key: 'city', label: 'City', required: true },
];
export default function DoctorSelfRegisterPage() {
  const [form, setForm] = useState<Application>(empty);
  const mutation = useMutation({
    mutationFn: async () => (await apiClient.post('/doctors/self-register', {
      ...Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value.trim()])),
      // This route alone determines the doctor agreement on the server.
    })).data as { doctorId?: string; status?: string },
  });
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!/^[6-9]\d{9}$/.test(form.mobile.trim())) return;
    mutation.mutate();
  };
  return (
    <main className="min-h-screen bg-[#f4faf8] px-4 py-10 sm:py-16">
      <div className="mx-auto max-w-2xl">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800 hover:underline"><ArrowLeft className="h-4 w-4" />Back to homepage</Link>
        <section className="mt-5 rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm sm:p-9">
          {mutation.isSuccess ? (
            <div role="status" className="space-y-4">
              <CheckCircle2 className="h-12 w-12 text-emerald-600" />
              <h1 className="text-2xl font-extrabold text-slate-900">Registration submitted successfully</h1>
              <p className="text-sm leading-6 text-slate-600">Your doctor application has been received for Admin verification. The account and referral QR become active only after approval.</p>
              <p className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-900">Your Split Model agreement: <strong>50% Doctor / 50% PhysioQR</strong>.</p>
              <Link to="/" className="inline-block rounded-lg bg-emerald-700 px-5 py-3 text-sm font-semibold text-white">Return home</Link>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3"><div className="rounded-xl bg-emerald-50 p-3 text-emerald-700"><Stethoscope className="h-6 w-6" /></div><div><h1 className="text-2xl font-extrabold text-slate-900">Doctor Registration</h1><p className="text-sm text-slate-500">Join PhysioQR directly, without an agent.</p></div></div>
              <div className="mt-6 rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-950">
                <div className="flex items-center gap-2 font-bold"><ShieldCheck className="h-4 w-4" />Direct website Split Model</div>
                <p className="mt-1">Doctor receives <strong>50%</strong> and PhysioQR receives <strong>50%</strong> of each verified patient programme payment. This split is fixed for direct website registrations.</p>
                <p className="mt-2 text-xs">Admin verifies your professional details and sets the applicable patient programme price before activating your account.</p>
              </div>
              <form onSubmit={submit} className="mt-7 space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  {fields.map(({ key, label, required, hint }) => (
                    <label key={key} className="block text-sm font-semibold text-slate-700">
                      {label}{required && <span className="text-red-600"> *</span>}
                      <input required={required} type={key === 'email' ? 'email' : key === 'mobile' ? 'tel' : 'text'}
                        inputMode={key === 'mobile' ? 'numeric' : undefined}
                        pattern={key === 'mobile' ? '[6-9][0-9]{9}' : undefined}
                        minLength={required && key !== 'mobile' ? 2 : undefined}
                        maxLength={key === 'mobile' ? 10 : 160}
                        autoComplete={key === 'email' ? 'email' : key === 'mobile' ? 'tel' : undefined}
                        placeholder={hint || label}
                        value={form[key]}
                        onChange={(event) => setForm((previous) => ({ ...previous, [key]: event.target.value }))}
                        className="mt-2 block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                      />
                    </label>
                  ))}
                </div>
                {mutation.isError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800">{(mutation.error as {response?:{data?:{message?:string}}})?.response?.data?.message || 'Registration could not be completed. Please retry.'}</p>}
                <button type="submit" disabled={mutation.isPending} className="flex min-h-12 w-full items-center justify-center rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white hover:bg-emerald-800 disabled:opacity-60">{mutation.isPending ? 'Submitting application...' : 'Submit Doctor Registration'}</button>
                <p className="text-center text-xs leading-5 text-slate-500">Already registered? <Link to="/login" className="font-bold text-emerald-700 hover:underline">Sign in</Link></p>
              </form>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
