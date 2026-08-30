import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LandingHeader } from './components/LandingHeader';
import { DoctorExperienceSection } from './components/DoctorExperienceSection';
import { LandingFooter } from './components/LandingFooter';
import { PortalAccessModal } from './components/PortalAccessModal';
import { UserRole } from './types/landing.types';

export default function DoctorPage() {
  const [portalModalOpen, setPortalModalOpen] = useState(false);
  const navigate = useNavigate();
  const goToLogin = (role: UserRole) => navigate('/login', { state: { preferredRole: role } });
  const handleOpenPortal = (role?: UserRole) => role ? goToLogin(role) : setPortalModalOpen(true);
  const handleSelectRole = (role: UserRole) => { setPortalModalOpen(false); goToLogin(role); };

  return <div style={{ background: 'var(--bg-page)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
    <LandingHeader onOpenPortal={handleOpenPortal} />
    <main style={{ flex: 1 }}><DoctorExperienceSection onOpenPortal={handleOpenPortal} /></main>
    <LandingFooter onOpenPortal={handleOpenPortal} />
    <PortalAccessModal isOpen={portalModalOpen} onClose={() => setPortalModalOpen(false)} onSelectRole={handleSelectRole} />
  </div>;
}
