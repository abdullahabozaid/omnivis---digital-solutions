import { supabase, isSupabaseConfigured } from '../lib/supabase/client';
import { BaseService, ServiceResult, ServiceListResult, ListOptions } from './base.service';
import type { Client, ClientWithTags, Tag } from '../lib/supabase/types';
import { offlineQueue, isOnline } from '../utils/offline-queue';

class ClientsService extends BaseService<Client> {
  constructor() {
    super('clients', 'id');
  }

  // Get client with tags
  async getByIdWithTags(id: string): Promise<ServiceResult<ClientWithTags>> {
    if (!this.canUseSupabase()) {
      const result = await this.getById(id);
      if (result.data) {
        return {
          data: { ...result.data, tags: [] },
          error: null,
          offline: true,
        };
      }
      return { data: null, error: result.error, offline: true };
    }

    const { data, error } = await supabase
      .from('clients')
      .select(`
        *,
        client_tags (
          tag_id
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    // Fetch tags separately
    const tagIds = (data.client_tags as { tag_id: string }[])?.map(ct => ct.tag_id) || [];
    let tags: Tag[] = [];

    if (tagIds.length > 0) {
      const { data: tagsData } = await supabase
        .from('tags')
        .select('*')
        .in('id', tagIds);
      tags = (tagsData || []) as Tag[];
    }

    const { client_tags, ...clientData } = data;
    return {
      data: { ...clientData, tags } as ClientWithTags,
      error: null,
    };
  }

  // Get all clients with tags
  async getAllWithTags(options: ListOptions = {}): Promise<ServiceListResult<ClientWithTags>> {
    if (!this.canUseSupabase()) {
      const result = await this.getAll(options);
      return {
        data: result.data.map(c => ({ ...c, tags: [] })),
        error: result.error,
        count: result.count,
        offline: true,
      };
    }

    const {
      page = 1,
      pageSize = 50,
      orderBy = 'created_at',
      orderDirection = 'desc',
      filters = {},
      search,
    } = options;

    let query = supabase
      .from('clients')
      .select(`
        *,
        client_tags (
          tag_id
        )
      `, { count: 'exact' });

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

    // Apply ordering and pagination
    query = query.order(orderBy, { ascending: orderDirection === 'asc' });
    const from = (page - 1) * pageSize;
    query = query.range(from, from + pageSize - 1);

    const { data, error, count } = await query;

    if (error) {
      return { data: [], error: error.message, count: 0 };
    }

    // Fetch all tags at once
    const allTagIds = new Set<string>();
    (data || []).forEach(client => {
      (client.client_tags as { tag_id: string }[])?.forEach(ct => allTagIds.add(ct.tag_id));
    });

    let tagsMap: Record<string, Tag> = {};
    if (allTagIds.size > 0) {
      const { data: tagsData } = await supabase
        .from('tags')
        .select('*')
        .in('id', Array.from(allTagIds));
      tagsData?.forEach(tag => {
        tagsMap[tag.id] = tag as Tag;
      });
    }

    // Map clients with their tags
    const clientsWithTags: ClientWithTags[] = (data || []).map(client => {
      const { client_tags, ...clientData } = client;
      const tags = (client_tags as { tag_id: string }[])
        ?.map(ct => tagsMap[ct.tag_id])
        .filter(Boolean) || [];
      return { ...clientData, tags } as ClientWithTags;
    });

    return { data: clientsWithTags, error: null, count: count || 0 };
  }

  // Add tag to client
  async addTag(clientId: string, tagId: string): Promise<ServiceResult<boolean>> {
    if (!this.canUseSupabase()) {
      await offlineQueue.queueOperation('client_tags', 'insert', {
        client_id: clientId,
        tag_id: tagId,
      });
      return { data: true, error: null, offline: true };
    }

    const { error } = await supabase
      .from('client_tags')
      .insert({ client_id: clientId, tag_id: tagId });

    if (error && !error.message.includes('duplicate')) {
      return { data: false, error: error.message };
    }

    return { data: true, error: null };
  }

  // Remove tag from client
  async removeTag(clientId: string, tagId: string): Promise<ServiceResult<boolean>> {
    if (!this.canUseSupabase()) {
      await offlineQueue.queueOperation('client_tags', 'delete', {
        client_id: clientId,
        tag_id: tagId,
      });
      return { data: true, error: null, offline: true };
    }

    const { error } = await supabase
      .from('client_tags')
      .delete()
      .eq('client_id', clientId)
      .eq('tag_id', tagId);

    if (error) {
      return { data: false, error: error.message };
    }

    return { data: true, error: null };
  }

  // Set all tags for a client (replace existing)
  async setTags(clientId: string, tagIds: string[]): Promise<ServiceResult<boolean>> {
    if (!this.canUseSupabase()) {
      // Queue delete all and add new
      await offlineQueue.queueOperation('client_tags', 'delete', {
        client_id: clientId,
        _all: true,
      });
      for (const tagId of tagIds) {
        await offlineQueue.queueOperation('client_tags', 'insert', {
          client_id: clientId,
          tag_id: tagId,
        });
      }
      return { data: true, error: null, offline: true };
    }

    // Delete existing tags
    await supabase
      .from('client_tags')
      .delete()
      .eq('client_id', clientId);

    // Add new tags
    if (tagIds.length > 0) {
      const { error } = await supabase
        .from('client_tags')
        .insert(tagIds.map(tagId => ({ client_id: clientId, tag_id: tagId })));

      if (error) {
        return { data: false, error: error.message };
      }
    }

    return { data: true, error: null };
  }

  // Search clients
  async search(query: string): Promise<ServiceListResult<ClientWithTags>> {
    return this.getAllWithTags({
      search: { column: 'name', query },
      pageSize: 20,
    });
  }

  // Get clients by status
  async getByStatus(status: string): Promise<ServiceListResult<Client>> {
    return this.getAll({
      filters: { status },
    });
  }

  // Get active clients count
  async getActiveCount(): Promise<number> {
    if (!this.canUseSupabase()) {
      const cached = await offlineQueue.getCachedData(this.tableName) as Client[] || [];
      return cached.filter(c => c.status === 'active').length;
    }

    const { count, error } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    return count || 0;
  }

  // Get total revenue (sum of payments)
  async getTotalRevenue(): Promise<number> {
    if (!this.canUseSupabase()) {
      const cached = await offlineQueue.getCachedData(this.tableName) as Client[] || [];
      return cached.reduce((sum, c) => sum + (c.payment || 0), 0);
    }

    const { data, error } = await supabase
      .from('clients')
      .select('payment');

    if (error || !data) return 0;
    return data.reduce((sum, c) => sum + (c.payment || 0), 0);
  }

  // Get monthly revenue (clients with monthly contracts)
  async getMonthlyRevenue(): Promise<number> {
    if (!this.canUseSupabase()) {
      const cached = await offlineQueue.getCachedData(this.tableName) as Client[] || [];
      return cached
        .filter(c => c.contract_type === 'monthly' && c.status === 'active')
        .reduce((sum, c) => sum + (c.payment || 0), 0);
    }

    const { data, error } = await supabase
      .from('clients')
      .select('payment')
      .eq('contract_type', 'monthly')
      .eq('status', 'active');

    if (error || !data) return 0;
    return data.reduce((sum, c) => sum + (c.payment || 0), 0);
  }
}

export const clientsService = new ClientsService();
export default clientsService;
