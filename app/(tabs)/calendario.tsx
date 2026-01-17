import { Colors } from '@/constants/Colors';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function CalendarioScreen() {
    const [selectedWeek, setSelectedWeek] = useState(getCurrentWeek());
    const [selectedMonth, setSelectedMonth] = useState(new Date());
    const [viewMode, setViewMode] = useState<'week' | 'month'>('week');

    // Obtener la semana actual
    function getCurrentWeek() {
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Lunes
        return startOfWeek;
    }

    // Navegar entre semanas/meses
    const navigate = (direction: 'prev' | 'next') => {
        if (viewMode === 'week') {
            const newWeek = new Date(selectedWeek);
            newWeek.setDate(selectedWeek.getDate() + (direction === 'next' ? 7 : -7));
            setSelectedWeek(newWeek);
        } else {
            const newMonth = new Date(selectedMonth);
            newMonth.setMonth(selectedMonth.getMonth() + (direction === 'next' ? 1 : -1));
            setSelectedMonth(newMonth);
        }
    };

    // Generar días de la semana
    const getWeekDays = () => {
        const days = [];
        const weekStart = new Date(selectedWeek);

        for (let i = 0; i < 7; i++) {
            const date = new Date(weekStart);
            date.setDate(weekStart.getDate() + i);
            days.push(date);
        }
        return days;
    };

    // Generar días del mes en formato calendario
    const getMonthDays = () => {
        const year = selectedMonth.getFullYear();
        const month = selectedMonth.getMonth();

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        const startDay = firstDay.getDay(); // 0 = Domingo
        const daysInMonth = lastDay.getDate();

        const days = [];

        // Días del mes anterior para completar la primera semana
        const prevMonthDays = startDay === 0 ? 6 : startDay - 1;
        for (let i = prevMonthDays; i > 0; i--) {
            const date = new Date(year, month, -i + 1);
            days.push({ date, isCurrentMonth: false });
        }

        // Días del mes actual
        for (let i = 1; i <= daysInMonth; i++) {
            const date = new Date(year, month, i);
            days.push({ date, isCurrentMonth: true });
        }

        // Días del siguiente mes para completar la última semana
        const remainingDays = 42 - days.length; // 6 semanas * 7 días
        for (let i = 1; i <= remainingDays; i++) {
            const date = new Date(year, month + 1, i);
            days.push({ date, isCurrentMonth: false });
        }

        return days;
    };

    // Formatear fecha del header
    const formatRange = () => {
        if (viewMode === 'week') {
            const weekDays = getWeekDays();
            const start = weekDays[0];
            const end = weekDays[6];

            const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun',
                'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

            return `${start.getDate()} ${months[start.getMonth()]} - ${end.getDate()} ${months[end.getMonth()]} ${end.getFullYear()}`;
        } else {
            const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
            return `${months[selectedMonth.getMonth()]} ${selectedMonth.getFullYear()}`;
        }
    };

    // Datos de ejemplo (esto vendría del backend)
    const workedHours: { [key: string]: { hours: string; minutes: string } } = {
        '2026-01-13': { hours: '0h', minutes: '0m' },
        '2026-01-14': { hours: '0h', minutes: '0m' },
        '2026-01-15': { hours: '0h', minutes: '0m' },
        '2026-01-16': { hours: '0h', minutes: '0m' },
        '2026-01-17': { hours: '5h', minutes: '30m' },
        '2026-01-18': { hours: '0h', minutes: '0m' },
        '2026-01-19': { hours: '0h', minutes: '0m' },
        '2026-01-20': { hours: '8h', minutes: '15m' },
        '2026-01-21': { hours: '7h', minutes: '45m' },
        '2026-01-22': { hours: '8h', minutes: '0m' },
    };

    const formatDateKey = (date: Date) => {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const isToday = (date: Date) => {
        const today = new Date();
        return date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();
    };

    const getHoursForDate = (date: Date) => {
        const key = formatDateKey(date);
        return workedHours[key];
    };

    const weekDays = getWeekDays();
    const monthDays = getMonthDays();
    const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    const shortDayNames = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Calendario</Text>
            </View>

            {/* Navegación */}
            <View style={styles.weekNavigation}>
                <TouchableOpacity
                    style={styles.navButton}
                    onPress={() => navigate('prev')}
                    activeOpacity={0.7}
                >
                    <Text style={styles.navButtonText}>←</Text>
                </TouchableOpacity>

                <View style={styles.weekInfo}>
                    <Text style={styles.weekText}>{formatRange()}</Text>
                    <View style={styles.viewToggle}>
                        <TouchableOpacity
                            style={[styles.toggleButton, viewMode === 'week' && styles.toggleActive]}
                            onPress={() => setViewMode('week')}
                            activeOpacity={0.7}
                        >
                            <Text style={viewMode === 'week' ? styles.toggleTextActive : styles.toggleText}>Semana</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.toggleButton, viewMode === 'month' && styles.toggleActive]}
                            onPress={() => setViewMode('month')}
                            activeOpacity={0.7}
                        >
                            <Text style={viewMode === 'month' ? styles.toggleTextActive : styles.toggleText}>Mes</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.navButton}
                    onPress={() => navigate('next')}
                    activeOpacity={0.7}
                >
                    <Text style={styles.navButtonText}>→</Text>
                </TouchableOpacity>
            </View>

            {/* Vista de Semana (Tabla) */}
            {viewMode === 'week' && (
                <ScrollView style={styles.tableContainer}>
                    <View style={styles.table}>
                        <View style={styles.tableHeader}>
                            <View style={[styles.tableHeaderCell, { flex: 1.2 }]}>
                                <Text style={styles.tableHeaderText}>Día</Text>
                            </View>
                            <View style={[styles.tableHeaderCell, { flex: 1.5 }]}>
                                <Text style={styles.tableHeaderText}>Fecha</Text>
                            </View>
                            <View style={styles.tableHeaderCell}>
                                <Text style={styles.tableHeaderText}>Horas</Text>
                            </View>
                        </View>

                        {weekDays.map((day, index) => {
                            const dateKey = formatDateKey(day);
                            const hours = workedHours[dateKey] || { hours: '—', minutes: '' };
                            const isCurrentDay = isToday(day);

                            return (
                                <View key={index} style={[styles.tableRow, isCurrentDay && styles.tableRowToday]}>
                                    <View style={[styles.tableCell, { flex: 1.2 }]}>
                                        <Text style={[styles.tableCellText, isCurrentDay && styles.tableCellTextToday]}>
                                            {dayNames[index]}
                                        </Text>
                                    </View>
                                    <View style={[styles.tableCell, { flex: 1.5 }]}>
                                        <Text style={styles.tableCellText}>
                                            {day.getDate()}/{(day.getMonth() + 1).toString().padStart(2, '0')}/{day.getFullYear()}
                                        </Text>
                                    </View>
                                    <View style={styles.tableCell}>
                                        <Text style={[styles.tableCellText, hours.hours !== '0h' && hours.hours !== '—' && styles.tableCellTextBold]}>
                                            {hours.hours !== '—' ? `${hours.hours} ${hours.minutes}` : '—'}
                                        </Text>
                                    </View>
                                </View>
                            );
                        })}

                        <View style={styles.tableTotalRow}>
                            <View style={[styles.tableCell, { flex: 1.2 }]}>
                                <Text style={styles.tableTotalText}>TOTAL</Text>
                            </View>
                            <View style={[styles.tableCell, { flex: 1.5 }]} />
                            <View style={styles.tableCell}>
                                <Text style={styles.tableTotalValue}>05:30</Text>
                            </View>
                        </View>
                    </View>
                </ScrollView>
            )}

            {/* Vista de Mes (Calendario Grid) */}
            {viewMode === 'month' && (
                <ScrollView style={styles.calendarContainer}>
                    <View style={styles.calendar}>
                        {/* Headers de días */}
                        <View style={styles.calendarHeader}>
                            {shortDayNames.map((day, index) => (
                                <View key={index} style={styles.calendarHeaderDay}>
                                    <Text style={styles.calendarHeaderDayText}>{day}</Text>
                                </View>
                            ))}
                        </View>

                        {/* Grid de días */}
                        <View style={styles.calendarGrid}>
                            {monthDays.map((dayInfo, index) => {
                                const hours = getHoursForDate(dayInfo.date);
                                const isCurrentDay = isToday(dayInfo.date);
                                const hasHours = hours && hours.hours !== '0h';

                                return (
                                    <TouchableOpacity
                                        key={index}
                                        style={[
                                            styles.calendarDay,
                                            !dayInfo.isCurrentMonth && styles.calendarDayOtherMonth,
                                            isCurrentDay && styles.calendarDayToday,
                                        ]}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[
                                            styles.calendarDayNumber,
                                            !dayInfo.isCurrentMonth && styles.calendarDayNumberOther,
                                            isCurrentDay && styles.calendarDayNumberToday,
                                        ]}>
                                            {dayInfo.date.getDate()}
                                        </Text>
                                        {hasHours && dayInfo.isCurrentMonth && (
                                            <Text style={styles.calendarDayHours}>
                                                {hours.hours}
                                            </Text>
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Total mensual */}
                        <View style={styles.monthTotal}>
                            <Text style={styles.monthTotalLabel}>TOTAL DEL MES</Text>
                            <Text style={styles.monthTotalValue}>29:30</Text>
                        </View>
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
        fontSize: 32,
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
        marginBottom: 8,
    },
    viewToggle: {
        flexDirection: 'row',
        backgroundColor: Colors.light.background,
        borderRadius: 8,
        padding: 4,
    },
    toggleButton: {
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 6,
    },
    toggleActive: {
        backgroundColor: Colors.light.primary,
    },
    toggleText: {
        fontSize: 15,
        color: Colors.light.textSecondary,
        fontWeight: '500',
    },
    toggleTextActive: {
        fontSize: 15,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    // Vista Semana
    tableContainer: {
        flex: 1,
    },
    table: {
        margin: 16,
        backgroundColor: Colors.light.cardBackground,
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#F9FAFB',
        borderBottomWidth: 1,
        borderBottomColor: Colors.light.border,
        paddingVertical: 12,
    },
    tableHeaderCell: {
        flex: 1,
        paddingHorizontal: 8,
    },
    tableHeaderText: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.light.text,
        textAlign: 'center',
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: Colors.light.borderLight,
        paddingVertical: 16,
    },
    tableRowToday: {
        backgroundColor: '#EFF6FF',
    },
    tableCell: {
        flex: 1,
        paddingHorizontal: 8,
        justifyContent: 'center',
    },
    tableCellText: {
        fontSize: 15,
        color: Colors.light.text,
        textAlign: 'center',
    },
    tableCellTextToday: {
        color: Colors.light.primary,
        fontWeight: '600',
    },
    tableCellTextBold: {
        fontWeight: '600',
        color: Colors.light.primary,
    },
    tableTotalRow: {
        flexDirection: 'row',
        backgroundColor: '#F9FAFB',
        borderTopWidth: 2,
        borderTopColor: Colors.light.border,
        paddingVertical: 16,
    },
    tableTotalText: {
        fontSize: 19,
        fontWeight: 'bold',
        color: Colors.light.text,
        textAlign: 'center',
    },
    tableTotalValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.light.primary,
        textAlign: 'center',
    },
    // Vista Mes
    calendarContainer: {
        flex: 1,
    },
    calendar: {
        margin: 16,
        backgroundColor: Colors.light.cardBackground,
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
        padding: 12,
    },
    calendarHeader: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    calendarHeaderDay: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 8,
    },
    calendarHeaderDayText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.light.textSecondary,
    },
    calendarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    calendarDay: {
        width: '14.28%',
        aspectRatio: 1,
        padding: 4,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: Colors.light.borderLight,
    },
    calendarDayOtherMonth: {
        backgroundColor: '#FAFAFA',
    },
    calendarDayToday: {
        backgroundColor: Colors.light.primary,
        borderColor: Colors.light.primary,
    },
    calendarDayNumber: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.light.text,
        marginBottom: 2,
    },
    calendarDayNumberOther: {
        color: Colors.light.textLight,
    },
    calendarDayNumberToday: {
        color: '#FFFFFF',
    },
    calendarDayHours: {
        fontSize: 10,
        color: Colors.light.primary,
        fontWeight: '600',
    },
    monthTotal: {
        marginTop: 16,
        padding: 16,
        backgroundColor: '#F9FAFB',
        borderRadius: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    monthTotalLabel: {
        fontSize: 17,
        fontWeight: 'bold',
        color: Colors.light.text,
    },
    monthTotalValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.light.primary,
    },
});
