import { useState, useEffect, useCallback } from 'react';
import { activitiesService, ActivityType, EntityType } from '../services/activities.service';
import type { Activity } from '../lib/supabase/types';
import type { ListOptions } from '../services/base.service';

interface UseActivitiesOptions extends ListOptions {
  autoFetch?: boolean;
  entityType?: EntityType;
  entityId?: string;
}

// Hook for activities list
export function useActivities(options: UseActivitiesOptions = {}) {
  const { autoFetch = true, entityType, entityId, ...listOptions } = options;

  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let result;

      if (entityType && entityId) {
        result = await activitiesService.getByEntity(entityType, entityId, listOptions);
      } else {
        result = await activitiesService.getRecent(listOptions.pageSize || 20);
      }

      if (result.error) {
        setError(result.error);
      } else {
        setActivities(result.data);
        setIsOffline(result.offline || false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch activities');
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId, JSON.stringify(listOptions)]);

  useEffect(() => {
    if (autoFetch) {
      refresh();
    }
  }, [autoFetch, refresh]);

  // Log activity helpers
  const logCreated = useCallback(async (
    type: EntityType,
    id: string,
    name: string
  ) => {
    const result = await activitiesService.logCreated(type, id, name);
    if (result.data) {
      setActivities(prev => [result.data!, ...prev]);
    }
    return result;
  }, []);

  const logUpdated = useCallback(async (
    type: EntityType,
    id: string,
    name: string,
    changes?: Record<string, { from: unknown; to: unknown }>
  ) => {
    const result = await activitiesService.logUpdated(type, id, name, changes);
    if (result.data) {
      setActivities(prev => [result.data!, ...prev]);
    }
    return result;
  }, []);

  const logDeleted = useCallback(async (
    type: EntityType,
    id: string,
    name: string
  ) => {
    const result = await activitiesService.logDeleted(type, id, name);
    if (result.data) {
      setActivities(prev => [result.data!, ...prev]);
    }
    return result;
  }, []);

  const logStatusChange = useCallback(async (
    type: EntityType,
    id: string,
    name: string,
    fromStatus: string,
    toStatus: string
  ) => {
    const result = await activitiesService.logStatusChange(type, id, name, fromStatus, toStatus);
    if (result.data) {
      setActivities(prev => [result.data!, ...prev]);
    }
    return result;
  }, []);

  const logNote = useCallback(async (
    type: EntityType,
    id: string,
    name: string,
    note: string
  ) => {
    const result = await activitiesService.logNote(type, id, name, note);
    if (result.data) {
      setActivities(prev => [result.data!, ...prev]);
    }
    return result;
  }, []);

  const logEmail = useCallback(async (
    type: EntityType,
    id: string,
    name: string,
    subject: string
  ) => {
    const result = await activitiesService.logEmail(type, id, name, subject);
    if (result.data) {
      setActivities(prev => [result.data!, ...prev]);
    }
    return result;
  }, []);

  const logCall = useCallback(async (
    type: EntityType,
    id: string,
    name: string,
    notes?: string,
    duration?: number
  ) => {
    const result = await activitiesService.logCall(type, id, name, notes, duration);
    if (result.data) {
      setActivities(prev => [result.data!, ...prev]);
    }
    return result;
  }, []);

  const logMeeting = useCallback(async (
    type: EntityType,
    id: string,
    name: string,
    notes?: string
  ) => {
    const result = await activitiesService.logMeeting(type, id, name, notes);
    if (result.data) {
      setActivities(prev => [result.data!, ...prev]);
    }
    return result;
  }, []);

  return {
    activities,
    loading,
    error,
    isOffline,
    refresh,
    // Logging helpers
    logCreated,
    logUpdated,
    logDeleted,
    logStatusChange,
    logNote,
    logEmail,
    logCall,
    logMeeting,
  };
}

// Hook for entity activities
export function useEntityActivities(entityType: EntityType, entityId: string | null) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!entityId) {
      setActivities([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await activitiesService.getByEntity(entityType, entityId);
      if (result.error) {
        setError(result.error);
      } else {
        setActivities(result.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch activities');
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { activities, loading, error, refresh };
}

// Hook for activity timeline
export function useActivityTimeline(
  startDate: string,
  endDate: string,
  entityType?: EntityType
) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await activitiesService.getTimeline(startDate, endDate, entityType);
      if (result.error) {
        setError(result.error);
      } else {
        setActivities(result.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch timeline');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, entityType]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Group activities by date
  const byDate = activities.reduce((acc, activity) => {
    const date = activity.created_at.split('T')[0];
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(activity);
    return acc;
  }, {} as Record<string, Activity[]>);

  return { activities, byDate, loading, error, refresh };
}

// Hook for recent activities (dashboard widget)
export function useRecentActivities(limit: number = 10) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await activitiesService.getRecent(limit);
      if (result.error) {
        setError(result.error);
      } else {
        setActivities(result.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch activities');
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { activities, loading, error, refresh };
}

export default useActivities;
