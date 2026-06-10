/* ============================================================
   Maneuver AI Discovery Agent — App shell
   Scripted demo: idle → connecting → conversation → ended
   ============================================================ */

const { useState, useEffect, useRef, useCallback } = React;

const TWEAKS_DEFAULTS = /*EDITMODE-BEGIN*/ {
  accent: 'indigo',
  showTranscript: true,
  demoSpeed: 1,
}; /*EDITMODE-END*/

// --- Conversation script ---------------------------------------------------
const SCRIPT = [
  {
    role: 'agent',
    text: "Hi — I'm Maneuver's discovery agent. I help teams figure out what's worth automating. To get us started, what does your company do?",
    speakMs: 5200,
  },
  {
    role: 'user',
    text: 'We run a logistics startup — mostly mid-mile freight across India. About 60 trucks today.',
    listenMs: 3600,
  },
  {
    role: 'agent',
    text: "Got it. Mid-mile freight at 60 trucks — you're past the chaotic stage but not yet at the dashboard-everything stage. Where does most of your team's time go today?",
    speakMs: 6800,
    thinkMs: 1400,
  },
  {
    role: 'user',
    text: "Honestly, customer support. We're drowning in shipment status questions all day.",
    listenMs: 3200,
  },
  {
    role: 'agent',
    text: "That's exactly the kind of workflow Maneuver was built for. We can deploy a voice and chat agent that resolves status questions autonomously — pulling from your TMS in realtime. Typically eighty percent of those calls never reach a human.",
    speakMs: 8400,
    thinkMs: 1600,
  },
  {
    role: 'user',
    text: 'Okay — can you also handle proof of delivery confirmation?',
    listenMs: 2800,
  },
  {
    role: 'agent',
    text: "Yes. POD confirmation, exception handling, and dispatcher escalation — all in scope. I'm going to capture a quick summary so a consultant can follow up with a concrete plan for your stack.",
    speakMs: 7400,
    thinkMs: 1200,
    endsAfter: true,
  },
];

const STATE_LABEL = {
  idle: 'READY',
  connecting: 'CONNECTING',
  listening: 'LISTENING',
  thinking: 'THINKING',
  speaking: 'SPEAKING',
  ended: 'CALL ENDED',
};

// --- Hooks ---------------------------------------------------------------

function useTimer(active) {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [active]);
  useEffect(() => {
    if (!active) setSecs(0);
  }, [active]);
  return secs;
}

function fmtTime(s) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

// --- Main app ------------------------------------------------------------

