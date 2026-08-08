import { JourneyStepItem, TrustItem, CapabilityItem, FAQItem, SafetyRuleItem } from '../types/landing.types';

export const TRUST_FOUNDATION_ITEMS: TrustItem[] = [
  {
    title: 'Doctor Connected',
    description: 'Every patient programme begins through a connected doctor referral pathway.',
    iconName: 'Stethoscope',
  },
  {
    title: 'Secure Access',
    description: 'OTP-based mobile access ensures patients easily reach their assigned programme.',
    iconName: 'ShieldCheck',
  },
  {
    title: 'Structured Care',
    description: 'Day-wise rehabilitation content provides patients with a clear, guided recovery path.',
    iconName: 'ClipboardCheck',
  },
  {
    title: 'Transparent Workflow',
    description: 'Referral, payment, and programme progress remain visible throughout the journey.',
    iconName: 'LockKeyhole',
  },
];

export const JOURNEY_STEPS: JourneyStepItem[] = [
  {
    stepNumber: 1,
    title: 'Doctor Referral',
    description: 'The doctor shares a unique PhysioQR QR code or referral link with the patient at the clinic.',
    iconName: 'QrCode',
  },
  {
    stepNumber: 2,
    title: 'Secure Registration',
    description: 'The patient verifies their mobile number via OTP and creates their personal rehabilitation profile.',
    iconName: 'UserRound',
  },
  {
    stepNumber: 3,
    title: 'Guided Assessment',
    description: 'A structured clinical questionnaire captures pain location, severity, and medical history.',
    iconName: 'ClipboardCheck',
  },
  {
    stepNumber: 4,
    title: 'Programme Activation',
    description: 'After eligibility and online payment are confirmed, the relevant exercise programme activates immediately.',
    iconName: 'BadgeCheck',
  },
  {
    stepNumber: 5,
    title: 'Day-wise Recovery',
    description: 'Patients follow guided exercise videos, instructions, sets, reps, and precautions day by day.',
    iconName: 'Activity',
  },
];

export const CAPABILITIES: CapabilityItem[] = [
  {
    title: 'QR-Based Referral & Attribution',
    description: 'Each approved doctor receives a unique referral QR code so every patient registration remains attributed to the correct referring doctor.',
    badge: 'DOCTOR NETWORK',
    size: 'large',
    visualType: 'qr',
  },
  {
    title: 'Guided Pain Assessment',
    description: 'Conditional clinical questions capture the patient condition while safety rules trigger review for severe neurological or surgical flags.',
    badge: 'CLINICAL SAFETY',
    size: 'standard',
    visualType: 'assessment',
  },
  {
    title: 'Structured Day-wise Programmes',
    description: 'Exercise videos, instructions, repetitions, rest durations, and precautions remain organized day by day for maximum patient clarity.',
    badge: 'REHABILITATION CONTENT',
    size: 'large',
    visualType: 'programme',
  },
  {
    title: 'Connected Field Operations',
    description: 'Field agents onboard doctors, manage clinic desk visits, and track assigned medical networks with operational visibility.',
    badge: 'FIELD NETWORK',
    size: 'standard',
    visualType: 'agent',
  },
  {
    title: 'Centralised Administration',
    description: 'PhysioQR operations remain centrally controlled through programme management, doctor onboarding, payment auditing, and clinical reporting.',
    badge: 'ENTERPRISE CONTROL',
    size: 'standard',
    visualType: 'admin',
  },
];

export const FAQ_ITEMS: FAQItem[] = [
  {
    id: 'faq-1',
    category: 'patient',
    question: 'How do patients join PhysioQR?',
    answer: 'Patients normally begin by scanning the unique QR code standee provided by their doctor at the clinic or opening a direct referral link shared by their physician.',
  },
  {
    id: 'faq-2',
    category: 'patient',
    question: 'Do patients need to install a heavy mobile app?',
    answer: 'No. The PhysioQR digital experience is accessible directly from any modern mobile browser without requiring app store downloads.',
  },
  {
    id: 'faq-3',
    category: 'patient',
    question: 'How does a patient access their exercise programme?',
    answer: 'After mobile verification, pain assessment, and successful payment, the assigned day-wise rehabilitation programme becomes accessible inside the patient portal.',
  },
  {
    id: 'faq-4',
    category: 'doctor',
    question: 'How does a doctor refer patients?',
    answer: 'Approved doctors receive a high-resolution acrylic QR standee for clinic reception along with a unique digital referral link to share via WhatsApp or SMS.',
  },
  {
    id: 'faq-5',
    category: 'doctor',
    question: 'Can doctors track their patient referrals and programme activity?',
    answer: 'Yes. Doctors log in to their Doctor Portal to monitor total referrals, active programs, patient progress percentages, and commercial fee shares in real-time.',
  },
  {
    id: 'faq-6',
    category: 'doctor',
    question: 'What is the difference between Split Model and Platform Fee Model?',
    answer: 'In the Split Model, the patient pays ₹500 online which is shared (60% doctor / 40% platform). In the Platform Fee Model, the doctor collects their clinic consultation fee separately while the patient pays only the PhysioQR platform fee online.',
  },
  {
    id: 'faq-7',
    category: 'general',
    question: 'Are exercise programmes unlocked day by day?',
    answer: 'Yes. Exercises are structured sequentially by day (Day 01, Day 02, etc.) to prevent over-exertion and ensure safe clinical progression.',
  },
  {
    id: 'faq-8',
    category: 'general',
    question: 'What if a patient needs help or experiences discomfort?',
    answer: 'Patients can submit instant support tickets through the platform, access exercise precautions, or consult their referring doctor.',
  },
];

export const SAFETY_RULES: SafetyRuleItem[] = [
  {
    title: 'Secure Account Access',
    description: 'OTP-based mobile authentication protects patient accounts without complicated passwords.',
    iconName: 'ShieldCheck',
  },
  {
    title: 'Role-Based Visibility',
    description: 'Doctors, patients, agents, and administrators access strictly scoped information appropriate to their role.',
    iconName: 'LockKeyhole',
  },
  {
    title: 'Patient Informed Consent',
    description: 'Terms, privacy guidelines, and medical disclaimers are captured before programme activation.',
    iconName: 'FileCheck2',
  },
  {
    title: 'Assessment Safety Flags',
    description: 'High-risk responses (severe pain score 9/10 or acute neurological symptoms) trigger clinical review.',
    iconName: 'Bell',
  },
];
