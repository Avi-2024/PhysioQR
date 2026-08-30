import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, HeartPulse, Lock, ShieldCheck, Stethoscope, UserCheck } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { Logo } from '@/components/brand/Logo';
import { UserRole } from '@/types';
import { getRedirectPathForRole } from '@/lib/permissions';
import apiClient from '@/lib/api-client';

const credentialSchema = z.object({ identifier: z.string().min(1, 'Email or mobile is required'), password: z.string().min(4, 'Password must be at least 4 characters') });
const patientSchema = z.object({ mobile: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number'), otp: z.string().min(4, 'Enter the OTP').max(10, 'OTP is too long') });
type CredentialForm = z.infer<typeof credentialSchema>;
type PatientForm = z.infer<typeof patientSchema>;
type ApiRecord = Record<string, unknown>;
type LoginMode = 'patient' | 'credentials';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuthStore();
  const preferredRole = asRecord(location.state).preferredRole;
  const initialMode: LoginMode = preferredRole === 'patient' ? 'patient' : 'credentials';
  const [mode, setMode] = useState<LoginMode>(initialMode);
  const [submitError, setSubmitError] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  const credentialForm = useForm<CredentialForm>({ resolver: zodResolver(credentialSchema), defaultValues: { identifier: '', password: '' } });
  const patientForm = useForm<PatientForm>({ resolver: zodResolver(patientSchema), defaultValues: { mobile: '', otp: '' } });

  const changeMode = (nextMode: LoginMode) => {
    setMode(nextMode);
    setSubmitError('');
    setOtpSent(false);
  };

  const credentialLogin = async (data: CredentialForm) => {
    setSubmitError('');
    try {
      const identifier = data.identifier.trim();
      const response = await apiClient.post('/auth/login', identifier.includes('@') ? { email: identifier, password: data.password } : { mobile: identifier, password: data.password });
      const auth = asRecord(response.data);
      const apiUser = asRecord(auth.user);
      const role = text(auth.role || apiUser.role) as UserRole;

      if (!['admin', 'agent', 'doctor'].includes(role)) {
        setSubmitError(role === 'patient' ? 'Patients sign in with mobile OTP.' : 'This account cannot use password sign in.');
        return;
      }

      const token = text(auth.token || auth.accessToken);
      if (!token) {
        setSubmitError('Login succeeded but access token was not returned.');
        return;
      }

      login({
        id: text(apiUser.id || apiUser._id),
        name: text(apiUser.name || apiUser.fullName || apiUser.email || apiUser.mobile, role === 'doctor' ? 'Doctor' : 'User'),
        email: text(apiUser.email),
        mobile: text(apiUser.mobile),
        role,
      }, token);
      navigate(getRedirectPathForRole(role));
    } catch (error) {
      setSubmitError(errorMessage(error));
    }
  };

  const sendPatientOtp = async () => {
    setSubmitError('');
    if (!(await patientForm.trigger('mobile'))) return;
    try {
      await apiClient.post('/auth/send-otp', { mobile: patientForm.getValues('mobile'), purpose: 'login' });
      setOtpSent(true);
    } catch (error) {
      setSubmitError(errorMessage(error));
    }
  };

  const patientLogin = async (data: PatientForm) => {
    setSubmitError('');
    try {
      const response = await apiClient.post('/auth/verify-otp', { mobile: data.mobile, otp: data.otp, purpose: 'login' });
      const auth = asRecord(response.data);
      const patient = asRecord(auth.patient);
      if (!auth.registered || !patient.id) {
        setSubmitError('Patient account not found. Please register first.');
        return;
      }
      const token = text(auth.token || auth.accessToken);
      if (!token) {
        setSubmitError('OTP verified but access token was not returned.');
        return;
      }
      login({ id: text(patient.id), name: text(patient.fullName, 'Patient'), email: text(patient.email), mobile: text(patient.mobile), role: 'patient' }, token);
      navigate(getRedirectPathForRole('patient'));
    } catch (error) {
      setSubmitError(errorMessage(error));
    }
  };

  return <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
    <div className="max-w-4xl w-full bg-white rounded-2xl shadow-modal overflow-hidden grid grid-cols-1 lg:grid-cols-2 border border-neutral-200">
      <div className="bg-gradient-to-br from-primary-900 via-primary-800 to-neutral-900 p-8 text-white flex-col justify-between sm:flex">
        <div><Link to="/" className="flex items-center gap-3 mb-8 no-underline text-white"><Logo width={210} height={40} /><div><h1 className="font-bold text-xl leading-none">physioqr</h1><span className="text-xs text-primary-300 font-medium">Rehabilitation Platform</span></div></Link><div className="space-y-4 my-8"><h2 className="text-2xl font-bold leading-tight">Your rehabilitation journey,<br />securely connected.</h2><p className="text-sm text-primary-200 leading-relaxed">Patients sign in with mobile OTP. Registered professional and team accounts use secure credentials.</p></div></div>
        <div className="space-y-3 pt-6 border-t border-primary-700/50"><Info icon={<ShieldCheck className="w-4 h-4"/>} text="Secure role-based portal access"/><Info icon={<UserCheck className="w-4 h-4"/>} text="Patient access through verified mobile OTP"/><Info icon={<Stethoscope className="w-4 h-4"/>} text="Automatic routing to the correct workspace"/></div>
      </div>

      <div className="p-8 sm:p-10 flex flex-col justify-center">
        <div className="mb-6"><h2 className="text-xl font-bold text-neutral-900">Sign in to PhysioQR</h2><p className="text-xs text-neutral-500 mt-1">Use the sign-in method for your account</p></div>
        <div className="grid grid-cols-2 gap-2 p-1 bg-neutral-100 rounded-xl border border-neutral-200 mb-6">
          <button type="button" onClick={() => changeMode('patient')} className={`flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all ${mode === 'patient' ? 'bg-primary-600 text-white shadow-sm' : 'text-neutral-600'}`}><HeartPulse className="w-4 h-4"/>Patient</button>
          <button type="button" onClick={() => changeMode('credentials')} className={`flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all ${mode === 'credentials' ? 'bg-primary-600 text-white shadow-sm' : 'text-neutral-600'}`}><Stethoscope className="w-4 h-4"/>Account</button>
        </div>
        {submitError && <div className="mb-4 rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm font-semibold text-danger-700">{submitError}</div>}

        {mode === 'patient' ? <form onSubmit={patientForm.handleSubmit(patientLogin)} className="space-y-4">
          <div><label className="block text-xs font-semibold text-neutral-700 mb-1">Mobile Number</label><div className="flex gap-2"><input {...patientForm.register('mobile')} type="tel" placeholder="10-digit mobile number" className={inputClass}/><button type="button" onClick={sendPatientOtp} className="shrink-0 rounded-lg bg-neutral-100 px-4 text-sm font-semibold text-neutral-700">{otpSent ? 'Resend' : 'Send OTP'}</button></div>{patientForm.formState.errors.mobile && <p className="mt-1 text-xs text-danger-600">{patientForm.formState.errors.mobile.message}</p>}</div>
          {otpSent && <div><label className="block text-xs font-semibold text-neutral-700 mb-1">OTP</label><input {...patientForm.register('otp')} placeholder="Enter OTP" className={inputClass}/>{patientForm.formState.errors.otp && <p className="mt-1 text-xs text-danger-600">{patientForm.formState.errors.otp.message}</p>}</div>}
          <button type="submit" disabled={!otpSent || patientForm.formState.isSubmitting} className={primaryButton}><Lock className="w-4 h-4"/>{patientForm.formState.isSubmitting ? 'Signing in...' : 'Patient Sign In'}<ArrowRight className="w-4 h-4"/></button>
        </form> : <form onSubmit={credentialForm.handleSubmit(credentialLogin)} className="space-y-4">
          <div><label className="block text-xs font-semibold text-neutral-700 mb-1">Email or Mobile</label><input {...credentialForm.register('identifier')} placeholder="Email address or mobile number" className={inputClass}/>{credentialForm.formState.errors.identifier && <p className="mt-1 text-xs text-danger-600">{credentialForm.formState.errors.identifier.message}</p>}</div>
          <div><label className="block text-xs font-semibold text-neutral-700 mb-1">Password</label><input {...credentialForm.register('password')} type="password" className={inputClass}/>{credentialForm.formState.errors.password && <p className="mt-1 text-xs text-danger-600">{credentialForm.formState.errors.password.message}</p>}</div>
          <button type="submit" disabled={credentialForm.formState.isSubmitting} className={primaryButton}><Lock className="w-4 h-4"/>{credentialForm.formState.isSubmitting ? 'Signing in...' : 'Sign In'}<ArrowRight className="w-4 h-4"/></button>
        </form>}
        <div className="mt-6 pt-5 border-t border-neutral-100 text-center text-sm text-neutral-600">New patient? <Link to="/register" className="font-bold text-primary-700">Register here</Link></div>
      </div>
    </div>
  </div>;
}

const inputClass = 'w-full min-w-0 px-3.5 py-2.5 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';
const primaryButton = 'w-full mt-2 py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm text-sm disabled:opacity-60';
function Info({ icon, text: value }: { icon: React.ReactNode; text: string }) { return <div className="flex items-center gap-3 text-xs text-primary-200"><span className="text-success-400">{icon}</span><span>{value}</span></div>; }
function asRecord(value: unknown): ApiRecord { return value && typeof value === 'object' ? value as ApiRecord : {}; }
function text(value: unknown, fallback = '') { return value === undefined || value === null || value === '' ? fallback : String(value); }
function errorMessage(error: unknown) { const response = asRecord(asRecord(error).response); const data = asRecord(response.data); return text(data.message || asRecord(error).message, 'Sign in failed. Please try again.'); }
