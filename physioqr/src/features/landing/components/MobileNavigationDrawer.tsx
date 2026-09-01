import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { APP_CONFIG } from '../../../config/app.config';
import { Logo } from '../../../components/brand/Logo';
import { UserRole } from '../types/landing.types';

interface MobileNavigationDrawerProps { isOpen: boolean; onClose: () => void; onOpenPortal: (role?: UserRole) => void; }

export function MobileNavigationDrawer({ isOpen, onClose, onOpenPortal }: MobileNavigationDrawerProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) { window.addEventListener('keydown', handleKeyDown); document.body.style.overflow = 'hidden'; }
    return () => { window.removeEventListener('keydown', handleKeyDown); document.body.style.overflow = 'auto'; };
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  return <div className="rc-modal-overlay" onClick={onClose} style={{ justifyContent: 'flex-end', alignItems: 'stretch', padding: 0 }}>
    <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 'min(320px, 100vw)', height: '100%', background: '#FFFFFF', padding: '20px', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-elevated)', animation: 'slideLeft 200ms ease-out' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', paddingBottom: '16px', borderBottom: '1px solid var(--border-default)' }}>
        <Link to="/" onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, textDecoration: 'none' }}><Logo width={210} height={56} imageScale={2.8} /></Link>
        <button onClick={onClose} style={{ border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><X className="w-5 h-5" /></button>
      </div>
      <ul style={{ listStyle: 'none', padding: '24px 0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {APP_CONFIG.navLinks.map((link) => <li key={link.href}>{link.href.startsWith('/') ? <Link to={link.href} onClick={onClose} style={navStyle}>{link.label}</Link> : <a href={link.href} onClick={onClose} style={navStyle}>{link.label}</a>}</li>)}
      </ul>
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '16px', borderTop: '1px solid var(--border-default)' }}>
        <Link to="/register" onClick={onClose} className="rc-btn-outline" style={{ width: '100%', justifyContent: 'center', textDecoration: 'none' }} aria-label="Register as a patient">Register</Link>
        <button className="rc-btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => { onClose(); onOpenPortal(); }}>Sign In</button>
      </div>
    </div>
  </div>;
}

const navStyle: React.CSSProperties = { fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', minHeight: '44px' };
