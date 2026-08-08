import React, { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import { APP_CONFIG } from '../../../config/app.config';
import { MobileNavigationDrawer } from './MobileNavigationDrawer';
import { UserRole } from '../types/landing.types';

interface LandingHeaderProps {
  onOpenPortal: (role?: UserRole) => void;
}

export function LandingHeader({ onOpenPortal }: LandingHeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          height: '74px',
          background: 'rgba(255, 255, 255, 0.94)',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid var(--border-default)',
          boxShadow: isScrolled ? '0 4px 20px rgba(10, 40, 38, 0.05)' : 'none',
          transition: 'all 200ms ease-out',
          display: 'flex',
          alignItems: 'center'
        }}
      >
        <div className="rc-container" style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {/* Logo */}
          <a href="#" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'linear-gradient(135deg, #14756E, #1B8A80)', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '20px' }}>+</div>
            <div>
              <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--teal-950)', letterSpacing: '-0.4px', display: 'block' }}>{APP_CONFIG.name}</span>
              <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--teal-600)', letterSpacing: '0.6px', textTransform: 'uppercase', display: 'block', marginTop: '-2px' }}>CONNECTED REHABILITATION</span>
            </div>
          </a>

          {/* Desktop Navigation Links */}
          <nav style={{ display: 'flex', gap: '28px', alignItems: 'center' }} className="hidden lg:flex">
            {APP_CONFIG.navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--text-secondary)', textDecoration: 'none', transition: 'color 150ms' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--teal-600)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Right Action: Sign In Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className="rc-btn-primary" onClick={() => onOpenPortal()}>
              Sign In
            </button>

            {/* Mobile Menu Trigger */}
            <button
              onClick={() => setMobileDrawerOpen(true)}
              className="lg:hidden"
              style={{ border: 'none', background: 'transparent', padding: '8px', color: 'var(--text-primary)', cursor: 'pointer' }}
              aria-label="Open mobile navigation menu"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      <MobileNavigationDrawer
        isOpen={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        onOpenPortal={onOpenPortal}
      />
    </>
  );
}
