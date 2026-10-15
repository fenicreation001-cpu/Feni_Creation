import React from 'react';
import { Box } from '@mui/material';

interface PeacockLogoProps {
  size?: number;
  borderRadius?: number | string;
}

export const PeacockLogo: React.FC<PeacockLogoProps> = ({ size = 36, borderRadius = '10px' }) => {
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius,
        bgcolor: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(14, 165, 233, 0.25)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        flexShrink: 0,
        p: 0.3,
      }}
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: '100%', height: '100%', display: 'block' }}
      >
        <defs>
          <linearGradient id="peacockBody" x1="20%" y1="0%" x2="80%" y2="100%">
            <stop offset="0%" stopColor="#0284c7" />
            <stop offset="50%" stopColor="#0d9488" />
            <stop offset="100%" stopColor="#1e3a8a" />
          </linearGradient>
          <linearGradient id="featherGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="60%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
          <linearGradient id="featherGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="60%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#d946ef" />
          </linearGradient>
          <radialGradient id="eyeGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="45%" stopColor="#f59e0b" />
            <stop offset="70%" stopColor="#0d9488" />
            <stop offset="100%" stopColor="#1e1b4b" />
          </radialGradient>
        </defs>

        {/* Fan of Peacock Feathers in Background */}
        <path
          d="M50 82 C30 50 20 30 35 15 C45 25 48 55 50 82 Z"
          fill="url(#featherGrad1)"
          opacity="0.85"
        />
        <path
          d="M50 82 C70 50 80 30 65 15 C55 25 52 55 50 82 Z"
          fill="url(#featherGrad1)"
          opacity="0.85"
        />
        <path
          d="M50 82 C15 65 10 40 25 25 C38 35 44 60 50 82 Z"
          fill="url(#featherGrad2)"
          opacity="0.75"
        />
        <path
          d="M50 82 C85 65 90 40 75 25 C62 35 56 60 50 82 Z"
          fill="url(#featherGrad2)"
          opacity="0.75"
        />
        <path
          d="M50 82 C42 45 42 20 50 10 C58 20 58 45 50 82 Z"
          fill="url(#featherGrad1)"
        />

        {/* Feather Eyes (Golden / Cyan) */}
        <circle cx="50" cy="18" r="5.5" fill="url(#eyeGrad)" />
        <circle cx="50" cy="18" r="2.2" fill="#1e1b4b" />

        <circle cx="34" cy="22" r="4.8" fill="url(#eyeGrad)" />
        <circle cx="34" cy="22" r="1.8" fill="#1e1b4b" />

        <circle cx="66" cy="22" r="4.8" fill="url(#eyeGrad)" />
        <circle cx="66" cy="22" r="1.8" fill="#1e1b4b" />

        <circle cx="23" cy="33" r="4" fill="url(#eyeGrad)" />
        <circle cx="77" cy="33" r="4" fill="url(#eyeGrad)" />

        {/* Peacock Body & Crest */}
        <path
          d="M48 42 C48 35 55 35 55 42 C55 48 58 56 56 68 C53 78 47 78 44 68 C42 56 48 48 48 42 Z"
          fill="url(#peacockBody)"
        />
        {/* Crown / Crest */}
        <path d="M50 35 L47 28 M50 35 L50 26 M50 35 L53 28" stroke="#f59e0b" strokeWidth="1.2" strokeLinecap="round" />
        <circle cx="47" cy="28" r="1" fill="#f59e0b" />
        <circle cx="50" cy="26" r="1" fill="#f59e0b" />
        <circle cx="53" cy="28" r="1" fill="#f59e0b" />

        {/* Beak */}
        <path d="M54 39 L60 41 L54 43 Z" fill="#f59e0b" />
        {/* Eye */}
        <circle cx="51.5" cy="39" r="1.2" fill="#ffffff" />
        <circle cx="51.5" cy="39" r="0.6" fill="#0f172a" />
      </svg>
    </Box>
  );
};
