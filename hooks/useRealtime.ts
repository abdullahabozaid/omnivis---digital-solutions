import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase/client';

type TableName =
  | 'clients'
  | 'crm_contacts'
  | 'pipelines'
  | 'pipeline_stages'
  | 'tasks'
  | 'projects'
  | 'activities'
  | 'snapshots'
  | 'snapshot_brand_colors'
  | 'snapshot_logos'
  | 'tags';

type EventType = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

interface RealtimePayload<T> {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: T | null;
  old: T | null;
}

interface UseRealtimeOptions<T> {
  table: TableName;
  event?: EventType;
  filter?: string;
  onInsert?: (data: T) => void;
  onUpdate?: (data: T, oldData: T | null) => void;
  onDelete?: (oldData: T) => void;
  onChange?: (payload: RealtimePayload<T>) => void;
  enabled?: boolean;
}

// Hook for realtime subscriptions
export function useRealtime<T = Record<string, unknown>>(
  options: UseRealtimeOptions<T>
) {
  const {
    table,
    event = '*',
    filter,
    onInsert,
    onUpdate,
    onDelete,
    onChange,
    enabled = true,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!enabled || !isSupabaseConfigured()) {
      return;
    }

    const channelName = filter
      ? `${table}-${event}-${filter}`
      : `${table}-${event}`;

    const channel = supabase.channel(channelName);

    const subscription = (channel as any)
      .on(
        'postgres_changes',
        {
          event: event as '*' | 'INSERT' | 'UPDATE' | 'DELETE',
          schema: 'public',
          table,
          filter,
        },
        (payload: any) => {
          const realtimePayload: RealtimePayload<T> = {
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            new: payload.new as T | null,
            old: payload.old as T | null,
          };

          // Call specific handlers
          if (payload.eventType === 'INSERT' && onInsert && payload.new) {
            onInsert(payload.new as T);
          }
          if (payload.eventType === 'UPDATE' && onUpdate && payload.new) {
            onUpdate(payload.new as T, payload.old as T | null);
          }
          if (payload.eventType === 'DELETE' && onDelete && payload.old) {
            onDelete(payload.old as T);
          }

          // Call general handler
          if (onChange) {
            onChange(realtimePayload);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          setError(null);
        } else if (status === 'CHANNEL_ERROR') {
          setIsConnected(false);
          setError('Failed to connect to realtime channel');
        } else if (status === 'CLOSED') {
          setIsConnected(false);
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [table, event, filter, enabled, onInsert, onUpdate, onDelete, onChange]);

  const unsubscribe = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      setIsConnected(false);
    }
  }, []);

  return { isConnected, error, unsubscribe };
}

// Hook for multiple table subscriptions
export function useRealtimeMultiple<T = Record<string, unknown>>(
  tables: TableName[],
  onChange: (table: TableName, payload: RealtimePayload<T>) => void,
  enabled: boolean = true
) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!enabled || !isSupabaseConfigured() || tables.length === 0) {
      return;
    }

    const channelName = `multi-${tables.join('-')}`;
    const channel = supabase.channel(channelName);

    // Subscribe to each table
    tables.forEach((table) => {
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
        },
        (payload) => {
          onChange(table, {
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            new: payload.new as T | null,
            old: payload.old as T | null,
          });
        }
      );
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        setIsConnected(true);
        setError(null);
      } else if (status === 'CHANNEL_ERROR') {
        setIsConnected(false);
        setError('Failed to connect to realtime channel');
      }
    });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tables.join(','), enabled, onChange]);

  return { isConnected, error };
}

// Hook for presence (who's online)
export function usePresence(roomId: string, userData: Record<string, unknown>) {
  const [users, setUsers] = useState<Array<{ id: string; data: Record<string, unknown> }>>([]);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      return;
    }

    const channel = supabase.channel(`presence-${roomId}`, {
      config: {
        presence: {
          key: userData.id as string || 'anonymous',
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const presenceUsers = Object.entries(state).map(([id, data]) => ({
          id,
          data: (data as any)[0] || {},
        }));
        setUsers(presenceUsers);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track(userData);
          setIsConnected(true);
        }
      });

    channelRef.current = channel;

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
    };
  }, [roomId, JSON.stringify(userData)]);

  const updatePresence = useCallback(async (data: Record<string, unknown>) => {
    if (channelRef.current) {
      await channelRef.current.track(data);
    }
  }, []);

  return { users, isConnected, updatePresence };
}

// Hook for broadcast (send messages to all subscribers)
export function useBroadcast<T = unknown>(channelName: string) {
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const listenersRef = useRef<Map<string, Set<(payload: T) => void>>>(new Map());

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      return;
    }

    const channel = supabase.channel(`broadcast-${channelName}`);

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        setIsConnected(true);
      }
    });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelName]);

  const send = useCallback((event: string, payload: T) => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event,
        payload,
      });
    }
  }, []);

  const listen = useCallback((event: string, callback: (payload: T) => void) => {
    if (!listenersRef.current.has(event)) {
      listenersRef.current.set(event, new Set());

      if (channelRef.current) {
        channelRef.current.on('broadcast', { event }, ({ payload }) => {
          listenersRef.current.get(event)?.forEach((cb) => cb(payload as T));
        });
      }
    }

    listenersRef.current.get(event)?.add(callback);

    return () => {
      listenersRef.current.get(event)?.delete(callback);
    };
  }, []);

  return { isConnected, send, listen };
}

export default useRealtime;
