import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';

import { DatabaseProvider } from '@/db/provider';
// Registers the foreground notification handler.
import '@/lib/notifications';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <DatabaseProvider>
        <Stack screenOptions={{ headerBackTitle: 'Voltar' }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="workout/[id]" options={{ title: 'Treino' }} />
          <Stack.Screen name="exercise/[id]" options={{ title: 'Exercício' }} />
          <Stack.Screen name="reminder/[id]" options={{ title: 'Lembrete' }} />
          <Stack.Screen name="session/[id]" options={{ title: 'Treino', gestureEnabled: false }} />
        </Stack>
      </DatabaseProvider>
    </ThemeProvider>
  );
}
