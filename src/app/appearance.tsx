import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { FormScreen } from '@/components/ui/screen';
import { AccentColors, Spacing, type AccentName, type ThemeMode } from '@/constants/theme';
import { useAppearance, useTheme } from '@/hooks/use-theme';

const MODES: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: 'Automático' },
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Escuro' },
];

const ACCENTS = Object.keys(AccentColors) as AccentName[];

export default function AppearanceScreen() {
  const theme = useTheme();
  const { mode, accent, scheme, changeMode, changeAccent } = useAppearance();

  return (
    <FormScreen>
      <Card>
        <ThemedText type="smallBold">Tema</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Automático acompanha o tema do aparelho.
        </ThemedText>
        <View style={[styles.modes, { backgroundColor: theme.backgroundSelected }]}>
          {MODES.map(({ value, label }) => {
            const selected = value === mode;
            return (
              <Pressable
                key={value}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => changeMode(value)}
                style={[styles.mode, selected && { backgroundColor: theme.tint }]}>
                <ThemedText type="smallBold" style={selected && { color: theme.onTint }}>
                  {label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Card>
        <ThemedText type="smallBold">Cor de destaque</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Usada nos botões principais, na aba ativa e nos dias treinados do calendário.
        </ThemedText>
        <View style={styles.accents}>
          {ACCENTS.map((name) => {
            const selected = name === accent;
            return (
              <Pressable
                key={name}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={AccentColors[name].label}
                onPress={() => changeAccent(name)}
                style={styles.accent}>
                <View style={[styles.swatch, { backgroundColor: AccentColors[name][scheme] }]}>
                  {selected && <Icon name="check" color={theme.onTint} />}
                </View>
                <ThemedText type="small" themeColor={selected ? 'text' : 'textSecondary'}>
                  {AccentColors[name].label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </Card>
    </FormScreen>
  );
}

const SWATCH_SIZE = 44;

const styles = StyleSheet.create({
  modes: {
    flexDirection: 'row',
    padding: Spacing.one,
    borderRadius: Spacing.three,
  },
  mode: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.three - Spacing.one,
  },
  accents: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: Spacing.three,
  },
  accent: {
    width: '25%',
    alignItems: 'center',
    gap: Spacing.one,
  },
  swatch: {
    width: SWATCH_SIZE,
    height: SWATCH_SIZE,
    borderRadius: SWATCH_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
