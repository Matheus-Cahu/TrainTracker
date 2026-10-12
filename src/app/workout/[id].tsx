import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, IconButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field, Input } from '@/components/ui/field';
import { EmptyState, FormScreen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import {
  deleteWorkout,
  getWorkout,
  listExercises,
  renameWorkout,
  reorderExercises,
} from '@/db/repo';
import { useFocusQuery } from '@/hooks/use-focus-query';
import { useTheme } from '@/hooks/use-theme';
import { confirm } from '@/lib/dialog';
import { formatExerciseSummary } from '@/lib/format';
import { deleteImage } from '@/lib/images';
import type { Exercise, Workout } from '@/types';

export default function WorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const workoutId = Number(id);
  const { data, reload } = useFocusQuery(
    async (db) => ({
      workout: await getWorkout(db, workoutId),
      exercises: await listExercises(db, workoutId),
    }),
    workoutId
  );

  if (!data?.workout) return <FormScreen>{null}</FormScreen>;
  return <WorkoutEditor workout={data.workout} exercises={data.exercises} reload={reload} />;
}

type EditorProps = { workout: Workout; exercises: Exercise[]; reload: () => void };

function WorkoutEditor({ workout, exercises, reload }: EditorProps) {
  const db = useSQLiteContext();
  const router = useRouter();
  const theme = useTheme();
  const [name, setName] = useState(workout.name);

  const changeName = (text: string) => {
    setName(text);
    if (text.trim()) renameWorkout(db, workout.id, text.trim());
  };

  const move = async (index: number, delta: number) => {
    const ids = exercises.map((e) => e.id);
    [ids[index], ids[index + delta]] = [ids[index + delta], ids[index]];
    await reorderExercises(db, ids);
    reload();
  };

  const confirmDelete = async () => {
    const confirmed = await confirm({
      title: 'Excluir treino?',
      message: 'Os exercícios deste treino também serão excluídos.',
      confirmLabel: 'Excluir',
      destructive: true,
    });
    if (!confirmed) return;
    const photos = await deleteWorkout(db, workout.id);
    photos.forEach(deleteImage);
    router.back();
  };

  return (
    <FormScreen
      footer={
        <>
          <Button
            title="Adicionar exercício"
            icon="add"
            variant="secondary"
            onPress={() =>
              router.push({
                pathname: '/exercise/[id]',
                params: { id: 'new', workoutId: workout.id },
              })
            }
          />
          <Button
            title="Iniciar treino"
            icon="play"
            disabled={exercises.length === 0}
            onPress={() => router.push({ pathname: '/session/[id]', params: { id: workout.id } })}
          />
        </>
      }>
      <Stack.Screen
        options={{
          headerRight: () => (
            <IconButton
              icon="trash"
              label="Excluir treino"
              color={theme.danger}
              onPress={confirmDelete}
            />
          ),
        }}
      />

      <Field label="Nome do treino">
        <Input value={name} onChangeText={changeName} placeholder="Ex.: Treino A — Peito" />
      </Field>

      <ThemedText type="smallBold" themeColor="textSecondary">
        Exercícios
      </ThemedText>
      {exercises.length === 0 && <EmptyState>Nenhum exercício neste treino.</EmptyState>}
      {exercises.map((exercise, index) => (
        <Card
          key={exercise.id}
          style={styles.card}
          onPress={() =>
            router.push({
              pathname: '/exercise/[id]',
              params: { id: exercise.id, workoutId: workout.id },
            })
          }>
          <View style={styles.info}>
            <ThemedText type="smallBold">{exercise.name}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {formatExerciseSummary(exercise)}
            </ThemedText>
          </View>
          <IconButton
            icon="up"
            label={`Mover ${exercise.name} para cima`}
            disabled={index === 0}
            onPress={() => move(index, -1)}
          />
          <IconButton
            icon="down"
            label={`Mover ${exercise.name} para baixo`}
            disabled={index === exercises.length - 1}
            onPress={() => move(index, 1)}
          />
        </Card>
      ))}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  info: {
    flex: 1,
    gap: Spacing.half,
  },
});
