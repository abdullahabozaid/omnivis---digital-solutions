import { supabase, isSupabaseConfigured } from '../lib/supabase/client';
import { BaseService, ServiceResult, ServiceListResult, ListOptions } from './base.service';
import type { Task, Project } from '../lib/supabase/types';
import { offlineQueue, isOnline } from '../utils/offline-queue';

// Tasks Service
class TasksService extends BaseService<Task> {
  constructor() {
    super('tasks', 'id');
  }

  // Get tasks by status
  async getByStatus(status: string): Promise<ServiceListResult<Task>> {
    return this.getAll({
      filters: { status },
      orderBy: 'due_date',
      orderDirection: 'asc',
    });
  }

  // Get pending tasks
  async getPending(): Promise<ServiceListResult<Task>> {
    return this.getAll({
      filters: { completed: false },
      orderBy: 'due_date',
      orderDirection: 'asc',
    });
  }

  // Get completed tasks
  async getCompleted(): Promise<ServiceListResult<Task>> {
    return this.getAll({
      filters: { completed: true },
      orderBy: 'completed_at',
      orderDirection: 'desc',
    });
  }

  // Get tasks due today
  async getDueToday(): Promise<ServiceListResult<Task>> {
    const today = new Date().toISOString().split('T')[0];

    if (!this.canUseSupabase()) {
      const cached = (await offlineQueue.getCachedData(this.tableName)) as Task[] || [];
      const data = cached.filter(t => t.due_date === today && !t.completed);
      return { data, error: null, count: data.length, offline: true };
    }

    const { data, error, count } = await supabase
      .from('tasks')
      .select('*', { count: 'exact' })
      .eq('due_date', today)
      .eq('completed', false)
      .order('due_time', { ascending: true });

    if (error) {
      return { data: [], error: error.message, count: 0 };
    }

    return { data: (data || []) as Task[], error: null, count: count || 0 };
  }

  // Get overdue tasks
  async getOverdue(): Promise<ServiceListResult<Task>> {
    const today = new Date().toISOString().split('T')[0];

    if (!this.canUseSupabase()) {
      const cached = (await offlineQueue.getCachedData(this.tableName)) as Task[] || [];
      const data = cached.filter(t => t.due_date && t.due_date < today && !t.completed);
      return { data, error: null, count: data.length, offline: true };
    }

    const { data, error, count } = await supabase
      .from('tasks')
      .select('*', { count: 'exact' })
      .lt('due_date', today)
      .eq('completed', false)
      .order('due_date', { ascending: true });

    if (error) {
      return { data: [], error: error.message, count: 0 };
    }

    return { data: (data || []) as Task[], error: null, count: count || 0 };
  }

  // Get upcoming tasks (next 7 days)
  async getUpcoming(days: number = 7): Promise<ServiceListResult<Task>> {
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + days);
    const todayStr = today.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    if (!this.canUseSupabase()) {
      const cached = (await offlineQueue.getCachedData(this.tableName)) as Task[] || [];
      const data = cached.filter(
        t => t.due_date && t.due_date >= todayStr && t.due_date <= endDateStr && !t.completed
      );
      return { data, error: null, count: data.length, offline: true };
    }

    const { data, error, count } = await supabase
      .from('tasks')
      .select('*', { count: 'exact' })
      .gte('due_date', todayStr)
      .lte('due_date', endDateStr)
      .eq('completed', false)
      .order('due_date', { ascending: true });

    if (error) {
      return { data: [], error: error.message, count: 0 };
    }

