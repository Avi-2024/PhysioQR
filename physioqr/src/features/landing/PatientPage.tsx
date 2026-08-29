import React, { useState } from 'react';
import { LandingHeader } from './components/LandingHeader';
import { PatientExperienceSection } from './components/PatientExperienceSection';
import { LandingFooter } from './components/LandingFooter';
import { PortalAccessModal } from './components/PortalAccessModal';
import { UserRole } from './types/landing.types';

export default function PatientPage() {
  const [portalModalOpen, setPortalModalOpen] = useState(false);

  const handleOpenPortal = (_role?: UserRole) => {
    setPortalModalOpen(true);
  };

  return (
    <div style={{ background: 'var(--bg-page)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <LandingHeader onOpenPortal={handleOpenPortal} />

      <main style={{ flex: 1 }}>
        <PatientExperienceSection onOpenPortal={handleOpenPortal} />
      </main>

      <LandingFooter onOpenPortal={handleOpenPortal} />

      <PortalAccessModal
        isOpen={portalModalOpen}
        onClose={() => setPortalModalOpen(false)}
        onSelectRole={() => setPortalModalOpen(false)}
      />
    </div>
  );
}
