'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/shadcn/utils';

export type OrbState = 'idle' | 'connecting' | 'listening' | 'thinking' | 'speaking';

interface ManeuverOrbProps {
  state?: OrbState;
  size?: number;
  className?: string;
}

function listenPath(t: number, amp: number): string {
  const pts: string[] = [];
  const W = 240,
    H = 60;
  for (let i = 0; i <= 48; i++) {
    const x = (i / 48) * W;
    const k = i / 48;
    const env = Math.sin(k * Math.PI);
    const y =
      H / 2 +
      Math.sin(k * 12 + t * 2.2) * 14 * amp * env +
      Math.sin(k * 26 + t * 3.4) * 6 * amp * env;
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return 'M' + pts.join(' L');
}

export function ManeuverOrb({ state = 'idle', size = 380, className }: ManeuverOrbProps) {
  const [tick, setTick] = useState(0);
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const loop = () => {
      setTick((t) => t + 1);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const t = tick * 0.04;

  // Driven amplitude per state
  let amp: number;
  switch (state) {
    case 'connecting':
      amp = 0.18 + 0.1 * Math.sin(t * 1.6);
      break;
    case 'listening':
      amp = 0.3 + 0.22 * (0.5 + 0.5 * Math.sin(t * 1.2)) * (0.6 + 0.4 * Math.sin(t * 3.1 + 1.2));
      break;
    case 'thinking':
      amp = 0.22 + 0.1 * Math.sin(t * 0.6);
      break;
    case 'speaking':
      amp = 0.55 + 0.3 * (0.5 + 0.5 * Math.sin(t * 2.6 + Math.sin(t * 1.3) * 1.5));
      break;
    default: // idle
      amp = 0.08 + 0.04 * Math.sin(t * 0.8);
  }

  const ringScale = 1 + amp * 0.18;
  const haloOpacity = 0.5 + amp * 0.5;
  const innerScale = 1 + amp * 0.06;

  const bars = useMemo(() => Array.from({ length: 28 }), []);

  const particles = useMemo(
    () =>
      Array.from({ length: 12 }).map((_, i) => ({
        angle: (i / 12) * Math.PI * 2,
        r: 110 + (i % 3) * 14,
      })),
    []
  );

  return (
    <div
      className={cn(`mnvr-orb mnvr-orb-${state}`, className)}
      style={{ width: size, height: size }}
    >
      {/* Diffuse outer halo */}
      <div
        className="mnvr-orb-halo"
        style={{
          transform: `scale(${ringScale * 1.15})`,
          opacity: haloOpacity * 0.85,
        }}
      />

      {/* Pulse rings — idle + listening */}
      {(state === 'listening' || state === 'idle') && (
        <>
          <div
            className="mnvr-orb-pulse-ring"
            style={{ animationDuration: state === 'listening' ? '2.2s' : '4s' }}
          />
          <div
            className="mnvr-orb-pulse-ring mnvr-delay-2"
            style={{ animationDuration: state === 'listening' ? '2.2s' : '4s' }}
          />
          <div
            className="mnvr-orb-pulse-ring mnvr-delay-3"
            style={{ animationDuration: state === 'listening' ? '2.2s' : '4s' }}
          />
        </>
      )}

      {/* Connecting: spinning dashed ring */}
      {state === 'connecting' && (
        <svg className="mnvr-orb-spinner" viewBox="0 0 240 240">
          <circle
            cx="120"
            cy="120"
            r="108"
            fill="none"
            stroke="var(--bio-indigo)"
            strokeWidth="1.2"
            strokeDasharray="2 8"
            opacity="0.7"
          />
          <circle
            cx="120"
            cy="120"
            r="100"
            fill="none"
            stroke="var(--bio-cyan)"
            strokeWidth="0.8"
            strokeDasharray="40 220"
            opacity="0.9"
          />
        </svg>
      )}

      {/* Thinking: rotating particle cloud */}
      {state === 'thinking' && (
        <div className="mnvr-orb-particles">
          {particles.map((p, i) => (
            <span
              key={i}
              style={{
                left: `calc(50% + ${Math.cos(p.angle + t * 0.4) * p.r}px)`,
                top: `calc(50% + ${Math.sin(p.angle + t * 0.4) * p.r}px)`,
                opacity: 0.4 + 0.4 * Math.sin(t * 1.5 + i),
              }}
            />
          ))}
        </div>
      )}

      {/* Mid ring — scales with amplitude */}
      <svg
        className="mnvr-orb-mid-ring"
        viewBox="0 0 240 240"
        style={{ transform: `scale(${ringScale})` }}
      >
        <defs>
          <radialGradient id="mnvrRingGrad" cx="50%" cy="50%" r="50%">
            <stop offset="60%" stopColor="rgba(129,140,248,0)" />
            <stop offset="92%" stopColor="rgba(129,140,248,0.55)" />
            <stop offset="100%" stopColor="rgba(129,140,248,0)" />
          </radialGradient>
        </defs>
        <circle
          cx="120"
          cy="120"
          r="98"
          fill="none"
          stroke="url(#mnvrRingGrad)"
          strokeWidth="1.5"
        />
        <circle
          cx="120"
          cy="120"
          r="86"
          fill="none"
          stroke="rgba(165,176,251,0.25)"
          strokeWidth="0.6"
        />
      </svg>

      {/* Core orb */}
      <div className="mnvr-orb-core" style={{ transform: `scale(${innerScale})` }}>
        <div className="mnvr-orb-core-glow" style={{ opacity: 0.85 + amp * 0.2 }} />
        <div className="mnvr-orb-core-highlight" />
        <div
          className="mnvr-orb-swirl"
          style={{ transform: `rotate(${tick * 0.4}deg) scale(${1 + amp * 0.08})` }}
        />
      </div>

      {/* Speaking: waveform bars circling the orb */}
      {state === 'speaking' && (
        <div className="mnvr-orb-wave">
          {bars.map((_, i) => {
            const angle = (i / bars.length) * Math.PI * 2;
            const sub = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * 3 + i * 0.45));
            const len = 14 + sub * 36 * amp * 2.2;
            return (
              <span
                key={i}
                style={{
                  height: `${len}px`,
                  transform: `translate(-50%, -50%) rotate(${(angle * 180) / Math.PI}deg) translateY(-${size * 0.36}px)`,
                  opacity: 0.5 + sub * 0.5,
                }}
              />
            );
          })}
        </div>
      )}

      {/* Listening: reactive waveform inside ring */}
      {state === 'listening' && (
        <svg className="mnvr-orb-listen-wave" viewBox="0 0 240 60" preserveAspectRatio="none">
          {[0, 1, 2].map((layer) => (
            <path
              key={layer}
              d={listenPath(t + layer * 0.7, amp + layer * 0.05)}
              fill="none"
              stroke={
                layer === 0
                  ? 'var(--bio-indigo)'
                  : layer === 1
                    ? 'var(--text-bio-lum)'
                    : 'var(--bio-cyan)'
              }
              strokeWidth={layer === 0 ? 1.6 : 0.9}
              strokeLinecap="round"
              opacity={layer === 0 ? 0.9 : 0.45}
            />
          ))}
        </svg>
      )}
    </div>
  );
}
