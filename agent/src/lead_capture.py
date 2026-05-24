"""
lead_capture.py
---------------
Extracts structured lead data from a completed conversation and saves it to a
JSON file. Extraction is done by a second LLM call over the full transcript so
it never interrupts the live conversation.

Captured fields
───────────────
  name            – visitor's name (if mentioned)
  company         – company or project name
  role            – their job title / role
  what_building   – what they are building or working on
  challenge       – core pain point or problem
  timeline        – urgency / timeline they mentioned
  budget          – budget range (if mentioned)
  existing_tools  – tools / solutions they've already tried
  success_criteria – what success looks like for them
  interest_level  – inferred: "high" | "medium" | "low" | "unknown"
  follow_up_notes – anything else worth noting for a follow-up call
  call_duration_s – wall-clock seconds the session was open
  room_name       – LiveKit room name (for traceability)
  captured_at     – ISO-8601 UTC timestamp
"""

from __future__ import annotations

import json
import logging
import os
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import openai  # already a transitive dep via livekit-plugins-groq → openai

from send_email import send_follow_up_email

logger = logging.getLogger("lead_capture")

# Where JSON files are written.  Defaults to  <repo>/agent/leads/
_DEFAULT_LEADS_DIR = Path(__file__).parent.parent / "leads"

# Groq is OpenAI-compatible — we use the openai client pointed at Groq's URL
_GROQ_BASE_URL = "https://api.groq.com/openai/v1"
_EXTRACTION_MODEL = "llama-3.1-8b-instant"

# ---------------------------------------------------------------------------
# Extraction prompt
# ---------------------------------------------------------------------------

_EXTRACTION_SYSTEM = """\
You are a data extraction assistant. You will be given a transcript of a sales
discovery call. Extract the requested fields and return ONLY a valid JSON object
— no markdown, no explanation, no extra text.

If a field was not mentioned or cannot be inferred, use null.
For interest_level, infer from the overall tone and engagement:
  "high"    – clearly interested, asked follow-up questions, gave detailed answers
  "medium"  – engaged but non-committal
  "low"     – short answers, seemed uninterested
  "unknown" – not enough signal
"""

_EXTRACTION_USER_TEMPLATE = """\
Extract lead information from the following conversation transcript.

Return a JSON object with exactly these keys:
  name, email, company, role, what_building, challenge, timeline, budget,
  existing_tools, success_criteria, interest_level, follow_up_notes

TRANSCRIPT:
{transcript}
"""

_EXPECTED_KEYS = [
    "name",
    "email",
    "company",
    "role",
    "what_building",
    "challenge",
    "timeline",
    "budget",
    "existing_tools",
    "success_criteria",
    "interest_level",
    "follow_up_notes",
]


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def capture_lead(
    *,
    transcript: list[dict[str, str]],
    room_name: str,
    call_start_time: float,
    leads_dir: Path | None = None,
    api_key: str | None = None,
) -> dict[str, Any]:
    """
    Extract lead fields from *transcript* and persist to a JSON file.

    Parameters
    ----------
    transcript:
        List of ``{"role": "user"|"assistant", "content": "..."}`` dicts
        representing the full conversation (system messages excluded).
    room_name:
        LiveKit room name — used as a unique identifier in the filename.
    call_start_time:
        ``time.time()`` value recorded when the session started.
    leads_dir:
        Directory to write JSON files into.  Defaults to ``agent/leads/``.
    api_key:
        Groq API key.  Falls back to the ``GROQ_API_KEY`` environment variable.

    Returns
    -------
    The extracted lead dict (also written to disk).
    """
    leads_dir = leads_dir or _DEFAULT_LEADS_DIR
    leads_dir.mkdir(parents=True, exist_ok=True)

    transcript_text = _format_transcript(transcript)
    extracted = await _extract_fields(transcript_text, api_key=api_key)

    # Attach call metadata
    extracted["room_name"] = room_name
    extracted["call_duration_s"] = round(time.time() - call_start_time, 1)
    extracted["captured_at"] = datetime.now(timezone.utc).isoformat()

    filename = _make_filename(room_name)
    output_path = leads_dir / filename
    _write_json(extracted, output_path)
    logger.info("Lead captured → %s", output_path)

    await send_follow_up_email(extracted)

    return extracted


def build_transcript(session_history: Any) -> list[dict[str, str]]:
    """
    Convert a LiveKit ``ChatContext`` (``session.history``) into a plain list
    of ``{"role": ..., "content": ...}`` dicts, filtering out system/developer
    messages and turns with no text content.
    """
    messages: list[dict[str, str]] = []
    for msg in session_history.messages():
        if msg.role in ("system", "developer"):
            continue
        text = msg.text_content
        if text:
            messages.append({"role": msg.role, "content": text})
    return messages


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _format_transcript(transcript: list[dict[str, str]]) -> str:
    lines: list[str] = []
    for turn in transcript:
        speaker = "Husain" if turn["role"] == "assistant" else "Visitor"
        lines.append(f"{speaker}: {turn['content']}")
    return "\n".join(lines)


async def _extract_fields(
    transcript_text: str,
    api_key: str | None = None,
) -> dict[str, Any]:
    """
    Call Groq (via the OpenAI-compatible client) to extract structured fields
    from the transcript.  Uses JSON mode to guarantee parseable output.
    """
    key = api_key or os.environ.get("GROQ_API_KEY")
    if not key:
        raise ValueError("GROQ_API_KEY is not set")

    client = openai.AsyncOpenAI(
        api_key=key,
        base_url=_GROQ_BASE_URL,
    )

    response = await client.chat.completions.create(
        model=_EXTRACTION_MODEL,
        messages=[
            {"role": "system", "content": _EXTRACTION_SYSTEM},
            {
                "role": "user",
                "content": _EXTRACTION_USER_TEMPLATE.format(
                    transcript=transcript_text
                ),
            },
        ],
        temperature=0.0,
        response_format={"type": "json_object"},
    )

    raw = response.choices[0].message.content or "{}"

    try:
        data: dict[str, Any] = json.loads(raw)
    except json.JSONDecodeError as exc:
        logger.error("Failed to parse extraction response: %s\nRaw: %s", exc, raw)
        data = {}

    # Ensure all expected keys are present (fill missing with None)
    for k in _EXPECTED_KEYS:
        data.setdefault(k, None)

    return data


def _make_filename(room_name: str) -> str:
    """Generate a timestamped filename safe for all filesystems."""
    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    safe_room = "".join(c if c.isalnum() or c in "-_" else "_" for c in room_name)
    return f"lead_{ts}_{safe_room}.json"


def _write_json(data: dict[str, Any], path: Path) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
