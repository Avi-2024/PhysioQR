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
    <div className="min-h-screen bg-neutral-50 flex">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex w-64 bg-neutral-900 text-white flex-col fixed inset-y-0 z-30">
        <div className="h-20 flex items-center gap-4 px-6 border-b border-neutral-800">
          <Logo width={44} height={44} withText={false} />
          <div>
            <h1 className="font-bold text-white leading-none text-lg">Admin Portal</h1>
            <span className="text-2xs text-primary-400 font-semibold tracking-wider uppercase">PhysioQR</span>
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

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 bg-white border-b border-neutral-200 sticky top-0 z-20 px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden p-2 text-neutral-600 hover:bg-neutral-100 rounded-lg">
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <h2 className="font-bold text-neutral-900 text-lg">Central Administration</h2>
          </div>

          <div className="flex items-center gap-3">
            <button className="p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg relative">
              <Bell className="w-5 h-5" />
              <span className="w-2 h-2 bg-primary-600 rounded-full absolute top-2 right-2"></span>
            </button>
            <div className="h-8 w-px bg-neutral-200"></div>
            <button onClick={handleLogout} className="flex items-center gap-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900">
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
        </header>

        <main id="main-content" className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
