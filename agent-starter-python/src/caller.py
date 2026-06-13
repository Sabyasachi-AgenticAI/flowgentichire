"""
Reads pending candidates from Supabase and dispatches outbound screening calls sequentially.

Candidates are managed entirely in Supabase (candidates table).
Add candidates via the Supabase dashboard or any SQL client.

Usage:
    uv run python src/caller.py

Run the agent server in a separate terminal first:
    uv run python src/agent.py start
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import time

from dotenv import load_dotenv
from livekit import api

import db

load_dotenv(".env.local")
logger = logging.getLogger("flowgentic-hire.caller")

AGENT_NAME = "flowgentic-hire"
DELAY_BETWEEN_CALLS = 30   # seconds between successive calls
CALL_TIMEOUT = 900          # max seconds to wait per call (15 min)
POLL_INTERVAL = 15          # seconds between room-status polls


async def _dispatch(lkapi: api.LiveKitAPI, candidate: dict, room_name: str) -> None:
    await lkapi.agent_dispatch.create_dispatch(
        api.CreateAgentDispatchRequest(
            agent_name=AGENT_NAME,
            room=room_name,
            metadata=json.dumps(candidate),
        )
    )
    logger.info("Dispatched agent for %s → room %s", candidate["name"], room_name)


async def _wait_for_room_end(lkapi: api.LiveKitAPI, room_name: str) -> None:
    """Poll until the room disappears (call ended) or CALL_TIMEOUT is reached."""
    deadline = time.monotonic() + CALL_TIMEOUT
    while time.monotonic() < deadline:
        rooms = await lkapi.room.list_rooms(api.ListRoomsRequest(names=[room_name]))
        if not rooms.rooms:
            logger.info("Room %s ended", room_name)
            return
        await asyncio.sleep(POLL_INTERVAL)
    logger.warning("Timeout waiting for room %s", room_name)


async def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
    )

    candidates = await db.get_pending_candidates()
    logger.info("Found %d pending candidates", len(candidates))

    if not candidates:
        logger.info("Nothing to do. Add candidates to the Supabase 'candidates' table.")
        return

    async with api.LiveKitAPI(
        url=os.environ["LIVEKIT_URL"],
        api_key=os.environ["LIVEKIT_API_KEY"],
        api_secret=os.environ["LIVEKIT_API_SECRET"],
    ) as lkapi:
        for i, row in enumerate(candidates):
            if not row.get("phone"):
                logger.warning("Skipping %s — no phone number", row.get("name"))
                await db.update_candidate_status(row["id"], "skipped")
                continue

            candidate_payload = {
                "candidate_id": row["id"],
                "name": row["name"],
                "phone": row["phone"],
                "email": row.get("email") or "",
                "job_role": row.get("job_role") or "the open position",
            }

            room_name = f"hire-{row['id'][:8]}-{int(time.time())}"
            logger.info(
                "[%d/%d] Calling %s (%s)",
                i + 1, len(candidates), row["name"], row["phone"],
            )

            await db.update_candidate_status(row["id"], "calling")

            try:
                await _dispatch(lkapi, candidate_payload, room_name)
                await _wait_for_room_end(lkapi, room_name)
            except Exception as exc:
                logger.error("Error dispatching for %s: %s", row["name"], exc)
                await db.update_candidate_status(row["id"], "failed")

            if i < len(candidates) - 1:
                logger.info("Waiting %ds before next call…", DELAY_BETWEEN_CALLS)
                await asyncio.sleep(DELAY_BETWEEN_CALLS)

    logger.info("Batch complete.")


if __name__ == "__main__":
    asyncio.run(main())
