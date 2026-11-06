import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import {
  Stethoscope,
  Building2,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  FileText,
  BadgeCheck,
  QrCode,
  DollarSign,
  AlertCircle,
  Clock,
  Sparkles
} from 'lucide-react';
import apiClient from '@/lib/api-client';
import { Logo } from '@/components/brand/Logo';

const doctorRegistrationSchema = z.object({
  fullName: z.string().min(2, 'Enter your full name with title (e.g., Dr. Rajesh Sharma)'),
  mobile: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
  email: z.string().email('Enter a valid email address').optional().or(z.literal('')),
  qualification: z.string().min(2, 'Enter your medical qualification (e.g. MBBS, MS Ortho, MPT, DNB)'),
  specialization: z.string().min(2, 'Enter your specialization (e.g. Orthopedics, Sports Medicine, Spine, Physiotherapy)'),
  medicalRegNumber: z.string().min(2, 'Enter your Medical Council registration number'),
  registrationCouncil: z.string().optional(),
  yearsOfExperience: z.coerce.number().min(0).max(65).optional(),
  clinicName: z.string().min(2, 'Enter clinic or hospital name'),
  clinicAddress: z.string().optional(),
  city: z.string().min(2, 'Enter clinic city'),
  state: z.string().min(2, 'Enter clinic state'),
  postalCode: z.string().optional(),
  revenueModel: z.enum(['split', 'platform_fee']).default('split'),
  requestedPatientFee: z.coerce.number().min(1, 'Patient price must be at least ₹1').max(100000, 'Price exceeds limit').default(499),
});

type DoctorFormData = z.infer<typeof doctorRegistrationSchema>;

interface SubmittedDoctor {
  doctorId?: string;
  fullName: string;
  mobile: string;
  clinicName?: string;
  city?: string;
  status?: string;
}

