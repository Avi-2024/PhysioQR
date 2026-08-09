import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Check, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/cn';
import { PAIN_CATEGORIES } from '@/lib/constants';

const STEPS = [
  { id: 1, label: 'Basic Details' },
  { id: 2, label: 'Mobile Verify' },
  { id: 3, label: 'Consent' },
  { id: 4, label: 'Pain Category' },
  { id: 5, label: 'Assessment' },
  { id: 6, label: 'Programme' },
  { id: 7, label: 'Payment' },
];

const RED_FLAG_SYMPTOMS = ['Chest pain', 'Sudden severe numbness', 'Loss of bowel control', 'Loss of bladder control'];

// Step 1: Basic details
const basicSchema = z.object({
  name: z.string().min(2, 'Enter your full name'),
  email: z.string().email('Enter a valid email'),
  age: z.coerce.number().min(5, 'Age must be at least 5').max(110, 'Enter a valid age'),
  gender: z.enum(['male', 'female', 'other']),
});
type BasicForm = z.infer<typeof basicSchema>;

// Step 2: OTP
const otpSchema = z.object({
  mobile: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number'),
  otp: z.string().length(6, 'Enter the 6-digit OTP'),
});
type OtpForm = z.infer<typeof otpSchema>;

export default function PatientRegistrationPage() {
  const [searchParams] = useSearchParams();
  const doctorCode = searchParams.get('doctor') || 'DR001';
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<Record<string, unknown>>({ doctorCode });
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [assessment, setAssessment] = useState<Record<string, unknown>>({});
  const [isRedFlag, setIsRedFlag] = useState(false);

  const basicForm = useForm<BasicForm>({ resolver: zodResolver(basicSchema) });
  const otpForm = useForm<OtpForm>({ resolver: zodResolver(otpSchema) });

  const nextStep = () => setStep((s) => Math.min(s + 1, 7));
  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  const handleBasicSubmit = (data: BasicForm) => {
    setFormData((prev) => ({ ...prev, ...data }));
    nextStep();
  };

  const handleSendOtp = () => {
    if (!otpForm.getValues('mobile')) {
      otpForm.setError('mobile', { message: 'Enter mobile number first' });
      return;
    }
    setOtpSent(true);
  };

  const handleVerifyOtp = () => {
    const otp = otpForm.getValues('otp');
    if (otp === '123456' || otp.length === 6) {
      setOtpVerified(true);
    } else {
      otpForm.setError('otp', { message: 'Invalid OTP. Try 123456 for demo.' });
    }
  };

  const handleCategorySelect = (cat: string) => {
    setSelectedCategory(cat);
    setFormData((prev) => ({ ...prev, painCategory: cat }));
  };

  const handleAssessmentSubmit = () => {
    const selectedSymptoms = assessment.symptoms as string[] || [];
    const painLevel = assessment.painLevel as number || 0;
    const hasFlag = selectedSymptoms.some((s) => RED_FLAG_SYMPTOMS.includes(s)) || painLevel >= 9;
    setIsRedFlag(hasFlag);
    nextStep();
  };

  // Step indicator component
  const StepIndicator = () => (
    <div className="flex items-center justify-between gap-2 mb-8 overflow-x-auto scrollbar-hide pb-2">
      {STEPS.map((s, idx) => (
        <div key={s.id} className="flex items-center flex-shrink-0">
          <div className={cn(
            'flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-all',
            step > s.id && 'bg-success-600 text-white',
            step === s.id && 'bg-primary-600 text-white ring-4 ring-primary-100',
            step < s.id && 'bg-neutral-200 text-neutral-500',
          )}>
            {step > s.id ? <Check className="w-4 h-4" /> : s.id}
          </div>
          <span className={cn(
            'ml-2 text-xs font-medium hidden sm:block',
            step === s.id ? 'text-primary-600' : 'text-neutral-400',
          )}>{s.label}</span>
          {idx < STEPS.length - 1 && (
            <div className={cn(
              'h-px mx-3 transition-colors flex-shrink-0',
              step > s.id ? 'bg-success-400 w-4 sm:w-8' : 'bg-neutral-200 w-4 sm:w-8',
            )} />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-blue-50 py-6 sm:py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-primary-600 text-white font-bold text-lg mb-3">+</div>
          <h1 className="text-xl font-bold text-neutral-900">physioqr</h1>
          <p className="text-sm text-neutral-500">Referred by Doctor Code: <span className="font-semibold text-primary-600">{doctorCode}</span></p>
        </div>

        <div className="bg-white rounded-2xl shadow-modal p-4 sm:p-6 md:p-8 min-w-0">
          <StepIndicator />

          {/* Step 1: Basic Details */}
          {step === 1 && (
            <form onSubmit={basicForm.handleSubmit(handleBasicSubmit)} className="space-y-4">
              <div><h2 className="text-lg font-bold text-neutral-900">Personal Details</h2><p className="text-sm text-neutral-500">Tell us a little about yourself</p></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Full Name *</label>
                  <input {...basicForm.register('name')} placeholder="e.g. Ramesh Kumar" className={cn('w-full px-3 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition', basicForm.formState.errors.name ? 'border-danger-500' : 'border-neutral-300')} />
                  {basicForm.formState.errors.name && <p className="mt-1 text-xs text-danger-600">{basicForm.formState.errors.name.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Email Address *</label>
                  <input {...basicForm.register('email')} type="email" placeholder="you@example.com" className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                  {basicForm.formState.errors.email && <p className="mt-1 text-xs text-danger-600">{basicForm.formState.errors.email.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Age *</label>
                  <input {...basicForm.register('age')} type="number" placeholder="35" className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                  {basicForm.formState.errors.age && <p className="mt-1 text-xs text-danger-600">{basicForm.formState.errors.age.message}</p>}
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Gender *</label>
                  <div className="flex flex-wrap gap-4">
                    {['male', 'female', 'other'].map((g) => (
                      <label key={g} className="flex items-center gap-2 cursor-pointer">
                        <input {...basicForm.register('gender')} type="radio" value={g} className="w-4 h-4 text-primary-600" />
                        <span className="text-sm capitalize text-neutral-700">{g}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <button type="submit" className="w-full mt-4 px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2">
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Step 2: OTP */}
          {step === 2 && (
            <div className="space-y-4">
              <div><h2 className="text-lg font-bold text-neutral-900">Verify Mobile Number</h2><p className="text-sm text-neutral-500">We'll send a 6-digit OTP to verify your number</p></div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Mobile Number *</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input {...otpForm.register('mobile')} type="tel" placeholder="10-digit mobile number" className="min-w-0 flex-1 px-3 py-2.5 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                  <button onClick={handleSendOtp} type="button" className="min-h-11 px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-medium text-sm rounded-lg transition-colors whitespace-nowrap">
                    {otpSent ? 'Resend' : 'Send OTP'}
                  </button>
                </div>
                {otpForm.formState.errors.mobile && <p className="mt-1 text-xs text-danger-600">{otpForm.formState.errors.mobile.message}</p>}
              </div>
              {otpSent && !otpVerified && (
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Enter OTP <span className="text-neutral-400">(Demo: 123456)</span></label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input {...otpForm.register('otp')} maxLength={6} placeholder="6-digit OTP" className="min-w-0 flex-1 px-3 py-2.5 rounded-lg border border-neutral-300 text-sm tracking-widest focus:outline-none focus:ring-2 focus:ring-primary-500" />
                    <button onClick={handleVerifyOtp} type="button" className="min-h-11 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium text-sm rounded-lg transition-colors">
                      Verify
                    </button>
                  </div>
                  {otpForm.formState.errors.otp && <p className="mt-1 text-xs text-danger-600">{otpForm.formState.errors.otp.message}</p>}
                </div>
              )}
              {otpVerified && (
                <div className="flex items-center gap-2 px-4 py-3 bg-success-50 border border-success-200 rounded-lg text-success-700 text-sm font-medium">
                  <Check className="w-4 h-4" /> Mobile number verified successfully!
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-3 mt-4">
                <button onClick={prevStep} type="button" className="flex min-h-11 items-center justify-center gap-1 px-4 py-3 border border-neutral-300 text-neutral-700 font-medium rounded-lg hover:bg-neutral-50 transition-colors">
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button onClick={nextStep} disabled={!otpVerified} type="button" className="flex-1 min-h-11 px-4 py-3 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2">
                  Continue <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Consent */}
          {step === 3 && (
            <div className="space-y-4">
              <div><h2 className="text-lg font-bold text-neutral-900">Terms & Medical Consent</h2><p className="text-sm text-neutral-500">Please review and accept before continuing</p></div>
              <div className="bg-neutral-50 rounded-lg p-4 text-sm text-neutral-600 max-h-48 overflow-y-auto space-y-2 border border-neutral-200">
                <p className="font-semibold text-neutral-800">Medical Disclaimer</p>
                <p>The exercise programme provided by physioqr is not a substitute for emergency medical care. Patients with severe symptoms should consult a qualified medical professional.</p>
                <p>You should stop exercising immediately if you experience severe pain, chest discomfort, dizziness, or any worsening of symptoms.</p>
                <p className="font-semibold text-neutral-800 mt-3">Programme Consent</p>
                <p>By accepting, you consent to: exercise programme access, WhatsApp/SMS reminders, and confirm that all health information submitted is accurate.</p>
                <p>All exercise programmes are approved by qualified physiotherapists before publishing.</p>
              </div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={consentAccepted} onChange={(e) => setConsentAccepted(e.target.checked)} className="mt-0.5 w-4 h-4 text-primary-600 rounded" />
                <span className="text-sm text-neutral-700">I have read and agree to the <span className="text-primary-600 underline cursor-pointer">Terms & Conditions</span>, <span className="text-primary-600 underline cursor-pointer">Privacy Policy</span>, <span className="text-primary-600 underline cursor-pointer">Medical Disclaimer</span>, and Exercise Programme Consent.</span>
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={prevStep} type="button" className="flex min-h-11 items-center justify-center gap-1 px-4 py-3 border border-neutral-300 text-neutral-700 font-medium rounded-lg hover:bg-neutral-50 transition-colors"><ChevronLeft className="w-4 h-4" /> Back</button>
                <button onClick={nextStep} disabled={!consentAccepted} type="button" className="flex-1 px-4 py-3 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2">Accept & Continue <ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          )}

          {/* Step 4: Pain Category */}
          {step === 4 && (
            <div className="space-y-4">
              <div><h2 className="text-lg font-bold text-neutral-900">Select Your Primary Concern</h2><p className="text-sm text-neutral-500">This helps us assign the most appropriate programme</p></div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {PAIN_CATEGORIES.map((cat) => (
                  <button key={cat} onClick={() => handleCategorySelect(cat)} type="button" className={cn('px-3 py-3 rounded-lg border-2 text-sm font-medium text-left transition-all', selectedCategory === cat ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-neutral-200 bg-white text-neutral-700 hover:border-primary-200 hover:bg-primary-50/50')}>
                    {cat}
                  </button>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row gap-3 mt-4">
                <button onClick={prevStep} type="button" className="flex min-h-11 items-center justify-center gap-1 px-4 py-3 border border-neutral-300 text-neutral-700 font-medium rounded-lg hover:bg-neutral-50 transition-colors"><ChevronLeft className="w-4 h-4" /> Back</button>
                <button onClick={nextStep} disabled={!selectedCategory} type="button" className="flex-1 px-4 py-3 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2">Continue <ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          )}

          {/* Step 5: Assessment */}
          {step === 5 && (
            <div className="space-y-4">
              <div><h2 className="text-lg font-bold text-neutral-900">Health Assessment</h2><p className="text-sm text-neutral-500">Category: <strong>{selectedCategory}</strong></p></div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-2">Pain Severity (1 = Mild, 10 = Severe) *</label>
                  <input type="range" min={1} max={10} value={(assessment.painLevel as number) || 5} onChange={(e) => setAssessment((a) => ({ ...a, painLevel: Number(e.target.value) }))} className="w-full accent-primary-600" />
                  <div className="flex justify-between text-xs text-neutral-400 mt-1"><span>1 - Mild</span><span className="font-bold text-primary-600 text-sm">{(assessment.painLevel as number) || 5} / 10</span><span>10 - Severe</span></div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-2">Select any symptoms you experience:</label>
                  {['Stiffness in morning', 'Swelling in joint', 'Muscle weakness', 'Chest pain', 'Sudden severe numbness', 'Fever with pain', 'Loss of bowel control'].map((sym) => (
                    <label key={sym} className="flex items-center gap-2 py-1.5 cursor-pointer">
                      <input type="checkbox" checked={((assessment.symptoms as string[]) || []).includes(sym)} onChange={(e) => {
                        const current = (assessment.symptoms as string[]) || [];
                        setAssessment((a) => ({ ...a, symptoms: e.target.checked ? [...current, sym] : current.filter((s) => s !== sym) }));
                      }} className="w-4 h-4 rounded text-primary-600" />
                      <span className={cn('text-sm', RED_FLAG_SYMPTOMS.includes(sym) ? 'text-danger-600 font-medium' : 'text-neutral-700')}>{sym}</span>
                    </label>
                  ))}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-2">Recent surgery in last 30 days?</label>
                  <div className="flex flex-wrap gap-4">
                    {['No', 'Yes'].map((opt) => (
                      <label key={opt} className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="surgery" value={opt} checked={assessment.recentSurgery === opt} onChange={() => setAssessment((a) => ({ ...a, recentSurgery: opt }))} className="w-4 h-4 text-primary-600" />
                        <span className="text-sm text-neutral-700">{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 mt-4">
                <button onClick={prevStep} type="button" className="flex min-h-11 items-center justify-center gap-1 px-4 py-3 border border-neutral-300 text-neutral-700 font-medium rounded-lg hover:bg-neutral-50 transition-colors"><ChevronLeft className="w-4 h-4" /> Back</button>
                <button onClick={handleAssessmentSubmit} type="button" className="flex-1 px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2">Submit Assessment <ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          )}

          {/* Step 6: Programme & Price */}
          {step === 6 && (
            <div className="space-y-4">
              {isRedFlag ? (
                <div className="bg-danger-50 border-2 border-danger-300 rounded-xl p-6 text-center space-y-3">
                  <AlertTriangle className="w-12 h-12 text-danger-600 mx-auto" />
                  <h2 className="text-lg font-bold text-danger-900">Clinical Safety Review Required</h2>
                  <p className="text-sm text-danger-700">Your assessment indicates symptoms that require clinical evaluation before starting exercises. Our team has been notified and will contact you shortly.</p>
                  <p className="text-xs text-danger-600">Please consult your referring doctor immediately if symptoms are severe.</p>
                  <button onClick={() => navigate('/')} className="mt-4 px-6 py-2.5 bg-danger-600 hover:bg-danger-700 text-white font-semibold rounded-lg transition-colors text-sm">
                    Return Home
                  </button>
                </div>
              ) : (
                <>
                  <div><h2 className="text-lg font-bold text-neutral-900">Your Assigned Programme</h2><p className="text-sm text-neutral-500">Based on your assessment</p></div>
                  <div className="border-2 border-primary-200 bg-primary-50 rounded-xl p-5 space-y-3">
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="font-bold text-neutral-900">14-Day {selectedCategory} Recovery Programme</h3>
                        <p className="text-sm text-neutral-600 mt-1">Designed by Senior Physiotherapists</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className="px-2 py-1 bg-white border border-primary-200 rounded-full text-xs font-medium text-primary-700">14 Days</span>
                          <span className="px-2 py-1 bg-white border border-primary-200 rounded-full text-xs font-medium text-primary-700">Beginner</span>
                          <span className="px-2 py-1 bg-white border border-primary-200 rounded-full text-xs font-medium text-primary-700">Day-wise Videos</span>
                        </div>
                      </div>
                      <div className="text-left sm:text-right flex-shrink-0 sm:ml-4">
                        <p className="text-2xl font-bold text-primary-600">₹500</p>
                        <p className="text-xs text-neutral-500">Programme Fee</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button onClick={prevStep} type="button" className="flex min-h-11 items-center justify-center gap-1 px-4 py-3 border border-neutral-300 text-neutral-700 font-medium rounded-lg hover:bg-neutral-50 transition-colors"><ChevronLeft className="w-4 h-4" /> Back</button>
                    <button onClick={nextStep} type="button" className="flex-1 px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2">Proceed to Payment <ChevronRight className="w-4 h-4" /></button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 7: Payment */}
          {step === 7 && (
            <div className="space-y-4">
              <div><h2 className="text-lg font-bold text-neutral-900">Complete Payment</h2><p className="text-sm text-neutral-500">Secure online payment to activate your programme</p></div>
              <div className="bg-neutral-50 rounded-lg p-4 space-y-2 border border-neutral-200">
                <div className="flex justify-between text-sm"><span className="text-neutral-600">Programme Fee</span><span className="font-medium">₹500</span></div>
                <div className="flex justify-between text-sm"><span className="text-neutral-600">Discount</span><span className="font-medium text-success-600">–₹0</span></div>
                <div className="flex justify-between text-sm"><span className="text-neutral-600">Tax (GST 18%)</span><span className="font-medium">₹90</span></div>
                <div className="h-px bg-neutral-200 my-2" />
                <div className="flex justify-between font-bold"><span>Total Payable</span><span className="text-primary-600">₹590</span></div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-neutral-700">Select Payment Method</label>
                {['UPI (GPay / PhonePe / Paytm)', 'Debit / Credit Card', 'Net Banking'].map((method, i) => (
                  <label key={method} className={cn('flex items-center gap-3 px-4 py-3 rounded-lg border-2 cursor-pointer transition-all', i === 0 ? 'border-primary-500 bg-primary-50' : 'border-neutral-200 bg-white hover:border-primary-200')}>
                    <input type="radio" name="payMethod" defaultChecked={i === 0} className="w-4 h-4 text-primary-600" />
                    <span className="text-sm font-medium text-neutral-700">{method}</span>
                  </label>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row gap-3 mt-4">
                <button onClick={prevStep} type="button" className="flex min-h-11 items-center justify-center gap-1 px-4 py-3 border border-neutral-300 text-neutral-700 font-medium rounded-lg hover:bg-neutral-50 transition-colors"><ChevronLeft className="w-4 h-4" /> Back</button>
                <button onClick={() => navigate('/payment-success')} type="button" className="flex-1 px-4 py-3 bg-success-600 hover:bg-success-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2">
                  Pay ₹590 & Activate Programme 🔒
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
