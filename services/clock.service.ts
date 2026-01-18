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
    async clockEntry(entryType: EntryType, customTime?: Date): Promise<{ success: boolean; entry?: ClockEntry; error?: string }> {
        try {
            const user = await authService.getCurrentUser();
            if (!user) {
                return { success: false, error: 'No autenticado' };
            }

            const clockTime = customTime ? customTime.toISOString() : new Date().toISOString();

            const { data, error } = await supabase
                .from('clock_entries')
                .insert({
                    user_id: user.id,
                    entry_type: entryType,
                    clock_time: clockTime,
                    is_manual: customTime ? true : false, // Si tiene hora personalizada, marcarlo como manual
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

    /**
     * Obtener horas reales trabajadas por fecha (salida - entrada - descanso)
     * Formato para el calendario
     */
    async getRealWorkedHoursByDate(startDate: string, endDate: string): Promise<DailyHours> {
        try {
            const user = await authService.getCurrentUser();
            if (!user) return {};

            // Convertir strings a Date
            const from = new Date(startDate);
            const to = new Date(endDate);
            to.setHours(23, 59, 59, 999); // Incluir todo el día final

            const result = await this.getMyEntries(from, to);
            if (!result.success || !result.entries) return {};

            const entries = result.entries;
            const dailyHours: DailyHours = {};

            // Agrupar por día
            const entriesByDate = entries.reduce((acc: { [key: string]: ClockEntry[] }, entry: ClockEntry) => {
                const date = entry.clock_time.split('T')[0];
                if (!acc[date]) acc[date] = [];
                acc[date].push(entry);
                return acc;
            }, {});

            // Calcular horas por cada día
            Object.keys(entriesByDate).forEach(date => {
                const dayEntries = entriesByDate[date].sort(
                    (a: ClockEntry, b: ClockEntry) => new Date(a.clock_time).getTime() - new Date(b.clock_time).getTime()
                );

                let totalWorkedMinutes = 0;
                let totalBreakMinutes = 0;

                // Calcular pares de ENTRADA-SALIDA
                const entradas = dayEntries.filter((e: ClockEntry) => e.entry_type === 'ENTRADA' || e.entry_type === 'ENTRADA_2');
                const salidas = dayEntries.filter((e: ClockEntry) => e.entry_type === 'SALIDA' || e.entry_type === 'SALIDA_2');
                const descansos = dayEntries.filter((e: ClockEntry) => e.entry_type === 'DESCANSO');

                // Calcular tiempo de trabajo total
                const pairs = Math.min(entradas.length, salidas.length);
                for (let i = 0; i < pairs; i++) {
                    const entradaTime = new Date(entradas[i].clock_time).getTime();
                    const salidaTime = new Date(salidas[i].clock_time).getTime();
                    totalWorkedMinutes += (salidaTime - entradaTime) / (1000 * 60);
                }

                // Calcular tiempo de descanso
                for (let i = 0; i < descansos.length - 1; i += 2) {
                    const start = new Date(descansos[i].clock_time).getTime();
                    const end = new Date(descansos[i + 1].clock_time).getTime();
                    totalBreakMinutes += (end - start) / (1000 * 60);
                }

                // Horas reales = trabajo total - descansos
                const realMinutes = Math.max(0, Math.floor(totalWorkedMinutes - totalBreakMinutes));
                const hours = Math.floor(realMinutes / 60);
                const minutes = Math.floor(realMinutes % 60);

                dailyHours[date] = {
                    hours: `${hours}h`,
                    minutes: `${minutes}m`,
                };
            });

            return dailyHours;
        } catch (error) {
            console.error('Error calculating real worked hours:', error);
            return {};
        }
    },
};
