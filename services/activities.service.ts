import { supabase, isSupabaseConfigured } from '../lib/supabase/client';
import { BaseService, ServiceResult, ServiceListResult, ListOptions } from './base.service';
import type { Activity } from '../lib/supabase/types';
import { offlineQueue, isOnline } from '../utils/offline-queue';

// Activity Types
export type ActivityType =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'status_change'
  | 'note'
  | 'email'
  | 'call'
  | 'meeting'
  | 'stage_change'
  | 'outcome_change'
  | 'converted';

export type EntityType = 'client' | 'contact' | 'project' | 'task' | 'snapshot' | 'pipeline';

class ActivitiesService extends BaseService<Activity> {
  constructor() {
    super('activities', 'id');
  }

  // Log a new activity
  async log(
    type: ActivityType,
    entityType: EntityType,
    entityId: string,
    title: string,
    description?: string,
    metadata?: Record<string, unknown>
  ): Promise<ServiceResult<Activity>> {
    return this.create({
      type,
      entity_type: entityType,
      entity_id: entityId,
      title,
      description,
      metadata: metadata || null,
    } as Partial<Activity>);
  }

  // Get activities for an entity
  async getByEntity(
    entityType: EntityType,
    entityId: string,
    options: ListOptions = {}
  ): Promise<ServiceListResult<Activity>> {
    return this.getAll({
      ...options,
      filters: { entity_type: entityType, entity_id: entityId },
      orderBy: 'created_at',
      orderDirection: 'desc',
    });
  }

  // Get activities by type
  async getByType(type: ActivityType, options: ListOptions = {}): Promise<ServiceListResult<Activity>> {
    return this.getAll({
      ...options,
      filters: { type },
      orderBy: 'created_at',
      orderDirection: 'desc',
    });
  }

  // Get recent activities (across all entities)
  async getRecent(limit: number = 20): Promise<ServiceListResult<Activity>> {
    return this.getAll({
      pageSize: limit,
      orderBy: 'created_at',
      orderDirection: 'desc',
    });
  }

  // Get activities for multiple entities
  async getByEntities(
    entities: Array<{ entityType: EntityType; entityId: string }>,
    options: ListOptions = {}
  ): Promise<ServiceListResult<Activity>> {
    if (!this.canUseSupabase()) {
      const cached = (await offlineQueue.getCachedData(this.tableName)) as Activity[] || [];
      const data = cached.filter(a =>
        entities.some(e => a.entity_type === e.entityType && a.entity_id === e.entityId)
      );
      return { data, error: null, count: data.length, offline: true };
    }

    // Build OR conditions
    const conditions = entities.map(e => `and(entity_type.eq.${e.entityType},entity_id.eq.${e.entityId})`);

    const { data, error, count } = await supabase
      .from('activities')
      .select('*', { count: 'exact' })
      .or(conditions.join(','))
      .order('created_at', { ascending: false })
      .limit(options.pageSize || 50);

    if (error) {
      return { data: [], error: error.message, count: 0 };
    }

    return { data: (data || []) as Activity[], error: null, count: count || 0 };
  }

