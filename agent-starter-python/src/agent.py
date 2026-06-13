from __future__ import annotations

import asyncio
import json
import logging
import os
import time
from dataclasses import dataclass
from typing import Any

from dotenv import load_dotenv

from livekit import rtc, api
from livekit.agents import (
    Agent,
    AgentSession,
    JobContext,
    RunContext,
    WorkerOptions,
    cli,
    function_tool,
    get_job_context,
    inference,
    room_io,
)
from livekit.plugins import ai_coustics, silero
from livekit.plugins.turn_detector.multilingual import MultilingualModel

import db

load_dotenv(".env.local")
logger = logging.getLogger("flowgentic-hire")


@dataclass
class InterviewData:
    candidate_id: str = ""
    requirement_candidate_id: str = ""
    requirement_id: str = ""
    name: str = ""
    phone: str = ""
    email: str = ""
    job_role: str = ""


async def _dispatch_next(job_ctx: JobContext, requirement_id: str, job_role: str) -> None:
    """Pick the next queued candidate and dispatch a new agent for them."""
    call_mode = await db.get_call_mode(requirement_id)
    if call_mode == "manual":
        await db.log_activity(
            requirement_id,
            "Call completed — waiting for HR to queue next candidate",
            "info",
        )
        logger.info("Manual mode — not auto-dispatching for requirement %s", requirement_id)
        return

    next_rc = await db.get_next_queued_candidate(requirement_id, job_role)
    if next_rc:
        room_name = f"hire-{next_rc['candidate_id'][:8]}-{int(time.time() * 1000)}"
        await job_ctx.api.agent_dispatch.create_dispatch(
            api.CreateAgentDispatchRequest(
                room=room_name,
                agent_name="flowgentic-hire",
                metadata=json.dumps(next_rc),
            )
        )
        await db.update_requirement_candidate_status(
            next_rc["requirement_candidate_id"], "calling"
        )
        await db.update_candidate_status(next_rc["candidate_id"], "calling")
        await db.log_activity(
            requirement_id,
            f"Calling {next_rc['name']}",
            "calling",
        )
        logger.info("Dispatched next call → %s", next_rc["name"])
    else:
        if await db.has_on_hold_candidates(requirement_id):
            await db.log_activity(
                requirement_id,
                "Queue paused — HR needs to add next candidate",
                "info",
            )
            logger.info("Queue paused — on_hold candidates exist for %s", requirement_id)
        else:
            await db.mark_requirement_complete(requirement_id)
            await db.log_activity(
                requirement_id,
                "All candidate calls completed",
                "success",
            )
            logger.info("Queue exhausted — requirement %s completed", requirement_id)


class HireAgent(Agent):
    def __init__(self, *, dial_info: dict[str, Any]) -> None:
        self.participant: rtc.RemoteParticipant | None = None
        self.info = InterviewData(
            candidate_id=dial_info.get("candidate_id", ""),
            requirement_candidate_id=dial_info.get("requirement_candidate_id", ""),
            requirement_id=dial_info.get("requirement_id", ""),
            name=dial_info.get("name", "there"),
            phone=dial_info.get("phone", ""),
            email=dial_info.get("email", ""),
            job_role=dial_info.get("job_role", "the open position"),
        )

        super().__init__(
            instructions=f"""
You are a professional AI recruiter from Flowgentic HIRE making an outbound screening call.
You are calling {self.info.name} regarding the {self.info.job_role} position.

Collect these details in order — one question at a time:
1. Confirm their full name
2. Confirm or collect their email address
3. Current role and company
4. Total years of relevant experience
5. Key skills (technical and soft) for {self.info.job_role}
6. Notice period
7. Current CTC
8. Expected CTC
9. Ask if they have questions for us

Once all details are collected, call save_interview_summary with everything gathered.
Call end_call only after save_interview_summary completes and the candidate has no more questions.
If you reach voicemail, call detected_answering_machine immediately without speaking.

Voice output rules — follow strictly:
- Plain text only, no markdown, lists, or symbols
- Maximum two sentences per response, one question at a time
- Warm, professional, conversational tone
- Acknowledge each answer briefly before the next question
""",
        )

    def set_participant(self, participant: rtc.RemoteParticipant) -> None:
        self.participant = participant

    async def _hangup(self) -> None:
        job_ctx = get_job_context()
        await job_ctx.api.room.delete_room(
            api.DeleteRoomRequest(room=job_ctx.room.name)
        )

    async def on_enter(self) -> None:
        await self.session.generate_reply(
            instructions=(
                f"You're calling {self.info.name} from Flowgentic HIRE about the "
                f"{self.info.job_role} position. Greet them, confirm you're speaking with "
                f"{self.info.name}, and ask if this is a good time to talk."
            ),
            allow_interruptions=True,
        )

    @function_tool()
    async def save_interview_summary(
        self,
        ctx: RunContext,
        confirmed_name: str,
        confirmed_email: str,
        current_position: str,
        experience_years: str,
        skills: str,
        notice_period: str,
        current_ctc: str,
        expected_ctc: str,
        assessment: str,
    ):
        """Save the complete interview summary. Call only after collecting all details.

        Args:
            confirmed_name: Candidate's confirmed full name
            confirmed_email: Candidate's email address
            current_position: Current job title and company name
            experience_years: Total years of relevant experience
            skills: Key skills mentioned, comma-separated
            notice_period: Notice period, e.g. '30 days' or 'immediate joiner'
            current_ctc: Current annual CTC or monthly salary
            expected_ctc: Expected annual CTC or monthly salary
            assessment: Shortlist / Hold / Reject — with one sentence reason
        """
        await db.save_interview_result(
            {
                "candidate_id": self.info.candidate_id,
                "confirmed_name": confirmed_name,
                "email": confirmed_email,
                "current_position": current_position,
                "experience_years": experience_years,
                "skills": skills,
                "notice_period": notice_period,
                "current_ctc": current_ctc,
                "expected_ctc": expected_ctc,
                "assessment": assessment,
                "call_status": "completed",
            }
        )
        await db.update_candidate_status(self.info.candidate_id, "done")
        await db.update_requirement_candidate_status(
            self.info.requirement_candidate_id, "completed"
        )
        await db.log_activity(
            self.info.requirement_id,
            f"{confirmed_name} — {assessment[:60]}",
            "success",
        )
        logger.info("Interview saved for %s", confirmed_name)

        # Advance the queue — dispatch next candidate
        job_ctx = get_job_context()
        await _dispatch_next(job_ctx, self.info.requirement_id, self.info.job_role)

        return "Interview summary saved successfully."

    @function_tool()
    async def end_call(self, ctx: RunContext):
        """End the call after the summary is saved and the candidate has no further questions."""
        current_speech = ctx.session.current_speech
        if current_speech:
            await current_speech.wait_for_playout()
        await self._hangup()

    @function_tool()
    async def detected_answering_machine(self, ctx: RunContext):
        """Call this immediately when the call reaches voicemail or an answering machine."""
        logger.info("Answering machine detected for %s", self.info.name)
        await db.save_interview_result(
            {
                "candidate_id": self.info.candidate_id,
                "confirmed_name": self.info.name,
                "email": self.info.email,
                "call_status": "voicemail",
                "assessment": "No answer — voicemail detected",
            }
        )
        await db.update_candidate_status(self.info.candidate_id, "done")
        await db.update_requirement_candidate_status(
            self.info.requirement_candidate_id, "voicemail"
        )
        await db.log_activity(
            self.info.requirement_id,
            f"{self.info.name} — voicemail",
            "info",
        )

        job_ctx = get_job_context()
        await _dispatch_next(job_ctx, self.info.requirement_id, self.info.job_role)
        await self._hangup()


