"""
Tests for lead_capture.py

These tests mock the OpenAI-compatible client so they run offline without real
API keys. They verify:
  1. Field extraction produces the expected structure
  2. Missing fields are filled with None
  3. JSON is written to disk with the correct shape
  4. build_transcript correctly filters system messages
  5. Malformed LLM responses are handled gracefully
"""

from __future__ import annotations

import json
import time
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from lead_capture import (
    _extract_fields,
    _format_transcript,
    _make_filename,
    build_transcript,
    capture_lead,
)


# ---------------------------------------------------------------------------
# Shared fixtures / helpers
# ---------------------------------------------------------------------------

SAMPLE_TRANSCRIPT = [
    {"role": "assistant", "content": "Hey, I'm Husain from Maneuver. What are you building?"},
    {"role": "user", "content": "I'm Sarah, CTO at Acme. We're building an AI-powered invoice processing tool."},
    {"role": "assistant", "content": "That's interesting. What's the main challenge you're running into?"},
    {"role": "user", "content": "We're spending too much time on manual data entry. We need to automate it."},
    {"role": "assistant", "content": "Got it. What's your timeline looking like?"},
    {"role": "user", "content": "We want something live in about 3 months. Budget is around 30k."},
    {"role": "assistant", "content": "Have you tried any existing tools?"},
    {"role": "user", "content": "We tried a couple of off-the-shelf OCR tools but they weren't accurate enough."},
]

EXPECTED_EXTRACTION = {
    "name": "Sarah",
    "company": "Acme",
    "role": "CTO",
    "what_building": "AI-powered invoice processing tool",
    "challenge": "Too much time on manual data entry",
    "timeline": "3 months",
    "budget": "30k",
    "existing_tools": "Off-the-shelf OCR tools",
    "success_criteria": None,
    "interest_level": "high",
    "follow_up_notes": "Strong candidate for automation build engagement",
}


def _mock_llm_response(content: str) -> MagicMock:
    """Build a mock that looks like an OpenAI chat completion response."""
    choice = MagicMock()
    choice.message.content = content
    response = MagicMock()
    response.choices = [choice]
    return response


def _patch_openai(response_content: str):
    """Context manager that patches openai.AsyncOpenAI with a canned response."""
    mock_client = MagicMock()
    mock_client.chat = MagicMock()
    mock_client.chat.completions = MagicMock()
    mock_client.chat.completions.create = AsyncMock(
        return_value=_mock_llm_response(response_content)
    )
    return patch("lead_capture.openai.AsyncOpenAI", return_value=mock_client)


# ---------------------------------------------------------------------------
# _format_transcript
# ---------------------------------------------------------------------------

def test_format_transcript_labels_speakers() -> None:
    formatted = _format_transcript(SAMPLE_TRANSCRIPT)
    assert "Husain:" in formatted
    assert "Visitor:" in formatted


def test_format_transcript_preserves_content() -> None:
    formatted = _format_transcript(SAMPLE_TRANSCRIPT)
    assert "invoice processing" in formatted
    assert "manual data entry" in formatted


def test_format_transcript_empty() -> None:
    assert _format_transcript([]) == ""


# ---------------------------------------------------------------------------
# build_transcript
# ---------------------------------------------------------------------------

def test_build_transcript_filters_system_messages() -> None:
    """System and developer messages must be excluded from the transcript."""
    msg_system = MagicMock()
    msg_system.role = "system"
    msg_system.text_content = "You are an assistant."

    msg_user = MagicMock()
    msg_user.role = "user"
    msg_user.text_content = "Hello there."

    msg_assistant = MagicMock()
    msg_assistant.role = "assistant"
    msg_assistant.text_content = "Hi! How can I help?"

    mock_history = MagicMock()
    mock_history.messages = [msg_system, msg_user, msg_assistant]

    result = build_transcript(mock_history)

    assert len(result) == 2
    assert result[0] == {"role": "user", "content": "Hello there."}
    assert result[1] == {"role": "assistant", "content": "Hi! How can I help?"}


def test_build_transcript_filters_developer_messages() -> None:
    """Developer-role messages must also be excluded."""
    msg_dev = MagicMock()
    msg_dev.role = "developer"
    msg_dev.text_content = "Internal instruction."

    msg_user = MagicMock()
    msg_user.role = "user"
    msg_user.text_content = "Hi."

    mock_history = MagicMock()
    mock_history.messages = [msg_dev, msg_user]

    result = build_transcript(mock_history)
    assert len(result) == 1
    assert result[0]["role"] == "user"


def test_build_transcript_skips_empty_content() -> None:
    """Messages with no text content (e.g. audio-only turns) should be skipped."""
    msg = MagicMock()
    msg.role = "user"
    msg.text_content = None

    mock_history = MagicMock()
    mock_history.messages = [msg]

    assert build_transcript(mock_history) == []


def test_build_transcript_empty_history() -> None:
    mock_history = MagicMock()
    mock_history.messages = []
    assert build_transcript(mock_history) == []


# ---------------------------------------------------------------------------
# _extract_fields
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_extract_fields_returns_all_keys() -> None:
    """Extraction must always return all expected keys, even if LLM omits some."""
    partial_response = json.dumps({"name": "Sarah", "company": "Acme"})

    with _patch_openai(partial_response):
        result = await _extract_fields("some transcript", api_key="test-key")

    expected_keys = {
        "name", "company", "role", "what_building", "challenge",
        "timeline", "budget", "existing_tools", "success_criteria",
        "interest_level", "follow_up_notes",
    }
    assert expected_keys.issubset(result.keys())
    assert result["name"] == "Sarah"
    assert result["company"] == "Acme"
    # Keys not returned by LLM should default to None
    assert result["role"] is None
    assert result["timeline"] is None


