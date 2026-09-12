import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Clock3, CreditCard, RefreshCw, ShieldCheck } from 'lucide-react';
import apiClient from '@/lib/api-client';

type AccessState = 'active' | 'cleared' | 'pending_review' | 'blocked' | 'assessment_required' | 'payment_required' | 'activation_pending';
type ClinicalAccess = {
  canAccessRehab?: boolean;
  accessState?: AccessState;
  reviewPending?: boolean;
  reviewBlocked?: boolean;
  clinicalCleared?: boolean;
  paymentCompleted?: boolean;
  programActivated?: boolean;
  assessment?: {
    reviewType?: string;
    status?: string;
    hasRedFlag?: boolean;
  } | null;
};

type Props = { children: ReactNode };

export default function PatientClinicalAccessGuard({ children }: Props) {
  const navigate = useNavigate();
  const query = useQuery<ClinicalAccess>({
    queryKey: ['patient-clinical-access'],
    queryFn: () => apiClient.get('/patients/me/clinical-access').then((response) => response.data),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  if (query.isLoading) {
    return <div className="flex min-h-[55vh] items-center justify-center text-sm font-semibold text-neutral-500">Checking your rehabilitation access…</div>;
  }

  if (query.isError || !query.data) {
    return <div className="mx-auto mt-10 max-w-xl rounded-2xl border border-neutral-200 bg-white p-6 text-center"><ShieldCheck className="mx-auto h-9 w-9 text-neutral-400"/><h1 className="mt-3 text-lg font-bold text-neutral-950">We could not verify your rehabilitation access</h1><p className="mt-2 text-sm leading-6 text-neutral-600">For safety, rehabilitation content is temporarily unavailable until your current status can be checked.</p><button type="button" onClick={() => query.refetch()} className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white"><RefreshCw className="h-4 w-4"/>Try again</button></div>;
  }

  const status = query.data;
  if (status.canAccessRehab === true && status.accessState === 'active') return <>{children}</>;

  const assessment = status.assessment || null;
  const accessState = status.accessState || 'assessment_required';
  const reviewPending = Boolean(status.reviewPending || accessState === 'pending_review');
  const reviewBlocked = Boolean(status.reviewBlocked || accessState === 'blocked');
  const isSafetyReview = assessment?.reviewType === 'red_flag' || Boolean(assessment?.hasRedFlag);

  if (reviewPending || reviewBlocked) {
    return <div className="mx-auto max-w-2xl py-8"><section className={`rounded-2xl border bg-white p-6 sm:p-8 ${reviewBlocked ? 'border-rose-200' : 'border-amber-200'}`}><div className={`flex h-12 w-12 items-center justify-center rounded-xl ${reviewBlocked ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>{reviewBlocked ? <AlertTriangle className="h-6 w-6"/> : <Clock3 className="h-6 w-6"/>}</div><h1 className="mt-5 text-2xl font-bold tracking-tight text-neutral-950">{reviewBlocked ? 'Rehabilitation access is currently paused' : 'Clinical review is in progress'}</h1><p className="mt-3 text-sm leading-6 text-neutral-600">{reviewBlocked ? 'Your assessment requires clinical clearance before rehabilitation exercises or programme content can be accessed.' : isSafetyReview ? 'Your assessment included a safety-sensitive response. A clinician needs to review it before your rehabilitation journey can continue.' : 'Your assessment is waiting for physiotherapy review before a programme can be approved.'}</p><div className="mt-5 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3"><p className="text-sm font-semibold text-neutral-800">What happens next?</p><p className="mt-1 text-sm leading-6 text-neutral-600">Once every unresolved clinical review is cleared, you will continue to programme selection and payment. Exercise access is not unlocked by clinical approval alone.</p></div><button type="button" onClick={() => query.refetch()} className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-700"><RefreshCw className="h-4 w-4"/>Check review status</button></section></div>;
  }

  if (accessState === 'payment_required') {
    return <div className="mx-auto max-w-2xl py-8"><section className="rounded-2xl border border-primary-200 bg-white p-6 sm:p-8"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-primary-700"><CreditCard className="h-6 w-6"/></div><h1 className="mt-5 text-2xl font-bold tracking-tight text-neutral-950">Clinical review cleared</h1><p className="mt-3 text-sm leading-6 text-neutral-600">Your assessment is cleared, but rehabilitation exercises are still locked. Complete programme confirmation and payment first.</p><div className="mt-5 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3"><p className="text-sm font-semibold text-neutral-800">Next step: Programme & payment</p><p className="mt-1 text-sm leading-6 text-neutral-600">Your programme becomes active only after the backend verifies the payment. After activation, your dashboard, exercises and progress will unlock automatically.</p></div><div className="mt-5 flex flex-wrap gap-2"><button type="button" onClick={() => navigate('/register')} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white"><CreditCard className="h-4 w-4"/>Continue to payment</button><button type="button" onClick={() => query.refetch()} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-700"><RefreshCw className="h-4 w-4"/>Refresh status</button></div></section></div>;
  }

  if (accessState === 'activation_pending') {
    return <div className="mx-auto max-w-2xl py-8"><section className="rounded-2xl border border-emerald-200 bg-white p-6 sm:p-8"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><Clock3 className="h-6 w-6"/></div><h1 className="mt-5 text-2xl font-bold tracking-tight text-neutral-950">Payment received</h1><p className="mt-3 text-sm leading-6 text-neutral-600">Your payment is verified, but the rehabilitation programme is not active yet. Exercise access will remain locked until activation completes.</p><button type="button" onClick={() => query.refetch()} className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white"><RefreshCw className="h-4 w-4"/>Check activation status</button></section></div>;
  }

  return <div className="mx-auto max-w-2xl py-8"><section className="rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700"><ShieldCheck className="h-6 w-6"/></div><h1 className="mt-5 text-2xl font-bold tracking-tight text-neutral-950">Complete your rehabilitation onboarding</h1><p className="mt-3 text-sm leading-6 text-neutral-600">Your patient account is active, but the required assessment, programme or payment steps are not complete yet.</p><button type="button" onClick={() => navigate('/register')} className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white">Continue onboarding</button></section></div>;
}
