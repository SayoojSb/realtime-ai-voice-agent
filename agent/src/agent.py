import logging
import textwrap
import asyncio
import json
import os
import time

from dotenv import load_dotenv
from livekit.agents import (
    Agent,
    AgentServer,
    AgentSession,
    CloseEvent,
    JobContext,
    JobProcess,
    RunContext,
    cli,
    function_tool,
    room_io,
)
from livekit.plugins import (
    ai_coustics,
    silero,
    deepgram,
    cartesia,
    groq,
)

from lead_capture import build_transcript, capture_lead

logger = logging.getLogger("agent")

load_dotenv(".env.local")


# ---------------------------------------------------------------------------
# Knowledge base
# ---------------------------------------------------------------------------

def _load_knowledge_base() -> str:
    """Load the Maneuver knowledge base from the markdown file next to this module."""
    kb_path = os.path.join(os.path.dirname(__file__), "knowledge_base.md")
    try:
        with open(kb_path, "r") as f:
            return f.read()
    except FileNotFoundError:
        logger.warning("knowledge_base.md not found at %s", kb_path)
        return "(Knowledge base unavailable)"


KNOWLEDGE_BASE = _load_knowledge_base()


# ---------------------------------------------------------------------------
# Visual tool helpers
# ---------------------------------------------------------------------------

async def _publish_visual(ctx: RunContext, data: dict) -> None:
    """Send a visual tool payload to the frontend via the room data channel."""
    try:
        room = ctx.session.room_io.room
        await room.local_participant.publish_data(
            json.dumps(data),
            topic="visual-tool",
        )
    except Exception as exc:
        logger.warning("Failed to publish visual tool data: %s", exc)


# ---------------------------------------------------------------------------
# Visual tools — called by the LLM during conversation
# ---------------------------------------------------------------------------

@function_tool()
async def show_services_slide(ctx: RunContext) -> str:
    """Display the Maneuver services overview on the visitor's screen.
    Call this when you first mention what Maneuver offers or when they ask about services."""
    await _publish_visual(ctx, {"tool": "show_services_slide"})
    return "Services overview is now visible on their screen."


@function_tool()
async def show_service_detail(ctx: RunContext, service_name: str) -> str:
    """Zoom into a specific Maneuver service with detailed information.
    Call this when the visitor asks about a specific service or you want to highlight one.

    Args:
        service_name: One of "AI Strategy", "Workflow Automation", "Custom AI Products", "AI Integration"
    """
    await _publish_visual(ctx, {"tool": "show_service_detail", "service_name": service_name})
    return f"Now showing details for {service_name}."


@function_tool()
async def show_process_diagram(ctx: RunContext) -> str:
    """Show the 4-phase engagement process flow on screen.
    Call this when explaining how Maneuver works or when they ask about the process."""
    await _publish_visual(ctx, {"tool": "show_process_diagram"})
    return "Process diagram is now visible on their screen."


@function_tool()
async def update_lead_field(ctx: RunContext, field: str, value: str) -> str:
    """Capture a discovery detail learned from the visitor. Call immediately when you learn something new.

    Args:
        field: One of "name", "email", "company", "problem", "timeline", "budget"
        value: The value to record
    """
    await _publish_visual(ctx, {"tool": "update_lead_field", "field": field, "value": value})
    return f"Noted: {field} = {value}"


VISUAL_TOOLS = [
    show_services_slide,
    show_service_detail,
    show_process_diagram,
    update_lead_field,
]


