import { db } from './schema';
import * as Notifications from 'expo-notifications';

// Configure how notifications behave when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true, // Required by newer Expo SDK versions
    shouldShowList: true,   // Required by newer Expo SDK versions
  }),
});

// Listener for notification clicks
export function setupNotificationResponseListener(onNavigate?: (screen: string) => void) {
  return Notifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data;
    if (data?.screen && onNavigate) {
      onNavigate(data.screen as string);
    }
  });
}

export function initDatabase() {
  // Operational verification query
  try {
    db.getAllSync('SELECT 1 FROM habits LIMIT 1;');
  } catch (e) {
    console.error('Database query verification failed:', e);
  }
}

export function getHabits() {
  try {
    const result = db.getAllSync('SELECT * FROM habits;');
    return result;
  } catch (e) {
    console.error('Error fetching habits:', e);
    return [];
  }
}

export function addHabit(habit: any) {
  try {
    const stmt = db.prepareSync(`
      INSERT INTO habits (title, category, current_target, unit, increment_rate, base_target, max_goal_integer, reminder_time, is_inverse)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    `);
    stmt.executeSync([
      habit.title,
      habit.category || 'General',
      habit.current_target,
      habit.unit,
      habit.increment_rate || 0.01,
      habit.base_target,
      habit.max_goal_integer || 25,
      habit.reminder_time || '18:30',
      habit.is_inverse ? 1 : 0
    ]);
  } catch (e) {
    console.error('Error adding habit:', e);
  }
}

export function updateHabit(habit: any) {
  try {
    const stmt = db.prepareSync(`
      UPDATE habits 
      SET title = ?, unit = ?, base_target = ?, max_goal_integer = ?, reminder_time = ?, is_inverse = ?
      WHERE id = ?;
    `);
    stmt.executeSync([
      habit.title,
      habit.unit,
      habit.base_target,
      habit.max_goal_integer,
      habit.reminder_time,
      habit.is_inverse ? 1 : 0,
      habit.id
    ]);
  } catch (e) {
    console.error('Error updating habit:', e);
  }
}

// Supports both standard compounding habits and inverse (reducing) habits
export function completeHabit(habit: any, valueLogged: number, notes?: string) {
  const today = new Date().toISOString().split('T')[0];
  try {
    const logStmt = db.prepareSync(`
      INSERT OR REPLACE INTO habit_logs (habit_id, date, completed, notes)
      VALUES (?, ?, 1, ?);
    `);
    logStmt.executeSync([habit.id, today, notes || '']);

    let nextTarget = habit.current_target;

    if (habit.is_inverse === 1) {
      nextTarget = Math.max(0, Number((habit.current_target - (habit.increment_rate || 1)).toFixed(2)));
    } else {
      if (habit.unit === 'pages' || habit.unit === 'items' || habit.unit === 'reps') {
        nextTarget = Math.min(habit.max_goal_integer, Math.round(habit.current_target + 1));
      } else {
        nextTarget = Math.min(habit.max_goal_integer, Number((habit.current_target + habit.increment_rate).toFixed(2)));
      }
    }

    const updateStmt = db.prepareSync(`
      UPDATE habits 
      SET current_target = ?, streak = streak + 1 
      WHERE id = ?;
    `);
    updateStmt.executeSync([nextTarget, habit.id]);
  } catch (e) {
    console.error('Error completing habit:', e);
  }
}

export function resetToBaseline(habit: any) {
  try {
    const stmt = db.prepareSync(`
      UPDATE habits 
      SET current_target = base_target, streak = 0 
      WHERE id = ?;
    `);
    stmt.executeSync([habit.id]);
  } catch (e) {
    console.error('Error resetting habit:', e);
  }
}

export function calculateDailyScore(today: string) {
  try {
    const habitsResult: any = db.getAllSync('SELECT COUNT(*) as total FROM habits;');
    const totalHabits = habitsResult[0]?.total || 0;
    if (totalHabits === 0) return 0;

    const completedResult: any = db.getAllSync(
      'SELECT COUNT(DISTINCT habit_id) as completed FROM habit_logs WHERE date = ? AND completed = 1;',
      [today]
    );
    const completedHabits = completedResult[0]?.completed || 0;

    return Math.round((completedHabits / totalHabits) * 100);
  } catch (e) {
    return 0;
  }
}

export function getWeeklyCompletionStats() {
  const stats = [];
  try {
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });

      const res: any = db.getAllSync(
        'SELECT COUNT(*) as cnt FROM habit_logs WHERE date = ? AND completed = 1;',
        [dateStr]
      );
      stats.push({ dayLabel, count: res[0]?.cnt || 0, date: dateStr });
    }
  } catch (e) {
    console.error('Error getting weekly stats:', e);
  }
  return stats;
}

export async function registerForPushNotificationsAsync(os: string) {
  return true;
}
export function scheduleMorningReminder() {}
export function scheduleEveningReminder() {}

// Journal SQLite Operations
export function saveJournalEntry(date: string, data: any) {
  try {
    const stmt = db.prepareSync(`
      INSERT INTO journal_entries (
        date, morning_gratitude, daily_non_negotiable, identity_affirmation, 
        evening_win, greenlight_moment, unforgiving_honesty_reflection
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(date) DO UPDATE SET
        morning_gratitude = excluded.morning_gratitude,
        daily_non_negotiable = excluded.daily_non_negotiable,
        identity_affirmation = excluded.identity_affirmation,
        evening_win = excluded.evening_win,
        greenlight_moment = excluded.greenlight_moment,
        unforgiving_honesty_reflection = excluded.unforgiving_honesty_reflection;
    `);

    stmt.executeSync([
      date,
      data.morningGratitude || '',
      data.dailyNonNegotiable || '',
      data.identityAffirmation || '',
      data.eveningWin || '',
      data.greenlightMoment || '',
      JSON.stringify({
        priority1: data.priority1 || '',
        priority2: data.priority2 || '',
        priority3: data.priority3 || '',
        wentRight: data.wentRight || '',
        wentWrong: data.wentWrong || '',
        doDifferent: data.doDifferent || '',
        nextActions: data.nextActions || '',
        relatedLinks: data.relatedLinks || '',
      })
    ]);
  } catch (e) {
    console.error('Error saving journal:', e);
  }
}

export function getJournalEntry(date: string) {
  try {
    const stmt = db.prepareSync(`SELECT * FROM journal_entries WHERE date = ?;`);
    const result = stmt.executeSync([date]);
    const row: any = result.getFirstSync();
    
    if (!row) return null;

    let extra = { priority1: '', priority2: '', priority3: '', wentRight: '', wentWrong: '', doDifferent: '', nextActions: '', relatedLinks: '' };
    try {
      if (row.unforgiving_honesty_reflection) {
        extra = JSON.parse(row.unforgiving_honesty_reflection);
      }
    } catch (_) {}

    return {
      morningGratitude: row.morning_gratitude || '',
      dailyNonNegotiable: row.daily_non_negotiable || '',
      identityAffirmation: row.identity_affirmation || '',
      eveningWin: row.evening_win || '',
      greenlightMoment: row.greenlight_moment || '',
      ...extra
    };
  } catch (e) {
    console.error('Error fetching journal:', e);
    return null;
  }
}