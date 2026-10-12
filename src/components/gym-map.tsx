import { Image } from 'expo-image';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type MapPoint = { x: number; y: number };

type Props = {
  uri: string;
  /** Width / height of the map image. */
  aspectRatio: number;
  /** Normalized (0..1) position of the marker. */
  point?: MapPoint | null;
  /** When set, tapping the map picks a new position. */
  onPick?: (point: MapPoint) => void;
};

const PIN_SIZE = 24;
const clamp = (n: number) => Math.min(1, Math.max(0, n));

/** The gym map with an optional marker projected over it. */
export function GymMap({ uri, aspectRatio, point, onPick }: Props) {
  const theme = useTheme();
  const [size, setSize] = useState({ width: 0, height: 0 });

  return (
    <Pressable
      disabled={!onPick}
      accessibilityLabel="Mapa da academia"
      onLayout={(e) => setSize(e.nativeEvent.layout)}
      onPress={(e) => {
        if (!size.width || !size.height) return;
        let { locationX, locationY } = e.nativeEvent;
        if (Platform.OS === 'web') {
          // On web the event is a DOM click, which has no locationX/Y.
          const click = e.nativeEvent as unknown as MouseEvent;
          const rect = (e.currentTarget as unknown as HTMLElement).getBoundingClientRect();
          locationX = click.clientX - rect.left;
          locationY = click.clientY - rect.top;
        }
        onPick?.({ x: clamp(locationX / size.width), y: clamp(locationY / size.height) });
      }}
      style={[styles.map, { aspectRatio, backgroundColor: theme.backgroundElement }]}>
      {/* The container has the image's aspect ratio, so normalized coordinates map 1:1. */}
      <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="fill" />
      {point && (
        <View
          // Touches must hit the map itself so locationX/Y stay relative to it.
          pointerEvents="none"
          style={[
            styles.pin,
            {
              left: point.x * size.width - PIN_SIZE / 2,
              top: point.y * size.height - PIN_SIZE / 2,
              backgroundColor: theme.danger,
            },
          ]}
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  map: {
    width: '100%',
    borderRadius: Spacing.three,
    overflow: 'hidden',
  },
  pin: {
    position: 'absolute',
    width: PIN_SIZE,
    height: PIN_SIZE,
    borderRadius: PIN_SIZE / 2,
    borderWidth: 3,
    borderColor: '#ffffff',
  },
});
