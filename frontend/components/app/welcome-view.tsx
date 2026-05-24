'use client';

import { ManeuverOrb } from '@/components/app/maneuver-orb';

const PROMPTS = [
  'What does Maneuver do?',
  'We run a logistics startup.',
  'Can you automate customer support?',
];

interface WelcomeViewProps {
  startButtonText: string;
  onStartCall: () => void;
}

export const WelcomeView = ({
  startButtonText,
  onStartCall,
  ref,
}: React.ComponentProps<'div'> & WelcomeViewProps) => {
  return (
    <div ref={ref} className="mnvr-stage">
      {/* Hero */}
      <div className="mnvr-hero">
        <div className="mnvr-hero-label">REALTIME AI CONSULTANT</div>
        <h1 className="mnvr-hero-title">
          Maneuver Discovery Agent
        </h1>
        <p className="mnvr-hero-subtitle">
          Realtime conversations for AI strategy, automation, and lead qualification.
        </p>
      </div>

      {/* Orb — idle state */}
      <div className="mnvr-orb-zone">
        <ManeuverOrb state="idle" size={300} />
      </div>

      {/* Suggested prompts */}
      <div className="mnvr-prompts">
        {PROMPTS.map((p) => (
          <button key={p} className="mnvr-prompt-pill" onClick={onStartCall}>
            <span className="mnvr-prompt-arrow">↗</span>
            <span>{p}</span>
          </button>
        ))}
      </div>

      {/* Start button */}
      <div className="mnvr-control-bar">
        <button className="mnvr-ctrl-primary" onClick={onStartCall}>
          <span className="mnvr-mic-glyph">
            <svg width="11" height="14" viewBox="0 0 11 14" fill="none">
              <rect x="3" y="0" width="5" height="9" rx="2.5" fill="currentColor" />
              <path
                d="M1 7 Q1 11 5.5 11 Q10 11 10 7"
                stroke="currentColor"
                strokeWidth="1.2"
                fill="none"
                strokeLinecap="round"
              />
              <line x1="5.5" y1="11" x2="5.5" y2="13.5" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          </span>
          {startButtonText}
        </button>
      </div>

      {/* Microphone hint */}
      <div className="mnvr-mic-hint">
        <span className="mnvr-mini-mic" />
        <span>microphone access required</span>
      </div>
    </div>
  );
};
