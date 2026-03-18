import { useCallback, useRef, useState } from 'react';

type AsyncTask<T> = () => Promise<T>;

export function useSingleFlight() {
  const lockRef = useRef(false);
  const [isRunning, setIsRunning] = useState(false);

  const run = useCallback(async <T>(task: AsyncTask<T>): Promise<T | undefined> => {
    if (lockRef.current) {
      return undefined;
    }

    lockRef.current = true;
    setIsRunning(true);

    try {
      return await task();
    } finally {
      lockRef.current = false;
      setIsRunning(false);
    }
  }, []);

  return { run, isRunning };
}

export function useKeyedSingleFlight<TKey extends string | number>() {
  const locksRef = useRef(new Set<TKey>());
  const [runningKeys, setRunningKeys] = useState<Set<TKey>>(new Set());

  const isRunning = useCallback((key: TKey) => runningKeys.has(key), [runningKeys]);

  const run = useCallback(async <T>(key: TKey, task: AsyncTask<T>): Promise<T | undefined> => {
    if (locksRef.current.has(key)) {
      return undefined;
    }

    locksRef.current.add(key);
    setRunningKeys((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });

    try {
      return await task();
    } finally {
      locksRef.current.delete(key);
      setRunningKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }, []);

  return { run, isRunning };
}