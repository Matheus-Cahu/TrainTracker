import type { SQLiteDatabase } from 'expo-sqlite';

import { AccentColors, DEFAULT_ACCENT, type AccentName, type ThemeMode } from '@/constants/theme';
import type {
  Exercise,
  ExerciseInput,
  Reminder,
  Session,
  Settings,
  Workout,
  WorkoutSummary,
} from '@/types';

export const DEFAULT_REST_SECONDS = 60;

// Settings

export async function getSettings(db: SQLiteDatabase): Promise<Settings> {
  const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM settings');
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const themeMode = map.get('theme_mode');
  const accent = map.get('accent');
  return {
    restSeconds: Number(map.get('rest_seconds') ?? DEFAULT_REST_SECONDS),
    themeMode: themeMode === 'light' || themeMode === 'dark' ? themeMode : 'system',
    accent: accent && accent in AccentColors ? (accent as AccentName) : DEFAULT_ACCENT,
    mapImage: map.get('map_image') ?? null,
    mapWidth: Number(map.get('map_width') ?? 1),
    mapHeight: Number(map.get('map_height') ?? 1),
  };
}

async function setSetting(db: SQLiteDatabase, key: string, value: string | null) {
  if (value === null) {
    await db.runAsync('DELETE FROM settings WHERE key = ?', key);
  } else {
    await db.runAsync(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      key,
      value
    );
  }
}

export function setRestSeconds(db: SQLiteDatabase, seconds: number) {
  return setSetting(db, 'rest_seconds', String(seconds));
}

export function setThemeMode(db: SQLiteDatabase, mode: ThemeMode) {
  return setSetting(db, 'theme_mode', mode);
}

export function setAccent(db: SQLiteDatabase, accent: AccentName) {
  return setSetting(db, 'accent', accent);
}

export async function setMapImage(
  db: SQLiteDatabase,
  map: { image: string; width: number; height: number } | null
) {
  await setSetting(db, 'map_image', map?.image ?? null);
  await setSetting(db, 'map_width', map ? String(map.width) : null);
  await setSetting(db, 'map_height', map ? String(map.height) : null);
}

// Workouts

export function listWorkouts(db: SQLiteDatabase) {
  return db.getAllAsync<WorkoutSummary>(`
    SELECT w.id, w.name,
      (SELECT COUNT(*) FROM exercises e WHERE e.workout_id = w.id) AS exerciseCount,
      (SELECT MAX(s.started_at) FROM sessions s WHERE s.workout_id = w.id) AS lastDoneAt
    FROM workouts w
    ORDER BY w.created_at
  `);
}

export function getWorkout(db: SQLiteDatabase, id: number) {
  return db.getFirstAsync<Workout>('SELECT id, name FROM workouts WHERE id = ?', id);
}

export async function createWorkout(db: SQLiteDatabase, name: string) {
  const result = await db.runAsync(
    'INSERT INTO workouts (name, created_at) VALUES (?, ?)',
    name,
    Date.now()
  );
  return result.lastInsertRowId;
}

export async function renameWorkout(db: SQLiteDatabase, id: number, name: string) {
  await db.runAsync('UPDATE workouts SET name = ? WHERE id = ?', name, id);
}

/** Deletes the workout and its exercises. Returns the photos that are no longer referenced. */
export async function deleteWorkout(db: SQLiteDatabase, id: number) {
  const photos = await db.getAllAsync<{ photo: string }>(
    'SELECT photo FROM exercises WHERE workout_id = ? AND photo IS NOT NULL',
    id
  );
  await db.runAsync('DELETE FROM workouts WHERE id = ?', id);
  return photos.map((p) => p.photo);
}

// Exercises

type ExerciseRow = {
  id: number;
  workout_id: number;
  position: number;
  name: string;
  photo: string | null;
  map_x: number | null;
  map_y: number | null;
  sets: number;
  reps: string;
  loads: string;
  notes: string;
};

function toExercise(row: ExerciseRow): Exercise {
  return {
    id: row.id,
    workoutId: row.workout_id,
    position: row.position,
    name: row.name,
    photo: row.photo,
    mapX: row.map_x,
    mapY: row.map_y,
    sets: row.sets,
    reps: JSON.parse(row.reps),
    loads: JSON.parse(row.loads),
    notes: row.notes,
  };
}

export async function listExercises(db: SQLiteDatabase, workoutId: number) {
  const rows = await db.getAllAsync<ExerciseRow>(
    'SELECT * FROM exercises WHERE workout_id = ? ORDER BY position, id',
    workoutId
  );
  return rows.map(toExercise);
}

export async function getExercise(db: SQLiteDatabase, id: number) {
  const row = await db.getFirstAsync<ExerciseRow>('SELECT * FROM exercises WHERE id = ?', id);
  return row ? toExercise(row) : null;
}

