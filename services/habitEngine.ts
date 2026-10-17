import { db, Habit } from '../db/schema';

export const getHabits = (): Habit[] => {
  return db.getAllSync<Habit>('SELECT * FROM habits');
};

export const addHabit = (habit: Omit<Habit, 'id' | 'streak'>) => {
  db.runSync(
    `INSERT INTO habits (title, category, current_target, unit, increment_rate, base_target, streak) 
     VALUES (?, ?, ?, ?, ?, ?, 0)`,
    [
      habit.title,
      habit.category,
      habit.current_target,
      habit.unit,
      habit.increment_rate,
      habit.base_target,
    ]
  );
};

export const completeHabit = (habit: Habit, valueAchieved: number, notes: string = '') => {
  const today = new Date().toISOString().split('T')[0];

  db.runSync(
    `INSERT INTO daily_logs (habit_id, date, completed, value_achieved, notes) VALUES (?, ?, 1, ?, ?)`,
    [habit.id!, today, valueAchieved, notes]
  );

  const nextTarget = Number((habit.current_target * (1 + habit.increment_rate)).toFixed(2));
  const newStreak = habit.streak + 1;

  db.runSync(
    `UPDATE habits SET current_target = ?, streak = ? WHERE id = ?`,
    [nextTarget, newStreak, habit.id]
  );
};

export const resetToBaseline = (habit: Habit) => {
  db.runSync(
    `UPDATE habits SET current_target = ?, streak = 0 WHERE id = ?`,
    [habit.base_target, habit.id]
  );
};

// Calculates the "Successful Man" daily score (0 - 100%)
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
  // Habit completion accounts for 50% of the score
  const habitRatio = Math.min(logs.length / habits.length, 1);
  score += habitRatio * 50;

  // Morning intentions / Non-negotiables account for 25%
  if (journal?.morning_gratitude && journal?.daily_non_negotiable) {
    score += 25;
  }

  // Evening audit / Unforgiving honesty accounts for 25%
  if (journal?.evening_win && journal?.greenlight_moment) {
    score += 25;
  }

  return Math.round(score);
};