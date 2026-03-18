import { Dispatch, SetStateAction, useCallback, useEffect, useRef } from 'react';
import { useRealtimeTable } from './useRealtimeTable';

type UseRealtimeCollectionParams<T extends { id: string }> = {
  enabled: boolean;
  table: string;
  filter?: string;
  channelName: string;
  setItems: Dispatch<SetStateAction<T[]>>;
  onForegroundSync?: () => void | Promise<void>;
};

export function useRealtimeCollection<T extends { id: string }>({
  enabled,
  table,
  filter,
  channelName,
  setItems,
  onForegroundSync,
}: UseRealtimeCollectionParams<T>) {
  const updateFlushTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const deleteResyncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingUpdatesRef = useRef<Record<string, T>>({});

  const flushPendingUpdates = useCallback(() => {
    const updatesById = pendingUpdatesRef.current;
    const updateIds = new Set(Object.keys(updatesById));

    if (updateIds.size === 0) {
      return;
    }

    setItems((prev) =>
      prev.map((item) => {
        const updated = updatesById[item.id];
        return updated ?? item;
      })
    );

    pendingUpdatesRef.current = {};
  }, [setItems]);

  const onInsert = useCallback(
    (row: T) => {
      // Si llega INSERT para un id que estaba pendiente en UPDATE, priorizar el dato más nuevo.
      pendingUpdatesRef.current[row.id] = row;

      if (updateFlushTimeoutRef.current) {
        clearTimeout(updateFlushTimeoutRef.current);
        updateFlushTimeoutRef.current = null;
      }

      flushPendingUpdates();
      setItems((prev) => [row, ...prev.filter((item) => item.id !== row.id)]);
    },
    [setItems, flushPendingUpdates]
  );

  const onUpdate = useCallback(
    (row: T) => {
      // Agrupar updates en rafaga (por ejemplo rebalance de varios parciales) sin perder ninguno.
      pendingUpdatesRef.current[row.id] = row;

      if (updateFlushTimeoutRef.current) {
        return;
      }

      updateFlushTimeoutRef.current = setTimeout(() => {
        updateFlushTimeoutRef.current = null;
        flushPendingUpdates();
      }, 50);
    },
    [flushPendingUpdates]
  );

  const onDelete = useCallback(
    (row: { id: string }) => {
      // Limpiar updates pendientes del item eliminado.
      delete pendingUpdatesRef.current[row.id];

      if (updateFlushTimeoutRef.current) {
        clearTimeout(updateFlushTimeoutRef.current);
        updateFlushTimeoutRef.current = null;
        flushPendingUpdates();
      }

      if (deleteResyncTimeoutRef.current) {
        clearTimeout(deleteResyncTimeoutRef.current);
        deleteResyncTimeoutRef.current = null;
      }

      // Eliminar inmediatamente
      setItems((prev) => {
        const filtered = prev.filter((item) => item.id !== row.id);
        return filtered;
      });

      // Resincronizar en 200ms para capturar todos los UPDATEs del trigger
      deleteResyncTimeoutRef.current = setTimeout(() => {
        deleteResyncTimeoutRef.current = null;
        if (onForegroundSync) {
          void onForegroundSync();
        }
      }, 200);
    },
    [setItems, onForegroundSync, table, flushPendingUpdates]
  );

  useEffect(() => {
    return () => {
      if (updateFlushTimeoutRef.current) {
        clearTimeout(updateFlushTimeoutRef.current);
      }
      if (deleteResyncTimeoutRef.current) {
        clearTimeout(deleteResyncTimeoutRef.current);
      }
      pendingUpdatesRef.current = {};
    };
  }, []);

  useRealtimeTable<T>({
    enabled,
    table,
    filter,
    channelName,
    onInsert,
    onUpdate,
    onDelete,
    onForegroundSync,
  });
}
