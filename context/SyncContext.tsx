import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useOfflineSync, useNetworkStatus } from '../hooks/useOfflineSync';
import { useRealtimeMultiple } from '../hooks/useRealtime';
import { offlineQueue } from '../utils/offline-queue';

type TableName =
  | 'clients'
  | 'crm_contacts'
  | 'pipelines'
  | 'tasks'
  | 'activities'
  | 'snapshots';

interface SyncContextType {
  // Status
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSync: Date | null;
  error: string | null;

  // Actions
  sync: () => Promise<void>;
  clearPending: () => Promise<void>;

  // Realtime
  isRealtimeConnected: boolean;

  // Listeners
  addChangeListener: (table: TableName, callback: () => void) => () => void;

  // Toast notifications
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

const SyncContext = createContext<SyncContextType | null>(null);

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const {
    isOnline,
    isSyncing,
    pendingCount,
    lastSync,
    error,
    sync,
    clearPending,
  } = useOfflineSync();

  const [toasts, setToasts] = useState<Toast[]>([]);
  const listenersRef = useRef<Map<TableName, Set<() => void>>>(new Map());

  // Realtime subscriptions for key tables
  const { isConnected: isRealtimeConnected } = useRealtimeMultiple(
    ['clients', 'crm_contacts', 'pipelines', 'tasks', 'activities', 'snapshots'],
    (table, payload) => {
      // Notify listeners for this table
      const listeners = listenersRef.current.get(table as TableName);
      listeners?.forEach((callback) => callback());

      // Show toast for important changes
      if (payload.eventType === 'INSERT') {
        showToast(`New ${table.slice(0, -1)} created`, 'info');
      }
    },
    isOnline
  );

  // Add change listener for a table
  const addChangeListener = useCallback(
    (table: TableName, callback: () => void): (() => void) => {
      if (!listenersRef.current.has(table)) {
        listenersRef.current.set(table, new Set());
      }
      listenersRef.current.get(table)!.add(callback);

      return () => {
        listenersRef.current.get(table)?.delete(callback);
      };
    },
    []
  );

  // Show toast notification
  const showToast = useCallback(
    (message: string, type: 'success' | 'error' | 'info') => {
      const id = Date.now().toString();
      setToasts((prev) => [...prev, { id, message, type }]);

      // Auto-remove after 5 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);
    },
    []
  );

  // Show toast when coming back online
  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      showToast(`Syncing ${pendingCount} pending changes...`, 'info');
    }
  }, [isOnline, pendingCount, showToast]);

  // Show toast when sync completes
  useEffect(() => {
    if (!isSyncing && lastSync && pendingCount === 0) {
      showToast('All changes synced', 'success');
    }
  }, [isSyncing, lastSync, pendingCount, showToast]);

  // Show toast for sync errors
  useEffect(() => {
    if (error) {
      showToast(error, 'error');
    }
  }, [error, showToast]);

  const value: SyncContextType = {
    isOnline,
    isSyncing,
    pendingCount,
    lastSync,
    error,
    sync,
    clearPending,
    isRealtimeConnected,
    addChangeListener,
    showToast,
  };

  return (
    <SyncContext.Provider value={value}>
      {children}
      {/* Toast container */}
      <ToastContainer toasts={toasts} onDismiss={(id) => setToasts(prev => prev.filter(t => t.id !== id))} />
    </SyncContext.Provider>
  );
}

// Toast container component
function ToastContainer({
  toasts,
  onDismiss
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-white text-sm animate-slide-up ${
            toast.type === 'success'
              ? 'bg-green-500'
              : toast.type === 'error'
              ? 'bg-red-500'
              : 'bg-blue-500'
          }`}
        >
          {toast.type === 'success' && (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
          {toast.type === 'error' && (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          {toast.type === 'info' && (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          <span>{toast.message}</span>
          <button
            onClick={() => onDismiss(toast.id)}
            className="ml-2 hover:opacity-80"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}

export function useSync() {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
}

// Sync status indicator component
export function SyncStatusIndicator() {
  const { isOnline, isSyncing, pendingCount, error } = useSync();

  if (!isOnline) {
    return (
      <div className="flex items-center gap-2 text-amber-600">
        <div className="w-2 h-2 rounded-full bg-amber-500" />
        <span className="text-sm">Offline</span>
      </div>
    );
  }

  if (isSyncing) {
    return (
      <div className="flex items-center gap-2 text-blue-600">
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span className="text-sm">Syncing...</span>
      </div>
    );
  }

  if (pendingCount > 0) {
    return (
      <div className="flex items-center gap-2 text-amber-600">
        <div className="w-2 h-2 rounded-full bg-amber-500" />
        <span className="text-sm">{pendingCount} pending</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-red-600">
        <div className="w-2 h-2 rounded-full bg-red-500" />
        <span className="text-sm">Sync error</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-green-600">
      <div className="w-2 h-2 rounded-full bg-green-500" />
      <span className="text-sm">Synced</span>
    </div>
  );
}

export default SyncContext;
