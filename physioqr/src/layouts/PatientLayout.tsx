import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Home, PlayCircle, BarChart, CreditCard, LogOut } from 'lucide-react';
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
      <header className="h-20 bg-white border-b border-neutral-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <Logo width={44} height={44} withText={false} />
          <div>
            <h1 className="font-bold text-neutral-900 leading-none text-lg">Patient Portal</h1>
            <span className="text-2xs text-neutral-500 font-medium">PhysioQR</span>
          </div>
        </div>

        <button onClick={handleLogout} className="flex items-center gap-1.5 text-xs font-semibold text-neutral-600 hover:text-neutral-900 px-3 py-1.5 rounded-lg hover:bg-neutral-100 transition-colors">
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </header>

      {/* Main Content */}
      <main id="main-content" className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 flex justify-around items-center h-16 z-30 px-2">
        {[
          { label: 'Home', path: '/patient/dashboard', icon: Home },
          { label: 'Programme', path: '/patient/programme', icon: PlayCircle },
          { label: 'Progress', path: '/patient/progress', icon: BarChart },
          { label: 'Payments', path: '/patient/payments', icon: CreditCard },
        ].map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-xs font-medium transition-colors',
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
