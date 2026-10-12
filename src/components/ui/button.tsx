import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  icon?: IconName;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({ title, onPress, variant = 'primary', icon, disabled, style }: Props) {
  const theme = useTheme();
  const backgroundColor = variant === 'primary' ? theme.tint : theme.backgroundSelected;
  const color =
    variant === 'primary' ? theme.onTint : variant === 'danger' ? theme.danger : theme.text;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor, opacity: disabled ? 0.4 : pressed ? 0.7 : 1 },
        style,
      ]}>
      {icon && <Icon name={icon} size={18} color={color} />}
      <ThemedText type="smallBold" style={{ color }}>
        {title}
      </ThemedText>
    </Pressable>
  );
}

type IconButtonProps = {
  icon: IconName;
  label: string;
  onPress: () => void;
  color?: string;
  disabled?: boolean;
};

export function IconButton({ icon, label, onPress, color, disabled }: IconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.iconButton, { opacity: disabled ? 0.3 : pressed ? 0.6 : 1 }]}>
      <Icon name={icon} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
