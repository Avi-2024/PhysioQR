import React from "react";

interface LogoProps {
  width?: number;
  height?: number;
  className?: string;
  textClassName?: string;
}

export function Logo({
  width = 54,
  height = 54,
  className = "",
  textClassName = "text-neutral-900",
}: LogoProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "4px",
      }}
    >
      <img
        src="/PhysioQR.png"
        alt="PhysioQR logo"
        style={{
          width: "56px",
          height: "56px",
          objectFit: "contain",
          display: "block",
          flexShrink: 0,
        }}
      />

      <span
        style={{
          fontSize: "22px",
          fontWeight: 800,
color: '#169B45',
          lineHeight: 1,
          whiteSpace: "nowrap",
        }}
      >
        PhysioQR
      </span>
    </div>
  );
}
