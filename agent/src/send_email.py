"""
send_email.py
-------------
Sends a branded follow-up email to the lead using the Resend API.
Requires RESEND_API_KEY in the environment.
Optional: RESEND_FROM_EMAIL (defaults to onboarding@resend.dev for testing).
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any

import httpx

logger = logging.getLogger("send_email")

_RESEND_API_URL = "https://api.resend.com/emails"


async def send_follow_up_email(lead: dict[str, Any]) -> None:
    """Send a lead notification email to Husain after every call."""
    api_key = os.environ.get("RESEND_API_KEY")
    if not api_key:
        logger.warning("RESEND_API_KEY not set — skipping lead notification email")
        return

    to_email = os.environ.get("MANEUVER_NOTIFY_EMAIL")
    if not to_email:
        logger.warning("MANEUVER_NOTIFY_EMAIL not set — skipping lead notification email")
        return

    from_email = os.environ.get(
        "RESEND_FROM_EMAIL", "Maneuver Agent <onboarding@resend.dev>"
    )

    name = lead.get("name") or "Unknown"
    subject = f"New lead from your voice agent — {name}"

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                _RESEND_API_URL,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                content=json.dumps(
                    {
                        "from": from_email,
                        "to": [to_email],
                        "subject": subject,
                        "html": _build_html(lead),
                    }
                ),
            )
            resp.raise_for_status()
            logger.info("Lead notification sent → %s", to_email)
    except Exception as exc:
        logger.error("Failed to send lead notification: %s", exc)


# ---------------------------------------------------------------------------
# HTML builder
# ---------------------------------------------------------------------------

def _row(label: str, value: str | None) -> str:
    if not value:
        return ""
    return f"""
        <tr>
          <td style="padding:8px 0;color:#9ca3af;font-size:13px;width:140px;vertical-align:top">{label}</td>
          <td style="padding:8px 0;color:#f9fafb;font-size:13px;vertical-align:top">{value}</td>
        </tr>"""


def _build_html(lead: dict[str, Any]) -> str:
    name = lead.get("name") or "there"
    rows = "".join([
        _row("Company", lead.get("company")),
        _row("What you're building", lead.get("what_building")),
        _row("Core challenge", lead.get("challenge")),
        _row("Timeline", lead.get("timeline")),
        _row("Budget", lead.get("budget")),
        _row("Tools already tried", lead.get("existing_tools")),
        _row("Success looks like", lead.get("success_criteria")),
    ])

    notes_block = ""
    if lead.get("follow_up_notes"):
        notes_block = f"""
        <p style="margin:24px 0 6px;color:#9ca3af;font-size:12px;text-transform:uppercase;letter-spacing:.08em">Internal notes</p>
        <p style="margin:0;color:#d1d5db;font-size:13px;line-height:1.6">{lead['follow_up_notes']}</p>"""

    return f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 20px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#111118;border:1px solid #1e1e2e;border-radius:12px;overflow:hidden;max-width:560px">

        <!-- Header bar -->
        <tr>
          <td style="background:linear-gradient(135deg,#0f172a 0%,#1a1a2e 100%);padding:28px 32px;border-bottom:1px solid #1e1e2e">
            <p style="margin:0;color:#6366f1;font-size:11px;font-weight:600;letter-spacing:.12em;text-transform:uppercase">MANEUVER</p>
            <p style="margin:6px 0 0;color:#f9fafb;font-size:20px;font-weight:600">New lead: {name}</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px">

            <p style="margin:0 0 20px;color:#d1d5db;font-size:15px;line-height:1.65">
              Someone just finished a discovery call with your voice agent. Here's everything captured.
            </p>

            <!-- Summary table -->
            <p style="margin:0 0 12px;color:#9ca3af;font-size:12px;text-transform:uppercase;letter-spacing:.08em">What we talked about</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #1e1e2e">
              {rows}
            </table>

            {notes_block}

            <!-- Divider -->
            <hr style="border:none;border-top:1px solid #1e1e2e;margin:28px 0">

            <!-- Interest level -->
            <p style="margin:0 0 12px;color:#9ca3af;font-size:12px;text-transform:uppercase;letter-spacing:.08em">Interest level</p>
            <p style="margin:0;color:#f9fafb;font-size:22px;font-weight:600;text-transform:uppercase;letter-spacing:.05em">{lead.get('interest_level') or 'unknown'}</p>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#0d0d16;padding:20px 32px;border-top:1px solid #1e1e2e">
            <p style="margin:0;color:#6b7280;font-size:12px">
              Husain Topiwala · Founder, Maneuver<br>
              This email was sent automatically after your voice session.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>"""
