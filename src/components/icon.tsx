import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import type { ColorValue } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

type SymbolName = Exclude<SymbolViewProps['name'], string>;

const ICONS = {
  add: { ios: 'plus', android: 'add' },
  play: { ios: 'play.fill', android: 'play_arrow' },
  pause: { ios: 'pause.fill', android: 'pause' },
  trash: { ios: 'trash', android: 'delete' },
  check: { ios: 'checkmark', android: 'check' },
  skip: { ios: 'forward.end.fill', android: 'skip_next' },
  camera: { ios: 'camera', android: 'photo_camera' },
  pin: { ios: 'mappin', android: 'location_on' },
  close: { ios: 'xmark', android: 'close' },
  chevronLeft: { ios: 'chevron.left', android: 'chevron_left' },
  chevronRight: { ios: 'chevron.right', android: 'chevron_right' },
  up: { ios: 'arrow.up', android: 'arrow_upward' },
  down: { ios: 'arrow.down', android: 'arrow_downward' },
  minus: { ios: 'minus', android: 'remove' },
} satisfies Record<string, SymbolName>;

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 20, color }: { name: IconName; size?: number; color?: ColorValue }) {
  const theme = useTheme();
  const symbol = ICONS[name];
  return (
    <SymbolView
      name={{ ...symbol, web: symbol.android }}
      size={size}
      tintColor={color ?? theme.text}
    />
  );
}
