import { useSQLiteContext } from 'expo-sqlite';
import { createContext, use, useEffect, useState, type ReactNode } from 'react';
import { Appearance, Platform, useColorScheme } from 'react-native';

import {
  AccentColors,
  Colors,
  DEFAULT_ACCENT,
  type AccentName,
  type ThemeMode,
} from '@/constants/theme';
import { getSettings, setAccent, setThemeMode } from '@/db/repo';

type Scheme = 'light' | 'dark';

type AppearanceValue = {
  mode: ThemeMode;
  accent: AccentName;
  /** The scheme in effect, with `system` already resolved. */
  scheme: Scheme;
  changeMode: (mode: ThemeMode) => void;
  changeAccent: (accent: AccentName) => void;
};

const AppearanceContext = createContext<AppearanceValue | null>(null);

function useSystemScheme(): Scheme {
  return useColorScheme() === 'dark' ? 'dark' : 'light';
}

// Makes native UI the app doesn't draw itself (tab bar, dialogs, keyboard) follow the choice.
function applyNativeScheme(mode: ThemeMode) {
  if (Platform.OS !== 'web') Appearance.setColorScheme(mode === 'system' ? 'unspecified' : mode);
}

/** Loads the user's visual preferences. Must be rendered inside the database provider. */
export function AppearanceProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const systemScheme = useSystemScheme();
  const [prefs, setPrefs] = useState<{ mode: ThemeMode; accent: AccentName }>();

  useEffect(() => {
    let cancelled = false;
    getSettings(db).then((settings) => {
      if (cancelled) return;
      applyNativeScheme(settings.themeMode);
      setPrefs({ mode: settings.themeMode, accent: settings.accent });
    });
    return () => {
      cancelled = true;
    };
  }, [db]);

  // Rendering only with the stored preferences avoids a flash of the default theme.
  if (!prefs) return null;

  const value: AppearanceValue = {
    ...prefs,
    scheme: prefs.mode === 'system' ? systemScheme : prefs.mode,
    changeMode: (mode) => {
      applyNativeScheme(mode);
      setPrefs({ ...prefs, mode });
      setThemeMode(db, mode);
    },
    changeAccent: (accent) => {
      setPrefs({ ...prefs, accent });
      setAccent(db, accent);
    },
  };

  return <AppearanceContext value={value}>{children}</AppearanceContext>;
}

export function useAppearance() {
  const appearance = use(AppearanceContext);
  if (!appearance) throw new Error('useAppearance must be used inside AppearanceProvider');
  return appearance;
}

/** The app's colors for the current scheme, with `tint` set to the chosen highlight color. */
export function useTheme() {
  const appearance = use(AppearanceContext);
  const systemScheme = useSystemScheme();
  // Screens shown before the preferences load (e.g. database errors) use the defaults.
  const scheme = appearance?.scheme ?? systemScheme;
  return { ...Colors[scheme], tint: AccentColors[appearance?.accent ?? DEFAULT_ACCENT][scheme] };
}
