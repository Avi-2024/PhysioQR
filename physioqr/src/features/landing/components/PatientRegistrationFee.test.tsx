import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { HeroSection } from './HeroSection';
import { PatientExperienceSection } from './PatientExperienceSection';
import { PATIENT_REGISTRATION_FEE_INR } from '@/config/patient-pricing';

describe('public patient registration fee', () => {
  it('uses ₹300 in the patient-facing price constant', () => {
    expect(PATIENT_REGISTRATION_FEE_INR).toBe(300);
  });

  it('shows ₹300 on the PhysioQR homepage hero', () => {
    const { container } = render(<HeroSection onOpenPortal={() => {}} />);
    expect(container.textContent).toContain('₹300');
    expect(container.textContent).toContain('one-time');
  });

  it('shows ₹300 on the patient landing section', () => {
    const { container } = render(<PatientExperienceSection onOpenPortal={() => {}} />);
    expect(container.textContent).toContain('₹300');
  });
});
