import { useState, useEffect, useCallback, useMemo } from 'react';
import { tasksService, projectsService } from '../services/tasks.service';
import type { Task, Project } from '../lib/supabase/types';
import type { ServiceResult, ListOptions } from '../services/base.service';

interface UseTasksOptions extends ListOptions {
  autoFetch?: boolean;
  projectId?: string;
  clientId?: string;
  status?: string;
  dueDateFilter?: 'today' | 'overdue' | 'upcoming' | 'all';
}

// Hook for tasks list
export function useTasks(options: UseTasksOptions = {}) {
  const {
    autoFetch = true,
    projectId,
    clientId,
    status,
    dueDateFilter = 'all',
    ...listOptions
  } = options;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let result;

      if (projectId) {
        result = await tasksService.getByProject(projectId);
      } else if (clientId) {
        result = await tasksService.getByClient(clientId);
      } else if (dueDateFilter === 'today') {
        result = await tasksService.getDueToday();
      } else if (dueDateFilter === 'overdue') {
        result = await tasksService.getOverdue();
      } else if (dueDateFilter === 'upcoming') {
        result = await tasksService.getUpcoming();
      } else if (status) {
        result = await tasksService.getByStatus(status);
      } else {
        result = await tasksService.getAll(listOptions);
      }

      if (result.error) {
        setError(result.error);
      } else {
        setTasks(result.data);
        setIsOffline(result.offline || false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  }, [projectId, clientId, status, dueDateFilter, JSON.stringify(listOptions)]);

  useEffect(() => {
    if (autoFetch) {
      refresh();
    }
  }, [autoFetch, refresh]);

  const create = useCallback(async (data: Partial<Task>): Promise<ServiceResult<Task>> => {
    const result = await tasksService.create(data);
    if (result.data) {
      setTasks(prev => [result.data!, ...prev]);
    }
    return result;
  }, []);

  const update = useCallback(async (id: string, data: Partial<Task>): Promise<ServiceResult<Task>> => {
    const result = await tasksService.update(id, data);
    if (result.data) {
      setTasks(prev =>
        prev.map(t => (t.id === id ? { ...t, ...result.data! } : t))
      );
    }
    return result;
  }, []);

  const remove = useCallback(async (id: string): Promise<ServiceResult<boolean>> => {
    const result = await tasksService.delete(id);
    if (result.data) {
      setTasks(prev => prev.filter(t => t.id !== id));
    }
    return result;
  }, []);

  const toggle = useCallback(async (id: string): Promise<ServiceResult<Task>> => {
    const result = await tasksService.toggle(id);
    if (result.data) {
      setTasks(prev =>
        prev.map(t => (t.id === id ? { ...t, ...result.data! } : t))
      );
    }
    return result;
  }, []);

  const complete = useCallback(async (id: string): Promise<ServiceResult<Task>> => {
    const result = await tasksService.complete(id);
    if (result.data) {
      setTasks(prev =>
        prev.map(t => (t.id === id ? { ...t, ...result.data! } : t))
      );
    }
    return result;
  }, []);

  const uncomplete = useCallback(async (id: string): Promise<ServiceResult<Task>> => {
    const result = await tasksService.uncomplete(id);
    if (result.data) {
      setTasks(prev =>
        prev.map(t => (t.id === id ? { ...t, ...result.data! } : t))
      );
    }
    return result;
  }, []);

  const reschedule = useCallback(async (id: string, dueDate: string, dueTime?: string): Promise<ServiceResult<Task>> => {
    const result = await tasksService.reschedule(id, dueDate, dueTime);
    if (result.data) {
      setTasks(prev =>
        prev.map(t => (t.id === id ? { ...t, ...result.data! } : t))
      );
    }
    return result;
  }, []);

  const updatePriority = useCallback(async (id: string, priority: string): Promise<ServiceResult<Task>> => {
    const result = await tasksService.updatePriority(id, priority);
    if (result.data) {
      setTasks(prev =>
        prev.map(t => (t.id === id ? { ...t, ...result.data! } : t))
      );
    }
    return result;
  }, []);

  // Grouped tasks
  const tasksByStatus = useMemo(() => ({
    pending: tasks.filter(t => t.status === 'pending'),
    inProgress: tasks.filter(t => t.status === 'in-progress'),
    completed: tasks.filter(t => t.completed),
  }), [tasks]);

  const tasksByPriority = useMemo(() => ({
    urgent: tasks.filter(t => t.priority === 'urgent'),
    high: tasks.filter(t => t.priority === 'high'),
    medium: tasks.filter(t => t.priority === 'medium'),
    low: tasks.filter(t => t.priority === 'low'),
  }), [tasks]);

  // Stats
  const stats = useMemo(() => ({
    total: tasks.length,
    pending: tasksByStatus.pending.length,
    inProgress: tasksByStatus.inProgress.length,
    completed: tasksByStatus.completed.length,
    completionRate: tasks.length > 0
      ? Math.round((tasksByStatus.completed.length / tasks.length) * 100)
      : 0,
  }), [tasks, tasksByStatus]);

  return {
    tasks,
    loading,
    error,
    isOffline,
    refresh,
    create,
    update,
    remove,
    toggle,
    complete,
    uncomplete,
    reschedule,
    updatePriority,
    tasksByStatus,
    tasksByPriority,
    stats,
  };
}

