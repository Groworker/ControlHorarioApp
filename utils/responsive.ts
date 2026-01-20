import { Dimensions, PixelRatio, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base dimensions (iPhone 11)
const baseWidth = 375;
const baseHeight = 812;

/**
 * Escala un valor basado en el ancho de pantalla
 * @param size - Tamaño base en iPhone
 * @returns Tamaño escalado para la pantalla actual
 */
export const scale = (size: number): number => {
    const newSize = (SCREEN_WIDTH / baseWidth) * size;
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

/**
 * Escala vertical basada en la altura de pantalla
 * @param size - Tamaño base vertical
 * @returns Tamaño escalado verticalmente
 */
export const verticalScale = (size: number): number => {
    const newSize = (SCREEN_HEIGHT / baseHeight) * size;
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

/**
 * Escala moderada para fuentes y elementos que no deben crecer tanto
 * @param size - Tamaño base
 * @param factor - Factor de moderación (default: 0.5)
 * @returns Tamaño moderadamente escalado
 */
export const moderateScale = (size: number, factor: number = 0.5): number => {
    const newSize = size + (scale(size) - size) * factor;
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

/**
 * Detecta si el dispositivo es una tablet
 */
export const isTablet = (): boolean => {
    const pixelDensity = PixelRatio.get();
    const adjustedWidth = SCREEN_WIDTH * pixelDensity;
    const adjustedHeight = SCREEN_HEIGHT * pixelDensity;

    if (pixelDensity < 2 && (adjustedWidth >= 1000 || adjustedHeight >= 1000)) {
        return true;
    } else {
        return (
            (Platform.OS === 'ios' && !Platform.isPad) === false ||
            (pixelDensity === 2 && (adjustedWidth >= 1824 || adjustedHeight >= 1824))
        );
    }
};

/**
 * Obtiene el ancho máximo apropiado para el contenido
 */
export const getMaxContentWidth = (): number => {
    return isTablet() ? 800 : SCREEN_WIDTH;
};

/**
 * Calcula padding horizontal adaptativo
 */
export const getHorizontalPadding = (): number => {
    return isTablet() ? moderateScale(32) : moderateScale(16);
};

/**
 * Calcula espaciado vertical adaptativo
 */
export const getVerticalSpacing = (): number => {
    return isTablet() ? verticalScale(24) : verticalScale(16);
};
