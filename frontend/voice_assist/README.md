# Maneuver AI Discovery Agent — Design Reference

A polished hi-fi prototype for the Maneuver realtime voice agent. **Visual reference only** — built for handoff to engineering. Backend (LiveKit / Groq / Deepgram / Cartesia) is not touched.

## Open it
Open `index.html` in any modern browser. No build step.

## File map
```
index.html        – entry; loads React 18 + Babel + the JSX bundles
tokens.css        – design tokens (colors, type, spacing, easings) from the Ocean Descent system
styles.css        – app + layout styles
orb.css           – orb visualizer styles (state-aware)
orb.jsx           – animated orb component (idle | connecting | listening | thinking | speaking)
app.jsx           – state machine + scripted demo + screens
tweaks-panel.jsx  – Tweaks panel control kit (accent / transcript / demo speed)
```

## What's in the demo

A fully scripted ~50s end-to-end voice session:

1. **Idle / landing** — title, subtitle, ambient orb, three suggested-prompt pills, Start Conversation CTA.
2. **Connecting** — orb dashed-ring spinner, button morphs to loading.
3. **Live conversation** — agent ↔ user across 4 exchanges. Each turn cycles the orb state:
   - **Speaking** — radial waveform bars, indigo→cyan gradient.
   - **Listening** — internal scrolling waveform inside the core.
   - **Thinking** — orbiting particle cloud.
4. **Live transcript** — chat bubbles above the controls (agent left, user right). Includes streamed partial transcript while the user is talking and a "thinking…" typing indicator while the agent is mid-thought.
5. **Lead capture summary** — when the session ends, an overlay surfaces the captured discovery (company type, primary pain, use cases, lead quality, suggested next steps).

## Tweaks

Toggle the **Tweaks** panel from the toolbar to:
- Switch accent color (indigo / purple / cyan)
- Toggle live transcript visibility
- Speed up / slow down the demo
- Restart or reset to idle

## Design system
Colors, type, and motion tokens are imported from the **Ocean Descent** design system:
- Backgrounds: `#050912` base, indigo radial gradient
- Accent: bioluminescent indigo `#818CF8` with cyan `#4FD8E8` highlights
- Fonts: Inter Display (UI), Instrument Serif italic (subtitle), JetBrains Mono (HUD/data)
- Motion: water-weight easings (`cubic-bezier(0.45, 0, 0.15, 1)`), 200–800ms durations

## Mapping to the existing frontend
The prototype is component-aligned with the existing LiveKit starter:

| Prototype piece                | Existing component to update |
|--------------------------------|-------------------------------|
| Orb visualizer                 | `aura` / `radial` visualizer |
| State label below orb          | `agent-chat-indicator` |
| Transcript bubbles             | `agent-chat-transcript` |
| Bottom mic/end/reset cluster   | `agent-control-bar` |
| Start Conversation primary     | `start-audio-button` |
| Hero header & subtitle         | new — wrap above `view-controller` |
| Lead-capture summary overlay   | new — mount after session ends |

No backend, no Next.js routes, no env vars. Drop the visual treatment into your existing components.
