import { supabase, isSupabaseConfigured } from '../lib/supabase/client';
import { BaseService, ServiceResult, ServiceListResult } from './base.service';
import type {
  Pipeline,
  PipelineStage,
  CrmContact,
  PipelineWithStages,
  PipelineWithContacts,
  CrmContactWithTags,
  Tag,
} from '../lib/supabase/types';
import { offlineQueue, isOnline } from '../utils/offline-queue';

// Pipeline Service
class PipelinesService extends BaseService<Pipeline> {
  constructor() {
    super('pipelines', 'id');
  }

  // Get pipeline with stages
  async getByIdWithStages(id: string): Promise<ServiceResult<PipelineWithStages>> {
    if (!this.canUseSupabase()) {
      const pipeline = await this.getById(id);
      if (pipeline.data) {
        const stagesCached = (await offlineQueue.getCachedData('pipeline_stages')) as PipelineStage[] || [];
        const stages = stagesCached
          .filter(s => s.pipeline_id === id)
          .sort((a, b) => a.display_order - b.display_order);
        return { data: { ...pipeline.data, stages }, error: null, offline: true };
      }
      return { data: null, error: pipeline.error, offline: true };
    }

    const { data: pipeline, error: pipelineError } = await supabase
      .from('pipelines')
      .select('*')
      .eq('id', id)
      .single();

    if (pipelineError) {
      return { data: null, error: pipelineError.message };
    }

    const { data: stages, error: stagesError } = await supabase
      .from('pipeline_stages')
      .select('*')
      .eq('pipeline_id', id)
      .order('display_order', { ascending: true });

    if (stagesError) {
      return { data: null, error: stagesError.message };
    }

    return {
      data: { ...(pipeline as any), stages: stages || [] } as PipelineWithStages,
      error: null,
    };
  }

  // Get all pipelines with stages
  async getAllWithStages(): Promise<ServiceListResult<PipelineWithStages>> {
    if (!this.canUseSupabase()) {
      const pipelines = await this.getAll({ orderBy: 'display_order', orderDirection: 'asc' });
      const stagesCached = (await offlineQueue.getCachedData('pipeline_stages')) as PipelineStage[] || [];

      const data = pipelines.data.map(p => ({
        ...p,
        stages: stagesCached
          .filter(s => s.pipeline_id === p.id)
          .sort((a, b) => a.display_order - b.display_order),
      }));

      return { data, error: null, count: data.length, offline: true };
    }

    const { data: pipelines, error: pipelinesError } = await supabase
      .from('pipelines')
      .select('*')
      .order('display_order', { ascending: true });

    if (pipelinesError) {
      return { data: [], error: pipelinesError.message, count: 0 };
    }

    const { data: stages, error: stagesError } = await supabase
      .from('pipeline_stages')
      .select('*')
      .order('display_order', { ascending: true });

    if (stagesError) {
      return { data: [], error: stagesError.message, count: 0 };
    }

    // Cache stages
    if (stages) {
      await offlineQueue.cacheData('pipeline_stages', stages);
    }

    const stagesMap = new Map<string, PipelineStage[]>();
    (stages || []).forEach(stage => {
      const existing = stagesMap.get(stage.pipeline_id) || [];
      existing.push(stage as PipelineStage);
      stagesMap.set(stage.pipeline_id, existing);
    });

    const data = (pipelines || []).map(p => ({
      ...p,
      stages: stagesMap.get(p.id) || [],
    })) as PipelineWithStages[];

    return { data, error: null, count: data.length };
  }

  // Get pipeline with stages and contacts
  async getByIdWithContacts(id: string): Promise<ServiceResult<PipelineWithContacts>> {
    const pipelineResult = await this.getByIdWithStages(id);
    if (!pipelineResult.data) {
      return { data: null, error: pipelineResult.error };
    }

    if (!this.canUseSupabase()) {
      const contactsCached = (await offlineQueue.getCachedData('crm_contacts')) as CrmContact[] || [];
      const contacts = contactsCached
        .filter(c => c.pipeline_id === id)
        .map(c => ({ ...c, tags: [] }));
      return {
        data: { ...pipelineResult.data, contacts } as PipelineWithContacts,
        error: null,
        offline: true,
      };
    }

    const { data: contacts, error: contactsError } = await supabase
      .from('crm_contacts')
      .select(`
        *,
        contact_tags (
          tag_id
        )
      `)
      .eq('pipeline_id', id);

    if (contactsError) {
      return { data: null, error: contactsError.message };
    }

    // Fetch tags
    const allTagIds = new Set<string>();
    (contacts || []).forEach(contact => {
      (contact.contact_tags as { tag_id: string }[])?.forEach(ct => allTagIds.add(ct.tag_id));
    });

    let tagsMap: Record<string, Tag> = {};
    if (allTagIds.size > 0) {
      const { data: tagsData } = await supabase
        .from('tags')
        .select('*')
        .in('id', Array.from(allTagIds));
      (tagsData as any[])?.forEach(tag => {
        tagsMap[tag.id] = tag as Tag;
      });
    }

    const contactsWithTags: CrmContactWithTags[] = (contacts || []).map(contact => {
      const { contact_tags, ...contactData } = contact;
      const tags = (contact_tags as { tag_id: string }[])
        ?.map(ct => tagsMap[ct.tag_id])
        .filter(Boolean) || [];
      return { ...contactData, tags } as CrmContactWithTags;
    });

    return {
      data: { ...pipelineResult.data, contacts: contactsWithTags } as PipelineWithContacts,
      error: null,
    };
  }