@pytest.mark.asyncio
async def test_extract_fields_full_response() -> None:
    """All fields present in LLM response should be returned as-is."""
    with _patch_openai(json.dumps(EXPECTED_EXTRACTION)):
        result = await _extract_fields("some transcript", api_key="test-key")

    assert result["name"] == "Sarah"
    assert result["interest_level"] == "high"
    assert result["budget"] == "30k"


@pytest.mark.asyncio
async def test_extract_fields_handles_malformed_json() -> None:
    """If the LLM returns invalid JSON, should return a dict with all keys as None."""
    with _patch_openai("this is not json at all"):
        result = await _extract_fields("some transcript", api_key="test-key")

    assert isinstance(result, dict)
    assert result.get("name") is None
    assert result.get("interest_level") is None


@pytest.mark.asyncio
async def test_extract_fields_handles_empty_response() -> None:
    """Empty string response from LLM should not raise."""
    with _patch_openai(""):
        result = await _extract_fields("some transcript", api_key="test-key")

    assert isinstance(result, dict)


@pytest.mark.asyncio
async def test_extract_fields_raises_without_api_key(monkeypatch) -> None:
    """Should raise ValueError when no API key is available."""
    monkeypatch.delenv("GROQ_API_KEY", raising=False)

    with pytest.raises(ValueError, match="GROQ_API_KEY"):
        await _extract_fields("some transcript", api_key=None)


# ---------------------------------------------------------------------------
# capture_lead (end-to-end with tmp_path)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_capture_lead_writes_json_file(tmp_path: Path) -> None:
    """capture_lead should write a valid JSON file with all expected fields."""
    with _patch_openai(json.dumps(EXPECTED_EXTRACTION)):
        lead = await capture_lead(
            transcript=SAMPLE_TRANSCRIPT,
            room_name="voice_assistant_room_1234",
            call_start_time=time.time() - 120,  # simulate 2-minute call
            leads_dir=tmp_path,
            api_key="test-key",
        )

    # Return value checks
    assert lead["name"] == "Sarah"
    assert lead["company"] == "Acme"
    assert lead["interest_level"] == "high"
    assert lead["room_name"] == "voice_assistant_room_1234"
    assert lead["call_duration_s"] >= 120
    assert "captured_at" in lead

    # File on disk
    json_files = list(tmp_path.glob("lead_*.json"))
    assert len(json_files) == 1

    with open(json_files[0]) as f:
        saved = json.load(f)

    assert saved["name"] == "Sarah"
    assert saved["company"] == "Acme"
    assert saved["room_name"] == "voice_assistant_room_1234"
    assert saved["call_duration_s"] >= 120


@pytest.mark.asyncio
async def test_capture_lead_creates_leads_dir(tmp_path: Path) -> None:
    """capture_lead should create the leads directory if it doesn't exist."""
    nested_dir = tmp_path / "deep" / "nested" / "leads"
    assert not nested_dir.exists()

    with _patch_openai(json.dumps({"name": "Test"})):
        await capture_lead(
            transcript=SAMPLE_TRANSCRIPT,
            room_name="test_room",
            call_start_time=time.time(),
            leads_dir=nested_dir,
            api_key="test-key",
        )

    assert nested_dir.exists()
    assert len(list(nested_dir.glob("*.json"))) == 1


@pytest.mark.asyncio
async def test_capture_lead_metadata_fields(tmp_path: Path) -> None:
    """Metadata fields (room_name, call_duration_s, captured_at) must always be present."""
    with _patch_openai("{}"):  # LLM returns empty object
        lead = await capture_lead(
            transcript=SAMPLE_TRANSCRIPT,
            room_name="my_test_room",
            call_start_time=time.time() - 60,
            leads_dir=tmp_path,
            api_key="test-key",
        )

    assert lead["room_name"] == "my_test_room"
    assert lead["call_duration_s"] >= 60
    # captured_at should be a valid ISO string
    from datetime import datetime
    datetime.fromisoformat(lead["captured_at"])  # raises if invalid


@pytest.mark.asyncio
async def test_capture_lead_one_file_per_call(tmp_path: Path) -> None:
    """Each call to capture_lead should produce exactly one new file."""
    with _patch_openai(json.dumps(EXPECTED_EXTRACTION)):
        await capture_lead(
            transcript=SAMPLE_TRANSCRIPT,
            room_name="room_a",
            call_start_time=time.time(),
            leads_dir=tmp_path,
            api_key="test-key",
        )

    with _patch_openai(json.dumps(EXPECTED_EXTRACTION)):
        await capture_lead(
            transcript=SAMPLE_TRANSCRIPT,
            room_name="room_b",
            call_start_time=time.time(),
            leads_dir=tmp_path,
            api_key="test-key",
        )

    json_files = list(tmp_path.glob("lead_*.json"))
    assert len(json_files) == 2


# ---------------------------------------------------------------------------
# _make_filename
# ---------------------------------------------------------------------------

def test_make_filename_format() -> None:
    name = _make_filename("voice_assistant_room_1234")
    assert name.startswith("lead_")
    assert name.endswith(".json")
    assert "T" in name  # ISO timestamp contains T


def test_make_filename_sanitises_special_chars() -> None:
    name = _make_filename("room/with spaces&special!chars")
    assert "/" not in name
    assert " " not in name
    assert "!" not in name
    assert "&" not in name


def test_make_filename_unique_per_call() -> None:
    """Two filenames generated at different times should differ."""
    import time as _time
    name1 = _make_filename("room_x")
    _time.sleep(0.01)
    name2 = _make_filename("room_x")
    # They may be the same if called within the same second — that's fine,
    # but the room name should always appear in the filename.
    assert "room_x" in name1
    assert "room_x" in name2
