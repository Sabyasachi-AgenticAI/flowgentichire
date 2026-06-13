-- Add VoBiz call tracking fields to interview_summaries
-- Run this in: Supabase dashboard → SQL Editor

ALTER TABLE interview_summaries
  ADD COLUMN IF NOT EXISTS call_sid            text,
  ADD COLUMN IF NOT EXISTS call_duration_seconds integer;
