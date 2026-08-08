import React, { useState } from 'react';
import './App.css';
import { LandingPage } from './features/landing/LandingPage';
import { QRReferralLanding } from './features/landing/components/QRReferralLanding';
import { DoctorAppShell } from './components/layout/DoctorAppShell';
import { DoctorDashboardOverviewPage } from './features/dashboard/DoctorDashboardOverviewPage';
import { MyPatientsPage } from './features/patients/MyPatientsPage';
import { QrReferralPage } from './features/referrals/QrReferralPage';
import { EarningsPage } from './features/earnings/EarningsPage';
import { WithdrawalsPage } from './features/withdrawals/WithdrawalsPage';
import { BankKycPage } from './features/kyc/BankKycPage';
import { NotificationsPage } from './features/notifications/NotificationsPage';
import { SupportPage } from './features/support/SupportPage';
import { DoctorProfilePage } from './features/profile/DoctorProfilePage';
import { UserRole } from './features/landing/types/landing.types';

export default function App() {
  const [currentView, setCurrentView] = useState<'landing' | 'qr_scan' | 'doctor_portal' | 'patient_portal' | 'staff_portal'>('landing');
  const [doctorScreen, setDoctorScreen] = useState<string>('overview');

  const handleNavigateToRole = (role: UserRole) => {
    if (role === 'doctor') {
      setCurrentView('doctor_portal');
    } else if (role === 'patient') {
      setCurrentView('qr_scan');
    } else {
      alert('Staff Login (Admin/Agent) authenticated. Redirecting to Staff Dashboard.');
      setCurrentView('doctor_portal');
    }
  };

  const renderDoctorScreen = () => {
    switch (doctorScreen) {
      case 'overview': return <DoctorDashboardOverviewPage onNavigate={setDoctorScreen} />;
      case 'patients': return <MyPatientsPage />;
      case 'qr': return <QrReferralPage />;
      case 'earnings': return <EarningsPage />;
      case 'withdrawals': return <WithdrawalsPage />;
      case 'kyc': return <BankKycPage />;
      case 'notifications': return <NotificationsPage />;
      case 'support': return <SupportPage />;
      case 'profile': return <DoctorProfilePage />;
      default: return <DoctorDashboardOverviewPage onNavigate={setDoctorScreen} />;
    }
  };

  // 1. QR Referral Scan Exception View (Section 23)
  if (currentView === 'qr_scan') {
    return (
      <QRReferralLanding
        doctorCode="DR001"
        onCompleteLogin={() => {
          alert('Mobile OTP Verified! Welcome to your Knee Rehabilitation Programme.');
          setCurrentView('landing');
        }}
        onBackToMain={() => setCurrentView('landing')}
      />
    );
  }

  // 2. Doctor Portal View
  if (currentView === 'doctor_portal') {
    return (
      <div>
        <div style={{ background: '#082F2E', color: '#FFFFFF', padding: '8px 16px', fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>RehabCare Doctor Portal · Logged in as Dr. Amit Sharma (DR001)</span>
          <button
            onClick={() => setCurrentView('landing')}
            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#FFFFFF', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 700 }}
          >
            ← Return to Public Site
          </button>
        </div>
        <DoctorAppShell activeScreen={doctorScreen} onNavigate={setDoctorScreen}>
          {renderDoctorScreen()}
        </DoctorAppShell>
      </div>
    );
  }

  // 3. Primary Public Landing Experience
  return (
    <LandingPage onNavigateToPortal={handleNavigateToRole} />
  );
}
