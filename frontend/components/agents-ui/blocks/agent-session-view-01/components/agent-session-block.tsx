'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, type MotionProps, motion } from 'motion/react';
import { useAgent, useSessionContext, useSessionMessages } from '@livekit/components-react';
import { AgentChatTranscript } from '@/components/agents-ui/agent-chat-transcript';
import {
  AgentControlBar,
  type AgentControlBarControls,
} from '@/components/agents-ui/agent-control-bar';
import { Shimmer } from '@/components/ai-elements/shimmer';
import { ManeuverOrb, type OrbState } from '@/components/app/maneuver-orb';
import { VisualCanvas } from '@/components/app/visual-canvas';
import { useVisualTools } from '@/hooks/useVisualTools';
import { cn } from '@/lib/shadcn/utils';

const MotionMessage = motion.create(Shimmer);

const BOTTOM_VIEW_MOTION_PROPS: MotionProps = {
  variants: {
    visible: { opacity: 1, translateY: '0%' },
    hidden: { opacity: 0, translateY: '100%' },
  },
  initial: 'hidden',
  animate: 'visible',
  exit: 'hidden',
  transition: { duration: 0.3, delay: 0.5, ease: 'easeOut' },
};

const CHAT_MOTION_PROPS: MotionProps = {
  variants: {
    hidden: { opacity: 0, transition: { ease: 'easeOut', duration: 0.3 } },
    visible: { opacity: 1, transition: { delay: 0.2, ease: 'easeOut', duration: 0.3 } },
  },
  initial: 'hidden',
  animate: 'visible',
  exit: 'hidden',
};

const SHIMMER_MOTION_PROPS: MotionProps = {
  variants: {
    visible: { opacity: 1, transition: { ease: 'easeIn', duration: 0.5, delay: 0.8 } },
    hidden: { opacity: 0, transition: { ease: 'easeIn', duration: 0.5, delay: 0 } },
  },
  initial: 'hidden',
  animate: 'visible',
  exit: 'hidden',
};

const STATE_LABEL: Partial<Record<string, string>> = {
  connecting: 'CONNECTING',
  initializing: 'CONNECTING',
  listening: 'LISTENING',
  thinking: 'THINKING',
  speaking: 'SPEAKING',
};

function mapOrbState(agentState: string): OrbState {
  const map: Record<string, OrbState> = {
    disconnected: 'idle',
    connecting: 'connecting',
    initializing: 'connecting',
    listening: 'listening',
    thinking: 'thinking',
    speaking: 'speaking',
  };
  return map[agentState] ?? 'idle';
}

export interface AgentSessionView_01Props {
  preConnectMessage?: string;
  supportsChatInput?: boolean;
  supportsVideoInput?: boolean;
  supportsScreenShare?: boolean;
  isPreConnectBufferEnabled?: boolean;
  audioVisualizerType?: 'bar' | 'wave' | 'grid' | 'radial' | 'aura';
  audioVisualizerColor?: `#${string}`;
  audioVisualizerColorShift?: number;
  audioVisualizerBarCount?: number;
  audioVisualizerGridRowCount?: number;
  audioVisualizerGridColumnCount?: number;
  audioVisualizerRadialBarCount?: number;
  audioVisualizerRadialRadius?: number;
  audioVisualizerWaveLineWidth?: number;
  agentStateLabel?: string;
  showStateMeter?: boolean;
  className?: string;
}