  // Create pipeline with default stages
  async createWithStages(
    pipeline: Partial<Pipeline>,
    stages: Array<{ label: string; color?: string; default_probability?: number }>
  ): Promise<ServiceResult<PipelineWithStages>> {
    const pipelineResult = await this.create(pipeline);
    if (!pipelineResult.data) {
      return { data: null, error: pipelineResult.error };
    }

    const stagesService = new PipelineStagesService();
    const createdStages: PipelineStage[] = [];

    for (let i = 0; i < stages.length; i++) {
      const stageResult = await stagesService.create({
        pipeline_id: pipelineResult.data.id,
        label: stages[i].label,
        color: stages[i].color,
        default_probability: stages[i].default_probability ?? 50,
        display_order: i,
      });
      if (stageResult.data) {
        createdStages.push(stageResult.data);
      }
    }

    return {
      data: { ...pipelineResult.data, stages: createdStages },
      error: null,
      offline: pipelineResult.offline,
    };
  }

  // Reorder pipelines
  async reorder(pipelineIds: string[]): Promise<ServiceResult<boolean>> {
    if (!this.canUseSupabase()) {
      for (let i = 0; i < pipelineIds.length; i++) {
        await this.update(pipelineIds[i], { display_order: i } as Partial<Pipeline>);
      }
      return { data: true, error: null, offline: true };
    }

    const updates = pipelineIds.map((id, index) =>
      (supabase.from('pipelines') as any).update({ display_order: index }).eq('id', id)
    );

    await Promise.all(updates);
    return { data: true, error: null };
  }
}

// Pipeline Stages Service
class PipelineStagesService extends BaseService<PipelineStage> {
  constructor() {
    super('pipeline_stages', 'id');
  }

  // Get stages by pipeline
  async getByPipeline(pipelineId: string): Promise<ServiceListResult<PipelineStage>> {
    return this.getAll({
      filters: { pipeline_id: pipelineId },
      orderBy: 'display_order',
      orderDirection: 'asc',
    });
  }

  // Reorder stages
  async reorder(stageIds: string[]): Promise<ServiceResult<boolean>> {
    if (!this.canUseSupabase()) {
      for (let i = 0; i < stageIds.length; i++) {
        await this.update(stageIds[i], { display_order: i } as Partial<PipelineStage>);
      }
      return { data: true, error: null, offline: true };
    }

    const updates = stageIds.map((id, index) =>
      (supabase.from('pipeline_stages') as any).update({ display_order: index }).eq('id', id)
    );

    await Promise.all(updates);
    return { data: true, error: null };
  }
}

// CRM Contacts Service
class CrmContactsService extends BaseService<CrmContact> {
  constructor() {
    super('crm_contacts', 'id');
  }

