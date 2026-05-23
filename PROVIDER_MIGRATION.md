# Provider Migration: OpenAI → Groq + Cartesia + Deepgram

## Overview
The system has been successfully migrated from OpenAI to a multi-provider setup:
- **LLM**: OpenAI → **Groq** (llama-3.1-8b-instant)
- **STT**: OpenAI → **Deepgram** (nova-2)
- **TTS**: OpenAI → **Cartesia** (voice ID: 794f9389-aac1-45b6-b726-9d9369183238)

## Architecture

### Backend (agent/src/agent.py)
```python
# LLM Provider
llm=groq.LLM(model="llama-3.1-8b-instant")

# STT Provider
stt=deepgram.STT(model="nova-2", language="en")

# TTS Provider
tts=cartesia.TTS(voice="794f9389-aac1-45b6-b726-9d9369183238")
```

### Key Changes
1. **Imports**: Added `groq`, `deepgram`, `cartesia` from `livekit.plugins`
2. **Session Configuration**: Updated `AgentSession` to use new providers
3. **Greeting Method**: Changed from `session.say()` to `session.generate_reply()` (v1.5+ API)
4. **Startup Delay**: Added `await asyncio.sleep(2)` before greeting for stability
5. **Instructions**: Enhanced system prompt for better conversational quality

### Environment Variables (agent/.env.local)
```
GROQ_API_KEY=gsk_...
DEEPGRAM_API_KEY=...
CARTESIA_API_KEY=sk_car_...
```

### Dependencies (agent/pyproject.toml)
```toml
dependencies = [
    "livekit-agents[silero,turn-detector]~=1.5",
    "livekit-plugins-ai-coustics~=0.2",
    "livekit-plugins-groq~=0.1",
    "livekit-plugins-deepgram~=0.1",
    "livekit-plugins-cartesia~=0.1",
    "python-dotenv",
]
```

## Frontend Configuration
- **Token Route**: `frontend/app/api/token/route.ts` - Injects `AGENT_NAME=assistant` from env
- **View Controller**: `frontend/components/app/view-controller.tsx` - Handles audio context unlock
- **Agent Name**: Must match backend `@server.rtc_session(agent_name="assistant")`

## Verification Checklist
✅ Backend imports all three providers
✅ AgentSession configured with new providers
✅ Environment variables set in agent/.env.local
✅ Dependencies added to pyproject.toml
✅ Frontend AGENT_NAME matches backend decorator
✅ Token route injects RoomAgentDispatch correctly
✅ Audio context unlocked on user gesture

## Testing
1. Start backend: `cd agent && uv run src/agent.py start`
2. Start frontend: `cd frontend && npm run dev`
3. Connect to room and verify:
   - Agent joins room
   - Greeting is spoken
   - User can speak and agent responds
   - Audio flows both directions

## Troubleshooting
- **No audio output**: Check Cartesia voice ID is valid
- **Agent not responding**: Verify Groq API key and model name
- **STT not working**: Check Deepgram API key and language setting
- **Agent not joining**: Verify AGENT_NAME env var in frontend/.env.local
