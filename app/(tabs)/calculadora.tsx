import { Colors } from '@/constants/Colors';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type ShiftType = 'single' | 'split';

export default function CalculadoraScreen() {
    const { t } = useTranslation();
    const [shiftType, setShiftType] = useState<ShiftType>('single');

    const [start1Hour, setStart1Hour] = useState(9);
    const [start1Min, setStart1Min] = useState(0);
    const [end1Hour, setEnd1Hour] = useState(17);
    const [end1Min, setEnd1Min] = useState(30);

    const [start2Hour, setStart2Hour] = useState(15);
    const [start2Min, setStart2Min] = useState(0);
    const [end2Hour, setEnd2Hour] = useState(20);
    const [end2Min, setEnd2Min] = useState(0);

    const [breakMins, setBreakMins] = useState(30);

    const [pickerVisible, setPickerVisible] = useState(false);
    const [pickerType, setPickerType] = useState<'hour' | 'minute'>('hour');
    const [currentSetter, setCurrentSetter] = useState<React.Dispatch<React.SetStateAction<number>> | null>(null);
    const [currentValue, setCurrentValue] = useState(0);

    const openPicker = (
        type: 'hour' | 'minute',
        value: number,
        setter: React.Dispatch<React.SetStateAction<number>>
    ) => {
        setPickerType(type);
        setCurrentValue(value);
        setCurrentSetter(() => setter);
        setPickerVisible(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    };

    const confirmPicker = (value: number) => {
        if (currentSetter) {
            currentSetter(value);
        }
        setPickerVisible(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    const adjust = (setter: React.Dispatch<React.SetStateAction<number>>, val: number, max: number, step: number) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setter((prev) => {
            const newVal = prev + step;
            if (newVal >= max) return 0;
            if (newVal < 0) return max - step;
            return newVal;
        });
    };

    const calculateTotal = () => {
        let total = 0;

        let start1 = start1Hour * 60 + start1Min;
        let end1 = end1Hour * 60 + end1Min;
        if (end1 < start1) end1 += 24 * 60;
        total += (end1 - start1);

        if (shiftType === 'split') {
            let start2 = start2Hour * 60 + start2Min;
            let end2 = end2Hour * 60 + end2Min;
            if (end2 < start2) end2 += 24 * 60;
            total += (end2 - start2);
        }

        total -= breakMins;

        const hours = Math.floor(total / 60);
        const mins = total % 60;
        return { hours, mins };
    };

    const { hours: totalH, mins: totalM } = calculateTotal();

    const TimePicker = ({
        hour,
        min,
        onHourPress,
        onMinPress,
        label
    }: {
        hour: number;
        min: number;
        onHourPress: () => void;
        onMinPress: () => void;
        label: string;
    }) => (
        <View style={styles.timePicker}>
            <Text style={styles.timePickerLabel}>{label}</Text>
            <View style={styles.timePickerRow}>
                <TouchableOpacity style={styles.timeButton} onPress={onHourPress} activeOpacity={0.7}>
                    <Text style={styles.timeText}>{hour.toString().padStart(2, '0')}</Text>
                </TouchableOpacity>
                <Text style={styles.timeSep}>:</Text>
                <TouchableOpacity style={styles.timeButton} onPress={onMinPress} activeOpacity={0.7}>
                    <Text style={styles.timeText}>{min.toString().padStart(2, '0')}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const items = pickerType === 'hour'
        ? Array.from({ length: 24 }, (_, i) => i)
        : [0, 15, 30, 45];

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>{t('calculadora.title')}</Text>
            </View>

            <View style={styles.content}>
                {/* Toggle tipo de turno */}
                <View style={styles.toggleContainer}>
                    <TouchableOpacity
                        style={[styles.toggleBtn, shiftType === 'single' && styles.toggleBtnActive]}
                        onPress={() => { setShiftType('single'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.toggleText, shiftType === 'single' && styles.toggleTextActive]}>
                            Turno Simple
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.toggleBtn, shiftType === 'split' && styles.toggleBtnActive]}
                        onPress={() => { setShiftType('split'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.toggleText, shiftType === 'split' && styles.toggleTextActive]}>
                            Turno Partido
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Turno 1 */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        {shiftType === 'split' ? 'PRIMER TURNO' : 'HORARIO LABORAL'}
                    </Text>
                    <View style={styles.timeRow}>
                        <TimePicker
                            hour={start1Hour}
                            min={start1Min}
                            onHourPress={() => openPicker('hour', start1Hour, setStart1Hour)}
                            onMinPress={() => openPicker('minute', start1Min, setStart1Min)}
                            label={t('fichaje.entry')}
                        />
                        <TimePicker
                            hour={end1Hour}
                            min={end1Min}
                            onHourPress={() => openPicker('hour', end1Hour, setEnd1Hour)}
                            onMinPress={() => openPicker('minute', end1Min, setEnd1Min)}
                            label={t('fichaje.exit')}
                        />
                    </View>
                </View>

                {/* Turno 2 */}
                {shiftType === 'split' && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>SEGUNDO TURNO</Text>
                        <View style={styles.timeRow}>
                            <TimePicker
                                hour={start2Hour}
                                min={start2Min}
                                onHourPress={() => openPicker('hour', start2Hour, setStart2Hour)}
                                onMinPress={() => openPicker('minute', start2Min, setStart2Min)}
                                label={t('fichaje.entry')}
                            />
                            <TimePicker
                                hour={end2Hour}
                                min={end2Min}
                                onHourPress={() => openPicker('hour', end2Hour, setEnd2Hour)}
                                onMinPress={() => openPicker('minute', end2Min, setEnd2Min)}
                                label={t('fichaje.exit')}
                            />
                        </View>
                    </View>
                )}

                {/* Descanso */}
                <View style={styles.breakSection}>
                    <Text style={styles.breakLabel}>{t('fichaje.breakTime')}: <Text style={styles.breakValue}>{breakMins} min</Text></Text>
                    <View style={styles.breakControls}>
                        <TouchableOpacity
                            style={styles.breakBtn}
                            onPress={() => adjust(setBreakMins, breakMins, 480, -15)}
                        >
                            <Text style={styles.breakBtnText}>−15</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.breakBtn}
                            onPress={() => adjust(setBreakMins, breakMins, 480, 15)}
                        >
                            <Text style={styles.breakBtnText}>+15</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Resultado */}
                <View style={styles.result}>
                    <Text style={styles.resultLabel}>TOTAL</Text>
                    <View style={styles.resultValue}>
                        <Text style={styles.resultNum}>{totalH}</Text>
                        <Text style={styles.resultUnit}>h</Text>
                        <Text style={styles.resultNum}>{totalM}</Text>
                        <Text style={styles.resultUnit}>m</Text>
                    </View>
                </View>
            </View>

            {/* Picker Modal estilo iOS */}
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
                                <Text style={styles.modalCancel}>{t('common.cancel')}</Text>
                            </TouchableOpacity>
                            <Text style={styles.modalTitle}>
                                {pickerType === 'hour' ? 'Seleccionar Hora' : 'Seleccionar Minutos'}
                            </Text>
                            <TouchableOpacity onPress={() => confirmPicker(currentValue)}>
                                <Text style={styles.modalConfirm}>{t('common.confirm')}</Text>
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.pickerScroll}>
                            {items.map((item) => (
                                <TouchableOpacity
                                    key={item}
                                    style={[
                                        styles.pickerItem,
                                        currentValue === item && styles.pickerItemSelected
                                    ]}
                                    onPress={() => setCurrentValue(item)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[
                                        styles.pickerItemText,
                                        currentValue === item && styles.pickerItemTextSelected
                                    ]}>
                                        {item.toString().padStart(2, '0')}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
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
    header: {
        backgroundColor: Colors.light.cardBackground,
        paddingVertical: 20,
        paddingHorizontal: 24,
        paddingTop: 83,
        borderBottomWidth: 1,
        borderBottomColor: Colors.light.border,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: Colors.light.text,
    },
    content: {
        flex: 1,
        padding: 16,
    },
    toggleContainer: {
        flexDirection: 'row',
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        padding: 4,
        marginBottom: 16,
    },
    toggleBtn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    toggleBtnActive: {
        backgroundColor: Colors.light.primary,
    },
    toggleText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.light.textSecondary,
    },
    toggleTextActive: {
        color: '#FFFFFF',
    },
    section: {
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.light.text,
        marginBottom: 12,
    },
    timeRow: {
        flexDirection: 'row',
        gap: 12,
    },
    timePicker: {
        flex: 1,
        backgroundColor: Colors.light.cardBackground,
        borderRadius: 12,
        padding: 16,
    },
    timePickerLabel: {
        fontSize: 12,
        color: Colors.light.textSecondary,
        marginBottom: 12,
        textAlign: 'center',
        fontWeight: '500',
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
    breakSection: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: Colors.light.cardBackground,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
    },
    breakLabel: {
        fontSize: 15,
        color: Colors.light.text,
        fontWeight: '500',
    },
    breakValue: {
        fontWeight: 'bold',
        color: Colors.light.primary,
    },
    breakControls: {
        flexDirection: 'row',
        gap: 8,
    },
    breakBtn: {
        backgroundColor: Colors.light.primary,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    breakBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    result: {
        backgroundColor: Colors.light.primary,
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
    },
    resultLabel: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.8)',
        fontWeight: '600',
        letterSpacing: 2,
        marginBottom: 8,
    },
    resultValue: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 4,
    },
    resultNum: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    resultUnit: {
        fontSize: 18,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.9)',
    },
    // Modal Picker
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
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.light.primary,
    },
});
