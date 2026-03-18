import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { RealtimePostgresChangesPayload, RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

type UseRealtimeTableParams<T extends { id: string }> = {
  enabled: boolean;
  table: string;
  schema?: string;
  filter?: string;
  channelName: string;
  onInsert?: (row: T) => void;
  onUpdate?: (row: T) => void;
  onDelete?: (row: { id: string }) => void;
  onForegroundSync?: () => void | Promise<void>;
};

export function useRealtimeTable<T extends { id: string }>({
  enabled,
  table,
  schema = 'public',
  filter,
  channelName,
  onInsert,
  onUpdate,
  onDelete,
  onForegroundSync,
}: UseRealtimeTableParams<T>) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const appStateSubRef = useRef<any>(null);

  useEffect(() => {
    // Si está deshabilitado, limpiar canal existente
    if (!enabled) {
      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    // Limpiar canal anterior si existe
    if (channelRef.current) {
      void supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(channelName, {
        config: {
          broadcast: { ack: true },
        },
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema,
          table,
          filter: filter || undefined,
        },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          if (payload.eventType === 'INSERT' && onInsert) {
            onInsert(payload.new as T);
            return;
          }

          if (payload.eventType === 'UPDATE' && onUpdate) {
            onUpdate(payload.new as T);
            return;
          }

          if (payload.eventType === 'DELETE' && onDelete) {
            onDelete(payload.old as { id: string });
          }
        }
      )
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && onForegroundSync) {
          await onForegroundSync();
        }
      });

    channelRef.current = channel;

    // Listener de cambios de app state
    if (onForegroundSync) {
      appStateSubRef.current = AppState.addEventListener('change', (state) => {
        if (state === 'active') {
          void onForegroundSync();
        }
      });
    }

    return () => {
      if (appStateSubRef.current) {
        appStateSubRef.current.remove();
        appStateSubRef.current = null;
      }
      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [enabled, channelName, schema, table, filter, onInsert, onUpdate, onDelete, onForegroundSync]);
}
