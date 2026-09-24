import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  CreditCard,
  HeartPulse,
  Home,
  LogOut,
  MessageSquare,
  PlayCircle,
  ShieldCheck,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { Logo } from '@/components/brand/Logo';
import { cn } from '@/lib/cn';

const patientNav = [
  { label: 'Home', shortLabel: 'Home', path: '/patient/dashboard', icon: Home, description: 'Recovery overview' },
  { label: 'Programme', shortLabel: 'Plan', path: '/patient/programme', icon: PlayCircle, description: 'Daily exercises' },
  { label: 'Progress', shortLabel: 'Progress', path: '/patient/progress', icon: BarChart3, description: 'Track recovery' },
  { label: 'Payments', shortLabel: 'Payments', path: '/patient/payments', icon: CreditCard, description: 'Receipts & history' },
  { label: 'Support', shortLabel: 'Support', path: '/patient/support', icon: MessageSquare, description: 'Get help' },
];

export function PatientLayout() {
  const { logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#f6f8f7] print:bg-white">
      <header className="sticky top-0 z-40 border-b border-neutral-200/80 bg-white/95 backdrop-blur md:hidden print:hidden">
        <div className="flex h-16 items-center justify-between px-4">
          <Logo width={52} height={52} />
          <div className="flex items-center gap-2">
            <div className="hidden rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-700 min-[380px]:flex">
              <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
              Secure patient portal
            </div>
            <button
              onClick={handleLogout}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900"
              aria-label="Logout"
            >
              <LogOut className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex min-h-screen w-full max-w-[1440px]">
        <aside className="sticky top-0 hidden h-screen w-[260px] shrink-0 flex-col border-r border-neutral-200/80 bg-white px-4 py-5 md:flex print:hidden">
          <div className="px-2">
            <Logo width={62} height={62} />
          </div>

          <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
            <div className="flex items-center gap-2 text-sm font-extrabold text-emerald-900">
              <HeartPulse className="h-4.5 w-4.5 text-primary-600" />
              My Recovery
            </div>
            <p className="mt-1.5 text-xs leading-5 text-emerald-800/75">
              Follow your prescribed programme and record progress every day.
            </p>
          </div>

          <nav className="mt-6 space-y-1.5" aria-label="Patient navigation">
            {patientNav.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center gap-3 rounded-xl px-3 py-3 transition',
                    isActive
                      ? 'bg-primary-50 text-primary-800 ring-1 ring-primary-100'
                      : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-950'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <div className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-lg',
                      isActive ? 'bg-white text-primary-700 shadow-sm' : 'bg-neutral-100 text-neutral-500 group-hover:bg-white'
                    )}>
                      <item.icon className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold">{item.label}</div>
                      <div className={cn('text-[11px]', isActive ? 'text-primary-600' : 'text-neutral-400')}>{item.description}</div>
                    </div>
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100">
                <LogOut className="h-4 w-4" />
              </div>
              Logout
            </button>
            <p className="mt-4 px-3 text-[10px] leading-4 text-neutral-400">
              PhysioQR patient portal · Your recovery data stays connected to your care plan.
            </p>
          </div>
        </aside>

        <div className="min-w-0 flex-1 pb-20 md:pb-0">
          <main id="main-content" className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-8 print:max-w-none print:p-0">
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
