import { supabase, type User } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CURRENT_USER_KEY = 'current_user';

export const authService = {
    /**
     * Login con código de empleado (PIN)
     */
    async loginWithCode(employeeCode: string): Promise<{ success: boolean; user?: User; error?: string }> {
        try {
            // Validar longitud del código
            if (employeeCode.length !== 5) {
                return { success: false, error: 'El código debe tener 5 dígitos' };
            }

            // Buscar usuario por código
            // Usamos maybeSingle() en lugar de single() para evitar error cuando no hay resultados
            const { data: user, error } = await supabase
                .from('users')
                .select('*')
                .eq('employee_code', employeeCode)
                .eq('is_active', true)
                .maybeSingle(); // Retorna null si no hay resultados, en lugar de lanzar error

            // Si hay error de base de datos (diferente de "no encontrado")
            if (error) {
                console.error('Database error:', error);
                return { success: false, error: 'Error al verificar el código' };
            }

            // Si no se encontró el usuario
            if (!user) {
                return { success: false, error: 'Código inválido o usuario no encontrado' };
            }

            // Guardar sesión local
            await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));

            return { success: true, user };
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: 'Error al iniciar sesión. Por favor intenta de nuevo.' };
        }
    },

    /**
     * Obtener usuario actual de la sesión local
     */
    async getCurrentUser(): Promise<User | null> {
        try {
            const userStr = await AsyncStorage.getItem(CURRENT_USER_KEY);
            if (!userStr) return null;

            return JSON.parse(userStr) as User;
        } catch (error) {
            console.error('Get current user error:', error);
            return null;
        }
    },

    /**
     * Verificar si hay sesión activa
     */
    async isAuthenticated(): Promise<boolean> {
        const user = await this.getCurrentUser();
        return user !== null;
    },

    /**
     * Cerrar sesión
     */
    async logout(): Promise<void> {
        try {
            await AsyncStorage.removeItem(CURRENT_USER_KEY);
        } catch (error) {
            console.error('Logout error:', error);
        }
    },

    /**
     * Actualizar información del usuario en sesión local
     */
    async updateLocalUser(user: User): Promise<void> {
        try {
            await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
        } catch (error) {
            console.error('Update local user error:', error);
        }
    },
};