export function AgentSessionView_01({
  preConnectMessage = 'Agent is listening, ask it a question',
  supportsChatInput = true,
  supportsVideoInput = true,
  supportsScreenShare = true,
  isPreConnectBufferEnabled = true,
  audioVisualizerType: _avType,
  audioVisualizerColor: _avColor,
  audioVisualizerColorShift: _avColorShift,
  audioVisualizerBarCount: _avBarCount,
  audioVisualizerGridRowCount: _avGridRows,
  audioVisualizerGridColumnCount: _avGridCols,
  audioVisualizerRadialBarCount: _avRadialBars,
  audioVisualizerRadialRadius: _avRadialRadius,
  audioVisualizerWaveLineWidth: _avWaveWidth,
  agentStateLabel: _agentStateLabel,
  showStateMeter: _showStateMeter,
  ref,
  className,
  ...props
}: React.ComponentProps<'section'> & AgentSessionView_01Props) {
  const session = useSessionContext();
  const { messages } = useSessionMessages(session);
  const [chatOpen, setChatOpen] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { state: agentState } = useAgent();

  // Visual tools — listens for data channel messages from the agent
  const visual = useVisualTools();
  const hasCanvas = visual.activeView !== 'none';

  const orbState = mapOrbState(agentState ?? 'disconnected');
  const stateLabel = STATE_LABEL[agentState ?? ''];
  const showMeter = stateLabel === 'LISTENING' || stateLabel === 'SPEAKING';

  const controls: AgentControlBarControls = {
    leave: true,
    microphone: true,
    chat: supportsChatInput,
    camera: supportsVideoInput,
    screenShare: supportsScreenShare,
  };

  useEffect(() => {
    const lastMessage = messages.at(-1);
    if (scrollAreaRef.current && lastMessage?.from?.isLocal === true) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  // Orb adapts: smaller when chat open, shifts left when canvas is showing
  const orbSize = chatOpen ? 120 : hasCanvas ? 220 : 280;

  return (
    <section
      ref={ref}
      className={cn('relative z-10 w-full overflow-hidden', className)}
      style={{ background: 'transparent' }}
      {...props}
    >
      {/* Chat transcript */}
      <div className="absolute top-0 bottom-[140px] flex w-full flex-col md:bottom-[170px]">
        <AnimatePresence>
          {chatOpen && (
            <motion.div
              {...CHAT_MOTION_PROPS}
              className="flex h-full w-full flex-col gap-4 space-y-3 transition-opacity duration-300 ease-out"
            >
              <AgentChatTranscript
                agentState={agentState}
                messages={messages}
                className="mx-auto w-full max-w-2xl [&_.is-user>div]:rounded-[22px] [&>div>div]:px-4 [&>div>div]:pt-40 md:[&>div>div]:px-6"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Orb + state label — shifts left when canvas is active */}
      <motion.div
        className={cn(
          'pointer-events-none absolute flex flex-col items-center justify-center gap-4',
          chatOpen ? 'top-4 bottom-[170px]' : 'top-0 bottom-[140px] md:bottom-[175px]'
        )}
        animate={{
          left: hasCanvas ? '0%' : '0%',
          right: hasCanvas ? '44%' : '0%',
        }}
        transition={{ duration: 0.5, ease: [0.45, 0, 0.15, 1] }}
        style={{ position: 'absolute' }}
      >
        <ManeuverOrb state={orbState} size={orbSize} />

        {stateLabel && (
          <div
            className={`mnvr-state-label mnvr-is-${orbState}`}
            style={{ position: 'static', transform: 'none' }}
          >
            <span className="mnvr-pulse-dot" />
            <span>{stateLabel}</span>
            {showMeter && (
              <span className="mnvr-state-meter">
                <span />
                <span />
                <span />
                <span />
                <span />
              </span>
            )}
          </div>
        )}
      </motion.div>

      {/* Visual canvas — right side panel driven by agent tool calls */}
      <AnimatePresence>
        {hasCanvas && (
          <VisualCanvas
            activeView={visual.activeView}
            serviceDetailName={visual.serviceDetailName}
            leadFields={visual.leadFields}
          />
        )}
      </AnimatePresence>

      {/* Bottom — controls */}
      <motion.div
        {...BOTTOM_VIEW_MOTION_PROPS}
        className="absolute inset-x-3 bottom-0 z-50 md:inset-x-12"
      >
        {isPreConnectBufferEnabled && (
          <AnimatePresence>
            {messages.length === 0 && (
              <MotionMessage
                key="pre-connect-message"
                duration={2}
                aria-hidden={messages.length > 0}
                {...SHIMMER_MOTION_PROPS}
                className="pointer-events-none mx-auto block w-full max-w-2xl pb-4 text-center text-sm font-semibold"
                style={{ color: 'var(--text-bio-secondary)' }}
              >
                {preConnectMessage}
              </MotionMessage>
            )}
          </AnimatePresence>
        )}

        <div className="relative mx-auto max-w-2xl pb-3 md:pb-10">
          <AgentControlBar
            variant="livekit"
            controls={controls}
            isChatOpen={chatOpen}
            isConnected={session.isConnected}
            onDisconnect={session.end}
            onIsChatOpenChange={setChatOpen}
            className="border-white/8 bg-white/3 backdrop-blur-md"
            style={{
              background: 'rgba(255,255,255,0.03)',
              borderColor: 'rgba(255,255,255,0.08)',
            }}
          />
        </div>
      </motion.div>
    </section>
  );
}
