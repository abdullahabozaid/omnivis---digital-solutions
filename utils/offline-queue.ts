import { openDB, DBSchema, IDBPDatabase } from 'idb';

// Types for offline operations
export interface QueuedOperation {
  id: string;
  table: string;
  operation: 'insert' | 'update' | 'delete';
  data: Record<string, unknown>;
  timestamp: number;
  retryCount: number;
  error?: string;
}

export interface CachedData {
  table: string;
  data: unknown[];
  timestamp: number;
}

// IndexedDB Schema
interface OfflineDBSchema extends DBSchema {
  'pending-operations': {
    key: string;
    value: QueuedOperation;
    indexes: { 'by-timestamp': number; 'by-table': string };
  };
  'cached-data': {
    key: string;
    value: CachedData;
    indexes: { 'by-timestamp': number };
  };
  'sync-state': {
    key: string;
    value: { lastSync: number; status: 'idle' | 'syncing' | 'error' };
  };
}

const DB_NAME = 'tawfeeq-offline';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<OfflineDBSchema>> | null = null;

// Initialize the database
async function getDB(): Promise<IDBPDatabase<OfflineDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<OfflineDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Pending operations store
        if (!db.objectStoreNames.contains('pending-operations')) {
          const operationsStore = db.createObjectStore('pending-operations', {
            keyPath: 'id',
          });
          operationsStore.createIndex('by-timestamp', 'timestamp');
          operationsStore.createIndex('by-table', 'table');
        }

        // Cached data store
        if (!db.objectStoreNames.contains('cached-data')) {
          const cacheStore = db.createObjectStore('cached-data', {
            keyPath: 'table',
          });
          cacheStore.createIndex('by-timestamp', 'timestamp');
        }

        // Sync state store
        if (!db.objectStoreNames.contains('sync-state')) {
          db.createObjectStore('sync-state', { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
}

// Generate unique ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================
// PENDING OPERATIONS
// ============================================

export async function queueOperation(
  table: string,
  operation: 'insert' | 'update' | 'delete',
  data: Record<string, unknown>
): Promise<string> {
  const db = await getDB();
  const id = generateId();
  const queuedOp: QueuedOperation = {
    id,
    table,
    operation,
    data,
    timestamp: Date.now(),
    retryCount: 0,
  };
  await db.add('pending-operations', queuedOp);
  return id;
}

export async function getPendingOperations(): Promise<QueuedOperation[]> {
  const db = await getDB();
  return db.getAllFromIndex('pending-operations', 'by-timestamp');
}

export async function getPendingOperationsByTable(
  table: string
): Promise<QueuedOperation[]> {
  const db = await getDB();
  return db.getAllFromIndex('pending-operations', 'by-table', table);
}

export async function getPendingOperationsCount(): Promise<number> {
  const db = await getDB();
  return db.count('pending-operations');
}

export async function removeOperation(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('pending-operations', id);
}

export async function updateOperationRetry(
  id: string,
  error: string
): Promise<void> {
  const db = await getDB();
  const op = await db.get('pending-operations', id);
  if (op) {
    op.retryCount += 1;
    op.error = error;
    await db.put('pending-operations', op);
  }
}

export async function clearPendingOperations(): Promise<void> {
  const db = await getDB();
  await db.clear('pending-operations');
}

// ============================================
// DATA CACHE
// ============================================

export async function cacheData(
  table: string,
  data: unknown[]
): Promise<void> {
  const db = await getDB();
  await db.put('cached-data', {
    table,
    data,
    timestamp: Date.now(),
  });
}

export async function getCachedData(table: string): Promise<unknown[] | null> {
  const db = await getDB();
  const cached = await db.get('cached-data', table);
  return cached?.data ?? null;
}

export async function getCacheTimestamp(table: string): Promise<number | null> {
  const db = await getDB();
  const cached = await db.get('cached-data', table);
  return cached?.timestamp ?? null;
}

export async function clearCache(table?: string): Promise<void> {
  const db = await getDB();
  if (table) {
    await db.delete('cached-data', table);
  } else {
    await db.clear('cached-data');
  }
}

export async function isCacheStale(
  table: string,
  maxAgeMs: number = 5 * 60 * 1000 // 5 minutes default
): Promise<boolean> {
  const timestamp = await getCacheTimestamp(table);
  if (!timestamp) return true;
  return Date.now() - timestamp > maxAgeMs;
}

// ============================================
// SYNC STATE
// ============================================

export async function getSyncState(): Promise<{
  lastSync: number;
  status: 'idle' | 'syncing' | 'error';
}> {
  const db = await getDB();
  const state = await db.get('sync-state', 'global');
  return state ?? { lastSync: 0, status: 'idle' };
}

export async function setSyncState(
  status: 'idle' | 'syncing' | 'error',
  lastSync?: number
): Promise<void> {
  const db = await getDB();
  const current = await getSyncState();
  await db.put('sync-state', {
    key: 'global',
    status,
    lastSync: lastSync ?? current.lastSync,
  });
}

// ============================================
// NETWORK STATUS
// ============================================

export function isOnline(): boolean {
  return navigator.onLine;
}

export function onNetworkChange(callback: (online: boolean) => void): () => void {
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

// ============================================
// SYNC UTILITIES
// ============================================

export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
}

export type SyncHandler = (
  operation: QueuedOperation
) => Promise<{ success: boolean; error?: string }>;

export async function syncPendingOperations(
  handler: SyncHandler,
  maxRetries: number = 3
): Promise<SyncResult> {
  if (!isOnline()) {
    return { success: false, synced: 0, failed: 0, errors: [] };
  }

  await setSyncState('syncing');

  const operations = await getPendingOperations();
  const result: SyncResult = {
    success: true,
    synced: 0,
    failed: 0,
    errors: [],
  };

  for (const op of operations) {
    if (op.retryCount >= maxRetries) {
      result.failed += 1;
      result.errors.push({ id: op.id, error: op.error || 'Max retries exceeded' });
      continue;
    }

    try {
      const syncResult = await handler(op);

      if (syncResult.success) {
        await removeOperation(op.id);
        result.synced += 1;
      } else {
        await updateOperationRetry(op.id, syncResult.error || 'Unknown error');
        result.failed += 1;
        result.errors.push({ id: op.id, error: syncResult.error || 'Unknown error' });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await updateOperationRetry(op.id, errorMessage);
      result.failed += 1;
      result.errors.push({ id: op.id, error: errorMessage });
    }
  }

  result.success = result.failed === 0;
  await setSyncState(result.success ? 'idle' : 'error', Date.now());

  return result;
}

// ============================================
// EXPORT UTILITIES
// ============================================

export const offlineQueue = {
  // Operations
  queueOperation,
  getPendingOperations,
  getPendingOperationsByTable,
  getPendingOperationsCount,
  removeOperation,
  clearPendingOperations,

  // Cache
  cacheData,
  getCachedData,
  getCacheTimestamp,
  clearCache,
  isCacheStale,

  // Sync
  getSyncState,
  setSyncState,
  syncPendingOperations,

  // Network
  isOnline,
  onNetworkChange,
};

export default offlineQueue;