    return { data: (data || []) as Task[], error: null, count: count || 0 };
  }

  // Get tasks by project
  async getByProject(projectId: string): Promise<ServiceListResult<Task>> {
    return this.getAll({
      filters: { project_id: projectId },
      orderBy: 'due_date',
      orderDirection: 'asc',
    });
  }

  // Get tasks by client
  async getByClient(clientId: string): Promise<ServiceListResult<Task>> {
    return this.getAll({
      filters: { client_id: clientId },
      orderBy: 'due_date',
      orderDirection: 'asc',
    });
  }

  // Mark task as complete
  async complete(id: string): Promise<ServiceResult<Task>> {
    return this.update(id, {
      completed: true,
      completed_at: new Date().toISOString(),
      status: 'completed',
    } as Partial<Task>);
  }

  // Mark task as incomplete
  async uncomplete(id: string): Promise<ServiceResult<Task>> {
    return this.update(id, {
      completed: false,
      completed_at: null,
      status: 'pending',
    } as Partial<Task>);
  }

  // Toggle task completion
  async toggle(id: string): Promise<ServiceResult<Task>> {
    const task = await this.getById(id);
    if (!task.data) {
      return { data: null, error: task.error };
    }

    if (task.data.completed) {
      return this.uncomplete(id);
    } else {
      return this.complete(id);
    }
  }

  // Update task priority
  async updatePriority(id: string, priority: string): Promise<ServiceResult<Task>> {
    return this.update(id, { priority } as Partial<Task>);
  }

  // Update task status
  async updateStatus(id: string, status: string): Promise<ServiceResult<Task>> {
    const updates: Partial<Task> = { status };
    if (status === 'completed') {
      updates.completed = true;
      updates.completed_at = new Date().toISOString();
    }
    return this.update(id, updates);
  }

  // Reschedule task
  async reschedule(id: string, dueDate: string, dueTime?: string): Promise<ServiceResult<Task>> {
    return this.update(id, {
      due_date: dueDate,
      due_time: dueTime || null,
    } as Partial<Task>);
  }

  // Get task counts by status
  async getCounts(): Promise<{
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    overdue: number;
    dueToday: number;
  }> {
    const today = new Date().toISOString().split('T')[0];

    if (!this.canUseSupabase()) {
      const cached = (await offlineQueue.getCachedData(this.tableName)) as Task[] || [];
      return {
        total: cached.length,
        pending: cached.filter(t => t.status === 'pending').length,
        inProgress: cached.filter(t => t.status === 'in-progress').length,
        completed: cached.filter(t => t.completed).length,
        overdue: cached.filter(t => t.due_date && t.due_date < today && !t.completed).length,
        dueToday: cached.filter(t => t.due_date === today && !t.completed).length,
      };
    }

    const [total, pending, inProgress, completed, overdue, dueToday] = await Promise.all([
      supabase.from('tasks').select('*', { count: 'exact', head: true }),
      supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'in-progress'),
      supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('completed', true),
      supabase.from('tasks').select('*', { count: 'exact', head: true }).lt('due_date', today).eq('completed', false),
      supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('due_date', today).eq('completed', false),
    ]);

    return {
      total: total.count || 0,
      pending: pending.count || 0,
      inProgress: inProgress.count || 0,
      completed: completed.count || 0,
      overdue: overdue.count || 0,
      dueToday: dueToday.count || 0,
    };
  }
}

// Projects Service
class ProjectsService extends BaseService<Project> {
  constructor() {
    super('projects', 'id');
  }

  // Get projects by status
  async getByStatus(status: string): Promise<ServiceListResult<Project>> {
    return this.getAll({
      filters: { status },
      orderBy: 'created_at',
      orderDirection: 'desc',
    });
  }

  // Get active projects
  async getActive(): Promise<ServiceListResult<Project>> {
    return this.getByStatus('active');
  }

  // Get projects by client
  async getByClient(clientId: string): Promise<ServiceListResult<Project>> {
    return this.getAll({
      filters: { client_id: clientId },
      orderBy: 'created_at',
      orderDirection: 'desc',
    });
  }

  // Get project with tasks
  async getByIdWithTasks(id: string): Promise<ServiceResult<Project & { tasks: Task[] }>> {
    const project = await this.getById(id);
    if (!project.data) {
      return { data: null, error: project.error };
    }

    const tasksService = new TasksService();
    const tasks = await tasksService.getByProject(id);

    return {
      data: { ...project.data, tasks: tasks.data },
      error: null,
      offline: project.offline,
    };
  }

  // Archive project
  async archive(id: string): Promise<ServiceResult<Project>> {
    return this.update(id, { status: 'archived' } as Partial<Project>);
  }

  // Get project progress (percentage of completed tasks)
  async getProgress(id: string): Promise<number> {
    const tasksService = new TasksService();
    const tasks = await tasksService.getByProject(id);

    if (!tasks.data.length) return 0;

    const completed = tasks.data.filter(t => t.completed).length;
    return Math.round((completed / tasks.data.length) * 100);
  }
}

export const tasksService = new TasksService();
export const projectsService = new ProjectsService();

export { TasksService, ProjectsService };
