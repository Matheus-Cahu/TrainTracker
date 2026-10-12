import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { DatabaseProvider } from '@/db/provider';
import { AppearanceProvider, useAppearance, useTheme } from '@/hooks/use-theme';
// Registers the foreground notification handler.
import '@/lib/notifications';

export default function RootLayout() {
  return (
    <DatabaseProvider>
      <AppearanceProvider>
        <Navigation />
      </AppearanceProvider>
    </DatabaseProvider>
  );
}

function Navigation() {
  const { scheme } = useAppearance();
  const theme = useTheme();
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;

  return (
    <ThemeProvider
      value={{
        ...base,
        colors: {
          ...base.colors,
          primary: theme.tint,
          background: theme.background,
          card: theme.background,
          text: theme.text,
          border: theme.border,
        },
      }}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerBackTitle: 'Voltar' }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="workout/[id]" options={{ title: 'Treino' }} />
        <Stack.Screen name="exercise/[id]" options={{ title: 'Exercício' }} />
        <Stack.Screen name="reminder/[id]" options={{ title: 'Lembrete' }} />
        <Stack.Screen name="session/[id]" options={{ title: 'Treino', gestureEnabled: false }} />
        <Stack.Screen name="appearance" options={{ title: 'Visual' }} />
      </Stack>
    </ThemeProvider>
  );
}
