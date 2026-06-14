"""
Email notifications via Resend REST API.
No external SDK needed — uses Python stdlib urllib.
Requires RESEND_API_KEY and EMAIL_FROM in environment.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import urllib.error
import urllib.request

logger = logging.getLogger("flowgentic-hire.email")


def _jd_rows_html(
    job_role: str,
    company: str,
    location: str,
    experience_level: str,
    required_skills: str,
) -> str:
    items = [
        ("Role", job_role),
        ("Company", company),
        ("Location", location),
        ("Level", experience_level),
        ("Key Skills", required_skills),
    ]
    rows = "".join(
        f"<tr>"
        f"<td style='padding:5px 16px 5px 0;color:#64748b;font-size:13px;white-space:nowrap'>{label}</td>"
        f"<td style='padding:5px 0;color:#1e293b;font-size:13px;font-weight:600'>{value}</td>"
        f"</tr>"
        for label, value in items
        if value
    )
    return f"<table style='border-collapse:collapse'>{rows}</table>"


def _email_wrapper(body_html: str) -> str:
    return f"""
<!DOCTYPE html>
<html>
<body style='margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif'>
  <table width='100%' cellpadding='0' cellspacing='0'>
    <tr><td align='center' style='padding:32px 16px'>
      <table width='560' cellpadding='0' cellspacing='0'
             style='background:#fff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden'>
        <!-- header -->
        <tr>
          <td style='background:#4f46e5;padding:20px 28px'>
            <span style='color:#fff;font-size:15px;font-weight:700;letter-spacing:.02em'>
              Flowgentic HIRE
            </span>
          </td>
        </tr>
        <!-- body -->
        <tr><td style='padding:28px 28px 20px;color:#1e293b;font-size:14px;line-height:1.6'>
          {body_html}
        </td></tr>
        <!-- footer -->
        <tr>
          <td style='padding:16px 28px;border-top:1px solid #f1f5f9;background:#f8fafc'>
            <p style='margin:0;font-size:12px;color:#94a3b8'>
              This message was sent by Flowgentic HIRE on behalf of the hiring team.
              Reply directly to this email if you have questions.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
"""


def _send_blocking(to: str, subject: str, html: str) -> None:
    api_key = os.environ.get("RESEND_API_KEY", "")
    from_addr = os.environ.get("EMAIL_FROM", "Flowgentic HIRE <hire@flowgentic.ai>")
    if not api_key:
        logger.warning("RESEND_API_KEY not set — skipping email to %s", to)
        return
    payload = json.dumps(
        {"from": from_addr, "to": [to], "subject": subject, "html": html}
    ).encode()
    req = urllib.request.Request(
        "https://api.resend.com/emails",
        data=payload,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            logger.info("Email sent to %s (HTTP %s)", to, resp.status)
    except urllib.error.HTTPError as exc:
        logger.error("Resend API %s: %s", exc.code, exc.read().decode(errors="replace"))
    except Exception as exc:
        logger.error("Email failed for %s: %s", to, exc)


async def send_missed_call_email(
    name: str,
    email: str,
    job_role: str,
    company: str = "",
    location: str = "",
    experience_level: str = "",
    required_skills: str = "",
    description: str = "",
) -> None:
    """Send 'we tried to reach you' email with JD details and request for availability."""
    if not email:
        return
    at_company = f" at <strong>{company}</strong>" if company else ""
    desc_block = (
        f"<p style='margin:12px 0 0;color:#475569;font-size:13px'>{description}</p>"
        if description
        else ""
    )
    body = f"""
<p>Hi <strong>{name}</strong>,</p>
<p>
  We tried calling you today about an exciting <strong>{job_role}</strong> opportunity{at_company}.
  Maya from Flowgentic HIRE reached out but couldn't connect.
</p>
<p>
  We'd love to have a quick 5-minute chat with you.
  Please <strong>reply to this email with 2-3 time slots</strong> that work for you
  and we'll call you right back.
</p>
<div style='margin:20px 0;padding:16px 20px;background:#f8fafc;border-radius:8px;
            border-left:3px solid #4f46e5'>
  <p style='margin:0 0 10px;font-size:11px;font-weight:700;color:#64748b;
            text-transform:uppercase;letter-spacing:.07em'>Role Details</p>
  {_jd_rows_html(job_role, company, location, experience_level, required_skills)}
  {desc_block}
</div>
<p>We look forward to connecting with you!</p>
<p style='margin-top:20px;color:#64748b;font-size:13px'>Warm regards,<br><strong>Team Flowgentic HIRE</strong></p>
"""
    subject = f"We tried to reach you — {job_role} opportunity"
    if company:
        subject += f" at {company}"
    await asyncio.to_thread(_send_blocking, email, subject, _email_wrapper(body))


async def send_post_call_email(
    name: str,
    email: str,
    job_role: str,
    company: str = "",
    location: str = "",
    experience_level: str = "",
    required_skills: str = "",
    description: str = "",
) -> None:
    """Send post-interview email with JD details and next-steps message."""
    if not email:
        return
    at_company = f" at <strong>{company}</strong>" if company else ""
    desc_block = (
        f"<p style='margin:12px 0 0;color:#475569;font-size:13px'>{description}</p>"
        if description
        else ""
    )
    body = f"""
<p>Hi <strong>{name}</strong>,</p>
<p>
  Thank you for taking the time to speak with Maya from Flowgentic HIRE today
  about the <strong>{job_role}</strong> role{at_company}.
  It was great learning more about your background!
</p>
<p>
  Our team will carefully review your profile and reach out soon with the next steps.
  In the meantime, here are the role details for your reference:
</p>
<div style='margin:20px 0;padding:16px 20px;background:#f8fafc;border-radius:8px;
            border-left:3px solid #4f46e5'>
  <p style='margin:0 0 10px;font-size:11px;font-weight:700;color:#64748b;
            text-transform:uppercase;letter-spacing:.07em'>Role Details</p>
  {_jd_rows_html(job_role, company, location, experience_level, required_skills)}
  {desc_block}
</div>
<p>
  If you have any questions in the meantime, feel free to reply to this email.
</p>
<p style='margin-top:20px;color:#64748b;font-size:13px'>Warm regards,<br><strong>Team Flowgentic HIRE</strong></p>
"""
    subject = f"Great speaking with you — {job_role}"
    if company:
        subject += f" at {company}"
    await asyncio.to_thread(_send_blocking, email, subject, _email_wrapper(body))
