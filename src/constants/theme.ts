/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
    border: '#D9D9E0',
    tint: '#208AEF',
    onTint: '#ffffff',
    success: '#2F9E5B',
    warning: '#D97706',
    danger: '#D93F3F',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
    border: '#3A3D42',
    tint: '#4BA3F5',
    onTint: '#ffffff',
    success: '#46B777',
    warning: '#F5A524',
    danger: '#F26464',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/** Choices for the highlight color (`tint`), tuned per scheme to keep white text readable. */
export const AccentColors = {
  blue: { label: 'Azul', light: '#208AEF', dark: '#4BA3F5' },
  red: { label: 'Vermelho', light: '#D92D2D', dark: '#F05252' },
  orange: { label: 'Laranja', light: '#DD5B0B', dark: '#F27A30' },
  green: { label: 'Verde', light: '#2B9A4B', dark: '#3DB866' },
  teal: { label: 'Turquesa', light: '#0C8F9C', dark: '#1FB2BF' },
  purple: { label: 'Roxo', light: '#7C4DDB', dark: '#9B74EE' },
  pink: { label: 'Rosa', light: '#D6409F', dark: '#E660B2' },
} as const;

export type AccentName = keyof typeof AccentColors;
export const DEFAULT_ACCENT: AccentName = 'blue';

/** `system` follows the device setting. */
export type ThemeMode = 'system' | 'light' | 'dark';

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
/** On web the tab bar floats over the top of the screen instead. */
export const TopTabInset = Platform.select({ web: 56 }) ?? 0;
export const MaxContentWidth = 800;
