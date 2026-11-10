// services/notificationService.ts
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Set global notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotificationsAsync(osName: string) {
  try {
    if (osName === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }
  } catch (error) {
    console.log('Notification permission error (non-fatal):', error);
  }
}

export async function scheduleHabitReminder(habitId: number, timeString: string) {
  try {
    const [hours, minutes] = timeString.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return;

    // Cancel existing reminder for this habit first
    await cancelScheduledNotificationAsync(`habit-reminder-${habitId}`);

    await Notifications.scheduleNotificationAsync({
      identifier: `habit-reminder-${habitId}`,
      content: {
        title: 'Greenlight Habit Reminder 🟢',
        body: 'Time to log your micro-habit and keep your streak alive!',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: hours,
        minute: minutes,
      },
    });
  } catch (e) {
    console.log('Error scheduling habit notification:', e);
  }
}

export async function cancelScheduledNotificationAsync(identifier: string) {
  try {
    await Notifications.dismissNotificationAsync(identifier);
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch (e) {
    // Ignore if not scheduled
  }
}

export async function scheduleMorningReminder() {
  try {
    await Notifications.scheduleNotificationAsync({
      identifier: 'morning-reminder',
      content: {
        title: 'Morning Intentions ☀️',
        body: 'Set your non-negotiables for today in Greenlight Habits.',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 7,
        minute: 0,
      },
    });
  } catch (e) {
    console.log('Error scheduling morning notification:', e);
  }
}

export async function scheduleEveningReminder() {
  try {
    await Notifications.scheduleNotificationAsync({
      identifier: 'evening-reminder',
      content: {
        title: 'Evening Audit 🌙',
        body: 'Log your wins and review today’s friction before bed.',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 21,
        minute: 0,
      },
    });
  } catch (e) {
    console.log('Error scheduling evening notification:', e);
  }
}