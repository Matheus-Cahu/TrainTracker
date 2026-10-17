import type { AccentName, ThemeMode } from '@/constants/theme';

export type Workout = {
  id: number;
  name: string;
};

export type WorkoutSummary = Workout & {
  exerciseCount: number;
  lastDoneAt: number | null;
};

export type Exercise = {
  id: number;
  workoutId: number;
  position: number;
  name: string;
  /** File name inside the app's image directory (see `lib/images`). */
  photo: string | null;
  /** Position on the gym map, normalized to 0..1 of the image's width/height. */
  mapX: number | null;
  mapY: number | null;
  sets: number;
  /** One entry per set. */
  reps: number[];
  /** One entry per set, in kg. 0 means no load. */
  loads: number[];
  notes: string;
};

export type ExerciseInput = Omit<Exercise, 'id' | 'position'>;

export type Session = {
  id: number;
  workoutId: number | null;
  workoutName: string;
  /** Local day, `YYYY-MM-DD`. */
  date: string;
  startedAt: number;
  finishedAt: number;
  exercisesDone: number;
  exercisesTotal: number;
};

export type Reminder = {
  id: number;
  title: string;
  hour: number;
  minute: number;
  enabled: boolean;
  notificationId: string | null;
  /** Timestamp of today's intake, if already marked. */
  takenAt: number | null;
};

/** The body weight logged on a day. */
export type WeightEntry = {
  /** Local day, `YYYY-MM-DD`. */
  date: string;
  kg: number;
};

/** The body photo taken on a day. */
export type ProgressPhoto = {
  /** Local day, `YYYY-MM-DD`. */
  date: string;
  /** File name inside the app's image directory (see `lib/images`). */
  photo: string;
};

export type Settings = {
  restSeconds: number;
  themeMode: ThemeMode;
  accent: AccentName;
  mapImage: string | null;
  mapWidth: number;
  mapHeight: number;
};
