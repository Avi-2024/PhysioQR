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

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(4, 'Password must be at least 4 characters'),
  role: z.enum(['admin', 'agent', 'doctor', 'patient'] as const),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const DEMO_ACCOUNTS: Record<UserRole, { email: string; name: string; role: UserRole; revenueModel?: 'split_model' | 'platform_fee_model' }> = {
  admin: {
    email: 'admin@physioqr.in',
    name: 'Central Admin',
    role: 'admin',
  },
  agent: {
    email: 'agent@physioqr.in',
    name: 'Amit Kumar (Agent)',
    role: 'agent',
  },
  doctor: {
    email: 'doctor@physioqr.in',
    name: 'Dr. Rajesh Sharma',
    role: 'doctor',
    revenueModel: 'split_model',
  },
  patient: {
    email: 'patient@physioqr.in',
    name: 'Ramesh Gupta',
    role: 'patient',
  },
};

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [selectedRole, setSelectedRole] = useState<UserRole>('admin');

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: DEMO_ACCOUNTS.admin.email,
      password: 'password123',
      role: 'admin',
    },
  });

  const handleRoleChange = (role: UserRole) => {
    setSelectedRole(role);
    form.setValue('role', role);
    form.setValue('email', DEMO_ACCOUNTS[role].email);
  };

  const onSubmit = (data: LoginFormValues) => {
    const demoUser = DEMO_ACCOUNTS[data.role];
    const user = {
      id: `USR-${Date.now()}`,
      name: demoUser.name,
      email: data.email,
      mobile: '9876543210',
      role: data.role,
      revenueModel: demoUser.revenueModel,
    };

    login(user, 'mock-jwt-token-xyz');
    navigate(getRedirectPathForRole(data.role));
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl w-full bg-white rounded-2xl shadow-modal overflow-hidden grid grid-cols-1 lg:grid-cols-2 border border-neutral-200">
        {/* Left Hero Panel */}
        <div className="bg-gradient-to-br from-primary-900 via-primary-800 to-neutral-900 p-8 text-white flex flex-col justify-between hidden sm:flex">
          <div>
            <div className="flex items-center gap-3 mb-8">
              <Logo width={40} height={40} withText={false} />
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
            <p className="text-xs text-neutral-500 mt-1">Select your role portal to access your dashboard</p>
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

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">Email Address</label>
              <input
                {...form.register('email')}
                type="email"
                className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              {form.formState.errors.email && (
                <p className="mt-1 text-xs text-danger-600">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">Password</label>
              <input
                {...form.register('password')}
                type="password"
                className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              {form.formState.errors.password && (
                <p className="mt-1 text-xs text-danger-600">{form.formState.errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full mt-2 py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm text-sm"
            >
              <Lock className="w-4 h-4" />
              Access {selectedRole.toUpperCase()} Portal
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-neutral-100 text-center text-xs text-neutral-400">
            Simulating authentication for demo. Password can be any value.
          </div>
        </div>
      </div>
    </div>
  );
}
