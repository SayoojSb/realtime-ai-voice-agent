# Maneuver Discovery Agent

A production-ready realtime voice AI agent for Maneuver — an AI strategy and automation consultancy. Visitors to the Maneuver website can have a live voice conversation with an AI persona of the founder, Husain Topiwala. The agent conducts discovery, answers questions about Maneuver's services, captures structured lead data in realtime, and automatically emails the lead summary to the team after every call.

---

## Overview

```
maneuver-voice-agent/
├── agent/          # Python voice agent (LiveKit Agents SDK)
└── frontend/       # Next.js web frontend (React + TypeScript)
```

### What it does

- **Realtime voice conversation** — visitors speak directly with an AI persona of Husain, the Maneuver founder
- **Dual-mode intelligence** — switches naturally between discovery (learning about the visitor) and Q&A (answering questions about Maneuver) mid-conversation
- **Synchronized visual canvas** — the agent triggers UI cards on the visitor's screen in realtime while speaking: service overviews, process diagrams, and a live lead capture panel
- **Automatic lead extraction** — after every call, a second LLM pass over the full transcript extracts structured fields (name, company, challenge, timeline, budget, interest level, and more) and saves them as JSON
- **Instant email notification** — the extracted lead is emailed to the Maneuver team via Resend the moment the call ends

---

## Tech Stack

### Agent (Python)

| Component | Provider | Model | Why |
|-----------|----------|-------|-----|
| Orchestration | LiveKit Agents SDK | — | Purpose-built for realtime voice AI; handles WebRTC, audio routing, and session lifecycle |
| LLM | Groq | `llama-3.3-70b-versatile` | Near-zero latency inference on a capable open model — critical for voice where every 100ms matters |
| STT | Deepgram | `nova-2` | Best-in-class accuracy and speed for English; streaming transcription with low word error rate |
| TTS | Cartesia | Custom voice | Ultra-low latency neural TTS with a natural, non-robotic voice character |
| VAD | Silero | — | Lightweight, accurate voice activity detection for clean turn-taking |
| Noise cancellation | ai_coustics | `QUAIL_VF_S` | Removes background noise before STT sees it, improving transcript quality |
| Lead extraction | Groq | `llama-3.1-8b-instant` | Runs post-call, so speed matters less than cost — a smaller model is sufficient for JSON extraction |
| Email | Resend | — | Simple REST API, generous free tier, reliable deliverability |

### Frontend (TypeScript)

| Component | Technology |
|-----------|------------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Realtime | LiveKit Components React (`@livekit/components-react`) |
| Animations | Motion (Framer Motion) |
| Styling | Tailwind CSS + custom bioluminescent dark theme |

---

## How to Run Locally

### Prerequisites

- Node.js 18+
- Python 3.11+
- `uv` (Python package manager) — `brew install uv`
- A [LiveKit Cloud](https://cloud.livekit.io/) account
- API keys for: Groq, Deepgram, Cartesia, Resend

---

### 1. Clone the repo

```bash
git clone <repo-url>
cd maneuver-voice-agent
```

---

### 2. Set up the agent

```bash
cd agent
cp .env.example .env.local
```

Fill in `.env.local`:

```env
# LiveKit
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret

# AI providers
GROQ_API_KEY=your_groq_key
DEEPGRAM_API_KEY=your_deepgram_key
CARTESIA_API_KEY=your_cartesia_key

# Email notifications (Resend)
RESEND_API_KEY=re_your_key
RESEND_FROM_EMAIL=Maneuver Agent <onboarding@resend.dev>
MANEUVER_NOTIFY_EMAIL=husain@maneuver.ai
```

Install dependencies and download required model files:

```bash
uv sync
uv run python src/agent.py download-files
```

Start the agent:

```bash
uv run python src/agent.py dev
```

---

### 3. Set up the frontend

```bash
cd frontend
cp .env.example .env.local   # or create .env.local manually
```

Fill in `.env.local`:

```env
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret
AGENT_NAME=assistant
```

Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

### 4. Make a call

1. Click **Start conversation** on the frontend
2. Allow microphone access
3. Speak — the agent responds in realtime
4. Visual cards appear on screen as the agent mentions services, process steps, or captures your details
5. End the call — the lead JSON is saved to `agent/leads/` and a notification email is sent to the configured address

---

## Project Structure

```
agent/
├── src/
│   ├── agent.py          # Main agent: session lifecycle, visual tools, system prompt
│   ├── lead_capture.py   # Post-call LLM extraction → JSON persistence
│   ├── send_email.py     # Resend API email notification
│   └── knowledge_base.md # Maneuver services, pricing, process — agent's source of truth
├── leads/                # Captured lead JSON files (gitignored in production)
└── pyproject.toml

frontend/
├── app/
│   ├── page.tsx          # Root page
│   └── api/token/        # LiveKit token endpoint
├── components/
│   ├── app/
│   │   ├── view-controller.tsx   # Session phase orchestration (welcome → live → summary)
│   │   ├── welcome-view.tsx      # Landing screen
│   │   ├── session-summary.tsx   # Post-call summary card
│   │   ├── visual-canvas.tsx     # Realtime visual panel (services, process, lead fields)
│   │   └── maneuver-orb.tsx      # Animated orb that reflects agent state
│   └── agents-ui/                # LiveKit agent UI primitives
├── hooks/
│   └── useVisualTools.ts         # Listens to agent data channel, drives visual state
└── styles/globals.css            # Bioluminescent dark theme
```

---

## Key Design Decisions

**Visual tools over chat** — rather than showing a transcript, the agent triggers purpose-built UI components in realtime via LiveKit's data channel. This makes the experience feel like a live presentation, not a chatbot.

**Post-call extraction, not mid-call** — structured lead data is extracted by a separate LLM call after the session closes. This keeps the live conversation model context clean and latency minimal.

**Groq for everything latency-sensitive** — both the main LLM and the extraction model run on Groq. The main agent uses the largest available model for conversation quality; extraction uses a smaller, faster model since it runs offline.

**Dual-mode prompting** — the system prompt defines two explicit modes (Discovery and Q&A) with clear switching rules. This prevents the agent from getting stuck in either scripted pitching or unfocused Q&A.

---

## What I'd Do Next (Given Another Week)

1. **Admin / founder dashboard** — a password-protected `/admin` view for Husain showing a chronological feed of every past call: session duration, interest level, captured fields, and the full transcript. Clicking a lead expands the detail view with AI-generated talking points for the follow-up call

2. **Caller identification** — ask for the visitor's email during the call and send them a personalised follow-up email summarising the conversation and next steps

2. **CRM integration** — push captured leads directly into HubSpot or Notion instead of local JSON files, with deduplication and deal-stage tagging based on interest level

3. **Conversation memory** — returning visitors should be recognised and the agent should pick up where the last call left off, skipping fields already captured

4. **Live transcript + sentiment** — stream a real-time transcript alongside the orb with per-turn sentiment indicators, giving Husain a dashboard view of live calls

5. **Agent handoff** — when a visitor is clearly high-intent, hand off mid-call to a specialised closing agent with a tighter, deal-focused prompt and access to Husain's calendar for direct booking

6. **Telephony** — connect the agent to a phone number via LiveKit SIP so visitors can call in from any device without opening the web app

7. **Eval suite** — build an automated evaluation harness that runs synthetic conversations through the agent and scores discovery coverage, response accuracy against the knowledge base, and lead extraction completeness

---

## License

MIT
