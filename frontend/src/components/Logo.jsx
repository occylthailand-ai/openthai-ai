import React from 'react';
import logoSvg from '../assets/logo.svg';

/**
 * OpenThaiAi Logo Component
 *
 * Props:
 *   size   — "sm" | "md" | "lg" | "xl"  (default: "md")
 *   emblemOnly — show only the hex emblem, no wordmark (default: false)
 *   style  — extra inline styles
 */
const SIZES = {
  sm:  { width: 120, height: 30 },
  md:  { width: 200, height: 50 },
  lg:  { width: 280, height: 70 },
  xl:  { width: 400, height: 100 },
};

const EMBLEM_SIZES = {
  sm:  32,
  md:  48,
  lg:  64,
  xl:  96,
};

export const Logo = ({ size = 'md', style = {} }) => {
  const { width, height } = SIZES[size] || SIZES.md;
  return (
    <img
      src={logoSvg}
      alt="OpenThaiAi"
      width={width}
      height={height}
      style={{ display: 'block', ...style }}
    />
  );
};

export const LogoEmblem = ({ size = 'md', style = {} }) => {
  const s = EMBLEM_SIZES[size] || EMBLEM_SIZES.md;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 80 80"
      width={s}
      height={s}
      style={style}
    >
      <defs>
        <linearGradient id="e_grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#a78bfa"/>
          <stop offset="100%" stopColor="#6366f1"/>
        </linearGradient>
        <linearGradient id="e_gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fbbf24"/>
          <stop offset="100%" stopColor="#f59e0b"/>
        </linearGradient>
        <radialGradient id="e_glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#c4b5fd" stopOpacity="0.25"/>
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0"/>
        </radialGradient>
        <filter id="e_shadow">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#6366f1" floodOpacity="0.5"/>
        </filter>
        <clipPath id="e_clip">
          <polygon points="40,6 70,23 70,57 40,74 10,57 10,23"/>
        </clipPath>
      </defs>

      <circle cx="40" cy="40" r="38" fill="url(#e_glow)"/>
      <polygon points="40,4 72,22 72,58 40,76 8,58 8,22"
               fill="url(#e_grad)" filter="url(#e_shadow)"/>
      <polygon points="40,10 66,25 66,55 40,70 14,55 14,25"
               fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>

      <g clipPath="url(#e_clip)">
        <circle cx="40" cy="40" r="18" fill="rgba(255,255,255,0.1)"/>
        <circle cx="40" cy="40" r="11" fill="rgba(255,255,255,0.15)"/>

        {[0,45,90,135,180,225,270,315].map((deg, i) => (
          <ellipse key={i} cx="40" cy="26" rx="5" ry="11"
                   fill={`rgba(255,255,255,${i % 2 === 0 ? 0.28 : 0.16})`}
                   transform={`rotate(${deg},40,40)`}/>
        ))}

        {[{cx:40,cy:22},{cx:58,cy:40},{cx:22,cy:40},{cx:40,cy:58}].map((p, i) => (
          <circle key={i} cx={p.cx} cy={p.cy} r="3" fill="url(#e_gold)"/>
        ))}
        <line x1="40" y1="29" x2="40" y2="22" stroke="rgba(251,191,36,0.7)" strokeWidth="1.5"/>
        <line x1="51" y1="40" x2="58" y2="40" stroke="rgba(251,191,36,0.7)" strokeWidth="1.5"/>
        <line x1="29" y1="40" x2="22" y2="40" stroke="rgba(251,191,36,0.7)" strokeWidth="1.5"/>
        <line x1="40" y1="51" x2="40" y2="58" stroke="rgba(251,191,36,0.7)" strokeWidth="1.5"/>

        <text x="40" y="47" fontFamily="serif" fontSize="20" fontWeight="900"
              fill="white" textAnchor="middle" dominantBaseline="middle">อ</text>
      </g>

      <polygon points="40,4 72,22 72,58 40,76 8,58 8,22"
               fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5"/>
    </svg>
  );
};

export default Logo;