export async function createExercise(db: SQLiteDatabase, input: ExerciseInput) {
  await db.runAsync(
    `INSERT INTO exercises (workout_id, position, name, photo, map_x, map_y, sets, reps, loads, notes)
     VALUES (?, (SELECT COALESCE(MAX(position), -1) + 1 FROM exercises WHERE workout_id = ?), ?, ?, ?, ?, ?, ?, ?, ?)`,
    input.workoutId,
    input.workoutId,
    input.name,
    input.photo,
    input.mapX,
    input.mapY,
    input.sets,
    JSON.stringify(input.reps),
    JSON.stringify(input.loads),
    input.notes
  );
}

export async function updateExercise(db: SQLiteDatabase, id: number, input: ExerciseInput) {
  await db.runAsync(
    `UPDATE exercises
     SET name = ?, photo = ?, map_x = ?, map_y = ?, sets = ?, reps = ?, loads = ?, notes = ?
     WHERE id = ?`,
    input.name,
    input.photo,
    input.mapX,
    input.mapY,
    input.sets,
    JSON.stringify(input.reps),
    JSON.stringify(input.loads),
    input.notes,
    id
  );
}

export async function deleteExercise(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM exercises WHERE id = ?', id);
}

/** Persists a new order; `ids` lists every exercise of the workout in display order. */
export async function reorderExercises(db: SQLiteDatabase, ids: number[]) {
  await db.withTransactionAsync(async () => {
    for (const [position, id] of ids.entries()) {
      await db.runAsync('UPDATE exercises SET position = ? WHERE id = ?', position, id);
    }
  });
}

// Sessions

const SESSION_COLUMNS = `
  id, workout_id AS workoutId, workout_name AS workoutName, date,
  started_at AS startedAt, finished_at AS finishedAt,
  exercises_done AS exercisesDone, exercises_total AS exercisesTotal
`;

export async function createSession(db: SQLiteDatabase, session: Omit<Session, 'id'>) {
  await db.runAsync(
    `INSERT INTO sessions
       (workout_id, workout_name, date, started_at, finished_at, exercises_done, exercises_total)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    session.workoutId,
    session.workoutName,
    session.date,
    session.startedAt,
    session.finishedAt,
    session.exercisesDone,
    session.exercisesTotal
  );
}

/** `month` is `YYYY-MM`. */
export function listSessionsInMonth(db: SQLiteDatabase, month: string) {
  return db.getAllAsync<Session>(
    `SELECT ${SESSION_COLUMNS} FROM sessions WHERE date LIKE ? ORDER BY started_at`,
    `${month}-%`
  );
}

export async function deleteSession(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM sessions WHERE id = ?', id);
}

// Reminders

type ReminderRow = Omit<Reminder, 'enabled'> & { enabled: number };

const REMINDER_SELECT = `
  SELECT r.id, r.title, r.hour, r.minute, r.enabled,
    r.notification_id AS notificationId, l.taken_at AS takenAt
  FROM reminders r
  LEFT JOIN reminder_logs l ON l.reminder_id = r.id AND l.date = ?
`;

/** `today` is the local day (`YYYY-MM-DD`) used to resolve `takenAt`. */
export async function listReminders(db: SQLiteDatabase, today: string): Promise<Reminder[]> {
  const rows = await db.getAllAsync<ReminderRow>(
    `${REMINDER_SELECT} ORDER BY r.hour, r.minute, r.id`,
    today
  );
  return rows.map((r) => ({ ...r, enabled: r.enabled === 1 }));
}

export async function getReminder(db: SQLiteDatabase, id: number, today: string) {
  const row = await db.getFirstAsync<ReminderRow>(`${REMINDER_SELECT} WHERE r.id = ?`, today, id);
  return row ? { ...row, enabled: row.enabled === 1 } : null;
}

type ReminderInput = Pick<Reminder, 'title' | 'hour' | 'minute' | 'enabled' | 'notificationId'>;

export async function createReminder(db: SQLiteDatabase, input: ReminderInput) {
  await db.runAsync(
    'INSERT INTO reminders (title, hour, minute, enabled, notification_id) VALUES (?, ?, ?, ?, ?)',
    input.title,
    input.hour,
    input.minute,
    input.enabled ? 1 : 0,
    input.notificationId
  );
}

export async function updateReminder(db: SQLiteDatabase, id: number, input: ReminderInput) {
  await db.runAsync(
    'UPDATE reminders SET title = ?, hour = ?, minute = ?, enabled = ?, notification_id = ? WHERE id = ?',
    input.title,
    input.hour,
    input.minute,
    input.enabled ? 1 : 0,
    input.notificationId,
    id
  );
}

export async function deleteReminder(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM reminders WHERE id = ?', id);
}

export async function setReminderTaken(
  db: SQLiteDatabase,
  id: number,
  date: string,
  taken: boolean
) {
  if (taken) {
    await db.runAsync(
      'INSERT OR IGNORE INTO reminder_logs (reminder_id, date, taken_at) VALUES (?, ?, ?)',
      id,
      date,
      Date.now()
    );
  } else {
    await db.runAsync('DELETE FROM reminder_logs WHERE reminder_id = ? AND date = ?', id, date);
  }
}