// Hook for task counts
export function useTaskCounts() {
  const [counts, setCounts] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    overdue: 0,
    dueToday: 0,
  });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await tasksService.getCounts();
      setCounts(result);
    } catch (err) {
      console.error('Failed to fetch task counts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { counts, loading, refresh };
}

// Hook for single task
export function useTask(id: string | null) {
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!id) {
      setTask(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await tasksService.getById(id);
      if (result.error) {
        setError(result.error);
      } else {
        setTask(result.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch task');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const update = useCallback(async (data: Partial<Task>) => {
    if (!id) return { data: null, error: 'No task ID' };

    const result = await tasksService.update(id, data);
    if (result.data) {
      setTask(prev => prev ? { ...prev, ...result.data! } : null);
    }
    return result;
  }, [id]);

  const toggle = useCallback(async () => {
    if (!id) return { data: null, error: 'No task ID' };

    const result = await tasksService.toggle(id);
    if (result.data) {
      setTask(prev => prev ? { ...prev, ...result.data! } : null);
    }
    return result;
  }, [id]);

  return { task, loading, error, refresh, update, toggle };
}

// Hook for projects
export function useProjects(options: ListOptions = {}) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await projectsService.getAll(options);
      if (result.error) {
        setError(result.error);
      } else {
        setProjects(result.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(options)]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(async (data: Partial<Project>): Promise<ServiceResult<Project>> => {
    const result = await projectsService.create(data);
    if (result.data) {
      setProjects(prev => [result.data!, ...prev]);
    }
    return result;
  }, []);

  const update = useCallback(async (id: string, data: Partial<Project>): Promise<ServiceResult<Project>> => {
    const result = await projectsService.update(id, data);
    if (result.data) {
      setProjects(prev =>
        prev.map(p => (p.id === id ? { ...p, ...result.data! } : p))
      );
    }
    return result;
  }, []);

  const remove = useCallback(async (id: string): Promise<ServiceResult<boolean>> => {
    const result = await projectsService.delete(id);
    if (result.data) {
      setProjects(prev => prev.filter(p => p.id !== id));
    }
    return result;
  }, []);

  const archive = useCallback(async (id: string): Promise<ServiceResult<Project>> => {
    const result = await projectsService.archive(id);
    if (result.data) {
      setProjects(prev =>
        prev.map(p => (p.id === id ? { ...p, status: 'archived' } : p))
      );
    }
    return result;
  }, []);

  // Grouped projects
  const projectsByStatus = useMemo(() => ({
    active: projects.filter(p => p.status === 'active'),
    completed: projects.filter(p => p.status === 'completed'),
    onHold: projects.filter(p => p.status === 'on-hold'),
    archived: projects.filter(p => p.status === 'archived'),
  }), [projects]);

  return {
    projects,
    loading,
    error,
    refresh,
    create,
    update,
    remove,
    archive,
    projectsByStatus,
  };
}

// Hook for single project with tasks
export function useProject(id: string | null) {
  const [project, setProject] = useState<(Project & { tasks: Task[] }) | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!id) {
      setProject(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await projectsService.getByIdWithTasks(id);
      if (result.error) {
        setError(result.error);
      } else {
        setProject(result.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch project');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const update = useCallback(async (data: Partial<Project>) => {
    if (!id) return { data: null, error: 'No project ID' };

    const result = await projectsService.update(id, data);
    if (result.data) {
      setProject(prev => prev ? { ...prev, ...result.data! } : null);
    }
    return result;
  }, [id]);

  const progress = useMemo(() => {
    if (!project?.tasks.length) return 0;
    const completed = project.tasks.filter(t => t.completed).length;
    return Math.round((completed / project.tasks.length) * 100);
  }, [project]);

  return { project, loading, error, refresh, update, progress };
}

export default useTasks;
