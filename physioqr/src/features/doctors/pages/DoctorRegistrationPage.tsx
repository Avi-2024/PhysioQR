import React, { useState, useMemo, type ReactNode } from 'react';
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
  QrCode,
  DollarSign,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { State, City } from 'country-state-city';
import apiClient from '@/lib/api-client';
import { Logo } from '@/components/brand/Logo';

const doctorRegistrationSchema = z.object({
  fullName: z.string().min(2, 'Enter doctor full name'),
  mobile: z.string().regex(/^[6-9]\d{9}$/, 'Enter valid 10-digit mobile number'),
  email: z.string().min(1, 'Doctor email is required').email('Enter valid email address'),
  qualification: z.string().min(2, 'Qualification required'),
  specialization: z.string().min(2, 'Specialization required'),
  medicalRegNumber: z.string().min(2, 'Medical registration number required'),
  clinicName: z.string().min(2, 'Clinic name required'),
  state: z.string().optional(),
  city: z.string().min(2, 'City required'),
  clinicAddress: z.string().optional(),
  registrationCouncil: z.string().optional(),
  yearsOfExperience: z.preprocess(
    (v) => (v === '' || v === undefined || v === null ? undefined : Number(v)),
    z.number().min(0).max(65).optional(),
  ),
});

type DoctorFormData = z.infer<typeof doctorRegistrationSchema>;

interface SubmittedDoctor {
  doctorId?: string;
  fullName: string;
  mobile: string;
  email?: string;
  clinicName?: string;
  city?: string;
  state?: string;
  status?: string;
}

