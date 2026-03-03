import { Colors } from '@/constants/Colors';
import type { ClockEntry } from '@/lib/supabase';
import type { RequestWithUser, WorkSummary } from '@/services/admin.service';
import { adminService } from '@/services/admin.service';
import { scheduleService } from '@/services/schedule.service';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

type TabType = 'requests' | 'entries' | 'notifications' | 'schedules';

export default function AdminScreen() {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<TabType>('requests');
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(false);

    // Requests tab
    const [requests, setRequests] = useState<RequestWithUser[]>([]);
    const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([]);
    const [reviewNotesModalVisible, setReviewNotesModalVisible] = useState(false);
    const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);
    const [reviewNotes, setReviewNotes] = useState('');
    const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve');

    // Entries tab
    const [users, setUsers] = useState<any[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [entries, setEntries] = useState<ClockEntry[]>([]);
    const [workSummary, setWorkSummary] = useState<WorkSummary | null>(null);
    const [dateRange, setDateRange] = useState<'week' | 'month' | 'custom'>('week');
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    // Notifications tab
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
    const [notificationMessage, setNotificationMessage] = useState('');

    // Schedules tab
    const [scheduleGroup, setScheduleGroup] = useState<'cocina' | 'resto' | 'all'>('all');
    const [scheduleEmployees, setScheduleEmployees] = useState<any[]>([]);
    const [weekSchedules, setWeekSchedules] = useState<any[]>([]);
    const [currentWeekStart, setCurrentWeekStart] = useState(getWeekStart(new Date()));

    // Schedule editor modal
    const [showScheduleEditor, setShowScheduleEditor] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
    const [selectedScheduleDate, setSelectedScheduleDate] = useState<string | null>(null);
    const [editingSchedules, setEditingSchedules] = useState<any[]>([]);

    function getWeekStart(date: Date): Date {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(d.setDate(diff));
    }

    // Load data when screen is focused
    useFocusEffect(
        useCallback(() => {
            loadInitialData();
        }, [activeTab])
    );

    // Reload schedule data when week or group changes
    useEffect(() => {
        if (activeTab === 'schedules') {
            loadScheduleData();
        }
    }, [currentWeekStart, scheduleGroup]);

    const loadInitialData = async () => {
        if (activeTab === 'requests') {
            await loadRequests();
        } else if (activeTab === 'entries') {
            await loadUsers();
        } else if (activeTab === 'notifications') {
            await loadUsers();
        } else if (activeTab === 'schedules') {
            await loadScheduleData();
        }
    };

    const loadScheduleData = async () => {
        setIsFetching(true);
        try {
            // Load employees based on selected group
            let empResult;
            if (scheduleGroup === 'all') {
                empResult = await scheduleService.getAllEmployees();
            } else {
                empResult = await scheduleService.getEmployeesByGroup(scheduleGroup);
            }

            if (empResult.success && empResult.employees) {
                setScheduleEmployees(empResult.employees);
            }

            // Load schedules for current week
            const endDate = new Date(currentWeekStart);
            endDate.setDate(currentWeekStart.getDate() + 6);

            const startDateStr = currentWeekStart.toISOString().split('T')[0];
            const endDateStr = endDate.toISOString().split('T')[0];

            const schedResult = await scheduleService.getWeekSchedules(
                startDateStr,
                endDateStr
            );

            if (schedResult.success && schedResult.schedules) {
                setWeekSchedules(schedResult.schedules);
            }
        } catch (error) {
            console.error('Error loading schedule data:', error);
        } finally {
            setIsFetching(false);
        }
    };

    const loadRequests = async () => {
        setIsFetching(true);
        try {
            const result = await adminService.getAllPendingRequests();
            if (result.success && result.requests) {
                setRequests(result.requests);
            } else {
                Alert.alert(t('common.error'), result.error || t('errors.loadFailed'));
            }
        } catch (error) {
            console.error('Error loading requests:', error);
        } finally {
            setIsFetching(false);
        }
    };

    const loadUsers = async () => {
        setIsFetching(true);
        try {
            const result = await adminService.getAllUsers();
            if (result.success && result.users) {
                setUsers(result.users);
            } else {
                Alert.alert(t('common.error'), result.error || t('errors.loadFailed'));
            }
        } catch (error) {
            console.error('Error loading users:', error);
        } finally {
            setIsFetching(false);
        }
    };

    const loadUserEntries = async (userId: string) => {
        setIsLoading(true);
        try {
            const now = new Date();
            let fromDate: Date;
            let toDate = new Date();

            if (dateRange === 'week') {
                fromDate = new Date(now);
                fromDate.setDate(now.getDate() - 7);
            } else { // month
                fromDate = new Date(now);
                fromDate.setMonth(now.getMonth() - 1);
            }

            const [entriesResult, summaryResult] = await Promise.all([
                adminService.getUserClockEntries(userId, fromDate, toDate),
                adminService.getUserWorkSummary(userId, fromDate, toDate)
            ]);

            if (entriesResult.success && entriesResult.entries) {
                setEntries(entriesResult.entries);
            }

            if (summaryResult.success && summaryResult.summary) {
                setWorkSummary(summaryResult.summary);
            }
        } catch (error) {
            console.error('Error loading user entries:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleApproveRequest = (requestId: string) => {
        setCurrentRequestId(requestId);
        setReviewAction('approve');
        setReviewNotesModalVisible(true);
    };

    const handleRejectRequest = (requestId: string) => {
        setCurrentRequestId(requestId);
        setReviewAction('reject');
        setReviewNotesModalVisible(true);
    };

    const submitReview = async () => {
        if (!currentRequestId) return;

        setIsLoading(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            const result = reviewAction === 'approve'
                ? await adminService.approveRequest(currentRequestId, reviewNotes.trim())
                : await adminService.rejectRequest(currentRequestId, reviewNotes.trim());

            if (result.success) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setReviewNotesModalVisible(false);
                setReviewNotes('');
                setCurrentRequestId(null);
                await loadRequests();
                Alert.alert(
                    t('common.success'),
                    reviewAction === 'approve' ? t('admin.requestsApproved') : t('admin.requestsRejected')
                );
            } else {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                Alert.alert(t('common.error'), result.error || t('errors.saveFailed'));
            }
        } catch (error) {
            console.error('Error submitting review:', error);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert(t('common.error'), t('errors.saveFailed'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleBulkApprove = async () => {
        if (selectedRequestIds.length === 0) return;

        Alert.alert(
            t('admin.confirmBulkApprove', { count: selectedRequestIds.length }),
            '',
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('admin.approve'),
                    onPress: async () => {
                        setIsLoading(true);
                        const result = await adminService.bulkApproveRequests(selectedRequestIds);
                        if (result.success) {
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            setSelectedRequestIds([]);
                            await loadRequests();
                            Alert.alert(t('common.success'), t('admin.requestsApproved'));
                        } else {
                            Alert.alert(t('common.error'), result.error || t('errors.saveFailed'));
                        }
                        setIsLoading(false);
                    }
                }
            ]
        );
    };

    const toggleRequestSelection = (requestId: string) => {
        if (selectedRequestIds.includes(requestId)) {
            setSelectedRequestIds(selectedRequestIds.filter(id => id !== requestId));
        } else {
            setSelectedRequestIds([...selectedRequestIds, requestId]);
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const formatDateTime = (dateStr: string): string => {
        const date = new Date(dateStr);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${day}/${month}/${year} ${hours}:${minutes}`;
    };

    const formatTime = (dateStr: string): string => {
        const date = new Date(dateStr);
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    };

    const renderTabBar = () => (
        <View style={styles.tabBar}>
            <TouchableOpacity
                style={[styles.tab, activeTab === 'requests' && styles.tabActive]}
                onPress={() => setActiveTab('requests')}
            >
                <Text style={[styles.tabText, activeTab === 'requests' && styles.tabTextActive]}>
                    {t('admin.requests')}
                </Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.tab, activeTab === 'entries' && styles.tabActive]}
                onPress={() => setActiveTab('entries')}
            >
                <Text style={[styles.tabText, activeTab === 'entries' && styles.tabTextActive]}>
                    {t('admin.entries')}
                </Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.tab, activeTab === 'notifications' && styles.tabActive]}
                onPress={() => setActiveTab('notifications')}
            >
                <Text style={[styles.tabText, activeTab === 'notifications' && styles.tabTextActive]}>
                    {t('admin.notifications')}
                </Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.tab, activeTab === 'schedules' && styles.tabActive]}
                onPress={() => setActiveTab('schedules')}
            >
                <Text style={[styles.tabText, activeTab === 'schedules' && styles.tabTextActive]}>
                    {t('horarios.title')}
                </Text>
            </TouchableOpacity>
        </View>
    );

    const renderRequestsTab = () => (
        <View style={styles.tabContent}>
            {selectedRequestIds.length > 0 && (
                <View style={styles.selectionActions}>
                    <Text style={styles.selectionText}>
                        {t('solicitudes.selected', { count: selectedRequestIds.length })}
                    </Text>
                    <TouchableOpacity onPress={handleBulkApprove} style={styles.bulkButton}>
                        <Text style={styles.bulkButtonText}>{t('admin.approveSelected')}</Text>
                    </TouchableOpacity>
                </View>
            )}

            <ScrollView style={styles.scrollContent}>
                {isFetching ? (
                    <ActivityIndicator size="large" color={Colors.light.primary} style={{ marginTop: 20 }} />
                ) : requests.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>{t('admin.noRequests')}</Text>
                    </View>
                ) : (
                    requests.map((request) => (
                        <TouchableOpacity
                            key={request.id}
                            style={[
                                styles.requestCard,
                                selectedRequestIds.includes(request.id) && styles.cardSelected
                            ]}
                            onPress={() => toggleRequestSelection(request.id)}
                            onLongPress={() => toggleRequestSelection(request.id)}
                        >
                            <View style={styles.requestHeader}>
                                <View>
                                    <Text style={styles.requestUser}>{request.user_name}</Text>
                                    {request.user_department && (
                                        <Text style={styles.requestDepartment}>{request.user_department}</Text>
                                    )}
                                </View>
                                <Text style={styles.requestType}>{request.entry_type}</Text>
                            </View>
                            <Text style={styles.requestDateTime}>{formatDateTime(request.requested_datetime)}</Text>
                            <Text style={styles.requestReason}>{request.reason}</Text>
                            <View style={styles.requestActions}>
                                <TouchableOpacity
                                    style={[styles.actionButton, styles.approveButton]}
                                    onPress={() => handleApproveRequest(request.id)}
                                >
                                    <Text style={styles.actionButtonText}>{t('admin.approve')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.actionButton, styles.rejectButton]}
                                    onPress={() => handleRejectRequest(request.id)}
                                >
                                    <Text style={styles.actionButtonText}>{t('admin.reject')}</Text>
                                </TouchableOpacity>
                            </View>
                        </TouchableOpacity>
                    ))
                )}
            </ScrollView>
        </View>
    );

    const renderEntriesTab = () => {
        // Group entries by date
        const groupedEntries: { [key: string]: ClockEntry[] } = {};
        entries.forEach(entry => {
            const dateKey = new Date(entry.clock_time).toISOString().split('T')[0];
            if (!groupedEntries[dateKey]) {
                groupedEntries[dateKey] = [];
            }
            groupedEntries[dateKey].push(entry);
        });

        // Get calendar days based on date range
        const getCalendarDays = () => {
            const now = new Date();
            const days: Date[] = [];

            if (dateRange === 'week') {
                // Get current week (7 days)
                for (let i = 6; i >= 0; i--) {
                    const day = new Date(now);
                    day.setDate(now.getDate() - i);
                    days.push(day);
                }
            } else {
                // Get current month
                const year = now.getFullYear();
                const month = now.getMonth();
                const firstDay = new Date(year, month, 1);
                const lastDay = new Date(year, month + 1, 0);

                for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
                    days.push(new Date(d));
                }
            }

            return days;
        };

        const calendarDays = getCalendarDays();

        const getDayEntries = (dateKey: string) => {
            return groupedEntries[dateKey] || [];
        };

        const hasEntries = (dateKey: string) => {
            return groupedEntries[dateKey] && groupedEntries[dateKey].length > 0;
        };

        const calculateDayHours = (dateKey: string) => {
            const dayEntries = getDayEntries(dateKey);
            if (dayEntries.length === 0) return 0;

            const sortedEntries = [...dayEntries].sort((a, b) =>
                new Date(a.clock_time).getTime() - new Date(b.clock_time).getTime()
            );

            let totalMinutes = 0;
            const entradas = sortedEntries.filter(e => e.entry_type === 'ENTRADA' || e.entry_type === 'ENTRADA_2');
            const salidas = sortedEntries.filter(e => e.entry_type === 'SALIDA' || e.entry_type === 'SALIDA_2');
            const pairs = Math.min(entradas.length, salidas.length);

            for (let i = 0; i < pairs; i++) {
                const entradaTime = new Date(entradas[i].clock_time).getTime();
                const salidaTime = new Date(salidas[i].clock_time).getTime();
                totalMinutes += (salidaTime - entradaTime) / (1000 * 60);
            }

            return Math.floor(totalMinutes / 60);
        };

        const sortedDates = Object.keys(groupedEntries).sort((a, b) =>
            new Date(b).getTime() - new Date(a).getTime()
        );

        return (
            <View style={styles.tabContent}>
                {/* User Selector */}
                <View style={styles.userSelectorContainer}>
                    <Text style={styles.sectionLabel}>{t('admin.selectUser')}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.userChipContainer}>
                        {users.map((user) => (
                            <TouchableOpacity
                                key={user.id}
                                style={[
                                    styles.userChip,
                                    selectedUserId === user.id && styles.userChipSelected
                                ]}
                                onPress={() => {
                                    setSelectedUserId(user.id);
                                    setSelectedDate(null);
                                    loadUserEntries(user.id);
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                }}
                            >
                                <Text style={[
                                    styles.userChipText,
                                    selectedUserId === user.id && styles.userChipTextSelected
                                ]}>
                                    {user.full_name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {selectedUserId ? (
                    <>
                        {/* Date Range Selector */}
                        <View style={styles.dateRangeContainer}>
                            <TouchableOpacity
                                style={[styles.dateRangeChip, dateRange === 'week' && styles.dateRangeChipActive]}
                                onPress={() => {
                                    setDateRange('week');
                                    setSelectedDate(null);
                                    loadUserEntries(selectedUserId);
                                }}
                            >
                                <Text style={[styles.dateRangeText, dateRange === 'week' && styles.dateRangeTextActive]}>
                                    {t('admin.thisWeek')}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.dateRangeChip, dateRange === 'month' && styles.dateRangeChipActive]}
                                onPress={() => {
                                    setDateRange('month');
                                    setSelectedDate(null);
                                    loadUserEntries(selectedUserId);
                                }}
                            >
                                <Text style={[styles.dateRangeText, dateRange === 'month' && styles.dateRangeTextActive]}>
                                    {t('admin.thisMonth')}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
                            {isLoading ? (
                                <View style={styles.loadingContainer}>
                                    <ActivityIndicator size="large" color={Colors.light.primary} />
                                    <Text style={styles.loadingText}>{t('admin.loadingEntries')}</Text>
                                </View>
                            ) : (
                                <>
                                    {/* Statistics Cards */}
                                    {workSummary && (
                                        <View style={styles.statsContainer}>
                                            <View style={[styles.statCard, styles.statCardPrimary]}>
                                                <Text style={styles.statIcon}>⏱️</Text>
                                                <View style={styles.statContent}>
                                                    <Text style={styles.statLabel}>{t('admin.totalHours')}</Text>
                                                    <Text style={styles.statValue}>{workSummary.formatted_total}</Text>
                                                </View>
                                            </View>

                                            <View style={[styles.statCard, styles.statCardSuccess]}>
                                                <Text style={styles.statIcon}>✅</Text>
                                                <View style={styles.statContent}>
                                                    <Text style={styles.statLabel}>{t('admin.netHours')}</Text>
                                                    <Text style={styles.statValue}>{workSummary.formatted_net}</Text>
                                                </View>
                                            </View>

                                            <View style={[styles.statCard, styles.statCardWarning]}>
                                                <Text style={styles.statIcon}>☕</Text>
                                                <View style={styles.statContent}>
                                                    <Text style={styles.statLabel}>{t('admin.breakTime')}</Text>
                                                    <Text style={styles.statValue}>{workSummary.break_minutes}min</Text>
                                                </View>
                                            </View>

                                            <View style={[styles.statCard, styles.statCardInfo]}>
                                                <Text style={styles.statIcon}>📊</Text>
                                                <View style={styles.statContent}>
                                                    <Text style={styles.statLabel}>{t('admin.entriesCount')}</Text>
                                                    <Text style={styles.statValue}>{workSummary.entries_count}</Text>
                                                </View>
                                            </View>
                                        </View>
                                    )}

                                    {/* Calendar View */}
                                    {entries.length === 0 ? (
                                        <View style={styles.emptyEntriesContainer}>
                                            <Text style={styles.emptyEntriesIcon}>📅</Text>
                                            <Text style={styles.emptyEntriesText}>{t('admin.noEntries')}</Text>
                                            <Text style={styles.emptyEntriesSubtext}>
                                                {dateRange === 'week' ? 'Esta semana' : 'Este mes'}
                                            </Text>
                                        </View>
                                    ) : (
                                        <>
                                            {/* Calendar Container */}
                                            <View style={styles.calendarWrapper}>
                                                {/* Week day headers */}
                                                <View style={styles.weekDaysHeader}>
                                                    {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day, index) => (
                                                        <View key={index} style={styles.weekDayLabel}>
                                                            <Text style={styles.calendarHeaderDayText}>{day}</Text>
                                                        </View>
                                                    ))}
                                                </View>

                                                {/* Calendar Grid */}
                                                <View style={dateRange === 'week' ? styles.calendarWeekGrid : styles.calendarMonthGrid}>
                                                    {calendarDays.map((day) => {
                                                        const dateKey = day.toISOString().split('T')[0];
                                                        const dayHasEntries = hasEntries(dateKey);
                                                        const dayHours = calculateDayHours(dateKey);
                                                        const isCurrentDay = dateKey === new Date().toISOString().split('T')[0];
                                                        const isSelected = selectedDate === dateKey;
                                                        const dayOfMonth = day.getDate();

                                                        return (
                                                            <TouchableOpacity
                                                                key={dateKey}
                                                                style={[
                                                                    styles.calendarDay,
                                                                    isCurrentDay && styles.calendarDayToday,
                                                                    dayHasEntries && styles.calendarDayWithEntries,
                                                                    isSelected && styles.calendarDaySelected,
                                                                ]}
                                                                onPress={() => {
                                                                    if (dayHasEntries) {
                                                                        setSelectedDate(isSelected ? null : dateKey);
                                                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                                    }
                                                                }}
                                                                disabled={!dayHasEntries}
                                                                activeOpacity={0.7}
                                                            >
                                                                <Text style={[
                                                                    styles.calendarDayNumber,
                                                                    isCurrentDay && styles.calendarDayNumberToday,
                                                                    dayHasEntries && styles.calendarDayNumberWithEntries,
                                                                    isSelected && styles.calendarDayNumberSelected,
                                                                    !dayHasEntries && styles.calendarDayNumberEmpty,
                                                                ]}>
                                                                    {dayOfMonth}
                                                                </Text>
                                                                {dayHasEntries && dayHours > 0 && (
                                                                    <Text style={[
                                                                        styles.calendarDayHours,
                                                                        isCurrentDay && styles.calendarDayHoursToday
                                                                    ]}>
                                                                        {dayHours}h
                                                                    </Text>
                                                                )}
                                                            </TouchableOpacity>
                                                        );
                                                    })}
                                                </View>
                                            </View>

                                            {/* Selected Day Entries */}
                                            {selectedDate && (
                                                <View style={styles.selectedDayContainer}>
                                                    <View style={styles.selectedDayHeader}>
                                                        <Text style={styles.selectedDayTitle}>
                                                            {new Date(selectedDate).toLocaleDateString('es-ES', {
                                                                weekday: 'long',
                                                                day: 'numeric',
                                                                month: 'long'
                                                            })}
                                                        </Text>
                                                        <TouchableOpacity onPress={() => setSelectedDate(null)}>
                                                            <Text style={styles.selectedDayClose}>✕</Text>
                                                        </TouchableOpacity>
                                                    </View>
                                                    {getDayEntries(selectedDate)
                                                        .sort((a, b) => new Date(a.clock_time).getTime() - new Date(b.clock_time).getTime())
                                                        .map((entry) => {
                                                            const isEntry = entry.entry_type.includes('ENTRADA');
                                                            const isBreak = entry.entry_type === 'DESCANSO';

                                                            return (
                                                                <View key={entry.id} style={styles.entryItem}>
                                                                    <View style={[
                                                                        styles.entryDot,
                                                                        isEntry ? styles.entryDotGreen :
                                                                            isBreak ? styles.entryDotOrange :
                                                                                styles.entryDotRed
                                                                    ]} />
                                                                    <View style={styles.entryDetails}>
                                                                        <Text style={styles.entryTypeText}>
                                                                            {entry.entry_type}
                                                                        </Text>
                                                                        <Text style={styles.entryTimeText}>
                                                                            {formatTime(entry.clock_time)}
                                                                        </Text>
                                                                    </View>
                                                                    {entry.is_manual && (
                                                                        <View style={styles.manualBadge}>
                                                                            <Text style={styles.manualBadgeText}>Manual</Text>
                                                                        </View>
                                                                    )}
                                                                </View>
                                                            );
                                                        })}
                                                </View>
                                            )}
                                        </>
                                    )}
                                </>
                            )}
                        </ScrollView>
                    </>
                ) : (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateIcon}>👤</Text>
                        <Text style={styles.emptyText}>{t('admin.userNotSelected')}</Text>
                        <Text style={styles.emptySubtext}>Selecciona un usuario para ver sus fichajes</Text>
                    </View>
                )}
            </View>
        );
    };

    const renderNotificationsTab = () => (
        <View style={styles.tabContent}>
            <Text style={styles.sectionLabel}>{t('admin.selectRecipients')}</Text>
            <ScrollView style={styles.scrollContent}>
                <View style={styles.notificationContainer}>
                    <TouchableOpacity
                        style={[
                            styles.recipientOption,
                            selectedUserIds.length === users.length && styles.recipientSelected
                        ]}
                        onPress={() => {
                            if (selectedUserIds.length === users.length) {
                                setSelectedUserIds([]);
                            } else {
                                setSelectedUserIds(users.map(u => u.id));
                            }
                        }}
                    >
                        <Text style={styles.recipientText}>{t('admin.allUsers')}</Text>
                    </TouchableOpacity>

                    {users.map((user) => (
                        <TouchableOpacity
                            key={user.id}
                            style={[
                                styles.recipientOption,
                                selectedUserIds.includes(user.id) && styles.recipientSelected
                            ]}
                            onPress={() => {
                                if (selectedUserIds.includes(user.id)) {
                                    setSelectedUserIds(selectedUserIds.filter(id => id !== user.id));
                                } else {
                                    setSelectedUserIds([...selectedUserIds, user.id]);
                                }
                            }}
                        >
                            <Text style={styles.recipientText}>{user.full_name}</Text>
                        </TouchableOpacity>
                    ))}

                    <Text style={styles.sectionLabel}>{t('admin.message')}</Text>
                    <TextInput
                        style={styles.messageInput}
                        value={notificationMessage}
                        onChangeText={setNotificationMessage}
                        placeholder={t('admin.message')}
                        multiline
                        numberOfLines={4}
                    />

                    <TouchableOpacity
                        style={styles.sendButton}
                        onPress={() => {
                            Alert.alert(
                                t('common.success'),
                                t('admin.notificationSent') + '\\n(Funcionalidad básica - requiere integración con servicio de notificaciones)'
                            );
                        }}
                        disabled={selectedUserIds.length === 0 || !notificationMessage.trim()}
                    >
                        <Text style={styles.sendButtonText}>{t('admin.sendNotification')}</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );

    // Helper functions for schedule grid
    const getWeekDays = (startDate: Date): Date[] => {
        const days = [];
        for (let i = 0; i < 7; i++) {
            const day = new Date(startDate);
            day.setDate(startDate.getDate() + i);
            days.push(day);
        }
        return days;
    };

    const formatDateShort = (date: Date): string => {
        const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        return `${days[date.getDay()]} ${date.getDate()}/${date.getMonth() + 1}`;
    };

    const getSchedulesForEmployeeAndDate = (
        userId: string,
        date: string,
        schedules: any[]
    ): any[] => {
        return schedules.filter(s => s.user_id === userId && s.date === date);
    };

    // Schedule Editor Modal Functions
    const handleAddShift = () => {
        setEditingSchedules([...editingSchedules, {
            id: `temp_${Date.now()}`,
            start_time: '09:00',
            end_time: '17:00',
            is_new: true
        }]);
    };

    const handleDeleteShift = async (scheduleId: string) => {
        if (scheduleId.startsWith('temp_')) {
            setEditingSchedules(editingSchedules.filter(s => s.id !== scheduleId));
        } else {
            const result = await scheduleService.deleteScheduleById(scheduleId);
            if (result.success) {
                setEditingSchedules(editingSchedules.filter(s => s.id !== scheduleId));
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } else {
                Alert.alert('Error', 'No se pudo eliminar el turno');
            }
        }
    };

    const handleSaveSchedules = async () => {
        if (!selectedEmployee || !selectedScheduleDate) return;

        try {
            for (const schedule of editingSchedules) {
                if (schedule.is_new || schedule.id.startsWith('temp_')) {
                    const scheduleData = {
                        user_id: selectedEmployee.id,
                        date: selectedScheduleDate,
                        start_time: schedule.start_time,
                        end_time: schedule.end_time,
                        schedule_group: selectedEmployee.department === 'cocina' ? 'cocina' as const : 'resto' as const,
                        notes: schedule.notes || '',
                        is_day_off: schedule.is_day_off || false,
                    };

                    await scheduleService.createSchedule(scheduleData);
                }
            }

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setShowScheduleEditor(false);
            loadScheduleData();
        } catch (error) {
            console.error('Error saving schedules:', error);
            Alert.alert('Error', 'No se pudieron guardar los horarios');
        }
    };

    const updateShiftTime = (scheduleId: string, field: 'start_time' | 'end_time', value: string) => {
        setEditingSchedules(editingSchedules.map(s =>
            s.id === scheduleId ? { ...s, [field]: value } : s
        ));
    };

    const renderScheduleEditorModal = () => (
        <Modal
            visible={showScheduleEditor}
            transparent
            animationType="slide"
            onRequestClose={() => setShowScheduleEditor(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.scheduleEditorModal}>
                    <View style={styles.modalHeader}>
                        <View>
                            <Text style={styles.modalTitle}>
                                Editar Horario: {selectedEmployee?.full_name}
                            </Text>
                            <Text style={styles.modalSubtitle}>
                                {selectedScheduleDate ? new Date(selectedScheduleDate).toLocaleDateString('es-ES') : ''}
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={styles.closeIconButton}
                            onPress={() => setShowScheduleEditor(false)}
                        >
                            <Ionicons name="close" size={24} color={Colors.light.text} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.scheduleEditorContent}>
                        {editingSchedules.map((schedule, index) => (
                            <View key={schedule.id} style={styles.shiftRow}>
                                <Text style={styles.shiftLabel}>Turno {index + 1}</Text>
                                <View style={styles.timeInputRow}>
                                    <TextInput
                                        style={styles.timeInput}
                                        value={schedule.start_time}
                                        onChangeText={(val) => updateShiftTime(schedule.id, 'start_time', val)}
                                        placeholder="09:00"
                                    />
                                    <Text style={styles.timeSeparator}>-</Text>
                                    <TextInput
                                        style={styles.timeInput}
                                        value={schedule.end_time}
                                        onChangeText={(val) => updateShiftTime(schedule.id, 'end_time', val)}
                                        placeholder="17:00"
                                    />
                                    <TouchableOpacity
                                        style={styles.deleteShiftButton}
                                        onPress={() => handleDeleteShift(schedule.id)}
                                    >
                                        <Ionicons name="trash-outline" size={20} color="#EF4444" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}

                        <TouchableOpacity
                            style={styles.addShiftButton}
                            onPress={handleAddShift}
                        >
                            <Ionicons name="add-circle-outline" size={24} color={Colors.light.primary} />
                            <Text style={styles.addShiftText}>Añadir turno</Text>
                        </TouchableOpacity>
                    </ScrollView>

                    <View style={styles.modalFooter}>
                        <TouchableOpacity
                            style={styles.cancelModalButton}
                            onPress={() => setShowScheduleEditor(false)}
                        >
                            <Text style={styles.cancelModalButtonText}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.saveModalButton}
                            onPress={handleSaveSchedules}
                        >
                            <Text style={styles.saveModalButtonText}>Guardar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );

    const renderSchedulesTab = () => {
        const weekDays = getWeekDays(currentWeekStart);
        const weekEnd = new Date(currentWeekStart);
        weekEnd.setDate(currentWeekStart.getDate() + 6);

        const formatWeekRange = () => {
            const start = currentWeekStart.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const end = weekEnd.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
            return `${start} - ${end}`;
        };

        const handlePreviousWeek = () => {
            const newStart = new Date(currentWeekStart);
            newStart.setDate(currentWeekStart.getDate() - 7);
            setCurrentWeekStart(newStart);
        };

        const handleNextWeek = () => {
            const newStart = new Date(currentWeekStart);
            newStart.setDate(currentWeekStart.getDate() + 7);
            setCurrentWeekStart(newStart);
        };

        const handleToday = () => {
            setCurrentWeekStart(getWeekStart(new Date()));
        };

        const handleCellPress = (employee: any, day: Date) => {
            setSelectedEmployee(employee);
            setSelectedScheduleDate(day.toISOString().split('T')[0]);
            const dateStr = day.toISOString().split('T')[0];
            const existing = getSchedulesForEmployeeAndDate(employee.id, dateStr, weekSchedules);
            setEditingSchedules(existing);
            setShowScheduleEditor(true);
        };

        return (
            <View style={styles.tabContent}>
                <View style={styles.weekNavigator}>
                    <View style={styles.weekHeader}>
                        <Text style={styles.weekTitle}>Semana: {formatWeekRange()}</Text>
                        <TouchableOpacity onPress={handleToday} style={styles.todayButton}>
                            <Text style={styles.todayButtonText}>Hoy</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.weekButtons}>
                        <TouchableOpacity onPress={handlePreviousWeek} style={styles.weekButton}>
                            <Ionicons name="chevron-back" size={24} color={Colors.light.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleNextWeek} style={styles.weekButton}>
                            <Ionicons name="chevron-forward" size={24} color={Colors.light.primary} />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.groupSelector}>
                    <TouchableOpacity
                        style={[styles.groupChip, scheduleGroup === 'all' && styles.groupChipActive]}
                        onPress={() => { setScheduleGroup('all'); }}
                    >
                        <Text style={[styles.groupChipText, scheduleGroup === 'all' && styles.groupChipTextActive]}>
                            Todos
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.groupChip, scheduleGroup === 'cocina' && styles.groupChipActive]}
                        onPress={() => { setScheduleGroup('cocina'); }}
                    >
                        <Text style={[styles.groupChipText, scheduleGroup === 'cocina' && styles.groupChipTextActive]}>
                            Cocina
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.groupChip, scheduleGroup === 'resto' && styles.groupChipActive]}
                        onPress={() => { setScheduleGroup('resto'); }}
                    >
                        <Text style={[styles.groupChipText, scheduleGroup === 'resto' && styles.groupChipTextActive]}>
                            Resto
                        </Text>
                    </TouchableOpacity>
                </View>

                {isFetching ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={Colors.light.primary} />
                        <Text style={styles.loadingText}>Cargando horarios...</Text>
                    </View>
                ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View>
                            <View style={styles.gridHeaderRow}>
                                <View style={styles.employeeNameColumn}>
                                    <Text style={styles.gridHeaderText}>Empleado</Text>
                                </View>
                                {weekDays.map((day, idx) => (
                                    <View key={idx} style={styles.dayColumn}>
                                        <Text style={styles.gridHeaderText}>{formatDateShort(day)}</Text>
                                    </View>
                                ))}
                            </View>

                            <ScrollView style={styles.gridScrollView}>
                                {scheduleEmployees.map((employee) => (
                                    <View key={employee.id} style={styles.gridRow}>
                                        <View style={styles.employeeNameCell}>
                                            <Text style={styles.employeeNameText} numberOfLines={1}>
                                                {employee.full_name}
                                            </Text>
                                            <Text style={styles.employeeCodeText}>
                                                {employee.employee_code}
                                            </Text>
                                        </View>

                                        {weekDays.map((day, idx) => {
                                            const dateStr = day.toISOString().split('T')[0];
                                            const daySchedules = getSchedulesForEmployeeAndDate(
                                                employee.id,
                                                dateStr,
                                                weekSchedules
                                            );

                                            return (
                                                <TouchableOpacity
                                                    key={idx}
                                                    style={[
                                                        styles.dayCell,
                                                        daySchedules.some(s => s.is_day_off) && styles.dayCellOff
                                                    ]}
                                                    onPress={() => handleCellPress(employee, day)}
                                                    activeOpacity={0.7}
                                                >
                                                    {daySchedules.length === 0 ? (
                                                        <Text style={styles.addIcon}>+</Text>
                                                    ) : (
                                                        <>
                                                            {daySchedules.map((schedule, sIdx) => (
                                                                <Text key={sIdx} style={styles.scheduleTime} numberOfLines={1}>
                                                                    {schedule.start_time.substring(0, 5)}-{schedule.end_time.substring(0, 5)}
                                                                </Text>
                                                            ))}
                                                        </>
                                                    )}
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                ))}
                            </ScrollView>
                        </View>
                    </ScrollView>
                )}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>{t('admin.title')}</Text>
            </View>

            {renderTabBar()}

            {activeTab === 'requests' && renderRequestsTab()}
            {activeTab === 'entries' && renderEntriesTab()}
            {activeTab === 'notifications' && renderNotificationsTab()}
            {activeTab === 'schedules' && renderSchedulesTab()}

            {/* Review Notes Modal */}
            <Modal
                visible={reviewNotesModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setReviewNotesModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>
                            {reviewAction === 'approve' ? t('admin.confirmApprove') : t('admin.confirmReject')}
                        </Text>
                        <TextInput
                            style={styles.modalInput}
                            value={reviewNotes}
                            onChangeText={setReviewNotes}
                            placeholder={t('admin.notesPlaceholder')}
                            multiline
                            numberOfLines={4}
                        />
                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.modalCancelButton}
                                onPress={() => {
                                    setReviewNotesModalVisible(false);
                                    setReviewNotes('');
                                }}
                            >
                                <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalConfirmButton}
                                onPress={submitReview}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.modalConfirmText}>
                                        {reviewAction === 'approve' ? t('admin.approve') : t('admin.reject')}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Schedule Editor Modal */}
            {renderScheduleEditorModal()}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        paddingTop: 60,
        paddingBottom: 16,
        paddingHorizontal: 24,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#333',
    },
    tabBar: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    tab: {
        flex: 1,
        paddingVertical: 16,
        alignItems: 'center',
    },
    tabActive: {
        borderBottomWidth: 3,
        borderBottomColor: Colors.light.primary,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
    },
    tabTextActive: {
        color: Colors.light.primary,
    },
    tabContent: {
        flex: 1,
    },
    scrollContent: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    selectionActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: Colors.light.primary + '20',
    },
    selectionText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    bulkButton: {
        backgroundColor: Colors.light.primary,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    bulkButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
    requestCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    cardSelected: {
        borderColor: Colors.light.primary,
        borderWidth: 2,
    },
    requestHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    requestUser: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    requestDepartment: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    requestType: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.light.primary,
        backgroundColor: Colors.light.primary + '20',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    requestDateTime: {
        fontSize: 14,
        color: '#666',
        marginBottom: 8,
    },
    requestReason: {
        fontSize: 14,
        color: '#333',
        marginBottom: 12,
    },
    requestActions: {
        flexDirection: 'row',
        gap: 8,
    },
    actionButton: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    approveButton: {
        backgroundColor: '#10B981',
    },
    rejectButton: {
        backgroundColor: '#EF4444',
    },
    actionButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
    userSelectorContainer: {
        padding: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    userChipContainer: {
        paddingVertical: 8,
    },
    sectionLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 12,
    },
    userChip: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 24,
        backgroundColor: '#f0f0f0',
        marginRight: 10,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    userChipSelected: {
        backgroundColor: Colors.light.primary,
        borderColor: Colors.light.primary,
        elevation: 2,
        shadowColor: Colors.light.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    userChipText: {
        color: '#666',
        fontWeight: '600',
        fontSize: 14,
    },
    userChipTextSelected: {
        color: '#fff',
    },
    dateRangeContainer: {
        flexDirection: 'row',
        padding: 16,
        gap: 12,
        backgroundColor: '#f8f9fa',
    },
    dateRangeChip: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        backgroundColor: '#fff',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#e0e0e0',
    },
    dateRangeChipActive: {
        backgroundColor: Colors.light.primary,
        borderColor: Colors.light.primary,
        elevation: 3,
        shadowColor: Colors.light.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    dateRangeText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
    },
    dateRangeTextActive: {
        color: '#fff',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#666',
    },
    statsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 24,
    },
    statCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        width: '48%',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        borderLeftWidth: 4,
    },
    statCardPrimary: {
        borderLeftColor: '#3B82F6',
    },
    statCardSuccess: {
        borderLeftColor: '#10B981',
    },
    statCardWarning: {
        borderLeftColor: '#F59E0B',
    },
    statCardInfo: {
        borderLeftColor: '#8B5CF6',
    },
    statIcon: {
        fontSize: 32,
        marginRight: 12,
    },
    statContent: {
        flex: 1,
    },
    statLabel: {
        fontSize: 11,
        color: '#666',
        marginBottom: 4,
        textTransform: 'uppercase',
        fontWeight: '500',
    },
    statValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    entriesHeader: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 16,
        marginTop: 8,
    },
    dayGroup: {
        marginBottom: 24,
        backgroundColor: '#fff',
        borderRadius: 12,
        overflow: 'hidden',
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    dayHeader: {
        backgroundColor: '#F3F4F6',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dayName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#374151',
        textTransform: 'capitalize',
    },
    dayDate: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '500',
    },
    entryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    entryDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 12,
    },
    entryDotGreen: {
        backgroundColor: '#10B981',
    },
    entryDotOrange: {
        backgroundColor: '#F59E0B',
    },
    entryDotRed: {
        backgroundColor: '#EF4444',
    },
    entryDetails: {
        flex: 1,
    },
    entryTypeText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 2,
    },
    entryTimeText: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '500',
    },
    manualBadge: {
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#F59E0B',
    },
    manualBadgeText: {
        fontSize: 11,
        color: '#D97706',
        fontWeight: '600',
    },
    emptyEntriesContainer: {
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyEntriesIcon: {
        fontSize: 64,
        marginBottom: 16,
        opacity: 0.3,
    },
    emptyEntriesText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#6B7280',
        marginBottom: 8,
    },
    emptyEntriesSubtext: {
        fontSize: 14,
        color: '#9CA3AF',
    },
    emptyStateIcon: {
        fontSize: 64,
        marginBottom: 16,
        opacity: 0.3,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#9CA3AF',
        textAlign: 'center',
        marginTop: 8,
    },
    summaryCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
    },
    summaryTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 12,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    summaryLabel: {
        fontSize: 14,
        color: '#666',
    },
    summaryValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    entryCard: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    entryType: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    entryTime: {
        fontSize: 14,
        color: '#666',
    },
    entryDate: {
        fontSize: 12,
        color: '#999',
    },
    noEntriesText: {
        textAlign: 'center',
        color: '#666',
        marginTop: 20,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        fontSize: 16,
        color: '#666',
    },
    notificationContainer: {
        padding: 16,
    },
    recipientOption: {
        padding: 16,
        backgroundColor: '#fff',
        borderRadius: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    recipientSelected: {
        borderColor: Colors.light.primary,
        backgroundColor: Colors.light.primary + '10',
    },
    recipientText: {
        fontSize: 14,
        color: '#333',
    },
    messageInput: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 16,
        fontSize: 14,
        textAlignVertical: 'top',
        borderWidth: 1,
        borderColor: '#e0e0e0',
        marginBottom: 16,
        minHeight: 100,
    },
    sendButton: {
        backgroundColor: Colors.light.primary,
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    sendButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 24,
        width: '85%',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 16,
    },
    modalInput: {
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        textAlignVertical: 'top',
        marginBottom: 16,
        minHeight: 100,
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
    },
    modalCancelButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ccc',
        alignItems: 'center',
    },
    modalCancelText: {
        color: '#666',
        fontWeight: '600',
    },
    modalConfirmButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        backgroundColor: Colors.light.primary,
        alignItems: 'center',
    },
    modalConfirmText: {
        color: '#fff',
        fontWeight: '600',
    },
    // Calendar container styles
    calendarWrapper: {
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
    calendarHeaderDayText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.light.textSecondary,
    },
    calendarDayHoursToday: {
        color: '#FFFFFF',
    },
    // Calendar styles (matching calendario.tsx format)
    weekDaysHeader: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    weekDayLabel: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 8,
        fontSize: 14,
        fontWeight: '600',
        color: Colors.light.textSecondary,
        textAlign: 'center',
    },
    calendarWeekGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    calendarMonthGrid: {
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
    calendarDayMonth: {
        backgroundColor: '#FAFAFA',
    },
    calendarDayToday: {
        backgroundColor: Colors.light.primary,
        borderColor: Colors.light.primary,
    },
    calendarDayWithEntries: {
        backgroundColor: '#FFFFFF',
    },
    calendarDaySelected: {
        backgroundColor: '#EFF6FF',
        borderColor: Colors.light.primary,
        borderWidth: 2,
    },
    calendarDayNumber: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.light.text,
        marginBottom: 2,
    },
    calendarDayNumberToday: {
        color: '#FFFFFF',
    },
    calendarDayNumberWithEntries: {
        color: Colors.light.text,
    },
    calendarDayNumberSelected: {
        color: Colors.light.primary,
        fontWeight: '700',
    },
    calendarDayNumberEmpty: {
        color: Colors.light.textLight,
    },
    calendarDayDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: Colors.light.primary,
        marginTop: 2,
    },
    calendarDayHours: {
        fontSize: 10,
        color: Colors.light.primary,
        fontWeight: '600',
    },
    selectedDayContainer: {
        backgroundColor: '#fff',
        borderRadius: 12,
        marginTop: 16,
        marginBottom: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: Colors.light.border,
    },
    selectedDayHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#F9FAFB',
        borderBottomWidth: 1,
        borderBottomColor: Colors.light.border,
    },
    selectedDayTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.light.text,
        textTransform: 'capitalize',
    },
    selectedDayClose: {
        fontSize: 20,
        fontWeight: '600',
        color: Colors.light.textSecondary,
    },
    // Group selector styles (shared with schedules)
    groupSelector: {
        flexDirection: 'row',
        padding: 16,
        gap: 8,
        backgroundColor: Colors.light.cardBackground,
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
    // Schedules tab styles
    infoBox: {
        backgroundColor: '#F0F9FF',
        borderRadius: 12,
        padding: 16,
        margin: 16,
        borderWidth: 1,
        borderColor: Colors.light.primary + '30',
    },
    infoText: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.light.text,
        marginBottom: 4,
    },
    infoSubtext: {
        fontSize: 13,
        color: Colors.light.textSecondary,
    },
    employeesList: {
        padding: 16,
        gap: 12,
    },
    employeeScheduleCard: {
        backgroundColor: Colors.light.cardBackground,
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.light.border,
    },
    employeeInfo: {
        flex: 1,
    },
    employeeNameText: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.light.text,
    },
    employeeCodeText: {
        fontSize: 13,
        color: Colors.light.textSecondary,
        marginTop: 2,
    },
    scheduleInfo: {
        backgroundColor: '#F0F9FF',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
    },
    scheduleCountText: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.light.primary,
    },
    noScheduleText: {
        fontSize: 13,
        color: Colors.light.textSecondary,
        fontStyle: 'italic',
    },
    adminNote: {
        backgroundColor: '#FFF9E6',
        borderRadius: 12,
        padding: 16,
        margin: 16,
        marginTop: 24,
        borderWidth: 1,
        borderColor: '#FFE066',
    },
    adminNoteText: {
        fontSize: 13,
        color: '#8B7300',
        lineHeight: 20,
    },
    // Schedule Grid Styles
    weekNavigator: {
        backgroundColor: Colors.light.cardBackground,
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: Colors.light.border,
    },
    weekHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    weekTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.light.text,
    },
    todayButton: {
        paddingHorizontal: 16,
        paddingVertical: 6,
        backgroundColor: Colors.light.primary,
        borderRadius: 6,
    },
    todayButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    weekButtons: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 12,
    },
    weekButton: {
        padding: 8,
        backgroundColor: Colors.light.background,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: Colors.light.border,
    },
    gridHeaderRow: {
        flexDirection: 'row',
        backgroundColor: Colors.light.cardBackground,
        borderBottomWidth: 2,
        borderBottomColor: Colors.light.border,
    },
    employeeNameColumn: {
        width: 120,
        padding: 12,
        justifyContent: 'center',
        borderRightWidth: 1,
        borderRightColor: Colors.light.border,
    },
    dayColumn: {
        width: 100,
        padding: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderRightWidth: 1,
        borderRightColor: Colors.light.border,
    },
    gridHeaderText: {
        fontSize: 12,
        fontWeight: '700',
        color: Colors.light.text,
        textAlign: 'center',
    },
    gridScrollView: {
        maxHeight: 600,
    },
    gridRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: Colors.light.border,
    },
    employeeNameCell: {
        width: 120,
        padding: 12,
        justifyContent: 'center',
        borderRightWidth: 1,
        borderRightColor: Colors.light.border,
        backgroundColor: Colors.light.cardBackground,
    },
    dayCell: {
        width: 100,
        minHeight: 60,
        padding: 8,
        justifyContent: 'center',
        alignItems: 'center',
        borderRightWidth: 1,
        borderRightColor: Colors.light.border,
        backgroundColor: Colors.light.background,
    },
    dayCellOff: {
        backgroundColor: '#D4EDDA',
    },
    addIcon: {
        fontSize: 24,
        color: Colors.light.textSecondary,
    },
    scheduleTime: {
        fontSize: 11,
        color: Colors.light.text,
        marginVertical: 2,
    },
    // Schedule Editor Modal Styles
    scheduleEditorModal: {
        backgroundColor: Colors.light.cardBackground,
        marginHorizontal: 20,
        marginVertical: 60,
        borderRadius: 16,
        maxHeight: '80%',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: Colors.light.border,
    },
    modalSubtitle: {
        fontSize: 14,
        color: Colors.light.textSecondary,
        marginTop: 4,
    },
    closeIconButton: {
        padding: 4,
    },
    scheduleEditorContent: {
        padding: 20,
        maxHeight: 400,
    },
    shiftRow: {
        marginBottom: 20,
        padding: 16,
        backgroundColor: Colors.light.background,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.light.border,
    },
    shiftLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.light.text,
        marginBottom: 12,
    },
    timeInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    timeInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: Colors.light.border,
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: Colors.light.text,
        backgroundColor: Colors.light.cardBackground,
    },
    timeSeparator: {
        fontSize: 18,
        fontWeight: '600',
        color: Colors.light.text,
        paddingHorizontal: 8,
    },
    deleteShiftButton: {
        padding: 12,
        borderRadius: 8,
        backgroundColor: '#FEE2E2',
    },
    addShiftButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        gap: 8,
        borderWidth: 2,
        borderColor: Colors.light.primary,
        borderRadius: 12,
        borderStyle: 'dashed',
    },
    addShiftText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.light.primary,
    },
    modalFooter: {
        flexDirection: 'row',
        padding: 20,
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: Colors.light.border,
    },
    cancelModalButton: {
        flex: 1,
        backgroundColor: Colors.light.background,
        borderWidth: 1,
        borderColor: Colors.light.border,
    },
    cancelModalButtonText: {
        color: Colors.light.text,
        textAlign: 'center',
        fontSize: 16,
        fontWeight: '600',
    },
    saveModalButton: {
        flex: 1,
        backgroundColor: Colors.light.primary,
    },
    saveModalButtonText: {
        color: '#FFFFFF',
        textAlign: 'center',
        fontSize: 16,
        fontWeight: '600',
    },
});
