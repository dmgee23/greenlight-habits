import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('greenlight_habits.db');

export function initializeDatabase() {
  db.execSync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS habits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      current_target REAL NOT NULL,
      unit TEXT NOT NULL,
      increment_rate REAL NOT NULL,
      base_target REAL NOT NULL,
      max_goal_integer INTEGER NOT NULL,
      reminder_time TEXT,
      streak INTEGER DEFAULT 0,
      is_inverse INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS habit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      habit_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      completed INTEGER NOT NULL,
      notes TEXT,
      FOREIGN KEY (habit_id) REFERENCES habits (id) ON DELETE CASCADE,
      UNIQUE(habit_id, date)
    );

    CREATE TABLE IF NOT EXISTS journal_entries (
      date TEXT PRIMARY KEY NOT NULL,
      morning_gratitude TEXT,
      daily_non_negotiable TEXT,
      identity_affirmation TEXT,
      evening_win TEXT,
      greenlight_moment TEXT,
      unforgiving_honesty_reflection TEXT
    );
  `);
}

export { db };