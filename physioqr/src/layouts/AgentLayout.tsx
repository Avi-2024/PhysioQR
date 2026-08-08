import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Stethoscope, UserPlus, MapPin,
  TrendingUp, LogOut, Bell, Menu, X
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { Logo } from '@/components/brand/Logo';
import { cn } from '@/lib/cn';

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/agent/dashboard', icon: LayoutDashboard },
  { label: 'My Doctors', path: '/agent/doctors', icon: Stethoscope },
  { label: 'Register Doctor', path: '/agent/doctors/new', icon: UserPlus },
  { label: 'Clinic Visits', path: '/agent/clinic-visits', icon: MapPin },
  { label: 'Performance', path: '/agent/performance', icon: TrendingUp },
];

export function AgentLayout() {
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
            <h1 className="font-bold text-white leading-none text-lg">Agent Field Portal</h1>
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
            <div>
              <p className="text-xs font-semibold text-neutral-200">{user?.name || 'Amit Kumar'}</p>
              <span className="text-2xs text-neutral-500">Field Agent</span>
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
            <h2 className="font-bold text-neutral-900 text-lg">Agent Field Portal</h2>
          </div>

          <div className="flex items-center gap-3">
            <button className="p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg relative">
              <Bell className="w-5 h-5" />
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
