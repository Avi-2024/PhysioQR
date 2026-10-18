import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, QrCode, TrendingUp, Wallet,
  ArrowUpRight, ShieldCheck, User, LogOut, Bell, Menu, X, MessageSquare
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { signOutAndSwitchAccount } from '@/lib/switch-account';
import { Logo } from '@/components/brand/Logo';
import { cn } from '@/lib/cn';
import { MobileAccountActions } from '@/components/navigation/MobileAccountActions';

export function DoctorLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isSplitModel = (user as any)?.revenueModel === 'split_model' || (user as any)?.revenueModel === undefined;

  const NAV_ITEMS = [
    { label: 'Overview', path: '/doctor/dashboard', icon: LayoutDashboard },
    { label: 'My Patients', path: '/doctor/patients', icon: Users },
    { label: 'QR & Referral', path: '/doctor/qr-referral', icon: QrCode },
    ...(isSplitModel
      ? [
          { label: 'Earnings', path: '/doctor/earnings', icon: TrendingUp },
          { label: 'Wallet', path: '/doctor/wallet', icon: Wallet },
          { label: 'Withdrawals', path: '/doctor/withdrawals', icon: ArrowUpRight },
        ]
      : []),
    { label: 'Bank & KYC', path: '/doctor/bank-kyc', icon: ShieldCheck },
    { label: 'Support', path: '/doctor/support', icon: MessageSquare },
    { label: 'Profile', path: '/doctor/profile', icon: User },
  ];

  const [isSigningOut, setIsSigningOut] = useState(false);
  const handleLogout = () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    setMobileOpen(false);
    void signOutAndSwitchAccount(logout, () => navigate('/login', { replace: true }));
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex overflow-x-clip">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex w-64 bg-neutral-900 text-white flex-col fixed inset-y-0 z-30">
        <div className="h-20 flex items-center gap-4 px-6 border-b border-neutral-800">
          <Logo width={56} height={56}  />
          
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary-600 text-white font-semibold'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                )
              }
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-neutral-800">
          <div className="flex items-center justify-between text-neutral-400">
            <div>
              <p className="text-xs font-semibold text-neutral-200">{user?.name || 'Doctor'}</p>
              <span className="text-2xs text-neutral-500">{isSplitModel ? 'Split Model (60%)' : 'Platform Fee Model'}</span>
            </div>
            <button onClick={handleLogout} title="Logout" className="hover:text-white transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close doctor navigation"
            className="absolute inset-0 bg-neutral-950/50"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative flex h-full w-[min(84vw,20rem)] flex-col bg-neutral-900 text-white shadow-2xl">
            <div className="h-16 flex items-center justify-between gap-3 px-4 border-b border-neutral-800">
              <div className="flex items-center gap-3 min-w-0">
                <Logo width={48} height={48}  />
                <div className="min-w-0">
                  
                </div>
              </div>
              <button onClick={() => setMobileOpen(false)} className="p-2 rounded-lg text-neutral-300 hover:bg-neutral-800 hover:text-white" aria-label="Close menu">
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex min-h-11 items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary-600 text-white font-semibold'
                        : 'text-neutral-300 hover:text-white hover:bg-neutral-800'
                    )
                  }
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  <span className="min-w-0 truncate">{item.label}</span>
                </NavLink>
              ))}
            </nav>
            <MobileAccountActions name={user?.name} role="Doctor" onSwitchAccount={handleLogout} />
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Header */}
        <header className="min-h-16 bg-white border-b border-neutral-200 sticky top-0 z-20 px-4 sm:px-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden p-2 text-neutral-600 hover:bg-neutral-100 rounded-lg">
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <h2 className="font-bold text-neutral-900 text-base sm:text-lg truncate">Doctor Dashboard</h2>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <button aria-label="Notifications" className="hidden sm:inline-flex p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg relative">
              <Bell className="w-5 h-5" />
            </button>
            <div className="hidden sm:block h-8 w-px bg-neutral-200"></div>
<button
              type="button"
              onClick={handleLogout}
              aria-label="Log out and switch account"
              title="Logout / Switch Account"
              disabled={isSigningOut}
              className="lg:hidden inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-neutral-200 px-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span>{isSigningOut ? 'Signing out…' : 'Logout'}</span>
            </button>
            <button onClick={handleLogout} className="hidden lg:flex items-center gap-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900">
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
        </header>

        <main id="main-content" className="flex-1 w-full max-w-[1320px] mx-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
