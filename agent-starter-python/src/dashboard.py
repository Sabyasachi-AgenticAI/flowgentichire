"""
Flowgentic HIRE — Interview Dashboard

Run with:
    uv run streamlit run src/dashboard.py

Deploy free on Streamlit Cloud (https://share.streamlit.io) by pointing it at this file.
Set SUPABASE_URL and SUPABASE_SERVICE_KEY in Streamlit's Secrets manager.
"""

from __future__ import annotations

import os

import streamlit as st
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(".env.local")

st.set_page_config(
    page_title="Flowgentic HIRE",
    page_icon="🎯",
    layout="wide",
)

st.title("🎯 Flowgentic HIRE — Screening Dashboard")
st.caption("Real-time outbound screening call results")


@st.cache_resource(show_spinner=False)
def _supabase():
    return create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_KEY"],
    )


def _fetch(job_role: str, status: str) -> list[dict]:
    q = _supabase().table("interview_summaries").select("*").order("called_at", desc=True)
    if job_role:
        q = q.ilike("job_role", f"%{job_role}%")
    if status != "All":
        q = q.eq("status", status)
    return q.execute().data


# ── Filters ──────────────────────────────────────────────────────────────────
with st.sidebar:
    st.header("Filters")
    job_role_filter = st.text_input("Job Role")
    status_filter = st.selectbox(
        "Call Status",
        ["All", "completed", "voicemail", "call_failed", "calling"],
    )
    assessment_filter = st.selectbox(
        "Assessment",
        ["All", "Shortlist", "Hold", "Reject"],
    )
    if st.button("Refresh", use_container_width=True):
        st.cache_resource.clear()
        st.rerun()

# ── Data ─────────────────────────────────────────────────────────────────────
candidates = _fetch(job_role_filter, status_filter)

if assessment_filter != "All":
    candidates = [
        c for c in candidates
        if assessment_filter.lower() in (c.get("assessment") or "").lower()
    ]

# ── Metrics ──────────────────────────────────────────────────────────────────
total = len(candidates)
shortlisted = sum(1 for c in candidates if "shortlist" in (c.get("assessment") or "").lower())
voicemail = sum(1 for c in candidates if c.get("status") == "voicemail")
failed = sum(1 for c in candidates if c.get("status") == "call_failed")

m1, m2, m3, m4 = st.columns(4)
m1.metric("Total Screened", total)
m2.metric("Shortlisted", shortlisted)
m3.metric("Voicemail", voicemail)
m4.metric("Call Failed", failed)

st.divider()

# ── Results ───────────────────────────────────────────────────────────────────
if not candidates:
    st.info("No results yet. Run `caller.py` to start screening candidates.")
else:
    for c in candidates:
        assessment = (c.get("assessment") or "").strip()
        badge = (
            "🟢" if "shortlist" in assessment.lower()
            else "🔴" if "reject" in assessment.lower()
            else "🟡"
        )
        date = (c.get("called_at") or "")[:10]
        label = f"{badge} **{c.get('name', '—')}** — {c.get('job_role', '—')} | {c.get('status', '—')} | {date}"

        with st.expander(label, expanded=False):
            left, right = st.columns(2)
            with left:
                st.markdown(f"**Email:** {c.get('email') or '—'}")
                st.markdown(f"**Phone:** {c.get('phone') or '—'}")
                st.markdown(f"**Current Role:** {c.get('current_role') or '—'}")
                st.markdown(f"**Experience:** {c.get('experience_years') or '—'}")
            with right:
                st.markdown(f"**Skills:** {c.get('skills') or '—'}")
                st.markdown(f"**Notice Period:** {c.get('notice_period') or '—'}")
                st.markdown(f"**Current CTC:** {c.get('current_ctc') or '—'}")
                st.markdown(f"**Expected CTC:** {c.get('expected_ctc') or '—'}")

            st.divider()
            if "shortlist" in assessment.lower():
                st.success(f"**Assessment:** {assessment}")
            elif "reject" in assessment.lower():
                st.error(f"**Assessment:** {assessment}")
            elif assessment:
                st.warning(f"**Assessment:** {assessment}")
            else:
                st.info("No assessment recorded.")
