import React from 'react';

interface LogoProps {
  width?: number;
  height?: number;
  withText?: boolean;
  className?: string;
  textClassName?: string;
  imageScale?: number;
}

export function Logo({
  width = 56,
  height = 56,
  withText = true,
  className = '',
  textClassName = '',
  imageScale = 1,
}: LogoProps) {
  return (
    <div
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          width: `${width}px`,
          height: `${height}px`,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        <img
          src="/PhysioQR.png"
          alt="PhysioQR logo"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            display: 'block',
            transform: `scale(${imageScale})`,
            transformOrigin: 'center',
          }}
        />
      </span>

      {withText && (
        <span
          className={textClassName}
          style={{
            fontSize: '22px',
            fontWeight: 800,
            color: '#169B45',
            lineHeight: 1,
            whiteSpace: 'nowrap',
          }}
        >
          PhysioQR
        </span>
      )}
    </div>
  );
}
