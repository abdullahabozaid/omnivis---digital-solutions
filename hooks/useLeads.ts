import { useState, useEffect, useCallback, useMemo } from 'react';
import { leadsService, AppLead } from '../services/leads.service';
import type { ListOptions, ServiceResult } from '../services/base.service';
import type { LeadIndustry, LeadStatus } from '../types';

interface UseLeadsOptions extends ListOptions {
  autoFetch?: boolean;
  industry?: LeadIndustry;
}

interface UseLeadsReturn {
  leads: AppLead[];
  loading: boolean;
  error: string | null;
  isOffline: boolean;
  totalCount: number;
  // Actions
  refresh: () => Promise<void>;
  create: (data: Omit<AppLead, 'id' | 'createdAt' | 'updatedAt'>) => Promise<ServiceResult<AppLead>>;
  update: (id: string, data: Partial<AppLead>) => Promise<ServiceResult<AppLead>>;
  updateStatus: (id: string, status: LeadStatus) => Promise<ServiceResult<AppLead>>;
  remove: (id: string) => Promise<ServiceResult<boolean>>;
  bulkCreate: (leads: Omit<AppLead, 'id' | 'createdAt' | 'updatedAt'>[]) => Promise<void>;
  // Stats by status
  countByStatus: Record<LeadStatus, number>;
}

export function useLeads(options: UseLeadsOptions = {}): UseLeadsReturn {
  const { autoFetch = true, industry, ...listOptions } = options;

  const [leads, setLeads] = useState<AppLead[]>([]);
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // Fetch leads
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = industry
        ? await leadsService.getByIndustry(industry, listOptions)
        : await leadsService.getAllLeads(listOptions);

      if (result.error) {
        setError(result.error);
      } else {
        setLeads(result.data);
        setTotalCount(result.count);
        setIsOffline(result.offline || false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch leads');
    } finally {
      setLoading(false);
    }
  }, [industry, JSON.stringify(listOptions)]);

  // Initial fetch
  useEffect(() => {
    if (autoFetch) {
      refresh();
    }
  }, [autoFetch, refresh]);

  // Create lead
  const create = useCallback(async (data: Omit<AppLead, 'id' | 'createdAt' | 'updatedAt'>): Promise<ServiceResult<AppLead>> => {
    const result = await leadsService.createLead(data);
    if (result.data) {
      // Only add to local state if matching current filter
      if (!industry || result.data.industry === industry) {
        setLeads(prev => [result.data!, ...prev]);
        setTotalCount(prev => prev + 1);
      }
    }
    return result;
  }, [industry]);

  // Update lead
  const update = useCallback(async (id: string, data: Partial<AppLead>): Promise<ServiceResult<AppLead>> => {
    const result = await leadsService.updateLead(id, data);
    if (result.data) {
      setLeads(prev =>
        prev.map(l => (l.id === id ? { ...l, ...result.data! } : l))
      );
    }
    return result;
  }, []);

  // Update status (for drag and drop)
  const updateStatus = useCallback(async (id: string, status: LeadStatus): Promise<ServiceResult<AppLead>> => {
    // Optimistic update
    setLeads(prev =>
      prev.map(l => (l.id === id ? { ...l, status } : l))
    );

    const result = await leadsService.updateStatus(id, status);

    // Revert if failed
    if (result.error) {
      await refresh();
    }

    return result;
  }, [refresh]);

  // Delete lead
  const remove = useCallback(async (id: string): Promise<ServiceResult<boolean>> => {
    const result = await leadsService.delete(id);
    if (result.data) {
      setLeads(prev => prev.filter(l => l.id !== id));
      setTotalCount(prev => prev - 1);
    }
    return result;
  }, []);

  // Bulk create leads (for CSV import)
  const bulkCreate = useCallback(async (newLeads: Omit<AppLead, 'id' | 'createdAt' | 'updatedAt'>[]) => {
    const result = await leadsService.bulkCreateLeads(newLeads);
    if (!result.error) {
      await refresh();
    }
  }, [refresh]);

  // Calculate counts by status
  const countByStatus = useMemo(() => {
    const counts: Record<LeadStatus, number> = {
      new: 0,
      contacted: 0,
      converted: 0,
      lost: 0,
    };

    leads.forEach(lead => {
      counts[lead.status] = (counts[lead.status] || 0) + 1;
    });

    return counts;
  }, [leads]);

  return {
    leads,
    loading,
    error,
    isOffline,
    totalCount,
    refresh,
    create,
    update,
    updateStatus,
    remove,
    bulkCreate,
    countByStatus,
  };
}

// Hook for single lead
export function useLead(id: string | null) {
  const [lead, setLead] = useState<AppLead | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!id) {
      setLead(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await leadsService.getLeadById(id);
      if (result.error) {
        setError(result.error);
      } else {
        setLead(result.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch lead');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const update = useCallback(async (data: Partial<AppLead>) => {
    if (!id) return { data: null, error: 'No lead ID' };

    const result = await leadsService.updateLead(id, data);
    if (result.data) {
      setLead(prev => prev ? { ...prev, ...result.data! } : null);
    }
    return result;
  }, [id]);

  return { lead, loading, error, refresh: fetch, update };
}

// Hook for leads grouped by industry
export function useLeadsByIndustry() {
  const [leadsByIndustry, setLeadsByIndustry] = useState<Record<LeadIndustry, AppLead[]>>({} as Record<LeadIndustry, AppLead[]>);
  const [countByIndustry, setCountByIndustry] = useState<Record<LeadIndustry, number>>({} as Record<LeadIndustry, number>);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await leadsService.getAllLeads({ pageSize: 1000 });

      if (result.error) {
        setError(result.error);
      } else {
        // Group by industry
        const grouped: Record<string, AppLead[]> = {};
        const counts: Record<string, number> = {};

        result.data.forEach(lead => {
          if (!grouped[lead.industry]) {
            grouped[lead.industry] = [];
            counts[lead.industry] = 0;
          }
          grouped[lead.industry].push(lead);
          counts[lead.industry]++;
        });

        setLeadsByIndustry(grouped as Record<LeadIndustry, AppLead[]>);
        setCountByIndustry(counts as Record<LeadIndustry, number>);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch leads');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { leadsByIndustry, countByIndustry, loading, error, refresh };
}

// Hook for lead search
export function useLeadSearch() {
  const [results, setResults] = useState<AppLead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string, industry?: LeadIndustry) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await leadsService.searchLeads(query, industry);
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

export default useLeads;
