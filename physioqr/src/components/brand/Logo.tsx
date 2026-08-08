import React from 'react';

interface LogoProps {
  width?: number;
  height?: number;
  withText?: boolean;
  className?: string;
  textClassName?: string;
}

export function Logo({
  width = 40,
  height = 40,
  withText = true,
  className = '',
  textClassName = 'text-neutral-900',
}: LogoProps) {
  return (
    <div className={`inline-flex items-center gap-3 ${className}`.trim()}>
      <img
        src="/PhysioQR.png"
        alt="PhysioQR logo"
        width={width}
        height={height}
        className="block object-contain"
      />
      {withText && (
        <span className={`font-bold text-lg tracking-tight ${textClassName}`.trim()}>
          PhysioQR
        </span>
      )}
    </div>
  );
}
