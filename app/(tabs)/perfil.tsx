import { Colors } from '@/constants/Colors';
import { changeLanguage } from '@/i18n';
import { profilePictureService } from '@/services/profile-picture.service';
import { userService } from '@/services/user.service';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { CountryCode } from 'react-native-country-picker-modal';

type EditField = 'name' | 'birth_date' | 'email' | 'phone' | 'department' | 'weekly_hours' | null;

// Country codes with flags and names
const COUNTRIES = [
    { code: '+34', flag: '🇪🇸', name: 'España', cca2: 'ES' },
    { code: '+41', flag: '🇨🇭', name: 'Suiza', cca2: 'CH' },
    { code: '+33', flag: '🇫🇷', name: 'Francia', cca2: 'FR' },
    { code: '+49', flag: '🇩🇪', name: 'Alemania', cca2: 'DE' },
    { code: '+39', flag: '🇮🇹', name: 'Italia', cca2: 'IT' },
    { code: '+351', flag: '🇵🇹', name: 'Portugal', cca2: 'PT' },
    { code: '+44', flag: '🇬🇧', name: 'Reino Unido', cca2: 'GB' },
    { code: '+1', flag: '🇺🇸', name: 'Estados Unidos', cca2: 'US' },
];

// Job positions
const JOB_POSITIONS = [
    'Director/a',
    'Chef de Cocina',
    'Chef de Partie',
    'Segundo Chef',
    'Ayudante de Cocina',
    'Jefe/a de Sala',
    'Camarero/a',
    'Jefe/a de Housekeeping',
    'Housekeeping',
];

// Languages
const LANGUAGES = [
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'it', name: 'Italiano', flag: '🇮🇹' },
];