export default function DoctorRegistrationPage() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedData, setSubmittedData] = useState<SubmittedDoctor | null>(null);
  const [selectedStateCode, setSelectedStateCode] = useState<string>('');
  const [isCustomCity, setIsCustomCity] = useState(false);

  const indianStates = useMemo(() => {
    return State.getStatesOfCountry('IN').sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  const availableCities = useMemo(() => {
    if (!selectedStateCode) return [];
    return City.getCitiesOfState('IN', selectedStateCode).sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedStateCode]);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<DoctorFormData>({
    resolver: zodResolver(doctorRegistrationSchema),
    defaultValues: {
      fullName: '',
      mobile: '',
      email: '',
      qualification: '',
      specialization: '',
      medicalRegNumber: '',
      registrationCouncil: '',
      clinicName: '',
      clinicAddress: '',
      city: '',
      state: '',
    },
  });

  const stateRegister = register('state');
  const cityRegister = register('city');

  const handleStateChange = (stateName: string) => {
    const found = indianStates.find((s) => s.name === stateName || s.isoCode === stateName);
    setSelectedStateCode(found ? found.isoCode : '');
    setValue('city', '');
    setIsCustomCity(false);
  };

  const onSubmit = async (data: DoctorFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const payload: Record<string, unknown> = {
        fullName: data.fullName.trim(),
        mobile: data.mobile.trim(),
        email: data.email.trim().toLowerCase(),
        qualification: data.qualification.trim(),
        specialization: data.specialization.trim(),
        medicalRegNumber: data.medicalRegNumber.trim(),
        clinicName: data.clinicName.trim(),
        city: data.city.trim(),
      };

      if (data.state && data.state.trim()) {
        payload.state = data.state.trim();
      }
      if (data.clinicAddress && data.clinicAddress.trim()) {
        payload.clinicAddress = data.clinicAddress.trim();
      }
      if (data.registrationCouncil && data.registrationCouncil.trim()) {
        payload.registrationCouncil = data.registrationCouncil.trim();
      }
      if (data.yearsOfExperience !== undefined) {
        payload.yearsOfExperience = data.yearsOfExperience;
      }

      const response = await apiClient.post('/doctors/self-register', payload);

      setSubmittedData({
        doctorId: response.data?.doctorId || response.data?._id,
        fullName: response.data?.fullName || data.fullName,
        mobile: response.data?.mobile || data.mobile,
        email: response.data?.email || data.email,
        clinicName: response.data?.clinicName || data.clinicName,
        city: response.data?.city || data.city,
        state: response.data?.state || data.state,
        status: response.data?.status || 'submitted',
      });
      try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch { /* noop in tests */ }
    } catch (err: unknown) {
      console.error('Doctor registration failed:', err);
      const message =
        (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ||
        (err as { message?: string })?.message ||
        'Failed to submit registration. Please verify your details and try again.';
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
                  <span className="text-xs text-neutral-500">Email Address</span>
                  <div className="font-semibold text-neutral-900">{submittedData.email || '—'}</div>
                </div>
                <div>
                  <span className="text-xs text-neutral-500">Clinic / Hospital</span>
                  <div className="font-semibold text-neutral-900">{submittedData.clinicName || '—'}</div>
                </div>
                <div>
                  <span className="text-xs text-neutral-500">Location</span>
                  <div className="font-semibold text-neutral-900">
                    {[submittedData.city, submittedData.state].filter(Boolean).join(', ') || '—'}
                  </div>
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
                <div className="text-neutral-500">Transparent split model</div>
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
                <FormField label="Doctor Full Name" required error={errors.fullName?.message}>
                  <input
                    type="text"
                    {...register('fullName')}
                    placeholder="Doctor name"
                    className={inputClass}
                  />
                </FormField>

                <FormField label="Mobile Number" required error={errors.mobile?.message}>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    {...register('mobile')}
                    placeholder="10-digit mobile"
                    className={inputClass}
                  />
                </FormField>

                <FormField label="Email Address" required wide error={errors.email?.message}>
                  <input
                    type="email"
                    {...register('email')}
                    placeholder="doctor@clinic.com"
                    className={inputClass}
                  />
                </FormField>
              </div>
            </div>

            {/* Section 2: Clinical Credentials */}
            <div>
              <div className="flex items-center gap-2.5 border-b border-neutral-100 pb-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-100 text-teal-800 text-xs font-bold">2</div>
                <h2 className="text-lg font-bold text-neutral-900">Medical Credentials & Council Registration</h2>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <FormField label="Qualification" required error={errors.qualification?.message}>
                  <input
                    type="text"
                    {...register('qualification')}
                    placeholder="e.g. BPT, MPT"
                    className={inputClass}
                  />
                </FormField>

                <FormField label="Specialization" required error={errors.specialization?.message}>
                  <input
                    type="text"
                    {...register('specialization')}
                    placeholder="e.g. Orthopaedic Physio"
                    className={inputClass}
                  />
                </FormField>

                <FormField label="Medical Registration Number" required error={errors.medicalRegNumber?.message}>
                  <input
                    type="text"
                    {...register('medicalRegNumber')}
                    placeholder="e.g. REG-12345"
                    className={inputClass}
                  />
                </FormField>

                <FormField label="Registration Council">
                  <input
                    type="text"
                    {...register('registrationCouncil')}
                    placeholder="e.g. Delhi Medical Council"
                    className={inputClass}
                  />
                </FormField>

                <FormField label="Years of Clinical Experience" wide>
                  <input
                    type="number"
                    min="0"
                    max="65"
                    {...register('yearsOfExperience')}
                    placeholder="e.g. 10"
                    className={inputClass}
                  />
                </FormField>
              </div>
            </div>

            {/* Section 3: Clinic & Hospital Location */}
            <div>
              <div className="flex items-center gap-2.5 border-b border-neutral-100 pb-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-100 text-teal-800 text-xs font-bold">3</div>
                <h2 className="text-lg font-bold text-neutral-900">Clinic & Practice Location</h2>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <FormField label="Clinic Name" required wide error={errors.clinicName?.message}>
                  <input
                    type="text"
                    {...register('clinicName')}
                    placeholder="e.g. City Spine & Joint Clinic"
                    className={inputClass}
                  />
                </FormField>

                <FormField label="State" error={errors.state?.message}>
                  <select
                    {...stateRegister}
                    onChange={(e) => {
                      stateRegister.onChange(e);
                      handleStateChange(e.target.value);
                    }}
                    className={inputClass}
                  >
                    <option value="">Select State (optional)</option>
                    {indianStates.map((st) => (
                      <option key={st.isoCode} value={st.name}>
                        {st.name}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField label="City" required error={errors.city?.message}>
                  {selectedStateCode && availableCities.length > 0 && !isCustomCity ? (
                    <div className="space-y-1.5">
                      <select
                        {...cityRegister}
                        onChange={(e) => {
                          if (e.target.value === '__custom__') {
                            setIsCustomCity(true);
                            setValue('city', '');
                          } else {
                            cityRegister.onChange(e);
                          }
                        }}
                        className={inputClass}
                      >
                        <option value="">Select City</option>
                        {availableCities.map((c) => (
                          <option key={`${c.name}-${c.latitude || ''}`} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                        <option value="__custom__">+ Other / Enter manually</option>
                      </select>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setIsCustomCity(true);
                            setValue('city', '');
                          }}
                          className="text-xs font-medium text-teal-700 hover:text-teal-800 hover:underline"
                        >
                          City not listed? Enter manually
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <input
                        type="text"
                        {...cityRegister}
                        placeholder={selectedStateCode ? 'Enter city name' : 'Enter city (or select state first)'}
                        className={inputClass}
                      />
                      {selectedStateCode && availableCities.length > 0 && (
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              setIsCustomCity(false);
                              setValue('city', '');
                            }}
                            className="text-xs font-medium text-teal-700 hover:text-teal-800 hover:underline"
                          >
                            ← Select from city list
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </FormField>

                <FormField label="Clinic Address" wide error={errors.clinicAddress?.message}>
                  <textarea
                    rows={3}
                    {...register('clinicAddress')}
                    placeholder="Full clinic address (e.g. Suite 402, Metro Healthcare Complex, MG Road)"
                    className={`${inputClass} min-h-24 resize-y`}
                  />
                </FormField>
              </div>
            </div>

            {/* Terms and Submit */}
            <div className="border-t border-neutral-100 pt-5">
              <p className="mb-4 text-xs text-neutral-500 leading-relaxed">
                By submitting this registration, you certify that you are a registered medical practitioner or clinic administrator. Your registration will be verified by the PhysioQR clinical compliance desk prior to QR standee dispatch and account activation.
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

function FormField({
  label,
  required,
  error,
  wide,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <label className={wide ? 'sm:col-span-2 block' : 'block'}>
      <span className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
        {label}
        {required && <span className="text-rose-500 ml-0.5">*</span>}
      </span>
      {children}
      {error && <p className="mt-1 text-xs text-rose-600 font-medium">{error}</p>}
    </label>
  );
}

const inputClass =
  'w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm text-neutral-900 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600 disabled:bg-neutral-50 disabled:text-neutral-500';
