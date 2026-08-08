import {
  DoctorProfile,
  DashboardSummary,
  WalletSummary,
  ReferralPatient,
  WithdrawalRequest,
  NotificationItem,
  SupportTicket
} from '../types/doctor.types';

export const MOCK_DOCTOR_PROFILE: DoctorProfile = {
  id: 'DOC-88219',
  name: 'Dr. Amit Sharma',
  email: 'dramit.sharma@physioqr.in',
  mobile: '+91 98201 44321',
  qualification: 'MBBS, MS (Orthopaedics)',
  specialization: 'Orthopaedics & Rehabilitation Medicine',
  registrationNumber: 'MCI-2012-98412',
  medicalCouncil: 'Maharashtra Medical Council',
  yearsOfExperience: 14,
  clinicName: 'Sharma Physiotherapy & Joint Care Clinic',
  clinicAddress: 'Suite 402, Medical Enclave, Linking Road, Bandra West',
  city: 'Mumbai',
  state: 'Maharashtra',
  pincode: '400050',
  accountStatus: 'active',
  referralCode: 'DR001',
  patientFee: 500,
  commissionPercentage: 60,
  holdingPeriodDays: 15,
  minimumWithdrawalAmount: 1000,
  payoutCycle: 'Monthly (1st & 16th)',
  qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=https://physioqr.in/register?dr=DR001',
  referralLink: 'https://physioqr.in/register?dr=DR001',
  kycStatus: 'verified',
  bankVerificationStatus: 'verified'
};

export const MOCK_DASHBOARD_SUMMARY: DashboardSummary = {
  qrScans: 146,
  registeredPatients: 58,
  paidPatients: 41,
  activePatients: 27,
  revenueGenerated: 20500,
  lifetimeCommission: 12300,
  pendingCommission: 3600,
  availableCommission: 5400,
  paidCommission: 3300,
  conversionRate: 70.69, // 41 / 58
  scanToRegistrationRate: 39.72 // 58 / 146
};

export const MOCK_WALLET_SUMMARY: WalletSummary = {
  lifetimeCommission: 12300,
  availableBalance: 5400,
  pendingCommission: 3600,
  paidCommission: 3300,
  reversedCommission: 0,
  minimumWithdrawal: 1000,
  holdingPeriodDays: 15,
  commissionPercentage: 60,
  patientFee: 500
};

export const MOCK_REFERRAL_PATIENTS: ReferralPatient[] = [
  {
    id: 'PAT-701',
    name: 'Priya Verma',
    mobileMasked: '98XXXX4321',
    registrationDate: '2026-08-01',
    painCategory: 'Knee Pain',
    programName: '14-Day Knee Strengthening & Mobility',
    programProgress: 45,
    paymentAmount: 500,
    paymentStatus: 'paid',
    programStatus: 'active',
    commissionAmount: 300,
    commissionStatus: 'available',
    releaseDate: '2026-08-16',
    lastActiveDate: '2026-08-06'
  },
  {
    id: 'PAT-702',
    name: 'Rahul Singh',
    mobileMasked: '97XXXX9812',
    registrationDate: '2026-07-28',
    painCategory: 'Lower Back Pain',
    programName: '14-Day Lumbar Decompression & Recovery',
    programProgress: 70,
    paymentAmount: 500,
    paymentStatus: 'paid',
    programStatus: 'active',
    commissionAmount: 300,
    commissionStatus: 'available',
    releaseDate: '2026-08-12',
    lastActiveDate: '2026-08-06'
  },
  {
    id: 'PAT-703',
    name: 'Neha Patel',
    mobileMasked: '99XXXX1122',
    registrationDate: '2026-08-05',
    painCategory: 'Neck & Shoulder Stiffness',
    programName: '14-Day Cervical Posture Care',
    programProgress: 0,
    paymentAmount: 500,
    paymentStatus: 'pending',
    programStatus: 'not_started',
    commissionAmount: 300,
    commissionStatus: 'pending',
    releaseDate: '2026-08-20',
    lastActiveDate: '2026-08-05'
  },
  {
    id: 'PAT-704',
    name: 'Arjun Mehta',
    mobileMasked: '98XXXX6677',
    registrationDate: '2026-07-20',
    painCategory: 'Shoulder Pain',
    programName: '14-Day Rotator Cuff Recovery',
    programProgress: 15,
    paymentAmount: 500,
    paymentStatus: 'refunded',
    programStatus: 'expired',
    commissionAmount: 300,
    commissionStatus: 'reversed',
    releaseDate: '2026-08-04',
    lastActiveDate: '2026-07-22'
  },
  {
    id: 'PAT-705',
    name: 'Kavita Joshi',
    mobileMasked: '96XXXX3344',
    registrationDate: '2026-07-10',
    painCategory: 'Knee Pain',
    programName: '14-Day Knee Strengthening & Mobility',
    programProgress: 100,
    paymentAmount: 500,
    paymentStatus: 'paid',
    programStatus: 'completed',
    commissionAmount: 300,
    commissionStatus: 'paid',
    releaseDate: '2026-07-25',
    lastActiveDate: '2026-07-24'
  }
];

export const MOCK_WITHDRAWAL_REQUESTS: WithdrawalRequest[] = [
  {
    id: 'WD-901',
    amount: 3300,
    requestDate: '2026-07-26',
    status: 'paid',
    bankAccountEnding: '4829',
    bankName: 'HDFC Bank Ltd',
    processedDate: '2026-07-28',
    transactionReference: 'CMS981240129',
    timeline: [
      { status: 'requested', date: '2026-07-26 10:30 AM', note: 'Withdrawal requested by doctor' },
      { status: 'under_review', date: '2026-07-26 02:15 PM', note: 'Admin review completed' },
      { status: 'approved', date: '2026-07-27 11:00 AM', note: 'Approved for payout queue' },
      { status: 'processing', date: '2026-07-28 09:30 AM', note: 'NEFT transfer initiated' },
      { status: 'paid', date: '2026-07-28 11:45 AM', note: 'Paid successfully. Ref: CMS981240129' }
    ]
  }
];

export const MOCK_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'NT-1',
    title: 'New Patient Registered',
    description: 'Neha Patel scanned your QR code and registered for Cervical Posture Care.',
    timestamp: '2026-08-05T14:30:00Z',
    category: 'patients',
    isRead: false,
    actionUrl: '/patients'
  },
  {
    id: 'NT-2',
    title: 'Commission Released to Available Balance',
    description: '₹300 commission for Priya Verma is now available for withdrawal.',
    timestamp: '2026-08-01T09:00:00Z',
    category: 'commission',
    isRead: false,
    actionUrl: '/earnings'
  },
  {
    id: 'NT-3',
    title: 'Payout Processed Successfully',
    description: '₹3,300 transferred to HDFC Bank (A/C ending 4829). Ref: CMS981240129',
    timestamp: '2026-07-28T11:45:00Z',
    category: 'withdrawals',
    isRead: true,
    actionUrl: '/withdrawals'
  }
];

export const MOCK_SUPPORT_TICKETS: SupportTicket[] = [
  {
    id: 'TCK-401',
    category: 'QR Code & Standee',
    subject: 'Request extra clinic desk QR standee',
    description: 'We need 2 additional acrylic QR code standees for our reception counter.',
    status: 'in_progress',
    createdDate: '2026-08-02',
    lastUpdated: '2026-08-03'
  }
];
