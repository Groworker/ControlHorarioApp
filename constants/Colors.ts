/**
 * Paleta de colores de The Onya Resort & Spa
 * Basada en el diseño web existente
 */

const tintColorLight = '#2563EB';
const tintColorDark = '#60A5FA';

export const Colors = {
  light: {
    // Colores principales de la marca
    primary: '#2563EB',      // Azul principal (botones, tabs activos)
    primaryDark: '#1D4ED8',  // Azul más oscuro (hover/pressed)
    primaryLight: '#3B82F6', // Azul más claro
    
    // Colores de acción (botones de fichaje)
    success: '#10B981',      // Verde (Fichar Entrada)
    danger: '#EF4444',       // Rojo (Fichar Salida)
    warning: '#F97316',      // Naranja (Descanso Entrada)
    info: '#3B82F6',         // Azul (Descanso Salida)
    
    // Colores de texto
    text: '#1F2937',         // Texto principal (gris muy oscuro)
    textSecondary: '#6B7280', // Texto secundario (gris medio)
    textLight: '#9CA3AF',    // Texto placeholder
    
    // Fondos
    background: '#F9FAFB',   // Fondo general
    cardBackground: '#FFFFFF', // Fondo de cards
    surface: '#FFFFFF',      // Superficie de componentes
    
    // Bordes
    border: '#E5E7EB',       // Borde sutil
    borderLight: '#F3F4F6',  // Borde muy sutil
    
    // Estados
    disabled: '#D1D5DB',
    overlay: 'rgba(0, 0, 0, 0.3)',
    
    // Sistema
    tint: tintColorLight,
    icon: '#6B7280',
    tabIconDefault: '#6B7280',
    tabIconSelected: tintColorLight,
  },
  dark: {
    // Colores principales de la marca (para modo oscuro futuro)
    primary: '#3B82F6',
    primaryDark: '#2563EB',
    primaryLight: '#60A5FA',
    
    // Colores de acción
    success: '#10B981',
    danger: '#EF4444',
    warning: '#F97316',
    info: '#3B82F6',
    
    // Colores de texto
    text: '#F9FAFB',
    textSecondary: '#D1D5DB',
    textLight: '#9CA3AF',
    
    // Fondos
    background: '#111827',
    cardBackground: '#1F2937',
    surface: '#1F2937',
    
    // Bordes
    border: '#374151',
    borderLight: '#1F2937',
    
    // Estados
    disabled: '#4B5563',
    overlay: 'rgba(0, 0, 0, 0.5)',
    
    // Sistema
    tint: tintColorDark,
    icon: '#9CA3AF',
    tabIconDefault: '#9CA3AF',
    tabIconSelected: tintColorDark,
  },
};

// Colores específicos para botones de acción
export const ActionColors = {
  checkin: {
    background: '#10B981',
    text: '#FFFFFF',
    icon: '#FFFFFF',
  },
  checkout: {
    background: '#EF4444',
    text: '#FFFFFF',
    icon: '#FFFFFF',
  },
  breakStart: {
    background: '#F97316',
    text: '#FFFFFF',
    icon: '#FFFFFF',
  },
  breakEnd: {
    background: '#3B82F6',
    text: '#FFFFFF',
    icon: '#FFFFFF',
  },
};
