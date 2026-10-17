import { Image } from 'expo-image';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, IconButton } from '@/components/ui/button';
import { EmptyState, FormScreen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { deleteProgressPhoto, listProgressPhotos, listWeights } from '@/db/repo';
import { useFocusQuery } from '@/hooks/use-focus-query';
import { useTheme } from '@/hooks/use-theme';
import { formatDateKey } from '@/lib/dates';
import { confirm } from '@/lib/dialog';
import { formatNumber } from '@/lib/format';
import { deleteImage, imageUri } from '@/lib/images';

/** Photos per second. */
const SPEEDS = [2, 4, 8];

/** Plays the daily body photos in sequence, like a "one photo a day" video. */
export default function TimelapseScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const { data, reload } = useFocusQuery(async (db) => ({
    photos: await listProgressPhotos(db),
    weights: await listWeights(db),
  }));
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(SPEEDS[1]);

  const count = data?.photos.length ?? 0;
  const lastIndex = count - 1;

  useEffect(() => {
    if (!playing) return;
    const timer = setTimeout(() => {
      // The last photo stays on screen for its turn before playback stops.
      if (index >= lastIndex) setPlaying(false);
      else setIndex(index + 1);
    }, 1000 / speed);
    return () => clearTimeout(timer);
  }, [playing, index, lastIndex, speed]);

  if (!data) return <FormScreen>{null}</FormScreen>;
  if (count === 0) {
    return (
      <FormScreen>
        <EmptyState>Adicione sua primeira foto na aba Progresso para ver a evolução aqui.</EmptyState>
      </FormScreen>
    );
  }

  // Removing the last photo leaves the index one past the end.
  const current = Math.min(index, lastIndex);
  const photo = data.photos[current];
  const weight = data.weights.find((w) => w.date === photo.date);

  const togglePlaying = () => {
    if (!playing && current === lastIndex) setIndex(0);
    setPlaying(!playing);
  };

  const step = (delta: number) => {
    setPlaying(false);
    setIndex(current + delta);
  };

  const confirmDelete = async () => {
    setPlaying(false);
    const confirmed = await confirm({
      title: 'Remover foto?',
      message: `A foto de ${formatDateKey(photo.date)} será apagada.`,
      confirmLabel: 'Remover',
      destructive: true,
    });
    if (!confirmed) return;
    await deleteProgressPhoto(db, photo.date);
    deleteImage(photo.photo);
    reload();
  };

  return (
    <FormScreen>
      <View style={[styles.frame, { backgroundColor: theme.backgroundElement }]}>
        <Image
          source={{ uri: imageUri(photo.photo) }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          accessibilityLabel={`Foto de ${formatDateKey(photo.date)}`}
        />
        <View style={styles.caption}>
          <ThemedText type="smallBold" style={styles.captionText}>
            {formatDateKey(photo.date)}
          </ThemedText>
          {weight && (
            <ThemedText type="smallBold" style={styles.captionText}>
              {formatNumber(weight.kg)} kg
            </ThemedText>
          )}
        </View>
      </View>

      <View style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
        <View
          style={[
            styles.trackFill,
            { backgroundColor: theme.tint, width: `${((current + 1) / count) * 100}%` },
          ]}
        />
      </View>

      <View style={styles.controls}>
        <IconButton
          icon="chevronLeft"
          label="Foto anterior"
          disabled={current === 0}
          onPress={() => step(-1)}
        />
        <Button
          title={playing ? 'Pausar' : 'Reproduzir'}
          icon={playing ? 'pause' : 'play'}
          disabled={count < 2}
          style={styles.grow}
          onPress={togglePlaying}
        />
        <IconButton
          icon="chevronRight"
          label="Próxima foto"
          disabled={current === lastIndex}
          onPress={() => step(1)}
        />
      </View>
      <ThemedText type="small" themeColor="textSecondary" style={styles.centered}>
        Foto {current + 1} de {count}
      </ThemedText>

      <View style={[styles.speeds, { backgroundColor: theme.backgroundSelected }]}>
        {SPEEDS.map((value) => {
          const selected = value === speed;
          return (
            <Pressable
              key={value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${value} fotos por segundo`}
              onPress={() => setSpeed(value)}
              style={[styles.speed, selected && { backgroundColor: theme.tint }]}>
              <ThemedText type="smallBold" style={selected && { color: theme.onTint }}>
                {value} fotos/s
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      <Button title="Remover esta foto" variant="danger" onPress={confirmDelete} />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    maxWidth: 420,
    aspectRatio: 3 / 4,
    alignSelf: 'center',
    borderRadius: Spacing.three,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  caption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  captionText: {
    color: '#ffffff',
    fontVariant: ['tabular-nums'],
  },
  track: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  grow: {
    flex: 1,
  },
  centered: {
    textAlign: 'center',
  },
  speeds: {
    flexDirection: 'row',
    padding: Spacing.one,
    borderRadius: Spacing.three,
  },
  speed: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.three - Spacing.one,
  },
});
