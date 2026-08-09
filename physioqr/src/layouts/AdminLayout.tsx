import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Stethoscope, HeartPulse, CreditCard,
  PieChart, Wallet, ArrowUpRight, BarChart2, Settings, Bell, LogOut, Menu, X, ShieldCheck
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { Logo } from '@/components/brand/Logo';
import { cn } from '@/lib/cn';

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Agents', path: '/admin/agents', icon: Users },
  { label: 'Doctors', path: '/admin/doctors', icon: Stethoscope },
  { label: 'Patients', path: '/admin/patients', icon: HeartPulse },
  { label: 'Payments', path: '/admin/payments', icon: CreditCard },
  { label: 'Fee Shares', path: '/admin/fee-shares', icon: PieChart },
  { label: 'Wallets', path: '/admin/wallets', icon: Wallet },
  { label: 'Withdrawals', path: '/admin/withdrawals', icon: ArrowUpRight },
  { label: 'Reports', path: '/admin/reports', icon: BarChart2 },
  { label: 'Settings', path: '/admin/settings', icon: Settings },
];

export function AdminLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex overflow-x-clip">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex w-64 bg-neutral-900 text-white flex-col fixed inset-y-0 z-30">
        <div className="h-20 flex items-center gap-4 px-6 border-b border-neutral-800">
          <Logo width={56} height={56} withText={false} />
          <div>
            <h1 className="font-bold text-white leading-none text-lg">Admin Portal</h1>
          </div>
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
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary-400" />
              <span className="text-xs font-semibold text-neutral-300">{user?.name || 'Admin'}</span>
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
            aria-label="Close admin navigation"
            className="absolute inset-0 bg-neutral-950/50"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative flex h-full w-[min(84vw,20rem)] flex-col bg-neutral-900 text-white shadow-2xl">
            <div className="h-16 flex items-center justify-between gap-3 px-4 border-b border-neutral-800">
              <div className="flex items-center gap-3 min-w-0">
                <Logo width={48} height={48} withText={false} />
                <div className="min-w-0">
                  <h1 className="font-bold text-white leading-none text-base truncate">Admin Portal</h1>
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
            <h2 className="font-bold text-neutral-900 text-base sm:text-lg truncate">Central Administration</h2>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <button className="p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg relative">
              <Bell className="w-5 h-5" />
              <span className="w-2 h-2 bg-primary-600 rounded-full absolute top-2 right-2"></span>
            </button>
            <div className="hidden sm:block h-8 w-px bg-neutral-200"></div>
            <button onClick={handleLogout} className="hidden sm:flex items-center gap-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900">
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
