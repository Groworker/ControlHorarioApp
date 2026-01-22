-- ============================================
-- Add weekly_hours column to users table
-- ============================================
-- This script adds a new column to track contracted weekly hours per user

ALTER TABLE users ADD COLUMN IF NOT EXISTS weekly_hours INTEGER;

COMMENT ON COLUMN users.weekly_hours IS 'Horas contratadas por semana (e.g., 40, 35)';

-- Optional: Update existing users with a default value if needed
-- UPDATE users SET weekly_hours = 40 WHERE weekly_hours IS NULL;
