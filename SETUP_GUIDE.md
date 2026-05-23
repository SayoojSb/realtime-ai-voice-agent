# Setup Guide: Groq + Cartesia + Deepgram

## Quick Start

### 1. Backend Setup
```bash
cd agent
uv sync  # Install dependencies
```

### 2. Environment Variables
Ensure `agent/.env.local` contains:
```
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret

GROQ_API_KEY=gsk_...
DEEPGRAM_API_KEY=...
CARTESIA_API_KEY=sk_car_...
```

### 3. Frontend Setup
```bash
cd frontend
npm install
```

Ensure `frontend/.env.local` contains:
```
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
AGENT_NAME=assistant
NEXT_PUBLIC_CONN_DETAILS_ENDPOINT=/api/token
```

### 4. Run the System

**Terminal 1 - Backend:**
```bash
cd agent
uv run src/agent.py start
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Then open http://localhost:3000 in your browser.

## Provider Details

### Groq (LLM)
- **Model**: llama-3.1-8b-instant
- **Speed**: Very fast inference
- **Cost**: Affordable
- **API Key**: `GROQ_API_KEY`

### Deepgram (STT)
- **Model**: nova-2
- **Language**: English
- **Accuracy**: High
- **API Key**: `DEEPGRAM_API_KEY`

### Cartesia (TTS)
- **Voice ID**: 794f9389-aac1-45b6-b726-9d9369183238
- **Quality**: Natural sounding
- **Latency**: Low
- **API Key**: `CARTESIA_API_KEY`

## Key Files

| File | Purpose |
|------|---------|
| `agent/src/agent.py` | Backend agent logic with provider config |
| `agent/.env.local` | Backend API keys |
| `agent/pyproject.toml` | Python dependencies |
| `frontend/.env.local` | Frontend config & agent name |
| `frontend/app/api/token/route.ts` | Token generation & agent dispatch |
| `frontend/components/app/view-controller.tsx` | UI & audio context management |

## Debugging

### Agent not joining room
- Check `AGENT_NAME=assistant` in `frontend/.env.local`
- Verify token route is injecting `RoomAgentDispatch`
- Check backend logs for session start errors

### No audio output
- Verify Cartesia API key is valid
- Check voice ID exists in Cartesia account
- Ensure browser audio context is unlocked (click start button)

### Agent not responding
- Check Groq API key is valid
- Verify model name: `llama-3.1-8b-instant`
- Check backend logs for LLM errors

### STT not working
- Verify Deepgram API key is valid
- Check language setting: `language="en"`
- Ensure microphone permissions are granted

## Architecture Flow

```
User Browser
    ↓
Frontend (Next.js)
    ↓
Token Route (/api/token)
    ↓ (injects AGENT_NAME=assistant)
LiveKit Cloud
    ↓
Backend Agent (Python)
    ├─ Groq LLM (llama-3.1-8b-instant)
    ├─ Deepgram STT (nova-2)
    └─ Cartesia TTS (voice ID)
```

## Next Steps

1. Test the system end-to-end
2. Customize system prompt in `agent/src/agent.py`
3. Adjust Cartesia voice ID if needed
4. Monitor API usage and costs
5. Deploy to production when ready
