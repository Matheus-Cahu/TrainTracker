import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { FormScreen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { createReminder, deleteReminder, getReminder, updateReminder } from '@/db/repo';
import { useFocusQuery } from '@/hooks/use-focus-query';
import { toDateKey } from '@/lib/dates';
import { confirm, notify } from '@/lib/dialog';
import {
  cancelNotification,
  notificationsSupported,
  requestNotificationPermission,
  scheduleReminder,
} from '@/lib/notifications';
import type { Reminder } from '@/types';

export default function ReminderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data } = useFocusQuery(
    async (db) => ({
      reminder: id === 'new' ? null : await getReminder(db, Number(id), toDateKey(new Date())),
    }),
    id
  );

  if (!data) return <FormScreen>{null}</FormScreen>;
  return <ReminderForm reminder={data.reminder} />;
}

const pad = (n: number) => String(n).padStart(2, '0');

function ReminderForm({ reminder }: { reminder: Reminder | null }) {
  const db = useSQLiteContext();
  const router = useRouter();
  const [title, setTitle] = useState(reminder?.title ?? '');
  const [hourText, setHourText] = useState(pad(reminder?.hour ?? 8));
  const [minuteText, setMinuteText] = useState(pad(reminder?.minute ?? 0));
  const [enabled, setEnabled] = useState(reminder?.enabled ?? true);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const hour = Number(hourText);
    const minute = Number(minuteText);
    if (!title.trim()) return notify('Informe o nome do suplemento.');
    const validTime =
      hourText.trim() !== '' &&
      minuteText.trim() !== '' &&
      Number.isInteger(hour) &&
      Number.isInteger(minute) &&
      hour >= 0 &&
      hour <= 23 &&
      minute >= 0 &&
      minute <= 59;
    if (!validTime) return notify('Horário inválido', 'Use o formato 24 h, de 00:00 a 23:59.');

    setSaving(true);
    try {
      let schedule = enabled && notificationsSupported;
      if (schedule && !(await requestNotificationPermission())) {
        schedule = false;
        notify(
          'Notificações bloqueadas',
          'O lembrete foi salvo sem notificação. Permita notificações nos ajustes do aparelho e ative-o novamente.'
        );
      }
      // The schedule is always rebuilt: title or time may have changed.
      await cancelNotification(reminder?.notificationId ?? null);
      const input = {
        title: title.trim(),
        hour,
        minute,
        enabled: schedule,
        notificationId: schedule ? await scheduleReminder(title.trim(), hour, minute) : null,
      };
      if (reminder) await updateReminder(db, reminder.id, input);
      else await createReminder(db, input);
      router.back();
    } catch (error) {
      console.warn('Failed to save reminder', error);
      notify('Não foi possível salvar o lembrete.');
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!reminder) return;
    const confirmed = await confirm({
      title: 'Excluir lembrete?',
      confirmLabel: 'Excluir',
      destructive: true,
    });
    if (!confirmed) return;
    await cancelNotification(reminder.notificationId);
    await deleteReminder(db, reminder.id);
    router.back();
  };

  return (
    <FormScreen footer={<Button title="Salvar" icon="check" disabled={saving} onPress={save} />}>
      <Field label="Suplemento">
        <Input value={title} onChangeText={setTitle} placeholder="Ex.: Creatina" />
      </Field>

      <Field label="Horário (todos os dias)">
        <View style={styles.time}>
          <Input
            value={hourText}
            onChangeText={setHourText}
            keyboardType="number-pad"
            maxLength={2}
            accessibilityLabel="Hora"
            style={styles.timeInput}
          />
          <ThemedText type="subtitle">:</ThemedText>
          <Input
            value={minuteText}
            onChangeText={setMinuteText}
            keyboardType="number-pad"
            maxLength={2}
            accessibilityLabel="Minuto"
            style={styles.timeInput}
          />
        </View>
      </Field>

      {notificationsSupported ? (
        <View style={styles.switchRow}>
          <ThemedText>Enviar notificação</ThemedText>
          <Switch value={enabled} onValueChange={setEnabled} />
        </View>
      ) : (
        <ThemedText type="small" themeColor="textSecondary">
          Notificações não estão disponíveis no navegador; o lembrete fica só na lista.
        </ThemedText>
      )}

      {reminder && <Button title="Excluir lembrete" variant="danger" onPress={confirmDelete} />}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  time: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  timeInput: {
    width: 72,
    textAlign: 'center',
    fontSize: 24,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
