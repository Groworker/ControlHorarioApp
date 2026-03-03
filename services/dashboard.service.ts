import { type ClockEntry } from '@/lib/supabase';
import { calculateDailyMetrics } from '@/utils/timeCalculator';
import { authService } from './auth.service';
import { clockService } from './clock.service';
import { userService } from './user.service';

export interface WorkMetrics {
    workedHours: number;
    workedMinutes: number;
    breakHours: number;
    breakMinutes: number;
    overtimeHours: number;
    overtimeMinutes: number;
    expectedHours: number;
    attendanceRate: number;
    daysWorked: number;
    expectedDays: number;
    averageDailyHours: number;
}

export interface DailyBreakdown {
    date: string;
    workedHours: number;
    workedMinutes: number;
    breakHours: number;
    breakMinutes: number;
    isToday: boolean;
}

export interface WeeklyBreakdown {
    weekNumber: number;
    startDate: string;
    endDate: string;
    workedHours: number;
    workedMinutes: number;
    breakHours: number;
    breakMinutes: number;
    overtimeHours: number;
    overtimeMinutes: number;
}

export const dashboardService = {
    /**
     * Get comprehensive work metrics for a date range
     */
    async getWorkMetrics(startDate: string, endDate: string): Promise<WorkMetrics | null> {
        try {
            const user = await authService.getCurrentUser();
            if (!user) return null;

            // Get user profile for weekly_hours
            const profileResult = await userService.getCurrentUserProfile();
            const weeklyHours = profileResult.user?.weekly_hours || 40;

            // Fetch all clock entries for the period
            const from = new Date(startDate);
            const to = new Date(endDate);
            to.setHours(23, 59, 59, 999);

            const result = await clockService.getMyEntries(from, to);
            if (!result.success || !result.entries) {
                return this.getEmptyMetrics();
            }

            const entries = result.entries;

            // Group entries by date
            const entriesByDate = this.groupEntriesByDate(entries);

            // Calculate metrics
            let totalWorkedMinutes = 0;
            let totalBreakMinutes = 0;
            let daysWorked = 0;

            Object.keys(entriesByDate).forEach(date => {
                const dayEntries = entriesByDate[date].sort(
                    (a, b) => new Date(a.clock_time).getTime() - new Date(b.clock_time).getTime()
                );

                const dailyMetrics = this.calculateDailyMetrics(dayEntries);

                if (dailyMetrics.workedMinutes > 0) {
                    totalWorkedMinutes += dailyMetrics.workedMinutes;
                    totalBreakMinutes += dailyMetrics.breakMinutes;
                    daysWorked++;
                }
            });

            // Calculate expected hours for the period
            const expectedDays = this.getTotalDaysInPeriod(from, to);
            const dailyExpectedHours = weeklyHours / 7; // Daily average including weekends
            const expectedTotalMinutes = expectedDays * dailyExpectedHours * 60;

            // Calculate overtime (can be negative for deficit)
            const overtimeMinutes = totalWorkedMinutes - expectedTotalMinutes;

            // Calculate attendance rate
            const attendanceRate = expectedDays > 0 ? (daysWorked / expectedDays) * 100 : 0;

            // Calculate average daily hours
            const averageDailyHours = daysWorked > 0 ? totalWorkedMinutes / 60 / daysWorked : 0;

            return {
                workedHours: Math.floor(totalWorkedMinutes / 60),
                workedMinutes: Math.floor(totalWorkedMinutes % 60),
                breakHours: Math.floor(totalBreakMinutes / 60),
                breakMinutes: Math.floor(totalBreakMinutes % 60),
                // Para mantener el signo correcto al floor, usamos trunc o calculamos de forma absoluta
                overtimeHours: overtimeMinutes < 0 ? Math.ceil(overtimeMinutes / 60) : Math.floor(overtimeMinutes / 60),
                overtimeMinutes: Math.abs(Math.floor(overtimeMinutes % 60)),
                expectedHours: expectedTotalMinutes / 60,
                attendanceRate: Math.round(attendanceRate),
                daysWorked,
                expectedDays,
                averageDailyHours: Math.round(averageDailyHours * 10) / 10,
            };
        } catch (error) {
            console.error('Error calculating work metrics:', error);
            return this.getEmptyMetrics();
        }
    },

    /**
     * Get daily breakdown for weekly view
     */
    async getDailyBreakdown(startDate: string, endDate: string): Promise<DailyBreakdown[]> {
        try {
            const user = await authService.getCurrentUser();
            if (!user) return [];

            const from = new Date(startDate);
            const to = new Date(endDate);
            to.setHours(23, 59, 59, 999);

            const result = await clockService.getMyEntries(from, to);
            if (!result.success || !result.entries) return [];

            const entriesByDate = this.groupEntriesByDate(result.entries);
            const breakdown: DailyBreakdown[] = [];

            // Generate all days in range
            const current = new Date(from);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            while (current <= to) {
                const dateKey = current.toISOString().split('T')[0];
                const dayEntries = entriesByDate[dateKey] || [];

                const metrics = dayEntries.length > 0
                    ? this.calculateDailyMetrics(dayEntries.sort(
                        (a, b) => new Date(a.clock_time).getTime() - new Date(b.clock_time).getTime()
                    ))
                    : { workedMinutes: 0, breakMinutes: 0 };

                const currentDay = new Date(current);
                currentDay.setHours(0, 0, 0, 0);

                breakdown.push({
                    date: dateKey,
                    workedHours: Math.floor(metrics.workedMinutes / 60),
                    workedMinutes: Math.floor(metrics.workedMinutes % 60),
                    breakHours: Math.floor(metrics.breakMinutes / 60),
                    breakMinutes: Math.floor(metrics.breakMinutes % 60),
                    isToday: currentDay.getTime() === today.getTime(),
                });

                current.setDate(current.getDate() + 1);
            }

            return breakdown;
        } catch (error) {
            console.error('Error getting daily breakdown:', error);
            return [];
        }
    },

    /**
     * Get weekly breakdown for monthly view
     */
    async getWeeklyBreakdown(month: Date): Promise<WeeklyBreakdown[]> {
        try {
            const user = await authService.getCurrentUser();
            if (!user) return [];

            // Get user profile for weekly_hours
            const profileResult = await userService.getCurrentUserProfile();
            const weeklyHours = profileResult.user?.weekly_hours || 40;

            const year = month.getFullYear();
            const monthIndex = month.getMonth();

            // Get first and last day of month
            const firstDay = new Date(year, monthIndex, 1);
            const lastDay = new Date(year, monthIndex + 1, 0);

            const result = await clockService.getMyEntries(firstDay, lastDay);
            if (!result.success || !result.entries) return [];

            const entriesByDate = this.groupEntriesByDate(result.entries);
            const breakdown: WeeklyBreakdown[] = [];

            // Get all weeks in the month
            const weeks = this.getWeeksInMonth(year, monthIndex);

            weeks.forEach((week, index) => {
                let weekWorkedMinutes = 0;
                let weekBreakMinutes = 0;

                const current = new Date(week.start);
                while (current <= week.end) {
                    const dateKey = current.toISOString().split('T')[0];
                    const dayEntries = entriesByDate[dateKey] || [];

                    if (dayEntries.length > 0) {
                        const metrics = this.calculateDailyMetrics(dayEntries.sort(
                            (a, b) => new Date(a.clock_time).getTime() - new Date(b.clock_time).getTime()
                        ));
                        weekWorkedMinutes += metrics.workedMinutes;
                        weekBreakMinutes += metrics.breakMinutes;
                    }

                    current.setDate(current.getDate() + 1);
                }

                const daysInWeek = this.getTotalDaysInPeriod(week.start, week.end);
                const expectedWeekMinutes = daysInWeek * (weeklyHours / 7) * 60;
                const overtimeMinutes = weekWorkedMinutes - expectedWeekMinutes;

                breakdown.push({
                    weekNumber: index + 1,
                    startDate: week.start.toISOString().split('T')[0],
                    endDate: week.end.toISOString().split('T')[0],
                    workedHours: Math.floor(weekWorkedMinutes / 60),
                    workedMinutes: Math.floor(weekWorkedMinutes % 60),
                    breakHours: Math.floor(weekBreakMinutes / 60),
                    breakMinutes: Math.floor(weekBreakMinutes % 60),
                    overtimeHours: overtimeMinutes < 0 ? Math.ceil(overtimeMinutes / 60) : Math.floor(overtimeMinutes / 60),
                    overtimeMinutes: Math.abs(Math.floor(overtimeMinutes % 60)),
                });
            });

            return breakdown;
        } catch (error) {
            console.error('Error getting weekly breakdown:', error);
            return [];
        }
    },

    /**
     * Helper: Group entries by date
     */
    groupEntriesByDate(entries: ClockEntry[]): { [date: string]: ClockEntry[] } {
        return entries.reduce((acc: { [key: string]: ClockEntry[] }, entry: ClockEntry) => {
            const date = entry.clock_time.split('T')[0];
            if (!acc[date]) acc[date] = [];
            acc[date].push(entry);
            return acc;
        }, {});
    },

    /**
     * Helper: Calculate daily metrics from entries
     */
    calculateDailyMetrics(dayEntries: ClockEntry[]): { workedMinutes: number; breakMinutes: number } {
        return calculateDailyMetrics(dayEntries);
    },

    /**
     * Helper: Get total days in period (all calendar days)
     */
    getTotalDaysInPeriod(start: Date, end: Date): number {
        const startDay = new Date(start);
        startDay.setHours(0, 0, 0, 0);
        const endDay = new Date(end);
        endDay.setHours(0, 0, 0, 0);

        const diffTime = Math.abs(endDay.getTime() - startDay.getTime());
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end dates
        return diffDays;
    },

    /**
     * Helper: Get all weeks in a month
     */
    getWeeksInMonth(year: number, month: number): { start: Date; end: Date }[] {
        const weeks: { start: Date; end: Date }[] = [];
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        let weekStart = new Date(firstDay);
        // Adjust to Monday
        const dayOfWeek = weekStart.getDay();
        const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        weekStart.setDate(weekStart.getDate() + daysToMonday);

        while (weekStart <= lastDay) {
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6); // Sunday

            weeks.push({
                start: new Date(weekStart),
                end: weekEnd > lastDay ? new Date(lastDay) : weekEnd,
            });

            weekStart.setDate(weekStart.getDate() + 7);
        }

        return weeks;
    },

    /**
     * Helper: Get empty metrics
     */
    getEmptyMetrics(): WorkMetrics {
        return {
            workedHours: 0,
            workedMinutes: 0,
            breakHours: 0,
            breakMinutes: 0,
            overtimeHours: 0,
            overtimeMinutes: 0,
            expectedHours: 0,
            attendanceRate: 0,
            daysWorked: 0,
            expectedDays: 0,
            averageDailyHours: 0,
        };
    },
};
