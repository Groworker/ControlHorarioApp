import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function PerfilScreen() {
    // Datos de ejemplo del trabajador
    const [worker] = useState({
        nombre: 'Juan',
        apellido: 'García Martínez',
        foto: null, // URL de la foto
        puesto: 'Desarrollador Senior',
        email: 'juan.garcia@empresa.com',
        telefono: '+34 612 345 678',
        fechaNacimiento: '15/03/1990',
    });

    const [estadisticas] = useState({
        horasMes: '168h 30m',
        horasAno: '2,048h 15m',
        solicitudesPendientes: 2,
        solicitudesAprobadas: 45,
    });

    const calcularEdad = (fechaNacimiento: string) => {
        const [dia, mes, ano] = fechaNacimiento.split('/').map(Number);
        const hoy = new Date();
        const nacimiento = new Date(ano, mes - 1, dia);
        let edad = hoy.getFullYear() - nacimiento.getFullYear();
        const m = hoy.getMonth() - nacimiento.getMonth();
        if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) {
            edad--;
        }
        return edad;
    };


    const InfoRow = ({ icon, label, value }: { icon: string; label: string; value: string }) => (
        <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
                <Ionicons name={icon as any} size={20} color={Colors.light.primary} />
            </View>
            <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>{label}</Text>
                <Text style={styles.infoValue}>{value}</Text>
            </View>
        </View>
    );

    const StatCard = ({ label, value, icon }: { label: string; value: string; icon: string }) => (
        <View style={styles.statCard}>
            <Ionicons name={icon as any} size={24} color={Colors.light.primary} />
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
    );

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
                <Text style={styles.title}>Mi Perfil</Text>
            </View>

            {/* Foto y Nombre */}
            <View style={styles.profileSection}>
                <View style={styles.avatarContainer}>
                    {worker.foto ? (
                        <Image source={{ uri: worker.foto }} style={styles.avatar} />
                    ) : (
                        <View style={styles.avatarPlaceholder}>
                            <Ionicons name="person" size={60} color={Colors.light.primary} />
                        </View>
                    )}
                </View>
                <Text style={styles.nombre}>{worker.nombre} {worker.apellido}</Text>
                <Text style={styles.puesto}>{worker.puesto}</Text>
            </View>

            {/* Información Personal */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Información Personal</Text>
                <View style={styles.card}>
                    <InfoRow icon="person-outline" label="Nombre Completo" value={`${worker.nombre} ${worker.apellido}`} />
                    <InfoRow icon="calendar-outline" label="Fecha de Nacimiento" value={`${worker.fechaNacimiento} (${calcularEdad(worker.fechaNacimiento)} años)`} />
                    <InfoRow icon="mail-outline" label="Correo Electrónico" value={worker.email} />
                    <InfoRow icon="call-outline" label="Teléfono" value={worker.telefono} />
                </View>
            </View>

            {/* Información Laboral */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Información Laboral</Text>
                <View style={styles.card}>
                    <InfoRow icon="briefcase-outline" label="Puesto" value={worker.puesto} />
                </View>
            </View>

            {/* Estadísticas */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Estadísticas</Text>
                <View style={styles.statsGrid}>
                    <StatCard label="Horas este mes" value={estadisticas.horasMes} icon="time-outline" />
                    <StatCard label="Horas este año" value={estadisticas.horasAno} icon="calendar-outline" />
                </View>
                <View style={styles.statsGrid}>
                    <StatCard label="Pendientes" value={estadisticas.solicitudesPendientes.toString()} icon="alert-circle-outline" />
                    <StatCard label="Aprobadas" value={estadisticas.solicitudesAprobadas.toString()} icon="checkmark-circle-outline" />
                </View>
            </View>

            {/* Acciones */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Configuración</Text>
                <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
                    <Ionicons name="camera-outline" size={20} color={Colors.light.primary} />
                    <Text style={styles.actionText}>Cambiar foto de perfil</Text>
                    <Ionicons name="chevron-forward" size={20} color={Colors.light.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
                    <Ionicons name="lock-closed-outline" size={20} color={Colors.light.primary} />
                    <Text style={styles.actionText}>Cambiar PIN</Text>
                    <Ionicons name="chevron-forward" size={20} color={Colors.light.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
                    <Ionicons name="notifications-outline" size={20} color={Colors.light.primary} />
                    <Text style={styles.actionText}>Notificaciones</Text>
                    <Ionicons name="chevron-forward" size={20} color={Colors.light.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionButton, styles.logoutButton]} activeOpacity={0.7}>
                    <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                    <Text style={[styles.actionText, styles.logoutText]}>Cerrar Sesión</Text>
                    <Ionicons name="chevron-forward" size={20} color="#EF4444" />
                </TouchableOpacity>
            </View>

            <View style={{ height: 40 }} />
        </ScrollView>
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
        paddingTop: 70,
        borderBottomWidth: 1,
        borderBottomColor: Colors.light.border,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: Colors.light.text,
    },
    profileSection: {
        alignItems: 'center',
        paddingVertical: 32,
        backgroundColor: Colors.light.cardBackground,
        borderBottomWidth: 1,
        borderBottomColor: Colors.light.border,
    },
    avatarContainer: {
        marginBottom: 16,
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 4,
        borderColor: Colors.light.primary,
    },
    avatarPlaceholder: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#EFF6FF',
        borderWidth: 4,
        borderColor: Colors.light.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    nombre: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.light.text,
        marginBottom: 4,
    },
    puesto: {
        fontSize: 16,
        color: Colors.light.textSecondary,
        marginBottom: 12,
    },
    badge: {
        backgroundColor: Colors.light.primary,
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
    },
    badgeText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    section: {
        padding: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: Colors.light.text,
        marginBottom: 12,
    },
    card: {
        backgroundColor: Colors.light.cardBackground,
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    infoRow: {
        flexDirection: 'row',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: Colors.light.borderLight,
    },
    infoIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#EFF6FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    infoContent: {
        flex: 1,
        justifyContent: 'center',
    },
    infoLabel: {
        fontSize: 12,
        color: Colors.light.textSecondary,
        marginBottom: 2,
    },
    infoValue: {
        fontSize: 15,
        color: Colors.light.text,
        fontWeight: '500',
    },
    statsGrid: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
    },
    statCard: {
        flex: 1,
        backgroundColor: Colors.light.cardBackground,
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    statValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.light.text,
        marginTop: 8,
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: Colors.light.textSecondary,
        textAlign: 'center',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.light.cardBackground,
        borderRadius: 12,
        padding: 16,
        marginBottom: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    actionText: {
        flex: 1,
        marginLeft: 12,
        fontSize: 16,
        color: Colors.light.text,
        fontWeight: '500',
    },
    logoutButton: {
        marginTop: 8,
    },
    logoutText: {
        color: '#EF4444',
    },
});