function App() {
  const [tweaks, setTweaks] = (window.useTweaks || useFallbackTweaks)(TWEAKS_DEFAULTS);
  const [state, setState] = useState('idle'); // idle | connecting | listening | thinking | speaking | ended
  const [muted, setMuted] = useState(false);
  const [turn, setTurn] = useState(-1); // index into SCRIPT
  const [bubbles, setBubbles] = useState([]); // {role, text, partial}
  const [partialUser, setPartialUser] = useState(null); // streaming user transcript
  const transcriptRef = useRef(null);

  const live = state !== 'idle' && state !== 'ended';
  const elapsed = useTimer(live);

  // Scripted demo runner
  const timeoutRef = useRef([]);
  const clearTimers = () => {
    timeoutRef.current.forEach(clearTimeout);
    timeoutRef.current = [];
  };
  const t = (fn, ms) => {
    const id = setTimeout(fn, ms / (tweaks.demoSpeed || 1));
    timeoutRef.current.push(id);
    return id;
  };

  const startConversation = () => {
    clearTimers();
    setBubbles([]);
    setTurn(-1);
    setPartialUser(null);
    setState('connecting');
    t(() => playTurn(0), 1600);
  };

  const playTurn = (idx) => {
    if (idx >= SCRIPT.length) return;
    const turnData = SCRIPT[idx];
    setTurn(idx);

    if (turnData.role === 'agent') {
      // Thinking briefly before speaking (except first)
      const think = idx === 0 ? 600 : turnData.thinkMs || 1000;
      setState('thinking');
      // Show "thinking" bubble placeholder
      setBubbles((b) => [...b, { role: 'agent', text: '', typing: true, id: `b${idx}` }]);
      t(() => {
        setState('speaking');
        // Replace typing bubble with real text
        setBubbles((b) =>
          b.map((x) => (x.id === `b${idx}` ? { ...x, text: turnData.text, typing: false } : x))
        );
        t(() => {
          // After speaking → either end call or listen
          if (turnData.endsAfter) {
            t(() => endCall(), 800);
          } else {
            setState('listening');
            t(() => playTurn(idx + 1), 800);
          }
        }, turnData.speakMs);
      }, think);
    } else {
      // User turn — stream partial transcript while "listening", then commit
      setState('listening');
      const full = turnData.text;
      const total = turnData.listenMs || 3000;
      const words = full.split(' ');
      const perWord = Math.max(60, total / words.length);
      let acc = '';
      words.forEach((w, i) => {
        t(
          () => {
            acc = acc ? acc + ' ' + w : w;
            setPartialUser(acc);
          },
          (i + 1) * perWord
        );
      });
      t(() => {
        setPartialUser(null);
        setBubbles((b) => [...b, { role: 'user', text: full, id: `u${idx}` }]);
        // Brief pause then thinking → next
        setState('thinking');
        t(() => playTurn(idx + 1), 500);
      }, total + 200);
    }
  };

  const endCall = () => {
    clearTimers();
    setState('ended');
  };

  const reset = () => {
    clearTimers();
    setBubbles([]);
    setTurn(-1);
    setPartialUser(null);
    setState('idle');
  };

  // Click-prompt before call starts: just kick off the demo
  const onPromptClick = (txt) => {
    if (state === 'idle') startConversation();
  };

  // Cleanup on unmount
  useEffect(() => () => clearTimers(), []);

  return (
    <div className="app" data-state={state}>
      <div className="bg-layer" />
      <div className="bg-grain" />
      <div className="bg-vignette" />

      <Topbar state={state} elapsed={elapsed} />

      <div className="stage">
        <Hero />

        <div className="orb-zone">
          <Orb state={state === 'ended' ? 'idle' : state} size={380} />

          {/* State label below orb */}
          {state !== 'idle' && state !== 'ended' && (
            <div className={`state-label is-${state}`}>
              <span className="pulse-dot" />
              <span>{STATE_LABEL[state]}</span>
              {(state === 'listening' || state === 'speaking') && (
                <span className="state-meter">
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                </span>
              )}
            </div>
          )}
        </div>

        <Prompts visible={state === 'idle'} onSelect={onPromptClick} />

        <ControlBar
          state={state}
          muted={muted}
          elapsed={elapsed}
          onStart={startConversation}
          onEnd={endCall}
          onReset={reset}
          onMute={() => setMuted((m) => !m)}
        />
      </div>

      {/* Transcript overlay */}
      {tweaks.showTranscript && live && (bubbles.length > 0 || partialUser) && (
        <div className="transcript" ref={transcriptRef}>
          {bubbles.map((b) =>
            b.typing ? (
              <div key={b.id} className="bubble agent typing">
                <span className="author">Maneuver</span>
                <span>thinking</span>
                <span className="dots">
                  <span />
                  <span />
                  <span />
                </span>
              </div>
            ) : (
              <div key={b.id} className={`bubble ${b.role}`}>
                <span className="author">{b.role === 'agent' ? 'Maneuver' : 'You'}</span>
                {b.text}
              </div>
            )
          )}
          {partialUser !== null && (
            <div className="bubble user" style={{ opacity: 0.85 }}>
              <span className="author">You · live</span>
              {partialUser}
              <span style={{ opacity: 0.5, marginLeft: 4 }}>▍</span>
            </div>
          )}
        </div>
      )}

      {/* HUD */}
      <div className="hud-corner bl">
        <div>
          SESSION · <span className="v">live demo</span>
        </div>
        <div>
          LATENCY · <span className="v">412ms</span>
        </div>
      </div>
      <div className="hud-corner br">
        <div>
          v1.0.0 · <span className="v">{state === 'idle' ? 'idle' : state}</span>
        </div>
        <div>powered by groq · deepgram · cartesia</div>
      </div>

      {/* Landing helper */}
      {state === 'idle' && (
        <div className="landing-card">
          <div className="hint">
            <span className="mini-mic" />
            <span>microphone access required</span>
          </div>
        </div>
      )}

      {/* End summary */}
      {state === 'ended' && <SummaryCard onRestart={reset} elapsed={elapsed} />}

      {/* Tweaks panel */}
      <TweaksPanelMount
        tweaks={tweaks}
        setTweaks={setTweaks}
        reset={reset}
        startDemo={startConversation}
      />
    </div>
  );
}

