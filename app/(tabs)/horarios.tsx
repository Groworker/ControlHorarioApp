import { Colors } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { scheduleService, WorkScheduleWithEmployee } from '@/services/schedule.service';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function HorariosScreen() {
    const { t } = useTranslation();
    const [selectedGroup, setSelectedGroup] = useState<'all' | 'cocina' | 'resto'>('all');
    const [schedules, setSchedules] = useState<WorkScheduleWithEmployee[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<string>('');
    const [currentWeekStart, setCurrentWeekStart] = useState(getWeekStart(new Date()));

    function getWeekStart(date: Date): Date {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
        return new Date(d.setDate(diff));
    }

    function formatWeekRange(date: Date): string {
        const start = new Date(date);
        const end = new Date(date);
        end.setDate(start.getDate() + 6);

        const startDay = start.getDate();
        const endDay = end.getDate();
        const month = start.toLocaleDateString('es-ES', { month: 'long' });

        return `${startDay} - ${endDay} ${month}`;
    }

    const loadSchedules = async () => {
        setIsLoading(true);
        try {
            // Get current user
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setCurrentUserId(user.id);
            }

            // Calculate week range
            const endDate = new Date(currentWeekStart);
            endDate.setDate(currentWeekStart.getDate() + 6);

            const startDateStr = currentWeekStart.toISOString().split('T')[0];
            const endDateStr = endDate.toISOString().split('T')[0];

            // Fetch schedules
            const group = selectedGroup === 'all' ? undefined : selectedGroup;
            const result = await scheduleService.getSchedulesByDateRange(startDateStr, endDateStr, group);

            if (result.success && result.schedules) {
                setSchedules(result.schedules);
            }
        } catch (error) {
            console.error('Error loading schedules:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadSchedules();
        }, [selectedGroup, currentWeekStart])
    );

    const navigateWeek = (direction: 'prev' | 'next') => {
        const newDate = new Date(currentWeekStart);
        newDate.setDate(currentWeekStart.getDate() + (direction === 'next' ? 7 : -7));
        setCurrentWeekStart(newDate);
    };

    // Group schedules by employee
    const groupedByEmployee = schedules.reduce((acc, schedule) => {
        const key = schedule.user_id;
        if (!acc[key]) {
            acc[key] = {
                employee_name: schedule.employee_name,
                employee_code: schedule.employee_code,
                user_id: schedule.user_id,
                schedules: []
            };
        }
        acc[key].schedules.push(schedule);
        return acc;
    }, {} as Record<string, { employee_name: string; employee_code: string; user_id: string; schedules: WorkScheduleWithEmployee[] }>);

    const employeeList = Object.values(groupedByEmployee).sort((a, b) =>
        a.employee_name.localeCompare(b.employee_name)
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>{t('horarios.title')}</Text>
            </View>

            {/* Week Navigation */}
            <View style={styles.weekNavigation}>
                <TouchableOpacity
                    style={styles.navButton}
                    onPress={() => navigateWeek('prev')}
                    activeOpacity={0.7}
                >
                    <Text style={styles.navButtonText}>←</Text>
                </TouchableOpacity>

                <View style={styles.weekInfo}>
                    <Text style={styles.weekText}>{formatWeekRange(currentWeekStart)}</Text>
                </View>

                <TouchableOpacity
                    style={styles.navButton}
                    onPress={() => navigateWeek('next')}
                    activeOpacity={0.7}
                >
                    <Text style={styles.navButtonText}>→</Text>
                </TouchableOpacity>
            </View>

            {/* Group Selection */}
            <View style={styles.groupSelector}>
                <TouchableOpacity
                    style={[styles.groupChip, selectedGroup === 'all' && styles.groupChipActive]}
                    onPress={() => setSelectedGroup('all')}
                >
                    <Text style={[styles.groupChipText, selectedGroup === 'all' && styles.groupChipTextActive]}>
                        {t('horarios.allSchedules')}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.groupChip, selectedGroup === 'cocina' && styles.groupChipActive]}
                    onPress={() => setSelectedGroup('cocina')}
                >
                    <Text style={[styles.groupChipText, selectedGroup === 'cocina' && styles.groupChipTextActive]}>
                        {t('horarios.cocina')}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.groupChip, selectedGroup === 'resto' && styles.groupChipActive]}
                    onPress={() => setSelectedGroup('resto')}
                >
                    <Text style={[styles.groupChipText, selectedGroup === 'resto' && styles.groupChipTextActive]}>
                        {t('horarios.resto')}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Content */}
            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.light.primary} />
                    <Text style={styles.loadingText}>{t('horarios.loading')}</Text>
                </View>
            ) : employeeList.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyIcon}>📅</Text>
                    <Text style={styles.emptyText}>{t('horarios.noSchedules')}</Text>
                    <Text style={styles.emptySubtext}>{t('horarios.noSchedulesThisWeek')}</Text>
                </View>
            ) : (
                <ScrollView style={styles.scrollView}>
                    <View style={styles.scheduleList}>
                        {employeeList.map((employee) => {
                            const isCurrentUser = employee.user_id === currentUserId;

                            return (
                                <View
                                    key={employee.user_id}
                                    style={[
                                        styles.employeeCard,
                                        isCurrentUser && styles.employeeCardHighlight
                                    ]}
                                >
                                    <View style={styles.employeeHeader}>
                                        <View>
                                            <Text style={[
                                                styles.employeeName,
                                                isCurrentUser && styles.employeeNameHighlight
                                            ]}>
                                                {employee.employee_name}
                                                {isCurrentUser && ' (Tú)'}
                                            </Text>
                                            <Text style={styles.employeeCode}>{employee.employee_code}</Text>
                                        </View>
                                    </View>

                                    {/* Week Schedule */}
                                    <View style={styles.weekSchedule}>
                                        {employee.schedules
                                            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                                            .map((schedule) => {
                                                const date = new Date(schedule.date);
                                                const dayName = date.toLocaleDateString('es-ES', { weekday: 'short' });
                                                const dayNum = date.getDate();

                                                return (
                                                    <View key={schedule.id} style={styles.daySchedule}>
                                                        <Text style={styles.dayName}>{dayName}</Text>
                                                        <Text style={styles.dayNumber}>{dayNum}</Text>
                                                        <View style={styles.timeContainer}>
                                                            <Text style={styles.timeText}>
                                                                {schedule.start_time.substring(0, 5)}
                                                            </Text>
                                                            <Text style={styles.timeSeparator}>-</Text>
                                                            <Text style={styles.timeText}>
                                                                {schedule.end_time.substring(0, 5)}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                );
                                            })}
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.light.background,
    },
    header: {
        backgroundColor: Colors.light.cardBackground,
        paddingVertical: 20,
        paddingHorizontal: 24,
        paddingTop: 83,
        borderBottomWidth: 1,
        borderBottomColor: Colors.light.border,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: Colors.light.text,
    },
    weekNavigation: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: Colors.light.cardBackground,
        gap: 12,
    },
    navButton: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: Colors.light.primary,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 4,
    },
    navButtonText: {
        fontSize: 28,
        color: '#FFFFFF',
        fontWeight: 'bold',
    },
    weekInfo: {
        flex: 1,
        alignItems: 'center',
    },
    weekText: {
        fontSize: 18,
        fontWeight: '600',
        color: Colors.light.text,
    },
    groupSelector: {
        flexDirection: 'row',
        padding: 16,
        gap: 8,
        backgroundColor: Colors.light.cardBackground,
        borderBottomWidth: 1,
        borderBottomColor: Colors.light.border,
    },
    groupChip: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 16,
        backgroundColor: Colors.light.background,
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.light.border,
    },
    groupChipActive: {
        backgroundColor: Colors.light.primary,
        borderColor: Colors.light.primary,
    },
    groupChipText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.light.text,
    },
    groupChipTextActive: {
        color: '#FFFFFF',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    loadingText: {
        fontSize: 16,
        color: Colors.light.textSecondary,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyIcon: {
        fontSize: 64,
        marginBottom: 16,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: Colors.light.text,
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 14,
        color: Colors.light.textSecondary,
        textAlign: 'center',
    },
    scrollView: {
        flex: 1,
    },
    scheduleList: {
        padding: 16,
        gap: 12,
    },
    employeeCard: {
        backgroundColor: Colors.light.cardBackground,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 2,
        borderColor: 'transparent',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    employeeCardHighlight: {
        borderColor: Colors.light.primary,
        backgroundColor: '#F0F9FF',
    },
    employeeHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    employeeName: {
        fontSize: 17,
        fontWeight: '700',
        color: Colors.light.text,
    },
    employeeNameHighlight: {
        color: Colors.light.primary,
    },
    employeeCode: {
        fontSize: 13,
        color: Colors.light.textSecondary,
        marginTop: 2,
    },
    weekSchedule: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    daySchedule: {
        flex: 1,
        minWidth: '30%',
        backgroundColor: '#F9FAFB',
        borderRadius: 8,
        padding: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.light.borderLight,
    },
    dayName: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.light.textSecondary,
        textTransform: 'uppercase',
    },
    dayNumber: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.light.text,
        marginVertical: 4,
    },
    timeContainer: {
        alignItems: 'center',
        marginTop: 4,
    },
    timeText: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.light.primary,
    },
    timeSeparator: {
        fontSize: 12,
        color: Colors.light.textSecondary,
        marginVertical: 2,
    },
});
