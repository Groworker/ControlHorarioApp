import { supabase, type User } from '@/lib/supabase';
import { authService } from './auth.service';

export const userService = {
    /**
     * Obtener el perfil completo del usuario actual
     */
    async getCurrentUserProfile(): Promise<{ success: boolean; user?: User; error?: string }> {
        try {
            const currentUser = await authService.getCurrentUser();
            if (!currentUser) {
                return { success: false, error: 'No autenticado' };
            }

            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', currentUser.id)
                .single();

            if (error) {
                console.error('Get user profile error:', error);
                return { success: false, error: 'Error al obtener perfil' };
            }

            return { success: true, user: data };
        } catch (error) {
            console.error('Get user profile error:', error);
            return { success: false, error: 'Error al obtener perfil' };
        }
    },

    /**
     * Actualizar el perfil del usuario
     */
    async updateUserProfile(updates: {
        full_name?: string;
        email?: string;
        phone?: string;
        phone_country_code?: string;
        phone_extension?: string;
        birth_date?: string;
        department?: string;
    }): Promise<{ success: boolean; user?: User; error?: string }> {
        try {
            const currentUser = await authService.getCurrentUser();
            if (!currentUser) {
                return { success: false, error: 'No autenticado' };
            }

            // Validar email si se proporciona
            if (updates.email && !this.isValidEmail(updates.email)) {
                return { success: false, error: 'Email inválido' };
            }

            // Validar que el nombre no esté vacío
            if (updates.full_name !== undefined && !updates.full_name.trim()) {
                return { success: false, error: 'El nombre no puede estar vacío' };
            }

            // Preparar datos para actualizar
            const updateData: any = {};
            if (updates.full_name !== undefined) updateData.full_name = updates.full_name.trim();
            if (updates.email !== undefined) updateData.email = updates.email.trim();
            if (updates.phone !== undefined) updateData.phone = updates.phone.trim();
            if (updates.phone_country_code !== undefined) updateData.phone_country_code = updates.phone_country_code;
            if (updates.phone_extension !== undefined) updateData.phone_extension = updates.phone_extension.trim();
            if (updates.birth_date !== undefined) updateData.birth_date = updates.birth_date;
            if (updates.department !== undefined) updateData.department = updates.department.trim();

            updateData.updated_at = new Date().toISOString();

            const { data, error } = await supabase
                .from('users')
                .update(updateData)
                .eq('id', currentUser.id)
                .select()
                .single();

            if (error) {
                console.error('Update user profile error:', error);
                return { success: false, error: 'Error al actualizar perfil' };
            }

            return { success: true, user: data };
        } catch (error) {
            console.error('Update user profile error:', error);
            return { success: false, error: 'Error al actualizar perfil' };
        }
    },

    /**
     * Validar formato de email
     */
    isValidEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },
};
