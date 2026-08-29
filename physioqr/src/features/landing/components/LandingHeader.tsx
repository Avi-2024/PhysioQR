import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { APP_CONFIG } from '../../../config/app.config';
import { Logo } from '../../../components/brand/Logo';
import { MobileNavigationDrawer } from './MobileNavigationDrawer';
import { UserRole } from '../types/landing.types';

interface LandingHeaderProps {
  onOpenPortal: (role?: UserRole) => void;
}

export function LandingHeader({ onOpenPortal }: LandingHeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <header style={{ position: 'sticky', top: 0, zIndex: 40, height: '74px', background: 'rgba(255, 255, 255, 0.94)', backdropFilter: 'blur(8px)', borderBottom: '1px solid var(--border-default)', boxShadow: isScrolled ? '0 4px 20px rgba(10, 40, 38, 0.05)' : 'none', transition: 'all 200ms ease-out', display: 'flex', alignItems: 'center' }}>
        <div className="rc-container rc-landing-header-grid" style={{ width: '100%', display: 'grid', gridTemplateColumns: '260px minmax(0, 1fr) 230px', alignItems: 'center', gap: '12px' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', minWidth: 0, justifySelf: 'start' }}>
            <Logo width={210} height={60} imageScale={2.8} />
          </Link>

          <nav className="hidden lg:flex items-center justify-center gap-5 xl:gap-7">
            {APP_CONFIG.navLinks.map((link) => {
              const sharedStyle = { fontSize: '14.5px', fontWeight: 600, color: 'var(--text-secondary)', textDecoration: 'none', transition: 'color 150ms', whiteSpace: 'nowrap' } as React.CSSProperties;
              const handlers = {
                onMouseEnter: (e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.color = 'var(--teal-600)'),
                onMouseLeave: (e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.color = 'var(--text-secondary)'),
              };
              return link.href.startsWith('/') ? <Link key={link.href} to={link.href} style={sharedStyle} {...handlers}>{link.label}</Link> : <a key={link.href} href={link.href} style={sharedStyle} {...handlers}>{link.label}</a>;
            })}
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', flexShrink: 0 }}>
            <Link to="/register" className="hidden lg:inline-flex rc-btn-outline" style={{ minHeight: '42px', textDecoration: 'none', alignItems: 'center', justifyContent: 'center' }}>
              Register
            </Link>
            <button className="rc-btn-primary rc-header-signin" onClick={() => onOpenPortal()}>
              Sign In
            </button>
            <button onClick={() => setMobileDrawerOpen(true)} className="lg:hidden" style={{ border: 'none', background: 'transparent', padding: '10px', minHeight: '44px', minWidth: '44px', color: 'var(--text-primary)', cursor: 'pointer' }} aria-label="Open mobile navigation menu">
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      <MobileNavigationDrawer isOpen={mobileDrawerOpen} onClose={() => setMobileDrawerOpen(false)} onOpenPortal={onOpenPortal} />
    </>
  );
}
