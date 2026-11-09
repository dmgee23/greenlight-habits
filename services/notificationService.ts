// services/notificationService.ts

// Fallback logic for when the native module is missing (Expo Go Android)
const notificationsFallback = {
  isAvailable: false,
  getPermissionsAsync: async () => ({ status: 'undetermined' }),
  requestPermissionsAsync: async () => ({ status: 'undetermined' }),
  setNotificationChannelAsync: async () => {},
  schedulingRequestAsync: async () => {},
  setNotificationHandler: () => {},
  cancelScheduledNotificationAsync: async () => {},
};

// Start with fallback to prevent boot crashes
let safeNotifications: any = notificationsFallback;
let safeAndroidImportance: any = { MAX: 4 }; // Default MAX value

// Attempt dynamic require to avoid top-level load errors in Expo Go
try {
  // Use CommonJS require to avoid static import crashes
  const notificationsModule = require('expo-notifications');
  safeNotifications = notificationsModule;
  safeNotifications.isAvailable = true; // Flag for internal use
  safeAndroidImportance = notificationsModule.AndroidImportance;
} catch (e) {
  console.warn('Expo Notifications Native Module failed to load. Falling back. Behavioral cues disabled for Alpha.', e);
}

// Map the DAILY SchedulableTriggerInputType constant (DAILY = 1)
const DAILY_TRIGGER_TYPE = 1;

// Set up the Safe Notification Handler (if available)
if (safeNotifications.isAvailable) {
  try {
    safeNotifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch (e) {
    console.warn('Set notification handler failed.', e);
  }
}

// Global cues for journal prompts (Checkpoint 2)
const journalCues = {
  morningHour: 7, morningMinute: 30, morningId: 'morning-prompt',
  eveningHour: 21, eveningMinute: 0, eveningId: 'evening-prompt'
};

// Safe cancellation wrapper (added)
export async function cancelScheduledNotificationAsync(identifier: string) {
    if (!safeNotifications.isAvailable) return;
    try {
        await safeNotifications.cancelScheduledNotificationAsync(identifier);
    } catch (e) {
        console.warn(`Error cancelling notification ${identifier}:`, e);
    }
}

// Generic daily reminder scheduler
async function scheduleDailyReminder(id: string, hour: number, minute: number, title: string, body: string) {
  if (!safeNotifications.isAvailable) return;

  // Use the unique identifier (Checkpoint 2)
  await cancelScheduledNotificationAsync(id);

  try {
    await safeNotifications.schedulingRequestAsync({
      content: {
        title: title,
        body: body,
        sound: true,
      },
      trigger: {
        type: DAILY_TRIGGER_TYPE, // Use our mapped constant value
        hour: hour,
        minute: minute,
      },
      identifier: id, // Vital for management
    });
  } catch (e) {
    console.warn(`Error scheduling reminder ${id}:`, e);
  }
}

// Simplified cue logic using our generic scheduler
export async function scheduleMorningReminder() {
  await scheduleDailyReminder(
    journalCues.morningId, journalCues.morningHour, journalCues.morningMinute, 
    "☀️ Morning Intentions", "Set your daily non-negotiable and gratitude.");
}

export async function scheduleEveningReminder() {
  await scheduleDailyReminder(
    journalCues.eveningId, journalCues.eveningHour, journalCues.eveningMinute, 
    "🌙 Evening Audit & Greenlights", "Log your win and greenlight before the day ends.");
}


// NEW DYNAMIC PER-HABIT SCHEDULER (STEP 2 Design Spec)
export async function scheduleHabitReminder(habitId: number | string, timeStr: string) {
  if (!safeNotifications.isAvailable || !timeStr) return;

  // Personalized logic: unique identifier per habit
  const uniqueId = `habit-reminder-${habitId}`;

  // Time spec parsing
  const parts = timeStr.split(':');
  if (parts.length !== 2) return;
  const hour = parseInt(parts[0], 10);
  const minute = parseInt(parts[1], 10);
  if (isNaN(hour) || isNaN(minute)) return;

  await scheduleDailyReminder(
    uniqueId, hour, minute,
    "🔥 personalized Micro-Habit Cue", "Your micro-habit routine needs execution. Move greenlights!"
  );
}