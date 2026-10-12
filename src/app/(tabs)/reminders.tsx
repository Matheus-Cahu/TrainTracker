import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, TabScreen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { listReminders, setReminderTaken } from '@/db/repo';
import { useFocusQuery } from '@/hooks/use-focus-query';
import { useTheme } from '@/hooks/use-theme';
import { formatClock, formatTime, toDateKey } from '@/lib/dates';
import { notificationsSupported } from '@/lib/notifications';
import type { Reminder } from '@/types';

export default function RemindersScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const theme = useTheme();
  const { data: reminders, reload } = useFocusQuery((db) => listReminders(db, toDateKey(new Date())));

  const open = (id: number | 'new') => router.push({ pathname: '/reminder/[id]', params: { id } });

  const toggleTaken = async (reminder: Reminder) => {
    await setReminderTaken(db, reminder.id, toDateKey(new Date()), reminder.takenAt === null);
    reload();
  };

  return (
    <TabScreen
      title="Notificações"
      action={<Button title="Nova" icon="add" onPress={() => open('new')} />}>
      {reminders?.length === 0 && (
        <EmptyState>Adicione lembretes para tomar seus suplementos no horário certo.</EmptyState>
      )}
      {reminders?.map((reminder) => {
        const taken = reminder.takenAt !== null;
        return (
          <Card key={reminder.id} style={styles.card} onPress={() => open(reminder.id)}>
            <View style={styles.info}>
              <ThemedText type="smallBold" style={styles.title}>
                {reminder.title}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Todo dia às {formatTime(reminder.hour, reminder.minute)}
                {reminder.enabled || !notificationsSupported ? '' : ' · notificação desligada'}
              </ThemedText>
              <ThemedText type="small" themeColor={taken ? 'success' : 'textSecondary'}>
                {taken ? `Tomado hoje às ${formatClock(reminder.takenAt!)}` : 'Ainda não tomado hoje'}
              </ThemedText>
            </View>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: taken }}
              accessibilityLabel={`Marcar ${reminder.title} como tomado hoje`}
              hitSlop={8}
              onPress={() => toggleTaken(reminder)}
              style={[
                styles.check,
                { borderColor: taken ? theme.success : theme.border },
                taken && { backgroundColor: theme.success },
              ]}>
              {taken && <Icon name="check" color={theme.onTint} />}
            </Pressable>
          </Card>
        );
      })}
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  info: {
    flex: 1,
    gap: Spacing.half,
  },
  title: {
    fontSize: 18,
  },
  check: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
