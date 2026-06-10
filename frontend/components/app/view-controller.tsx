'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  useAgent,
  useMaybeRoomContext,
  useSessionContext,
  useSessionMessages,
} from '@livekit/components-react';
import type { AgentState } from '@livekit/components-react';
import type { AppConfig } from '@/app-config';
import { AgentSessionView_01 } from '@/components/agents-ui/blocks/agent-session-view-01';
import { SessionSummary } from '@/components/app/session-summary';
import { WelcomeView } from '@/components/app/welcome-view';

const MotionWelcomeView = motion.create(WelcomeView);
const MotionSessionView = motion.create(AgentSessionView_01);
const MotionSummaryView = motion.create(SessionSummary);

const FADE_PROPS = {
  variants: {
    visible: { opacity: 1 },
    hidden: { opacity: 0 },
  },
  initial: 'hidden' as const,
  animate: 'visible' as const,
  exit: 'hidden' as const,
  transition: { duration: 0.45, ease: 'linear' as const },
};

const STATE_LABEL: Partial<Record<AgentState | 'idle', string>> = {
  connecting: 'CONNECTING',
  initializing: 'CONNECTING',
  listening: 'LISTENING',
  thinking: 'THINKING',
  speaking: 'SPEAKING',
};

function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

interface ViewControllerProps {
  appConfig: AppConfig;
}

export function ViewController({ appConfig }: ViewControllerProps) {
  const { isConnected, start } = useSessionContext();
  const { state: agentState } = useAgent();
  const room = useMaybeRoomContext();

  // ── Session messages (for message count in summary) ────────────
  const session = useSessionContext();
  const { messages } = useSessionMessages(session);
  const lastMsgCountRef = useRef(0);
  useEffect(() => {
    if (messages.length > 0) lastMsgCountRef.current = messages.length;
  }, [messages]);

  // ── Session timer ───────────────────────────────────────────────
  const [elapsed, setElapsed] = useState(0);
  const elapsedRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  // Keep a ref in sync so we can read latest value synchronously
  useEffect(() => {
    elapsedRef.current = elapsed;
  }, [elapsed]);

  useEffect(() => {
    if (isConnected) {
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } else {
      clearInterval(timerRef.current);
      setElapsed(0);
    }
    return () => clearInterval(timerRef.current);
  }, [isConnected]);

  // ── Summary phase state ─────────────────────────────────────────
  const [showSummary, setShowSummary] = useState(false);
  const [finalElapsed, setFinalElapsed] = useState(0);
  const [finalMsgCount, setFinalMsgCount] = useState(0);
  const wasConnectedRef = useRef(false);

  useEffect(() => {
    if (isConnected) {
      wasConnectedRef.current = true;
    } else if (wasConnectedRef.current) {
      // Session just ended — snapshot data before timer resets
      wasConnectedRef.current = false;
      setFinalElapsed(elapsedRef.current);
      setFinalMsgCount(lastMsgCountRef.current);
      setShowSummary(true);
    }
  }, [isConnected]);

  const handleStartNew = () => {
    setShowSummary(false);
    lastMsgCountRef.current = 0;
  };

  const handleStartCall = () => {
    if (room) room.startAudio().catch(() => {});
    start();
  };

  // ── Derived display values ──────────────────────────────────────
  const isLive = isConnected && agentState !== 'disconnected';
  const currentLabel = isConnected ? STATE_LABEL[agentState] : undefined;
  const showStateMeter = currentLabel === 'LISTENING' || currentLabel === 'SPEAKING';

  // Topbar chip text
  const chipText = () => {
    if (showSummary) return 'SESSION COMPLETE';
    if (!isConnected) return 'READY';
    if (agentState === 'connecting' || agentState === 'initializing') return 'CONNECTING';
    if (isLive) return `LIVE · ${fmtTime(elapsed)}`;
    return 'READY';
  };

  // Chip is "live" (green dot) when in-session OR summary
  const chipLive = isLive || showSummary;

  return (
    <div className="mnvr-shell">
      {/* Ambient background */}
      <div className="mnvr-bg-layer" />
      <div className="mnvr-bg-grain" />
      <div className="mnvr-bg-vignette" />

      {/* Topbar */}
      <div className="mnvr-topbar">
        <div className="mnvr-brand">
          <span className="mnvr-brand-mark" />
          <span className="mnvr-brand-name">MANEUVER</span>
          <span className="mnvr-brand-divider" />
          <span>Discovery&nbsp;Agent · v1.0</span>
        </div>
        <div className="mnvr-status-chip" data-live={String(chipLive)}>
          <span className="mnvr-dot" />
          {chipText()}
        </div>
      </div>

      {/* Three-phase content */}
      <AnimatePresence mode="wait">
        {/* Phase 1 — Welcome */}
        {!isConnected && !showSummary && (
          <MotionWelcomeView
            key="welcome"
            {...FADE_PROPS}
            startButtonText={appConfig.startButtonText}
            onStartCall={handleStartCall}
          />
        )}

        {/* Phase 2 — Active session */}
        {isConnected && (
          <MotionSessionView
            key="session-view"
            {...FADE_PROPS}
            supportsChatInput={appConfig.supportsChatInput}
            supportsVideoInput={appConfig.supportsVideoInput}
            supportsScreenShare={appConfig.supportsScreenShare}
            isPreConnectBufferEnabled={appConfig.isPreConnectBufferEnabled}
            audioVisualizerType={appConfig.audioVisualizerType}
            audioVisualizerColor={appConfig.audioVisualizerColor}
            audioVisualizerColorShift={appConfig.audioVisualizerColorShift}
            audioVisualizerBarCount={appConfig.audioVisualizerBarCount}
            audioVisualizerGridRowCount={appConfig.audioVisualizerGridRowCount}
            audioVisualizerGridColumnCount={appConfig.audioVisualizerGridColumnCount}
            audioVisualizerRadialBarCount={appConfig.audioVisualizerRadialBarCount}
            audioVisualizerRadialRadius={appConfig.audioVisualizerRadialRadius}
            audioVisualizerWaveLineWidth={appConfig.audioVisualizerWaveLineWidth}
            agentStateLabel={currentLabel}
            showStateMeter={showStateMeter}
            className="min-h-0 flex-1"
          />
        )}

        {/* Phase 3 — Post-session summary */}
        {!isConnected && showSummary && (
          <MotionSummaryView
            key="summary"
            {...FADE_PROPS}
            elapsed={finalElapsed}
            messageCount={finalMsgCount}
            onStartNew={handleStartNew}
            // MotionSummaryView sits in the flex column and needs to fill space
            className="min-h-0 flex-1"
          />
        )}
      </AnimatePresence>

      {/* HUD corners */}
      <div className="mnvr-hud-corner mnvr-bl">
        <div>
          SESSION ·{' '}
          <span className="mnvr-hud-lum">
            {showSummary ? 'complete' : isConnected ? 'live' : 'idle'}
          </span>
        </div>
        <div>
          MODEL · <span className="mnvr-hud-lum">groq · deepgram</span>
        </div>
      </div>
      <div className="mnvr-hud-corner mnvr-br">
        <div>
          v1.0.0 · <span className="mnvr-hud-lum">{agentState ?? 'idle'}</span>
        </div>
        <div>
          powered by <span className="mnvr-hud-lum">maneuver</span>
        </div>
      </div>
    </div>
  );
}
