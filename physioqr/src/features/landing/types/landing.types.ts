export type UserRole = 'patient' | 'doctor' | 'admin' | 'agent';

export interface JourneyStepItem {
  stepNumber: number;
  title: string;
  description: string;
  iconName: string;
}

export interface TrustItem {
  title: string;
  description: string;
  iconName: string;
}

export interface CapabilityItem {
  title: string;
  description: string;
  badge?: string;
  size: 'large' | 'standard';
  visualType: 'qr' | 'assessment' | 'programme' | 'agent' | 'admin';
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: 'patient' | 'doctor' | 'general';
}

export interface SafetyRuleItem {
  title: string;
  description: string;
  iconName: string;
}
