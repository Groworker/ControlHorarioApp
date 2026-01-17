import { StyleSheet } from 'react-native';
import { Colors } from './Colors';

/**
 * Estilos globales reutilizables
 * Basados en el diseño web de The Onya Resort & Spa
 */

export const GlobalStyles = StyleSheet.create({
    // Contenedores
    container: {
        flex: 1,
        backgroundColor: Colors.light.background,
    },

    card: {
        backgroundColor: Colors.light.cardBackground,
        borderRadius: 12,
        padding: 20,
        marginHorizontal: 16,
        marginVertical: 8,
        // Sombra iOS
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        // Sombra Android
        elevation: 3,
    },

    cardLarge: {
        backgroundColor: Colors.light.cardBackground,
        borderRadius: 16,
        padding: 24,
        marginHorizontal: 16,
        marginVertical: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 5,
    },

    // Botones
    buttonPrimary: {
        backgroundColor: Colors.light.primary,
        borderRadius: 8,
        paddingVertical: 14,
        paddingHorizontal: 24,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },

    buttonPrimaryText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },

    buttonSecondary: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: Colors.light.border,
        borderRadius: 8,
        paddingVertical: 14,
        paddingHorizontal: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },

    buttonSecondaryText: {
        color: Colors.light.text,
        fontSize: 16,
        fontWeight: '600',
    },

    // Inputs
    input: {
        backgroundColor: Colors.light.surface,
        borderWidth: 1,
        borderColor: Colors.light.border,
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        fontSize: 16,
        color: Colors.light.text,
    },

    inputLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: Colors.light.text,
        marginBottom: 8,
    },

    inputError: {
        borderColor: Colors.light.danger,
    },

    // Tipografía
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: Colors.light.text,
        marginBottom: 8,
    },

    subtitle: {
        fontSize: 20,
        fontWeight: '600',
        color: Colors.light.text,
        marginBottom: 8,
    },

    heading: {
        fontSize: 18,
        fontWeight: '600',
        color: Colors.light.text,
        marginBottom: 8,
    },

    body: {
        fontSize: 16,
        color: Colors.light.text,
        lineHeight: 24,
    },

    bodySecondary: {
        fontSize: 16,
        color: Colors.light.textSecondary,
        lineHeight: 24,
    },

    caption: {
        fontSize: 14,
        color: Colors.light.textSecondary,
    },

    small: {
        fontSize: 12,
        color: Colors.light.textLight,
    },

    // Utilidades
    centered: {
        alignItems: 'center',
        justifyContent: 'center',
    },

    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    spaceBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },

    // Espaciado
    mt8: { marginTop: 8 },
    mt16: { marginTop: 16 },
    mt24: { marginTop: 24 },
    mt32: { marginTop: 32 },

    mb8: { marginBottom: 8 },
    mb16: { marginBottom: 16 },
    mb24: { marginBottom: 24 },
    mb32: { marginBottom: 32 },

    mx8: { marginHorizontal: 8 },
    mx16: { marginHorizontal: 16 },
    mx24: { marginHorizontal: 24 },

    my8: { marginVertical: 8 },
    my16: { marginVertical: 16 },
    my24: { marginVertical: 24 },

    p8: { padding: 8 },
    p16: { padding: 16 },
    p24: { padding: 24 },

    // Sombras predefinidas
    shadowSmall: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },

    shadowMedium: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },

    shadowLarge: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 5,
    },
});

// Estilos específicos para botones de acción (Fichaje)
export const ActionButtonStyles = StyleSheet.create({
    button: {
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 140,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },

    icon: {
        marginBottom: 12,
    },

    title: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 4,
    },

    subtitle: {
        color: 'rgba(255, 255, 255, 0.85)',
        fontSize: 13,
        textAlign: 'center',
    },
});
