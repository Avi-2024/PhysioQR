import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  CreditCard,
  Home,
  LogOut,
  MessageSquare,
  PlayCircle,
  ShieldCheck,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { signOutAndSwitchAccount } from '@/lib/switch-account';
import { Logo } from '@/components/brand/Logo';
import { cn } from '@/lib/cn';

const patientNav = [
  { label: 'Home', shortLabel: 'Home', path: '/patient/dashboard', icon: Home },
  { label: 'Programme', shortLabel: 'Plan', path: '/patient/programme', icon: PlayCircle },
  { label: 'Progress', shortLabel: 'Progress', path: '/patient/progress', icon: BarChart3 },
  { label: 'Payments', shortLabel: 'Payments', path: '/patient/payments', icon: CreditCard },
  { label: 'Support', shortLabel: 'Support', path: '/patient/support', icon: MessageSquare },
];

export function PatientLayout() {
  const { logout } = useAuthStore();
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = React.useState(false);

  const handleLogout = () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    void signOutAndSwitchAccount(logout, () => navigate('/login', { replace: true }));
  };

  return (
    <div className="min-h-screen bg-[#f6f8f7] print:bg-white">
      <header className="sticky top-0 z-40 border-b border-neutral-200/80 bg-white/95 backdrop-blur md:hidden print:hidden">
        <div className="flex h-16 items-center justify-between px-4">
          <Logo width={52} height={52} />
          <div className="flex items-center gap-2">
            <div className="hidden rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-700 min-[520px]:flex">
              <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
              Secure patient portal
            </div>
            <button
              onClick={handleLogout}
              type="button"
              className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-neutral-200 px-3 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-100 hover:text-neutral-900"
              aria-label="Log out and switch account"
              disabled={isSigningOut}
            >
              <LogOut className="h-4.5 w-4.5" aria-hidden="true" />
              {isSigningOut ? 'Signing out…' : 'Logout'}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex min-h-screen w-full max-w-[1440px]">
        <aside className="sticky top-0 hidden h-screen w-[216px] shrink-0 flex-col border-r border-neutral-200 bg-white px-3 py-5 md:flex print:hidden">
          <div className="border-b border-neutral-100 px-3 pb-5">
            <Logo width={48} height={48} />
            <p className="mt-1 text-[11px] font-medium text-neutral-500">My recovery</p>
          </div>

          <nav className="mt-5 space-y-1" aria-label="Patient navigation">
            {patientNav.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    'flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-emerald-50 font-semibold text-emerald-800'
                      : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900',
                  )
                }
              >
                <item.icon className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto border-t border-neutral-100 pt-3">
            <button
              type="button"
              onClick={handleLogout}
              className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-neutral-500 transition-colors hover:bg-neutral-50 hover:text-neutral-900"
            >
              <LogOut className="h-4.5 w-4.5" aria-hidden="true" />
              Logout
            </button>
          </div>
        </aside>

        <div className="min-w-0 flex-1 pb-20 md:pb-0">
          <main id="main-content" className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 sm:py-6 lg:px-7 print:max-w-none print:p-0">
            <Outlet />
          </main>
        </div>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-neutral-200/80 bg-white/95 px-1 pb-[max(env(safe-area-inset-bottom),4px)] pt-1.5 backdrop-blur md:hidden print:hidden">
        <div className="mx-auto flex max-w-xl items-center">
          {patientNav.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-semibold transition',
                  isActive ? 'text-primary-700' : 'text-neutral-400'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div className={cn('rounded-lg p-1.5', isActive && 'bg-primary-50')}>
                    <item.icon className="h-5 w-5" />
                  </div>
                  <span className="truncate">{item.shortLabel}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
