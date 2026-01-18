import { authService } from '@/services/auth.service';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    ImageBackground,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const { width } = Dimensions.get('window');

export default function LoginScreen() {
    const [code, setCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const router = useRouter();
    const PIN_LENGTH = 5;

    const handleNumberPress = (num: number) => {
        if (code.length < PIN_LENGTH && !isLoading) {
            // Vibración ligera al presionar un número
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setCode(code + num.toString());
            // Limpiar mensaje de error al escribir
            if (errorMessage) setErrorMessage('');
        }
    };

    const handleDelete = () => {
        if (code.length > 0 && !isLoading) {
            // Vibración media al borrar
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setCode(code.slice(0, -1));
            // Limpiar mensaje de error al borrar
            if (errorMessage) setErrorMessage('');
        }
    };

    const handleLogin = async () => {
        if (code.length === PIN_LENGTH && !isLoading) {
            setIsLoading(true);
            setErrorMessage('');

            try {
                // Intentar login con el código ingresado
                const result = await authService.loginWithCode(code);

                if (result.success && result.user) {
                    // Vibración de éxito
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    console.log('Login exitoso:', result.user.full_name);

                    // Navegar a la pantalla de fichaje
                    router.replace('/(tabs)/fichaje');
                } else {
                    // Vibración de error
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                    setErrorMessage(result.error || 'Código inválido');
                    setCode(''); // Limpiar el código
                }
            } catch (error) {
                console.error('Error en login:', error);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                setErrorMessage('Error al conectar con el servidor');
                setCode('');
            } finally {
                setIsLoading(false);
            }
        }
    };

    // Auto-login cuando se completen 5 dígitos
    React.useEffect(() => {
        if (code.length === PIN_LENGTH && !isLoading) {
            // Vibración ligera al completar el PIN
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            // Esperar un momento antes de validar
            setTimeout(() => {
                handleLogin();
            }, 300);
        }
    }, [code]);

    const renderKeypadButton = (num: number) => (
        <TouchableOpacity
            key={num}
            style={styles.keypadButton}
            onPress={() => handleNumberPress(num)}
            activeOpacity={0.5}
        >
            <Text style={styles.keypadButtonText}>{num}</Text>
        </TouchableOpacity>
    );

    return (
        <ImageBackground
            source={require('@/assets/images/hotel.jpg')}
            style={styles.backgroundImage}
            resizeMode="cover"
        >
            {/* Overlay más oscuro para mejor visibilidad del logo */}
            <View style={styles.overlay} />

            <StatusBar barStyle="light-content" />

            <View style={styles.container}>
                {/* Logo */}
                <View style={styles.logoContainer}>
                    <Image
                        source={require('@/assets/images/logo_onya.png')}
                        style={styles.logo}
                        contentFit="contain"
                    />
                </View>

                {/* Título */}
                <Text style={styles.title}>Ingrese su Código</Text>
                <Text style={styles.subtitle}>Introduce tu código de {PIN_LENGTH} dígitos</Text>

                {/* PIN Display - Círculos */}
                <View style={styles.pinContainer}>
                    {[...Array(PIN_LENGTH)].map((_, index) => (
                        <View
                            key={index}
                            style={[
                                styles.pinCircle,
                                index < code.length && styles.pinCircleFilled,
                            ]}
                        >
                            {index < code.length && <View style={styles.pinDot} />}
                        </View>
                    ))}
                </View>

                {/* Mensaje de error */}
                {errorMessage ? (
                    <View style={styles.errorContainer}>
                        <Text style={styles.errorText}>{errorMessage}</Text>
                    </View>
                ) : null}

                {/* Indicador de carga */}
                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color="#FFFFFF" />
                        <Text style={styles.loadingText}>Verificando...</Text>
                    </View>
                ) : null}

                {/* Teclado Numérico */}
                <View style={styles.keypadContainer}>
                    {/* Fila 1-2-3 */}
                    <View style={styles.keypadRow}>
                        {renderKeypadButton(1)}
                        {renderKeypadButton(2)}
                        {renderKeypadButton(3)}
                    </View>

                    {/* Fila 4-5-6 */}
                    <View style={styles.keypadRow}>
                        {renderKeypadButton(4)}
                        {renderKeypadButton(5)}
                        {renderKeypadButton(6)}
                    </View>

                    {/* Fila 7-8-9 */}
                    <View style={styles.keypadRow}>
                        {renderKeypadButton(7)}
                        {renderKeypadButton(8)}
                        {renderKeypadButton(9)}
                    </View>

                    {/* Fila 0-Borrar */}
                    <View style={styles.keypadRow}>
                        <View style={styles.keypadButton} />
                        {renderKeypadButton(0)}
                        <TouchableOpacity
                            style={styles.keypadButton}
                            onPress={handleDelete}
                            activeOpacity={0.5}
                        >
                            <Text style={styles.deleteButtonText}>Borrar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    backgroundImage: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(15, 23, 42, 0.75)', // Más oscuro para mejor contraste
    },
    container: {
        flex: 1,
        paddingTop: 60,
        paddingHorizontal: 20,
        alignItems: 'center',
    },
    logoContainer: {
        width: '140%',
        maxWidth: 500,
        marginTop: 20,
        marginBottom: 60,
        alignItems: 'center',
    },
    logo: {
        width: '100%',
        height: 90,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFFFFF',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 15,
        color: 'rgba(255, 255, 255, 0.7)',
        textAlign: 'center',
        marginBottom: 40,
    },
    pinContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 50,
        gap: 16,
    },
    pinCircle: {
        width: 50,
        height: 50,
        borderRadius: 25,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    pinCircleFilled: {
        borderColor: '#FFFFFF',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    pinDot: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#FFFFFF',
    },
    keypadContainer: {
        width: '100%',
        maxWidth: 350,
    },
    keypadRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
        gap: 16,
    },
    keypadButton: {
        flex: 1,
        aspectRatio: 1,
        maxHeight: 75,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        // Añadir transición para animaciones más suaves
        transform: [{ scale: 1 }],
    },
    keypadButtonPressed: {
        backgroundColor: 'rgba(255, 255, 255, 0.35)',
        transform: [{ scale: 0.95 }],
    },
    keypadButtonText: {
        fontSize: 28,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    deleteButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    errorContainer: {
        backgroundColor: 'rgba(239, 68, 68, 0.9)',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
        marginBottom: 20,
        maxWidth: 350,
    },
    errorText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 20,
    },
    loadingText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '500',
    },
});