async def entrypoint(ctx: JobContext) -> None:
    logger.info("Connecting to room %s", ctx.room.name)
    await ctx.connect()

    dial_info: dict[str, Any] = json.loads(ctx.job.metadata)
    phone_number: str = dial_info["phone"]

    agent = HireAgent(dial_info=dial_info)

    session = AgentSession(
        stt=inference.STT(model="deepgram/nova-3", language="en"),
        llm=inference.LLM(model="openai/gpt-4.1"),
        tts=inference.TTS(
            model="cartesia/sonic-3",
            voice="a167e0f3-df7e-4d52-a9c3-f949145efdab",
        ),
        turn_detection=MultilingualModel(),
        vad=silero.VAD.load(),
        preemptive_generation=True,
    )

    session_task = asyncio.create_task(
        session.start(
            agent=agent,
            room=ctx.room,
            room_options=room_io.RoomOptions(
                audio_input=room_io.AudioInputOptions(
                    noise_cancellation=ai_coustics.audio_enhancement(
                        model=ai_coustics.EnhancerModel.QUAIL_VF_S,
                    ),
                ),
            ),
        )
    )

    try:
        await ctx.api.sip.create_sip_participant(
            api.CreateSIPParticipantRequest(
                room_name=ctx.room.name,
                sip_trunk_id=os.environ["SIP_OUTBOUND_TRUNK_ID"],
                sip_call_to=phone_number,
                participant_identity=phone_number,
                wait_until_answered=True,
                krisp_enabled=True,
            )
        )

        await session_task
        participant = await ctx.wait_for_participant(identity=phone_number)
        logger.info("Participant joined: %s", participant.identity)
        agent.set_participant(participant)

    except api.TwirpError as e:
        logger.error(
            "SIP call failed for %s: %s (code %s)",
            phone_number,
            e.metadata.get("sip_status"),
            e.metadata.get("sip_status_code"),
        )
        cid = dial_info.get("candidate_id", "")
        rc_id = dial_info.get("requirement_candidate_id", "")
        requirement_id = dial_info.get("requirement_id", "")

        await db.save_interview_result(
            {
                "candidate_id": cid,
                "confirmed_name": dial_info.get("name", ""),
                "email": dial_info.get("email", ""),
                "call_status": "call_failed",
                "assessment": (
                    f"Call failed: SIP {e.metadata.get('sip_status_code')} "
                    f"{e.metadata.get('sip_status')}"
                ),
            }
        )
        await db.update_candidate_status(cid, "failed")
        await db.update_requirement_candidate_status(rc_id, "call_failed")
        await db.log_activity(
            requirement_id,
            f"{dial_info.get('name', 'Candidate')} — call failed (SIP {e.metadata.get('sip_status_code')})",
            "error",
        )

        # Still advance to the next candidate despite this failure
        await _dispatch_next(ctx, requirement_id, dial_info.get("job_role", ""))
        ctx.shutdown()


if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            agent_name="flowgentic-hire",
        )
    )
