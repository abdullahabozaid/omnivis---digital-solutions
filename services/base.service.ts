import { supabase, isSupabaseConfigured } from '../lib/supabase/client';
import { offlineQueue, QueuedOperation, isOnline } from '../utils/offline-queue';

// Generic type for database row
export type TableRow = Record<string, unknown>;

// Query options for list operations
export interface ListOptions {
  page?: number;
  pageSize?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  filters?: Record<string, unknown>;
  search?: { column: string; query: string };
}

// Result types
export interface ListResult<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ServiceResult<T> {
  data: T | null;
  error: string | null;
  offline?: boolean;
}

export interface ServiceListResult<T> {
  data: T[];
  error: string | null;
  count: number;
  offline?: boolean;
}

// Base service class with CRUD operations and offline support
export class BaseService<T extends TableRow> {
  protected tableName: string;
  protected primaryKey: string;

  constructor(tableName: string, primaryKey: string = 'id') {
    this.tableName = tableName;
    this.primaryKey = primaryKey;
  }

  // Check if we can use Supabase
  protected canUseSupabase(): boolean {
    return isSupabaseConfigured() && isOnline();
  }

  // ============================================
  // READ OPERATIONS
  // ============================================

  async getById(id: string): Promise<ServiceResult<T>> {
    if (!this.canUseSupabase()) {
      // Try to get from cache
      const cached = await offlineQueue.getCachedData(this.tableName);
      if (cached) {
        const item = (cached as T[]).find(
          (item) => item[this.primaryKey] === id
        );
        if (item) {
          return { data: item, error: null, offline: true };
        }
      }
      return { data: null, error: 'Offline and not in cache', offline: true };
    }

    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq(this.primaryKey, id)
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as T, error: null };
  }

  async getAll(options: ListOptions = {}): Promise<ServiceListResult<T>> {
    const {
      page = 1,
      pageSize = 50,
      orderBy = 'created_at',
      orderDirection = 'desc',
      filters = {},
      search,
    } = options;

    if (!this.canUseSupabase()) {
      // Return cached data
      const cached = await offlineQueue.getCachedData(this.tableName);
      if (cached) {
        let data = cached as T[];

        // Apply filters
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            data = data.filter((item) => item[key] === value);
          }
        });

        // Apply search
        if (search) {
          const searchLower = search.query.toLowerCase();
          data = data.filter((item) =>
            String(item[search.column] || '')
              .toLowerCase()
              .includes(searchLower)
          );
        }

        // Apply pagination
        const start = (page - 1) * pageSize;
        const paginatedData = data.slice(start, start + pageSize);

        return {
          data: paginatedData,
          error: null,
          count: data.length,
          offline: true,
        };
      }
      return { data: [], error: 'Offline and no cache', count: 0, offline: true };
    }

    let query = supabase
      .from(this.tableName)
      .select('*', { count: 'exact' });

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value) as typeof query;
      }
    });

    // Apply search
    if (search) {
      query = query.ilike(search.column, `%${search.query}%`) as typeof query;
    }

    // Apply ordering
    query = query.order(orderBy, { ascending: orderDirection === 'asc' });

    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      return { data: [], error: error.message, count: 0 };
    }

    // Cache the data
    if (data) {
      await offlineQueue.cacheData(this.tableName, data);
    }

    return { data: (data || []) as T[], error: null, count: count || 0 };
  }

  // ============================================
  // WRITE OPERATIONS
  // ============================================

  async create(data: Partial<T>): Promise<ServiceResult<T>> {
    if (!this.canUseSupabase()) {
      // Queue the operation for later sync
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const tempData = { ...data, [this.primaryKey]: tempId } as T;

      await offlineQueue.queueOperation(this.tableName, 'insert', data as Record<string, unknown>);

      // Update local cache
      const cached = (await offlineQueue.getCachedData(this.tableName)) as T[] || [];
      cached.unshift(tempData);
      await offlineQueue.cacheData(this.tableName, cached);

      return { data: tempData, error: null, offline: true };
    }

    const { data: result, error } = await supabase
      .from(this.tableName)
      .insert(data as any)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    // Update cache
    const cached = (await offlineQueue.getCachedData(this.tableName)) as T[] || [];
    cached.unshift(result as T);
    await offlineQueue.cacheData(this.tableName, cached);

    return { data: result as T, error: null };
  }

  async update(id: string, data: Partial<T>): Promise<ServiceResult<T>> {
    if (!this.canUseSupabase()) {
      // Queue the operation
      await offlineQueue.queueOperation(this.tableName, 'update', {
        [this.primaryKey]: id,
        ...data,
      } as Record<string, unknown>);

      // Update local cache
      const cached = (await offlineQueue.getCachedData(this.tableName)) as T[] || [];
      const index = cached.findIndex((item) => item[this.primaryKey] === id);
      if (index !== -1) {
        cached[index] = { ...cached[index], ...data };
        await offlineQueue.cacheData(this.tableName, cached);
        return { data: cached[index], error: null, offline: true };
      }

      return { data: null, error: 'Item not found in cache', offline: true };
    }

    const { data: result, error } = await (supabase
      .from(this.tableName) as any)
      .update(data)
      .eq(this.primaryKey, id)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    // Update cache
    const cached = (await offlineQueue.getCachedData(this.tableName)) as T[] || [];
    const index = cached.findIndex((item) => item[this.primaryKey] === id);
    if (index !== -1) {
      cached[index] = result as T;
      await offlineQueue.cacheData(this.tableName, cached);
    }

    return { data: result as T, error: null };
  }

  async delete(id: string): Promise<ServiceResult<boolean>> {
    if (!this.canUseSupabase()) {
      // Queue the operation
      await offlineQueue.queueOperation(this.tableName, 'delete', {
        [this.primaryKey]: id,
      });

      // Update local cache
      const cached = (await offlineQueue.getCachedData(this.tableName)) as T[] || [];
      const filtered = cached.filter((item) => item[this.primaryKey] !== id);
      await offlineQueue.cacheData(this.tableName, filtered);

      return { data: true, error: null, offline: true };
    }

    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq(this.primaryKey, id);

    if (error) {
      return { data: false, error: error.message };
    }

    // Update cache
    const cached = (await offlineQueue.getCachedData(this.tableName)) as T[] || [];
    const filtered = cached.filter((item) => item[this.primaryKey] !== id);
    await offlineQueue.cacheData(this.tableName, filtered);

    return { data: true, error: null };
  }

  async upsert(data: Partial<T>): Promise<ServiceResult<T>> {
    if (!this.canUseSupabase()) {
      // Treat as update if has ID, otherwise create
      const id = data[this.primaryKey] as string;
      if (id && !id.startsWith('temp-')) {
        return this.update(id, data);
      }
      return this.create(data);
    }

    const { data: result, error } = await supabase
      .from(this.tableName)
      .upsert(data as any)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: result as T, error: null };
  }

  // ============================================
  // BATCH OPERATIONS
  // ============================================

  async createMany(items: Partial<T>[]): Promise<ServiceListResult<T>> {
    if (!this.canUseSupabase()) {
      const results: T[] = [];
      for (const item of items) {
        const result = await this.create(item);
        if (result.data) {
          results.push(result.data);
        }
      }
      return { data: results, error: null, count: results.length, offline: true };
    }

    const { data, error } = await (supabase
      .from(this.tableName) as any)
      .insert(items)
      .select();

    if (error) {
      return { data: [], error: error.message, count: 0 };
    }

    return { data: (data || []) as T[], error: null, count: data?.length || 0 };
  }

  async deleteMany(ids: string[]): Promise<ServiceResult<number>> {
    if (!this.canUseSupabase()) {
      for (const id of ids) {
        await this.delete(id);
      }
      return { data: ids.length, error: null, offline: true };
    }

    const { error, count } = await supabase
      .from(this.tableName)
      .delete()
      .in(this.primaryKey, ids);

    if (error) {
      return { data: 0, error: error.message };
    }

    // Update cache
    const cached = (await offlineQueue.getCachedData(this.tableName)) as T[] || [];
    const filtered = cached.filter(
      (item) => !ids.includes(item[this.primaryKey] as string)
    );
    await offlineQueue.cacheData(this.tableName, filtered);

    return { data: count || ids.length, error: null };
  }

  // ============================================
  // REALTIME SUBSCRIPTIONS
  // ============================================

  subscribe(
    callback: (payload: { eventType: string; new: T | null; old: T | null }) => void
  ): () => void {
    if (!isSupabaseConfigured()) {
      return () => {};
    }

    const channel = supabase
      .channel(`${this.tableName}-changes`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: this.tableName },
        (payload) => {
          callback({
            eventType: payload.eventType,
            new: payload.new as T | null,
            old: payload.old as T | null,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  // ============================================
  // SYNC OPERATIONS
  // ============================================

  async syncPendingOperations(): Promise<{
    success: boolean;
    synced: number;
    failed: number;
  }> {
    const handler = async (
      op: QueuedOperation
    ): Promise<{ success: boolean; error?: string }> => {
      if (op.table !== this.tableName) {
        return { success: true }; // Skip operations for other tables
      }

      try {
        const table = supabase.from(this.tableName) as any;
        switch (op.operation) {
          case 'insert': {
            const { error } = await table.insert(op.data);
            if (error) return { success: false, error: error.message };
            break;
          }
          case 'update': {
            const id = op.data[this.primaryKey] as string;
            const { [this.primaryKey]: _, ...updateData } = op.data;
            const { error } = await table
              .update(updateData)
              .eq(this.primaryKey, id);
            if (error) return { success: false, error: error.message };
            break;
          }
          case 'delete': {
            const id = op.data[this.primaryKey] as string;
            const { error } = await table
              .delete()
              .eq(this.primaryKey, id);
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
    };

    const result = await offlineQueue.syncPendingOperations(handler);
    return {
      success: result.success,
      synced: result.synced,
      failed: result.failed,
    };
  }

  // ============================================
  // CACHE MANAGEMENT
  // ============================================

  async refreshCache(): Promise<void> {
    if (!this.canUseSupabase()) return;

    const { data } = await supabase.from(this.tableName).select('*');
    if (data) {
      await offlineQueue.cacheData(this.tableName, data);
    }
  }

  async clearCache(): Promise<void> {
    await offlineQueue.clearCache(this.tableName);
  }
}

export default BaseService;
