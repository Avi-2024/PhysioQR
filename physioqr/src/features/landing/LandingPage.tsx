import React, { useState } from 'react';
import { LandingHeader } from './components/LandingHeader';
import { HeroSection } from './components/HeroSection';
import { TrustFoundation } from './components/TrustFoundation';
import { CareJourney } from './components/CareJourney';
import { ExperienceSelector } from './components/ExperienceSelector';
import { PatientExperienceSection } from './components/PatientExperienceSection';
import { DoctorExperienceSection } from './components/DoctorExperienceSection';
import { CapabilitiesSection } from './components/CapabilitiesSection';
// import { RevenueModelsSection } from './components/RevenueModelsSection';
import { ProgrammeExperienceSection } from './components/ProgrammeExperienceSection';
import { SafetySection } from './components/SafetySection';
import { FAQSection } from './components/FAQSection';
import { FinalCTASection } from './components/FinalCTASection';
import { LandingFooter } from './components/LandingFooter';
import { PortalAccessModal } from './components/PortalAccessModal';
import { UserRole } from './types/landing.types';

interface LandingPageProps {
  onNavigateToPortal?: (role: UserRole) => void;
}

export function LandingPage({ onNavigateToPortal }: LandingPageProps) {
  const [portalModalOpen, setPortalModalOpen] = useState(false);

  const handleOpenPortalModal = (role?: UserRole) => {
    if (role && onNavigateToPortal) {
      onNavigateToPortal(role);
    } else {
      setPortalModalOpen(true);
    }
  };

  const handleSelectRoleFromModal = (role: UserRole) => {
    setPortalModalOpen(false);
    if (onNavigateToPortal) {
      onNavigateToPortal(role);
    }
  };

  return (
    <div style={{ background: 'var(--bg-page)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* 01 Global Header */}
      <LandingHeader onOpenPortal={handleOpenPortalModal} />

      <main style={{ flex: 1 }}>
        {/* 02 Shared Hero */}
        <HeroSection onOpenPortal={handleOpenPortalModal} />

        {/* 03 Trust Foundation */}
        <TrustFoundation />

        {/* 04 Connected Doctor -> Patient Journey */}
        <CareJourney />

        {/* 05 Choose Your Experience */}
        <ExperienceSelector onOpenPortal={handleOpenPortalModal} />

        {/* 06 Patient Experience */}
        <PatientExperienceSection onOpenPortal={handleOpenPortalModal} />

        {/* 07 Doctor Experience */}
        <DoctorExperienceSection onOpenPortal={handleOpenPortalModal} />

        {/* 08 Platform Capabilities */}
        <CapabilitiesSection />

        {/* 09 Revenue Models */}
        {/* <RevenueModelsSection /> */}

        {/* 10 Rehabilitation Programme Experience */}
        <ProgrammeExperienceSection />

        {/* 11 Security & Safety */}
        <SafetySection />

        {/* 12 FAQ */}
        <FAQSection />

        {/* 13 Final Portal CTA */}
        <FinalCTASection onOpenPortal={handleOpenPortalModal} />
      </main>

      {/* 14 Enterprise Footer */}
      <LandingFooter onOpenPortal={handleOpenPortalModal} />

      {/* Portal Access Selector Modal */}
      <PortalAccessModal
        isOpen={portalModalOpen}
        onClose={() => setPortalModalOpen(false)}
        onSelectRole={handleSelectRoleFromModal}
      />
    </div>
  );
}

export default LandingPage;
