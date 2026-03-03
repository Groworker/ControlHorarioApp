import { supabase } from '@/lib/supabase';

export interface WorkSchedule {
    id: string;
    user_id: string;
    date: string; // YYYY-MM-DD format
    start_time: string; // HH:MM format
    end_time: string; // HH:MM format
    schedule_group: 'cocina' | 'resto';
    notes?: string;
    is_day_off?: boolean;
    created_at: string;
    updated_at: string;
    created_by: string;
}

export interface WorkScheduleWithEmployee extends WorkSchedule {
    employee_name: string;
    employee_code: string;
    department?: string;
}

export interface CreateScheduleData {
    user_id: string;
    date: string;
    start_time: string;
    end_time: string;
    schedule_group: 'cocina' | 'resto';
    notes?: string;
    is_day_off?: boolean;
}

class ScheduleService {
    /**
     * Get schedules for a specific date range
     */
    async getSchedulesByDateRange(
        startDate: string,
        endDate: string,
        group?: 'cocina' | 'resto'
    ): Promise<{ success: boolean; schedules?: WorkScheduleWithEmployee[]; error?: string }> {
        try {
            let query = supabase
                .from('work_schedules')
                .select(`
                    *,
                    users:user_id (
                        full_name,
                        employee_code,
                        department
                    )
                `)
                .gte('date', startDate)
                .lte('date', endDate)
                .order('date', { ascending: true })
                .order('start_time', { ascending: true });

            if (group) {
                query = query.eq('schedule_group', group);
            }

            const { data, error } = await query;

            if (error) throw error;

            // Transform data to include employee info
            const schedules: WorkScheduleWithEmployee[] = (data || []).map((schedule: any) => ({
                ...schedule,
                employee_name: schedule.users?.full_name || 'Unknown',
                employee_code: schedule.users?.employee_code || '',
                department: schedule.users?.department
            }));

            return { success: true, schedules };
        } catch (error: any) {
            console.error('Error fetching schedules:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get schedules for a specific user
     */
    async getScheduleForUser(
        userId: string,
        startDate: string,
        endDate: string
    ): Promise<{ success: boolean; schedules?: WorkSchedule[]; error?: string }> {
        try {
            const { data, error } = await supabase
                .from('work_schedules')
                .select('*')
                .eq('user_id', userId)
                .gte('date', startDate)
                .lte('date', endDate)
                .order('date', { ascending: true });

            if (error) throw error;

            return { success: true, schedules: data || [] };
        } catch (error: any) {
            console.error('Error fetching user schedules:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Create a new schedule
     */
    async createSchedule(scheduleData: CreateScheduleData): Promise<{ success: boolean; schedule?: WorkSchedule; error?: string }> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                return { success: false, error: 'Usuario no autenticado' };
            }

            const { data, error } = await supabase
                .from('work_schedules')
                .insert({
                    ...scheduleData,
                    created_by: user.id
                })
                .select()
                .single();

            if (error) throw error;

            return { success: true, schedule: data };
        } catch (error: any) {
            console.error('Error creating schedule:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Update an existing schedule
     */
    async updateSchedule(
        scheduleId: string,
        updates: Partial<CreateScheduleData>
    ): Promise<{ success: boolean; schedule?: WorkSchedule; error?: string }> {
        try {
            const { data, error } = await supabase
                .from('work_schedules')
                .update(updates)
                .eq('id', scheduleId)
                .select()
                .single();

            if (error) throw error;

            return { success: true, schedule: data };
        } catch (error: any) {
            console.error('Error updating schedule:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Delete a schedule
     */
    async deleteSchedule(scheduleId: string): Promise<{ success: boolean; error?: string }> {
        try {
            const { error } = await supabase
                .from('work_schedules')
                .delete()
                .eq('id', scheduleId);

            if (error) throw error;

            return { success: true };
        } catch (error: any) {
            console.error('Error deleting schedule:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Bulk upload schedules (for uploading multiple schedules at once)
     */
    async bulkUploadSchedules(schedules: CreateScheduleData[]): Promise<{ success: boolean; count?: number; error?: string }> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                return { success: false, error: 'Usuario no autenticado' };
            }

            // Add created_by to all schedules
            const schedulesWithCreator = schedules.map(schedule => ({
                ...schedule,
                created_by: user.id
            }));

            const { data, error } = await supabase
                .from('work_schedules')
                .upsert(schedulesWithCreator, {
                    onConflict: 'user_id,date',
                    ignoreDuplicates: false
                })
                .select();

            if (error) throw error;

            return { success: true, count: data?.length || 0 };
        } catch (error: any) {
            console.error('Error bulk uploading schedules:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Delete schedules for a specific date range (useful for clearing old schedules)
     */
    async deleteSchedulesByDateRange(
        startDate: string,
        endDate: string,
        group?: 'cocina' | 'resto'
    ): Promise<{ success: boolean; error?: string }> {
        try {
            let query = supabase
                .from('work_schedules')
                .delete()
                .gte('date', startDate)
                .lte('date', endDate);

            if (group) {
                query = query.eq('schedule_group', group);
            }

            const { error } = await query;

            if (error) throw error;

            return { success: true };
        } catch (error: any) {
            console.error('Error deleting schedules:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get unique employees for a specific group
     */
    async getEmployeesByGroup(group: 'cocina' | 'resto'): Promise<{ success: boolean; employees?: any[]; error?: string }> {
        try {
            // Mapping of departments to groups
            const cocinaDeparts = ['cocina'];
            const restoDeparts = ['housekeeping', 'service', 'direccion'];

            const departments = group === 'cocina' ? cocinaDeparts : restoDeparts;

            const { data, error } = await supabase
                .from('users')
                .select('id, full_name, employee_code, department')
                .in('department', departments)
                .order('full_name');

            if (error) throw error;

            return { success: true, employees: data || [] };
        } catch (error: any) {
            console.error('Error fetching employees by group:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get ALL employees (workers, admins, supervisors) for schedule grid
     */
    async getAllEmployees(): Promise<{ success: boolean; employees?: any[]; error?: string }> {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('id, full_name, employee_code, department, role')
                .eq('is_active', true)
                .order('full_name');

            if (error) throw error;

            return { success: true, employees: data || [] };
        } catch (error: any) {
            console.error('Error fetching all employees:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get all schedules for a specific week
     */
    async getWeekSchedules(
        startDate: string,
        endDate: string
    ): Promise<{ success: boolean; schedules?: WorkSchedule[]; error?: string }> {
        try {
            const { data, error } = await supabase
                .from('work_schedules')
                .select('*')
                .gte('date', startDate)
                .lte('date', endDate)
                .order('date', { ascending: true })
                .order('start_time', { ascending: true });

            if (error) throw error;

            return { success: true, schedules: data || [] };
        } catch (error: any) {
            console.error('Error fetching week schedules:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Delete a schedule by ID
     */
    async deleteScheduleById(scheduleId: string): Promise<{ success: boolean; error?: string }> {
        try {
            const { error } = await supabase
                .from('work_schedules')
                .delete()
                .eq('id', scheduleId);

            if (error) throw error;

            return { success: true };
        } catch (error: any) {
            console.error('Error deleting schedule:', error);
            return { success: false, error: error.message };
        }
    }
}

export const scheduleService = new ScheduleService();
