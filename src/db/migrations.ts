import type { SQLiteDatabase } from 'expo-sqlite';

const LATEST_VERSION = 2;

export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  // Foreign keys are off by default and the setting is per connection.
  await db.execAsync('PRAGMA foreign_keys = ON;');

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;
  if (version >= LATEST_VERSION) return;

  if (version === 0) {
    await db.execAsync(`
      PRAGMA journal_mode = 'wal';

      CREATE TABLE settings (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );

      CREATE TABLE workouts (
        id INTEGER PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE exercises (
        id INTEGER PRIMARY KEY NOT NULL,
        workout_id INTEGER NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
        position INTEGER NOT NULL,
        name TEXT NOT NULL,
        photo TEXT,
        map_x REAL,
        map_y REAL,
        sets INTEGER NOT NULL,
        reps TEXT NOT NULL,
        loads TEXT NOT NULL,
        notes TEXT NOT NULL DEFAULT ''
      );
      CREATE INDEX exercises_workout ON exercises(workout_id, position);

      CREATE TABLE sessions (
        id INTEGER PRIMARY KEY NOT NULL,
        workout_id INTEGER REFERENCES workouts(id) ON DELETE SET NULL,
        workout_name TEXT NOT NULL,
        date TEXT NOT NULL,
        started_at INTEGER NOT NULL,
        finished_at INTEGER NOT NULL,
        exercises_done INTEGER NOT NULL,
        exercises_total INTEGER NOT NULL
      );
      CREATE INDEX sessions_date ON sessions(date);

      CREATE TABLE reminders (
        id INTEGER PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        hour INTEGER NOT NULL,
        minute INTEGER NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        notification_id TEXT
      );

      CREATE TABLE reminder_logs (
        reminder_id INTEGER NOT NULL REFERENCES reminders(id) ON DELETE CASCADE,
        date TEXT NOT NULL,
        taken_at INTEGER NOT NULL,
        PRIMARY KEY (reminder_id, date)
      );
    `);
    version = 1;
  }

  if (version === 1) {
    await db.execAsync(`
      CREATE TABLE weights (
        date TEXT PRIMARY KEY NOT NULL,
        kg REAL NOT NULL
      );

      CREATE TABLE progress_photos (
        date TEXT PRIMARY KEY NOT NULL,
        photo TEXT NOT NULL
      );
    `);
    version = 2;
  }

  await db.execAsync(`PRAGMA user_version = ${LATEST_VERSION}`);
}