export default function DoctorRegistrationPage() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedData, setSubmittedData] = useState<SubmittedDoctor | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm<DoctorFormData>({
    resolver: zodResolver(doctorRegistrationSchema),
    defaultValues: {
      fullName: '',
      mobile: '',
      email: '',
      qualification: '',
      specialization: 'Orthopedics',
      medicalRegNumber: '',
      registrationCouncil: '',
      clinicName: '',
      clinicAddress: '',
      city: '',
      state: '',
      postalCode: '',
      revenueModel: 'split',
      requestedPatientFee: 499,
    }
  });

  const selectedRevenueModel = watch('revenueModel');
  const patientPrice = watch('requestedPatientFee') || 499;

  const onSubmit = async (data: DoctorFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const payload: Record<string, any> = {
        fullName: data.fullName.trim(),
        mobile: data.mobile.trim(),
        qualification: data.qualification.trim(),
        specialization: data.specialization.trim(),
        medicalRegNumber: data.medicalRegNumber.trim(),
        clinicName: data.clinicName.trim(),
        city: data.city.trim(),
        state: data.state.trim(),
        revenueModel: data.revenueModel,
        requestedPatientFee: Number(data.requestedPatientFee) || 499,
      };

      if (data.email && data.email.trim()) {
        payload.email = data.email.trim().toLowerCase();
      }
      if (data.registrationCouncil && data.registrationCouncil.trim()) {
        payload.registrationCouncil = data.registrationCouncil.trim();
      }
      if (data.yearsOfExperience !== undefined && !isNaN(Number(data.yearsOfExperience))) {
        payload.yearsOfExperience = Number(data.yearsOfExperience);
      }
      if (data.clinicAddress && data.clinicAddress.trim()) {
        payload.clinicAddress = data.clinicAddress.trim();
      }
      if (data.postalCode && data.postalCode.trim()) {
        payload.postalCode = data.postalCode.trim();
      }

      const response = await apiClient.post('/doctors/self-register', payload);

      setSubmittedData({
        doctorId: response.data?.doctorId || response.data?._id,
        fullName: response.data?.fullName || data.fullName,
        mobile: response.data?.mobile || data.mobile,
        clinicName: response.data?.clinicName || data.clinicName,
        city: response.data?.city || data.city,
        status: response.data?.status || 'submitted',
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error('Doctor registration failed:', err);
      const message = err.response?.data?.message || err.message || 'Failed to submit registration. Please verify your details and try again.';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submittedData) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#FFFFFF_0%,#F2FAF8_100%)] px-4 py-8 sm:py-12">
        <div className="mx-auto max-w-2xl">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <Link to="/" className="inline-flex items-center gap-2">
              <Logo width={190} height={52} imageScale={2.6} />
            </Link>
            <Link to="/login" className="rc-btn-outline" style={{ minHeight: '38px', fontSize: '13.5px' }}>
              Sign In
            </Link>
          </div>

          {/* Success Card */}
          <div className="overflow-hidden rounded-2xl border border-teal-200 bg-white p-6 shadow-lg sm:p-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
              <CheckCircle2 className="h-8 w-8 text-teal-600" />
            </div>

            <div className="mt-4">
              <span className="rc-eyebrow">REGISTRATION SUBMITTED</span>
              <h1 className="mt-1 text-2xl font-extrabold text-[#062F2E] sm:text-3xl">
                Welcome to PhysioQR Clinical Network!
              </h1>
              <p className="mt-2 text-sm text-[#4A6360] sm:text-base">
                Thank you, <strong className="text-teal-900">{submittedData.fullName}</strong>. Your partner clinic onboarding application has been successfully received.
              </p>
            </div>

            {/* Application Overview Box */}
            <div className="mt-6 rounded-xl border border-teal-100 bg-[#F4FAF8] p-4 sm:p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-teal-800">Application Summary</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 text-sm">
                <div>
                  <span className="text-xs text-neutral-500">Doctor Name</span>
                  <div className="font-semibold text-neutral-900">{submittedData.fullName}</div>
                </div>
                <div>
                  <span className="text-xs text-neutral-500">Registered Mobile</span>
                  <div className="font-semibold text-neutral-900">{submittedData.mobile}</div>
                </div>
                <div>
                  <span className="text-xs text-neutral-500">Clinic / Hospital</span>
                  <div className="font-semibold text-neutral-900">{submittedData.clinicName || '—'}</div>
                </div>
                <div>
                  <span className="text-xs text-neutral-500">Verification Status</span>
                  <div className="inline-flex items-center gap-1.5 font-bold text-amber-700">
                    <Clock className="h-4 w-4" />
                    <span>Under Medical Verification</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Next Steps */}
            <div className="mt-6 space-y-3">
              <h4 className="text-sm font-bold text-neutral-900">What happens next?</h4>
              <div className="space-y-2 text-xs sm:text-sm text-neutral-600">
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-800">1</span>
                  <span><strong>Credentials Verification:</strong> Our clinical compliance desk verifies your state medical council registration number.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-800">2</span>
                  <span><strong>Clinic QR Standee Dispatch:</strong> Your clinic-branded reception QR standee with custom referral codes is prepared for dispatch.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-800">3</span>
                  <span><strong>Portal Credentials Delivery:</strong> You will receive an SMS and email notification with your Doctor Portal login credentials.</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="rc-btn-primary flex-1 justify-center text-center"
              >
                Return to Homepage
              </button>
              <button
                type="button"
                onClick={() => navigate('/login', { state: { preferredRole: 'doctor' } })}
                className="rc-btn-outline flex-1 justify-center text-center"
              >
                Doctor Sign In
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#FFFFFF_0%,#F2FAF8_100%)]">
      {/* Top Navigation */}
      <header className="sticky top-0 z-30 border-b border-[#D6EBE7] bg-white/95 px-4 py-3.5 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2">
            <Logo width={190} height={52} imageScale={2.6} />
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-semibold text-[#0B4F4A] hover:text-[#14756E]">
              Already registered? Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="px-4 py-8 sm:py-12">
        <div className="mx-auto max-w-3xl">
          {/* Breadcrumb / Back button */}
          <Link
            to="/"
            className="mb-6 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0B4F4A] hover:text-[#14756E]"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Home</span>
          </Link>

          {/* Page Heading */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-bold text-teal-800">
              <Stethoscope className="h-3.5 w-3.5" />
              <span>CLINICAL PARTNERSHIP ONBOARDING</span>
            </div>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-[#062F2E] sm:text-4xl">
              Doctor & Clinic Registration
            </h1>
            <p className="mt-2 text-base text-[#4A6360]">
              Extend structured rehabilitation beyond your consultation room. Register to generate your unique clinic QR standee, track patient recovery adherence, and manage transparent fee-share.
            </p>
          </div>

          {/* Value Props Bar */}
          <div className="mb-8 grid gap-3 sm:grid-cols-3">
            <div className="flex items-center gap-2.5 rounded-xl border border-teal-100 bg-white p-3 shadow-xs">
              <QrCode className="h-5 w-5 text-teal-600 shrink-0" />
              <div className="text-xs">
                <div className="font-bold text-neutral-900">Clinic QR Standee</div>
                <div className="text-neutral-500">Custom reception display</div>
              </div>
            </div>
            <div className="flex items-center gap-2.5 rounded-xl border border-teal-100 bg-white p-3 shadow-xs">
              <ShieldCheck className="h-5 w-5 text-teal-600 shrink-0" />
              <div className="text-xs">
                <div className="font-bold text-neutral-900">Referral Tracking</div>
                <div className="text-neutral-500">Live patient recovery view</div>
              </div>
            </div>
            <div className="flex items-center gap-2.5 rounded-xl border border-teal-100 bg-white p-3 shadow-xs">
              <DollarSign className="h-5 w-5 text-teal-600 shrink-0" />
              <div className="text-xs">
                <div className="font-bold text-neutral-900">50:50 Revenue Share</div>
                <div className="text-neutral-500">Automated payout tracking</div>
              </div>
            </div>
          </div>

          {/* Error Notice */}
          {submitError && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold">Registration notice: </strong>
                <span>{submitError}</span>
              </div>
            </div>
          )}

          {/* Form Card */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 rounded-2xl border border-[#DCEBE8] bg-white p-6 shadow-sm sm:p-8">
            {/* Section 1: Doctor Profile */}
            <div>
              <div className="flex items-center gap-2.5 border-b border-neutral-100 pb-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-100 text-teal-800 text-xs font-bold">1</div>
                <h2 className="text-lg font-bold text-neutral-900">Doctor Profile & Contact</h2>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700">
                    Full Name with Title *
                  </label>
                  <input
                    type="text"
                    {...register('fullName')}
                    placeholder="e.g. Dr. Rajesh Sharma"
                    className="mt-1.5 w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm text-neutral-900 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
                  />
                  {errors.fullName && <p className="mt-1 text-xs text-rose-600">{errors.fullName.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700">
                    Mobile Number (Login & SMS) *
                  </label>
                  <div className="relative mt-1.5">
                    <span className="absolute left-3.5 top-2.5 text-sm font-semibold text-neutral-400">+91</span>
                    <input
                      type="tel"
                      maxLength={10}
                      {...register('mobile')}
                      placeholder="9876543210"
                      className="w-full rounded-xl border border-neutral-300 pl-12 pr-3.5 py-2.5 text-sm text-neutral-900 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
                    />
                  </div>
                  {errors.mobile && <p className="mt-1 text-xs text-rose-600">{errors.mobile.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    {...register('email')}
                    placeholder="dr.rajesh@clinic.com"
                    className="mt-1.5 w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm text-neutral-900 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
                  />
                  {errors.email && <p className="mt-1 text-xs text-rose-600">{errors.email.message}</p>}
                </div>
              </div>
            </div>

            {/* Section 2: Clinical Credentials */}
            <div>
              <div className="flex items-center gap-2.5 border-b border-neutral-100 pb-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-100 text-teal-800 text-xs font-bold">2</div>
                <h2 className="text-lg font-bold text-neutral-900">Medical Credentials & Council Registration</h2>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700">
                    Medical Qualification *
                  </label>
                  <input
                    type="text"
                    {...register('qualification')}
                    placeholder="e.g. MBBS, MS (Ortho), DNB"
                    className="mt-1.5 w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm text-neutral-900 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
                  />
                  {errors.qualification && <p className="mt-1 text-xs text-rose-600">{errors.qualification.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700">
                    Primary Specialization *
                  </label>
                  <input
                    type="text"
                    {...register('specialization')}
                    placeholder="e.g. Orthopedic Surgery, Spine, Sports Medicine"
                    className="mt-1.5 w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm text-neutral-900 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
                  />
                  {errors.specialization && <p className="mt-1 text-xs text-rose-600">{errors.specialization.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700">
                    Medical Reg. Number *
                  </label>
                  <input
                    type="text"
                    {...register('medicalRegNumber')}
                    placeholder="e.g. DMC/R/12345 or MCI-6789"
                    className="mt-1.5 w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm text-neutral-900 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
                  />
                  {errors.medicalRegNumber && <p className="mt-1 text-xs text-rose-600">{errors.medicalRegNumber.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700">
                    Registration Council
                  </label>
                  <input
                    type="text"
                    {...register('registrationCouncil')}
                    placeholder="e.g. Delhi Medical Council"
                    className="mt-1.5 w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm text-neutral-900 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700">
                    Years of Clinical Experience
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="65"
                    {...register('yearsOfExperience')}
                    placeholder="e.g. 12"
                    className="mt-1.5 w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm text-neutral-900 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Clinic & Hospital Location */}
            <div>
              <div className="flex items-center gap-2.5 border-b border-neutral-100 pb-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-100 text-teal-800 text-xs font-bold">3</div>
                <h2 className="text-lg font-bold text-neutral-900">Clinic & Practice Location</h2>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700">
                    Clinic / Hospital / Practice Name *
                  </label>
                  <input
                    type="text"
                    {...register('clinicName')}
                    placeholder="e.g. Apex Orthopedics & Joint Clinic"
                    className="mt-1.5 w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm text-neutral-900 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
                  />
                  {errors.clinicName && <p className="mt-1 text-xs text-rose-600">{errors.clinicName.message}</p>}
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700">
                    Clinic Street Address
                  </label>
                  <input
                    type="text"
                    {...register('clinicAddress')}
                    placeholder="e.g. 2nd Floor, Healthcare Tower, Ring Road"
                    className="mt-1.5 w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm text-neutral-900 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700">
                    City *
                  </label>
                  <input
                    type="text"
                    {...register('city')}
                    placeholder="e.g. New Delhi"
                    className="mt-1.5 w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm text-neutral-900 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
                  />
                  {errors.city && <p className="mt-1 text-xs text-rose-600">{errors.city.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700">
                    State *
                  </label>
                  <input
                    type="text"
                    {...register('state')}
                    placeholder="e.g. Delhi"
                    className="mt-1.5 w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm text-neutral-900 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
                  />
                  {errors.state && <p className="mt-1 text-xs text-rose-600">{errors.state.message}</p>}
                </div>
              </div>
            </div>

            {/* Section 4: Revenue & Commercial Model */}
            <div>
              <div className="flex items-center gap-2.5 border-b border-neutral-100 pb-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-100 text-teal-800 text-xs font-bold">4</div>
                <h2 className="text-lg font-bold text-neutral-900">Commercial Partnership Preference</h2>
              </div>

              <div className="mt-4 space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label
                    className={`cursor-pointer rounded-xl border p-4 transition ${
                      selectedRevenueModel === 'split'
                        ? 'border-teal-600 bg-teal-50/50 ring-1 ring-teal-600'
                        : 'border-neutral-200 bg-white hover:border-neutral-300'
                    }`}
                  >
                    <input
                      type="radio"
                      value="split"
                      {...register('revenueModel')}
                      className="sr-only"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-neutral-900">50:50 Split Model</span>
                      <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[11px] font-bold text-teal-800">Recommended</span>
                    </div>
                    <p className="mt-1.5 text-xs text-neutral-600">
                      Standard healthcare revenue share. Doctor receives 50% of the verified patient rehabilitation payment.
                    </p>
                  </label>

                  <label
                    className={`cursor-pointer rounded-xl border p-4 transition ${
                      selectedRevenueModel === 'platform_fee'
                        ? 'border-teal-600 bg-teal-50/50 ring-1 ring-teal-600'
                        : 'border-neutral-200 bg-white hover:border-neutral-300'
                    }`}
                  >
                    <input
                      type="radio"
                      value="platform_fee"
                      {...register('revenueModel')}
                      className="sr-only"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-neutral-900">Platform Fee Model</span>
                    </div>
                    <p className="mt-1.5 text-xs text-neutral-600">
                      PhysioQR handles end-to-end rehabilitation delivery with full clinical platform support.
                    </p>
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700">
                    Patient Programme Fee (₹)
                  </label>
                  <div className="mt-1.5 flex items-center gap-3">
                    <div className="relative w-44">
                      <span className="absolute left-3.5 top-2.5 text-sm font-semibold text-neutral-500">₹</span>
                      <input
                        type="number"
                        min="1"
                        max="100000"
                        {...register('requestedPatientFee')}
                        className="w-full rounded-xl border border-neutral-300 pl-8 pr-3.5 py-2.5 text-sm font-semibold text-neutral-900 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
                      />
                    </div>
                    <span className="text-xs text-neutral-500">
                      {selectedRevenueModel === 'split' ? (
                        <>Doctor share: <strong>₹{Math.floor(patientPrice / 2)}</strong> (50%) per patient</>
                      ) : (
                        'Standard clinic programme fee'
                      )}
                    </span>
                  </div>
                  {errors.requestedPatientFee && <p className="mt-1 text-xs text-rose-600">{errors.requestedPatientFee.message}</p>}
                </div>
              </div>
            </div>

            {/* Terms and Submit */}
            <div className="border-t border-neutral-100 pt-5">
              <p className="mb-4 text-xs text-neutral-500 leading-relaxed">
                By submitting this registration, you certify that you are a registered medical practitioner or clinic administrator. Your registration will be verified by the PhysioQR compliance desk prior to QR standee dispatch and account activation.
              </p>

              <button
                type="submit"
                disabled={isSubmitting}
                className="rc-btn-primary w-full justify-center py-3.5 text-base font-bold shadow-md hover:shadow-lg disabled:opacity-60"
              >
                {isSubmitting ? (
                  <span>Submitting Application...</span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    Submit Doctor Registration
                    <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
