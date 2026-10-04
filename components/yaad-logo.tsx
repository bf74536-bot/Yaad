'use client';

import { SoundWave } from '@/components/sound-wave';

export function YaadLogo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const dim = size === 'sm' ? 40 : size === 'lg' ? 80 : 56;
  const font = size === 'sm' ? 'text-2xl' : size === 'lg' ? 'text-5xl' : 'text-3xl';
  const ringSize = size === 'sm' ? 36 : size === 'lg' ? 72 : 50;
  const tagline = size === 'sm' ? 'text-[8px]' : 'text-[10px]';
  return (
    <div className="flex flex-col items-center gap-0.5 select-none">
      <div className="flex items-center" style={{ height: dim }}>
        <span
          className={`${font} font-black tracking-tight leading-none`}
          style={{ color: '#FFFFFF' }}
        >
          Y
        </span>
        <span className="relative flex items-center" style={{ height: dim }}>
          {/* Orbit ring */}
          <svg
            width={ringSize}
            height={ringSize}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            viewBox="0 0 50 50"
            fill="none"
          >
            <ellipse
              cx="25"
              cy="25"
              rx="24"
              ry="14"
              stroke="#00D1FF"
              strokeWidth="1.2"
              strokeOpacity="0.5"
              transform="rotate(-18 25 25)"
            />
            <circle cx="49" cy="32" r="1.8" fill="#FFEB00" />
          </svg>
          <span
            className={`${font} font-black tracking-tight leading-none`}
            style={{ color: '#00D1FF', zIndex: 1 }}
          >
            AAD
          </span>
        </span>
      </div>
      <span
        className={`${tagline} font-medium tracking-widest uppercase`}
        style={{ color: '#6B7B9A' }}
      >
        Jo Kabhi Nahi Bhoolta
      </span>
    </div>
  );
}
