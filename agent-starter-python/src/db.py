"""
Supabase database helper.
"""

from __future__ import annotations

import asyncio
import logging
import os
import time
from datetime import datetime, timezone

from supabase import create_client, Client

logger = logging.getLogger("flowgentic-hire.db")


def _client() -> Client:
    return create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_KEY"],
    )


async def get_pending_candidates() -> list[dict]:
    client = _client()
    result = await asyncio.to_thread(
        lambda: client.table("candidates")
        .select("*")
        .eq("status", "pending")
        .order("created_at")
        .execute()
    )
    return result.data


async def update_candidate_status(candidate_id: str, status: str) -> None:
    if not candidate_id:
        return
    client = _client()
    await asyncio.to_thread(
        lambda: client.table("candidates")
        .update({"status": status, "called_at": datetime.now(timezone.utc).isoformat()})
        .eq("id", candidate_id)
        .execute()
    )
    logger.info("Candidate %s → %s", candidate_id, status)


async def save_interview_result(data: dict) -> None:
    client = _client()
    await asyncio.to_thread(
        lambda: client.table("interview_summaries").insert(data).execute()
    )
    logger.info(
        "Saved interview for %s (%s)",
        data.get("confirmed_name", "unknown"),
        data.get("call_status", ""),
    )


async def update_requirement_candidate_status(rc_id: str, status: str) -> None:
    """Update call_status on a requirement_candidates row."""
    if not rc_id:
        return
    payload: dict = {"call_status": status}
    if status == "calling":
        payload["called_at"] = datetime.now(timezone.utc).isoformat()
    client = _client()
    await asyncio.to_thread(
        lambda: client.table("requirement_candidates")
        .update(payload)
        .eq("id", rc_id)
        .execute()
    )
    logger.info("requirement_candidates %s → %s", rc_id, status)


async def get_next_queued_candidate(requirement_id: str, job_role: str) -> dict | None:
    """Return metadata dict for the next queued candidate, or None if queue is empty."""
    if not requirement_id:
        return None
    client = _client()
    result = await asyncio.to_thread(
        lambda: client.table("requirement_candidates")
        .select("id, candidate_id, match_score, candidates(id, name, phone, email)")
        .eq("requirement_id", requirement_id)
        .eq("call_status", "queued")
        .order("match_score", desc=True)
        .limit(1)
        .execute()
    )
    if not result.data:
        return None
    rc = result.data[0]
    candidate = rc["candidates"]
    return {
        "requirement_id": requirement_id,
        "requirement_candidate_id": rc["id"],
        "candidate_id": candidate["id"],
        "name": candidate["name"],
        "phone": candidate["phone"],
        "email": candidate["email"] or "",
        "job_role": job_role,
    }


async def mark_requirement_complete(requirement_id: str) -> None:
    if not requirement_id:
        return
    client = _client()
    await asyncio.to_thread(
        lambda: client.table("job_requirements")
        .update({"status": "completed"})
        .eq("id", requirement_id)
        .execute()
    )
    logger.info("Requirement %s → completed", requirement_id)


async def log_activity(requirement_id: str, message: str, icon: str = "info") -> None:
    if not requirement_id:
        return
    client = _client()
    await asyncio.to_thread(
        lambda: client.table("requirement_activity")
        .insert({"requirement_id": requirement_id, "message": message, "icon": icon})
        .execute()
    )
