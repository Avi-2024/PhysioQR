import { useState, type FormEvent, type ReactNode } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { LockKeyhole, ShieldCheck } from 'lucide-react';
import apiClient from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth.store';
import { getRedirectPathForRole } from '@/lib/permissions';

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
  if (!user.mustChangePassword) return <Navigate to={getRedirectPathForRole(user.role)} replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (newPassword.length < 8) return setError('New password must be at least 8 characters.');
    if (newPassword !== confirmPassword) return setError('New passwords do not match.');

    try {
      setSaving(true);
      await apiClient.post('/auth/change-password', { newPassword });
      logout();
      navigate('/login', { replace: true, state: { passwordChanged: true } });
    } catch (err) {
      const anyErr = err as { response?: { data?: { message?: string } }; message?: string };
      setError(anyErr.response?.data?.message || anyErr.message || 'Unable to create password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-10 flex items-center justify-center">
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-primary-700"><ShieldCheck className="h-6 w-6" /></div>
        <h1 className="mt-5 text-2xl font-bold text-neutral-950">Create your password</h1>
        <p className="mt-2 text-sm leading-6 text-neutral-500">Your temporary password has already been verified. Create your own password to continue.</p>

        {error && <div className="mt-5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div>}

        <form onSubmit={submit} className="mt-6 space-y-4">
          <Field label="New password"><input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} autoComplete="new-password" className={inputClass} placeholder="Minimum 8 characters" /></Field>
          <Field label="Confirm new password"><input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} autoComplete="new-password" className={inputClass} /></Field>
          <button type="submit" disabled={saving} className="mt-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"><LockKeyhole className="h-4 w-4" />{saving ? 'Saving...' : 'Set New Password'}</button>
        </form>
      </div>
    </div>
  );
}

const inputClass = 'mt-1.5 min-h-12 w-full rounded-lg border border-neutral-300 px-3.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100';
function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="block"><span className="text-sm font-semibold text-neutral-700">{label}</span>{children}</label>; }