export default function PerfilScreen() {
    const { t, i18n } = useTranslation();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showAvatarOptions, setShowAvatarOptions] = useState(false);
    const [editingField, setEditingField] = useState<EditField>(null);
    const [editValue, setEditValue] = useState('');

    // Phone-specific states
    const [phoneNumber, setPhoneNumber] = useState('');
    const [phoneExtension, setPhoneExtension] = useState('');
    const [countryCode, setCountryCode] = useState<CountryCode>('ES');
    const [showCountryPicker, setShowCountryPicker] = useState(false);

    // Job position picker
    const [showJobPicker, setShowJobPicker] = useState(false);
    const [selectedJobPosition, setSelectedJobPosition] = useState('');

    // Language picker
    const [showLanguagePicker, setShowLanguagePicker] = useState(false);

    // User profile data
    const [userProfile, setUserProfile] = useState<{
        full_name: string;
        email: string;
        phone: string;
        phone_country_code: string;
        phone_extension: string;
        birth_date: string;
        department: string;
        avatar_url: string;
        weekly_hours: number;
    } | null>(null);

    // Date picker states
    const [selectedDate, setSelectedDate] = useState({ day: 1, month: 1, year: 2000 });
    const [datePickerVisible, setDatePickerVisible] = useState(false);

    // Cargar perfil cuando la pantalla está en foco
    useFocusEffect(
        useCallback(() => {
            loadProfile();
        }, [])
    );

    const loadProfile = async () => {
        setIsLoading(true);
        try {
            const result = await userService.getCurrentUserProfile();
            if (result.success && result.user) {
                const user = result.user;
                setUserProfile({
                    full_name: user.full_name,
                    email: user.email || '',
                    phone: user.phone || '',
                    phone_country_code: user.phone_country_code || '+34',
                    phone_extension: user.phone_extension || '',
                    birth_date: user.birth_date || '',
                    department: user.department || '',
                    avatar_url: user.avatar_url || '',
                    weekly_hours: user.weekly_hours || 40,
                });

                // Pre-fill form fields
                setPhoneNumber(user.phone || '');
                setPhoneExtension(user.phone_extension || '');
                // Convert phone_country_code to CountryCode (e.g., '+34' -> 'ES')
                const codeMap: Record<string, CountryCode> = { '+34': 'ES', '+41': 'CH', '+33': 'FR', '+49': 'DE', '+39': 'IT', '+351': 'PT', '+44': 'GB', '+1': 'US' };
                const savedCode = user.phone_country_code || '+34';
                setCountryCode(codeMap[savedCode] || 'ES');

            } else {
                Alert.alert('Error', result.error || 'No se pudo cargar el perfil');
            }
        } catch (error) {
            console.error('Error loading profile:', error);
            Alert.alert('Error', 'Ocurrió un error al cargar el perfil');
        } finally {
            setIsLoading(false);
        }
    };

    const openEditModal = (field: EditField, currentValue: string) => {
        setEditingField(field);

        if (field === 'birth_date' && currentValue) {
            // Parse date for date picker
            const date = new Date(currentValue);
            setSelectedDate({
                day: date.getDate(),
                month: date.getMonth() + 1,
                year: date.getFullYear(),
            });
            setDatePickerVisible(true);
        } else if (field === 'phone') {
            // Setup phone editing
            setPhoneNumber(userProfile?.phone || '');
            setPhoneExtension(userProfile?.phone_extension || '');
            const codeMap: Record<string, CountryCode> = { '+34': 'ES', '+41': 'CH', '+33': 'FR', '+49': 'DE', '+39': 'IT', '+351': 'PT', '+44': 'GB', '+1': 'US' };
            const savedCode = userProfile?.phone_country_code || '+34';
            setCountryCode(codeMap[savedCode] || 'ES');
            setShowEditModal(true);
        } else if (field === 'department') {
            // Show job picker
            setSelectedJobPosition(currentValue || '');
            setShowJobPicker(true);
        } else if (field === 'weekly_hours') {
            // For weekly_hours, convert number to string
            setEditValue(userProfile?.weekly_hours ? String(userProfile.weekly_hours) : '');
            setShowEditModal(true);
        } else {
            setEditValue(currentValue);
            setShowEditModal(true);
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const saveEdit = async () => {
        if (!editingField) return;

        let valueToSave = editValue.trim();

        // Validation
        if (!valueToSave && editingField !== 'phone') {
            Alert.alert('Error', 'Este campo no puede estar vacío');
            return;
        }

        if (editingField === 'email' && valueToSave && !userService.isValidEmail(valueToSave)) {
            Alert.alert('Error', 'Por favor ingresa un email válido');
            return;
        }

        if (editingField === 'weekly_hours') {
            const hoursValue = parseInt(valueToSave, 10);
            if (isNaN(hoursValue) || hoursValue < 0 || hoursValue > 168) {
                Alert.alert('Error', 'Por favor ingresa un número válido entre 0 y 168');
                return;
            }
        }

        setIsSaving(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            const updates: any = {};
            // Map frontend field names to database column names
            const fieldMapping: Record<string, string> = {
                'name': 'full_name',
                'email': 'email',
                'phone': 'phone',
                'department': 'department',
                'weekly_hours': 'weekly_hours',
            };

            const dbFieldName = editingField ? fieldMapping[editingField] || editingField : '';
            if (dbFieldName) {
                // Convert to number for weekly_hours
                if (editingField === 'weekly_hours') {
                    updates[dbFieldName] = parseInt(valueToSave, 10);
                } else {
                    updates[dbFieldName] = valueToSave;
                }
            }

            console.log('Updating profile with:', updates);
            const result = await userService.updateUserProfile(updates);
            console.log('Update result:', result);

            if (result.success && result.user) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setUserProfile({
                    full_name: result.user.full_name,
                    email: result.user.email || '',
                    phone: result.user.phone || '',
                    phone_country_code: result.user.phone_country_code || '+34',
                    phone_extension: result.user.phone_extension || '',
                    birth_date: result.user.birth_date || '',
                    department: result.user.department || '',
                    avatar_url: result.user.avatar_url || '',
                    weekly_hours: result.user.weekly_hours || 40,
                });
                setShowEditModal(false);
                setEditingField(null);
                setEditValue('');
            } else {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                Alert.alert('Error', result.error || 'No se pudo guardar');
            }
        } catch (error) {
            console.error('Error saving:', error);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Error', 'Ocurrió un error al guardar');
        } finally {
            setIsSaving(false);
        }
    };

    const savePhone = async () => {
        setIsSaving(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            // Get calling code from CountryPicker's internal data
            const selectedCountry = COUNTRIES.find(c => c.cca2 === countryCode);
            const phonePrefix = selectedCountry ? selectedCountry.code : '+34';

            const updates: any = {
                phone: phoneNumber.trim(),
                phone_country_code: phonePrefix,
                phone_extension: phoneExtension.trim(),
            };

            const result = await userService.updateUserProfile(updates);

            if (result.success && result.user) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setUserProfile(prev => prev ? {
                    ...prev,
                    phone: result.user!.phone || '',
                    phone_country_code: result.user!.phone_country_code || '+34',
                    phone_extension: result.user!.phone_extension || '',
                } : null);
                setShowEditModal(false);
            } else {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                Alert.alert('Error', result.error || 'No se pudo guardar');
            }
        } catch (error) {
            console.error('Error saving phone:', error);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Error', 'Ocurrió un error al guardar');
        } finally {
            setIsSaving(false);
        }
    };

    const saveJobPosition = async () => {
        if (!selectedJobPosition) {
            Alert.alert('Error', 'Por favor selecciona un puesto');
            return;
        }

        setIsSaving(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            const result = await userService.updateUserProfile({ department: selectedJobPosition });

            if (result.success && result.user) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setUserProfile(prev => prev ? { ...prev, department: selectedJobPosition } : null);
                setShowJobPicker(false);
            } else {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                Alert.alert('Error', result.error || 'No se pudo guardar');
            }
        } catch (error) {
            console.error('Error saving job position:', error);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Error', 'Ocurrió un error al guardar');
        } finally {
            setIsSaving(false);
        }
    };

    const saveBirthDate = async () => {
        const birthDate = new Date(selectedDate.year, selectedDate.month - 1, selectedDate.day);
        const formattedDate = birthDate.toISOString().split('T')[0]; // YYYY-MM-DD

        setIsSaving(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            const result = await userService.updateUserProfile({ birth_date: formattedDate });

            if (result.success && result.user) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setUserProfile(prev => prev ? { ...prev, birth_date: formattedDate } : null);
                setDatePickerVisible(false);
            } else {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                Alert.alert('Error', result.error || 'No se pudo guardar');
            }
        } catch (error) {
            console.error('Error saving birth date:', error);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Error', 'Ocurrió un error al guardar');
        } finally {
            setIsSaving(false);
        }
    };

    const calcularEdad = (fechaNacimiento: string) => {
        if (!fechaNacimiento) return 0;
        const hoy = new Date();
        const nacimiento = new Date(fechaNacimiento);
        let edad = hoy.getFullYear() - nacimiento.getFullYear();
        const m = hoy.getMonth() - nacimiento.getMonth();
        if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) {
            edad--;
        }
        return edad;
    };

    const handleAvatarUpload = async (source: 'gallery' | 'camera') => {
        setShowAvatarOptions(false);
        setIsUploadingAvatar(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            const pickResult = source === 'gallery'
                ? await profilePictureService.pickImageFromGallery()
                : await profilePictureService.pickImageFromCamera();

            if (!pickResult.success || !pickResult.uri) {
                if (pickResult.error !== 'Selección cancelada' && pickResult.error !== 'Captura cancelada') {
                    Alert.alert('Error', pickResult.error || 'No se pudo seleccionar la imagen');
                }
                setIsUploadingAvatar(false);
                return;
            }

            const uploadResult = await profilePictureService.uploadProfilePicture(pickResult.uri);

            if (uploadResult.success && uploadResult.avatarUrl) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setUserProfile(prev => prev ? { ...prev, avatar_url: uploadResult.avatarUrl! } : null);
            } else {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                Alert.alert('Error', uploadResult.error || 'No se pudo subir la imagen');
            }
        } catch (error) {
            console.error('Error uploading avatar:', error);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Error', 'Ocurrió un error al procesar la imagen');
        } finally {
            setIsUploadingAvatar(false);
        }
    };

    const formatDateDisplay = (dateString: string) => {
        if (!dateString) return 'No especificado';
        const date = new Date(dateString);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const formatPhoneDisplay = () => {
        if (!userProfile?.phone) return 'No especificado';

        const country = COUNTRIES.find(c => c.code === userProfile.phone_country_code);
        const flag = country?.flag || '📱';
        const countryName = country?.name || '';
        const ext = userProfile.phone_extension ? ` Ext. ${userProfile.phone_extension}` : '';

        return `${flag} ${userProfile.phone_country_code} ${userProfile.phone}${ext}`;
    };

    const getFieldLabel = (field: EditField): string => {
        const labels = {
            name: 'Nombre Completo',
            birth_date: 'Fecha de Nacimiento',
            email: 'Correo Electrónico',
            phone: 'Teléfono',
            department: 'Puesto',
            weekly_hours: 'Horas a la Semana',
        };
        return field ? labels[field] : '';
    };

    const EditableInfoRow = ({
        icon,
        label,
        value,
        field
    }: {
        icon: string;
        label: string;
        value: string;
        field: EditField;
    }) => (
        <TouchableOpacity
            style={styles.infoRow}
            onPress={() => openEditModal(field, value)}
            activeOpacity={0.7}
        >
            <View style={styles.infoIcon}>
                <Ionicons name={icon as any} size={20} color={Colors.light.primary} />
            </View>
            <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>{label}</Text>
                <Text style={styles.infoValue}>{value || 'No especificado'}</Text>
            </View>
            <Ionicons name="create-outline" size={20} color={Colors.light.textSecondary} />
        </TouchableOpacity>
    );

    if (isLoading) {
        return (
            <View style={[styles.container, styles.loadingContainer]}>
                <ActivityIndicator size="large" color={Colors.light.primary} />
                <Text style={styles.loadingText}>Cargando perfil...</Text>
            </View>
        );
    }

    if (!userProfile) {
        return (
            <View style={[styles.container, styles.loadingContainer]}>
                <Text style={styles.errorText}>No se pudo cargar el perfil</Text>
                <TouchableOpacity style={styles.retryButton} onPress={loadProfile}>
                    <Text style={styles.retryButtonText}>Reintentar</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const birthDateDisplay = userProfile.birth_date
        ? `${formatDateDisplay(userProfile.birth_date)} (${calcularEdad(userProfile.birth_date)} años)`
        : 'No especificado';

    return (
        <>
            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <Text style={styles.title}>Mi Perfil</Text>
                </View>

                {/* Foto y Nombre */}
                <View style={styles.profileSection}>
                    <View style={styles.avatarContainer}>
                        <TouchableOpacity
                            onPress={() => setShowAvatarOptions(true)}
                            activeOpacity={0.8}
                        >
                            {userProfile.avatar_url ? (
                                <Image
                                    source={{ uri: userProfile.avatar_url }}
                                    style={styles.avatarImage}
                                />
                            ) : (
                                <View style={styles.avatarPlaceholder}>
                                    <Ionicons name="person" size={60} color={Colors.light.primary} />
                                </View>
                            )}
                            <View style={styles.cameraButton}>
                                {isUploadingAvatar ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <Ionicons name="camera" size={20} color="#FFFFFF" />
                                )}
                            </View>
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.nombre}>{userProfile.full_name}</Text>
                    {userProfile.department && (
                        <Text style={styles.puesto}>{userProfile.department}</Text>
                    )}
                </View>

                {/* Información Personal */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Información Personal</Text>
                    <View style={styles.card}>
                        <EditableInfoRow
                            icon="person-outline"
                            label="Nombre Completo"
                            value={userProfile.full_name}
                            field="name"
                        />
                        <EditableInfoRow
                            icon="calendar-outline"
                            label="Fecha de Nacimiento"
                            value={birthDateDisplay}
                            field="birth_date"
                        />
                        <EditableInfoRow
                            icon="mail-outline"
                            label="Correo Electrónico"
                            value={userProfile.email}
                            field="email"
                        />
                        <EditableInfoRow
                            icon="call-outline"
                            label="Teléfono"
                            value={formatPhoneDisplay()}
                            field="phone"
                        />
                    </View>
                </View>

                {/* Información Laboral */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Información Laboral</Text>
                    <View style={styles.card}>
                        <EditableInfoRow
                            icon="briefcase-outline"
                            label="Puesto"
                            value={userProfile.department}
                            field="department"
                        />
                        <EditableInfoRow
                            icon="time-outline"
                            label="Horas a la Semana"
                            value={userProfile.weekly_hours ? `${userProfile.weekly_hours} horas` : 'No especificado'}
                            field="weekly_hours"
                        />
                    </View>
                </View>

                {/* Configuración */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Configuración</Text>
                    <View style={styles.card}>
                        <TouchableOpacity
                            style={styles.infoRow}
                            onPress={() => setShowLanguagePicker(true)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.infoLeft}>
                                <Ionicons name="language-outline" size={20} color="#64748B" style={styles.settingIcon} />
                                <Text style={styles.infoLabel}>Idioma</Text>
                            </View>
                            <View style={styles.infoRight}>
                                <Text style={styles.infoValue}>
                                    {LANGUAGES.find(lang => lang.code === i18n.language)?.flag} {LANGUAGES.find(lang => lang.code === i18n.language)?.name || 'Español'}
                                </Text>
                                <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Edit Modal */}
            <Modal
                visible={showEditModal && editingField !== 'phone'}
                animationType="fade"
                transparent
                onRequestClose={() => setShowEditModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Editar {getFieldLabel(editingField)}</Text>

                        <TextInput
                            style={styles.input}
                            value={editValue}
                            onChangeText={setEditValue}
                            placeholder={`Ingresa ${getFieldLabel(editingField).toLowerCase()}`}
                            keyboardType={editingField === 'email' ? 'email-address' : editingField === 'weekly_hours' ? 'numeric' : 'default'}
                            autoCapitalize={editingField === 'email' ? 'none' : 'words'}
                            autoFocus
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => {
                                    setShowEditModal(false);
                                    setEditValue('');
                                }}
                                disabled={isSaving}
                            >
                                <Text style={styles.cancelButtonText}>Cancelar</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.modalButton, styles.saveButton, isSaving && styles.saveButtonDisabled]}
                                onPress={saveEdit}
                                disabled={isSaving}
                            >
                                {isSaving ? (
                                    <ActivityIndicator color="#FFFFFF" size="small" />
                                ) : (
                                    <Text style={styles.saveButtonText}>Guardar</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Phone Edit Modal */}
            <Modal
                visible={showEditModal && editingField === 'phone' && !showCountryPicker}
                animationType="fade"
                transparent
                onRequestClose={() => setShowEditModal(false)}
            >
                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Editar Teléfono</Text>

                            {/* Phone Number Row */}
                            <Text style={styles.label}>Número de Teléfono</Text>
                            <View style={styles.phoneInputRow}>
                                <TouchableOpacity
                                    style={styles.countryCodeButton}
                                    onPress={() => {
                                        setShowCountryPicker(true);
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.countryFlagButton}>
                                        {COUNTRIES.find(c => c.cca2 === countryCode)?.flag || '🇪🇸'}
                                    </Text>
                                    <Text style={styles.countryCodeText}>
                                        {COUNTRIES.find(c => c.cca2 === countryCode)?.code || '+34'}
                                    </Text>
                                    <Ionicons name="chevron-down" size={16} color={Colors.light.textSecondary} />
                                </TouchableOpacity>

                                <TextInput
                                    style={styles.phoneInput}
                                    value={phoneNumber}
                                    onChangeText={setPhoneNumber}
                                    placeholder="612 345 678"
                                    keyboardType="phone-pad"
                                />
                            </View>

                            <View style={styles.modalButtons}>
                                <TouchableOpacity
                                    style={[styles.modalButton, styles.cancelButton]}
                                    onPress={() => setShowEditModal(false)}
                                    disabled={isSaving}
                                >
                                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.modalButton, styles.saveButton, isSaving && styles.saveButtonDisabled]}
                                    onPress={savePhone}
                                    disabled={isSaving}
                                >
                                    {isSaving ? (
                                        <ActivityIndicator color="#FFFFFF" size="small" />
                                    ) : (
                                        <Text style={styles.saveButtonText}>Guardar</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Country Picker Modal */}
            <Modal
                visible={showCountryPicker}
                animationType="slide"
                transparent
                onRequestClose={() => setShowCountryPicker(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.pickerModal}>
                        <View style={styles.pickerHeader}>
                            <Text style={styles.pickerTitle}>Seleccionar País</Text>
                            <TouchableOpacity onPress={() => setShowCountryPicker(false)}>
                                <Ionicons name="close" size={24} color={Colors.light.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView>
                            {COUNTRIES.map((country) => (
                                <TouchableOpacity
                                    key={country.code}
                                    style={[
                                        styles.countryOption,
                                        countryCode === country.cca2 && styles.countryOptionSelected
                                    ]}
                                    onPress={() => {
                                        setCountryCode(country.cca2 as CountryCode);
                                        setShowCountryPicker(false);
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    }}
                                >
                                    <Text style={styles.countryFlag}>{country.flag}</Text>
                                    <Text style={styles.countryName}>{country.name}</Text>
                                    <Text style={styles.countryCode}>{country.code}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Job Position Picker Modal */}
            <Modal
                visible={showJobPicker}
                animationType="slide"
                transparent
                onRequestClose={() => setShowJobPicker(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.pickerModal}>
                        <View style={styles.pickerHeader}>
                            <Text style={styles.pickerTitle}>Seleccionar Puesto</Text>
                            <TouchableOpacity onPress={() => setShowJobPicker(false)}>
                                <Ionicons name="close" size={24} color={Colors.light.text} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView>
                            {JOB_POSITIONS.map(position => (
                                <TouchableOpacity
                                    key={position}
                                    style={[
                                        styles.jobOption,
                                        selectedJobPosition === position && styles.jobOptionSelected
                                    ]}
                                    onPress={() => {
                                        setSelectedJobPosition(position);
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    }}
                                >
                                    <Text style={[
                                        styles.jobOptionText,
                                        selectedJobPosition === position && styles.jobOptionTextSelected
                                    ]}>
                                        {position}
                                    </Text>
                                    {selectedJobPosition === position && (
                                        <Ionicons name="checkmark-circle" size={24} color={Colors.light.primary} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setShowJobPicker(false)}
                                disabled={isSaving}
                            >
                                <Text style={styles.cancelButtonText}>Cancelar</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.modalButton, styles.saveButton, isSaving && styles.saveButtonDisabled]}
                                onPress={saveJobPosition}
                                disabled={isSaving}
                            >
                                {isSaving ? (
                                    <ActivityIndicator color="#FFFFFF" size="small" />
                                ) : (
                                    <Text style={styles.saveButtonText}>Guardar</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Date Picker Modal */}
            <Modal
                visible={datePickerVisible}
                animationType="fade"
                transparent
                onRequestClose={() => setDatePickerVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.datePickerModal}>
                        <Text style={styles.modalTitle}>Seleccionar Fecha de Nacimiento</Text>

                        <View style={styles.datePickerContainer}>
                            {/* Day */}
                            <View style={styles.pickerColumn}>
                                <Text style={styles.pickerLabel}>Día</Text>
                                <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
                                    {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                                        <TouchableOpacity
                                            key={day}
                                            style={[styles.pickerItem, selectedDate.day === day && styles.pickerItemSelected]}
                                            onPress={() => setSelectedDate(prev => ({ ...prev, day }))}
                                        >
                                            <Text style={[styles.pickerItemText, selectedDate.day === day && styles.pickerItemTextSelected]}>
                                                {day}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>

                            {/* Month */}
                            <View style={styles.pickerColumn}>
                                <Text style={styles.pickerLabel}>Mes</Text>
                                <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                                        <TouchableOpacity
                                            key={month}
                                            style={[styles.pickerItem, selectedDate.month === month && styles.pickerItemSelected]}
                                            onPress={() => setSelectedDate(prev => ({ ...prev, month }))}
                                        >
                                            <Text style={[styles.pickerItemText, selectedDate.month === month && styles.pickerItemTextSelected]}>
                                                {month}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>

                            {/* Year */}
                            <View style={styles.pickerColumn}>
                                <Text style={styles.pickerLabel}>Año</Text>
                                <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
                                    {Array.from({ length: 80 }, (_, i) => new Date().getFullYear() - i).map(year => (
                                        <TouchableOpacity
                                            key={year}
                                            style={[styles.pickerItem, selectedDate.year === year && styles.pickerItemSelected]}
                                            onPress={() => setSelectedDate(prev => ({ ...prev, year }))}
                                        >
                                            <Text style={[styles.pickerItemText, selectedDate.year === year && styles.pickerItemTextSelected]}>
                                                {year}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        </View>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setDatePickerVisible(false)}
                                disabled={isSaving}
                            >
                                <Text style={styles.cancelButtonText}>Cancelar</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.modalButton, styles.saveButton, isSaving && styles.saveButtonDisabled]}
                                onPress={saveBirthDate}
                                disabled={isSaving}
                            >
                                {isSaving ? (
                                    <ActivityIndicator color="#FFFFFF" size="small" />
                                ) : (
                                    <Text style={styles.saveButtonText}>Guardar</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Avatar Options Modal */}
            <Modal
                visible={showAvatarOptions}
                animationType="fade"
                transparent
                onRequestClose={() => setShowAvatarOptions(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Foto de Perfil</Text>

                        <TouchableOpacity
                            style={styles.avatarOption}
                            onPress={() => handleAvatarUpload('gallery')}
                        >
                            <Ionicons name="images-outline" size={24} color={Colors.light.primary} />
                            <Text style={styles.avatarOptionText}>Seleccionar desde Galería</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.avatarOption}
                            onPress={() => handleAvatarUpload('camera')}
                        >
                            <Ionicons name="camera-outline" size={24} color={Colors.light.primary} />
                            <Text style={styles.avatarOptionText}>Tomar Foto</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.modalButton, styles.cancelButton, { marginTop: 12 }]}
                            onPress={() => setShowAvatarOptions(false)}
                        >
                            <Text style={styles.cancelButtonText}>Cancelar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Language Picker Modal */}
            <Modal
                visible={showLanguagePicker}
                animationType="slide"
                transparent
                onRequestClose={() => setShowLanguagePicker(false)}
            >
                <TouchableWithoutFeedback onPress={() => setShowLanguagePicker(false)}>
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                            <View style={styles.modalContent}>
                                <Text style={styles.modalTitle}>Seleccionar Idioma</Text>

                                <ScrollView style={{ maxHeight: 400 }}>
                                    {LANGUAGES.map((language) => (
                                        <TouchableOpacity
                                            key={language.code}
                                            style={[
                                                styles.languageOption,
                                                i18n.language === language.code && styles.languageOptionActive
                                            ]}
                                            onPress={async () => {
                                                await changeLanguage(language.code);
                                                setShowLanguagePicker(false);
                                                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                            }}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={styles.languageFlag}>{language.flag}</Text>
                                            <Text style={[
                                                styles.languageName,
                                                i18n.language === language.code && styles.languageNameActive
                                            ]}>
                                                {language.name}
                                            </Text>
                                            {i18n.language === language.code && (
                                                <Ionicons name="checkmark" size={24} color={Colors.light.primary} />
                                            )}
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>

                                <TouchableOpacity
                                    style={[styles.modalButton, styles.cancelButton, { marginTop: 16 }]}
                                    onPress={() => setShowLanguagePicker(false)}
                                >
                                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                                </TouchableOpacity>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </>
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
        marginTop: 12,
        fontSize: 16,
        color: Colors.light.textSecondary,
    },
    errorText: {
        fontSize: 16,
        color: Colors.light.textSecondary,
        marginBottom: 16,
    },
    retryButton: {
        backgroundColor: Colors.light.primary,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    retryButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
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
    profileSection: {
        alignItems: 'center',
        paddingVertical: 32,
        backgroundColor: Colors.light.cardBackground,
        borderBottomWidth: 1,
        borderBottomColor: Colors.light.border,
    },
    avatarContainer: {
        marginBottom: 16,
        position: 'relative',
    },
    avatarImage: {
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
    cameraButton: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.light.primary,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: Colors.light.cardBackground,
    },
    avatarOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 8,
        backgroundColor: '#EFF6FF',
        marginBottom: 12,
        gap: 12,
    },
    avatarOptionText: {
        fontSize: 16,
        fontWeight: '500',
        color: Colors.light.text,
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
        alignItems: 'center',
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
    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: Colors.light.cardBackground,
        borderRadius: 16,
        padding: 24,
        width: '100%',
        maxWidth: 400,
    },
    datePickerModal: {
        backgroundColor: Colors.light.cardBackground,
        borderRadius: 16,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        maxHeight: '80%',
    },
    pickerModal: {
        backgroundColor: Colors.light.cardBackground,
        borderRadius: 16,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        maxHeight: '70%',
    },
    pickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    pickerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.light.text,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.light.text,
        marginBottom: 20,
        textAlign: 'center',
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.light.text,
        marginBottom: 8,
        marginTop: 12,
    },
    input: {
        borderWidth: 1,
        borderColor: Colors.light.border,
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: Colors.light.text,
        marginBottom: 12,
    },
    countrySelector: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.light.border,
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
    },
    countrySelectorText: {
        fontSize: 16,
        color: Colors.light.text,
    },
    countryOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: Colors.light.borderLight,
    },
    countryOptionSelected: {
        backgroundColor: '#EFF6FF',
    },
    countryFlag: {
        fontSize: 24,
        marginRight: 12,
    },
    countryFlagButton: {
        fontSize: 20,
    },
    countryName: {
        flex: 1,
        fontSize: 16,
        color: Colors.light.text,
    },
    countryCode: {
        fontSize: 14,
        color: Colors.light.textSecondary,
    },
    jobOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: Colors.light.borderLight,
    },
    jobOptionSelected: {
        backgroundColor: '#EFF6FF',
    },
    jobOptionText: {
        fontSize: 16,
        color: Colors.light.text,
    },
    jobOptionTextSelected: {
        fontWeight: '600',
        color: Colors.light.primary,
    },
    phoneInputRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
    },
    countryCodeInputButton: {
        width: 70,
        borderWidth: 1,
        borderColor: Colors.light.border,
        borderRadius: 8,
        padding: 12,
        backgroundColor: Colors.light.cardBackground,
        alignItems: 'center',
        justifyContent: 'center',
    },
    countryCodeInputText: {
        fontSize: 16,
        color: Colors.light.text,
        fontWeight: '500',
    },
    extensionInput: {
        width: 80,
        borderWidth: 1,
        borderColor: Colors.light.border,
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: Colors.light.text,
    },
    countryPickerButton: {
        width: 80,
        borderWidth: 1,
        borderColor: Colors.light.border,
        borderRadius: 8,
        padding: 12,
        backgroundColor: Colors.light.cardBackground,
        alignItems: 'center',
        justifyContent: 'center',
    },
    countryPickerModal: {
        flex: 1,
        backgroundColor: Colors.light.cardBackground,
        borderRadius: 12,
        overflow: 'hidden',
    },
    countryCodeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        width: 120,
        borderWidth: 1,
        borderColor: Colors.light.border,
        borderRadius: 8,
        padding: 12,
        backgroundColor: Colors.light.cardBackground,
    },
    countryCodeText: {
        fontSize: 16,
        color: Colors.light.text,
    },
    phoneInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: Colors.light.border,
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: Colors.light.text,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 12,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: Colors.light.borderLight,
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.light.text,
    },
    saveButton: {
        backgroundColor: Colors.light.primary,
    },
    saveButtonDisabled: {
        opacity: 0.6,
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    // Date picker
    datePickerContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 20,
    },
    pickerColumn: {
        flex: 1,
    },
    pickerLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.light.text,
        marginBottom: 8,
        textAlign: 'center',
    },
    pickerScroll: {
        maxHeight: 200,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: Colors.light.border,
    },
    pickerItem: {
        padding: 12,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: Colors.light.borderLight,
    },
    pickerItemSelected: {
        backgroundColor: Colors.light.primary,
    },
    pickerItemText: {
        fontSize: 16,
        color: Colors.light.text,
    },
    pickerItemTextSelected: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    // Missing info styles
    infoLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    infoRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    settingIcon: {
        marginRight: 12,
    },
    // Language Picker specific styles
    languageOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: Colors.light.borderLight,
    },
    languageOptionActive: {
        backgroundColor: '#F0F9FF',
    },
    languageFlag: {
        fontSize: 24,
        marginRight: 12,
    },
    languageName: {
        fontSize: 16,
        color: Colors.light.text,
        flex: 1,
    },
    languageNameActive: {
        color: Colors.light.primary,
        fontWeight: '600',
    },
});
