import { Colors } from '@/constants/Colors';
import { dashboardService, type DailyBreakdown, type WeeklyBreakdown, type WorkMetrics } from '@/services/dashboard.service';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type ViewMode = 'week' | 'month' | 'custom';

export default function DashboardScreen() {
    const { t, i18n } = useTranslation();
    const [selectedWeek, setSelectedWeek] = useState(getCurrentWeek());
    const [selectedMonth, setSelectedMonth] = useState(new Date());
    const [customStart, setCustomStart] = useState(new Date());
    const [customEnd, setCustomEnd] = useState(new Date());
    const [viewMode, setViewMode] = useState<ViewMode>('week');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [metrics, setMetrics] = useState<WorkMetrics | null>(null);
    const [dailyBreakdown, setDailyBreakdown] = useState<DailyBreakdown[]>([]);
    const [weeklyBreakdown, setWeeklyBreakdown] = useState<WeeklyBreakdown[]>([]);

    function getCurrentWeek() {
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Monday
        return startOfWeek;
    }

    const navigate = (direction: 'prev' | 'next') => {
        if (viewMode === 'week') {
            const newWeek = new Date(selectedWeek);
            newWeek.setDate(selectedWeek.getDate() + (direction === 'next' ? 7 : -7));
            setSelectedWeek(newWeek);
        } else if (viewMode === 'month') {
            const newMonth = new Date(selectedMonth);
            newMonth.setMonth(selectedMonth.getMonth() + (direction === 'next' ? 1 : -1));
            setSelectedMonth(newMonth);
        }
    };

    const formatRange = () => {
        if (viewMode === 'custom') {
            const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
            return `${customStart.getDate()} ${months[customStart.getMonth()]} - ${customEnd.getDate()} ${months[customEnd.getMonth()]} ${customEnd.getFullYear()}`;
        } else if (viewMode === 'week') {
            const weekEnd = new Date(selectedWeek);
            weekEnd.setDate(selectedWeek.getDate() + 6);
            const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
            return `${selectedWeek.getDate()} ${months[selectedWeek.getMonth()]} - ${weekEnd.getDate()} ${months[weekEnd.getMonth()]} ${weekEnd.getFullYear()}`;
        } else {
            const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
            return `${months[selectedMonth.getMonth()]} ${selectedMonth.getFullYear()}`;
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadDashboard();
        }, [selectedWeek, selectedMonth, viewMode, customStart, customEnd])
    );

    const loadDashboard = async () => {
        setIsLoading(true);
        try {
            let startDate: string;
            let endDate: string;

            if (viewMode === 'custom') {
                startDate = formatDateKey(customStart);
                endDate = formatDateKey(customEnd);
            } else if (viewMode === 'week') {
                startDate = formatDateKey(selectedWeek);
                const weekEnd = new Date(selectedWeek);
                weekEnd.setDate(selectedWeek.getDate() + 6);
                endDate = formatDateKey(weekEnd);
            } else {
                const year = selectedMonth.getFullYear();
                const month = selectedMonth.getMonth();
                startDate = `${year}-${(month + 1).toString().padStart(2, '0')}-01`;
                const lastDay = new Date(year, month + 1, 0).getDate();
                endDate = `${year}-${(month + 1).toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
            }

            const metricsData = await dashboardService.getWorkMetrics(startDate, endDate);
            setMetrics(metricsData);

            if (viewMode === 'week' || viewMode === 'custom') {
                const daily = await dashboardService.getDailyBreakdown(startDate, endDate);
                setDailyBreakdown(daily);
            } else {
                const weekly = await dashboardService.getWeeklyBreakdown(selectedMonth);
                setWeeklyBreakdown(weekly);
            }
        } catch (error) {
            console.error('Error loading dashboard:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const formatDateKey = (date: Date) => {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const getPerformanceColor = (actual: number, expected: number): string => {
        if (expected === 0) return Colors.light.textSecondary;
        const percentage = (actual / expected) * 100;
        if (percentage >= 100) return '#10B981'; // Green
        if (percentage >= 80) return '#F59E0B'; // Amber
        return '#EF4444'; // Red
    };

    const getPerformanceLevel = (actual: number, expected: number): string => {
        if (expected === 0) return 'N/A';
        const percentage = (actual / expected) * 100;
        if (percentage >= 100) return 'Excelente';
        if (percentage >= 80) return 'Bueno';
        return 'Mejorable';
    };

    const formatHours = (hours: number, minutes: number): string => {
        const sign = (hours < 0 || minutes < 0) ? '-' : '';
        const absHours = Math.abs(hours);
        const absMinutes = Math.abs(minutes);
        return `${sign}${absHours}:${absMinutes.toString().padStart(2, '0')}`;
    };

    const applyCustomDates = () => {
        setViewMode('custom');
        setShowDatePicker(false);
    };

    if (isLoading) {
        return (
            <View style={[styles.container, styles.loadingContainer]}>
                <ActivityIndicator size="large" color={Colors.light.primary} />
                <Text style={styles.loadingText}>Cargando dashboard...</Text>
            </View>
        );
    }

    const totalWorkedMinutes = (metrics?.workedHours || 0) * 60 + (metrics?.workedMinutes || 0);
    const expectedMinutes = (metrics?.expectedHours || 0) * 60;
    const progressPercentage = expectedMinutes > 0 ? Math.min((totalWorkedMinutes / expectedMinutes) * 100, 100) : 0;

    const overtimeTotal = (metrics?.overtimeHours || 0) * 60 + (metrics?.overtimeMinutes || 0);
    const isDeficit = overtimeTotal < 0;
    const overtimeColor = isDeficit ? '#EF4444' : (overtimeTotal > 0 ? '#8B5CF6' : '#94A3B8');

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Dashboard</Text>
            </View>

            {/* Date Range Selectors */}
            <View style={styles.dateRangeSection}>
                <TouchableOpacity
                    style={styles.dateInput}
                    onPress={() => setShowDatePicker(true)}
                    activeOpacity={0.7}
                >
                    <Text style={styles.dateInputLabel}>Fecha Inicial</Text>
                    <View style={styles.dateInputValue}>
                        <Ionicons name="calendar-outline" size={18} color={Colors.light.primary} />
                        <Text style={styles.dateInputText}>
                            {viewMode === 'custom' ? customStart.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) :
                                viewMode === 'week' ? selectedWeek.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) :
                                    new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </Text>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.dateInput}
                    onPress={() => setShowDatePicker(true)}
                    activeOpacity={0.7}
                >
                    <Text style={styles.dateInputLabel}>Fecha Final</Text>
                    <View style={styles.dateInputValue}>
                        <Ionicons name="calendar-outline" size={18} color={Colors.light.primary} />
                        <Text style={styles.dateInputText}>
                            {viewMode === 'custom' ? customEnd.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) :
                                viewMode === 'week' ? (() => { const end = new Date(selectedWeek); end.setDate(end.getDate() + 6); return end.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }); })() :
                                    new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </Text>
                    </View>
                </TouchableOpacity>
            </View>

            {/* Navigation */}
            <View style={styles.navigation}>
                {viewMode !== 'custom' && (
                    <TouchableOpacity style={styles.navButton} onPress={() => navigate('prev')} activeOpacity={0.7}>
                        <Text style={styles.navButtonText}>←</Text>
                    </TouchableOpacity>
                )}

                <View style={styles.viewToggle}>
                    <TouchableOpacity
                        style={[styles.toggleButton, viewMode === 'week' && styles.toggleActive]}
                        onPress={() => setViewMode('week')}
                        activeOpacity={0.7}
                    >
                        <Text style={viewMode === 'week' ? styles.toggleTextActive : styles.toggleText}>Semanal</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.toggleButton, viewMode === 'month' && styles.toggleActive]}
                        onPress={() => setViewMode('month')}
                        activeOpacity={0.7}
                    >
                        <Text style={viewMode === 'month' ? styles.toggleTextActive : styles.toggleText}>Mensual</Text>
                    </TouchableOpacity>
                </View>

                {viewMode !== 'custom' && (
                    <TouchableOpacity style={styles.navButton} onPress={() => navigate('next')} activeOpacity={0.7}>
                        <Text style={styles.navButtonText}>→</Text>
                    </TouchableOpacity>
                )}
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {viewMode === 'month' && (
                    <View style={styles.monthIndicator}>
                        <Ionicons name="calendar" size={20} color={Colors.light.primary} />
                        <Text style={styles.monthIndicatorText}>
                            {new Date(selectedMonth).toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' })}
                        </Text>
                    </View>
                )}

                {/* Main Metrics Cards - 2 Column Layout for first 2, then 1 full width */}
                <View style={styles.metricsGrid}>
                    {/* Worked Hours */}
                    <View style={[styles.metricCardSmall, { borderLeftColor: getPerformanceColor(totalWorkedMinutes / 60, metrics?.expectedHours || 0) }]}>
                        <View style={styles.metricHeader}>
                            <Ionicons name="time" size={20} color={getPerformanceColor(totalWorkedMinutes / 60, metrics?.expectedHours || 0)} />
                            <Text style={styles.metricLabelSmall}>Trabajadas</Text>
                        </View>
                        <Text style={styles.metricValueSmall}>{formatHours(metrics?.workedHours || 0, metrics?.workedMinutes || 0)}</Text>
                        <View style={styles.progressBar}>
                            <View style={[styles.progressFill, {
                                width: `${progressPercentage}%`,
                                backgroundColor: getPerformanceColor(totalWorkedMinutes / 60, metrics?.expectedHours || 0)
                            }]} />
                        </View>
                    </View>

                    {/* Break Hours */}
                    <View style={[styles.metricCardSmall, { borderLeftColor: '#3B82F6' }]}>
                        <View style={styles.metricHeader}>
                            <Ionicons name="cafe" size={20} color="#3B82F6" />
                            <Text style={styles.metricLabelSmall}>Descanso</Text>
                        </View>
                        <Text style={styles.metricValueSmall}>{formatHours(metrics?.breakHours || 0, metrics?.breakMinutes || 0)}</Text>
                    </View>

                    {/* Overtime/Deficit */}
                    <View style={[styles.metricCardSmall, { borderLeftColor: overtimeColor }]}>
                        <View style={styles.metricHeader}>
                            <Ionicons name={isDeficit ? "alert-circle" : "star"} size={20} color={overtimeColor} />
                            <Text style={styles.metricLabelSmall}>{isDeficit ? 'Déficit' : 'Extras'}</Text>
                        </View>
                        <Text style={styles.metricValueSmall}>{formatHours(metrics?.overtimeHours || 0, metrics?.overtimeMinutes || 0)}</Text>
                    </View>
                </View>

                {/* Additional Metrics */}
                <View style={styles.additionalMetrics}>
                    <View style={styles.additionalMetricItem}>
                        <Ionicons name="trending-up" size={20} color={Colors.light.primary} />
                        <Text style={styles.additionalMetricLabel}>Promedio Diario</Text>
                        <Text style={styles.additionalMetricValue}>{metrics?.averageDailyHours.toFixed(1)}h</Text>
                    </View>
                </View>

                {/* Weekly/Custom Breakdown */}
                {(viewMode === 'week' || viewMode === 'custom') && dailyBreakdown.length > 0 && (
                    <View style={styles.breakdownSection}>
                        <Text style={styles.breakdownTitle}>Desglose Diario</Text>
                        {dailyBreakdown.map((day, index) => {
                            const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
                            const date = new Date(day.date);
                            const dayName = dayNames[date.getDay()];
                            const hasHours = day.workedHours > 0 || day.workedMinutes > 0;

                            return (
                                <View key={index} style={[styles.breakdownItem, day.isToday && styles.breakdownItemToday]}>
                                    <View style={styles.breakdownLeft}>
                                        <Text style={[styles.breakdownDay, day.isToday && styles.breakdownDayToday]}>{dayName}</Text>
                                        <Text style={styles.breakdownDate}>{date.getDate()}/{(date.getMonth() + 1).toString().padStart(2, '0')}</Text>
                                    </View>
                                    <View style={styles.breakdownRight}>
                                        {hasHours ? (
                                            <>
                                                <View style={styles.breakdownStat}>
                                                    <Ionicons name="time-outline" size={16} color={Colors.light.primary} />
                                                    <Text style={styles.breakdownValue}>{formatHours(day.workedHours, day.workedMinutes)}</Text>
                                                </View>
                                                {(day.breakHours > 0 || day.breakMinutes > 0) && (
                                                    <View style={styles.breakdownStat}>
                                                        <Ionicons name="cafe-outline" size={16} color="#3B82F6" />
                                                        <Text style={styles.breakdownValueSmall}>{formatHours(day.breakHours, day.breakMinutes)}</Text>
                                                    </View>
                                                )}
                                            </>
                                        ) : (
                                            <Text style={styles.breakdownNoData}>—</Text>
                                        )}
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}

                {/* Monthly Breakdown */}
                {viewMode === 'month' && weeklyBreakdown.length > 0 && (
                    <View style={styles.breakdownSection}>
                        <Text style={styles.breakdownTitle}>Desglose Semanal</Text>
                        {weeklyBreakdown.map((week, index) => {
                            const start = new Date(week.startDate);
                            const end = new Date(week.endDate);
                            const hasHours = week.workedHours > 0 || week.workedMinutes > 0;
                            const weekOvertimeTotal = week.overtimeHours * 60 + week.overtimeMinutes;
                            const hasOvertime = weekOvertimeTotal !== 0;

                            return (
                                <View key={index} style={styles.weekBreakdownItem}>
                                    <View style={styles.weekBreakdownHeader}>
                                        <Text style={styles.weekBreakdownTitle}>Semana {week.weekNumber}</Text>
                                        <Text style={styles.weekBreakdownDate}>
                                            {start.getDate()}/{(start.getMonth() + 1).toString().padStart(2, '0')} - {end.getDate()}/{(end.getMonth() + 1).toString().padStart(2, '0')}
                                        </Text>
                                    </View>
                                    {hasHours ? (
                                        <View style={styles.weekBreakdownStats}>
                                            <View style={styles.weekStat}>
                                                <Ionicons name="time" size={18} color={Colors.light.primary} />
                                                <Text style={styles.weekStatLabel}>Trabajadas</Text>
                                                <Text style={styles.weekStatValue}>{formatHours(week.workedHours, week.workedMinutes)}</Text>
                                            </View>
                                            <View style={styles.weekStat}>
                                                <Ionicons name="cafe" size={18} color="#3B82F6" />
                                                <Text style={styles.weekStatLabel}>Descanso</Text>
                                                <Text style={styles.weekStatValue}>{formatHours(week.breakHours, week.breakMinutes)}</Text>
                                            </View>
                                            {hasOvertime && (
                                                <View style={styles.weekStat}>
                                                    <Ionicons name={weekOvertimeTotal < 0 ? "alert-circle" : "star"} size={18} color={weekOvertimeTotal < 0 ? '#EF4444' : '#8B5CF6'} />
                                                    <Text style={styles.weekStatLabel}>{weekOvertimeTotal < 0 ? 'Déficit' : 'Extras'}</Text>
                                                    <Text style={styles.weekStatValue}>{formatHours(week.overtimeHours, week.overtimeMinutes)}</Text>
                                                </View>
                                            )}
                                        </View>
                                    ) : (
                                        <Text style={styles.breakdownNoData}>Sin datos</Text>
                                    )}
                                </View>
                            );
                        })}
                    </View>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Date Range Picker Modal */}
            <Modal
                visible={showDatePicker}
                animationType="slide"
                transparent
                onRequestClose={() => setShowDatePicker(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.datePickerModal}>
                        <View style={styles.datePickerHeader}>
                            <Text style={styles.datePickerTitle}>Seleccionar Rango</Text>
                            <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                                <Ionicons name="close" size={24} color={Colors.light.text} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.datePickerContent}>
                            <Text style={styles.datePickerLabel}>Desde</Text>
                            <View style={styles.datePickerRow}>
                                <TouchableOpacity
                                    style={styles.datePickerButton}
                                    onPress={() => {
                                        const newDate = new Date(customStart);
                                        newDate.setDate(newDate.getDate() - 1);
                                        setCustomStart(newDate);
                                    }}
                                >
                                    <Ionicons name="chevron-back" size={20} color={Colors.light.primary} />
                                </TouchableOpacity>
                                <Text style={styles.datePickerValue}>{customStart.toLocaleDateString('es-ES')}</Text>
                                <TouchableOpacity
                                    style={styles.datePickerButton}
                                    onPress={() => {
                                        const newDate = new Date(customStart);
                                        newDate.setDate(newDate.getDate() + 1);
                                        setCustomStart(newDate);
                                    }}
                                >
                                    <Ionicons name="chevron-forward" size={20} color={Colors.light.primary} />
                                </TouchableOpacity>
                            </View>

                            <Text style={[styles.datePickerLabel, { marginTop: 16 }]}>Hasta</Text>
                            <View style={styles.datePickerRow}>
                                <TouchableOpacity
                                    style={styles.datePickerButton}
                                    onPress={() => {
                                        const newDate = new Date(customEnd);
                                        newDate.setDate(newDate.getDate() - 1);
                                        setCustomEnd(newDate);
                                    }}
                                >
                                    <Ionicons name="chevron-back" size={20} color={Colors.light.primary} />
                                </TouchableOpacity>
                                <Text style={styles.datePickerValue}>{customEnd.toLocaleDateString('es-ES')}</Text>
                                <TouchableOpacity
                                    style={styles.datePickerButton}
                                    onPress={() => {
                                        const newDate = new Date(customEnd);
                                        newDate.setDate(newDate.getDate() + 1);
                                        setCustomEnd(newDate);
                                    }}
                                >
                                    <Ionicons name="chevron-forward" size={20} color={Colors.light.primary} />
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity
                                style={styles.applyButton}
                                onPress={applyCustomDates}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.applyButtonText}>Aplicar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.light.background,
    },
    loadingContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: Colors.light.textSecondary,
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
    dateRangeSection: {
        flexDirection: 'row',
        padding: 16,
        backgroundColor: Colors.light.cardBackground,
        gap: 12,
        borderBottomWidth: 1,
        borderBottomColor: Colors.light.border,
    },
    dateInput: {
        flex: 1,
        backgroundColor: Colors.light.background,
        borderRadius: 8,
        padding: 12,
    },
    dateInputLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: Colors.light.textSecondary,
        marginBottom: 6,
        textTransform: 'uppercase',
    },
    dateInputValue: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    dateInputText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.light.text,
    },
    navigation: {
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
    viewToggle: {
        flexDirection: 'row',
        backgroundColor: Colors.light.background,
        borderRadius: 8,
        padding: 4,
        flex: 1,
    },
    toggleButton: {
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 6,
        flex: 1,
        alignItems: 'center',
    },
    toggleActive: {
        backgroundColor: Colors.light.primary,
    },
    toggleText: {
        fontSize: 14,
        color: Colors.light.textSecondary,
        fontWeight: '500',
    },
    toggleTextActive: {
        fontSize: 14,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    content: {
        flex: 1,
    },
    monthIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginHorizontal: 16,
        marginTop: 8,
        marginBottom: 8,
        backgroundColor: Colors.light.cardBackground,
        borderRadius: 12,
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    monthIndicatorText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.light.text,
        textTransform: 'capitalize',
    },
    metricsGrid: {
        padding: 16,
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    metricCardSmall: {
        backgroundColor: Colors.light.cardBackground,
        borderRadius: 12,
        padding: 12,
        borderLeftWidth: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
        width: '48%',
        marginBottom: 12,
    },
    metricHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 6,
    },
    metricLabelSmall: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.light.textSecondary,
    },
    metricValueSmall: {
        fontSize: 26,
        fontWeight: 'bold',
        color: Colors.light.text,
        marginBottom: 2,
    },
    metricSubtextSmall: {
        fontSize: 11,
        color: Colors.light.textSecondary,
        marginBottom: 6,
    },
    progressBar: {
        height: 4,
        backgroundColor: '#F3F4F6',
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 2,
    },
    additionalMetrics: {
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    additionalMetricItem: {
        backgroundColor: Colors.light.cardBackground,
        borderRadius: 12,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    additionalMetricLabel: {
        flex: 1,
        fontSize: 14,
        fontWeight: '500',
        color: Colors.light.text,
    },
    additionalMetricValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.light.primary,
    },
    breakdownSection: {
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    breakdownTitle: {
        fontSize: 17,
        fontWeight: 'bold',
        color: Colors.light.text,
        marginBottom: 12,
    },
    breakdownItem: {
        backgroundColor: Colors.light.cardBackground,
        borderRadius: 8,
        padding: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    breakdownItemToday: {
        backgroundColor: '#EFF6FF',
        borderWidth: 1,
        borderColor: Colors.light.primary,
    },
    breakdownLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    breakdownDay: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.light.text,
        width: 40,
    },
    breakdownDayToday: {
        color: Colors.light.primary,
    },
    breakdownDate: {
        fontSize: 13,
        color: Colors.light.textSecondary,
    },
    breakdownRight: {
        flexDirection: 'row',
        gap: 12,
    },
    breakdownStat: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    breakdownValue: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.light.text,
    },
    breakdownValueSmall: {
        fontSize: 12,
        fontWeight: '500',
        color: Colors.light.textSecondary,
    },
    breakdownNoData: {
        fontSize: 14,
        color: Colors.light.textLight,
    },
    weekBreakdownItem: {
        backgroundColor: Colors.light.cardBackground,
        borderRadius: 12,
        padding: 14,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    weekBreakdownHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    weekBreakdownTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.light.text,
    },
    weekBreakdownDate: {
        fontSize: 12,
        color: Colors.light.textSecondary,
    },
    weekBreakdownStats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 8,
    },
    weekStat: {
        flex: 1,
        alignItems: 'center',
        gap: 4,
    },
    weekStatLabel: {
        fontSize: 11,
        color: Colors.light.textSecondary,
    },
    weekStatValue: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.light.text,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    datePickerModal: {
        backgroundColor: Colors.light.cardBackground,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 40,
    },
    datePickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: Colors.light.border,
    },
    datePickerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.light.text,
    },
    datePickerContent: {
        padding: 20,
    },
    datePickerLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.light.textSecondary,
        marginBottom: 8,
    },
    datePickerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: Colors.light.background,
        borderRadius: 12,
        padding: 12,
    },
    datePickerButton: {
        padding: 8,
    },
    datePickerValue: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.light.text,
        flex: 1,
        textAlign: 'center',
    },
    applyButton: {
        backgroundColor: Colors.light.primary,
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginTop: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 4,
    },
    applyButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
});
