import { useState, useEffect, useCallback, useMemo } from 'react';
import { clientsService } from '../services/clients.service';
import type { Client, ClientWithTags, Tag } from '../lib/supabase/types';
import type { ListOptions, ServiceResult } from '../services/base.service';

interface UseClientsOptions extends ListOptions {
  autoFetch?: boolean;
  withTags?: boolean;
}

interface UseClientsReturn {
  clients: ClientWithTags[];
  loading: boolean;
  error: string | null;
  isOffline: boolean;
  totalCount: number;
  // Actions
  refresh: () => Promise<void>;
  create: (data: Partial<Client>) => Promise<ServiceResult<Client>>;
  update: (id: string, data: Partial<Client>) => Promise<ServiceResult<Client>>;
  remove: (id: string) => Promise<ServiceResult<boolean>>;
  addTag: (clientId: string, tagId: string) => Promise<void>;
  removeTag: (clientId: string, tagId: string) => Promise<void>;
  setTags: (clientId: string, tagIds: string[]) => Promise<void>;
  // Stats
  activeCount: number;
  totalRevenue: number;
  monthlyRevenue: number;
}

export function useClients(options: UseClientsOptions = {}): UseClientsReturn {
  const { autoFetch = true, withTags = true, ...listOptions } = options;

  const [clients, setClients] = useState<ClientWithTags[]>([]);
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // Fetch clients
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = withTags
        ? await clientsService.getAllWithTags(listOptions)
        : await clientsService.getAll(listOptions);

      if (result.error) {
        setError(result.error);
      } else {
        setClients(result.data as ClientWithTags[]);
        setTotalCount(result.count);
        setIsOffline(result.offline || false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch clients');
    } finally {
      setLoading(false);
    }
  }, [withTags, JSON.stringify(listOptions)]);

  // Initial fetch
  useEffect(() => {
    if (autoFetch) {
      refresh();
    }
  }, [autoFetch, refresh]);

  // Create client
  const create = useCallback(async (data: Partial<Client>): Promise<ServiceResult<Client>> => {
    const result = await clientsService.create(data);
    if (result.data) {
      setClients(prev => [{ ...result.data!, tags: [] }, ...prev]);
      setTotalCount(prev => prev + 1);
    }
    return result;
  }, []);

  // Update client
  const update = useCallback(async (id: string, data: Partial<Client>): Promise<ServiceResult<Client>> => {
    const result = await clientsService.update(id, data);
    if (result.data) {
      setClients(prev =>
        prev.map(c => (c.id === id ? { ...c, ...result.data! } : c))
      );
    }
    return result;
  }, []);

  // Delete client
  const remove = useCallback(async (id: string): Promise<ServiceResult<boolean>> => {
    const result = await clientsService.delete(id);
    if (result.data) {
      setClients(prev => prev.filter(c => c.id !== id));
      setTotalCount(prev => prev - 1);
    }
    return result;
  }, []);

  // Add tag to client
  const addTag = useCallback(async (clientId: string, tagId: string) => {
    await clientsService.addTag(clientId, tagId);
    // Refresh to get updated tags
    await refresh();
  }, [refresh]);

  // Remove tag from client
  const removeTag = useCallback(async (clientId: string, tagId: string) => {
    await clientsService.removeTag(clientId, tagId);
    await refresh();
  }, [refresh]);

  // Set all tags for client
  const setTags = useCallback(async (clientId: string, tagIds: string[]) => {
    await clientsService.setTags(clientId, tagIds);
    await refresh();
  }, [refresh]);

  // Calculate stats
  const activeCount = useMemo(() => {
    return clients.filter(c => c.status === 'active').length;
  }, [clients]);

  const totalRevenue = useMemo(() => {
    return clients.reduce((sum, c) => sum + (c.payment || 0), 0);
  }, [clients]);

  const monthlyRevenue = useMemo(() => {
    return clients
      .filter(c => c.contract_type === 'monthly' && c.status === 'active')
      .reduce((sum, c) => sum + (c.payment || 0), 0);
  }, [clients]);

  return {
    clients,
    loading,
    error,
    isOffline,
    totalCount,
    refresh,
    create,
    update,
    remove,
    addTag,
    removeTag,
    setTags,
    activeCount,
    totalRevenue,
    monthlyRevenue,
  };
}

// Hook for single client
export function useClient(id: string | null) {
  const [client, setClient] = useState<ClientWithTags | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!id) {
      setClient(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await clientsService.getByIdWithTags(id);
      if (result.error) {
        setError(result.error);
      } else {
        setClient(result.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch client');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const update = useCallback(async (data: Partial<Client>) => {
    if (!id) return { data: null, error: 'No client ID' };

    const result = await clientsService.update(id, data);
    if (result.data) {
      setClient(prev => prev ? { ...prev, ...result.data! } : null);
    }
    return result;
  }, [id]);

  return { client, loading, error, refresh: fetch, update };
}

// Hook for client search
export function useClientSearch() {
  const [results, setResults] = useState<ClientWithTags[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await clientsService.search(query);
      if (result.error) {
        setError(result.error);
      } else {
        setResults(result.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setResults([]);
  }, []);

  return { results, loading, error, search, clear };
}

export default useClients;