// --- Subcomponents -------------------------------------------------------

function Topbar({ state, elapsed }) {
  return (
    <div className="topbar">
      <div className="brand">
        <span className="brand-mark" />
        <span className="brand-name">MANEUVER</span>
        <span className="brand-divider" />
        <span>Discovery&nbsp;Agent · v1.0</span>
      </div>
      <div
        className="status-chip"
        data-state={state === 'idle' || state === 'ended' ? 'off' : 'on'}
      >
        <span className="dot" />
        {state === 'idle' && 'READY'}
        {state === 'connecting' && 'CONNECTING'}
        {(state === 'listening' || state === 'speaking' || state === 'thinking') &&
          `LIVE · ${fmtTime(elapsed)}`}
        {state === 'ended' && 'SESSION COMPLETE'}
      </div>
    </div>
  );
}

function Hero() {
  return (
    <div className="hero">
      <div className="label">REALTIME · VOICE-FIRST</div>
      <h1>
        Maneuver <span className="accent">AI Discovery</span> Agent
      </h1>
      <p className="subtitle">
        Realtime AI consultant for discovery, automation, and lead qualification.
      </p>
    </div>
  );
}

const PROMPTS = [
  'What does Maneuver do?',
  'We run a logistics startup.',
  'Can you automate customer support?',
];

function Prompts({ visible, onSelect }) {
  if (!visible) return null;
  return (
    <div className="prompts">
      {PROMPTS.map((p) => (
        <button key={p} className="prompt-pill" onClick={() => onSelect(p)}>
          <span className="arrow">↗</span>
          <span>{p}</span>
        </button>
      ))}
    </div>
  );
}

