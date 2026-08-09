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
  width = 40,
  height = 40,
  withText = true,
  className = '',
  textClassName = 'text-neutral-900',
  imageScale = 1,
}: LogoProps) {
  return (
    <div className={`inline-flex items-center gap-3 ${className}`.trim()}>
      <span
        style={{
          width,
          height,
          overflow: 'hidden',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <img
          src="/PhysioQR.png"
          alt="PhysioQR logo"
          width={width}
          height={height}
          className="block object-contain"
          style={{ width, height, objectFit: 'contain', transform: `scale(${imageScale})` }}
        />
      </span>
      {withText && (
        <span className={`font-bold text-lg tracking-tight ${textClassName}`.trim()}>
          PhysioQR
        </span>
      )}
    </div>
  );
}
