import React from 'react';
import { APP_CONFIG } from '../../../config/app.config';
import { Logo } from '../../../components/brand/Logo';
import { UserRole } from '../types/landing.types';
import { Globe } from 'lucide-react';

interface LandingFooterProps {
  onOpenPortal: (role?: UserRole) => void;
}

export function LandingFooter({ onOpenPortal }: LandingFooterProps) {
  return (
    <footer
      style={{
        background: '#062B29',
        color: '#A9C5C1',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        paddingTop: '48px',
        paddingBottom: '28px',
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif"
      }}
    >
      <div className="rc-container" style={{ maxWidth: '1280px', marginInline: 'auto', paddingInline: '32px' }}>
        
        {/* Minimal Access Strip */}
       

        {/* Minimal 4-Column Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '36px', marginBottom: '40px' }} className="rc-responsive-grid-4 grid-cols-1 md:grid-cols-4">
          
          {/* Brand Info */}
          <div>
            <Logo width={210} height={64} withText={false} imageScale={2.8} className="mb-3" />

            <p style={{ fontSize: '13.5px', color: '#A9C5C1', lineHeight: '1.6', margin: 0, maxWidth: '280px' }}>
              Doctor-connected digital rehabilitation, guiding patients from referral to structured day-wise recovery.
            </p>
          </div>

          {/* Platform */}
          <div>
            <h4 style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>PLATFORM</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13.5px' }}>
              <li><a href="#how-it-works" style={{ color: '#C7DDDA', textDecoration: 'none' }}>How It Works</a></li>
              <li><a href="#patients" style={{ color: '#C7DDDA', textDecoration: 'none' }}>For Patients</a></li>
              <li><a href="#doctors" style={{ color: '#C7DDDA', textDecoration: 'none' }}>For Doctors</a></li>
              <li><a href="#platform" style={{ color: '#C7DDDA', textDecoration: 'none' }}>Rehabilitation</a></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>SUPPORT</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13.5px' }}>
              <li><a href="#faq" style={{ color: '#C7DDDA', textDecoration: 'none' }}>Help Centre</a></li>
              <li><a href="#faq" style={{ color: '#C7DDDA', textDecoration: 'none' }}>FAQs</a></li>
              <li><a href="#safety" style={{ color: '#C7DDDA', textDecoration: 'none' }}>Safety Guidance</a></li>
              <li><a href={`mailto:${APP_CONFIG.contactEmail}`} style={{ color: '#C7DDDA', textDecoration: 'none' }}>Contact Support</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>LEGAL</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13.5px' }}>
              <li><a href="#" style={{ color: '#C7DDDA', textDecoration: 'none' }}>Privacy Policy</a></li>
              <li><a href="#" style={{ color: '#C7DDDA', textDecoration: 'none' }}>Terms of Service</a></li>
              <li><a href="#" style={{ color: '#C7DDDA', textDecoration: 'none' }}>Refund Policy</a></li>
              <li><a href="#" style={{ color: '#C7DDDA', textDecoration: 'none' }}>Medical Disclaimer</a></li>
            </ul>
          </div>
        </div>

        {/* Minimal Bottom Bar */}
        <div
          style={{
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            paddingTop: '20px',
            display: 'flex',
          
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            fontSize: '12.5px',
            color: '#789E99'
          }}
        >
          <div>(c) {APP_CONFIG.copyrightYear} {APP_CONFIG.name}. All rights reserved.</div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#A9C5C1' }}>
            <Globe className="w-3.5 h-3.5 text-teal-400" />
            <span>India - English</span>
          </div>
        </div>

      </div>
    </footer>
  );
}
