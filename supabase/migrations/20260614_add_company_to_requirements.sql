-- Add company name to job_requirements (optional — leave blank to treat as confidential)
ALTER TABLE job_requirements
  ADD COLUMN IF NOT EXISTS company text;
