import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Importar traducciones
import de from '../locales/de/translation.json';
import en from '../locales/en/translation.json';
import es from '../locales/es/translation.json';
import fr from '../locales/fr/translation.json';
import it from '../locales/it/translation.json';

const LANGUAGE_KEY = '@app_language';

const resources = {
    es: { translation: es },
    en: { translation: en },
    fr: { translation: fr },
    de: { translation: de },
    it: { translation: it },
};

const initI18n = async () => {
    try {
        // Obtener idioma guardado o idioma del dispositivo
        let language = await AsyncStorage.getItem(LANGUAGE_KEY);

        if (!language) {
            // Detectar idioma del dispositivo
            const deviceLocale = Localization.getLocales()[0];
            language = deviceLocale?.languageCode || 'es';
        }

        // Verificar que el idioma está soportado
        if (!Object.keys(resources).includes(language)) {
            language = 'es'; // Fallback a español
        }

        await i18n
            .use(initReactI18next)
            .init({
                compatibilityJSON: 'v4',
                resources,
                lng: language,
                fallbackLng: 'es', // Idioma por defecto
                interpolation: {
                    escapeValue: false, // No necesario para React
                },
            });

        console.log('i18next initialized with language:', language);
    } catch (error) {
        console.error('Error initializing i18n:', error);
        // Fallback initialization
        await i18n
            .use(initReactI18next)
            .init({
                compatibilityJSON: 'v4',
                resources,
                lng: 'es',
                fallbackLng: 'es',
                interpolation: {
                    escapeValue: false,
                },
            });
    }
};

/**
 * Función para cambiar idioma y guardarlo en AsyncStorage
 */
export const changeLanguage = async (lng: string) => {
    try {
        await AsyncStorage.setItem(LANGUAGE_KEY, lng);
        await i18n.changeLanguage(lng);
        console.log('Language changed to:', lng);
    } catch (error) {
        console.error('Error changing language:', error);
    }
};

/**
 * Obtener el idioma actual
 */
export const getCurrentLanguage = () => {
    return i18n.language;
};

/**
 * Obtener idiomas disponibles
 */
export const getAvailableLanguages = () => {
    return Object.keys(resources);
};

export default i18n;
export { initI18n };

