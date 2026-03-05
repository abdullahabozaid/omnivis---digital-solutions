import { useState, useEffect, useCallback, useRef } from 'react';
import {
  offlineQueue,
  isOnline,
  onNetworkChange,
  getSyncState,
  syncPendingOperations,
  getPendingOperationsCount,
  isSyncLocked,
  QueuedOperation,
  SyncResult,
  ConflictInfo,
} from '../utils/offline-queue';
import { supabase, isSupabaseConfigured } from '../lib/supabase/client';

interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSync: Date | null;
  error: string | null;
  conflicts: ConflictInfo[];
}

// Hook for offline sync status and actions
export function useOfflineSync() {
  const [status, setStatus] = useState<SyncStatus>({
    isOnline: isOnline(),
    isSyncing: false,
    pendingCount: 0,
    lastSync: null,
    error: null,
    conflicts: [],
  });

  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);
  const syncInProgressRef = useRef(false);
  const isConfiguredRef = useRef(isSupabaseConfigured());

  // Safe state setter that checks if component is mounted
  const safeSetStatus = useCallback((updater: (prev: SyncStatus) => SyncStatus) => {
    if (isMountedRef.current) {
      setStatus(updater);
    }
  }, []);

  // Update pending count
  const updatePendingCount = useCallback(async () => {
    try {
      const count = await getPendingOperationsCount();
      safeSetStatus((prev) => ({ ...prev, pendingCount: count }));
    } catch (error) {
      console.error('Failed to get pending count:', error);
    }
  }, [safeSetStatus]);

  // Sync handler for different tables with version checking
  const handleSync = useCallback(
    async (op: QueuedOperation): Promise<{
      success: boolean;
      error?: string;
      conflict?: { serverVersion: number; serverData: Record<string, unknown> };
    }> => {
      if (!isConfiguredRef.current) {
        return { success: false, error: 'Supabase not configured' };
      }

      try {
        const table = supabase.from(op.table) as any;

        switch (op.operation) {
          case 'insert': {
            const { error } = await table.insert(op.data);
            if (error) {
              // Check for duplicate key error
              if (error.message?.includes('duplicate') || error.code === '23505') {
                return { success: true }; // Consider duplicate as success (idempotent)
              }
              return { success: false, error: error.message };
            }
            break;
          }

          case 'update': {
            const { id, version, ...updateData } = op.data;

            // If we have a version, use optimistic locking
            if (op.expectedVersion !== undefined) {
              // First check current version
              const { data: current, error: fetchError } = await table
                .select('version')
                .eq('id', id)
                .single();

              if (fetchError) {
                return { success: false, error: fetchError.message };
              }

              if (current && (current as any).version !== op.expectedVersion) {
                // Version conflict - fetch full server data
                const { data: serverData } = await table
                  .select('*')
                  .eq('id', id)
                  .single();

                return {
                  success: false,
                  conflict: {
                    serverVersion: (current as any).version,
                    serverData: serverData as Record<string, unknown>,
                  },
                };
              }
            }

            const { error } = await table
              .update(updateData)
              .eq('id', id);

            if (error) return { success: false, error: error.message };
            break;
          }

          case 'delete': {
            const { error } = await table
              .delete()
              .eq('id', op.data.id);

            if (error) {
              // If record doesn't exist, consider it deleted (idempotent)
              if (error.code === 'PGRST116') {
                return { success: true };
              }
              return { success: false, error: error.message };
            }
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

  // Perform sync with mutex protection
  const sync = useCallback(async (): Promise<SyncResult | null> => {
    // Check if we're already syncing (local check for immediate return)
    if (syncInProgressRef.current) {
      return null;
    }

    if (!isOnline() || !isConfiguredRef.current) {
      return null;
    }

    // Check pending count before attempting sync
    let pendingCount: number;
    try {
      pendingCount = await getPendingOperationsCount();
    } catch (error) {
      console.error('Failed to check pending operations:', error);
      return null;
    }

    if (pendingCount === 0) {
      return null;
    }

    // Check if another sync is in progress (database-level mutex)
    try {
      const locked = await isSyncLocked();
      if (locked) {
        return null;
      }
    } catch (error) {
      console.error('Failed to check sync lock:', error);
      return null;
    }

    // Mark sync in progress locally
    syncInProgressRef.current = true;
    safeSetStatus((prev) => ({ ...prev, isSyncing: true, error: null }));

    try {
      const result = await syncPendingOperations(handleSync, {
        maxRetries: 3,
        // Default conflict resolver - server wins
        conflictResolver: async (conflict) => {
          safeSetStatus((prev) => ({
            ...prev,
            conflicts: [...prev.conflicts, conflict],
          }));
          return { resolution: 'server' };
        },
      });

      safeSetStatus((prev) => ({
        ...prev,
        isSyncing: false,
        pendingCount: result.failed,
        lastSync: result.synced > 0 ? new Date() : prev.lastSync,
        error: result.failed > 0 ? `${result.failed} operations failed` : null,
      }));

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sync failed';
      console.error('Sync error:', error);

      safeSetStatus((prev) => ({
        ...prev,
        isSyncing: false,
        error: errorMessage,
      }));

      return {
        success: false,
        synced: 0,
        failed: 0,
        conflicts: [],
        errors: [{ id: 'sync', error: errorMessage }],
      };
    } finally {
      syncInProgressRef.current = false;
    }
  }, [handleSync, safeSetStatus]);

  // Handle network status changes
  useEffect(() => {
    const unsubscribe = onNetworkChange((online) => {
      safeSetStatus((prev) => ({ ...prev, isOnline: online }));

      // Auto-sync when coming back online (with debounce)
      if (online) {
        // Small delay to avoid immediate sync on reconnect
        const timeoutId = setTimeout(() => {
          if (isMountedRef.current) {
            sync();
          }
        }, 1000);

        return () => clearTimeout(timeoutId);
      }
    });

    return unsubscribe;
  }, [sync, safeSetStatus]);

  // Initial load
  useEffect(() => {
    const init = async () => {
      try {
        const [syncState, count] = await Promise.all([
          getSyncState(),
          getPendingOperationsCount(),
        ]);

        safeSetStatus((prev) => ({
          ...prev,
          pendingCount: count,
          lastSync: syncState.lastSync ? new Date(syncState.lastSync) : null,
        }));
      } catch (error) {
        console.error('Failed to initialize sync state:', error);
      }
    };

    init();

    // Cleanup on unmount
    return () => {
      isMountedRef.current = false;
    };
  }, [safeSetStatus]);

  // Auto-sync interval (every 30 seconds when online)
  useEffect(() => {
    const startInterval = () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
      syncIntervalRef.current = setInterval(() => {
        if (isMountedRef.current && status.isOnline && !syncInProgressRef.current) {
          sync();
        }
      }, 30000);
    };

    if (status.isOnline) {
      startInterval();
    } else if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    };
  }, [status.isOnline, sync]);

  // Clear all pending operations
  const clearPending = useCallback(async () => {
    try {
      await offlineQueue.clearPendingOperations();
      safeSetStatus((prev) => ({ ...prev, pendingCount: 0, error: null, conflicts: [] }));
    } catch (error) {
      console.error('Failed to clear pending operations:', error);
    }
  }, [safeSetStatus]);

  // Clear conflicts
  const clearConflicts = useCallback(() => {
    safeSetStatus((prev) => ({ ...prev, conflicts: [] }));
  }, [safeSetStatus]);

  return {
    ...status,
    sync,
    clearPending,
    clearConflicts,
    updatePendingCount,
  };
}

// Hook for network status only
export function useNetworkStatus() {
  const [isOnlineState, setIsOnlineState] = useState(isOnline());
  const isMountedRef = useRef(true);

  useEffect(() => {
    const unsubscribe = onNetworkChange((online) => {
      if (isMountedRef.current) {
        setIsOnlineState(online);
      }
    });

    return () => {
      isMountedRef.current = false;
      unsubscribe();
    };
  }, []);

  return isOnlineState;
}

// Sync indicator component data
export function useSyncIndicator() {
  const { isOnline, isSyncing, pendingCount, lastSync, error, conflicts, sync } =
    useOfflineSync();

  const status = isSyncing
    ? 'syncing'
    : !isOnline
    ? 'offline'
    : conflicts.length > 0
    ? 'conflict'
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
      : status === 'conflict'
      ? `${conflicts.length} conflict(s) detected`
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
    conflicts,
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
