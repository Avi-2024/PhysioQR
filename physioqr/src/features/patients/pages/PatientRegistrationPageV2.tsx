import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  HeartPulse,
  MapPin,
} from 'lucide-react';
import apiClient from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { formatCurrency } from '@/lib/formatters';
import { useAuthStore } from '@/stores/auth.store';
import type { AuthUser } from '@/types';

type ApiRecord = Record<string, unknown>;

const STEPS = [
  { id: 1, label: 'Details' },
  { id: 2, label: 'Verify' },
  { id: 3, label: 'Consent' },
  { id: 4, label: 'Assessment' },
  { id: 5, label: 'Programme' },
  { id: 6, label: 'Payment' },
];

const basicSchema = z.object({
  fullName: z.string().min(2, 'Enter your full name'),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  age: z.coerce.number().min(5, 'Age must be at least 5').max(110, 'Enter a valid age'),
  gender: z.enum(['male', 'female', 'other']),
  city: z.string().optional(),
});

const otpSchema = z.object({
  mobile: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number'),
  otp: z.string().min(4, 'Enter the OTP').max(10, 'OTP is too long'),
});

type BasicForm = z.infer<typeof basicSchema>;
type OtpForm = z.infer<typeof otpSchema>;

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

export default function PatientRegistrationPageV2() {
  const [searchParams] = useSearchParams();
  const doctorCode = searchParams.get('doctor') || '';
  const scanId = searchParams.get('scanId') || '';
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const [step, setStep] = useState(1);
  const [patient, setPatient] = useState<ApiRecord>({});
  const [selectedCategory, setSelectedCategory] = useState<ApiRecord>({});
  const [assessment, setAssessment] = useState<Record<string, unknown>>({});
  const [assessmentResult, setAssessmentResult] = useState<ApiRecord | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [error, setError] = useState('');

  const basicForm = useForm<BasicForm>({ resolver: zodResolver(basicSchema) });
  const otpForm = useForm<OtpForm>({ resolver: zodResolver(otpSchema) });

  const categoriesQuery = useQuery({
    queryKey: ['pain-categories'],
    queryFn: async () => (await apiClient.get('/assessments/categories')).data,
  });

  const questionsQuery = useQuery({
    queryKey: ['assessment-questions', 'common'],
    enabled: step >= 4,
    queryFn: async () => (await apiClient.get('/assessments/questions')).data,
  });

  const categories = extractItems(categoriesQuery.data);
  const questions = extractItems(questionsQuery.data);
  const selectedCategoryId = text(selectedCategory._id || selectedCategory.id);
  const hasRedFlag = Boolean(assessmentResult?.hasRedFlag);

  const quoteQuery = useQuery({
    queryKey: ['patient-onboarding-quote', selectedCategoryId],
    enabled: step >= 5 && Boolean(selectedCategoryId) && otpVerified && !hasRedFlag,
    queryFn: async () => (await apiClient.get('/patients/me/onboarding-quote', { params: { painCategoryId: selectedCategoryId } })).data,
  });

  const quote = asRecord(quoteQuery.data);
  const quoteProgram = asRecord(quote.program);
  const quoteDoctor = asRecord(quote.doctor);
  const pricing = asRecord(quote.pricing);
  const payable = Number(pricing.finalAmount || 0);

  const registerMutation = useMutation({
    mutationFn: async (data: BasicForm & { mobile: string }) => apiClient.post('/patients/register', {
      doctorCode,
      scanId: scanId || undefined,
      fullName: data.fullName,
      mobile: data.mobile,
      email: data.email || undefined,
      age: data.age,
      gender: data.gender,
      city: data.city || undefined,
    }),
    onSuccess: (response) => setPatient(asRecord(asRecord(response.data).patient)),
  });

  const sendOtpMutation = useMutation({
    mutationFn: async (mobile: string) => apiClient.post('/auth/send-otp', { mobile, purpose: 'registration' }),
    onSuccess: () => setOtpSent(true),
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async (values: OtpForm) => apiClient.post('/auth/verify-otp', {
      mobile: values.mobile,
      otp: values.otp,
      purpose: 'registration',
    }),
    onSuccess: (response) => {
      const data = asRecord(response.data);
      const patientPayload = asRecord(data.patient);
      const token = text(data.accessToken || data.token);
      if (!token || !patientPayload.id) {
        setError('OTP verified, but the patient account could not be started. Please try again.');
        return;
      }
      const authUser: AuthUser = {
        id: text(patientPayload.id),
        name: text(patientPayload.fullName, 'Patient'),
        email: text(patientPayload.email),
        mobile: text(patientPayload.mobile),
        role: 'patient',
      };
      login(authUser, token);
      setPatient(patientPayload);
      setOtpVerified(true);
      setError('');
    },
  });

  const consentMutation = useMutation({
    mutationFn: async () => apiClient.post('/patients/consent', {
      termsAccepted: true,
      privacyAccepted: true,
      medicalDisclaimerAccepted: true,
      exerciseConsentAccepted: true,
      reminderConsentAccepted: true,
      selectedLanguage: 'en',
    }),
    onSuccess: () => {
      setConsentAccepted(true);
      nextStep();
    },
  });

  const assessmentMutation = useMutation({
    mutationFn: async () => apiClient.post('/assessments/submit', {
      patientId: text(patient.id || patient._id),
      painCategoryId: selectedCategoryId,
      answers: buildAssessmentAnswers(questions, assessment),
    }),
    onSuccess: (response) => {
      setAssessmentResult(asRecord(response.data));
      setError('');
      nextStep();
    },
  });

  const paymentMutation = useMutation({
    mutationFn: async () => {
      const orderResponse = await apiClient.post('/payments/create-order', {
        patientId: text(patient.id || patient._id),
        programId: text(quoteProgram.id),
        doctorId: text(quoteDoctor.id),
        idempotencyKey: `patient-${text(patient.id || patient._id)}-${text(quoteProgram.id)}-${Date.now()}`,
      });
      const order = asRecord(orderResponse.data);
      if (order.key) {
        await loadRazorpayScript();
        return openRazorpayCheckout({ order, patient, onVerify: verifyGatewayPayment });
      }
      return verifyGatewayPayment({
        razorpay_order_id: text(order.orderId),
        razorpay_payment_id: `pay_mock_${Date.now()}`,
        razorpay_signature: 'mock_signature',
      });
    },
    onSuccess: () => navigate('/payment-success'),
    onError: () => navigate('/payment-failed'),
  });

  const nextStep = () => setStep((current) => Math.min(current + 1, 6));
  const prevStep = () => setStep((current) => Math.max(current - 1, 1));
  const patientId = text(patient.id || patient._id);

  const handleBasicSubmit = async () => {
    setError('');
    nextStep();
  };

  const handleSendOtp = async () => {
    setError('');
    if (!(await otpForm.trigger('mobile'))) return;
    await sendOtpMutation.mutateAsync(otpForm.getValues('mobile'));
  };

  const handleVerifyOtp = async () => {
    setError('');
    if (!(await otpForm.trigger(['mobile', 'otp']))) return;
    const basicValues = basicForm.getValues();
    if (!patientId) {
      await registerMutation.mutateAsync({ ...basicValues, mobile: otpForm.getValues('mobile') });
    }
    await verifyOtpMutation.mutateAsync(otpForm.getValues());
  };

  const handleCategoryChange = (categoryId: string) => {
    const category = categories.find((item) => text(item._id || item.id) === categoryId) || {};
    setSelectedCategory(category);
    setError('');
  };

  const handleAssessmentSubmit = async () => {
    setError('');
    if (!selectedCategoryId) {
      setError('Please select where you are experiencing pain.');
      return;
    }
    if (questionsQuery.isLoading) return;
    if (!questions.length) {
      setError('Assessment questions are not configured yet. Please contact support.');
      return;
    }
    if (!buildAssessmentAnswers(questions, assessment).length) {
      setError('Please answer the assessment questions before submitting.');
      return;
    }
    await assessmentMutation.mutateAsync();
  };

  const verifyGatewayPayment = async (payload: { razorpay_order_id:string; razorpay_payment_id:string; razorpay_signature:string }) => {
    await apiClient.post('/payments/verify', payload);
  };

  const requestError = error || mutationError(
    registerMutation.error || sendOtpMutation.error || verifyOtpMutation.error || consentMutation.error ||
    assessmentMutation.error || quoteQuery.error || paymentMutation.error,
  );

  return (
    <div className="min-h-screen bg-neutral-50 px-3 py-5 sm:px-4 sm:py-8">
      <div className="mx-auto max-w-3xl">
        <header className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-600 text-lg font-bold text-white">+</div>
            <div className="min-w-0">
              <h1 className="font-bold text-neutral-950">PhysioQR Patient Registration</h1>
              <p className="truncate text-xs text-neutral-500">{doctorCode ? `Referred by doctor ${doctorCode}` : 'Secure patient onboarding'}</p>
            </div>
          </div>
          <span className="hidden rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700 sm:inline">Step {step} of 6</span>
        </header>

        <main className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
          <div className="border-b border-neutral-100 px-4 pt-5 sm:px-7">
            <StepIndicator step={step} />
          </div>

          <div className="p-4 sm:p-7">
            {requestError && (
              <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                {requestError}
              </div>
            )}

            {step === 1 && (
              <form onSubmit={basicForm.handleSubmit(handleBasicSubmit)} className="space-y-5">
                <SectionTitle title="Tell us about yourself" description="We only need a few details to create your patient profile." />
                <Field label="Full name" error={basicForm.formState.errors.fullName?.message}>
                  <input {...basicForm.register('fullName')} className={inputClass} placeholder="e.g. Ramesh Kumar" />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Email" error={basicForm.formState.errors.email?.message}>
                    <input {...basicForm.register('email')} type="email" className={inputClass} placeholder="you@example.com" />
                  </Field>
                  <Field label="Age" error={basicForm.formState.errors.age?.message}>
                    <input {...basicForm.register('age')} type="number" className={inputClass} placeholder="35" />
                  </Field>
                  <Field label="City"><input {...basicForm.register('city')} className={inputClass} placeholder="Your city" /></Field>
                  <Field label="Gender" error={basicForm.formState.errors.gender?.message}>
                    <select {...basicForm.register('gender')} defaultValue="" className={inputClass}>
                      <option value="" disabled>Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </Field>
                </div>
                <PrimaryButton type="submit">Continue to mobile verification</PrimaryButton>
              </form>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <SectionTitle title="Verify your mobile number" description="We will send a one-time verification code to your mobile." />
                <Field label="Mobile number" error={otpForm.formState.errors.mobile?.message}>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input {...otpForm.register('mobile')} type="tel" inputMode="numeric" className={inputClass} placeholder="10-digit mobile number" />
                    <button onClick={handleSendOtp} type="button" disabled={sendOtpMutation.isPending} className="min-h-12 shrink-0 rounded-xl border border-neutral-300 bg-white px-5 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 disabled:opacity-60">
                      {sendOtpMutation.isPending ? 'Sending...' : otpSent ? 'Resend OTP' : 'Send OTP'}
                    </button>
                  </div>
                </Field>
                {otpSent && (
                  <Field label="Enter OTP" error={otpForm.formState.errors.otp?.message}>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input {...otpForm.register('otp')} inputMode="numeric" maxLength={10} className={cn(inputClass, 'tracking-[0.2em]')} placeholder="••••••" />
                      <button onClick={handleVerifyOtp} type="button" disabled={verifyOtpMutation.isPending || registerMutation.isPending} className="min-h-12 shrink-0 rounded-xl bg-primary-600 px-6 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60">
                        {verifyOtpMutation.isPending ? 'Verifying...' : 'Verify OTP'}
                      </button>
                    </div>
                  </Field>
                )}
                {otpVerified && <SuccessBox>Mobile number verified successfully.</SuccessBox>}
                <NavButtons onBack={prevStep} onNext={nextStep} nextDisabled={!otpVerified} />
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <SectionTitle title="Consent & medical disclaimer" description="Please review this information before starting your assessment." />
                <div className="space-y-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm leading-6 text-neutral-600">
                  <p><strong className="text-neutral-900">Medical disclaimer:</strong> This programme is not emergency medical care. Stop if you experience severe pain, chest discomfort, dizziness, or worsening symptoms.</p>
                  <p><strong className="text-neutral-900">Programme consent:</strong> You confirm that the information you provide is accurate and consent to programme access and reminders.</p>
                </div>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-neutral-200 p-4 text-sm text-neutral-700 hover:bg-neutral-50">
                  <input type="checkbox" checked={consentAccepted} onChange={(event) => setConsentAccepted(event.target.checked)} className="mt-0.5 h-5 w-5 rounded text-primary-600" />
                  <span>I accept the terms, privacy policy, medical disclaimer, and exercise programme consent.</span>
                </label>
                <NavButtons onBack={prevStep} onNext={() => consentMutation.mutate()} nextDisabled={!consentAccepted || consentMutation.isPending} nextLabel={consentMutation.isPending ? 'Saving...' : 'Accept & Continue'} />
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700"><ClipboardList className="h-5 w-5" /></div>
                  <SectionTitle title="Health assessment" description="First choose your pain area, then answer the common assessment questions below." />
                </div>

                <section className="rounded-2xl border border-primary-200 bg-primary-50/40 p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-primary-700 ring-1 ring-primary-100"><MapPin className="h-4 w-4" /></div>
                    <div className="min-w-0 flex-1">
                      <label htmlFor="pain-category" className="block text-sm font-bold text-neutral-950">Where are you experiencing pain? <span className="text-rose-500">*</span></label>
                      <p className="mt-1 text-xs leading-5 text-neutral-600">Select one pain area. This only helps us choose the right rehabilitation programme; the assessment stays common for every patient.</p>
                      <div className="relative mt-3">
                        <select
                          id="pain-category"
                          value={selectedCategoryId}
                          onChange={(event) => handleCategoryChange(event.target.value)}
                          disabled={categoriesQuery.isLoading || categoriesQuery.isError}
                          className="min-h-12 w-full appearance-none rounded-xl border border-neutral-300 bg-white px-4 pr-11 text-base font-medium text-neutral-900 outline-none transition focus:border-primary-500 focus:ring-4 focus:ring-primary-100 disabled:bg-neutral-100"
                        >
                          <option value="">{categoriesQuery.isLoading ? 'Loading pain areas...' : 'Select your pain area'}</option>
                          {categories.map((category) => (
                            <option key={text(category._id || category.id)} value={text(category._id || category.id)}>{text(category.name, 'Unnamed category')}</option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-400" />
                      </div>
                      {categoriesQuery.isError && <p className="mt-2 text-xs font-medium text-rose-600">Pain areas could not be loaded. Please retry the page.</p>}
                      {selectedCategoryId && <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-primary-700 ring-1 ring-primary-100"><Check className="h-3.5 w-3.5" />Selected: {text(selectedCategory.name)}</div>}
                    </div>
                  </div>
                </section>

                <section>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-neutral-950">Common assessment questions</h3>
                      <p className="mt-1 text-xs text-neutral-500">Answer based on how you feel today.</p>
                    </div>
                    {!questionsQuery.isLoading && questions.length > 0 && <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-600">{questions.length} question{questions.length === 1 ? '' : 's'}</span>}
                  </div>

                  {questionsQuery.isLoading && <div className="rounded-xl border border-neutral-200 p-5 text-sm text-neutral-500">Loading assessment questions...</div>}
                  {!questionsQuery.isLoading && questions.length === 0 && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Assessment questions are not configured yet. Please contact support.</div>}
                  <div className="space-y-3">
                    {questions.map((question, index) => (
                      <QuestionInput
                        key={text(question._id || question.id)}
                        index={index}
                        question={question}
                        value={assessment[text(question._id || question.id)]}
                        onChange={(value) => setAssessment((current) => ({ ...current, [text(question._id || question.id)]: value }))}
                      />
                    ))}
                  </div>
                </section>

                <NavButtons onBack={prevStep} onNext={handleAssessmentSubmit} nextDisabled={assessmentMutation.isPending || questionsQuery.isLoading || !questions.length || !selectedCategoryId} nextLabel={assessmentMutation.isPending ? 'Submitting...' : 'Submit Assessment'} />
              </div>
            )}

            {step === 5 && (
              <div className="space-y-5">
                {hasRedFlag ? (
                  <div className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
                    <AlertTriangle className="mx-auto h-11 w-11 text-rose-600" />
                    <h2 className="text-lg font-bold text-rose-900">Clinical safety review required</h2>
                    <p className="text-sm text-rose-700">Your assessment contains answers that need clinical review before programme activation.</p>
                    <button onClick={() => navigate('/')} className="mt-3 rounded-xl bg-rose-600 px-6 py-3 text-sm font-semibold text-white">Return home</button>
                  </div>
                ) : (
                  <>
                    <SectionTitle title="Your assigned programme" description="Matched using your selected pain area and common assessment." />
                    <div className="rounded-2xl border border-primary-200 bg-primary-50/50 p-5">
                      {quoteQuery.isLoading ? <p className="text-sm text-primary-700">Loading programme and price...</p> : (
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <h3 className="font-bold text-neutral-950">{text(quoteProgram.name, 'Programme not configured')}</h3>
                            <p className="mt-1 text-sm text-neutral-600">{text(quoteProgram.description, 'Doctor-guided rehabilitation programme')}</p>
                            <div className="mt-3 flex flex-wrap gap-2"><Badge>{text(quoteProgram.durationDays, '-')} days</Badge><Badge>{labelize(quoteProgram.difficultyLevel || 'beginner')}</Badge><Badge>{text(quoteDoctor.fullName, 'Doctor')}</Badge><Badge>{text(selectedCategory.name, 'Pain area')}</Badge></div>
                          </div>
                          <div className="shrink-0 sm:text-right"><p className="text-2xl font-bold text-primary-700">{formatCurrency(payable)}</p><p className="text-xs text-neutral-500">Payable amount</p></div>
                        </div>
                      )}
                    </div>
                    <NavButtons onBack={prevStep} onNext={nextStep} nextDisabled={!quoteProgram.id || quoteQuery.isLoading} nextLabel="Proceed to Payment" />
                  </>
                )}
              </div>
            )}

            {step === 6 && (
              <div className="space-y-5">
                <SectionTitle title="Complete payment" description="Secure payment activates your rehabilitation programme." />
                <div className="space-y-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                  <AmountRow label="Programme Fee" value={Number(pricing.originalAmount || payable)} />
                  <AmountRow label="Discount" value={-Number(pricing.discountAmount || 0)} />
                  <div className="h-px bg-neutral-200" />
                  <AmountRow label="Total Payable" value={payable} strong />
                </div>
                <NavButtons onBack={prevStep} onNext={() => paymentMutation.mutate()} nextDisabled={paymentMutation.isPending || !payable} nextLabel={paymentMutation.isPending ? 'Processing...' : `Pay ${formatCurrency(payable)} & Activate`} />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function SectionTitle({ title, description }: { title: string; description: string }) {
  return <div className="min-w-0"><h2 className="text-xl font-bold tracking-tight text-neutral-950">{title}</h2><p className="mt-1 text-sm leading-6 text-neutral-500">{description}</p></div>;
}

function StepIndicator({ step }:{ step:number }) {
  return (
    <div className="mb-5 overflow-x-auto pb-1">
      <div className="flex min-w-max items-center">
        {STEPS.map((item, index) => (
          <React.Fragment key={item.id}>
            <div className="flex items-center gap-2">
              <div className={cn('flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all', step > item.id && 'bg-emerald-600 text-white', step === item.id && 'bg-primary-600 text-white ring-4 ring-primary-100', step < item.id && 'bg-neutral-100 text-neutral-400')}>{step > item.id ? <Check className="h-4 w-4" /> : item.id}</div>
              <span className={cn('text-xs font-semibold', step === item.id ? 'text-primary-700' : step > item.id ? 'text-neutral-600' : 'text-neutral-400')}>{item.label}</span>
            </div>
            {index < STEPS.length - 1 && <div className={cn('mx-3 h-0.5 w-7 sm:w-10', step > item.id ? 'bg-emerald-300' : 'bg-neutral-200')} />}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function QuestionInput({ question, value, onChange, index }:{ question:ApiRecord; value:unknown; onChange:(value:unknown)=>void; index:number }) {
  const type = text(question.questionType, 'text');
  const options = Array.isArray(question.options) ? (question.options as unknown[]).map((item) => asRecord(item)) : [];
  const questionText = text(question.questionText, `Question ${index + 1}`);

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 sm:p-5">
      <div className="flex gap-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-bold text-neutral-600">{index + 1}</div>
        <div className="min-w-0 flex-1">
          <label className="block text-sm font-semibold leading-6 text-neutral-900">{questionText}</label>
          <div className="mt-3">
            {type === 'pain_scale' ? (
              <div>
                <div className="mb-2 flex justify-between text-xs text-neutral-500"><span>No pain</span><span>Worst pain</span></div>
                <input type="range" min="0" max="10" step="1" value={Number(value ?? 0)} onChange={(event) => onChange(Number(event.target.value))} className="w-full accent-primary-600" />
                <div className="mt-2 text-center"><span className="inline-flex min-w-10 justify-center rounded-full bg-primary-50 px-3 py-1 text-sm font-bold text-primary-700">{Number(value ?? 0)}/10</span></div>
              </div>
            ) : type === 'number' ? (
              <input type="number" value={text(value)} onChange={(event) => onChange(event.target.value === '' ? '' : Number(event.target.value))} className={inputClass} placeholder="Enter a number" />
            ) : type === 'yes_no' ? (
              <div className="grid grid-cols-2 gap-2">
                {['yes', 'no'].map((option) => <button key={option} type="button" onClick={() => onChange(option)} className={cn('min-h-11 rounded-xl border px-4 text-sm font-semibold capitalize transition', value === option ? 'border-primary-500 bg-primary-50 text-primary-700 ring-2 ring-primary-100' : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50')}>{option}</button>)}
              </div>
            ) : type === 'single_choice' ? (
              <div className="relative">
                <select value={text(value)} onChange={(event) => onChange(event.target.value)} className={cn(inputClass, 'min-h-12 appearance-none pr-10 text-base')}>
                  <option value="">Select an answer</option>
                  {options.map((option, optionIndex) => { const optionValue = text(option.value || option.label); return <option key={`${optionValue}-${optionIndex}`} value={optionValue}>{text(option.label || option.value)}</option>; })}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              </div>
            ) : type === 'multiple_choice' ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {options.map((option, optionIndex) => {
                  const optionValue = text(option.value || option.label);
                  const current = Array.isArray(value) ? value.map(String) : [];
                  const checked = current.includes(optionValue);
                  return <label key={`${optionValue}-${optionIndex}`} className={cn('flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm transition', checked ? 'border-primary-300 bg-primary-50 text-primary-800' : 'border-neutral-200 hover:bg-neutral-50')}><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked ? [...current, optionValue] : current.filter((item) => item !== optionValue))} className="h-4 w-4 rounded text-primary-600" /><span>{text(option.label || option.value)}</span></label>;
                })}
              </div>
            ) : (
              <input value={text(value)} onChange={(event) => onChange(event.target.value)} className={inputClass} placeholder="Type your answer" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function buildAssessmentAnswers(questions:ApiRecord[], assessment:Record<string, unknown>) {
  return questions
    .map((question) => ({ question:text(question._id || question.id), answer:assessment[text(question._id || question.id)] }))
    .filter((item) => item.answer !== undefined && item.answer !== '' && (!Array.isArray(item.answer) || item.answer.length > 0));
}

function loadRazorpayScript() {
  return new Promise<void>((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once:true });
      existing.addEventListener('error', () => reject(new Error('Unable to load Razorpay checkout.')), { once:true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Unable to load Razorpay checkout.'));
    document.body.appendChild(script);
  });
}

function openRazorpayCheckout({ order, patient, onVerify }:{ order:ApiRecord; patient:ApiRecord; onVerify:(payload:{razorpay_order_id:string;razorpay_payment_id:string;razorpay_signature:string})=>Promise<void> }) {
  return new Promise<void>((resolve, reject) => {
    const RazorpayConstructor = window.Razorpay;
    if (!RazorpayConstructor) return reject(new Error('Razorpay checkout script is not loaded.'));
    const checkout = new RazorpayConstructor({
      key: order.key,
      amount: order.amount,
      currency: order.currency || 'INR',
      name: 'PhysioQR',
      description: 'Digital rehabilitation programme',
      order_id: order.orderId,
      prefill: { name:text(patient.fullName || patient.name), contact:text(patient.mobile), email:text(patient.email) },
      handler: async (response:ApiRecord) => {
        try {
          await onVerify({
            razorpay_order_id:text(response.razorpay_order_id),
            razorpay_payment_id:text(response.razorpay_payment_id),
            razorpay_signature:text(response.razorpay_signature),
          });
          resolve();
        } catch (err) { reject(err); }
      },
      modal: { ondismiss:() => reject(new Error('Payment cancelled')) },
    });
    checkout.open();
  });
}

const inputClass = 'min-h-12 w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-base text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-primary-500 focus:ring-4 focus:ring-primary-100';

function Field({ label, error, children }:{ label:string; error?:string; children:React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-sm font-semibold text-neutral-700">{label}</span>{children}{error && <p className="mt-1.5 text-xs font-medium text-rose-600">{error}</p>}</label>;
}

function PrimaryButton({ children, loading, type='button' }:{ children:React.ReactNode; loading?:boolean; type?:'button'|'submit' }) {
  return <button type={type} disabled={loading} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60">{loading ? 'Please wait...' : children}<ChevronRight className="h-4 w-4" /></button>;
}

function NavButtons({ onBack, onNext, nextDisabled, nextLabel='Continue' }:{ onBack:()=>void; onNext:()=>void; nextDisabled?:boolean; nextLabel?:string }) {
  return <div className="flex flex-col gap-3 border-t border-neutral-100 pt-5 sm:flex-row"><button onClick={onBack} type="button" className="flex min-h-12 items-center justify-center gap-1 rounded-xl border border-neutral-300 bg-white px-5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"><ChevronLeft className="h-4 w-4" />Back</button><button onClick={onNext} disabled={nextDisabled} type="button" className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50">{nextLabel}<ChevronRight className="h-4 w-4" /></button></div>;
}

function SuccessBox({ children }:{ children:React.ReactNode }) {
  return <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700"><Check className="h-4 w-4" />{children}</div>;
}

function Badge({ children }:{ children:React.ReactNode }) {
  return <span className="rounded-full border border-primary-200 bg-white px-2.5 py-1 text-xs font-medium text-primary-700">{children}</span>;
}

function AmountRow({ label, value, strong }:{ label:string; value:number; strong?:boolean }) {
  return <div className={cn('flex justify-between gap-4 text-sm', strong && 'text-base font-bold')}><span className="text-neutral-600">{label}</span><span className={strong ? 'text-primary-700' : 'font-medium text-neutral-900'}>{formatCurrency(value)}</span></div>;
}

function extractItems(payload:unknown):ApiRecord[] {
  if (Array.isArray(payload)) return payload as ApiRecord[];
  const record = asRecord(payload);
  if (Array.isArray(record.items)) return record.items as ApiRecord[];
  if (Array.isArray(record.data)) return record.data as ApiRecord[];
  return [];
}

function asRecord(value:unknown):ApiRecord {
  return value && typeof value === 'object' ? value as ApiRecord : {};
}

function text(value:unknown, fallback='') {
  return value === undefined || value === null || value === '' ? fallback : String(value);
}

function labelize(value:unknown) {
  return text(value, '-').replace(/_/g, ' ');
}

function mutationError(error:unknown) {
  if (!error) return '';
  const response = asRecord(asRecord(error).response);
  const data = asRecord(response.data);
  return text(data.message || asRecord(error).message, 'Request failed.');
}