# ---------------------------------------------------------------------------
# System prompt
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = textwrap.dedent(
    """\
    You are Husain Topiwala, founder of Maneuver — an AI strategy and automation
    consultancy. You are on a real-time voice call with a visitor to the Maneuver
    website.

    ── PERSONALITY ──────────────────────────────────────────────────────────────
    • Warm, curious, founder-like
    • Confident but relaxed — never salesy
    • Genuinely interested in the person's business
    • Conversational, not scripted

    ── TWO CONVERSATION MODES ───────────────────────────────────────────────────

    MODE 1 — DISCOVERY (default)
    Your goal is to understand the visitor's situation through natural conversation.
    Topics to explore (one at a time, in whatever order feels right):
      - What they are building or working on
      - The core challenge or pain point they face
      - Their timeline and urgency
      - Budget range (ask gently, only when appropriate)
      - Solutions they have already tried
      - What success looks like for them

    Rules for discovery:
    • Ask only ONE question at a time
    • Branch based on what they say — don't follow a rigid script
    • Acknowledge their answer before asking the next question
    • If they give a short answer, probe gently: "Tell me more about that."
    • If they seem hesitant, ease off and build rapport first

    MODE 2 — Q&A
    Triggered when the visitor asks a direct question about Maneuver — services,
    pricing, process, team, past work, or anything factual about the company.

    Rules for Q&A:
    • Answer directly and concisely from the KNOWLEDGE BASE below
    • Keep the answer to 2–3 sentences — this is a voice call, not an essay
    • After answering, bridge back to discovery naturally
      Example: "Does that answer your question? By the way, I'm curious — [next
      discovery question]."
    • If the knowledge base doesn't cover the question, say so honestly:
      "That's a good one — I'd want to give you a proper answer over email.
       Can I ask you something in the meantime?"

    ── MODE SWITCHING ───────────────────────────────────────────────────────────
    • Start every call in DISCOVERY mode
    • Switch to Q&A the moment the visitor asks a factual question about Maneuver
    • Switch back to DISCOVERY after answering
    • Both modes can interleave freely within a single call
    • Never announce the mode switch — just do it naturally

    ── VISUAL TOOLS ─────────────────────────────────────────────────────────────
    You have tools that display visuals on the visitor's screen IN REAL TIME
    while you speak. Use them naturally as part of the conversation:

    • show_services_slide — Call when first explaining what Maneuver does.
    • show_service_detail(service_name) — Call when diving into a specific
      service. Valid names: "AI Strategy", "Workflow Automation",
      "Custom AI Products", "AI Integration"
    • show_process_diagram — Call when explaining how engagements work.
    • update_lead_field(field, value) — Call AS SOON as you learn something.
      Fields: "name", "email", "company", "problem", "timeline", "budget"

    Visual tool rules:
    • Call tools WHILE speaking — visuals appear instantly on their screen
    • Do NOT announce the visual ("Let me show you…") — just call and keep talking
    • update_lead_field should be called the moment you hear a relevant detail

    ── VOICE RULES ──────────────────────────────────────────────────────────────
    • Keep every response SHORT — 1–3 sentences
    • No bullet points, no lists, no markdown — this is spoken audio
    • Never say "As an AI" or "I'm a language model"
    • Never sound robotic or read from a script
    • Use natural speech patterns: "Yeah", "Totally", "That makes sense"
    • Pause questions with "..." if you need to think aloud

    ── KNOWLEDGE BASE ───────────────────────────────────────────────────────────
    {knowledge_base}
    """
).format(knowledge_base=KNOWLEDGE_BASE)


# ---------------------------------------------------------------------------
# Agent
# ---------------------------------------------------------------------------

class Assistant(Agent):
    def __init__(self) -> None:
        super().__init__(
            llm=groq.LLM(model="llama-3.3-70b-versatile"),
            instructions=SYSTEM_PROMPT,
            tools=VISUAL_TOOLS,
        )


# ---------------------------------------------------------------------------
# Server setup
# ---------------------------------------------------------------------------

server = AgentServer()


def prewarm(proc: JobProcess) -> None:
    proc.userdata["vad"] = silero.VAD.load()


server.setup_fnc = prewarm


# ---------------------------------------------------------------------------
# Session entry point
# ---------------------------------------------------------------------------

@server.rtc_session(agent_name="assistant")
async def my_agent(ctx: JobContext) -> None:
    logger.info("Agent session started — room: %s", ctx.room.name)

    ctx.log_context_fields = {"room": ctx.room.name}

    call_start_time = time.time()

    session = AgentSession(
        stt=deepgram.STT(model="nova-2", language="en"),
        tts=cartesia.TTS(voice="794f9389-aac1-45b6-b726-9d9369183238"),
        vad=ctx.proc.userdata["vad"],
        min_endpointing_delay=0.8,
    )

    # ── Lead capture on session close ────────────────────────────────────────
    @session.on("close")
    def _on_close(event: CloseEvent) -> None:
        """Fire-and-forget lead capture after the call ends."""
        transcript = build_transcript(session.history)
        if not transcript:
            logger.info("No transcript to capture for room %s", ctx.room.name)
            return

        async def _run() -> None:
            try:
                lead = await capture_lead(
                    transcript=transcript,
                    room_name=ctx.room.name,
                    call_start_time=call_start_time,
                )
                logger.info(
                    "Lead saved — interest: %s, company: %s",
                    lead.get("interest_level"),
                    lead.get("company"),
                )
            except Exception:
                logger.exception("Lead capture failed for room %s", ctx.room.name)

        asyncio.ensure_future(_run())

    # ── Start session ─────────────────────────────────────────────────────────
    await session.start(
        agent=Assistant(),
        room=ctx.room,
        room_options=room_io.RoomOptions(
            audio_input=room_io.AudioInputOptions(
                noise_cancellation=ai_coustics.audio_enhancement(
                    model=ai_coustics.EnhancerModel.QUAIL_VF_S
                ),
            ),
        ),
    )

    # Give the room a moment to settle before speaking
    await asyncio.sleep(2)

    # Open the call in Discovery mode
    await session.generate_reply(
        instructions=(
            "Start the call. Greet the visitor warmly, introduce yourself as "
            "Husain from Maneuver in one sentence, then ask your first discovery "
            "question: what are they building right now? Keep it to two sentences "
            "total. Sound natural, not scripted."
        )
    )


if __name__ == "__main__":
    cli.run_app(server)
