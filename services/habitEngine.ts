import { db, Habit } from '../db/schema';
import { scheduleHabitReminder, cancelScheduledNotificationAsync } from './notificationService';

export const getHabits = (): Habit[] => {
  return db.getAllSync<Habit>('SELECT * FROM habits ORDER BY title ASC');
};

export const addHabit = (habit: Omit<Habit, 'id' | 'streak'>) => {
  const result = db.runSync(
    `INSERT INTO habits (title, category, current_target, unit, increment_rate, base_target, streak, max_goal_integer, reminder_time) 
     VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
    [
      habit.title,
      habit.category,
      habit.current_target,
      habit.unit,
      habit.increment_rate,
      habit.base_target,
      habit.max_goal_integer,
      habit.reminder_time,
    ]
  );
  
  if (habit.reminder_time && result.lastInsertRowId) {
    scheduleHabitReminder(result.lastInsertRowId, habit.reminder_time);
  }
};

export const updateHabit = (habit: Habit) => {
  if (!habit.id) return;

  db.runSync(
    `UPDATE habits SET title=?, current_target=?, unit=?, base_target=?, max_goal_integer=?, reminder_time=? WHERE id=?`,
    [
      habit.title,
      habit.current_target,
      habit.unit,
      habit.base_target,
      habit.max_goal_integer,
      habit.reminder_time,
      habit.id
    ]
  );

  if (habit.reminder_time) {
    scheduleHabitReminder(habit.id, habit.reminder_time);
  } else {
    cancelScheduledNotificationAsync(`habit-reminder-${habit.id}`);
  }
};

export const completeHabit = (habit: Habit, valueAchieved: number, notes: string = '') => {
  const today = new Date().toISOString().split('T')[0];

  db.runSync(
    `INSERT INTO daily_logs (habit_id, date, completed, value_achieved, notes) VALUES (?, ?, 1, ?, ?)`,
    [habit.id!, today, valueAchieved, notes]
  );

  // Integer-only rounding (Math.ceil guarantees at least +1 integer step)
  const rawNext = habit.current_target * (1 + habit.increment_rate);
  let nextTargetInteger = Math.ceil(rawNext);

  // Goal ceiling check
  if (nextTargetInteger > habit.max_goal_integer) {
    nextTargetInteger = habit.max_goal_integer;
  }

  const newStreak = habit.streak + 1;

  db.runSync(
    `UPDATE habits SET current_target = ?, streak = ? WHERE id = ?`,
    [nextTargetInteger, newStreak, habit.id]
  );
};

export const resetToBaseline = (habit: Habit) => {
  db.runSync(
    `UPDATE habits SET current_target = ?, streak = 0 WHERE id = ?`,
    [habit.base_target, habit.id]
  );
};

export const calculateDailyScore = (dateStr: string): number => {
  const habits = getHabits();
  if (habits.length === 0) return 0;

  const logs = db.getAllSync<any>(
    `SELECT * FROM daily_logs WHERE date = ? AND completed = 1`,
    [dateStr]
  );

  const journal = db.getFirstSync<any>(
    `SELECT * FROM journal_entries WHERE date = ?`,
    [dateStr]
  );

  let score = 0;
  const habitRatio = Math.min(logs.length / habits.length, 1);
  score += habitRatio * 50;

  if (journal?.morning_gratitude && journal?.daily_non_negotiable) {
    score += 25;
  }

  if (journal?.evening_win && journal?.greenlight_moment) {
    score += 25;
  }

  return Math.round(score);
};

export const getWeeklyCompletionStats = (): { dayLabel: string; count: number; date: string }[] => {
  const stats = [];
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayLabel = daysOfWeek[d.getDay()];

    const res = db.getFirstSync<any>(
      `SELECT COUNT(*) as count FROM daily_logs WHERE date = ? AND completed = 1`,
      [dateStr]
    );

    stats.push({ dayLabel, count: res?.count || 0, date: dateStr });
  }
  return stats;
};