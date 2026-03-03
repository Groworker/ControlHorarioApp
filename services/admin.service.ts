import { supabase, type ClockEntry, type Request, type User } from '@/lib/supabase';
import { authService } from './auth.service';

export interface UserWithDetails extends User {
    pending_requests_count?: number;
    total_hours_this_week?: number;
}

export interface RequestWithUser extends Request {
    user_name: string;
    user_department?: string;
}

export interface WorkSummary {
    user_id: string;
    user_name: string;
    total_minutes: number;
    break_minutes: number;
    net_minutes: number;
    formatted_total: string;
    formatted_net: string;
    entries_count: number;
}

export const adminService = {
    /**
     * Verificar si el usuario actual es admin o supervisor
     */
    async isAdmin(): Promise<boolean> {
        try {
            const user = await authService.getCurrentUser();
            if (!user) return false;
            return user.role === 'admin' || user.role === 'supervisor';
        } catch (error) {
            console.error('Error checking admin status:', error);
            return false;
        }
    },

    /**
     * Obtener todos los usuarios activos
     */
    async getAllUsers(): Promise<{ success: boolean; users?: UserWithDetails[]; error?: string }> {
        try {
            const isAdmin = await this.isAdmin();
            if (!isAdmin) {
                return { success: false, error: 'No tienes permisos de administrador' };
            }

            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('is_active', true)
                .order('full_name');

            if (error) {
                console.error('Get all users error:', error);
                return { success: false, error: 'Error al obtener usuarios' };
            }

            return { success: true, users: data || [] };
        } catch (error) {
            console.error('Get all users error:', error);
            return { success: false, error: 'Error al obtener usuarios' };
        }
    },

    /**
     * Obtener todos los fichajes de un usuario específico
     */
    async getUserClockEntries(
        userId: string,
        fromDate?: Date,
        toDate?: Date
    ): Promise<{ success: boolean; entries?: ClockEntry[]; error?: string }> {
        try {
            const isAdmin = await this.isAdmin();
            if (!isAdmin) {
                return { success: false, error: 'No tienes permisos de administrador' };
            }

            let query = supabase
                .from('clock_entries')
                .select('*')
                .eq('user_id', userId)
                .order('clock_time', { ascending: false });

            if (fromDate) {
                query = query.gte('clock_time', fromDate.toISOString());
            }
            if (toDate) {
                query = query.lte('clock_time', toDate.toISOString());
            }

            const { data, error } = await query;

            if (error) {
                console.error('Get user clock entries error:', error);
                return { success: false, error: 'Error al obtener fichajes' };
            }

            return { success: true, entries: data || [] };
        } catch (error) {
            console.error('Get user clock entries error:', error);
            return { success: false, error: 'Error al obtener fichajes' };
        }
    },

    /**
     * Obtener todas las solicitudes pendientes con información del usuario
     */
    async getAllPendingRequests(): Promise<{ success: boolean; requests?: RequestWithUser[]; error?: string }> {
        try {
            const isAdmin = await this.isAdmin();
            if (!isAdmin) {
                return { success: false, error: 'No tienes permisos de administrador' };
            }

            const { data, error } = await supabase
                .from('requests')
                .select(`
                    *,
                    users!requests_user_id_fkey (
                        full_name,
                        department
                    )
                `)
                .eq('status', 'pending')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Get pending requests error:', error);
                return { success: false, error: 'Error al obtener solicitudes' };
            }

            // Transform data to include user name
            const requestsWithUser: RequestWithUser[] = (data || []).map((req: any) => ({
                id: req.id,
                user_id: req.user_id,
                entry_type: req.entry_type,
                requested_datetime: req.requested_datetime,
                reason: req.reason,
                status: req.status,
                reviewed_by: req.reviewed_by,
                reviewed_at: req.reviewed_at,
                review_notes: req.review_notes,
                created_at: req.created_at,
                updated_at: req.updated_at,
                user_name: req.users?.full_name || 'Usuario desconocido',
                user_department: req.users?.department,
            }));

            return { success: true, requests: requestsWithUser };
        } catch (error) {
            console.error('Get pending requests error:', error);
            return { success: false, error: 'Error al obtener solicitudes' };
        }
    },

    /**
     * Obtener todas las solicitudes (cualquier estado) con información del usuario
     */
    async getAllRequests(status?: 'pending' | 'approved' | 'rejected'): Promise<{ success: boolean; requests?: RequestWithUser[]; error?: string }> {
        try {
            const isAdmin = await this.isAdmin();
            if (!isAdmin) {
                return { success: false, error: 'No tienes permisos de administrador' };
            }

            let query = supabase
                .from('requests')
                .select(`
                    *,
                    users!requests_user_id_fkey (
                        full_name,
                        department
                    )
                `)
                .order('created_at', { ascending: false });

            if (status) {
                query = query.eq('status', status);
            }

            const { data, error } = await query;

            if (error) {
                console.error('Get all requests error:', error);
                return { success: false, error: 'Error al obtener solicitudes' };
            }

            // Transform data to include user name
            const requestsWithUser: RequestWithUser[] = (data || []).map((req: any) => ({
                id: req.id,
                user_id: req.user_id,
                entry_type: req.entry_type,
                requested_datetime: req.requested_datetime,
                reason: req.reason,
                status: req.status,
                reviewed_by: req.reviewed_by,
                reviewed_at: req.reviewed_at,
                review_notes: req.review_notes,
                created_at: req.created_at,
                updated_at: req.updated_at,
                user_name: req.users?.full_name || 'Usuario desconocido',
                user_department: req.users?.department,
            }));

            return { success: true, requests: requestsWithUser };
        } catch (error) {
            console.error('Get all requests error:', error);
            return { success: false, error: 'Error al obtener solicitudes' };
        }
    },

    /**
     * Aprobar una solicitud
     */
    async approveRequest(
        requestId: string,
        reviewNotes?: string
    ): Promise<{ success: boolean; request?: Request; error?: string }> {
        try {
            const isAdmin = await this.isAdmin();
            if (!isAdmin) {
                return { success: false, error: 'No tienes permisos de administrador' };
            }

            const user = await authService.getCurrentUser();
            if (!user) {
                return { success: false, error: 'No autenticado' };
            }

            // First get the request details
            const { data: requestData, error: fetchError } = await supabase
                .from('requests')
                .select('*')
                .eq('id', requestId)
                .single();

            if (fetchError || !requestData) {
                return { success: false, error: 'Solicitud no encontrada' };
            }

            // Update request status
            const { data, error } = await supabase
                .from('requests')
                .update({
                    status: 'approved',
                    reviewed_by: user.id,
                    reviewed_at: new Date().toISOString(),
                    review_notes: reviewNotes,
                })
                .eq('id', requestId)
                .select()
                .single();

            if (error) {
                console.error('Approve request error:', error);
                return { success: false, error: 'Error al aprobar la solicitud' };
            }

            // Create clock entry from approved request
            const { error: clockError } = await supabase
                .from('clock_entries')
                .insert({
                    user_id: requestData.user_id,
                    entry_type: requestData.entry_type,
                    clock_time: requestData.requested_datetime,
                    is_manual: true,
                    request_id: requestId,
                });

            if (clockError) {
                console.error('Error creating clock entry from approved request:', clockError);
            }

            return { success: true, request: data };
        } catch (error) {
            console.error('Approve request error:', error);
            return { success: false, error: 'Error al aprobar la solicitud' };
        }
    },

    /**
     * Rechazar una solicitud
     */
    async rejectRequest(
        requestId: string,
        reviewNotes?: string
    ): Promise<{ success: boolean; request?: Request; error?: string }> {
        try {
            const isAdmin = await this.isAdmin();
            if (!isAdmin) {
                return { success: false, error: 'No tienes permisos de administrador' };
            }

            const user = await authService.getCurrentUser();
            if (!user) {
                return { success: false, error: 'No autenticado' };
            }

            const { data, error } = await supabase
                .from('requests')
                .update({
                    status: 'rejected',
                    reviewed_by: user.id,
                    reviewed_at: new Date().toISOString(),
                    review_notes: reviewNotes,
                })
                .eq('id', requestId)
                .select()
                .single();

            if (error) {
                console.error('Reject request error:', error);
                return { success: false, error: 'Error al rechazar la solicitud' };
            }

            return { success: true, request: data };
        } catch (error) {
            console.error('Reject request error:', error);
            return { success: false, error: 'Error al rechazar la solicitud' };
        }
    },

    /**
     * Aprobar múltiples solicitudes
     */
    async bulkApproveRequests(
        requestIds: string[],
        reviewNotes?: string
    ): Promise<{ success: boolean; count?: number; error?: string }> {
        try {
            const isAdmin = await this.isAdmin();
            if (!isAdmin) {
                return { success: false, error: 'No tienes permisos de administrador' };
            }

            const user = await authService.getCurrentUser();
            if (!user) {
                return { success: false, error: 'No autenticado' };
            }

            if (requestIds.length === 0) {
                return { success: false, error: 'No hay solicitudes para aprobar' };
            }

            // Get all request details first
            const { data: requests, error: fetchError } = await supabase
                .from('requests')
                .select('*')
                .in('id', requestIds);

            if (fetchError || !requests) {
                return { success: false, error: 'Error al obtener solicitudes' };
            }

            // Update all requests
            const { error: updateError, count } = await supabase
                .from('requests')
                .update({
                    status: 'approved',
                    reviewed_by: user.id,
                    reviewed_at: new Date().toISOString(),
                    review_notes: reviewNotes,
                })
                .in('id', requestIds);

            if (updateError) {
                console.error('Bulk approve requests error:', updateError);
                return { success: false, error: 'Error al aprobar solicitudes' };
            }

            // Create clock entries for all approved requests
            const clockEntries = requests.map(req => ({
                user_id: req.user_id,
                entry_type: req.entry_type,
                clock_time: req.requested_datetime,
                is_manual: true,
                request_id: req.id,
            }));

            const { error: clockError } = await supabase
                .from('clock_entries')
                .insert(clockEntries);

            if (clockError) {
                console.error('Error creating clock entries from approved requests:', clockError);
            }

            return { success: true, count: count || 0 };
        } catch (error) {
            console.error('Bulk approve requests error:', error);
            return { success: false, error: 'Error al aprobar solicitudes' };
        }
    },

    /**
     * Rechazar múltiples solicitudes
     */
    async bulkRejectRequests(
        requestIds: string[],
        reviewNotes?: string
    ): Promise<{ success: boolean; count?: number; error?: string }> {
        try {
            const isAdmin = await this.isAdmin();
            if (!isAdmin) {
                return { success: false, error: 'No tienes permisos de administrador' };
            }

            const user = await authService.getCurrentUser();
            if (!user) {
                return { success: false, error: 'No autenticado' };
            }

            if (requestIds.length === 0) {
                return { success: false, error: 'No hay solicitudes para rechazar' };
            }

            const { error, count } = await supabase
                .from('requests')
                .update({
                    status: 'rejected',
                    reviewed_by: user.id,
                    reviewed_at: new Date().toISOString(),
                    review_notes: reviewNotes,
                })
                .in('id', requestIds);

            if (error) {
                console.error('Bulk reject requests error:', error);
                return { success: false, error: 'Error al rechazar solicitudes' };
            }

            return { success: true, count: count || 0 };
        } catch (error) {
            console.error('Bulk reject requests error:', error);
            return { success: false, error: 'Error al rechazar solicitudes' };
        }
    },

    /**
     * Calcular resumen de trabajo de un usuario
     */
    async getUserWorkSummary(
        userId: string,
        fromDate: Date,
        toDate: Date
    ): Promise<{ success: boolean; summary?: WorkSummary; error?: string }> {
        try {
            const isAdmin = await this.isAdmin();
            if (!isAdmin) {
                return { success: false, error: 'No tienes permisos de administrador' };
            }

            // Get user info
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('full_name')
                .eq('id', userId)
                .single();

            if (userError || !userData) {
                return { success: false, error: 'Usuario no encontrado' };
            }

            // Get entries for date range
            const result = await this.getUserClockEntries(userId, fromDate, toDate);
            if (!result.success || !result.entries) {
                return { success: false, error: result.error || 'Error al obtener fichajes' };
            }

            const entries = result.entries;

            // Calculate total worked minutes
            let totalWorkedMinutes = 0;
            let totalBreakMinutes = 0;

            const sortedEntries = [...entries].sort((a, b) =>
                new Date(a.clock_time).getTime() - new Date(b.clock_time).getTime()
            );

            // Calculate work time (ENTRADA/SALIDA pairs)
            const entradas = sortedEntries.filter(e => e.entry_type === 'ENTRADA' || e.entry_type === 'ENTRADA_2');
            const salidas = sortedEntries.filter(e => e.entry_type === 'SALIDA' || e.entry_type === 'SALIDA_2');
            const pairs = Math.min(entradas.length, salidas.length);

            for (let i = 0; i < pairs; i++) {
                const entradaTime = new Date(entradas[i].clock_time).getTime();
                const salidaTime = new Date(salidas[i].clock_time).getTime();
                totalWorkedMinutes += (salidaTime - entradaTime) / (1000 * 60);
            }

            // Calculate break time
            const descansos = sortedEntries.filter(e => e.entry_type === 'DESCANSO');
            for (let i = 0; i < descansos.length - 1; i += 2) {
                const start = new Date(descansos[i].clock_time).getTime();
                const end = new Date(descansos[i + 1].clock_time).getTime();
                totalBreakMinutes += (end - start) / (1000 * 60);
            }

            const netMinutes = Math.max(0, Math.floor(totalWorkedMinutes - totalBreakMinutes));
            const totalMinutes = Math.floor(totalWorkedMinutes);
            const breakMinutes = Math.floor(totalBreakMinutes);

            const summary: WorkSummary = {
                user_id: userId,
                user_name: userData.full_name,
                total_minutes: totalMinutes,
                break_minutes: breakMinutes,
                net_minutes: netMinutes,
                formatted_total: `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`,
                formatted_net: `${Math.floor(netMinutes / 60)}h ${netMinutes % 60}m`,
                entries_count: entries.length,
            };

            return { success: true, summary };
        } catch (error) {
            console.error('Get user work summary error:', error);
            return { success: false, error: 'Error al calcular resumen' };
        }
    },

    /**
     * Obtener resumen de trabajo de todos los usuarios
     */
    async getAllUsersWorkSummary(
        fromDate: Date,
        toDate: Date
    ): Promise<{ success: boolean; summaries?: WorkSummary[]; error?: string }> {
        try {
            const isAdmin = await this.isAdmin();
            if (!isAdmin) {
                return { success: false, error: 'No tienes permisos de administrador' };
            }

            const usersResult = await this.getAllUsers();
            if (!usersResult.success || !usersResult.users) {
                return { success: false, error: usersResult.error || 'Error al obtener usuarios' };
            }

            const summaries: WorkSummary[] = [];

            // Get summary for each user
            for (const user of usersResult.users) {
                const result = await this.getUserWorkSummary(user.id, fromDate, toDate);
                if (result.success && result.summary) {
                    summaries.push(result.summary);
                }
            }

            return { success: true, summaries };
        } catch (error) {
            console.error('Get all users work summary error:', error);
            return { success: false, error: 'Error al calcular resumen' };
        }
    },
};
