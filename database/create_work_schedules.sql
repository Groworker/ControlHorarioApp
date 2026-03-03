-- Create work_schedules table for managing employee work schedules
-- This allows admins to assign work hours to employees and workers to view schedules

CREATE TABLE IF NOT EXISTS work_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    schedule_group TEXT NOT NULL CHECK (schedule_group IN ('cocina', 'resto')),
    notes TEXT,
    is_day_off BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_work_schedules_user_date ON work_schedules(user_id, date);
CREATE INDEX IF NOT EXISTS idx_work_schedules_date ON work_schedules(date);
CREATE INDEX IF NOT EXISTS idx_work_schedules_group ON work_schedules(schedule_group);
CREATE INDEX IF NOT EXISTS idx_work_schedules_created_by ON work_schedules(created_by);

-- Enable RLS
ALTER TABLE work_schedules ENABLE ROW LEVEL SECURITY;

-- Policy: All users can read schedules (workers need to see all schedules)
CREATE POLICY "Anyone can view work schedules"
    ON work_schedules
    FOR SELECT
    USING (true);

-- Policy: Only admins and supervisors can insert schedules
CREATE POLICY "Admins can create work schedules"
    ON work_schedules
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = (SELECT id FROM users WHERE employee_code = current_user)
            AND users.role IN ('admin', 'supervisor')
        )
    );

-- Policy: Only admins and supervisors can update schedules
CREATE POLICY "Admins can update work schedules"
    ON work_schedules
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = (SELECT id FROM users WHERE employee_code = current_user)
            AND users.role IN ('admin', 'supervisor')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = (SELECT id FROM users WHERE employee_code = current_user)
            AND users.role IN ('admin', 'supervisor')
        )
    );

-- Policy: Only admins and supervisors can delete schedules
CREATE POLICY "Admins can delete work schedules"
    ON work_schedules
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = (SELECT id FROM users WHERE employee_code = current_user)
            AND users.role IN ('admin', 'supervisor')
        )
    );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_work_schedules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_work_schedules_timestamp
    BEFORE UPDATE ON work_schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_work_schedules_updated_at();

-- Add comment to table
COMMENT ON TABLE work_schedules IS 'Stores work schedules for employees, managed by admins/supervisors and viewable by all workers';
COMMENT ON COLUMN work_schedules.schedule_group IS 'Group classification: cocina (kitchen) or resto (housekeeping, service, direccion)';
