import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IconButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, TabScreen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { deleteSession, listSessionsInMonth } from '@/db/repo';
import { useFocusQuery } from '@/hooks/use-focus-query';
import { useTheme } from '@/hooks/use-theme';
import { confirm } from '@/lib/dialog';
import {
  MONTH_NAMES,
  WEEKDAY_INITIALS,
  formatClock,
  formatDuration,
  toDateKey,
} from '@/lib/dates';
import type { Session } from '@/types';

export default function CalendarScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const todayKey = toDateKey(new Date());
  // First day of the displayed month.
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selected, setSelected] = useState(todayKey);

  const monthKey = toDateKey(month).slice(0, 7);
  const { data: sessions = [], reload } = useFocusQuery(
    (db) => listSessionsInMonth(db, monthKey),
    monthKey
  );

  const trainedDays = new Set(sessions.map((s) => s.date));
  const daySessions = sessions.filter((s) => s.date === selected);

  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  // Leading blanks align day 1 with its weekday column.
  const cells: (number | null)[] = [
    ...Array<null>(month.getDay()).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const changeMonth = (delta: number) =>
    setMonth(new Date(month.getFullYear(), month.getMonth() + delta, 1));

  const confirmDelete = async (session: Session) => {
    const confirmed = await confirm({
      title: 'Remover registro?',
      message: `${session.workoutName} sairá do calendário.`,
      confirmLabel: 'Remover',
      destructive: true,
    });
    if (!confirmed) return;
    await deleteSession(db, session.id);
    reload();
  };

  return (
    <TabScreen title="Calendário">
      <Card>
        <View style={styles.monthHeader}>
          <IconButton icon="chevronLeft" label="Mês anterior" onPress={() => changeMonth(-1)} />
          <ThemedText type="smallBold">
            {MONTH_NAMES[month.getMonth()]} {month.getFullYear()}
          </ThemedText>
          <IconButton icon="chevronRight" label="Próximo mês" onPress={() => changeMonth(1)} />
        </View>

        <View style={styles.grid}>
          {WEEKDAY_INITIALS.map((initial, i) => (
            <View key={i} style={styles.cell}>
              <ThemedText type="small" themeColor="textSecondary">
                {initial}
              </ThemedText>
            </View>
          ))}
          {cells.map((day, i) => {
            if (day === null) return <View key={i} style={styles.cell} />;
            const key = `${monthKey}-${String(day).padStart(2, '0')}`;
            const trained = trainedDays.has(key);
            const isSelected = key === selected;
            return (
              <Pressable
                key={i}
                accessibilityLabel={`Dia ${day}${trained ? ', treinou' : ''}`}
                onPress={() => setSelected(key)}
                style={styles.cell}>
                <View
                  style={[
                    styles.day,
                    trained && { backgroundColor: theme.tint },
                    key === todayKey && { borderWidth: 2, borderColor: theme.textSecondary },
                    isSelected && { borderWidth: 2, borderColor: theme.text },
                  ]}>
                  <ThemedText type="small" style={trained && { color: theme.onTint }}>
                    {day}
                  </ThemedText>
                </View>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <ThemedText type="smallBold" themeColor="textSecondary">
        {selected.split('-').reverse().join('/')}
      </ThemedText>
      {daySessions.length === 0 && <EmptyState>Nenhum treino neste dia.</EmptyState>}
      {daySessions.map((session) => (
        <Card key={session.id} style={styles.session}>
          <View style={styles.sessionInfo}>
            <ThemedText type="smallBold">{session.workoutName}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {formatClock(session.startedAt)} ·{' '}
              {formatDuration(session.finishedAt - session.startedAt)} · {session.exercisesDone}/
              {session.exercisesTotal} exercícios
            </ThemedText>
          </View>
          <IconButton
            icon="trash"
            label="Remover registro"
            color={theme.textSecondary}
            onPress={() => confirmDelete(session)}
          />
        </Card>
      ))}
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  day: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  session: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  sessionInfo: {
    flex: 1,
    gap: Spacing.half,
  },
});
