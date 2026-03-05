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
  // For conflict resolution
  entityId?: string; // ID of the entity being modified
  expectedVersion?: number; // Expected version for optimistic locking
}

export interface CachedData {
  table: string;
  data: unknown[];
  timestamp: number;
}

export interface CachedEntity {
  id: string;
  table: string;
  data: Record<string, unknown>;
  version: number;
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
  'cached-entities': {
    key: string; // `${table}:${id}`
    value: CachedEntity;
    indexes: { 'by-table': string; 'by-timestamp': number };
  };
  'sync-state': {
    key: string;
    value: {
      key: string;
      lastSync: number;
      status: 'idle' | 'syncing' | 'error';
      lockId?: string; // For mutex
      lockExpiry?: number;
    };
  };
}

const DB_NAME = 'tawfeeq-offline';
const DB_VERSION = 2; // Bumped for new schema

let dbPromise: Promise<IDBPDatabase<OfflineDBSchema>> | null = null;

// Initialize the database
async function getDB(): Promise<IDBPDatabase<OfflineDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<OfflineDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        // Pending operations store
        if (!db.objectStoreNames.contains('pending-operations')) {
          const operationsStore = db.createObjectStore('pending-operations', {
            keyPath: 'id',
          });
          operationsStore.createIndex('by-timestamp', 'timestamp');
          operationsStore.createIndex('by-table', 'table');
        }

        // Cached data store (table-level cache)
        if (!db.objectStoreNames.contains('cached-data')) {
          const cacheStore = db.createObjectStore('cached-data', {
            keyPath: 'table',
          });
          cacheStore.createIndex('by-timestamp', 'timestamp');
        }

        // Cached entities store (entity-level cache for conflict detection)
        if (!db.objectStoreNames.contains('cached-entities')) {
          const entityStore = db.createObjectStore('cached-entities', {
            keyPath: 'id',
          });
          entityStore.createIndex('by-table', 'table');
          entityStore.createIndex('by-timestamp', 'timestamp');
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
  data: Record<string, unknown>,
  options?: { entityId?: string; expectedVersion?: number }
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
    entityId: options?.entityId || (data.id as string),
    expectedVersion: options?.expectedVersion,
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
// DATA CACHE (Table-level)
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
// ENTITY CACHE (For Conflict Resolution)
// ============================================

export async function cacheEntity(
  table: string,
  entityId: string,
  data: Record<string, unknown>,
  version: number
): Promise<void> {
  const db = await getDB();
  const key = `${table}:${entityId}`;
  await db.put('cached-entities', {
    id: key,
    table,
    data,
    version,
    timestamp: Date.now(),
  });
}

export async function getCachedEntity(
  table: string,
  entityId: string
): Promise<CachedEntity | null> {
  const db = await getDB();
  const key = `${table}:${entityId}`;
  const cached = await db.get('cached-entities', key);
  return cached ?? null;
}

export async function clearEntityCache(table?: string): Promise<void> {
  const db = await getDB();
  if (table) {
    const entities = await db.getAllFromIndex('cached-entities', 'by-table', table);
    for (const entity of entities) {
      await db.delete('cached-entities', entity.id);
    }
  } else {
    await db.clear('cached-entities');
  }
}

// ============================================
// SYNC STATE WITH MUTEX
// ============================================

const LOCK_TIMEOUT_MS = 30000; // 30 second lock timeout

export async function getSyncState(): Promise<{
  lastSync: number;
  status: 'idle' | 'syncing' | 'error';
}> {
  const db = await getDB();
  const state = await db.get('sync-state', 'global');
  return {
    lastSync: state?.lastSync ?? 0,
    status: state?.status ?? 'idle',
  };
}

export async function setSyncState(
  status: 'idle' | 'syncing' | 'error',
  lastSync?: number
): Promise<void> {
  const db = await getDB();
  const current = await db.get('sync-state', 'global');
  await db.put('sync-state', {
    key: 'global',
    status,
    lastSync: lastSync ?? current?.lastSync ?? 0,
    lockId: current?.lockId,
    lockExpiry: current?.lockExpiry,
  });
}

// Acquire sync lock (mutex)
export async function acquireSyncLock(): Promise<string | null> {
  const db = await getDB();
  const lockId = generateId();
  const now = Date.now();

  const current = await db.get('sync-state', 'global');

  // Check if there's an existing valid lock
  if (current?.lockId && current.lockExpiry && current.lockExpiry > now) {
    // Lock is still valid, cannot acquire
    return null;
  }

  // Acquire the lock
  await db.put('sync-state', {
    key: 'global',
    status: current?.status ?? 'idle',
    lastSync: current?.lastSync ?? 0,
    lockId,
    lockExpiry: now + LOCK_TIMEOUT_MS,
  });

  // Verify we got the lock (handle race condition)
  const verify = await db.get('sync-state', 'global');
  if (verify?.lockId === lockId) {
    return lockId;
  }

  return null;
}

// Release sync lock
export async function releaseSyncLock(lockId: string): Promise<void> {
  const db = await getDB();
  const current = await db.get('sync-state', 'global');

  // Only release if we own the lock
  if (current?.lockId === lockId) {
    await db.put('sync-state', {
      key: 'global',
      status: current.status,
      lastSync: current.lastSync,
      lockId: undefined,
      lockExpiry: undefined,
    });
  }
}

// Check if sync is locked
export async function isSyncLocked(): Promise<boolean> {
  const db = await getDB();
  const current = await db.get('sync-state', 'global');
  const now = Date.now();

  return !!(current?.lockId && current.lockExpiry && current.lockExpiry > now);
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
// CONFLICT RESOLUTION
// ============================================

export interface ConflictInfo {
  operation: QueuedOperation;
  serverVersion: number;
  serverData: Record<string, unknown>;
  localVersion: number;
  localData: Record<string, unknown>;
}

export type ConflictResolution = 'server' | 'local' | 'merge';

export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  conflicts: ConflictInfo[];
  errors: Array<{ id: string; error: string }>;
}

export type SyncHandler = (
  operation: QueuedOperation
) => Promise<{
  success: boolean;
  error?: string;
  conflict?: {
    serverVersion: number;
    serverData: Record<string, unknown>;
  };
}>;

export type ConflictResolver = (
  conflict: ConflictInfo
) => Promise<{
  resolution: ConflictResolution;
  mergedData?: Record<string, unknown>;
}>;

// Default conflict resolver - server wins
const defaultConflictResolver: ConflictResolver = async () => ({
  resolution: 'server',
});

export async function syncPendingOperations(
  handler: SyncHandler,
  options?: {
    maxRetries?: number;
    conflictResolver?: ConflictResolver;
  }
): Promise<SyncResult> {
  const { maxRetries = 3, conflictResolver = defaultConflictResolver } = options ?? {};

  if (!isOnline()) {
    return { success: false, synced: 0, failed: 0, conflicts: [], errors: [] };
  }

  // Try to acquire lock
  const lockId = await acquireSyncLock();
  if (!lockId) {
    // Another sync is in progress
    return { success: false, synced: 0, failed: 0, conflicts: [], errors: [{ id: 'lock', error: 'Sync already in progress' }] };
  }

  try {
    await setSyncState('syncing');

    const operations = await getPendingOperations();
    const result: SyncResult = {
      success: true,
      synced: 0,
      failed: 0,
      conflicts: [],
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
        } else if (syncResult.conflict) {
          // Version conflict detected
          const cachedEntity = await getCachedEntity(op.table, op.entityId || (op.data.id as string));

          const conflictInfo: ConflictInfo = {
            operation: op,
            serverVersion: syncResult.conflict.serverVersion,
            serverData: syncResult.conflict.serverData,
            localVersion: cachedEntity?.version ?? 0,
            localData: cachedEntity?.data ?? op.data,
          };

          result.conflicts.push(conflictInfo);

          // Resolve conflict
          const resolution = await conflictResolver(conflictInfo);

          switch (resolution.resolution) {
            case 'server':
              // Discard local change, use server data
              await removeOperation(op.id);
              if (cachedEntity) {
                await cacheEntity(
                  op.table,
                  op.entityId || (op.data.id as string),
                  syncResult.conflict.serverData,
                  syncResult.conflict.serverVersion
                );
              }
              result.synced += 1;
              break;

            case 'local':
              // Force local change (will need to include expected version)
              // Re-queue with updated expected version
              await updateOperationRetry(op.id, 'Conflict - retrying with force');
              break;

            case 'merge':
              // Apply merged data
              if (resolution.mergedData) {
                op.data = resolution.mergedData;
                op.expectedVersion = syncResult.conflict.serverVersion;
                await db.put('pending-operations', op);
              }
              break;
          }
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
  } finally {
    // Always release the lock
    await releaseSyncLock(lockId);
  }
}

// Helper to get db for conflict resolution
const db = {
  put: async (store: 'pending-operations', value: QueuedOperation) => {
    const database = await getDB();
    await database.put(store, value);
  },
};

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

  // Table-level cache
  cacheData,
  getCachedData,
  getCacheTimestamp,
  clearCache,
  isCacheStale,

  // Entity-level cache
  cacheEntity,
  getCachedEntity,
  clearEntityCache,

  // Sync
  getSyncState,
  setSyncState,
  syncPendingOperations,

  // Mutex
  acquireSyncLock,
  releaseSyncLock,
  isSyncLocked,

  // Network
  isOnline,
  onNetworkChange,
};

export default offlineQueue;
