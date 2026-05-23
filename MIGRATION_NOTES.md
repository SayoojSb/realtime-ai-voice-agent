# Migration Notes: OpenAI → Groq + Cartesia + Deepgram

## What Changed

### Code Changes

#### 1. Imports
**Before (OpenAI):**
```python
from livekit.agents import inference
```

**After (Multi-provider):**
```python
from livekit.plugins import (
    deepgram,
    cartesia,
    groq,
)
```

#### 2. LLM Configuration
**Before:**
```python
llm=inference.LLM(model="openai/gpt-4o-mini")
```

**After:**
```python
llm=groq.LLM(model="llama-3.1-8b-instant")
```

#### 3. STT Configuration
**Before:**
```python
stt=inference.STT(model="openai/gpt-4o-mini-transcribe")
```

**After:**
```python
stt=deepgram.STT(model="nova-2", language="en")
```

#### 4. TTS Configuration
**Before:**
```python
tts=inference.TTS(
    model="openai/gpt-4o-mini-tts",
    voice="alloy"
)
```

**After:**
```python
tts=cartesia.TTS(
    voice="794f9389-aac1-45b6-b726-9d9369183238"
)
```

#### 5. Session Greeting
**Before:**
```python
await session.say("Hey! I'm Husain from Maneuver. Great to meet you.")
```

**After:**
```python
await asyncio.sleep(2)  # Startup delay for stability
await session.generate_reply(
    instructions="""
    Greet the user warmly.
    Introduce yourself as Husain from Maneuver.
    Ask what they are building.
    Keep it short and conversational.
    """
)
```

### Environment Variables

**Added:**
```
GROQ_API_KEY=gsk_...
DEEPGRAM_API_KEY=...
CARTESIA_API_KEY=sk_car_...
```

**Removed:**
```
OPENAI_API_KEY=sk-proj-...
```

### Dependencies (pyproject.toml)

**Added:**
```toml
"livekit-plugins-groq~=0.1",
"livekit-plugins-deepgram~=0.1",
"livekit-plugins-cartesia~=0.1",
```

## Why These Changes?

### Groq (LLM)
- **Faster inference** than OpenAI for real-time conversations
- **Lower cost** per token
- **Reliable** for voice agent use cases
- **Model**: llama-3.1-8b-instant is optimized for speed

### Deepgram (STT)
- **High accuracy** speech-to-text
- **Low latency** for real-time transcription
- **Supports multiple languages** (currently set to English)
- **Reliable** for voice agent use cases

### Cartesia (TTS)
- **Natural sounding** voice output
- **Low latency** for real-time conversations
- **Voice customization** via voice ID
- **Reliable** for voice agent use cases

## Compatibility

### What Stayed the Same
- ✅ LiveKit Agents v1.5+ architecture
- ✅ AgentServer and AgentSession
- ✅ Frontend (Next.js) - no changes needed
- ✅ Token generation and room dispatch
- ✅ Audio input/output handling
- ✅ VAD (Voice Activity Detection) with Silero
- ✅ Audio enhancement with AI Coustics

### What's Different
- ❌ Provider APIs (Groq, Deepgram, Cartesia instead of OpenAI)
- ❌ Greeting method (generate_reply with instructions instead of say)
- ❌ Startup delay added for stability
- ❌ System prompt enhanced for better quality

## Performance Characteristics

| Aspect | OpenAI | Groq | Deepgram | Cartesia |
|--------|--------|------|----------|----------|
| LLM Speed | Medium | **Fast** | - | - |
| STT Speed | Medium | - | **Fast** | - |
| TTS Speed | Medium | - | - | **Fast** |
| Cost | Higher | **Lower** | **Lower** | **Lower** |
| Quality | High | High | **High** | **High** |

## Testing Checklist

- [ ] Backend starts without errors
- [ ] Agent joins room successfully
- [ ] Greeting is spoken clearly
- [ ] User can speak and agent hears it
- [ ] Agent responds with relevant answers
- [ ] Audio quality is acceptable
- [ ] No latency issues
- [ ] System handles multiple conversations

## Rollback Plan

If you need to revert to OpenAI:

1. Revert `agent/src/agent.py` to use `inference.LLM/STT/TTS`
2. Update `pyproject.toml` to remove Groq/Deepgram/Cartesia plugins
3. Update `agent/.env.local` to use `OPENAI_API_KEY`
4. Run `uv sync` to update dependencies
5. Restart backend

## Next Steps

1. ✅ Code migration complete
2. ✅ Dependencies configured
3. ✅ Environment variables set
4. 🔄 **Test the system end-to-end**
5. 🔄 Monitor API usage and costs
6. 🔄 Optimize system prompt if needed
7. 🔄 Deploy to production

## Support

For issues with specific providers:
- **Groq**: https://console.groq.com
- **Deepgram**: https://console.deepgram.com
- **Cartesia**: https://play.cartesia.ai
- **LiveKit**: https://docs.livekit.io
