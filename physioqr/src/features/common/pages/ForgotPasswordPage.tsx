import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  LoaderCircle,
  Lock,
  Phone,
  ShieldCheck,
} from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import apiClient from '@/lib/api-client';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [devHint, setDevHint] = useState('');

  const normalizedMobile = mobile.trim();

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    if (!/^[6-9]\d{9}$/.test(normalizedMobile)) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setSendingOtp(true);
    try {
      const response = await apiClient.post('/auth/send-otp', {
        mobile: normalizedMobile,
        purpose: 'password_reset',
      });
      setOtpSent(true);
      if (response.data?.otp) {
        setDevHint(`Test OTP: ${response.data.otp}`);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to send OTP. Please check your mobile number.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!otp.trim()) {
      setError('Please enter the OTP sent to your mobile.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.post('/auth/reset-password', {
        mobile: normalizedMobile,
        otp: otp.trim(),
        newPassword,
      });
      setSuccess(true);
      setTimeout(() => {
        navigate('/login', { state: { passwordChanged: true } });
      }, 2000);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to reset password. Please check your OTP.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50/40 via-neutral-50 to-emerald-50/20 p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-xl">
        <div className="border-b border-neutral-100 bg-neutral-50/50 px-6 py-5">
          <div className="flex items-center justify-between">
            <Logo />
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 hover:text-primary-700 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Sign In
            </Link>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <div className="mb-6">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary-100 text-primary-700 mb-3">
              <KeyRound className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-bold text-neutral-900">Reset Your Password</h1>
            <p className="mt-1 text-xs text-neutral-500">
              Doctor & Partner self-service password recovery via verified mobile OTP.
            </p>
          </div>

          {success ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600 mb-2 animate-bounce" />
              <h2 className="text-base font-bold text-emerald-950">Password Reset Successful!</h2>
              <p className="mt-1 text-xs text-emerald-800">
                Your new password has been set. Redirecting you to the sign-in page...
              </p>
              <div className="mt-4">
                <Link
                  to="/login"
                  state={{ passwordChanged: true }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-xs font-bold text-white hover:bg-primary-700"
                >
                  Sign In Now
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700">
                  {error}
                </div>
              )}

              {devHint && (
                <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-mono text-amber-900">
                  💡 {devHint}
                </div>
              )}

              {!otpSent ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Registered 10-Digit Mobile Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />
                      <input
                        type="tel"
                        inputMode="numeric"
                        maxLength={10}
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                        placeholder="e.g. 9876543210"
                        className="w-full rounded-lg border border-neutral-300 pl-9 pr-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
                        autoFocus
                      />
                    </div>
                    <p className="mt-1.5 text-[11px] text-neutral-500">
                      We will send a 6-digit one-time password (OTP) to your phone.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={sendingOtp || normalizedMobile.length !== 10}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {sendingOtp ? (
                      <>
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                        Sending OTP...
                      </>
                    ) : (
                      <>
                        Send Reset OTP
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="rounded-lg border border-neutral-200 bg-neutral-50/70 p-3 text-xs text-neutral-600 flex justify-between items-center">
                    <div>
                      Mobile: <strong className="text-neutral-900 font-mono">+91 {normalizedMobile}</strong>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setOtpSent(false); setOtp(''); setDevHint(''); setError(''); }}
                      className="text-xs font-bold text-primary-600 hover:text-primary-700 underline"
                    >
                      Change
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Enter 6-Digit OTP
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="e.g. 123456"
                      className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm font-mono tracking-widest text-center focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      New Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        className="w-full rounded-lg border border-neutral-300 pl-9 pr-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        className="w-full rounded-lg border border-neutral-300 pl-9 pr-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || !otp || !newPassword || !confirmPassword}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <>
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                        Resetting Password...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-4 w-4" />
                        Confirm & Reset Password
                      </>
                    )}
                  </button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => handleSendOtp()}
                      disabled={sendingOtp}
                      className="text-xs text-neutral-500 hover:text-primary-700 font-medium"
                    >
                      Didn't get the code? <span className="underline">Resend OTP</span>
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
