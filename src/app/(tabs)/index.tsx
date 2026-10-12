import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, IconButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, TabScreen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { createWorkout, listWorkouts } from '@/db/repo';
import { useFocusQuery } from '@/hooks/use-focus-query';
import { useTheme } from '@/hooks/use-theme';
import { formatShortDate } from '@/lib/dates';

export default function WorkoutsScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const theme = useTheme();
  const { data: workouts } = useFocusQuery(listWorkouts);

  const addWorkout = async () => {
    const id = await createWorkout(db, 'Novo treino');
    router.push({ pathname: '/workout/[id]', params: { id } });
  };

  return (
    <TabScreen title="Treinos" action={<Button title="Novo" icon="add" onPress={addWorkout} />}>
      {workouts?.length === 0 && (
        <EmptyState>Nenhum treino ainda. Crie o primeiro para começar.</EmptyState>
      )}
      {workouts?.map((workout) => (
        <Card
          key={workout.id}
          style={styles.card}
          onPress={() => router.push({ pathname: '/workout/[id]', params: { id: workout.id } })}>
          <View style={styles.info}>
            <ThemedText type="smallBold" style={styles.name}>
              {workout.name}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {workout.exerciseCount === 1 ? '1 exercício' : `${workout.exerciseCount} exercícios`}
              {workout.lastDoneAt ? ` · último em ${formatShortDate(workout.lastDoneAt)}` : ''}
            </ThemedText>
          </View>
          <IconButton
            icon="play"
            label={`Iniciar ${workout.name}`}
            color={theme.tint}
            disabled={workout.exerciseCount === 0}
            onPress={() => router.push({ pathname: '/session/[id]', params: { id: workout.id } })}
          />
        </Card>
      ))}
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
  name: {
    fontSize: 18,
  },
});
