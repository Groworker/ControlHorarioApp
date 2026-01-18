import { supabase, type ClockEntry } from '@/lib/supabase';
import { authService } from './auth.service';

export type EntryType = 'ENTRADA' | 'SALIDA' | 'ENTRADA_2' | 'SALIDA_2' | 'DESCANSO';

export interface DailyHours {
    [date: string]: {
        hours: string;
        minutes: string;
    };
}

export const clockService = {
    /**
     * Registrar fichaje (entrada, salida, descanso, etc.)
     */
    async clockEntry(entryType: EntryType): Promise<{ success: boolean; entry?: ClockEntry; error?: string }> {
        try {
            const user = await authService.getCurrentUser();
            if (!user) {
                return { success: false, error: 'No autenticado' };
            }

            const { data, error } = await supabase
                .from('clock_entries')
                .insert({
                    user_id: user.id,
                    entry_type: entryType,
                    clock_time: new Date().toISOString(),
                    is_manual: false,
                })
                .select()
                .single();

            if (error) {
                console.error('Clock entry error:', error);
                return { success: false, error: 'Error al registrar fichaje' };
            }

            return { success: true, entry: data };
        } catch (error) {
            console.error('Clock entry error:', error);
            return { success: false, error: 'Error al registrar fichaje' };
        }
    },

    /**
     * Obtener fichajes del usuario en un rango de fechas
     */
    async getMyEntries(fromDate?: Date, toDate?: Date): Promise<{ success: boolean; entries?: ClockEntry[]; error?: string }> {
        try {
            const user = await authService.getCurrentUser();
            if (!user) {
                return { success: false, error: 'No autenticado' };
            }

            let query = supabase
                .from('clock_entries')
                .select('*')
                .eq('user_id', user.id)
                .order('clock_time', { ascending: false });

            if (fromDate) {
                query = query.gte('clock_time', fromDate.toISOString());
            }
            if (toDate) {
                query = query.lte('clock_time', toDate.toISOString());
            }

            const { data, error } = await query;

            if (error) {
                console.error('Get entries error:', error);
                return { success: false, error: 'Error al obtener fichajes' };
            }

            return { success: true, entries: data || [] };
        } catch (error) {
            console.error('Get entries error:', error);
            return { success: false, error: 'Error al obtener fichajes' };
        }
    },

    /**
     * Obtener el último fichaje del usuario
     */
    async getLastEntry(): Promise<{ success: boolean; entry?: ClockEntry; error?: string }> {
        try {
            const user = await authService.getCurrentUser();
            if (!user) {
                return { success: false, error: 'No autenticado' };
            }

            const { data, error } = await supabase
                .from('clock_entries')
                .select('*')
                .eq('user_id', user.id)
                .order('clock_time', { ascending: false })
                .limit(1)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
                console.error('Get last entry error:', error);
                return { success: false, error: 'Error al obtener último fichaje' };
            }

            return { success: true, entry: data || undefined };
        } catch (error) {
            console.error('Get last entry error:', error);
            return { success: false, error: 'Error al obtener último fichaje' };
        }
    },

    /**
     * Calcular horas trabajadas por día a partir de los fichajes
     */
    calculateDailyHours(entries: ClockEntry[]): DailyHours {
        const dailyHours: DailyHours = {};

        // Agrupar fichajes por fecha
        const entriesByDate: { [date: string]: ClockEntry[] } = {};

        entries.forEach(entry => {
            const date = new Date(entry.clock_time).toISOString().split('T')[0];
            if (!entriesByDate[date]) {
                entriesByDate[date] = [];
            }
            entriesByDate[date].push(entry);
        });

        // Calcular horas para cada día
        Object.entries(entriesByDate).forEach(([date, dayEntries]) => {
            let totalMinutes = 0;

            // Ordenar por hora
            dayEntries.sort((a, b) =>
                new Date(a.clock_time).getTime() - new Date(b.clock_time).getTime()
            );

            // Calcular diferencias entre entradas y salidas
            for (let i = 0; i < dayEntries.length - 1; i++) {
                const current = dayEntries[i];
                const next = dayEntries[i + 1];

                // Si es entrada seguida de salida, calcular diferencia
                if (
                    (current.entry_type === 'ENTRADA' && next.entry_type === 'SALIDA') ||
                    (current.entry_type === 'ENTRADA_2' && next.entry_type === 'SALIDA_2')
                ) {
                    const diff = new Date(next.clock_time).getTime() - new Date(current.clock_time).getTime();
                    totalMinutes += diff / (1000 * 60);
                }
            }

            const hours = Math.floor(totalMinutes / 60);
            const minutes = Math.floor(totalMinutes % 60);

            dailyHours[date] = {
                hours: `${hours}h`,
                minutes: `${minutes}m`,
            };
        });

        return dailyHours;
    },

    /**
     * Calcular total de horas trabajadas en un periodo
     */
    calculateTotalHours(entries: ClockEntry[]): { hours: number; minutes: number; formatted: string } {
        const dailyHours = this.calculateDailyHours(entries);
        let totalMinutes = 0;

        Object.values(dailyHours).forEach(day => {
            const hours = parseInt(day.hours.replace('h', '')) || 0;
            const minutes = parseInt(day.minutes.replace('m', '')) || 0;
            totalMinutes += (hours * 60) + minutes;
        });

        const hours = Math.floor(totalMinutes / 60);
        const minutes = Math.floor(totalMinutes % 60);

        return {
            hours,
            minutes,
            formatted: `${hours}h ${minutes}m`,
        };
    },
};
