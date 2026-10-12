import { useFocusEffect } from 'expo-router';
import { useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Runs `loader` whenever the screen gains focus or `key` changes, so lists stay
 * fresh after returning from an edit screen.
 */
export function useFocusQuery<T>(loader: (db: SQLiteDatabase) => Promise<T>, key?: unknown) {
  const db = useSQLiteContext();
  const [data, setData] = useState<T>();
  const loaderRef = useRef(loader);
  useEffect(() => {
    loaderRef.current = loader;
  });

  const reload = useCallback(async () => {
    setData(await loaderRef.current(db));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, key]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  return { data, reload };
}
