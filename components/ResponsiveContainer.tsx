import { useResponsive } from '@/hooks/useResponsive';
import React from 'react';
import { DimensionValue, StyleSheet, View, ViewStyle } from 'react-native';

interface ResponsiveContainerProps {
    children: React.ReactNode;
    style?: ViewStyle;
    maxWidth?: number | 'phone' | 'tablet' | 'tabletWide';
}

/**
 * Contenedor responsive que centra el contenido y aplica ancho máximo en tablets
 */
export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
    children,
    style,
    maxWidth = 'tablet',
}) => {
    const { isTablet } = useResponsive();

    // Calcular ancho máximo
    let computedMaxWidth: DimensionValue | undefined = undefined;
    if (isTablet) {
        if (typeof maxWidth === 'number') {
            computedMaxWidth = maxWidth;
        } else {
            const widths: Record<'phone' | 'tablet' | 'tabletWide', DimensionValue> = {
                phone: '100%',
                tablet: 800,
                tabletWide: 1000,
            };
            computedMaxWidth = widths[maxWidth];
        }
    } else {
        computedMaxWidth = '100%';
    }

    return (
        <View style={[styles.container, computedMaxWidth ? { maxWidth: computedMaxWidth } : undefined, style]}>
            {children}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        alignSelf: 'center',
    },
});
