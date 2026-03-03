-- Update work_schedules table to support multiple shifts per day
-- Remove UNIQUE constraint on (user_id, date) to allow multiple rows per user/date

-- Drop the existing unique constraint
ALTER TABLE work_schedules DROP CONSTRAINT IF EXISTS unique_user_date;

-- Add a note column if it doesn't exist (for marking special days like "day off")
ALTER TABLE work_schedules ADD COLUMN IF NOT EXISTS is_day_off BOOLEAN DEFAULT false;

-- Update comments
COMMENT ON COLUMN work_schedules.is_day_off IS 'Indicates if this is marked as a day off (for UI highlighting)';
COMMENT ON TABLE work_schedules IS 'Stores work schedules for employees. Multiple shifts per day are supported by having multiple rows with the same user_id and date.';