  // Get contact with tags
  async getByIdWithTags(id: string): Promise<ServiceResult<CrmContactWithTags>> {
    if (!this.canUseSupabase()) {
      const result = await this.getById(id);
      if (result.data) {
        return { data: { ...result.data, tags: [] }, error: null, offline: true };
      }
      return { data: null, error: result.error, offline: true };
    }

    const { data, error } = await supabase
      .from('crm_contacts')
      .select(`
        *,
        contact_tags (
          tag_id
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    const tagIds = ((data as any).contact_tags as { tag_id: string }[])?.map(ct => ct.tag_id) || [];
    let tags: Tag[] = [];

    if (tagIds.length > 0) {
      const { data: tagsData } = await supabase
        .from('tags')
        .select('*')
        .in('id', tagIds);
      tags = (tagsData || []) as Tag[];
    }

    const { contact_tags, ...contactData } = data as any;
    return { data: { ...contactData, tags } as CrmContactWithTags, error: null };
  }

  // Get contacts by pipeline
  async getByPipeline(pipelineId: string): Promise<ServiceListResult<CrmContactWithTags>> {
    if (!this.canUseSupabase()) {
      const result = await this.getAll({ filters: { pipeline_id: pipelineId } });
      return {
        data: result.data.map(c => ({ ...c, tags: [] })),
        error: result.error,
        count: result.count,
        offline: true,
      };
    }

    const { data, error } = await supabase
      .from('crm_contacts')
      .select(`
        *,
        contact_tags (
          tag_id
        )
      `)
      .eq('pipeline_id', pipelineId);

    if (error) {
      return { data: [], error: error.message, count: 0 };
    }

    // Fetch tags
    const allTagIds = new Set<string>();
    (data || []).forEach(contact => {
      (contact.contact_tags as { tag_id: string }[])?.forEach(ct => allTagIds.add(ct.tag_id));
    });

    let tagsMap: Record<string, Tag> = {};
    if (allTagIds.size > 0) {
      const { data: tagsData } = await supabase
        .from('tags')
        .select('*')
        .in('id', Array.from(allTagIds));
      (tagsData as any[])?.forEach(tag => {
        tagsMap[tag.id] = tag as Tag;
      });
    }

    const contacts: CrmContactWithTags[] = (data || []).map(contact => {
      const { contact_tags, ...contactData } = contact;
      const tags = (contact_tags as { tag_id: string }[])
        ?.map(ct => tagsMap[ct.tag_id])
        .filter(Boolean) || [];
      return { ...contactData, tags } as CrmContactWithTags;
    });

    return { data: contacts, error: null, count: contacts.length };
  }

  // Move contact to stage
  async moveToStage(contactId: string, stageId: string): Promise<ServiceResult<CrmContact>> {
    return this.update(contactId, { stage_id: stageId } as Partial<CrmContact>);
  }

  // Move contact to pipeline
  async moveToPipeline(
    contactId: string,
    pipelineId: string,
    stageId: string
  ): Promise<ServiceResult<CrmContact>> {
    return this.update(contactId, {
      pipeline_id: pipelineId,
      stage_id: stageId,
    } as Partial<CrmContact>);
  }

  // Mark as won
  async markAsWon(contactId: string, clientId?: string): Promise<ServiceResult<CrmContact>> {
    const updateData: Partial<CrmContact> = {
      outcome: 'won',
      closed_at: new Date().toISOString(),
    };
    if (clientId) {
      updateData.converted_to_client_id = clientId;
      updateData.converted_at = new Date().toISOString();
    }
    return this.update(contactId, updateData);
  }

  // Mark as lost
  async markAsLost(
    contactId: string,
    reason?: string,
    notes?: string
  ): Promise<ServiceResult<CrmContact>> {
    return this.update(contactId, {
      outcome: 'lost',
      closed_at: new Date().toISOString(),
      loss_reason: reason,
      loss_notes: notes,
    } as Partial<CrmContact>);
  }

  // Get pipeline value (sum of open contacts)
  async getPipelineValue(pipelineId?: string): Promise<number> {
    if (!this.canUseSupabase()) {
      const cached = await offlineQueue.getCachedData(this.tableName) as CrmContact[] || [];
      return cached
        .filter(c => c.outcome === 'open' && (!pipelineId || c.pipeline_id === pipelineId))
        .reduce((sum, c) => sum + (c.value || 0), 0);
    }

    let query = supabase
      .from('crm_contacts')
      .select('value')
      .eq('outcome', 'open');

    if (pipelineId) {
      query = query.eq('pipeline_id', pipelineId);
    }

    const { data, error } = await query;
    if (error || !data) return 0;
    return (data as any[]).reduce((sum, c) => sum + (c.value || 0), 0);
  }

  // Get weighted pipeline value
  async getWeightedPipelineValue(pipelineId?: string): Promise<number> {
    if (!this.canUseSupabase()) {
      const cached = await offlineQueue.getCachedData(this.tableName) as CrmContact[] || [];
      return cached
        .filter(c => c.outcome === 'open' && (!pipelineId || c.pipeline_id === pipelineId))
        .reduce((sum, c) => sum + ((c.value || 0) * (c.probability || 50) / 100), 0);
    }

    let query = supabase
      .from('crm_contacts')
      .select('value, probability')
      .eq('outcome', 'open');

    if (pipelineId) {
      query = query.eq('pipeline_id', pipelineId);
    }

    const { data, error } = await query;
    if (error || !data) return 0;
    return (data as any[]).reduce((sum, c) => sum + ((c.value || 0) * (c.probability || 50) / 100), 0);
  }

  // Add tag to contact
  async addTag(contactId: string, tagId: string): Promise<ServiceResult<boolean>> {
    if (!this.canUseSupabase()) {
      await offlineQueue.queueOperation('contact_tags', 'insert', {
        contact_id: contactId,
        tag_id: tagId,
      });
      return { data: true, error: null, offline: true };
    }

    const { error } = await (supabase
      .from('contact_tags') as any)
      .insert({ contact_id: contactId, tag_id: tagId });

    if (error && !error.message.includes('duplicate')) {
      return { data: false, error: error.message };
    }

    return { data: true, error: null };
  }

  // Remove tag from contact
  async removeTag(contactId: string, tagId: string): Promise<ServiceResult<boolean>> {
    if (!this.canUseSupabase()) {
      await offlineQueue.queueOperation('contact_tags', 'delete', {
        contact_id: contactId,
        tag_id: tagId,
      });
      return { data: true, error: null, offline: true };
    }

    const { error } = await supabase
      .from('contact_tags')
      .delete()
      .eq('contact_id', contactId)
      .eq('tag_id', tagId);

    if (error) {
      return { data: false, error: error.message };
    }

    return { data: true, error: null };
  }
}

export const pipelinesService = new PipelinesService();
export const pipelineStagesService = new PipelineStagesService();
export const crmContactsService = new CrmContactsService();

export { PipelinesService, PipelineStagesService, CrmContactsService };
