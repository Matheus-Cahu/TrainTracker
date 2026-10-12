import { SQLiteProvider } from 'expo-sqlite';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Platform, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Spacing } from '@/constants/theme';
import { migrateDbIfNeeded } from '@/db/migrations';

const isWeb = Platform.OS === 'web';
const RELOADS_KEY = 'db-open-reloads';
const MAX_RELOADS = 3;
const RELOAD_DELAY_MS = 500;

/**
 * Opens the app database and handles failures to do so.
 *
 * On web the database file can only be held by one page at a time, so opening
 * fails right after a reload (the previous page still holds it for a moment) or
 * while another tab is open. The SQLite worker doesn't recover from that, so the
 * page is reloaded a few times before giving up.
 */
export function DatabaseProvider({ children }: { children: ReactNode }) {
  // Changing `attempt` remounts the provider, which opens the database again.
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  const handled = useRef(false);

  // SQLiteProvider calls this on every render while it holds an error.
  const handleError = (error: Error) => {
    if (handled.current) return;
    handled.current = true;
    const reloads = isWeb ? Number(sessionStorage.getItem(RELOADS_KEY) ?? 0) : MAX_RELOADS;
    setTimeout(() => {
      if (reloads < MAX_RELOADS) {
        sessionStorage.setItem(RELOADS_KEY, String(reloads + 1));
        window.location.reload();
      } else {
        console.warn('Failed to open the database', error);
        setFailed(true);
      }
    }, RELOAD_DELAY_MS);
  };

  const retry = () => {
    if (isWeb) {
      sessionStorage.removeItem(RELOADS_KEY);
      window.location.reload();
      return;
    }
    handled.current = false;
    setFailed(false);
    setAttempt((n) => n + 1);
  };

  if (failed) {
    return (
      <ThemedView style={styles.failed}>
        <ThemedText type="smallBold">Não foi possível abrir o banco de dados.</ThemedText>
        {isWeb && (
          <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
            No navegador o app só funciona em uma aba por vez. Feche as outras abas com o
            TrainTracker e tente de novo.
          </ThemedText>
        )}
        <Button title="Tentar de novo" onPress={retry} />
      </ThemedView>
    );
  }

  return (
    <SQLiteProvider
      key={attempt}
      databaseName="traintracker.db"
      onInit={migrateDbIfNeeded}
      onError={handleError}>
      {isWeb && <ResetReloadCount />}
      {children}
    </SQLiteProvider>
  );
}

/** Only rendered once the database is open. */
function ResetReloadCount() {
  useEffect(() => {
    sessionStorage.removeItem(RELOADS_KEY);
  }, []);
  return null;
}

const styles = StyleSheet.create({
  failed: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
  },
  hint: {
    textAlign: 'center',
  },
});
