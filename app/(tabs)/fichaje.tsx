import type { ClockEntry } from '@/lib/supabase';
import { clockService, type EntryType } from '@/services/clock.service';
import { notificationService } from '@/services/notification.service';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';



export default function FichajeScreen() {
  const { t } = useTranslation();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lastEntry, setLastEntry] = useState<ClockEntry | null>(null);
  const [todayEntries, setTodayEntries] = useState<ClockEntry[]>([]);
  const [nextEntryType, setNextEntryType] = useState<EntryType>('ENTRADA');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Estado para el descanso activo
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [breakStartTime, setBreakStartTime] = useState<Date | null>(null);
  const [breakElapsedSeconds, setBreakElapsedSeconds] = useState(0);

  // Actualizar el reloj cada segundo
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Contador del descanso
  useEffect(() => {
    if (!isOnBreak || !breakStartTime) return;

    const breakTimer = setInterval(() => {
      const elapsed = Math.floor((new Date().getTime() - breakStartTime.getTime()) / 1000);
      setBreakElapsedSeconds(elapsed);
    }, 1000);

    return () => clearInterval(breakTimer);
  }, [isOnBreak, breakStartTime]);

  // Configurar notificaciones
  useEffect(() => {
    if (!notificationService.isSupported()) return;

    // Configurar cómo se manejan las notificaciones
    notificationService.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    // Solicitar permisos de notificaciones
    registerForPushNotificationsAsync();
  }, []);

  const registerForPushNotificationsAsync = async () => {
    if (!notificationService.isSupported()) return;

    const { status: existingStatus } = await notificationService.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await notificationService.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('No se obtuvieron permisos para notificaciones');
    }
  };

  const scheduleBreakNotification = async () => {
    if (!notificationService.isSupported()) {
      console.log('Notificaciones no soportadas en Expo Go (Android)');
      return;
    }

    try {
      // Programar notificación para 30 minutos en el futuro
      await notificationService.scheduleNotificationAsync({
        content: {
          title: "⏰ Descanso completado",
          body: "Has cumplido tus 30 minutos de descanso. ¡Es hora de volver al trabajo!",
          sound: true,
        },
        trigger: {
          type: notificationService.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 1800, // 30 minutos
          repeats: false,
        },
      });

      console.log('Notificación programada para 30 minutos');
    } catch (error) {
      console.error('Error programando notificación:', error);
    }
  };

  // Cargar fichajes cuando la pantalla está en foco
  useFocusEffect(
    useCallback(() => {
      loadTodayEntries();
    }, [])
  );

  const loadTodayEntries = async () => {
    setIsFetching(true);
    try {
      // Obtener fichajes de hoy
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const result = await clockService.getMyEntries(today, tomorrow);

      if (result.success && result.entries) {
        const entries = result.entries.sort((a, b) =>
          new Date(a.clock_time).getTime() - new Date(b.clock_time).getTime()
        );
        setTodayEntries(entries);

        // Último fichaje
        if (entries.length > 0) {
          const last = entries[entries.length - 1];
          setLastEntry(last);
          determineNextEntryType(last, entries);
        } else {
          setLastEntry(null);
          setNextEntryType('ENTRADA');
        }
      }
    } catch (error) {
      console.error('Error loading today entries:', error);
    } finally {
      setIsFetching(false);
    }
  };

  const loadLastEntry = loadTodayEntries; // Alias para compatibilidad

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTodayEntries();
    setRefreshing(false);
  };

  const hasBreakToday = (entries: ClockEntry[]): boolean => {
    return entries.some(entry => entry.entry_type === 'DESCANSO');
  };

  const determineNextEntryType = (entry: ClockEntry, entries: ClockEntry[] = []) => {
    // Lógica simple: alterna entre ENTRADA y SALIDA
    if (entry.entry_type === 'ENTRADA') {
      setNextEntryType('SALIDA');
    } else if (entry.entry_type === 'SALIDA') {
      setNextEntryType('ENTRADA_2'); // Después de salida, podría haber turno partido
    } else if (entry.entry_type === 'ENTRADA_2') {
      setNextEntryType('SALIDA_2');
    } else if (entry.entry_type === 'SALIDA_2') {
      setNextEntryType('ENTRADA');
    } else if (entry.entry_type === 'DESCANSO') {
      setNextEntryType('SALIDA'); // After a break, the next logical step is to clock out
    } else {
      setNextEntryType('ENTRADA');
    }
  };

  const hasBreakInCurrentShift = (entries: ClockEntry[], exitType: EntryType): boolean => {
    // Para SALIDA, verificar si hay DESCANSO entre ENTRADA y ahora
    if (exitType === 'SALIDA') {
      const entradaIndex = entries.findIndex(e => e.entry_type === 'ENTRADA');
      if (entradaIndex === -1) return false;

      // Buscar DESCANSO después de ENTRADA pero antes de cualquier ENTRADA_2
      const entrada2Index = entries.findIndex(e => e.entry_type === 'ENTRADA_2');
      const endIndex = entrada2Index !== -1 ? entrada2Index : entries.length;

      return entries.slice(entradaIndex, endIndex).some(e => e.entry_type === 'DESCANSO');
    }

    // Para SALIDA_2, verificar si hay DESCANSO entre ENTRADA_2 y ahora
    if (exitType === 'SALIDA_2') {
      const entrada2Index = entries.findIndex(e => e.entry_type === 'ENTRADA_2');
      if (entrada2Index === -1) return false;

      return entries.slice(entrada2Index).some(e => e.entry_type === 'DESCANSO');
    }

    return false;
  };

  const handleClockIn = async (entryType: EntryType) => {
    if (isLoading) return;

    // Si es SALIDA o SALIDA_2, verificar si tuvo descanso EN ESE TURNO
    if ((entryType === 'SALIDA' || entryType === 'SALIDA_2') && !hasBreakInCurrentShift(todayEntries, entryType)) {
      // Preguntar si tuvo descanso
      const shift = entryType === 'SALIDA' ? t('fichaje.alerts.firstShift') : t('fichaje.alerts.secondShift');
      Alert.alert(
        t('fichaje.break'),
        t('fichaje.alerts.breakQuestion', { shift }),
        [
          {
            text: t('common.yes'),
            onPress: async () => {
              // Registrar descanso automáticamente
              await registerBreakAndExit(entryType, true);
            }
          },
          {
            text: t('common.no'),
            onPress: async () => {
              // Añadir 30min a la hora de salida
              await registerBreakAndExit(entryType, false);
            }
          },
          {
            text: t('common.cancel'),
            style: 'cancel'
          }
        ]
      );
      return;
    }

    // Continuar con fichaje normal
    await performClockIn(entryType);
  };

  const registerBreakAndExit = async (exitType: EntryType, hadBreak: boolean) => {
    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      if (hadBreak) {
        // Registrar 2 fichajes de DESCANSO (inicio y fin)
        await clockService.clockEntry('DESCANSO');
        await clockService.clockEntry('DESCANSO');

        // Registrar salida normal
        const result = await clockService.clockEntry(exitType);

        if (result.success && result.entry) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          await loadTodayEntries();

          Alert.alert(
            t('fichaje.alerts.clockRegistered'),
            t('fichaje.alerts.breakRecorded'),
            [{ text: 'OK' }]
          );
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert(t('common.error'), result.error || t('errors.saveFailed'));
        }
      } else {
        // NO tuvo descanso: registrar descanso obligatorio + salida con +30min
        // 1. Registrar 2 fichajes de DESCANSO (inicio y fin) en la hora actual
        await clockService.clockEntry('DESCANSO');
        await clockService.clockEntry('DESCANSO');

        // 2. Calcular hora de salida con +30 minutos
        const exitTime = new Date();
        exitTime.setMinutes(exitTime.getMinutes() + 30);

        // 3. Registrar salida con hora personalizada (+30min)
        const result = await clockService.clockEntry(exitType, exitTime);

        if (result.success && result.entry) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          await loadTodayEntries();

          const time = `${exitTime.getHours().toString().padStart(2, '0')}:${exitTime.getMinutes().toString().padStart(2, '0')}`;
          Alert.alert(
            t('fichaje.alerts.clockRegistered'),
            t('fichaje.alerts.breakAndExit', { exitType: getNextEntryLabel(exitType), time }),
            [{ text: 'OK' }]
          );
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert(t('common.error'), result.error || t('errors.saveFailed'));
        }
      }
    } catch (error) {
      console.error('Error en fichaje con descanso:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common.error'), t('errors.saveFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const performClockIn = async (entryType: EntryType) => {
    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Si es DESCANSO, iniciar el contador
      if (entryType === 'DESCANSO') {
        const result = await clockService.clockEntry('DESCANSO');

        if (result.success && result.entry) {
          // Iniciar el contador del descanso
          setIsOnBreak(true);
          setBreakStartTime(new Date(result.entry.clock_time));
          setBreakElapsedSeconds(0);

          // Programar notificación para 20 segundos en el futuro
          await scheduleBreakNotification();

          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

          Alert.alert(
            t('fichaje.alerts.breakStarted'),
            notificationService.isSupported()
              ? t('fichaje.alerts.notificationIn30')
              : t('fichaje.alerts.notificationRequiresBuild'),
            [{ text: 'OK' }]
          );

          await loadTodayEntries();
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert(t('common.error'), result.error || t('errors.saveFailed'));
        }
      } else {
        // Fichaje normal (ENTRADA/SALIDA)
        const result = await clockService.clockEntry(entryType);

        if (result.success && result.entry) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

          await loadTodayEntries();

          Alert.alert(
            t('fichaje.alerts.clockRegistered'),
            `${getNextEntryLabel(entryType)} ${t('fichaje.registeredCorrectly')}`,
            [{ text: t('common.ok') }]
          );
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert(t('common.error'), result.error || t('errors.saveFailed'));
        }
      }
    } catch (error) {
      console.error('Error registrando fichaje:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common.error'), t('errors.saveFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const finishBreak = async () => {
    if (!isOnBreak || !breakStartTime) return;

    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Registrar el fin del descanso
      const result = await clockService.clockEntry('DESCANSO');

      if (result.success) {
        setIsOnBreak(false);
        setBreakStartTime(null);
        setBreakElapsedSeconds(0);

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await loadTodayEntries();

        const minutes = Math.floor(breakElapsedSeconds / 60);
        const seconds = breakElapsedSeconds % 60;

        Alert.alert(
          t('fichaje.alerts.breakFinished'),
          t('fichaje.alerts.duration', { minutes, seconds }),
          [{ text: t('common.ok') }]
        );
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert(t('common.error'), result.error || t('errors.saveFailed'));
      }
    } catch (error) {
      console.error('Error finalizando descanso:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common.error'), t('errors.saveFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const getAvailableActions = (): EntryType[] => {
    // Si está en descanso, no mostrar ningún botón (solo "Finalizar descanso")
    if (isOnBreak) {
      return [];
    }

    if (!lastEntry) {
      return ['ENTRADA'];
    }

    // Después de ENTRADA, mostrar DESCANSO y SALIDA
    if (lastEntry.entry_type === 'ENTRADA') {
      return ['DESCANSO', 'SALIDA'];
    }

    // Después de SALIDA, alternar entre ENTRADA y ENTRADA_2 para soportar turnos ilimitados
    if (lastEntry.entry_type === 'SALIDA') {
      const salidasCount = todayEntries.filter(e => e.entry_type === 'SALIDA').length;
      // Primera salida → ENTRADA_2, siguientes salidas → alternar
      return salidasCount % 2 === 1 ? ['ENTRADA_2'] : ['ENTRADA'];
    }

    // Después de ENTRADA_2, mostrar DESCANSO y SALIDA_2
    if (lastEntry.entry_type === 'ENTRADA_2') {
      return ['DESCANSO', 'SALIDA_2'];
    }

    // Después de SALIDA_2, permitir más turnos alternando tipos
    if (lastEntry.entry_type === 'SALIDA_2') {
      const salidas2Count = todayEntries.filter(e => e.entry_type === 'SALIDA_2').length;
      return salidas2Count % 2 === 1 ? ['ENTRADA'] : ['ENTRADA_2'];
    }

    // Después de DESCANSO, determinar SALIDA correcta según última entrada
    if (lastEntry.entry_type === 'DESCANSO') {
      const descansoIndex = todayEntries.findIndex(e => e.id === lastEntry.id);
      const entriesBeforeBreak = todayEntries.slice(0, descansoIndex);
      const lastEntrada = [...entriesBeforeBreak].reverse().find(
        e => e.entry_type === 'ENTRADA' || e.entry_type === 'ENTRADA_2'
      );
      return lastEntrada?.entry_type === 'ENTRADA_2' ? ['SALIDA_2'] : ['SALIDA'];
    }

    return ['ENTRADA'];
  };

  // Calcular etiqueta para el próximo fichaje (para botones)
  const getNextEntryLabel = (type: EntryType): string => {
    if (type === 'DESCANSO') return t('fichaje.break');

    const entradasCount = todayEntries.filter(e =>
      e.entry_type === 'ENTRADA' || e.entry_type === 'ENTRADA_2'
    ).length;

    const salidasCount = todayEntries.filter(e =>
      e.entry_type === 'SALIDA' || e.entry_type === 'SALIDA_2'
    ).length;

    if (type === 'ENTRADA' || type === 'ENTRADA_2') {
      const turnoNum = entradasCount + 1;
      return t('fichaje.nthEntry', { n: turnoNum });
    }

    if (type === 'SALIDA' || type === 'SALIDA_2') {
      const turnoNum = salidasCount + 1;
      return t('fichaje.nthExit', { n: turnoNum });
    }

    return type;
  };

  // Calcular etiqueta para fichaje existente (para historial)
  const getEntryLabel = (entry: ClockEntry, allEntries: ClockEntry[]): string => {
    if (entry.entry_type === 'DESCANSO') return t('fichaje.break');

    // Encontrar la posición de esta entrada específica entre todas las entradas/salidas
    const sortedEntries = [...allEntries].sort((a, b) =>
      new Date(a.clock_time).getTime() - new Date(b.clock_time).getTime()
    );

    if (entry.entry_type === 'ENTRADA' || entry.entry_type === 'ENTRADA_2') {
      const entradasBeforeThis = sortedEntries.filter((e, idx) =>
        (e.entry_type === 'ENTRADA' || e.entry_type === 'ENTRADA_2') &&
        sortedEntries.indexOf(e) <= sortedEntries.indexOf(entry)
      );
      return t('fichaje.nthEntry', { n: entradasBeforeThis.length });
    }

    if (entry.entry_type === 'SALIDA' || entry.entry_type === 'SALIDA_2') {
      const salidasBeforeThis = sortedEntries.filter((e, idx) =>
        (e.entry_type === 'SALIDA' || e.entry_type === 'SALIDA_2') &&
        sortedEntries.indexOf(e) <= sortedEntries.indexOf(entry)
      );
      return t('fichaje.nthExit', { n: salidasBeforeThis.length });
    }

    return entry.entry_type;
  };

  // Calcular tiempo total de descanso del día (en minutos)
  const calculateBreakTime = (entries: ClockEntry[]): number => {
    const sortedEntries = [...entries].sort((a, b) =>
      new Date(a.clock_time).getTime() - new Date(b.clock_time).getTime()
    );

    const descansos = sortedEntries.filter(e => e.entry_type === 'DESCANSO');
    let totalBreakMinutes = 0;

    // Calcular diferencia entre cada par de DESCANSO
    for (let i = 0; i < descansos.length - 1; i += 2) {
      const start = new Date(descansos[i].clock_time).getTime();
      const end = new Date(descansos[i + 1].clock_time).getTime();
      totalBreakMinutes += (end - start) / (1000 * 60);
    }

    // Si está en descanso ahora, añadir tiempo actual
    if (isOnBreak && breakStartTime) {
      const currentBreakMinutes = (new Date().getTime() - breakStartTime.getTime()) / (1000 * 60);
      totalBreakMinutes += currentBreakMinutes;
    }

    return Math.floor(totalBreakMinutes);
  };

  // Calcular horas trabajadas del día (en minutos)
  const calculateWorkedHours = (entries: ClockEntry[]): number => {
    const sortedEntries = [...entries].sort((a, b) =>
      new Date(a.clock_time).getTime() - new Date(b.clock_time).getTime()
    );

    let totalWorkedMinutes = 0;

    // Encontrar todos los pares ENTRADA-SALIDA
    const entradas = sortedEntries.filter(e => e.entry_type === 'ENTRADA' || e.entry_type === 'ENTRADA_2');
    const salidas = sortedEntries.filter(e => e.entry_type === 'SALIDA' || e.entry_type === 'SALIDA_2');

    // Calcular tiempo entre cada par
    const pairs = Math.min(entradas.length, salidas.length);
    for (let i = 0; i < pairs; i++) {
      const entradaTime = new Date(entradas[i].clock_time).getTime();
      const salidaTime = new Date(salidas[i].clock_time).getTime();
      totalWorkedMinutes += (salidaTime - entradaTime) / (1000 * 60);
    }

    // Restar tiempo de descanso
    const breakMinutes = calculateBreakTime(entries);
    totalWorkedMinutes -= breakMinutes;

    return Math.max(0, Math.floor(totalWorkedMinutes));
  };

  const formatEntryTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const getButtonColor = (type: EntryType) => {
    if (type === 'ENTRADA' || type === 'ENTRADA_2') {
      return '#4caf50'; // Verde
    }
    if (type === 'DESCANSO') {
      return '#FF9800'; // Naranja
    }
    return '#f44336'; // Rojo
  };

  // Formatear fecha
  const formatDate = (date: Date) => {
    const days = [
      t('fichaje.days.sunday'),
      t('fichaje.days.monday'),
      t('fichaje.days.tuesday'),
      t('fichaje.days.wednesday'),
      t('fichaje.days.thursday'),
      t('fichaje.days.friday'),
      t('fichaje.days.saturday')
    ];
    const months = [
      t('fichaje.months.january'),
      t('fichaje.months.february'),
      t('fichaje.months.march'),
      t('fichaje.months.april'),
      t('fichaje.months.may'),
      t('fichaje.months.june'),
      t('fichaje.months.july'),
      t('fichaje.months.august'),
      t('fichaje.months.september'),
      t('fichaje.months.october'),
      t('fichaje.months.november'),
      t('fichaje.months.december')
    ];

    const dayName = days[date.getDay()];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();

    return `${dayName}, ${day} de ${month} de ${year}`;
  };

  // Formatear hora
  const formatTime = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  const buttonColor = getButtonColor(nextEntryType);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#4caf50']}
            tintColor="#4caf50"
          />
        }
      >
        {/* Sección del Reloj */}
        <View style={styles.clockSection}>
          <Text style={styles.dateText}>{formatDate(currentTime)}</Text>
          <Text style={styles.timeText}>{formatTime(currentTime)}</Text>

          {/* Indicador de Estado */}
          {isFetching ? (
            <View style={styles.statusContainer}>
              <ActivityIndicator size="small" color="#4caf50" />
              <Text style={[styles.statusText, { marginLeft: 8 }]}>{t('fichaje.loading')}</Text>
            </View>
          ) : (
            <View style={styles.statusContainer}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>{t('fichaje.readyToClock')}</Text>
            </View>
          )}
        </View>

        {/* Contador del Descanso Activo */}
        {isOnBreak && (
          <View style={styles.breakTimerSection}>
            <Text style={styles.breakTimerTitle}>{t('fichaje.breakInProgress')}</Text>
            <View style={styles.breakTimerDisplay}>
              <Text style={styles.breakTimerText}>
                {String(Math.floor(breakElapsedSeconds / 3600)).padStart(2, '0')}:
                {String(Math.floor((breakElapsedSeconds % 3600) / 60)).padStart(2, '0')}:
                {String(breakElapsedSeconds % 60).padStart(2, '0')}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.finishBreakButton}
              onPress={finishBreak}
              disabled={isLoading}
            >
              <Text style={styles.finishBreakButtonText}>{t('fichaje.finishBreak')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Sección de Fichaje Rápido */}
        <View style={styles.actionSection}>
          <Text style={styles.sectionTitle}>{t('fichaje.quickClock')}</Text>

          {/* Botones dinámicos según acciones disponibles */}
          {getAvailableActions().map((actionType, index) => {
            const buttonColor = getButtonColor(actionType);
            const isBreak = actionType === 'DESCANSO';

            return (
              <TouchableOpacity
                key={actionType}
                style={[
                  styles.actionButton,
                  { borderLeftColor: buttonColor, borderLeftWidth: 6 },
                  index > 0 && { marginTop: 16 },
                ]}
                onPress={() => handleClockIn(actionType)}
                activeOpacity={0.8}
                disabled={isLoading || isFetching}
              >
                {isLoading ? (
                  <>
                    <View style={[styles.buttonIcon, { backgroundColor: `${buttonColor}20` }]}>
                      <ActivityIndicator size="large" color={buttonColor} />
                    </View>
                    <View style={styles.buttonContent}>
                      <Text style={styles.buttonTitle}>{t('common.loading')}</Text>
                      <Text style={styles.buttonSubtitle}>{t('fichaje.pleaseWait')}</Text>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={[styles.buttonIcon, { backgroundColor: `${buttonColor}20` }]}>
                      <Text style={[styles.iconText, { color: buttonColor }]}>
                        {actionType === 'ENTRADA' || actionType === 'ENTRADA_2' ? '→' :
                          actionType === 'DESCANSO' ? '☕' : '←'}
                      </Text>
                    </View>
                    <View style={styles.buttonContent}>
                      <Text style={styles.buttonTitle}>
                        {isBreak ? t('fichaje.startBreak') : `${t('fichaje.clockIn')} ${getNextEntryLabel(actionType)}`}
                      </Text>
                      <Text style={styles.buttonSubtitle}>
                        {isBreak
                          ? t('fichaje.pauseWorkday')
                          : actionType === 'ENTRADA'
                            ? t('fichaje.startWorkday')
                            : actionType === 'ENTRADA_2'
                              ? t('fichaje.startSecondShift')
                              : actionType === 'SALIDA'
                                ? t('fichaje.endFirstShift')
                                : t('fichaje.endWorkday')}
                      </Text>
                    </View>
                  </>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Fichajes de Hoy */}
        {todayEntries.length > 0 && !isFetching ? (
          <View style={styles.lastEntrySection}>
            <Text style={styles.lastEntryLabel}>{t('fichaje.todaysClocks')}</Text>
            {todayEntries.map((entry, index) => {
              const entryColor = getButtonColor(entry.entry_type);
              // Colores pasteles para el fondo
              const bgColor = entry.entry_type.includes('ENTRADA')
                ? '#E8F5E9'  // Verde claro
                : entry.entry_type.includes('SALIDA')
                  ? '#FFEBEE'  // Rojo claro
                  : '#FFF3E0'; // Naranja claro

              return (
                <View
                  key={`${entry.id}-${index}`}
                  style={[
                    styles.lastEntryContainer,
                    {
                      backgroundColor: bgColor,
                      borderRadius: 8,
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      borderLeftWidth: 4,
                      borderLeftColor: entryColor,
                    },
                    index > 0 && { marginTop: 8 }
                  ]}
                >
                  <Text style={[styles.lastEntryType, { color: entryColor, fontWeight: '600' }]}>
                    {getEntryLabel(entry, todayEntries)}
                  </Text>
                  <Text style={[styles.lastEntryTime, { color: '#666', fontWeight: 'bold' }]}>
                    {formatEntryTime(entry.clock_time)}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : null}

        {/* Resumen del día */}
        {todayEntries.length > 0 && !isFetching && (
          <View style={styles.summarySection}>
            <View style={styles.summaryCard}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryItemLabel}>{t('fichaje.workedHours')}</Text>
                <Text style={styles.summaryItemValue}>
                  {Math.floor(calculateWorkedHours(todayEntries) / 60)}h {calculateWorkedHours(todayEntries) % 60}m
                </Text>
              </View>
              <View style={styles.summaryVerticalDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryItemLabel}>{t('fichaje.breakTime')}</Text>
                <Text style={styles.summaryItemValue}>
                  {Math.floor(calculateBreakTime(todayEntries) / 60)}h {calculateBreakTime(todayEntries) % 60}m
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView >
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  clockSection: {
    backgroundColor: '#fff',
    padding: 16,
    paddingTop: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  dateText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  timeText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4caf50',
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#2e7d32',
    fontWeight: '500',
  },
  actionSection: {
    padding: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },
  checkInButton: {
    borderLeftWidth: 6,
    borderLeftColor: '#4caf50',
  },
  buttonIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e8f5e9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  iconText: {
    fontSize: 24,
    color: '#4caf50',
  },
  buttonContent: {
    flex: 1,
  },
  buttonTitle: {
    fontSize: 21,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 3,
  },
  buttonSubtitle: {
    fontSize: 13,
    color: '#666',
  },
  lastEntrySection: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginVertical: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  lastEntryLabel: {
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  lastEntryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastEntryType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  lastEntryTime: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2196f3',
  },
  breakTimerSection: {
    backgroundColor: '#FFF3E0',
    margin: 16,
    marginTop: 0,
    padding: 24,
    borderRadius: 16,
    borderLeftWidth: 6,
    borderLeftColor: '#FF9800',
    alignItems: 'center',
  },
  breakTimerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF9800',
    marginBottom: 16,
  },
  breakTimerDisplay: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  breakTimerText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FF9800',
    fontVariant: ['tabular-nums'],
  },
  finishBreakButton: {
    backgroundColor: '#f44336',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  finishBreakButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  summarySection: {
    margin: 12,
    marginTop: 0,
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: '#4A90E2',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryItemLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryItemValue: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  summaryVerticalDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 16,
  },
});
