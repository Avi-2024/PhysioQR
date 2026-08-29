import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LandingHeader } from './components/LandingHeader';
import { HeroSection } from './components/HeroSection';
import { TrustFoundation } from './components/TrustFoundation';
import { CareJourney } from './components/CareJourney';
import { ExperienceSelector } from './components/ExperienceSelector';
import { PatientExperienceSection } from './components/PatientExperienceSection';
import { RehabProgramsShowcase } from './components/RehabProgramsShowcase';
import { WhatsAppReminderSection } from './components/WhatsAppReminderSection';
import { DoctorExperienceSection } from './components/DoctorExperienceSection';
import { CapabilitiesSection } from './components/CapabilitiesSection';
import { SafetySection } from './components/SafetySection';
import { FAQSection } from './components/FAQSection';
import { FinalCTASection } from './components/FinalCTASection';
import { LandingFooter } from './components/LandingFooter';
import { PortalAccessModal } from './components/PortalAccessModal';
import { UserRole } from './types/landing.types';

interface LandingPageProps { onNavigateToPortal?: (role: UserRole) => void; }

export function LandingPage({ onNavigateToPortal }: LandingPageProps) {
  const [portalModalOpen, setPortalModalOpen] = useState(false);
  const navigate = useNavigate();
  const goToPortal = (role: UserRole) => onNavigateToPortal ? onNavigateToPortal(role) : navigate(`/login?role=${role}`);
  const handleOpenPortalModal = (role?: UserRole) => role ? goToPortal(role) : setPortalModalOpen(true);
  const handleSelectRoleFromModal = (role: UserRole) => { setPortalModalOpen(false); goToPortal(role); };

  return <div style={{ background: 'var(--bg-page)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
    <LandingHeader onOpenPortal={handleOpenPortalModal} />
    <main style={{ flex: 1 }}>
      <HeroSection onOpenPortal={handleOpenPortalModal} />
      <TrustFoundation />
      <CareJourney />
      <ExperienceSelector onOpenPortal={handleOpenPortalModal} />
      <PatientExperienceSection onOpenPortal={handleOpenPortalModal} />
      <RehabProgramsShowcase />
      <WhatsAppReminderSection />
      <DoctorExperienceSection onOpenPortal={handleOpenPortalModal} />
      <CapabilitiesSection />
      <SafetySection />
      <FAQSection />
      <FinalCTASection onOpenPortal={handleOpenPortalModal} />
    </main>
    <LandingFooter onOpenPortal={handleOpenPortalModal} />
    <PortalAccessModal isOpen={portalModalOpen} onClose={() => setPortalModalOpen(false)} onSelectRole={handleSelectRoleFromModal} />
  </div>;
}

export default LandingPage;
