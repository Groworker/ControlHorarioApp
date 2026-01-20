import { useWindowDimensions } from 'react-native';

export interface ResponsiveInfo {
    width: number;
    height: number;
    isTablet: boolean;
    isLandscape: boolean;
    isPortrait: boolean;
    scale: number;
    moderateScale: number;
}

/**
 * Hook para obtener información responsive de la pantalla
 * Detecta si es tablet, orientación, y proporciona escalas para adaptar UI
 */
export const useResponsive = (): ResponsiveInfo => {
    const { width, height } = useWindowDimensions();

    // Detectar si es tablet (iPad tiene ancho mínimo de 768px)
    const isTablet = width >= 768;

    // Detectar orientación
    const isLandscape = width > height;
    const isPortrait = height >= width;

    // Calcular escala basada en el ancho (base: 375px de iPhone)
    const scale = width / 375;

    // Escala moderada para fuentes (no crece tan rápido)
    const moderateScale = 1 + (scale - 1) * 0.5;

    return {
        width,
        height,
        isTablet,
        isLandscape,
        isPortrait,
        scale,
        moderateScale,
    };
};

/**
 * Breakpoints estándar
 */
export const BREAKPOINTS = {
    phone: 0,
    tablet: 768,
    desktop: 1024,
} as const;

/**
 * Anchos máximos recomendados para contenido en diferentes pantallas
 */
export const MAX_CONTENT_WIDTH = {
    phone: '100%',
    tablet: 800,
    tabletWide: 1000,
} as const;
