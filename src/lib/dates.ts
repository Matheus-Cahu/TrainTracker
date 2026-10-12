export const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

export const WEEKDAY_INITIALS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

const pad = (n: number) => String(n).padStart(2, '0');

/** Local day as `YYYY-MM-DD`. */
export function toDateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function formatTime(hour: number, minute: number) {
  return `${pad(hour)}:${pad(minute)}`;
}

export function formatClock(timestamp: number) {
  const date = new Date(timestamp);
  return formatTime(date.getHours(), date.getMinutes());
}

/** `m:ss` countdown. */
export function formatCountdown(totalSeconds: number) {
  const seconds = Math.max(0, Math.ceil(totalSeconds));
  return `${Math.floor(seconds / 60)}:${pad(seconds % 60)}`;
}

export function formatDuration(ms: number) {
  const minutes = Math.max(1, Math.round(ms / 60000));
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${pad(minutes % 60)} min`;
}

export function formatShortDate(timestamp: number) {
  const date = new Date(timestamp);
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}`;
}
