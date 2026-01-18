import type { ClockEntry } from '@/lib/supabase';
import { clockService, type EntryType } from '@/services/clock.service';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useState } from 'react';
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
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lastEntry, setLastEntry] = useState<ClockEntry | null>(null);
  const [todayEntries, setTodayEntries] = useState<ClockEntry[]>([]);
  const [nextEntryType, setNextEntryType] = useState<EntryType>('ENTRADA');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Actualizar el reloj cada segundo
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

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

  const handleClockIn = async (entryType: EntryType) => {
    if (isLoading) return;

    // Si es SALIDA o SALIDA_2, verificar si tuvo descanso
    if ((entryType === 'SALIDA' || entryType === 'SALIDA_2') && !hasBreakToday(todayEntries)) {
      // Preguntar si tuvo descanso
      Alert.alert(
        'Descanso',
        '¿Has realizado descanso de 30 minutos en tu jornada laboral?',
        [
          {
            text: 'Sí',
            onPress: async () => {
              // Registrar descanso automáticamente
              await registerBreakAndExit(entryType, true);
            }
          },
          {
            text: 'No',
            onPress: async () => {
              // Añadir 30min a la hora de salida
              await registerBreakAndExit(entryType, false);
            }
          },
          {
            text: 'Cancelar',
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
            '¡Fichaje registrado!',
            'Se ha registrado tu descanso y salida correctamente',
            [{ text: 'OK' }]
          );
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert('Error', result.error || 'No se pudo registrar el fichaje');
        }
      } else {
        // NO tuvo descanso: añadir 30 minutos a la hora de salida
        const exitTime = new Date();
        exitTime.setMinutes(exitTime.getMinutes() + 30);

        // Registrar salida con hora personalizada (+30min)
        const result = await clockService.clockEntry(exitType, exitTime);

        if (result.success && result.entry) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          await loadTodayEntries();

          Alert.alert(
            '¡Fichaje registrado!',
            `${getEntryTypeLabel(exitType)} registrada con 30 minutos adicionales por descanso obligatorio`,
            [{ text: 'OK' }]
          );
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert('Error', result.error || 'No se pudo registrar el fichaje');
        }
      }
    } catch (error) {
      console.error('Error en fichaje con descanso:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Ocurrió un error al registrar el fichaje');
    } finally {
      setIsLoading(false);
    }
  };

  const performClockIn = async (entryType: EntryType) => {
    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Si es DESCANSO, registrar automáticamente 30 minutos
      if (entryType === 'DESCANSO') {
        const result = await clockService.clockEntry('DESCANSO');

        if (result.success && result.entry) {
          // Registrar automáticamente fin de descanso después de 30 minutos
          await clockService.clockEntry('DESCANSO'); // El segundo DESCANSO marca el fin

          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert(
            '¡Descanso registrado!',
            'Se han registrado 30 minutos de descanso automáticamente',
            [{ text: 'OK' }]
          );

          // Recargar fichajes
          await loadTodayEntries();
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert('Error', result.error || 'No se pudo registrar el descanso');
        }
      } else {
        // Fichaje normal (ENTRADA/SALIDA)
        const result = await clockService.clockEntry(entryType);

        if (result.success && result.entry) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

          await loadTodayEntries();

          Alert.alert(
            '¡Fichaje registrado!',
            `${getEntryTypeLabel(entryType)} registrada correctamente`,
            [{ text: 'OK' }]
          );
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert('Error', result.error || 'No se pudo registrar el fichaje');
        }
      }
    } catch (error) {
      console.error('Error registrando fichaje:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Ocurrió un error al registrar el fichaje');
    } finally {
      setIsLoading(false);
    }
  };

  const getAvailableActions = (): EntryType[] => {
    if (!lastEntry) {
      return ['ENTRADA'];
    }

    // Después de ENTRADA, mostrar DESCANSO y SALIDA
    if (lastEntry.entry_type === 'ENTRADA') {
      return ['DESCANSO', 'SALIDA'];
    }

    // Después de SALIDA, mostrar ENTRADA
    if (lastEntry.entry_type === 'SALIDA') {
      return ['ENTRADA'];
    }

    // Después de DESCANSO, mostrar SALIDA
    if (lastEntry.entry_type === 'DESCANSO') {
      return ['SALIDA'];
    }

    return ['ENTRADA'];
  };

  const getEntryTypeLabel = (type: EntryType): string => {
    const labels: Record<EntryType, string> = {
      'ENTRADA': '1ª Entrada',
      'SALIDA': '1ª Salida',
      'ENTRADA_2': '2ª Entrada',
      'SALIDA_2': '2ª Salida',
      'DESCANSO': 'Descanso',
    };
    return labels[type];
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
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

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
              <Text style={[styles.statusText, { marginLeft: 8 }]}>Cargando...</Text>
            </View>
          ) : (
            <View style={styles.statusContainer}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Listo para fichar</Text>
            </View>
          )}
        </View>

        {/* Sección de Fichaje Rápido */}
        <View style={styles.actionSection}>
          <Text style={styles.sectionTitle}>Fichaje Rápido</Text>

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
                      <Text style={styles.buttonTitle}>Registrando...</Text>
                      <Text style={styles.buttonSubtitle}>Por favor espera</Text>
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
                        {isBreak ? 'Registrar Descanso' : `Fichar ${getEntryTypeLabel(actionType)}`}
                      </Text>
                      <Text style={styles.buttonSubtitle}>
                        {isBreak
                          ? '30 minutos automáticos'
                          : actionType === 'ENTRADA' || actionType === 'ENTRADA_2'
                            ? 'Iniciar jornada laboral'
                            : 'Finalizar jornada laboral'}
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
            <Text style={styles.lastEntryLabel}>Fichajes de hoy</Text>
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
                    {getEntryTypeLabel(entry.entry_type)}
                  </Text>
                  <Text style={[styles.lastEntryTime, { color: '#666', fontWeight: 'bold' }]}>
                    {formatEntryTime(entry.clock_time)}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
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
    padding: 24,
    paddingTop: 40,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  dateText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  timeText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
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
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  checkInButton: {
    borderLeftWidth: 6,
    borderLeftColor: '#4caf50',
  },
  buttonIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#e8f5e9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 20,
  },
  iconText: {
    fontSize: 32,
    color: '#4caf50',
  },
  buttonContent: {
    flex: 1,
  },
  buttonTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 6,
  },
  buttonSubtitle: {
    fontSize: 15,
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
});
