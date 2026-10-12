import { Image } from 'expo-image';
import { useKeepAwake } from 'expo-keep-awake';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  BackHandler,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Vibration,
  View,
} from 'react-native';

import { GymMap } from '@/components/gym-map';
import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, FormScreen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { createSession, getSettings, getWorkout, listExercises } from '@/db/repo';
import { useTheme } from '@/hooks/use-theme';
import { formatCountdown, formatDuration, toDateKey } from '@/lib/dates';
import { confirm, notify } from '@/lib/dialog';
import { formatLoad } from '@/lib/format';
import { imageUri } from '@/lib/images';
import { cancelNotification, scheduleRestEnd } from '@/lib/notifications';
import type { Exercise, Settings, Workout } from '@/types';

type SessionData = { workout: Workout | null; exercises: Exercise[]; settings: Settings };

export default function SessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const [data, setData] = useState<SessionData>();

  // Loaded once: edits made elsewhere must not reshuffle a workout in progress.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const workoutId = Number(id);
      const loaded = {
        workout: await getWorkout(db, workoutId),
        exercises: await listExercises(db, workoutId),
        settings: await getSettings(db),
      };
      if (!cancelled) setData(loaded);
    })();
    return () => {
      cancelled = true;
    };
  }, [db, id]);

  if (!data) return <FormScreen>{null}</FormScreen>;
  if (!data.workout || data.exercises.length === 0) {
    return (
      <FormScreen>
        <EmptyState>Este treino não tem exercícios.</EmptyState>
      </FormScreen>
    );
  }
  return <Player workout={data.workout} exercises={data.exercises} settings={data.settings} />;
}

type Progress = {
  /** Index of the exercise on screen. */
  current: number;
  /** Sets completed, per exercise. */
  setsDone: number[];
  /** Exercises postponed by the user, per exercise. */
  skipped: boolean[];
};

type Status = 'done' | 'skipped' | 'pending';

function statusOf(exercises: Exercise[], progress: Progress, index: number): Status {
  if (progress.setsDone[index] >= exercises[index].sets) return 'done';
  return progress.skipped[index] ? 'skipped' : 'pending';
}

/**
 * The exercise to show after leaving `progress.current`: the next pending one,
 * then the skipped ones. Returns -1 when everything is done.
 */
function nextExercise(exercises: Exercise[], progress: Progress) {
  const from = progress.current;
  const others = exercises.map((_, k) => (from + 1 + k) % exercises.length).slice(0, -1);
  const pending = others.find((i) => statusOf(exercises, progress, i) === 'pending');
  if (pending !== undefined) return pending;
  const skipped = others.find((i) => statusOf(exercises, progress, i) === 'skipped');
  if (skipped !== undefined) return skipped;
  return statusOf(exercises, progress, from) === 'done' ? -1 : from;
}

type Rest = { endsAt: number; totalSeconds: number };

type PlayerProps = { workout: Workout; exercises: Exercise[]; settings: Settings };

