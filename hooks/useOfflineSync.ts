import { useState, useEffect, useCallback, useRef } from 'react';
import {
  offlineQueue,
  isOnline,
  onNetworkChange,
  getSyncState,
  syncPendingOperations,
  getPendingOperationsCount,
  QueuedOperation,
} from '../utils/offline-queue';
import { supabase, isSupabaseConfigured } from '../lib/supabase/client';

interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSync: Date | null;
  error: string | null;
}

// Hook for offline sync status and actions
export function useOfflineSync() {
  const [status, setStatus] = useState<SyncStatus>({
    isOnline: isOnline(),
    isSyncing: false,
    pendingCount: 0,
    lastSync: null,
    error: null,
  });

  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Update pending count
  const updatePendingCount = useCallback(async () => {
    const count = await getPendingOperationsCount();
    setStatus((prev) => ({ ...prev, pendingCount: count }));
  }, []);

  // Sync handler for different tables
  const handleSync = useCallback(
    async (op: QueuedOperation): Promise<{ success: boolean; error?: string }> => {
      if (!isSupabaseConfigured()) {
        return { success: false, error: 'Supabase not configured' };
      }

      try {
        switch (op.operation) {
          case 'insert': {
            const { error } = await supabase.from(op.table).insert(op.data);
            if (error) return { success: false, error: error.message };
            break;
          }
          case 'update': {
            const { id, ...updateData } = op.data;
            const { error } = await supabase
              .from(op.table)
              .update(updateData)
              .eq('id', id);
            if (error) return { success: false, error: error.message };
            break;
          }
          case 'delete': {
            const { error } = await supabase
              .from(op.table)
              .delete()
              .eq('id', op.data.id);
            if (error) return { success: false, error: error.message };
            break;
          }
        }
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    []
  );

  // Perform sync
  const sync = useCallback(async () => {
    if (!isOnline() || !isSupabaseConfigured()) {
      return;
    }

    const pendingCount = await getPendingOperationsCount();
    if (pendingCount === 0) {
      return;
    }

    setStatus((prev) => ({ ...prev, isSyncing: true, error: null }));

    try {
      const result = await syncPendingOperations(handleSync);

      setStatus((prev) => ({
        ...prev,
        isSyncing: false,
        pendingCount: result.failed,
        lastSync: result.synced > 0 ? new Date() : prev.lastSync,
        error: result.failed > 0 ? `${result.failed} operations failed` : null,
      }));
    } catch (error) {
      setStatus((prev) => ({
        ...prev,
        isSyncing: false,
        error: error instanceof Error ? error.message : 'Sync failed',
      }));
    }
  }, [handleSync]);

  // Handle network status changes
  useEffect(() => {
    const unsubscribe = onNetworkChange((online) => {
      setStatus((prev) => ({ ...prev, isOnline: online }));

      // Auto-sync when coming back online
      if (online) {
        sync();
      }
    });

    return unsubscribe;
  }, [sync]);

  // Initial load
  useEffect(() => {
    const init = async () => {
      const [syncState, count] = await Promise.all([
        getSyncState(),
        getPendingOperationsCount(),
      ]);

      setStatus((prev) => ({
        ...prev,
        pendingCount: count,
        lastSync: syncState.lastSync ? new Date(syncState.lastSync) : null,
      }));
    };

    init();
  }, []);

  // Auto-sync interval (every 30 seconds when online)
  useEffect(() => {
    if (status.isOnline) {
      syncIntervalRef.current = setInterval(sync, 30000);
    } else if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [status.isOnline, sync]);

  // Clear all pending operations
  const clearPending = useCallback(async () => {
    await offlineQueue.clearPendingOperations();
    setStatus((prev) => ({ ...prev, pendingCount: 0, error: null }));
  }, []);

  return {
    ...status,
    sync,
    clearPending,
    updatePendingCount,
  };
}

// Hook for network status only
export function useNetworkStatus() {
  const [isOnlineState, setIsOnlineState] = useState(isOnline());

  useEffect(() => {
    const unsubscribe = onNetworkChange(setIsOnlineState);
    return unsubscribe;
  }, []);

  return isOnlineState;
}

// Sync indicator component data
export function useSyncIndicator() {
  const { isOnline, isSyncing, pendingCount, lastSync, error, sync } =
    useOfflineSync();

  const status = isSyncing
    ? 'syncing'
    : !isOnline
    ? 'offline'
    : pendingCount > 0
    ? 'pending'
    : error
    ? 'error'
    : 'synced';

  const message =
    status === 'syncing'
      ? 'Syncing...'
      : status === 'offline'
      ? 'You are offline'
      : status === 'pending'
      ? `${pendingCount} changes pending`
      : status === 'error'
      ? error
      : lastSync
      ? `Last synced ${formatRelativeTime(lastSync)}`
      : 'All changes saved';

  return {
    status,
    message,
    isOnline,
    isSyncing,
    pendingCount,
    error,
    sync,
  };
}

// Helper function to format relative time
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  return date.toLocaleDateString();
}

export default useOfflineSync;
