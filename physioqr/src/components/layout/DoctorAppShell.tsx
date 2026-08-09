import React, { ReactNode } from 'react';
import {
  LayoutDashboard,
  Users,
  QrCode,
  WalletCards,
  ArrowUpRight,
  ShieldCheck,
  Bell,
  LifeBuoy,
  UserRound
} from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { MOCK_DOCTOR_PROFILE } from '../../mocks/mockDoctorData';

interface DoctorAppShellProps {
  activeScreen: string;
  onNavigate: (screen: string) => void;
  children: ReactNode;
}

export function DoctorAppShell({ activeScreen, onNavigate, children }: DoctorAppShellProps) {
  const profile = MOCK_DOCTOR_PROFILE;

  const NAV_ITEMS = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'patients', label: 'My Patients', icon: Users },
    { id: 'qr', label: 'QR & Referral', icon: QrCode },
    { id: 'earnings', label: 'Earnings', icon: WalletCards },
    { id: 'withdrawals', label: 'Withdrawals', icon: ArrowUpRight },
    { id: 'kyc', label: 'Bank & KYC', icon: ShieldCheck },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'support', label: 'Support', icon: LifeBuoy },
    { id: 'profile', label: 'Profile', icon: UserRound },
  ];

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className="app-sidebar">
        <div className="sidebar-header">
          <Logo width={210} height={44} withText={false} imageScale={2.8} />
          <div>
            <div className="sidebar-brand-sub">Doctor Panel</div>
          </div>
        </div>

        <ul className="sidebar-nav">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeScreen === item.id;
            return (
              <li key={item.id}>
                <button
                  className={`sidebar-nav-btn ${isActive ? 'active' : ''}`}
                  onClick={() => onNavigate(item.id)}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="sidebar-doctor-profile">
          <div className="doctor-avatar-circle">DR</div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
              {profile.name}
            </div>
            <div style={{ fontSize: '11px', color: '#94A3B8', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
              {profile.clinicName}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Wrapper */}
      <div className="main-wrapper">
        {/* Top Header */}
        <header className="top-header-bar">
          <div className="header-title-box">
            <h1>Doctor Portal — {activeScreen.toUpperCase()}</h1>
          </div>

          <div className="header-right-actions">
            <button
              className="icon-btn-badge"
              title="Notifications"
              onClick={() => onNavigate('notifications')}
            >
              <Bell className="w-5 h-5" />
              <span className="notification-dot"></span>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => onNavigate('profile')}>
              <div className="doctor-avatar-circle" style={{ width: '32px', height: '32px', fontSize: '11px' }}>DR</div>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#17212B' }}>{profile.name}</span>
            </div>
          </div>
        </header>

        {/* Content Page Container */}
        <main className="page-container">
          {children}
        </main>
      </div>
    </div>
  );
}