  // Get activity timeline for a date range
  async getTimeline(
    startDate: string,
    endDate: string,
    entityType?: EntityType
  ): Promise<ServiceListResult<Activity>> {
    if (!this.canUseSupabase()) {
      const cached = (await offlineQueue.getCachedData(this.tableName)) as Activity[] || [];
      const data = cached.filter(a => {
        const activityDate = a.created_at.split('T')[0];
        const matchesDateRange = activityDate >= startDate && activityDate <= endDate;
        const matchesType = !entityType || a.entity_type === entityType;
        return matchesDateRange && matchesType;
      });
      return { data, error: null, count: data.length, offline: true };
    }

    let query = supabase
      .from('activities')
      .select('*', { count: 'exact' })
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: false });

    if (entityType) {
      query = query.eq('entity_type', entityType);
    }

    const { data, error, count } = await query;

    if (error) {
      return { data: [], error: error.message, count: 0 };
    }

    return { data: (data || []) as Activity[], error: null, count: count || 0 };
  }

  // Helper methods for common activity logging
  async logCreated(
    entityType: EntityType,
    entityId: string,
    entityName: string
  ): Promise<ServiceResult<Activity>> {
    return this.log(
      'created',
      entityType,
      entityId,
      `Created ${entityType}: ${entityName}`,
      undefined,
      { name: entityName }
    );
  }

  async logUpdated(
    entityType: EntityType,
    entityId: string,
    entityName: string,
    changes?: Record<string, { from: unknown; to: unknown }>
  ): Promise<ServiceResult<Activity>> {
    return this.log(
      'updated',
      entityType,
      entityId,
      `Updated ${entityType}: ${entityName}`,
      changes ? `Changed: ${Object.keys(changes).join(', ')}` : undefined,
      { name: entityName, changes }
    );
  }

  async logDeleted(
    entityType: EntityType,
    entityId: string,
    entityName: string
  ): Promise<ServiceResult<Activity>> {
    return this.log(
      'deleted',
      entityType,
      entityId,
      `Deleted ${entityType}: ${entityName}`,
      undefined,
      { name: entityName }
    );
  }

  async logStatusChange(
    entityType: EntityType,
    entityId: string,
    entityName: string,
    fromStatus: string,
    toStatus: string
  ): Promise<ServiceResult<Activity>> {
    return this.log(
      'status_change',
      entityType,
      entityId,
      `${entityName} status changed`,
      `${fromStatus} → ${toStatus}`,
      { name: entityName, fromStatus, toStatus }
    );
  }

  async logStageChange(
    entityId: string,
    contactName: string,
    fromStage: string,
    toStage: string
  ): Promise<ServiceResult<Activity>> {
    return this.log(
      'stage_change',
      'contact',
      entityId,
      `${contactName} moved stages`,
      `${fromStage} → ${toStage}`,
      { name: contactName, fromStage, toStage }
    );
  }

  async logOutcomeChange(
    entityId: string,
    contactName: string,
    outcome: 'won' | 'lost',
    details?: { value?: number; reason?: string }
  ): Promise<ServiceResult<Activity>> {
    const title = outcome === 'won'
      ? `Deal won: ${contactName}`
      : `Deal lost: ${contactName}`;

    const description = outcome === 'won' && details?.value
      ? `Value: £${details.value.toLocaleString()}`
      : details?.reason || undefined;

    return this.log(
      'outcome_change',
      'contact',
      entityId,
      title,
      description,
      { name: contactName, outcome, ...details }
    );
  }

  async logConversion(
    contactId: string,
    contactName: string,
    clientId: string,
    value?: number
  ): Promise<ServiceResult<Activity>> {
    return this.log(
      'converted',
      'contact',
      contactId,
      `Converted to client: ${contactName}`,
      value ? `Value: £${value.toLocaleString()}` : undefined,
      { name: contactName, clientId, value }
    );
  }

  async logNote(
    entityType: EntityType,
    entityId: string,
    entityName: string,
    note: string
  ): Promise<ServiceResult<Activity>> {
    return this.log(
      'note',
      entityType,
      entityId,
      `Note added to ${entityName}`,
      note,
      { name: entityName }
    );
  }

  async logEmail(
    entityType: EntityType,
    entityId: string,
    entityName: string,
    subject: string
  ): Promise<ServiceResult<Activity>> {
    return this.log(
      'email',
      entityType,
      entityId,
      `Email sent to ${entityName}`,
      subject,
      { name: entityName, subject }
    );
  }

  async logCall(
    entityType: EntityType,
    entityId: string,
    entityName: string,
    notes?: string,
    duration?: number
  ): Promise<ServiceResult<Activity>> {
    return this.log(
      'call',
      entityType,
      entityId,
      `Call with ${entityName}`,
      notes || (duration ? `Duration: ${duration} minutes` : undefined),
      { name: entityName, duration }
    );
  }

  async logMeeting(
    entityType: EntityType,
    entityId: string,
    entityName: string,
    notes?: string
  ): Promise<ServiceResult<Activity>> {
    return this.log(
      'meeting',
      entityType,
      entityId,
      `Meeting with ${entityName}`,
      notes,
      { name: entityName }
    );
  }

  // Get activity counts by type
  async getCountsByType(): Promise<Record<ActivityType, number>> {
    const types: ActivityType[] = [
      'created', 'updated', 'deleted', 'status_change',
      'note', 'email', 'call', 'meeting', 'stage_change',
      'outcome_change', 'converted'
    ];

    const counts: Record<string, number> = {};

    if (!this.canUseSupabase()) {
      const cached = (await offlineQueue.getCachedData(this.tableName)) as Activity[] || [];
      types.forEach(type => {
        counts[type] = cached.filter(a => a.type === type).length;
      });
      return counts as Record<ActivityType, number>;
    }

    const results = await Promise.all(
      types.map(type =>
        supabase
          .from('activities')
          .select('*', { count: 'exact', head: true })
          .eq('type', type)
      )
    );

    types.forEach((type, index) => {
      counts[type] = results[index].count || 0;
    });

    return counts as Record<ActivityType, number>;
  }
}

export const activitiesService = new ActivitiesService();
export { ActivitiesService };
