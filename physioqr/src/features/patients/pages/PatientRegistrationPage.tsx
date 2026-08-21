import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import apiClient from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { formatCurrency } from '@/lib/formatters';
import { useAuthStore } from '@/stores/auth.store';
import type { AuthUser } from '@/types';

type ApiRecord = Record<string, unknown>;

const STEPS = [
  { id: 1, label: 'Basic Details' },
  { id: 2, label: 'Mobile Verify' },
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

export default function PatientRegistrationPage() {
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
    mutationFn: async (values: OtpForm) => apiClient.post('/auth/verify-otp', { mobile: values.mobile, otp: values.otp, purpose: 'registration' }),
    onSuccess: (response) => {
      const data = asRecord(response.data);
      const patientPayload = asRecord(data.patient);
      const token = text(data.accessToken || data.token);
      if (!token || !patientPayload.id) {
        setError('OTP verified, but patient account was not found. Complete registration first.');
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

  const handleBasicSubmit = async (data: BasicForm) => {
    setError('');
    const mobile = otpForm.getValues('mobile');
    if (!mobile) {
      setError('Enter mobile number in the OTP step first, or continue and add it there.');
      nextStep();
      return;
    }
    await registerMutation.mutateAsync({ ...data, mobile });
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
    if (!patientId) await registerMutation.mutateAsync({ ...basicValues, mobile: otpForm.getValues('mobile') });
    await verifyOtpMutation.mutateAsync(otpForm.getValues());
  };

  const handleAssessmentSubmit = async () => {
    setError('');
    if (!selectedCategoryId) {
      setError('Choose your pain category inside the assessment.');
      return;
    }
    if (questionsQuery.isLoading) return;
    if (!questions.length) {
      setError('Assessment questions are not configured yet. Please contact support.');
      return;
    }
    if (!buildAssessmentAnswers(questions, assessment).length) {
      setError('Answer the assessment questions before submitting.');
      return;
    }
    await assessmentMutation.mutateAsync();
  };

  const verifyGatewayPayment = async (payload: { razorpay_order_id:string; razorpay_payment_id:string; razorpay_signature:string }) => {
    await apiClient.post('/payments/verify', payload);
  };

  return <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-blue-50 px-4 py-6 sm:py-8">
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 text-center"><div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 text-lg font-bold text-white">+</div><h1 className="text-xl font-bold text-neutral-900">PhysioQR</h1><p className="text-sm text-neutral-500">Referred by Doctor Code: <span className="font-semibold text-primary-600">{doctorCode || 'Not provided'}</span></p></div>

      <div className="min-w-0 rounded-2xl bg-white p-4 shadow-modal sm:p-6 md:p-8">
        <StepIndicator step={step}/>
        {(error || mutationError(registerMutation.error || sendOtpMutation.error || verifyOtpMutation.error || consentMutation.error || assessmentMutation.error || quoteQuery.error || paymentMutation.error)) && <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error || mutationError(registerMutation.error || sendOtpMutation.error || verifyOtpMutation.error || consentMutation.error || assessmentMutation.error || quoteQuery.error || paymentMutation.error)}</div>}

        {step === 1 && <form onSubmit={basicForm.handleSubmit(handleBasicSubmit)} className="space-y-4"><div><h2 className="text-lg font-bold text-neutral-900">Personal Details</h2><p className="text-sm text-neutral-500">Tell us a little about yourself.</p></div><Field label="Full Name" error={basicForm.formState.errors.fullName?.message}><input {...basicForm.register('fullName')} className={inputClass} placeholder="e.g. Ramesh Kumar"/></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Email" error={basicForm.formState.errors.email?.message}><input {...basicForm.register('email')} type="email" className={inputClass} placeholder="you@example.com"/></Field><Field label="Age" error={basicForm.formState.errors.age?.message}><input {...basicForm.register('age')} type="number" className={inputClass} placeholder="35"/></Field></div><div className="grid gap-4 sm:grid-cols-2"><Field label="City"><input {...basicForm.register('city')} className={inputClass} placeholder="City"/></Field><Field label="Gender" error={basicForm.formState.errors.gender?.message}><div className="flex flex-wrap gap-4 pt-2">{['male','female','other'].map((gender) => <label key={gender} className="flex items-center gap-2 text-sm capitalize"><input {...basicForm.register('gender')} type="radio" value={gender}/>{gender}</label>)}</div></Field></div><PrimaryButton type="submit" loading={registerMutation.isPending}>Continue</PrimaryButton></form>}

        {step === 2 && <div className="space-y-4"><div><h2 className="text-lg font-bold text-neutral-900">Verify Mobile Number</h2><p className="text-sm text-neutral-500">Patient registration and login use OTP verification.</p></div><Field label="Mobile Number" error={otpForm.formState.errors.mobile?.message}><div className="flex flex-col gap-2 sm:flex-row"><input {...otpForm.register('mobile')} type="tel" className={inputClass} placeholder="10-digit mobile number"/><button onClick={handleSendOtp} type="button" disabled={sendOtpMutation.isPending} className="min-h-11 rounded-lg bg-neutral-100 px-4 py-2.5 text-sm font-semibold text-neutral-700">{otpSent ? 'Resend' : 'Send OTP'}</button></div></Field>{otpSent && <Field label="OTP" error={otpForm.formState.errors.otp?.message}><div className="flex flex-col gap-2 sm:flex-row"><input {...otpForm.register('otp')} maxLength={10} className={inputClass} placeholder="Enter OTP"/><button onClick={handleVerifyOtp} type="button" disabled={verifyOtpMutation.isPending || registerMutation.isPending} className="min-h-11 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white">Verify</button></div></Field>}{otpVerified && <SuccessBox>Mobile verified and patient session started.</SuccessBox>}<NavButtons onBack={prevStep} onNext={nextStep} nextDisabled={!otpVerified}/></div>}

        {step === 3 && <div className="space-y-4"><div><h2 className="text-lg font-bold text-neutral-900">Terms & Medical Consent</h2><p className="text-sm text-neutral-500">Please review and accept before continuing.</p></div><div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600"><p className="font-semibold text-neutral-800">Medical Disclaimer</p><p>This exercise programme is not emergency medical care. Stop if you experience severe pain, chest discomfort, dizziness, or worsening symptoms.</p><p className="font-semibold text-neutral-800">Programme Consent</p><p>You consent to exercise programme access, reminders, and confirm that submitted health information is accurate.</p></div><label className="flex items-start gap-3 text-sm text-neutral-700"><input type="checkbox" checked={consentAccepted} onChange={(event) => setConsentAccepted(event.target.checked)} className="mt-0.5 h-4 w-4 rounded text-primary-600"/>I accept the terms, privacy policy, medical disclaimer, and exercise programme consent.</label><NavButtons onBack={prevStep} onNext={() => consentMutation.mutate()} nextDisabled={!consentAccepted || consentMutation.isPending} nextLabel={consentMutation.isPending ? 'Saving...' : 'Accept & Continue'}/></div>}

        {step === 4 && <div className="space-y-5"><div><h2 className="text-lg font-bold text-neutral-900">Health Assessment</h2><p className="text-sm text-neutral-500">This is one common assessment for every patient. Start by choosing the area that best matches your current pain.</p></div><section className="rounded-xl border border-primary-200 bg-primary-50 p-4"><p className="text-sm font-bold text-primary-950">Where are you experiencing pain? *</p><p className="mt-1 text-xs text-primary-700">Choose one pain category. This choice is used later to select the relevant rehabilitation programme; it does not change the assessment questions.</p><div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">{categoriesQuery.isLoading && <div className="text-sm text-neutral-500">Loading pain categories...</div>}{categories.map((category) => <button key={text(category._id || category.id)} onClick={() => setSelectedCategory(category)} type="button" className={cn('rounded-lg border-2 px-3 py-3 text-left text-sm font-medium transition-all', selectedCategoryId === text(category._id || category.id) ? 'border-primary-500 bg-white text-primary-700' : 'border-primary-100 bg-white text-neutral-700 hover:border-primary-300')}>{text(category.name)}</button>)}</div></section>{questionsQuery.isLoading && <div className="text-sm text-neutral-500">Loading common assessment questions...</div>}{!questionsQuery.isLoading && questions.length === 0 && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Assessment questions are not configured yet. Submission is disabled until Admin configures the common assessment.</div>}{questions.map((question) => <QuestionInput key={text(question._id || question.id)} question={question} value={assessment[text(question._id || question.id)]} onChange={(value) => setAssessment((current) => ({ ...current, [text(question._id || question.id)]: value }))}/>)}<NavButtons onBack={prevStep} onNext={handleAssessmentSubmit} nextDisabled={assessmentMutation.isPending || questionsQuery.isLoading || !questions.length || !selectedCategoryId} nextLabel={assessmentMutation.isPending ? 'Submitting...' : 'Submit Assessment'}/></div>}

        {step === 5 && <div className="space-y-4">{hasRedFlag ? <div className="space-y-3 rounded-xl border-2 border-danger-300 bg-danger-50 p-6 text-center"><AlertTriangle className="mx-auto h-12 w-12 text-danger-600"/><h2 className="text-lg font-bold text-danger-900">Clinical Safety Review Required</h2><p className="text-sm text-danger-700">Your common assessment contains red-flag answers. The programme will not activate until the review is cleared.</p><button onClick={() => navigate('/')} className="mt-4 rounded-lg bg-danger-600 px-6 py-2.5 text-sm font-semibold text-white">Return Home</button></div> : <><div><h2 className="text-lg font-bold text-neutral-900">Your Assigned Programme</h2><p className="text-sm text-neutral-500">Matched using the pain category you selected inside the common assessment.</p></div><div className="space-y-3 rounded-xl border-2 border-primary-200 bg-primary-50 p-5">{quoteQuery.isLoading ? <div className="text-sm text-primary-700">Loading programme and price...</div> : <div className="flex flex-col items-start justify-between gap-4 sm:flex-row"><div className="min-w-0"><h3 className="font-bold text-neutral-900">{text(quoteProgram.name, 'Programme not configured')}</h3><p className="mt-1 text-sm text-neutral-600">{text(quoteProgram.description, 'Doctor-guided rehabilitation programme')}</p><div className="mt-2 flex flex-wrap gap-2"><Badge>{text(quoteProgram.durationDays, '-')} days</Badge><Badge>{labelize(quoteProgram.difficultyLevel || 'beginner')}</Badge><Badge>{text(quoteDoctor.fullName, 'Doctor')}</Badge><Badge>{text(selectedCategory.name, 'Pain category')}</Badge></div></div><div className="text-left sm:text-right"><p className="text-2xl font-bold text-primary-600">{formatCurrency(payable)}</p><p className="text-xs text-neutral-500">Payable amount</p></div></div>}</div><NavButtons onBack={prevStep} onNext={nextStep} nextDisabled={!quoteProgram.id || quoteQuery.isLoading} nextLabel="Proceed to Payment"/></>}</div>}

        {step === 6 && <div className="space-y-4"><div><h2 className="text-lg font-bold text-neutral-900">Complete Payment</h2><p className="text-sm text-neutral-500">Secure payment activates your programme.</p></div><div className="space-y-2 rounded-lg border border-neutral-200 bg-neutral-50 p-4"><AmountRow label="Programme Fee" value={Number(pricing.originalAmount || payable)}/><AmountRow label="Discount" value={-Number(pricing.discountAmount || 0)}/><div className="my-2 h-px bg-neutral-200"/><AmountRow label="Total Payable" value={payable} strong/></div><NavButtons onBack={prevStep} onNext={() => paymentMutation.mutate()} nextDisabled={paymentMutation.isPending || !payable} nextLabel={paymentMutation.isPending ? 'Processing...' : `Pay ${formatCurrency(payable)} & Activate`}/></div>}
      </div>
    </div>
  </div>;
}

function StepIndicator({ step }:{ step:number }) {
  return <div className="mb-8 flex items-center justify-between gap-2 overflow-x-auto pb-2">{STEPS.map((item, index) => <div key={item.id} className="flex flex-shrink-0 items-center"><div className={cn('flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-all', step > item.id && 'bg-success-600 text-white', step === item.id && 'bg-primary-600 text-white ring-4 ring-primary-100', step < item.id && 'bg-neutral-200 text-neutral-500')}>{step > item.id ? <Check className="h-4 w-4"/> : item.id}</div><span className={cn('ml-2 hidden text-xs font-medium sm:block', step === item.id ? 'text-primary-600' : 'text-neutral-400')}>{item.label}</span>{index < STEPS.length - 1 && <div className={cn('mx-3 h-px w-4 flex-shrink-0 sm:w-8', step > item.id ? 'bg-success-400' : 'bg-neutral-200')}/>}</div>)}</div>;
}

function QuestionInput({ question, value, onChange }:{ question:ApiRecord; value:unknown; onChange:(value:unknown)=>void }) {
  const type = text(question.questionType, 'text');
  const options = Array.isArray(question.options) ? (question.options as unknown[]).map((item) => asRecord(item)) : [];
  return <div className="rounded-lg border border-neutral-200 p-4"><label className="block text-sm font-semibold text-neutral-800">{text(question.questionText)}</label>{type === 'pain_scale' || type === 'number' ? <input type="number" min="0" max={type === 'pain_scale' ? 10 : undefined} value={text(value)} onChange={(event) => onChange(event.target.value === '' ? '' : Number(event.target.value))} className={cn(inputClass, 'mt-2')}/> : type === 'yes_no' ? <div className="mt-3 flex gap-4">{['yes','no'].map((option) => <label key={option} className="flex items-center gap-2 text-sm capitalize"><input type="radio" checked={value === option} onChange={() => onChange(option)}/>{option}</label>)}</div> : type === 'single_choice' ? <div className="mt-3 grid gap-2">{options.map((option, index) => { const optionValue = text(option.value || option.label); return <label key={`${optionValue}-${index}`} className="flex items-center gap-2 text-sm"><input type="radio" checked={value === optionValue} onChange={() => onChange(optionValue)}/>{text(option.label || option.value)}</label>; })}</div> : type === 'multiple_choice' ? <div className="mt-3 grid gap-2">{options.map((option, index) => { const optionValue = text(option.value || option.label); const current = Array.isArray(value) ? value.map(String) : []; return <label key={`${optionValue}-${index}`} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={current.includes(optionValue)} onChange={(event) => onChange(event.target.checked ? [...current, optionValue] : current.filter((item) => item !== optionValue))}/>{text(option.label || option.value)}</label>; })}</div> : <input value={text(value)} onChange={(event) => onChange(event.target.value)} className={cn(inputClass, 'mt-2')}/>}</div>;
}

function buildAssessmentAnswers(questions:ApiRecord[], assessment:Record<string, unknown>) {
  return questions.map((question) => ({ question:text(question._id || question.id), answer:assessment[text(question._id || question.id)] })).filter((item) => item.answer !== undefined && item.answer !== '' && (!Array.isArray(item.answer) || item.answer.length > 0));
}

function loadRazorpayScript() {
  return new Promise<void>((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) { existing.addEventListener('load', () => resolve(), { once:true }); existing.addEventListener('error', () => reject(new Error('Unable to load Razorpay checkout.')), { once:true }); return; }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'; script.async = true; script.onload = () => resolve(); script.onerror = () => reject(new Error('Unable to load Razorpay checkout.')); document.body.appendChild(script);
  });
}

function openRazorpayCheckout({ order, patient, onVerify }:{ order:ApiRecord; patient:ApiRecord; onVerify:(payload:{razorpay_order_id:string;razorpay_payment_id:string;razorpay_signature:string})=>Promise<void> }) {
  return new Promise<void>((resolve, reject) => {
    const RazorpayConstructor = window.Razorpay;
    if (!RazorpayConstructor) return reject(new Error('Razorpay checkout script is not loaded.'));
    const checkout = new RazorpayConstructor({ key:order.key, amount:order.amount, currency:order.currency || 'INR', name:'PhysioQR', description:'Digital rehabilitation programme', order_id:order.orderId, prefill:{ name:text(patient.fullName || patient.name), contact:text(patient.mobile), email:text(patient.email) }, handler:async (response:ApiRecord) => { try { await onVerify({ razorpay_order_id:text(response.razorpay_order_id), razorpay_payment_id:text(response.razorpay_payment_id), razorpay_signature:text(response.razorpay_signature) }); resolve(); } catch (err) { reject(err); } }, modal:{ ondismiss:() => reject(new Error('Payment cancelled')) } });
    checkout.open();
  });
}

const inputClass = 'w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';
function Field({ label, error, children }:{ label:string; error?:string; children:React.ReactNode }) { return <label className="block"><span className="mb-1 block text-sm font-medium text-neutral-700">{label}</span>{children}{error && <p className="mt-1 text-xs text-danger-600">{error}</p>}</label>; }
function PrimaryButton({ children, loading, type='button' }:{ children:React.ReactNode; loading?:boolean; type?:'button'|'submit' }) { return <button type={type} disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-3 font-semibold text-white disabled:opacity-60">{loading ? 'Please wait...' : children}<ChevronRight className="h-4 w-4"/></button>; }
function NavButtons({ onBack, onNext, nextDisabled, nextLabel='Continue' }:{ onBack:()=>void; onNext:()=>void; nextDisabled?:boolean; nextLabel?:string }) { return <div className="flex flex-col gap-3 sm:flex-row"><button onClick={onBack} type="button" className="flex min-h-11 items-center justify-center gap-1 rounded-lg border border-neutral-300 px-4 py-3 font-medium text-neutral-700"><ChevronLeft className="h-4 w-4"/> Back</button><button onClick={onNext} disabled={nextDisabled} type="button" className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{nextLabel}<ChevronRight className="h-4 w-4"/></button></div>; }
function SuccessBox({ children }:{ children:React.ReactNode }) { return <div className="flex items-center gap-2 rounded-lg border border-success-200 bg-success-50 px-4 py-3 text-sm font-medium text-success-700"><Check className="h-4 w-4"/>{children}</div>; }
function Badge({ children }:{ children:React.ReactNode }) { return <span className="rounded-full border border-primary-200 bg-white px-2 py-1 text-xs font-medium text-primary-700">{children}</span>; }
function AmountRow({ label, value, strong }:{ label:string; value:number; strong?:boolean }) { return <div className={cn('flex justify-between text-sm', strong && 'text-base font-bold')}><span className="text-neutral-600">{label}</span><span className={strong ? 'text-primary-600' : 'font-medium'}>{formatCurrency(value)}</span></div>; }
function extractItems(payload:unknown):ApiRecord[] { if (Array.isArray(payload)) return payload as ApiRecord[]; const record = asRecord(payload); if (Array.isArray(record.items)) return record.items as ApiRecord[]; if (Array.isArray(record.data)) return record.data as ApiRecord[]; return []; }
function asRecord(value:unknown):ApiRecord { return value && typeof value === 'object' ? value as ApiRecord : {}; }
function text(value:unknown, fallback='') { return value === undefined || value === null || value === '' ? fallback : String(value); }
function labelize(value:unknown) { return text(value, '-').replace(/_/g, ' '); }
function mutationError(error:unknown) { if (!error) return ''; const response = asRecord(asRecord(error).response); const data = asRecord(response.data); return text(data.message || asRecord(error).message, 'Request failed.'); }
