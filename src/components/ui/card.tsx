import { Pressable, StyleSheet, type ViewProps } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

type Props = ViewProps & { onPress?: () => void };

export function Card({ style, onPress, ...props }: Props) {
  const card = <ThemedView type="backgroundElement" style={[styles.card, style]} {...props} />;
  if (!onPress) return card;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      {card}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
});