function Player({ workout, exercises, settings }: PlayerProps) {
  useKeepAwake();
  const db = useSQLiteContext();
  const router = useRouter();
  const theme = useTheme();

  const [startedAt] = useState(() => Date.now());
  const [finishedAt, setFinishedAt] = useState<number | null>(null);
  const [progress, setProgress] = useState<Progress>(() => ({
    current: 0,
    setsDone: exercises.map(() => 0),
    skipped: exercises.map(() => false),
  }));
  const [rest, setRest] = useState<Rest | null>(null);
  // Backs the in-app timer up for when the app is in the background.
  const restNotification = useRef<Promise<string | null> | null>(null);

  const cancelRestNotification = () => {
    restNotification.current?.then(cancelNotification);
    restNotification.current = null;
  };

  const startRest = (endsAt: number, totalSeconds: number) => {
    cancelRestNotification();
    restNotification.current = scheduleRestEnd((endsAt - Date.now()) / 1000);
    setRest({ endsAt, totalSeconds });
  };

  const stopRest = () => {
    cancelRestNotification();
    setRest(null);
  };

  const save = async (setsDone: number[]) => {
    const now = Date.now();
    await createSession(db, {
      workoutId: workout.id,
      workoutName: workout.name,
      date: toDateKey(new Date(startedAt)),
      startedAt,
      finishedAt: now,
      exercisesDone: exercises.filter((e, i) => setsDone[i] >= e.sets).length,
      exercisesTotal: exercises.length,
    });
    return now;
  };

  const completeSet = async () => {
    const i = progress.current;
    const after: Progress = {
      current: i,
      setsDone: progress.setsDone.map((n, j) => (j === i ? n + 1 : n)),
      skipped: progress.skipped.map((s, j) => (j === i ? false : s)),
    };
    if (statusOf(exercises, after, i) === 'done') after.current = nextExercise(exercises, after);

    if (after.current === -1) {
      stopRest();
      setProgress({ ...after, current: i });
      setFinishedAt(await save(after.setsDone));
      return;
    }
    setProgress(after);
    startRest(Date.now() + settings.restSeconds * 1000, settings.restSeconds);
  };

  const skipExercise = () => {
    const skipped: Progress = {
      ...progress,
      skipped: progress.skipped.map((s, j) => (j === progress.current ? true : s)),
    };
    const next = nextExercise(exercises, skipped);
    if (next === progress.current) {
      notify('Este é o último exercício', 'Não há outro exercício pendente para fazer antes.');
      return;
    }
    stopRest();
    setProgress({ ...skipped, current: next });
  };

  const hasProgress = progress.setsDone.some((n) => n > 0);

  const leave = async () => {
    if (finishedAt !== null || !hasProgress) {
      stopRest();
      router.back();
      return;
    }
    // Browser dialogs only offer two choices, so the question is split in two.
    if (Platform.OS === 'web') {
      const leaving = await confirm({
        title: 'Encerrar treino?',
        message: 'Ainda há exercícios pendentes.',
        confirmLabel: 'Encerrar',
      });
      if (!leaving) return;
      const keep = await confirm({
        title: 'Salvar este treino no calendário?',
        message: 'OK salva o que foi feito; Cancelar descarta.',
        confirmLabel: 'Salvar',
      });
      stopRest();
      if (keep) await save(progress.setsDone);
      router.back();
      return;
    }
    Alert.alert('Encerrar treino?', 'Ainda há exercícios pendentes.', [
      { text: 'Continuar treino', style: 'cancel' },
      {
        text: 'Descartar',
        style: 'destructive',
        onPress: () => {
          stopRest();
          router.back();
        },
      },
      {
        text: 'Salvar e encerrar',
        onPress: async () => {
          stopRest();
          await save(progress.setsDone);
          router.back();
        },
      },
    ]);
  };

  // The hardware back button goes through the same confirmation as the header one.
  const leaveRef = useRef(leave);
  useEffect(() => {
    leaveRef.current = leave;
  });
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      leaveRef.current();
      return true;
    });
    return () => {
      subscription.remove();
      restNotification.current?.then(cancelNotification);
    };
  }, []);

  const header = (
    <Stack.Screen
      options={{
        title: workout.name,
        headerBackVisible: false,
        headerLeft: () => (
          <Pressable accessibilityRole="button" hitSlop={8} onPress={leave} style={styles.leave}>
            <ThemedText type="smallBold" themeColor="tint">
              {finishedAt === null ? 'Encerrar' : 'Fechar'}
            </ThemedText>
          </Pressable>
        ),
      }}
    />
  );

  const strip = (
    <ProgressStrip
      exercises={exercises}
      progress={progress}
      finished={finishedAt !== null}
      onSelect={(index) => {
        if (finishedAt !== null || index === progress.current) return;
        stopRest();
        setProgress({ ...progress, current: index });
      }}
    />
  );

  if (finishedAt !== null) {
    return (
      <FormScreen footer={<Button title="Concluir" icon="check" onPress={leave} />}>
        {header}
        {strip}
        <View style={styles.finished}>
          <ThemedText type="subtitle">Treino concluído!</ThemedText>
          <ThemedText themeColor="textSecondary">
            {workout.name} · {formatDuration(finishedAt - startedAt)}
          </ThemedText>
        </View>
      </FormScreen>
    );
  }

  const exercise = exercises[progress.current];
  const setIndex = Math.min(progress.setsDone[progress.current], exercise.sets - 1);
  const exerciseDone = statusOf(exercises, progress, progress.current) === 'done';
  const hasLocation = settings.mapImage && exercise.mapX !== null && exercise.mapY !== null;

  return (
    <FormScreen
      footer={
        <>
          {rest && (
            <RestTimer
              rest={rest}
              onAddTime={(seconds) =>
                startRest(rest.endsAt + seconds * 1000, rest.totalSeconds + seconds)
              }
              onSkip={stopRest}
              onDone={() => {
                // Skip the buzz when coming back to the app long after the rest ended.
                if (Date.now() - rest.endsAt < 2000) Vibration.vibrate(500);
                stopRest();
              }}
            />
          )}
          <Button
            title={exerciseDone ? 'Exercício concluído' : 'Concluir série'}
            icon="check"
            disabled={exerciseDone}
            onPress={completeSet}
          />
          <Button
            title="Pular exercício"
            icon="skip"
            variant="secondary"
            disabled={exerciseDone}
            onPress={skipExercise}
          />
        </>
      }>
      {header}
      {strip}

      <ThemedText type="subtitle">{exercise.name}</ThemedText>

      <View style={styles.tiles}>
        <Tile label="Série" value={`${setIndex + 1} de ${exercise.sets}`} />
        <Tile label="Repetições" value={String(exercise.reps[setIndex])} />
        <Tile label="Carga" value={formatLoad(exercise.loads[setIndex])} />
      </View>

      <Card>
        {exercise.reps.map((reps, i) => {
          const done = i < progress.setsDone[progress.current];
          return (
            <View key={i} style={styles.setRow}>
              <ThemedText
                type={i === setIndex && !exerciseDone ? 'smallBold' : 'small'}
                themeColor={done ? 'textSecondary' : 'text'}
                style={styles.grow}>
                {i + 1}ª série · {reps} reps · {formatLoad(exercise.loads[i])}
              </ThemedText>
              {done && <Icon name="check" size={16} color={theme.success} />}
            </View>
          );
        })}
      </Card>

      {exercise.notes !== '' && (
        <Card>
          <ThemedText type="smallBold" themeColor="textSecondary">
            Observações
          </ThemedText>
          <ThemedText>{exercise.notes}</ThemedText>
        </Card>
      )}

      {exercise.photo && (
        <Image source={{ uri: imageUri(exercise.photo) }} style={styles.photo} contentFit="cover" />
      )}

      {hasLocation && (
        <GymMap
          uri={imageUri(settings.mapImage!)}
          aspectRatio={settings.mapWidth / settings.mapHeight}
          point={{ x: exercise.mapX!, y: exercise.mapY! }}
        />
      )}
    </FormScreen>
  );
}

