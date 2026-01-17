import { Redirect } from 'expo-router';

export default function Index() {
    // Redirigir al login en el grupo (auth)
    return <Redirect href="/(auth)/login" />;
}
