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
  width = 48,
  height = 48,
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
        gap: '8px',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          width,
          height,
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
            width: `${width}px`,
            height: `${height}px`,
            objectFit: 'contain',
            display: 'block',
            transform: `scale(${imageScale})`,
          }}
        />
      </span>

      {withText && (
        <span
          className={textClassName}
          style={{
            fontSize: '24px',
            fontWeight: 800,
            lineHeight: 1,
            letterSpacing: '-0.5px',
            whiteSpace: 'nowrap',
            color: '#168C45',
          }}
        >
          PhysioQR
        </span>
      )}
    </div>
  );
}
