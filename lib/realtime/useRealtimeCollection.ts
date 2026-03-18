import { Dispatch, SetStateAction, useCallback } from 'react';
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
  const onInsert = useCallback(
    (row: T) => {
      setItems((prev) => [row, ...prev.filter((item) => item.id !== row.id)]);
    },
    [setItems]
  );

  const onUpdate = useCallback(
    (row: T) => {
      setItems((prev) => prev.map((item) => (item.id === row.id ? row : item)));
    },
    [setItems]
  );

  const onDelete = useCallback(
    (row: { id: string }) => {
      setItems((prev) => prev.filter((item) => item.id !== row.id));
    },
    [setItems]
  );

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
