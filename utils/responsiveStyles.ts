import { StyleSheet } from 'react-native';
import { getHorizontalPadding, getVerticalSpacing, moderateScale } from './responsive';

/**
 * Estilos comunes responsive para todas las pantallas
 */
export const responsiveStyles = StyleSheet.create({
    // Contenedores principales
    screenContainer: {
        flex: 1,
        width: '100%',
        alignSelf: 'center',
    },

    // Padding horizontal adaptativo
    horizontalPadding: {
        paddingHorizontal: getHorizontalPadding(),
    },

    // Margin vertical adaptativo
    verticalMargin: {
        marginVertical: getVerticalSpacing(),
    },

    // Cards con sombra
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: moderateScale(12),
        padding: moderateScale(16),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: moderateScale(8),
        elevation: 3,
    },

    // Secciones
    section: {
        marginBottom: getVerticalSpacing(),
    },

    // Títulos de sección
    sectionTitle: {
        fontSize: moderateScale(18),
        fontWeight: '600',
        marginBottom: moderateScale(12),
        color: '#2C3E50',
    },

    // Modales centrados en tablet
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: moderateScale(16),
        padding: moderateScale(24),
    },
});
