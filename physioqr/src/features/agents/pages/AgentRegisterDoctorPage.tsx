import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { UserPlus, ArrowLeft, CheckCircle } from 'lucide-react';

const doctorRegistrationSchema = z.object({
  name: z.string().min(2, 'Enter doctor full name'),
  mobile: z.string().regex(/^[6-9]\d{9}$/, 'Enter valid 10-digit mobile number'),
  email: z.string().email('Enter valid email address'),
  qualification: z.string().min(2, 'Qualification required'),
  specialization: z.string().min(2, 'Specialization required'),
  registrationNumber: z.string().min(2, 'Medical registration number required'),
  clinicName: z.string().min(2, 'Clinic name required'),
  city: z.string().min(2, 'City required'),
  patientFee: z.coerce.number().min(100, 'Minimum fee is ₹100'),
});

type DoctorRegistrationForm = z.infer<typeof doctorRegistrationSchema>;

export default function AgentRegisterDoctorPage() {
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<DoctorRegistrationForm>({
    resolver: zodResolver(doctorRegistrationSchema),
    defaultValues: {
      patientFee: 500,
    },
  });

  const onSubmit = (data: DoctorRegistrationForm) => {
    alert(`Doctor ${data.name} successfully registered! Submitted for Admin review.`);
    navigate('/agent/dashboard');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 border border-neutral-300 rounded-lg hover:bg-neutral-100">
          <ArrowLeft className="w-4 h-4 text-neutral-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Register New Doctor</h1>
          <p className="text-sm text-neutral-500">Onboard a new physician/clinic under your agent profile</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white border border-neutral-200 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="border-b border-neutral-100 pb-4">
          <h2 className="font-bold text-neutral-900 text-lg flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary-600" /> 1. Personal & Contact Details
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">Doctor Full Name *</label>
            <input {...register('name')} placeholder="e.g. Dr. Rajesh Sharma" className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            {errors.name && <p className="mt-1 text-xs text-danger-600">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">Mobile Number *</label>
            <input {...register('mobile')} placeholder="10-digit mobile" className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            {errors.mobile && <p className="mt-1 text-xs text-danger-600">{errors.mobile.message}</p>}
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-neutral-700 mb-1">Email Address *</label>
            <input {...register('email')} type="email" placeholder="doctor@clinic.com" className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            {errors.email && <p className="mt-1 text-xs text-danger-600">{errors.email.message}</p>}
          </div>
        </div>

        <div className="border-b border-neutral-100 pb-4 pt-4">
          <h2 className="font-bold text-neutral-900 text-lg">2. Professional Details</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">Qualification *</label>
            <input {...register('qualification')} placeholder="e.g. MBBS, MS (Orthopedics)" className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            {errors.qualification && <p className="mt-1 text-xs text-danger-600">{errors.qualification.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">Specialization *</label>
            <input {...register('specialization')} placeholder="e.g. Orthopedic Specialist" className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            {errors.specialization && <p className="mt-1 text-xs text-danger-600">{errors.specialization.message}</p>}
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-neutral-700 mb-1">Medical Registration Number *</label>
            <input {...register('registrationNumber')} placeholder="e.g. MMC-2018-98234" className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            {errors.registrationNumber && <p className="mt-1 text-xs text-danger-600">{errors.registrationNumber.message}</p>}
          </div>
        </div>

        <div className="border-b border-neutral-100 pb-4 pt-4">
          <h2 className="font-bold text-neutral-900 text-lg">3. Clinic & Fee Details</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">Clinic Name *</label>
            <input {...register('clinicName')} placeholder="e.g. City Spine & Joint Clinic" className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            {errors.clinicName && <p className="mt-1 text-xs text-danger-600">{errors.clinicName.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">City *</label>
            <input {...register('city')} placeholder="e.g. Mumbai" className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            {errors.city && <p className="mt-1 text-xs text-danger-600">{errors.city.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">Requested Patient Programme Fee (₹) *</label>
            <input {...register('patientFee')} type="number" className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            {errors.patientFee && <p className="mt-1 text-xs text-danger-600">{errors.patientFee.message}</p>}
          </div>
        </div>

        <button type="submit" disabled={isSubmitting} className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors text-sm flex items-center justify-center gap-2">
          <CheckCircle className="w-4 h-4" /> Submit Profile for Admin Approval
        </button>
      </form>
    </div>
  );
}
