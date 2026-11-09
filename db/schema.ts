import * as SQLite from 'expo-sqlite';

export interface Habit {
  id?: number;
  title: string;
  category: string;
  current_target: number;
  unit: string;
  increment_rate: number;
  base_target: number;
  streak: number;
  max_goal_integer: number;
  reminder_time: string | null;
}

export interface JournalEntry {
  id?: number;
  date: string;
  morning_gratitude: string;
  daily_non_negotiable: string;
  identity_affirmation: string;
  evening_win: string;
  greenlight_moment: string;
  unforgiving_honesty_reflection: string;
}

const db = SQLite.openDatabaseSync('greenlight_habits.db');

export const initDatabase = () => {
  // 1. Create base tables if they don't exist
  db.execSync(`
    CREATE TABLE IF NOT EXISTS habits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      current_target INTEGER NOT NULL,
      unit TEXT NOT NULL,
      increment_rate REAL DEFAULT 0.01,
      base_target INTEGER NOT NULL,
      streak INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS daily_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      habit_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      completed INTEGER NOT NULL,
      value_achieved REAL NOT NULL,
      notes TEXT,
      FOREIGN KEY(habit_id) REFERENCES habits(id)
    );

    CREATE TABLE IF NOT EXISTS journal_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT UNIQUE NOT NULL,
      morning_gratitude TEXT,
      daily_non_negotiable TEXT,
      identity_affirmation TEXT,
      evening_win TEXT,
      greenlight_moment TEXT,
      unforgiving_honesty_reflection TEXT
    );
  `);

  // 2. Migration: Add missing columns if upgrading from an older database version
  try {
    db.execSync(`ALTER TABLE habits ADD COLUMN max_goal_integer INTEGER NOT NULL DEFAULT 25;`);
  } catch (e) {
    // Column already exists, safe to ignore
  }

  try {
    db.execSync(`ALTER TABLE habits ADD COLUMN reminder_time TEXT;`);
  } catch (e) {
    // Column already exists, safe to ignore
  }
};

export { db };