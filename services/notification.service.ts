// Notification service - Disabled for Expo Go compatibility
// This is a placeholder service that will be replaced with full notifications
// when creating a development build

export const notificationService = {
    isSupported: () => false, // Always return false for now

    setNotificationHandler: (handler: any) => {
        // No-op
    },

    getPermissionsAsync: async () => {
        return { status: 'denied' };
    },

    requestPermissionsAsync: async () => {
        return { status: 'denied' };
    },

    scheduleNotificationAsync: async (notificationRequest: any) => {
        console.log('Notifications disabled in Expo Go (Android SDK 53+)');
        return;
    },

    cancelAllScheduledNotificationsAsync: async () => {
        // No-op
    },

    // Dummy trigger types
    get SchedulableTriggerInputTypes() {
        return { TIME_INTERVAL: 'timeInterval' };
    }
};
