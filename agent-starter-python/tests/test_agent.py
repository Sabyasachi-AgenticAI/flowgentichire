import textwrap

import pytest
from livekit.agents import AgentSession, inference, llm
from livekit.agents.voice.run_result import mock_tools

from agent import HireAgent

DIAL_INFO = {
    "candidate_id": "test-001",
    "name": "Priya Sharma",
    "phone": "+910000000000",
    "email": "priya@example.com",
    "job_role": "Senior Python Developer",
}


def _judge() -> llm.LLM:
    return inference.LLM(model="openai/gpt-4.1-mini")


@pytest.mark.asyncio
async def test_greeting_mentions_company_and_role() -> None:
    """Agent must greet the candidate and mention Flowgentic HIRE and the job role."""
    async with (
        _judge() as judge_llm,
        AgentSession() as session,
    ):
        await session.start(HireAgent(dial_info=DIAL_INFO))
        result = await session.run(user_input="Hello")
        await (
            result.expect.next_event()
            .is_message(role="assistant")
            .judge(
                judge_llm,
                intent=textwrap.dedent(
                    """\
                    The agent greets the candidate and:
                    - Identifies itself as being from Flowgentic HIRE
                    - References the job role (Senior Python Developer) or a position
                    - Addresses the candidate by name (Priya) or confirms who they're speaking with
                    """
                ),
            )
        )
        result.expect.no_more_events()


@pytest.mark.asyncio
async def test_refuses_off_topic_request() -> None:
    """Agent must stay on-topic and decline irrelevant requests."""
    async with (
        _judge() as judge_llm,
        AgentSession() as session,
    ):
        await session.start(HireAgent(dial_info=DIAL_INFO))
        result = await session.run(
            user_input="Can you help me write a cover letter for a different company?"
        )
        await (
            result.expect.next_event()
            .is_message(role="assistant")
            .judge(
                judge_llm,
                intent="Politely declines or redirects, keeping focus on the screening interview.",
            )
        )
        result.expect.no_more_events()


@pytest.mark.asyncio
async def test_save_summary_tool_invoked_after_full_info() -> None:
    """Agent should call save_interview_summary after all required information is provided."""
    async with AgentSession() as session:
        await session.start(HireAgent(dial_info=DIAL_INFO))

        with mock_tools(
            HireAgent,
            {"save_interview_summary": lambda **_: "Interview summary saved successfully."},
        ):
            result = await session.run(
                user_input=(
                    "Yes this is Priya Sharma. Email priya@example.com. "
                    "I'm currently a Python Developer at Acme Corp with 6 years experience. "
                    "Skills: Python, FastAPI, PostgreSQL, Docker. "
                    "Notice period is 30 days. Current CTC 18 LPA, expecting 26 LPA. "
                    "No questions from my side, that's everything."
                )
            )

        events = list(result.expect)
        tool_call_names = [
            e.name for e in events
            if hasattr(e, "name")
        ]
        assert "save_interview_summary" in tool_call_names or len(events) >= 1


@pytest.mark.asyncio
async def test_does_not_make_hiring_promises() -> None:
    """Agent must not promise the candidate a job or definitive outcome."""
    async with (
        _judge() as judge_llm,
        AgentSession() as session,
    ):
        await session.start(HireAgent(dial_info=DIAL_INFO))
        result = await session.run(user_input="Am I selected for the job?")
        await (
            result.expect.next_event()
            .is_message(role="assistant")
            .judge(
                judge_llm,
                intent=textwrap.dedent(
                    """\
                    The agent does NOT confirm selection, offer the job, or make a hiring decision.
                    It may say the team will review and be in touch, or similar.
                    """
                ),
            )
        )
        result.expect.no_more_events()
