import { useState, useEffect, useCallback, useMemo } from 'react';
import { pipelinesService, pipelineStagesService, crmContactsService } from '../services/pipelines.service';
import type {
  Pipeline,
  PipelineStage,
  CrmContact,
  PipelineWithStages,
  PipelineWithContacts,
  CrmContactWithTags,
} from '../lib/supabase/types';
import type { ServiceResult } from '../services/base.service';

// Hook for all pipelines with stages
export function usePipelines() {
  const [pipelines, setPipelines] = useState<PipelineWithStages[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await pipelinesService.getAllWithStages();
      if (result.error) {
        setError(result.error);
      } else {
        setPipelines(result.data);
        setIsOffline(result.offline || false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch pipelines');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(async (
    pipeline: Partial<Pipeline>,
    stages: Array<{ label: string; color?: string; default_probability?: number }>
  ): Promise<ServiceResult<PipelineWithStages>> => {
    const result = await pipelinesService.createWithStages(pipeline, stages);
    if (result.data) {
      setPipelines(prev => [...prev, result.data!]);
    }
    return result;
  }, []);

  const update = useCallback(async (id: string, data: Partial<Pipeline>): Promise<ServiceResult<Pipeline>> => {
    const result = await pipelinesService.update(id, data);
    if (result.data) {
      setPipelines(prev =>
        prev.map(p => (p.id === id ? { ...p, ...result.data! } : p))
      );
    }
    return result;
  }, []);

  const remove = useCallback(async (id: string): Promise<ServiceResult<boolean>> => {
    const result = await pipelinesService.delete(id);
    if (result.data) {
      setPipelines(prev => prev.filter(p => p.id !== id));
    }
    return result;
  }, []);

  const reorder = useCallback(async (pipelineIds: string[]) => {
    await pipelinesService.reorder(pipelineIds);
    await refresh();
  }, [refresh]);

  return {
    pipelines,
    loading,
    error,
    isOffline,
    refresh,
    create,
    update,
    remove,
    reorder,
  };
}

// Hook for a single pipeline with contacts
export function usePipeline(id: string | null) {
  const [pipeline, setPipeline] = useState<PipelineWithContacts | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!id) {
      setPipeline(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await pipelinesService.getByIdWithContacts(id);
      if (result.error) {
        setError(result.error);
      } else {
        setPipeline(result.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch pipeline');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Get contacts by stage
  const getContactsByStage = useCallback((stageId: string) => {
    return pipeline?.contacts.filter(c => c.stage_id === stageId) || [];
  }, [pipeline]);

  // Add stage
  const addStage = useCallback(async (stage: Partial<PipelineStage>) => {
    if (!id) return { data: null, error: 'No pipeline ID' };

    const result = await pipelineStagesService.create({
      ...stage,
      pipeline_id: id,
      display_order: pipeline?.stages.length || 0,
    });

    if (result.data) {
      await refresh();
    }
    return result;
  }, [id, pipeline, refresh]);

  // Update stage
  const updateStage = useCallback(async (stageId: string, data: Partial<PipelineStage>) => {
    const result = await pipelineStagesService.update(stageId, data);
    if (result.data) {
      await refresh();
    }
    return result;
  }, [refresh]);

  // Delete stage
  const deleteStage = useCallback(async (stageId: string) => {
    const result = await pipelineStagesService.delete(stageId);
    if (result.data) {
      await refresh();
    }
    return result;
  }, [refresh]);

  // Reorder stages
  const reorderStages = useCallback(async (stageIds: string[]) => {
    await pipelineStagesService.reorder(stageIds);
    await refresh();
  }, [refresh]);

  // Pipeline value calculation
  const pipelineValue = useMemo(() => {
    return pipeline?.contacts
      .filter(c => c.outcome === 'open')
      .reduce((sum, c) => sum + (c.value || 0), 0) || 0;
  }, [pipeline]);

  const weightedValue = useMemo(() => {
    return pipeline?.contacts
      .filter(c => c.outcome === 'open')
      .reduce((sum, c) => sum + ((c.value || 0) * (c.probability || 50) / 100), 0) || 0;
  }, [pipeline]);

  return {
    pipeline,
    loading,
    error,
    refresh,
    getContactsByStage,
    addStage,
    updateStage,
    deleteStage,
    reorderStages,
    pipelineValue,
    weightedValue,
  };
}

// Hook for CRM contacts
export function useCrmContacts(pipelineId: string | null) {
  const [contacts, setContacts] = useState<CrmContactWithTags[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!pipelineId) {
      setContacts([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await crmContactsService.getByPipeline(pipelineId);
      if (result.error) {
        setError(result.error);
      } else {
        setContacts(result.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch contacts');
    } finally {
      setLoading(false);
    }
  }, [pipelineId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(async (data: Partial<CrmContact>): Promise<ServiceResult<CrmContact>> => {
    const result = await crmContactsService.create({
      ...data,
      pipeline_id: pipelineId!,
    });
    if (result.data) {
      setContacts(prev => [...prev, { ...result.data!, tags: [] }]);
    }
    return result;
  }, [pipelineId]);

  const update = useCallback(async (id: string, data: Partial<CrmContact>): Promise<ServiceResult<CrmContact>> => {
    const result = await crmContactsService.update(id, data);
    if (result.data) {
      setContacts(prev =>
        prev.map(c => (c.id === id ? { ...c, ...result.data! } : c))
      );
    }
    return result;
  }, []);

  const remove = useCallback(async (id: string): Promise<ServiceResult<boolean>> => {
    const result = await crmContactsService.delete(id);
    if (result.data) {
      setContacts(prev => prev.filter(c => c.id !== id));
    }
    return result;
  }, []);

  const moveToStage = useCallback(async (contactId: string, stageId: string) => {
    const result = await crmContactsService.moveToStage(contactId, stageId);
    if (result.data) {
      setContacts(prev =>
        prev.map(c => (c.id === contactId ? { ...c, stage_id: stageId } : c))
      );
    }
    return result;
  }, []);

  const markAsWon = useCallback(async (contactId: string, clientId?: string) => {
    const result = await crmContactsService.markAsWon(contactId, clientId);
    if (result.data) {
      setContacts(prev =>
        prev.map(c => (c.id === contactId ? { ...c, ...result.data! } : c))
      );
    }
    return result;
  }, []);

  const markAsLost = useCallback(async (contactId: string, reason?: string, notes?: string) => {
    const result = await crmContactsService.markAsLost(contactId, reason, notes);
    if (result.data) {
      setContacts(prev =>
        prev.map(c => (c.id === contactId ? { ...c, ...result.data! } : c))
      );
    }
    return result;
  }, []);

  // Group contacts by outcome
  const contactsByOutcome = useMemo(() => ({
    open: contacts.filter(c => c.outcome === 'open'),
    won: contacts.filter(c => c.outcome === 'won'),
    lost: contacts.filter(c => c.outcome === 'lost'),
  }), [contacts]);

  // Pipeline statistics
  const stats = useMemo(() => ({
    total: contacts.length,
    open: contactsByOutcome.open.length,
    won: contactsByOutcome.won.length,
    lost: contactsByOutcome.lost.length,
    totalValue: contactsByOutcome.open.reduce((sum, c) => sum + (c.value || 0), 0),
    weightedValue: contactsByOutcome.open.reduce((sum, c) => sum + ((c.value || 0) * (c.probability || 50) / 100), 0),
    wonValue: contactsByOutcome.won.reduce((sum, c) => sum + (c.value || 0), 0),
    winRate: contactsByOutcome.won.length + contactsByOutcome.lost.length > 0
      ? (contactsByOutcome.won.length / (contactsByOutcome.won.length + contactsByOutcome.lost.length)) * 100
      : 0,
  }), [contacts, contactsByOutcome]);

  return {
    contacts,
    loading,
    error,
    refresh,
    create,
    update,
    remove,
    moveToStage,
    markAsWon,
    markAsLost,
    contactsByOutcome,
    stats,
  };
}

// Hook for single contact
export function useCrmContact(id: string | null) {
  const [contact, setContact] = useState<CrmContactWithTags | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!id) {
      setContact(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await crmContactsService.getByIdWithTags(id);
      if (result.error) {
        setError(result.error);
      } else {
        setContact(result.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch contact');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const update = useCallback(async (data: Partial<CrmContact>) => {
    if (!id) return { data: null, error: 'No contact ID' };

    const result = await crmContactsService.update(id, data);
    if (result.data) {
      setContact(prev => prev ? { ...prev, ...result.data! } : null);
    }
    return result;
  }, [id]);

  return { contact, loading, error, refresh, update };
}

export default usePipelines;
