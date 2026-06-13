-- Add call_mode to job_requirements (auto = agent chains calls; manual = HR triggers each call)
ALTER TABLE job_requirements
  ADD COLUMN IF NOT EXISTS call_mode text NOT NULL DEFAULT 'auto';
