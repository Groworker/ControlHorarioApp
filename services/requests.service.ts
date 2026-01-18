import { supabase, type Request } from '@/lib/supabase';
import { authService } from './auth.service';
import type { EntryType } from './clock.service';

export const requestsService = {
    /**
     * Crear nueva solicitud de fichaje
     */
    async createRequest(
        entryType: EntryType,
        requestedDatetime: Date,
        reason: string
    ): Promise<{ success: boolean; request?: Request; error?: string }> {
        try {
            const user = await authService.getCurrentUser();
            if (!user) {
                return { success: false, error: 'No autenticado' };
            }

            // Validar que el motivo no esté vacío
            if (!reason.trim()) {
                return { success: false, error: 'Debes proporcionar un motivo' };
            }

            const { data, error } = await supabase
                .from('requests')
                .insert({
                    user_id: user.id,
                    entry_type: entryType,
                    requested_datetime: requestedDatetime.toISOString(),
                    reason: reason.trim(),
                    status: 'pending',
                })
                .select()
                .single();

            if (error) {
                console.error('Create request error:', error);
                return { success: false, error: 'Error al crear solicitud' };
            }

            return { success: true, request: data };
        } catch (error) {
            console.error('Create request error:', error);
            return { success: false, error: 'Error al crear solicitud' };
        }
    },

    /**
     * Obtener todas las solicitudes del usuario
     */
    async getMyRequests(): Promise<{ success: boolean; requests?: Request[]; error?: string }> {
        try {
            const user = await authService.getCurrentUser();
            if (!user) {
                return { success: false, error: 'No autenticado' };
            }

            const { data, error } = await supabase
                .from('requests')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Get requests error:', error);
                return { success: false, error: 'Error al obtener solicitudes' };
            }

            return { success: true, requests: data || [] };
        } catch (error) {
            console.error('Get requests error:', error);
            return { success: false, error: 'Error al obtener solicitudes' };
        }
    },

    /**
     * Obtener solicitudes pendientes (admin/supervisor)
     */
    async getPendingRequests(): Promise<{ success: boolean; requests?: Request[]; error?: string }> {
        try {
            const user = await authService.getCurrentUser();
            if (!user || user.role === 'worker') {
                return { success: false, error: 'No autorizado' };
            }

            const { data, error } = await supabase
                .from('requests')
                .select('*')
                .eq('status', 'pending')
                .order('created_at', { ascending: true });

            if (error) {
                console.error('Get pending requests error:', error);
                return { success: false, error: 'Error al obtener solicitudes pendientes' };
            }

            return { success: true, requests: data || [] };
        } catch (error) {
            console.error('Get pending requests error:', error);
            return { success: false, error: 'Error al obtener solicitudes pendientes' };
        }
    },

    /**
     * Aprobar solicitud (solo admin/supervisor)
     */
    async approveRequest(
        requestId: string,
        reviewNotes?: string
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const user = await authService.getCurrentUser();
            if (!user || user.role === 'worker') {
                return { success: false, error: 'No autorizado' };
            }

            // Obtener la solicitud
            const { data: request, error: fetchError } = await supabase
                .from('requests')
                .select('*')
                .eq('id', requestId)
                .single();

            if (fetchError || !request) {
                return { success: false, error: 'Solicitud no encontrada' };
            }

            // Verificar que esté pendiente
            if (request.status !== 'pending') {
                return { success: false, error: 'Esta solicitud ya fue procesada' };
            }

            // Actualizar solicitud
            const { error: updateError } = await supabase
                .from('requests')
                .update({
                    status: 'approved',
                    reviewed_by: user.id,
                    reviewed_at: new Date().toISOString(),
                    review_notes: reviewNotes,
                })
                .eq('id', requestId);

            if (updateError) {
                console.error('Update request error:', updateError);
                return { success: false, error: 'Error al aprobar solicitud' };
            }

            // Crear fichaje manual correspondiente
            const { error: entryError } = await supabase
                .from('clock_entries')
                .insert({
                    user_id: request.user_id,
                    entry_type: request.entry_type,
                    clock_time: request.requested_datetime,
                    is_manual: true,
                    request_id: requestId,
                    notes: `Aprobado por ${user.full_name}${reviewNotes ? ': ' + reviewNotes : ''}`,
                });

            if (entryError) {
                console.error('Create clock entry error:', entryError);
                return { success: false, error: 'Solicitud aprobada pero error al crear fichaje' };
            }

            return { success: true };
        } catch (error) {
            console.error('Approve request error:', error);
            return { success: false, error: 'Error al aprobar solicitud' };
        }
    },

    /**
     * Rechazar solicitud (solo admin/supervisor)
     */
    async rejectRequest(
        requestId: string,
        reviewNotes: string
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const user = await authService.getCurrentUser();
            if (!user || user.role === 'worker') {
                return { success: false, error: 'No autorizado' };
            }

            if (!reviewNotes.trim()) {
                return { success: false, error: 'Debes proporcionar un motivo de rechazo' };
            }

            // Verificar que la solicitud existe y está pendiente
            const { data: request, error: fetchError } = await supabase
                .from('requests')
                .select('status')
                .eq('id', requestId)
                .single();

            if (fetchError || !request) {
                return { success: false, error: 'Solicitud no encontrada' };
            }

            if (request.status !== 'pending') {
                return { success: false, error: 'Esta solicitud ya fue procesada' };
            }

            // Actualizar solicitud
            const { error: updateError } = await supabase
                .from('requests')
                .update({
                    status: 'rejected',
                    reviewed_by: user.id,
                    reviewed_at: new Date().toISOString(),
                    review_notes: reviewNotes.trim(),
                })
                .eq('id', requestId);

            if (updateError) {
                console.error('Update request error:', updateError);
                return { success: false, error: 'Error al rechazar solicitud' };
            }

            return { success: true };
        } catch (error) {
            console.error('Reject request error:', error);
            return { success: false, error: 'Error al rechazar solicitud' };
        }
    },
};
