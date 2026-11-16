import React from 'react';
import { CrestConfig } from '../types/football';

interface TeamCrestProps {
  crest: CrestConfig;
  size?: number;
  className?: string;
}

export const TeamCrest: React.FC<TeamCrestProps> = ({ crest, size = 48, className = '' }) => {
  const { shape, primary, secondary, accent, monogram } = crest;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      {shape === 'circle' && (
        <>
          <circle cx="32" cy="32" r="28" fill={secondary} stroke={accent} strokeWidth="3.5" />
          <circle cx="32" cy="32" r="21" fill={primary} />
          <path d="M12 32 H52" stroke={secondary} strokeWidth="6" opacity="0.25" />
        </>
      )}
      {shape === 'diamond' && (
        <>
          <polygon points="32,3 61,32 32,61 3,32" fill={secondary} stroke={accent} strokeWidth="3" />
          <polygon points="32,11 53,32 32,53 11,32" fill={primary} />
        </>
      )}
      {shape === 'shield' && (
        <>
          <path
            d="M10 10 H54 V32 C54 47 32 58 32 58 C32 58 10 47 10 32 Z"
            fill={secondary}
            stroke={accent}
            strokeWidth="3"
          />
          <path
            d="M16 15 H48 V31 C48 42 32 51 32 51 C32 51 16 42 16 31 Z"
            fill={primary}
          />
        </>
      )}
      {shape === 'crest' && (
        <>
          <path
            d="M12 14 L22 8 L32 14 L42 8 L52 14 V34 C52 47 32 58 32 58 C32 58 12 47 12 34 Z"
            fill={secondary}
            stroke={accent}
            strokeWidth="3"
          />
          <path
            d="M17 19 L32 15 L47 19 V33 C47 43 32 51 32 51 C32 51 17 43 17 33 Z"
            fill={primary}
          />
        </>
      )}
      <rect
        x="15"
        y="24"
        width="34"
        height="16"
        rx="2"
        fill="#0b1120"
        fillOpacity="0.82"
        stroke={accent}
        strokeWidth="1.2"
      />
      <text
        x="32"
        y="35.5"
        textAnchor="middle"
        fill="#f8fafc"
        fontSize={monogram.length > 2 ? '11' : '13'}
        fontWeight="800"
        fontFamily="Barlow Condensed, sans-serif"
        letterSpacing="0.8"
      >
        {monogram}
      </text>
    </svg>
  );
};
