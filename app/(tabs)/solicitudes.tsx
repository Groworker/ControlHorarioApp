import { Colors } from '@/constants/Colors';
import { requestService, type EntryType } from '@/services/request.service';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface RequestDisplay {
    id: string;
    date: string;
    type: EntryType;
    time: string;
    reason: string;
    status: 'pending' | 'approved' | 'rejected';
}

export default function SolicitudesScreen() {
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(true);

    // Estados para selección múltiple
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // Estados para edición
    const [editingRequest, setEditingRequest] = useState<RequestDisplay | null>(null);
    const [showNewRequest, setShowNewRequest] = useState(false);
    const [selectedType, setSelectedType] = useState<EntryType>('ENTRADA');

    // Fecha actual como default
    const today = new Date();
    const [selectedDay, setSelectedDay] = useState(today.getDate());
    const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(today.getFullYear());

    // Hora default
    const [selectedHour, setSelectedHour] = useState(9);
    const [selectedMin, setSelectedMin] = useState(0);

    const [reason, setReason] = useState('');

    // Estado del picker de hora
    const [pickerVisible, setPickerVisible] = useState(false);
    const [pickerType, setPickerType] = useState<'hour' | 'minute'>('hour');
    const [pickerTempValue, setPickerTempValue] = useState(0);

    // Estado del picker de fecha
    const [datePickerVisible, setDatePickerVisible] = useState(false);
    const [tempDay, setTempDay] = useState(selectedDay);
    const [tempMonth, setTempMonth] = useState(selectedMonth);
    const [tempYear, setTempYear] = useState(selectedYear);

    // Refs para auto-scroll en el picker de fecha
    const dayScrollRef = useRef<any>(null);
    const monthScrollRef = useRef<any>(null);

    // Auto-scroll cuando se abre el picker de fecha
    useEffect(() => {
        if (datePickerVisible) {
            // Pequeño delay para asegurar que el modal esté renderizado
            setTimeout(() => {
                // Scroll al día seleccionado (cada item tiene 57px de altura aprox)
                const dayIndex = tempDay - 1;
                dayScrollRef.current?.scrollTo({ y: dayIndex * 57, animated: true });

                // Scroll al mes seleccionado
                const monthIndex = tempMonth - 1;
                monthScrollRef.current?.scrollTo({ y: monthIndex * 57, animated: true });
            }, 100);
        }
    }, [datePickerVisible]);

    const [requests, setRequests] = useState<RequestDisplay[]>([]);

    // Cargar solicitudes cuando la pantalla está en foco
    useFocusEffect(
        useCallback(() => {
            loadRequests();
        }, [])
    );

    const loadRequests = async () => {
        setIsFetching(true);
        try {
            const result = await requestService.getMyRequests();
            if (result.success && result.requests) {
                // Convertir requests de DB a formato de display
                const displayRequests: RequestDisplay[] = result.requests.map(req => {
                    const datetime = new Date(req.requested_datetime);
                    return {
                        id: req.id,
                        date: formatDateDisplay(datetime),
                        type: req.entry_type,
                        time: formatTimeDisplay(datetime),
                        reason: req.reason,
                        status: req.status,
                    };
                });
                setRequests(displayRequests);
            }
        } catch (error) {
            console.error('Error loading requests:', error);
        } finally {
            setIsFetching(false);
        }
    };

    const formatDateDisplay = (date: Date): string => {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const formatTimeDisplay = (date: Date): string => {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    };

    const typeLabels: Record<EntryType, string> = {
        'ENTRADA': 'Entrada',
        'SALIDA': 'Salida',
        'ENTRADA_2': 'Entrada T2',
        'SALIDA_2': 'Salida T2',
        'DESCANSO': 'Descanso',
    };

    const statusLabels = {
        pending: 'Pendiente',
        approved: 'Aprobada',
        rejected: 'Rechazada',
    };

    const statusColors = {
        pending: '#F59E0B',
        approved: '#10B981',
        rejected: '#EF4444',
    };

    const openTimePicker = (type: 'hour' | 'minute') => {
        setPickerType(type);
        setPickerTempValue(type === 'hour' ? selectedHour : selectedMin);
        setPickerVisible(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    };

    const confirmTimePicker = () => {
        if (pickerType === 'hour') {
            setSelectedHour(pickerTempValue);
        } else {
            setSelectedMin(pickerTempValue);
        }
        setPickerVisible(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    const openDatePicker = () => {
        setTempDay(selectedDay);
        setTempMonth(selectedMonth);
        setTempYear(selectedYear);
        setDatePickerVisible(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    };

    const confirmDatePicker = () => {
        setSelectedDay(tempDay);
        setSelectedMonth(tempMonth);
        setSelectedYear(tempYear);
        setDatePickerVisible(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    const submitRequest = async () => {
        if (!reason.trim()) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Error', 'Por favor ingresa un motivo para la solicitud');
            return;
        }

        setIsLoading(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            // Construir fecha y hora en formato ISO
            const requestedDate = new Date(
                selectedYear,
                selectedMonth - 1,
                selectedDay,
                selectedHour,
                selectedMin
            );

            const result = await requestService.createRequest(
                selectedType,
                requestedDate,
                reason.trim()
            );

            if (result.success) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setShowNewRequest(false);
                setReason('');

                // Recargar solicitudes
                await loadRequests();

                Alert.alert(
                    '¡Solicitud enviada!',
                    'Tu solicitud ha sido enviada y está pendiente de aprobación.',
                    [{ text: 'OK' }]
                );
            } else {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                Alert.alert('Error', result.error || 'No se pudo crear la solicitud');
            }
        } catch (error) {
            console.error('Error submitting request:', error);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Error', 'Ocurrió un error al enviar la solicitud');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteRequest = (requestId: string, status: 'pending' | 'approved' | 'rejected') => {
        // Solo permitir eliminar solicitudes pendientes
        if (status !== 'pending') {
            Alert.alert(
                'No se puede eliminar',
                'Solo puedes eliminar solicitudes pendientes.',
                [{ text: 'OK' }]
            );
            return;
        }

        Alert.alert(
            'Eliminar Solicitud',
            '¿Estás seguro de que quieres eliminar esta solicitud?',
            [
                {
                    text: 'Cancelar',
                    style: 'cancel'
                },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: async () => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

                        console.log('Deleting request:', requestId);
                        const result = await requestService.deleteRequest(requestId);
                        console.log('Delete result:', result);

                        if (result.success) {
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

                            // Actualización optimista: remover de la lista inmediatamente
                            setRequests(prevRequests => prevRequests.filter(req => req.id !== requestId));

                            // Recargar solicitudes para asegurar sincronización
                            await loadRequests();
                            console.log('Requests reloaded after delete');
                        } else {
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                            Alert.alert('Error', result.error || 'No se pudo eliminar la solicitud');
                        }
                    }
                }
            ]
        );
    };

    const handleLongPress = (requestId: string, status: 'pending' | 'approved' | 'rejected') => {
        // Solo permitir selección múltiple de solicitudes pendientes
        if (status !== 'pending') {
            handleDeleteRequest(requestId, status);
            return;
        }

        // Entrar en modo selección
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setIsSelectionMode(true);
        setSelectedIds([requestId]);
    };

    const toggleSelection = (requestId: string) => {
        if (selectedIds.includes(requestId)) {
            const newSelected = selectedIds.filter(id => id !== requestId);
            setSelectedIds(newSelected);
            // Salir del modo selección si no hay nada seleccionado
            if (newSelected.length === 0) {
                setIsSelectionMode(false);
            }
        } else {
            setSelectedIds([...selectedIds, requestId]);
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const cancelSelection = () => {
        setIsSelectionMode(false);
        setSelectedIds([]);
    };

    const deleteSelected = async () => {
        if (selectedIds.length === 0) return;

        Alert.alert(
            'Eliminar Solicitudes',
            `¿Estás seguro de que quieres eliminar ${selectedIds.length} solicitud(es)?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: async () => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

                        console.log('Bulk deleting requests:', selectedIds);
                        const result = await requestService.bulkDeleteRequests(selectedIds);
                        console.log('Bulk delete result:', result);

                        if (result.success) {
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

                            // Actualización optimista: remover de la lista inmediatamente
                            setRequests(prevRequests => prevRequests.filter(req => !selectedIds.includes(req.id)));
                            setIsSelectionMode(false);
                            setSelectedIds([]);

                            // Recargar solicitudes para asegurar sincronización
                            await loadRequests();
                            console.log('Requests reloaded after bulk delete');
                        } else {
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                            Alert.alert('Error', result.error || 'No se pudieron eliminar las solicitudes');
                        }
                    }
                }
            ]
        );
    };

    const startEdit = (request: RequestDisplay) => {
        // Parsear la fecha y hora del display format
        const [day, month, year] = request.date.split('/').map(Number);
        const [hours, minutes] = request.time.split(':').map(Number);

        setSelectedType(request.type);
        setSelectedDay(day);
        setSelectedMonth(month);
        setSelectedYear(year);
        setSelectedHour(hours);
        setSelectedMin(minutes);
        setReason(request.reason);
        setEditingRequest(request);
        setShowNewRequest(true);
    };

    const submitEdit = async () => {
        if (!reason.trim() || !editingRequest) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Error', 'Por favor ingresa un motivo para la solicitud');
            return;
        }

        setIsLoading(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            const requestedDate = new Date(
                selectedYear,
                selectedMonth - 1,
                selectedDay,
                selectedHour,
                selectedMin
            );

            const result = await requestService.updateRequest(
                editingRequest.id,
                {
                    entry_type: selectedType,
                    requested_datetime: requestedDate,
                    reason: reason.trim()
                }
            );

            if (result.success) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setShowNewRequest(false);
                setReason('');
                setEditingRequest(null);
                await loadRequests();

                Alert.alert(
                    '¡Solicitud actualizada!',
                    'Tu solicitud ha sido actualizada correctamente.',
                    [{ text: 'OK' }]
                );
            } else {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                Alert.alert('Error', result.error || 'No se pudo actualizar la solicitud');
            }
        } catch (error) {
            console.error('Error updating request:', error);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Error', 'Ocurrió un error al actualizar la solicitud');
        } finally {
            setIsLoading(false);
        }
    };

    const pickerItems = pickerType === 'hour'
        ? Array.from({ length: 24 }, (_, i) => i)
        : [0, 15, 30, 45];

    if (showNewRequest) {
        return (
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.container}
            >
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => {
                        setShowNewRequest(false);
                        setEditingRequest(null);
                        setReason('');
                    }}>
                        <Text style={styles.backButton}>← Volver</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>{editingRequest ? 'Editar Solicitud' : 'Nueva Solicitud'}</Text>
                    <View style={{ width: 20 }} />
                </View>

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    {/* Tipo de fichaje */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Tipo de Fichaje</Text>

                        <View style={styles.typeRow}>
                            <TouchableOpacity
                                style={[styles.typeButton, selectedType === 'ENTRADA' && styles.typeButtonActive]}
                                onPress={() => { setSelectedType('ENTRADA'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.typeButtonText, selectedType === 'ENTRADA' && styles.typeButtonTextActive]}>Entrada</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.typeButton, selectedType === 'SALIDA' && styles.typeButtonActive]}
                                onPress={() => { setSelectedType('SALIDA'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.typeButtonText, selectedType === 'SALIDA' && styles.typeButtonTextActive]}>Salida</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.typeRow}>
                            <TouchableOpacity
                                style={[styles.typeButton, selectedType === 'ENTRADA_2' && styles.typeButtonActive]}
                                onPress={() => { setSelectedType('ENTRADA_2'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.typeButtonText, selectedType === 'ENTRADA_2' && styles.typeButtonTextActive]}>Entrada T2</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.typeButton, selectedType === 'SALIDA_2' && styles.typeButtonActive]}
                                onPress={() => { setSelectedType('SALIDA_2'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.typeButtonText, selectedType === 'SALIDA_2' && styles.typeButtonTextActive]}>Salida T2</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.typeRow}>
                            <TouchableOpacity
                                style={[styles.typeButton, styles.typeButtonFull, selectedType === 'DESCANSO' && styles.typeButtonActive]}
                                onPress={() => { setSelectedType('DESCANSO'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.typeButtonText, selectedType === 'DESCANSO' && styles.typeButtonTextActive]}>Descanso</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Fecha */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Fecha</Text>
                        <TouchableOpacity
                            style={styles.dateButton}
                            onPress={openDatePicker}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.dateButtonText}>
                                {`${selectedDay.toString().padStart(2, '0')}/${selectedMonth.toString().padStart(2, '0')}/${selectedYear}`}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Hora - igual que calculadora */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Hora</Text>
                        <View style={styles.timePicker}>
                            <View style={styles.timePickerRow}>
                                <TouchableOpacity
                                    style={styles.timeButton}
                                    onPress={() => openTimePicker('hour')}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.timeText}>{selectedHour.toString().padStart(2, '0')}</Text>
                                </TouchableOpacity>
                                <Text style={styles.timeSep}>:</Text>
                                <TouchableOpacity
                                    style={styles.timeButton}
                                    onPress={() => openTimePicker('minute')}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.timeText}>{selectedMin.toString().padStart(2, '0')}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    {/* Motivo */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Motivo</Text>
                        <TextInput
                            style={styles.textArea}
                            value={reason}
                            onChangeText={setReason}
                            placeholder="Explica por qué olvidaste fichar..."
                            placeholderTextColor={Colors.light.textSecondary}
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
                        onPress={editingRequest ? submitEdit : submitRequest}
                        activeOpacity={0.8}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text style={styles.submitButtonText}>
                                {editingRequest ? 'Actualizar Solicitud' : 'Enviar Solicitud'}
                            </Text>
                        )}
                    </TouchableOpacity>

                    <View style={{ height: 40 }} />
                </ScrollView>

                {/* Modal Picker de Hora (igual que calculadora) */}
                <Modal
                    visible={pickerVisible}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setPickerVisible(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <TouchableOpacity onPress={() => setPickerVisible(false)}>
                                    <Text style={styles.modalCancel}>Cancelar</Text>
                                </TouchableOpacity>
                                <Text style={styles.modalTitle}>
                                    {pickerType === 'hour' ? 'Seleccionar Hora' : 'Seleccionar Minutos'}
                                </Text>
                                <TouchableOpacity onPress={confirmTimePicker}>
                                    <Text style={styles.modalConfirm}>Listo</Text>
                                </TouchableOpacity>
                            </View>
                            <ScrollView style={styles.pickerScroll}>
                                {pickerItems.map((item) => (
                                    <TouchableOpacity
                                        key={item}
                                        style={[
                                            styles.pickerItem,
                                            pickerTempValue === item && styles.pickerItemSelected
                                        ]}
                                        onPress={() => setPickerTempValue(item)}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[
                                            styles.pickerItemText,
                                            pickerTempValue === item && styles.pickerItemTextSelected
                                        ]}>
                                            {item.toString().padStart(2, '0')}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    </View>
                </Modal>

                {/* Modal Picker de Fecha */}
                <Modal
                    visible={datePickerVisible}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setDatePickerVisible(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <TouchableOpacity onPress={() => setDatePickerVisible(false)}>
                                    <Text style={styles.modalCancel}>Cancelar</Text>
                                </TouchableOpacity>
                                <Text style={styles.modalTitle}>Seleccionar Fecha</Text>
                                <TouchableOpacity onPress={confirmDatePicker}>
                                    <Text style={styles.modalConfirm}>Listo</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.datePickerContainer}>
                                {/* Columna Día */}
                                <View style={styles.datePickerColumn}>
                                    <Text style={styles.datePickerColumnLabel}>Día</Text>
                                    <ScrollView ref={dayScrollRef} style={styles.pickerScroll}>
                                        {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                                            <TouchableOpacity
                                                key={day}
                                                style={[
                                                    styles.pickerItem,
                                                    tempDay === day && styles.pickerItemSelected
                                                ]}
                                                onPress={() => setTempDay(day)}
                                                activeOpacity={0.7}
                                            >
                                                <Text style={[
                                                    styles.pickerItemText,
                                                    tempDay === day && styles.pickerItemTextSelected
                                                ]}>
                                                    {day.toString().padStart(2, '0')}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>

                                {/* Columna Mes */}
                                <View style={styles.datePickerColumn}>
                                    <Text style={styles.datePickerColumnLabel}>Mes</Text>
                                    <ScrollView ref={monthScrollRef} style={styles.pickerScroll}>
                                        {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                                            <TouchableOpacity
                                                key={month}
                                                style={[
                                                    styles.pickerItem,
                                                    tempMonth === month && styles.pickerItemSelected
                                                ]}
                                                onPress={() => setTempMonth(month)}
                                                activeOpacity={0.7}
                                            >
                                                <Text style={[
                                                    styles.pickerItemText,
                                                    tempMonth === month && styles.pickerItemTextSelected
                                                ]}>
                                                    {month.toString().padStart(2, '0')}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>

                                {/* Columna Año */}
                                <View style={styles.datePickerColumn}>
                                    <Text style={styles.datePickerColumnLabel}>Año</Text>
                                    <ScrollView style={styles.pickerScroll}>
                                        {Array.from({ length: 10 }, (_, i) => 2026 - i).map((year) => (
                                            <TouchableOpacity
                                                key={year}
                                                style={[
                                                    styles.pickerItem,
                                                    tempYear === year && styles.pickerItemSelected
                                                ]}
                                                onPress={() => setTempYear(year)}
                                                activeOpacity={0.7}
                                            >
                                                <Text style={[
                                                    styles.pickerItemText,
                                                    tempYear === year && styles.pickerItemTextSelected
                                                ]}>
                                                    {year}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            </View>
                        </View>
                    </View>
                </Modal>
            </KeyboardAvoidingView>
        );
    }

    // Lista de solicitudes
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                {isSelectionMode ? (
                    <>
                        <TouchableOpacity onPress={cancelSelection} style={styles.headerButton}>
                            <Text style={styles.cancelButton}>Cancelar</Text>
                        </TouchableOpacity>
                        <View style={styles.selectionTitleContainer}>
                            <Text style={styles.selectionTitle}>{selectedIds.length} seleccionada(s)</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={deleteSelected}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.deleteButtonText}>Eliminar</Text>
                        </TouchableOpacity>
                    </>
                ) : (
                    <>
                        <Text style={styles.title}>Solicitudes</Text>
                        <TouchableOpacity
                            style={styles.newButton}
                            onPress={() => setShowNewRequest(true)}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.newButtonText}>+ Nueva</Text>
                        </TouchableOpacity>
                    </>
                )}
            </View>

            <ScrollView style={styles.content}>
                {isFetching ? (
                    <View style={styles.loadingState}>
                        <ActivityIndicator size="large" color={Colors.light.primary} />
                        <Text style={styles.loadingText}>Cargando solicitudes...</Text>
                    </View>
                ) : requests.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>No hay solicitudes</Text>
                        <Text style={styles.emptySubtext}>Crea una nueva solicitud para registrar un fichaje olvidado</Text>
                    </View>
                ) : (
                    requests.map((request) => {
                        const isSelected = selectedIds.includes(request.id);
                        const isPending = request.status === 'pending';

                        return (
                            <TouchableOpacity
                                key={request.id}
                                style={[
                                    styles.requestCard,
                                    isSelected && styles.requestCardSelected
                                ]}
                                onPress={() => {
                                    if (isSelectionMode) {
                                        toggleSelection(request.id);
                                    }
                                }}
                                onLongPress={() => handleLongPress(request.id, request.status)}
                                activeOpacity={0.9}
                                delayLongPress={500}
                            >
                                <View style={styles.requestCardContent}>
                                    {/* Checkbox en modo selección */}
                                    {isSelectionMode && isPending && (
                                        <View style={styles.checkboxContainer}>
                                            <View style={[
                                                styles.checkboxInner,
                                                isSelected && styles.checkboxSelected
                                            ]}>
                                                {isSelected && <Text style={styles.checkmark}>✓</Text>}
                                            </View>
                                        </View>
                                    )}

                                    <View style={styles.requestContent}>
                                        <View style={styles.requestHeader}>
                                            <View style={styles.requestInfo}>
                                                <Text style={styles.requestType}>{typeLabels[request.type]}</Text>
                                                <Text style={styles.requestDate}>{request.date} • {request.time}</Text>
                                            </View>
                                            <View style={[styles.statusBadge, { backgroundColor: statusColors[request.status] }]}>
                                                <Text style={styles.statusText}>{statusLabels[request.status]}</Text>
                                            </View>
                                        </View>
                                        <Text style={styles.requestReason}>{request.reason}</Text>

                                        {/* Botón de editar para solicitudes pendientes */}
                                        {isPending && !isSelectionMode && (
                                            <TouchableOpacity
                                                style={styles.editButton}
                                                onPress={() => startEdit(request)}
                                                activeOpacity={0.7}
                                            >
                                                <Text style={styles.editButtonText}>✏️ Editar</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>
                            </TouchableOpacity>
                        );
                    })
                )}
            </ScrollView>
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
        paddingVertical: 16,
        paddingHorizontal: 16,
        paddingTop: 83,
        borderBottomWidth: 1,
        borderBottomColor: Colors.light.border,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerButton: {
        paddingRight: 8,
    },
    selectionTitleContainer: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 8,
    },
    selectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: Colors.light.text,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: Colors.light.text,
    },
    backButton: {
        fontSize: 12,
        color: Colors.light.primary,
        fontWeight: '600',
    },
    newButton: {
        backgroundColor: Colors.light.primary,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 10,
    },
    newButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    content: {
        flex: 1,
        padding: 16,
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
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
        paddingHorizontal: 40,
    },
    requestCard: {
        backgroundColor: Colors.light.cardBackground,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    requestHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    requestInfo: {
        flex: 1,
    },
    requestType: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.light.text,
        marginBottom: 4,
    },
    requestDate: {
        fontSize: 14,
        color: Colors.light.textSecondary,
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    requestReason: {
        fontSize: 14,
        color: Colors.light.text,
        lineHeight: 20,
    },
    deleteHint: {
        fontSize: 11,
        color: Colors.light.textSecondary,
        fontStyle: 'italic',
        marginTop: 8,
        textAlign: 'center',
    },
    cancelButton: {
        fontSize: 16,
        color: Colors.light.primary,
        fontWeight: '600',
    },
    deleteButton: {
        backgroundColor: '#EF4444',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 8,
    },
    deleteButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    requestCardSelected: {
        backgroundColor: '#EFF6FF',
        borderColor: Colors.light.primary,
        borderWidth: 2,
    },
    requestCardContent: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        width: '100%',
    },
    checkboxContainer: {
        paddingRight: 12,
        paddingTop: 2,
    },
    checkboxInner: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: Colors.light.border,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxSelected: {
        backgroundColor: Colors.light.primary,
        borderColor: Colors.light.primary,
    },
    checkmark: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    requestContent: {
        flex: 1,
    },
    editButton: {
        marginTop: 12,
        paddingVertical: 8,
        paddingHorizontal: 16,
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    editButtonText: {
        fontSize: 14,
        color: Colors.light.primary,
        fontWeight: '600',
    },
    // Form
    formGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.light.text,
        marginBottom: 8,
    },
    typeRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 8,
    },
    typeButton: {
        flex: 1,
        backgroundColor: '#F3F4F6',
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    typeButtonFull: {
        flex: 1,
    },
    typeButtonActive: {
        backgroundColor: '#EFF6FF',
        borderColor: Colors.light.primary,
    },
    typeButtonText: {
        fontSize: 15,
        color: Colors.light.text,
        fontWeight: '500',
    },
    typeButtonTextActive: {
        color: Colors.light.primary,
        fontWeight: '600',
    },
    // Fecha selector
    dateButton: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderRadius: 10,
        alignItems: 'center',
    },
    dateButtonText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.light.text,
    },
    // Date picker modal
    datePickerContainer: {
        flexDirection: 'row',
        padding: 16,
        gap: 12,
    },
    datePickerColumn: {
        flex: 1,
    },
    datePickerColumnLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.light.textSecondary,
        textAlign: 'center',
        marginBottom: 12,
    },
    // Time picker (igual que calculadora)
    timePicker: {
        backgroundColor: Colors.light.cardBackground,
        borderRadius: 12,
        padding: 16,
    },
    timePickerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    timeButton: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 10,
        minWidth: 60,
        alignItems: 'center',
    },
    timeText: {
        fontSize: 28,
        fontWeight: 'bold',
        color: Colors.light.text,
    },
    timeSep: {
        fontSize: 28,
        fontWeight: 'bold',
        color: Colors.light.text,
    },
    textArea: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: Colors.light.border,
        borderRadius: 10,
        padding: 14,
        fontSize: 16,
        color: Colors.light.text,
        minHeight: 100,
        textAlignVertical: 'top',
    },
    submitButton: {
        backgroundColor: Colors.light.primary,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 8,
    },
    submitButtonDisabled: {
        opacity: 0.6,
    },
    loadingState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    loadingText: {
        fontSize: 16,
        color: Colors.light.textSecondary,
        marginTop: 12,
    },
    submitButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    // Modal Picker (igual que calculadora)
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '50%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: Colors.light.borderLight,
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.light.text,
    },
    modalCancel: {
        fontSize: 16,
        color: Colors.light.textSecondary,
    },
    modalConfirm: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.light.primary,
    },
    pickerScroll: {
        maxHeight: 300,
    },
    pickerItem: {
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderBottomWidth: 1,
        borderBottomColor: Colors.light.borderLight,
    },
    pickerItemSelected: {
        backgroundColor: '#F0F9FF',
    },
    pickerItemText: {
        fontSize: 20,
        color: Colors.light.text,
        textAlign: 'center',
    },
    pickerItemTextSelected: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.light.primary,
    },
});
