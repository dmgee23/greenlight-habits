import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure how notifications appear when the app is open
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotificationsAsync() {
  let token;
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    alert('Failed to get push token for push notification!');
    return;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#22c55e',
    });
  }
}

// Schedule daily morning intention prompt (e.g., 7:30 AM)
export async function scheduleMorningReminder() {
  await Notifications.cancelAllScheduledNotificationsAsync();

  await Notifications.schedulingRequestAsync({
    content: {
      title: "☀️ Morning Intentions",
      body: "Set your daily non-negotiable and gratitude before the day takes over.",
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 7,
      minute: 30,
    },
  });
}

// Schedule daily evening audit prompt (e.g., 9:00 PM)
export async function scheduleEveningReminder() {
  await Notifications.schedulingRequestAsync({
    content: {
      title: "🌙 Evening Audit & Greenlights",
      body: "Time for unforgiving honesty. What was your win and greenlight today?",
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 21,
      minute: 0,
    },
  });
}