function ControlBar({ state, muted, elapsed, onStart, onEnd, onReset, onMute }) {
  if (state === 'idle') {
    return (
      <div className="control-bar">
        <button className="ctrl-primary" onClick={onStart}>
          <span className="mic-glyph">
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
          Start Conversation
        </button>
      </div>
    );
  }
  if (state === 'connecting') {
    return (
      <div className="control-bar">
        <button className="ctrl-primary" data-busy="true">
          <span className="mic-glyph" style={{ animation: 'pulse-glow 1.2s ease-in-out infinite' }}>
            <svg width="12" height="12" viewBox="0 0 12 12">
              <circle
                cx="6"
                cy="6"
                r="4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeDasharray="14 8"
              />
            </svg>
          </span>
          Connecting…
        </button>
      </div>
    );
  }
  if (state === 'ended') {
    return null;
  }
  // Live states
  return (
    <div className="control-bar">
      <button
        className={`ctrl ${muted ? 'muted' : ''}`}
        data-tip={muted ? 'unmute' : 'mute'}
        onClick={onMute}
      >
        {muted ? (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="6" y="2" width="4" height="7" rx="2" fill="currentColor" opacity="0.7" />
            <path
              d="M3 7 Q3 11 8 11 Q13 11 13 7"
              stroke="currentColor"
              strokeWidth="1.2"
              fill="none"
            />
            <line x1="8" y1="11" x2="8" y2="14" stroke="currentColor" strokeWidth="1.2" />
            <line x1="2" y1="2" x2="14" y2="14" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="6" y="2" width="4" height="7" rx="2" fill="currentColor" />
            <path
              d="M3 7 Q3 11 8 11 Q13 11 13 7"
              stroke="currentColor"
              strokeWidth="1.2"
              fill="none"
            />
            <line x1="8" y1="11" x2="8" y2="14" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        )}
      </button>

      <span className="ctrl-timer">{fmtTime(elapsed)}</span>

      <button className="ctrl-end" onClick={onEnd}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M2 8 Q7 4 12 8"
            stroke="currentColor"
            strokeWidth="1.6"
            fill="none"
            strokeLinecap="round"
          />
          <line
            x1="4"
            y1="6.5"
            x2="4"
            y2="9.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            transform="rotate(-30 4 8)"
          />
          <line
            x1="10"
            y1="6.5"
            x2="10"
            y2="9.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            transform="rotate(30 10 8)"
          />
        </svg>
        End call
      </button>

      <button className="ctrl danger" data-tip="reset" onClick={onReset}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M2 7 A5 5 0 1 1 7 12"
            stroke="currentColor"
            strokeWidth="1.4"
            fill="none"
            strokeLinecap="round"
          />
          <polyline
            points="2,3 2,7 6,7"
            stroke="currentColor"
            strokeWidth="1.4"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}

function SummaryCard({ onRestart, elapsed }) {
  return (
    <div className="summary-overlay">
      <div className="summary-card">
        <div className="summary-head">
          <span className="check">✓</span>
          <span>Session complete · {fmtTime(elapsed)}</span>
        </div>
        <h2>We captured what matters.</h2>
        <div className="tag">A Maneuver consultant will follow up within one business day.</div>

        <div className="summary-grid">
          <div className="cell">
            <div className="k">Company type</div>
            <div className="v">Mid-mile logistics · ~60 trucks</div>
          </div>
          <div className="cell">
            <div className="k">Primary pain</div>
            <div className="v">Customer support · status questions</div>
          </div>
          <div className="cell">
            <div className="k">Use cases identified</div>
            <div className="v">Status, POD confirmation, exceptions</div>
          </div>
          <div className="cell">
            <div className="k">Lead quality</div>
            <div className="v" style={{ color: 'var(--bio-green)' }}>
              ● Qualified · high intent
            </div>
          </div>
        </div>

        <div className="summary-section-title">Suggested next steps</div>
        <ul className="summary-bullets">
          <li>Discovery call with a Maneuver consultant — 30 minutes.</li>
          <li>Scoped pilot on shipment status automation (4 weeks).</li>
          <li>TMS integration walkthrough with their engineering lead.</li>
        </ul>

        <div className="summary-actions">
          <button className="btn-ghost" onClick={onRestart}>
            Restart demo
          </button>
          <button className="btn-primary">
            Email me the summary
            <span style={{ color: 'var(--bio-indigo)' }}>→</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Tweaks --------------------------------------------------------------

function useFallbackTweaks(defaults) {
  const [v, setV] = useState(defaults);
  const setTweak = (keyOrEdits, val) => {
    const edits =
      typeof keyOrEdits === 'object' && keyOrEdits !== null ? keyOrEdits : { [keyOrEdits]: val };
    setV((prev) => ({ ...prev, ...edits }));
  };
  return [v, setTweak];
}

const ACCENT_MAP = {
  '#818CF8': 'indigo',
  '#B084F5': 'purple',
  '#4FD8E8': 'cyan',
};
const ACCENT_INV = { indigo: '#818CF8', purple: '#B084F5', cyan: '#4FD8E8' };

function TweaksPanelMount({ tweaks, setTweaks, reset, startDemo }) {
  React.useEffect(() => {
    document.documentElement.style.setProperty(
      '--bio-indigo',
      ACCENT_INV[tweaks.accent] || '#818CF8'
    );
  }, [tweaks.accent]);

  if (!window.TweaksPanel) return null;
  const { TweaksPanel, TweakSection, TweakToggle, TweakSlider, TweakColor, TweakButton } = window;

  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="Look">
        <TweakColor
          label="Accent"
          value={ACCENT_INV[tweaks.accent] || '#818CF8'}
          options={['#818CF8', '#B084F5', '#4FD8E8']}
          onChange={(v) =>
            setTweaks({ accent: ACCENT_MAP[v.toUpperCase()] || ACCENT_MAP[v] || 'indigo' })
          }
        />
        <TweakToggle
          label="Show transcript"
          value={tweaks.showTranscript}
          onChange={(v) => setTweaks({ showTranscript: v })}
        />
      </TweakSection>
      <TweakSection label="Demo">
        <TweakSlider
          label="Demo speed"
          value={tweaks.demoSpeed}
          min={0.5}
          max={3}
          step={0.5}
          unit="×"
          onChange={(v) => setTweaks({ demoSpeed: v })}
        />
        <TweakButton
          label="Restart demo"
          onClick={() => {
            reset();
            setTimeout(startDemo, 200);
          }}
        />
        <TweakButton label="Back to idle" onClick={reset} secondary />
      </TweakSection>
    </TweaksPanel>
  );
}

// Mount
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
