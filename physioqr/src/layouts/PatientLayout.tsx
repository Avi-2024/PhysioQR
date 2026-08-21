import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Home, PlayCircle, BarChart, CreditCard, LogOut, MessageSquare } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { Logo } from '@/components/brand/Logo';
import { cn } from '@/lib/cn';

export function PatientLayout() {
  const { logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col justify-between pb-16 md:pb-0">
      {/* Top Header */}
      <header className="min-h-16 sm:min-h-20 bg-white border-b border-neutral-200 px-4 sm:px-6 flex items-center justify-between gap-3 sticky top-0 z-20">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <Logo width={56} height={56}  />
          <div className="min-w-0">
            <h1 className="font-bold text-neutral-900 leading-none text-base sm:text-lg truncate">Patient Portal</h1>
          </div>
        </div>

        <button onClick={handleLogout} className="flex min-h-11 min-w-11 flex-shrink-0 items-center justify-center gap-1.5 text-xs font-semibold text-neutral-600 hover:text-neutral-900 px-2 sm:px-3 py-1.5 rounded-lg hover:bg-neutral-100 transition-colors" aria-label="Logout">
          <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Logout</span>
        </button>
      </header>

      {/* Main Content */}
      <main id="main-content" className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 flex items-center h-16 z-30 px-1">
        {[
          { label: 'Home', path: '/patient/dashboard', icon: Home },
          { label: 'Programme', path: '/patient/programme', icon: PlayCircle },
          { label: 'Progress', path: '/patient/progress', icon: BarChart },
          { label: 'Payments', path: '/patient/payments', icon: CreditCard },
          { label: 'Support', path: '/patient/support', icon: MessageSquare },
        ].map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex flex-1 min-w-0 flex-col items-center gap-1 py-1 px-1 rounded-lg text-[11px] font-medium transition-colors',
                isActive ? 'text-primary-600 font-bold' : 'text-neutral-400 hover:text-neutral-600'
              )
            }
          >
            <item.icon className="w-5 h-5" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
