import { Redirect } from 'expo-router';

export default function Index() {
    // Por ahora redirigimos directamente al login
    // Más adelante aquí podríamos verificar si el usuario ya está autenticado
    return <Redirect href="/login" />;
}
