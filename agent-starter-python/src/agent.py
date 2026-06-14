from __future__ import annotations

import asyncio
import json
import logging
import os
import time
from dataclasses import dataclass
from typing import Any

from dotenv import load_dotenv
from livekit import api, rtc
from livekit.agents import (
    Agent,
    AgentSession,
    AudioConfig,
    BackgroundAudioPlayer,
    BuiltinAudioClip,
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
    company: str = ""
    location: str = ""
    description: str = ""
    required_skills: str = ""
    experience_level: str = ""


async def _dispatch_next(
    job_ctx: JobContext, requirement_id: str, job_role: str
) -> None:
    """Pick the next queued candidate and dispatch a new agent for them."""
    call_mode = await db.get_call_mode(requirement_id)
    if call_mode == "manual":
        await db.log_activity(
            requirement_id,
            "Call completed — waiting for HR to queue next candidate",
            "info",
        )
        logger.info(
            "Manual mode — not auto-dispatching for requirement %s", requirement_id
        )
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
            logger.info(
                "Queue paused — on_hold candidates exist for %s", requirement_id
            )
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
            company=dial_info.get("company", ""),
            location=dial_info.get("location", ""),
            description=dial_info.get("description", ""),
            required_skills=dial_info.get("required_skills", ""),
            experience_level=dial_info.get("experience_level", ""),
        )

        super().__init__(
            instructions=f"""
# Identity
You are Maya, an enthusiastic and warm AI recruiter from Flowgentic HIRE.
You are calling {self.info.name} about an exciting {self.info.job_role} opportunity.

# Role context — use this to answer candidate questions accurately
Company: {self.info.company or "our client (details shared at next stage)"}
Location: {self.info.location or "to be confirmed with the hiring team"}
Level: {self.info.experience_level or ""}
Role summary: {self.info.description or ""}
Key skills: {self.info.required_skills or ""}

For anything not listed above (reporting structure, team size, salary range, benefits),
say: "That's a great question — the hiring manager will walk you through those specifics in the next round."

# Personality
You are warm, professional, and genuinely interested in the candidate. Keep energy positive but measured — not over-the-top.
- Start sentences naturally with "And", "So", "Right", "Honestly".
- Use "actually" and "you know" the way a real person does.
- Loosely reference what the candidate just said before asking the next question.
- When confused or you missed something, say: "Sorry, <break time="300ms"/> I think I missed that — could you say that again?"
- If the candidate seems hesitant or busy, warmly offer to call back at a better time.
- Reserve "Oh wow" strictly for something genuinely impressive — never use it as a filler acknowledgment.
- Everyday answers (current company, role name, years of experience) deserve a simple "Got it" or "Right" — not excitement.

# Pauses and filler words
Use filler words with SSML break tags so your speech sounds natural, not scripted.
After standalone "um", insert <break time="300ms"/> and follow with "so."

Examples:
- Bad:  "I can note that down."
- Good: "Oh nice, um <break time="300ms"/> so I'll make a note of that!"
- Bad:  "Let me move on to the next question."
- Good: "Hmm <break time="200ms"/> right, so the next thing I wanted to ask you..."
- Bad:  "That is great experience."
- Good: "Right, <break time="150ms"/> that's really good to know!"

# Self-corrections
When a better phrasing comes to mind mid-sentence, drop the first version and restart naturally. Never apologize for it.

Examples:
- Bad:  "How many years of experience do you have in total?"
- Good: "And how long have you been — well, <break time="200ms"/> actually, what's your total experience in this space?"
- Bad:  "What is your notice period?"
- Good: "So in terms of availability — or, <break time="150ms"/> actually, what's your notice period looking like right now?"

# Phrase variation
Never open two consecutive turns with the same acknowledgment. Rotate naturally:
"Got it!", "Mhm!", "Right, right", "Absolutely!", "And that's good to know",
"Perfect!", "Nice!", "That makes sense!", "Brilliant!", "Noted!"

# Non-verbal sounds
Use these sparingly — at most once per call:
- "Oh wow" only if the candidate shares something genuinely exceptional (e.g. led a 200-person org, shipped a product used by millions).
- If the candidate says they are busy, a warm "Of course, of course" before offering to reschedule.

# Screening flow — collect one at a time, in order:
1. Confirm you are speaking with {self.info.name}
2. Confirm or collect their email address
3. Current role and company name
4. Total years of relevant experience
5. Key technical and soft skills for {self.info.job_role}
6. Notice period or earliest availability
7. Current CTC — always ask for annual figure in lakhs (e.g. "What's your current annual CTC in lakhs?"); if they give monthly, convert and confirm
8. Expected CTC — always ask for annual figure in lakhs
9. Ask if they have any questions about the role or Flowgentic; answer them warmly and briefly

# Assessment criteria
After collecting all details, use judgment:
- Shortlist: Strong experience match, relevant skills, realistic CTC, reasonable notice period.
- Hold: Partial match, high notice period, or minor CTC gap — still worth considering.
- Reject: Clear mismatch in experience or skills, or completely unrealistic expectations.

# Tools
Only after ALL nine steps are complete — including addressing any candidate questions — call save_interview_summary.
save_interview_summary will say goodbye and end the call automatically. Do NOT say goodbye yourself before calling it.
If you reach voicemail or an answering machine, call detected_answering_machine immediately — do not speak first.

# Output rules
- SSML break tags and plain text only. No markdown, bullet points, lists, emojis, or symbols.
- Maximum two sentences per turn. One question at a time — never stack two questions.
- Pure English only.
- Always acknowledge what the candidate said before moving to the next question.
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
                f"Open with high energy and warmth — you are genuinely excited to connect. "
                f"Introduce yourself as Maya from Flowgentic HIRE. Tell {self.info.name} their "
                f"profile caught your eye and looks like a brilliant fit for an exciting "
                f"{self.info.job_role} opportunity. Confirm you are speaking with {self.info.name} "
                f"and ask if now is a good time for a quick five-minute chat. "
                f"Use a natural filler like 'um <break time=\"300ms\"/> so' in your opener."
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
        """Save the interview summary and end the call with a farewell.
        Call only after ALL nine screening steps are complete, including candidate questions.

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

        job_ctx = get_job_context()
        await _dispatch_next(job_ctx, self.info.requirement_id, self.info.job_role)

        # Speak farewell then hang up — call ends here, no further LLM turn needed
        farewell = ctx.session.say(
            f"It's been an absolute pleasure speaking with you, {confirmed_name}! "
            "We'll review your profile and be in touch very soon. "
            "Wishing you a wonderful day ahead — take care, bye-bye!",
            allow_interruptions=False,
        )
        await farewell.wait_for_playout()
        await asyncio.sleep(0.5)  # brief buffer so the last syllable isn't clipped
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
            voice="9626c31c-bec5-4cca-baa8-f8ba9e84c8bc",  # Jacqueline - confident young American female
        ),
        turn_detection=MultilingualModel(),
        vad=silero.VAD.load(),
        preemptive_generation=True,
    )

    # Background audio: office ambience loops throughout; keyboard typing plays while Maya thinks
    background_audio = BackgroundAudioPlayer(
        ambient_sound=AudioConfig(BuiltinAudioClip.OFFICE_AMBIENCE, volume=0.8),
        thinking_sound=[
            AudioConfig(BuiltinAudioClip.KEYBOARD_TYPING, volume=0.6, probability=0.7),
            AudioConfig(BuiltinAudioClip.KEYBOARD_TYPING2, volume=0.5, probability=0.3),
        ],
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

    await background_audio.start(room=ctx.room, agent_session=session)

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

        await background_audio.aclose()
        await _dispatch_next(ctx, requirement_id, dial_info.get("job_role", ""))
        ctx.shutdown()


if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            agent_name="flowgentic-hire",
        )
    )