type StripProps = {
  exercises: Exercise[];
  progress: Progress;
  finished: boolean;
  onSelect: (index: number) => void;
};

/** One marker per exercise: done, skipped (to come back to), current or pending. */
function ProgressStrip({ exercises, progress, finished, onSelect }: StripProps) {
  const theme = useTheme();
  const labels = { done: 'concluído', skipped: 'pulado', pending: 'pendente' };

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
      {exercises.map((exercise, index) => {
        const status = statusOf(exercises, progress, index);
        const isCurrent = !finished && index === progress.current;
        const color =
          status === 'done' ? theme.success : status === 'skipped' ? theme.warning : theme.border;
        return (
          <Pressable
            key={exercise.id}
            accessibilityRole="button"
            accessibilityLabel={`${exercise.name}, ${labels[status]}${isCurrent ? ', atual' : ''}`}
            onPress={() => onSelect(index)}
            style={styles.stripItem}>
            <View
              style={[
                styles.marker,
                { borderColor: isCurrent ? theme.tint : color },
                status !== 'pending' && { backgroundColor: color },
              ]}>
              {status === 'done' && <Icon name="check" size={16} color={theme.onTint} />}
              {status === 'skipped' && <Icon name="skip" size={16} color={theme.onTint} />}
              {status === 'pending' && <ThemedText type="smallBold">{index + 1}</ThemedText>}
            </View>
            <ThemedText
              type="small"
              numberOfLines={1}
              themeColor={isCurrent ? 'text' : 'textSecondary'}
              style={styles.stripLabel}>
              {exercise.name}
            </ThemedText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <Card style={styles.tile}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="smallBold" style={styles.tileValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </ThemedText>
    </Card>
  );
}

type RestTimerProps = {
  rest: Rest;
  onAddTime: (seconds: number) => void;
  onSkip: () => void;
  onDone: () => void;
};

function RestTimer({ rest, onAddTime, onSkip, onDone }: RestTimerProps) {
  const theme = useTheme();
  const [now, setNow] = useState(() => Date.now());
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  });

  // Counts against the wall clock so the timer stays right after the app is backgrounded.
  useEffect(() => {
    const interval = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= rest.endsAt) onDoneRef.current();
    }, 250);
    return () => clearInterval(interval);
  }, [rest.endsAt]);

  const remaining = Math.max(0, (rest.endsAt - now) / 1000);
  const fraction = Math.min(1, remaining / rest.totalSeconds);

  return (
    <Card>
      <View style={styles.restHeader}>
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.grow}>
          Descanso
        </ThemedText>
        <ThemedText type="subtitle">{formatCountdown(remaining)}</ThemedText>
      </View>
      <View style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
        <View
          style={[styles.trackFill, { width: `${fraction * 100}%`, backgroundColor: theme.tint }]}
        />
      </View>
      <View style={styles.restActions}>
        <Button title="+15 s" variant="secondary" style={styles.grow} onPress={() => onAddTime(15)} />
        <Button title="Pular descanso" variant="secondary" style={styles.grow} onPress={onSkip} />
      </View>
    </Card>
  );
}

const MARKER_SIZE = 36;

const styles = StyleSheet.create({
  leave: {
    // The web header adds no spacing around custom buttons.
    paddingHorizontal: Platform.OS === 'web' ? Spacing.three : 0,
  },
  grow: {
    flex: 1,
  },
  strip: {
    gap: Spacing.two,
  },
  stripItem: {
    width: 64,
    alignItems: 'center',
    gap: Spacing.one,
  },
  marker: {
    width: MARKER_SIZE,
    height: MARKER_SIZE,
    borderRadius: MARKER_SIZE / 2,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stripLabel: {
    fontSize: 11,
    lineHeight: 14,
  },
  tiles: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  tile: {
    flex: 1,
    gap: Spacing.half,
  },
  tileValue: {
    fontSize: 20,
    lineHeight: 28,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  photo: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: Spacing.three,
  },
  finished: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.six,
  },
  restHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  track: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
  },
  restActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
});
