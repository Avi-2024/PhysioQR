import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, UserCheck, Stethoscope, ArrowRight, Lock } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { Logo } from '@/components/brand/Logo';
import { UserRole } from '@/types';
import { getRedirectPathForRole } from '@/lib/permissions';
import apiClient from '@/lib/api-client';

const loginSchema = z.object({
  identifier: z.string().optional(),
  password: z.string().optional(),
  role: z.enum(['admin', 'agent', 'doctor', 'patient'] as const),
}).superRefine((value, context) => {
  if (value.role === 'patient') return;
  if (!value.identifier?.trim()) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['identifier'], message: 'Email or mobile is required' });
  }
  if (!value.password || value.password.length < 4) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['password'], message: 'Password must be at least 4 characters' });
  }
});

type LoginFormValues = z.infer<typeof loginSchema>;
type ApiRecord = Record<string, unknown>;

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [selectedRole, setSelectedRole] = useState<UserRole>('admin');
  const [submitError, setSubmitError] = useState('');

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: '',
      password: '',
      role: 'admin',
    },
  });

  const handleRoleChange = (role: UserRole) => {
    setSelectedRole(role);
    form.setValue('role', role);
    setSubmitError('');
  };

  const onSubmit = async (data: LoginFormValues) => {
    setSubmitError('');
    if (data.role === 'patient') {
      navigate('/register');
      return;
    }

    try {
      const identifier = (data.identifier || '').trim();
      const payload = identifier.includes('@')
        ? { email: identifier, password: data.password || '' }
        : { mobile: identifier, password: data.password || '' };
      const response = await apiClient.post('/auth/login', payload);
      const auth = asRecord(response.data);
      const apiUser = asRecord(auth.user);
      const role = text(auth.role || apiUser.role) as UserRole;

      if (role !== data.role) {
        setSubmitError(`This account is ${role}. Please select the correct portal.`);
        return;
      }

      const token = text(auth.token || auth.accessToken);
      if (!token) {
        setSubmitError('Login succeeded but access token was not returned.');
        return;
      }

      login({
        id: text(apiUser.id || apiUser._id),
        name: text(apiUser.name || apiUser.fullName || apiUser.email || apiUser.mobile, roleLabel(role)),
        email: text(apiUser.email),
        mobile: text(apiUser.mobile),
        role,
      }, token);
      navigate(getRedirectPathForRole(role));
    } catch (error) {
      setSubmitError(errorMessage(error));
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl w-full bg-white rounded-2xl shadow-modal overflow-hidden grid grid-cols-1 lg:grid-cols-2 border border-neutral-200">
        {/* Left Hero Panel */}
        <div className="bg-gradient-to-br from-primary-900 via-primary-800 to-neutral-900 p-8 text-white  flex-col justify-between  sm:flex">
          <div>
            <div className="flex items-center gap-3 mb-8">
              <Logo width={210} height={40}  />
              <div>
                <h1 className="font-bold text-xl leading-none">physioqr</h1>
                <span className="text-xs text-primary-300 font-medium">Rehabilitation Platform</span>
              </div>
            </div>

            <div className="space-y-4 my-8">
              <h2 className="text-2xl font-bold leading-tight">Smarter Rehabilitation.<br />Better Clinical Outcomes.</h2>
              <p className="text-sm text-primary-200 leading-relaxed">
                Connect doctors, agents, and patients on a single unified platform. Day-wise video exercises, automatic fee shares, and real-time recovery analytics.
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-6 border-t border-primary-700/50">
            <div className="flex items-center gap-3 text-xs text-primary-200">
              <ShieldCheck className="w-4 h-4 text-success-400 flex-shrink-0" />
              <span>Doctor-referral based rehabilitation programs</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-primary-200">
              <UserCheck className="w-4 h-4 text-success-400 flex-shrink-0" />
              <span>Role-based access for Admin, Agent, Doctor & Patient</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-primary-200">
              <Stethoscope className="w-4 h-4 text-success-400 flex-shrink-0" />
              <span>Split Model & Platform Fee Model earnings calculation</span>
            </div>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="p-8 sm:p-10 flex flex-col justify-center">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-neutral-900">Sign in to physioqr</h2>
            <p className="text-xs text-neutral-500 mt-1">Use your registered email/mobile and password</p>
          </div>

          {/* Role selector pill tabs */}
          <div className="mb-6">
            <label className="block text-xs font-semibold text-neutral-600 mb-2 uppercase tracking-wider">Select Portal</label>
            <div className="grid grid-cols-4 gap-1.5 p-1 bg-neutral-100 rounded-xl border border-neutral-200">
              {(['admin', 'agent', 'doctor', 'patient'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleRoleChange(r)}
                  className={`py-2 text-xs font-bold rounded-lg capitalize transition-all ${
                    selectedRole === r
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {submitError && (
            <div className="mb-4 rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm font-semibold text-danger-700">
              {submitError}
            </div>
          )}

          {selectedRole === 'patient' && (
            <div className="mb-4 rounded-lg border border-primary-100 bg-primary-50 px-4 py-3 text-sm text-primary-800">
              Patients use mobile OTP from the doctor QR/referral flow. Continue to patient registration instead of password login.
            </div>
          )}

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">Email or Mobile</label>
              <input
                {...form.register('identifier')}
                type="text"
                disabled={selectedRole === 'patient'}
                placeholder="admin@physioqr.in or 9876543210"
                className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              {form.formState.errors.identifier && (
                <p className="mt-1 text-xs text-danger-600">{form.formState.errors.identifier.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">Password</label>
              <input
                {...form.register('password')}
                type="password"
                disabled={selectedRole === 'patient'}
                className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              {form.formState.errors.password && (
                <p className="mt-1 text-xs text-danger-600">{form.formState.errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="w-full mt-2 py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm text-sm disabled:opacity-60"
            >
              <Lock className="w-4 h-4" />
              {form.formState.isSubmitting ? 'Signing in...' : selectedRole === 'patient' ? 'Continue with Patient OTP' : `Access ${selectedRole.toUpperCase()} Portal`}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-neutral-100 text-center text-xs text-neutral-400">
            Admin, Agent, and Doctor use password login. Patients use OTP only.
          </div>
        </div>
      </div>
    </div>
  );
}

function asRecord(value: unknown): ApiRecord {
  return value && typeof value === 'object' ? value as ApiRecord : {};
}

function text(value: unknown, fallback = '') {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value);
}

function roleLabel(role: UserRole) {
  const labels: Record<UserRole, string> = {
    admin: 'Admin',
    agent: 'Agent',
    doctor: 'Doctor',
    patient: 'Patient',
  };
  return labels[role];
}

function errorMessage(error: unknown) {
  const response = asRecord(asRecord(error).response);
  const data = asRecord(response.data);
  return text(data.message || asRecord(error).message, 'Login failed. Check your credentials and backend connection.');
}
