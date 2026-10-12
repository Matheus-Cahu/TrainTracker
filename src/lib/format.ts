/** Accepts both `,` and `.` as decimal separator. Returns NaN for invalid input. */
export function parseNumber(text: string) {
  const trimmed = text.trim().replace(',', '.');
  return trimmed === '' ? NaN : Number(trimmed);
}

export function formatNumber(value: number) {
  return String(value).replace('.', ',');
}

export function formatLoad(kg: number) {
  return kg > 0 ? `${formatNumber(kg)} kg` : 'Sem carga';
}

/** `12` when every set is equal, `12 · 10 · 8` otherwise. */
function formatSeries(values: number[]) {
  return values.every((v) => v === values[0])
    ? formatNumber(values[0])
    : values.map(formatNumber).join(' · ');
}

export function formatExerciseSummary(exercise: { sets: number; reps: number[]; loads: number[] }) {
  const reps = `${exercise.sets} × ${formatSeries(exercise.reps)} reps`;
  return exercise.loads.some((l) => l > 0) ? `${reps} — ${formatSeries(exercise.loads)} kg` : reps;
}
