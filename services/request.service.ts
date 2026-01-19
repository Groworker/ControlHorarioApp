import { supabase, type Request } from '@/lib/supabase';
import { authService } from './auth.service';

export type EntryType = 'ENTRADA' | 'SALIDA' | 'ENTRADA_2' | 'SALIDA_2' | 'DESCANSO';

export const requestService = {
    /**
     * Crear una nueva solicitud de fichaje
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
                return { success: false, error: 'Error al crear la solicitud' };
            }

            return { success: true, request: data };
        } catch (error) {
            console.error('Create request error:', error);
            return { success: false, error: 'Error al crear la solicitud' };
        }
    },

    /**
     * Obtener todas las solicitudes del usuario actual
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
                console.error('Get my requests error:', error);
                return { success: false, error: 'Error al obtener solicitudes' };
            }

            return { success: true, requests: data || [] };
        } catch (error) {
            console.error('Get my requests error:', error);
            return { success: false, error: 'Error al obtener solicitudes' };
        }
    },

    /**
     * Obtener todas las solicitudes (para administradores)
     */
    async getAllRequests(): Promise<{ success: boolean; requests?: Request[]; error?: string }> {
        try {
            const user = await authService.getCurrentUser();
            if (!user) {
                return { success: false, error: 'No autenticado' };
            }

            // TODO: Verificar que el usuario sea admin
            if (user.role !== 'admin' && user.role !== 'supervisor') {
                return { success: false, error: 'No tienes permisos para ver todas las solicitudes' };
            }

            const { data, error } = await supabase
                .from('requests')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Get all requests error:', error);
                return { success: false, error: 'Error al obtener solicitudes' };
            }

            return { success: true, requests: data || [] };
        } catch (error) {
            console.error('Get all requests error:', error);
            return { success: false, error: 'Error al obtener solicitudes' };
        }
    },

    /**
     * Actualizar el estado de una solicitud (aprobar/rechazar)
     * Solo para administradores/supervisores
     */
    async updateRequestStatus(
        requestId: string,
        status: 'approved' | 'rejected',
        reviewNotes?: string
    ): Promise<{ success: boolean; request?: Request; error?: string }> {
        try {
            const user = await authService.getCurrentUser();
            if (!user) {
                return { success: false, error: 'No autenticado' };
            }

            // Verificar permisos
            if (user.role !== 'admin' && user.role !== 'supervisor') {
                return { success: false, error: 'No tienes permisos para revisar solicitudes' };
            }

            const { data, error } = await supabase
                .from('requests')
                .update({
                    status,
                    reviewed_by: user.id,
                    reviewed_at: new Date().toISOString(),
                    review_notes: reviewNotes,
                })
                .eq('id', requestId)
                .select()
                .single();

            if (error) {
                console.error('Update request status error:', error);
                return { success: false, error: 'Error al actualizar la solicitud' };
            }

            // Si fue aprobada, crear el fichaje correspondiente
            if (status === 'approved' && data) {
                const clockResult = await this.createClockEntryFromRequest(data);
                if (!clockResult.success) {
                    console.error('Error creating clock entry from approved request:', clockResult.error);
                    // No retornamos error porque la solicitud ya fue aprobada
                }
            }

            return { success: true, request: data };
        } catch (error) {
            console.error('Update request status error:', error);
            return { success: false, error: 'Error al actualizar la solicitud' };
        }
    },

    /**
     * Eliminar una solicitud (solo si está pendiente y es del usuario)
     */
    async deleteRequest(requestId: string): Promise<{ success: boolean; error?: string }> {
        try {
            const user = await authService.getCurrentUser();
            if (!user) {
                return { success: false, error: 'No autenticado' };
            }

            // Primero verificar que la solicitud existe y está pendiente
            const { data: request, error: fetchError } = await supabase
                .from('requests')
                .select('*')
                .eq('id', requestId)
                .eq('user_id', user.id)
                .single();

            if (fetchError || !request) {
                return { success: false, error: 'Solicitud no encontrada' };
            }

            if (request.status !== 'pending') {
                return { success: false, error: 'Solo se pueden eliminar solicitudes pendientes' };
            }

            // Eliminar la solicitud
            const { error: deleteError } = await supabase
                .from('requests')
                .delete()
                .eq('id', requestId)
                .eq('user_id', user.id);

            if (deleteError) {
                console.error('Delete request error:', deleteError);
                return { success: false, error: 'Error al eliminar la solicitud' };
            }

            return { success: true };
        } catch (error) {
            console.error('Delete request error:', error);
            return { success: false, error: 'Error al eliminar la solicitud' };
        }
    },

    /**
     * Actualizar una solicitud pendiente
     */
    async updateRequest(
        requestId: string,
        updates: {
            entry_type?: EntryType;
            requested_datetime?: Date;
            reason?: string;
        }
    ): Promise<{ success: boolean; request?: Request; error?: string }> {
        try {
            const user = await authService.getCurrentUser();
            if (!user) {
                return { success: false, error: 'No autenticado' };
            }

            // Verificar que la solicitud existe, es del usuario y está pendiente
            const { data: existingRequest, error: fetchError } = await supabase
                .from('requests')
                .select('*')
                .eq('id', requestId)
                .eq('user_id', user.id)
                .single();

            if (fetchError || !existingRequest) {
                return { success: false, error: 'Solicitud no encontrada' };
            }

            if (existingRequest.status !== 'pending') {
                return { success: false, error: 'Solo se pueden editar solicitudes pendientes' };
            }

            // Preparar los datos a actualizar
            const updateData: any = {};
            if (updates.entry_type) updateData.entry_type = updates.entry_type;
            if (updates.requested_datetime) updateData.requested_datetime = updates.requested_datetime.toISOString();
            if (updates.reason !== undefined) updateData.reason = updates.reason.trim();

            // Actualizar la solicitud
            const { data, error } = await supabase
                .from('requests')
                .update(updateData)
                .eq('id', requestId)
                .eq('user_id', user.id)
                .select()
                .single();

            if (error) {
                console.error('Update request error:', error);
                return { success: false, error: 'Error al actualizar la solicitud' };
            }

            return { success: true, request: data };
        } catch (error) {
            console.error('Update request error:', error);
            return { success: false, error: 'Error al actualizar la solicitud' };
        }
    },

    /**
     * Eliminar múltiples solicitudes a la vez
     */
    async bulkDeleteRequests(requestIds: string[]): Promise<{ success: boolean; error?: string }> {
        try {
            const user = await authService.getCurrentUser();
            if (!user) {
                return { success: false, error: 'No autenticado' };
            }

            if (requestIds.length === 0) {
                return { success: false, error: 'No hay solicitudes para eliminar' };
            }

            // Eliminar todas las solicitudes que sean del usuario y estén pendientes
            const { error } = await supabase
                .from('requests')
                .delete()
                .in('id', requestIds)
                .eq('user_id', user.id)
                .eq('status', 'pending');

            if (error) {
                console.error('Bulk delete requests error:', error);
                return { success: false, error: 'Error al eliminar las solicitudes' };
            }

            return { success: true };
        } catch (error) {
            console.error('Bulk delete requests error:', error);
            return { success: false, error: 'Error al eliminar las solicitudes' };
        }
    },

    /**
     * Crear un fichaje a partir de una solicitud aprobada
     * (Función auxiliar privada)
     */
    async createClockEntryFromRequest(
        request: Request
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const { error } = await supabase
                .from('clock_entries')
                .insert({
                    user_id: request.user_id,
                    entry_type: request.entry_type,
                    clock_time: request.requested_datetime,
                    is_manual: true,
                    request_id: request.id,
                });

            if (error) {
                console.error('Create clock entry error:', error);
                return { success: false, error: 'Error al crear el fichaje' };
            }

            return { success: true };
        } catch (error) {
            console.error('Create clock entry error:', error);
            return { success: false, error: 'Error al crear el fichaje' };
        }
    },
};
