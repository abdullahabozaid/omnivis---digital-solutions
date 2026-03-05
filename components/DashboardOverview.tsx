import React, { useState, useEffect, useMemo } from 'react';
import {
  Users, Layout, TrendingUp, DollarSign, Inbox,
  AlertTriangle, CheckSquare, Square, Star, Calendar as CalendarIcon,
  ChevronLeft, ChevronRight, Clock, Plus, X, Video, ArrowRight, Briefcase,
  Target, Settings, Edit3, SlidersHorizontal, Check, Eye, EyeOff, RotateCcw,
  GripVertical, ArrowUp, ArrowDown
} from 'lucide-react';
import { ViewState, UserSettings, DashboardGoals } from '../types';
import { useToast } from './Toast';
import { useViewCustomization, DEFAULT_WIDGET_ORDER } from '../hooks/useViewCustomization';

// Skeleton loader components
const SkeletonPulse: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-gray-200 dark:bg-dark-elevated rounded ${className}`} />
);

const StatCardSkeleton: React.FC = () => (
  <div className="bg-white dark:bg-dark-card p-6 rounded-xl border border-gray-200 dark:border-dark-border">
    <div className="flex justify-between items-start mb-4">
      <SkeletonPulse className="w-12 h-12 rounded-xl" />
      <SkeletonPulse className="w-20 h-4" />
    </div>
    <SkeletonPulse className="w-24 h-8 mb-2" />
    <SkeletonPulse className="w-32 h-4 mb-3" />
    <SkeletonPulse className="w-full h-2 rounded-full" />
  </div>
);

const TaskListSkeleton: React.FC = () => (
  <div className="space-y-3">
    {[1, 2, 3].map(i => (
      <div key={i} className="flex items-center gap-3 p-2">
        <SkeletonPulse className="w-5 h-5 rounded" />
        <div className="flex-1">
          <SkeletonPulse className="w-3/4 h-4 mb-1" />
          <SkeletonPulse className="w-1/2 h-3" />
        </div>
      </div>
    ))}
  </div>
);

const ClientListSkeleton: React.FC = () => (
  <div className="divide-y divide-gray-100 dark:divide-dark-border">
    {[1, 2, 3, 4].map(i => (
      <div key={i} className="px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <SkeletonPulse className="w-10 h-10 rounded-full" />
          <div>
            <SkeletonPulse className="w-32 h-4 mb-1" />
            <SkeletonPulse className="w-24 h-3" />
          </div>
        </div>
        <SkeletonPulse className="w-16 h-5 rounded-full" />
      </div>
    ))}
  </div>
);

// Helper component for customizable sections
interface CustomizableSectionProps {
  id: string;
  isVisible: boolean;
  customizeMode: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  className?: string;
}

const CustomizableSection: React.FC<CustomizableSectionProps> = ({
  id,
  isVisible,
  customizeMode,
  onToggle,
  children,
  className = '',
}) => {
  if (!isVisible && !customizeMode) return null;

  return (
    <div className={`relative ${className} ${!isVisible ? 'opacity-40' : ''}`}>
      {customizeMode && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className={`absolute top-3 right-3 z-10 p-2 rounded-lg shadow-sm border transition-all ${
            isVisible
              ? 'bg-white dark:bg-dark-elevated border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-hover text-gray-500 dark:text-dark-muted hover:text-gray-700 dark:hover:text-dark-text'
              : 'bg-gold-500 border-gold-500 text-white hover:bg-gold-600'
          }`}
        >
          {isVisible ? <Eye size={16} /> : <EyeOff size={16} />}
        </button>
      )}
      {children}
    </div>
  );
};

// Widget labels for the reordering UI
const WIDGET_LABELS: Record<string, string> = {
  stats: 'Stats Cards',
  productivity: 'Productivity',
  'pipeline-clients': 'Pipeline & Clients',
  calendar: 'Calendar',
};

// Reorderable widget wrapper
interface ReorderableWidgetProps {
  widgetId: string;
  customizeMode: boolean;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  isFirst: boolean;
  isLast: boolean;
  children: React.ReactNode;
}

const ReorderableWidget: React.FC<ReorderableWidgetProps> = ({
  widgetId,
  customizeMode,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  children,
}) => {
  return (
    <div className="relative">
      {customizeMode && (
        <div className="absolute -left-12 top-1/2 -translate-y-1/2 flex flex-col gap-1 z-10">
          <button
            onClick={() => onMoveUp(widgetId)}
            disabled={isFirst}
            aria-label={`Move ${WIDGET_LABELS[widgetId]} up`}
            className={`p-1.5 rounded-lg border transition-all ${
              isFirst
                ? 'border-gray-100 dark:border-dark-border text-gray-300 dark:text-dark-subtle cursor-not-allowed'
                : 'border-gray-200 dark:border-dark-border bg-white dark:bg-dark-elevated text-gray-500 dark:text-dark-muted hover:text-gray-700 dark:hover:text-dark-text hover:bg-gray-50 dark:hover:bg-dark-hover hover:border-gray-300'
            }`}
          >
            <ArrowUp size={14} />
          </button>
          <button
            onClick={() => onMoveDown(widgetId)}
            disabled={isLast}
            aria-label={`Move ${WIDGET_LABELS[widgetId]} down`}
            className={`p-1.5 rounded-lg border transition-all ${
              isLast
                ? 'border-gray-100 dark:border-dark-border text-gray-300 dark:text-dark-subtle cursor-not-allowed'
                : 'border-gray-200 dark:border-dark-border bg-white dark:bg-dark-elevated text-gray-500 dark:text-dark-muted hover:text-gray-700 dark:hover:text-dark-text hover:bg-gray-50 dark:hover:bg-dark-hover hover:border-gray-300'
            }`}
          >
            <ArrowDown size={14} />
          </button>
        </div>
      )}
      {customizeMode && (
        <div className="absolute -left-12 top-0 text-[10px] font-medium text-gray-400 dark:text-dark-muted uppercase tracking-wide whitespace-nowrap -translate-x-full pr-2 hidden lg:block">
          {WIDGET_LABELS[widgetId]}
        </div>
      )}
      {children}
    </div>
  );
};

// Types matching ModuleViews.tsx
interface LocalClient {
  id: string;
  name: string;
  company: string;
  email: string;
  website: string;
  payment: number;
  status: 'active' | 'paused' | 'cancelled';
  template: string;
  contractType: 'monthly' | 'annual';
}

interface PipelineStage {
  id: string;
  label: string;
  color: string;
}

interface CrmContact {
  id: string;
  name: string;
  email: string;
  company: string;
  phone: string;
  value: number;
  stageId: string;
  contractType: 'monthly' | 'annual';
  notes: string;
  lastContact: string;
  createdAt: string;
}

interface Pipeline {
  id: string;
  name: string;
  stages: PipelineStage[];
  contacts: CrmContact[];
}

interface ClientTask {
  id: string;
  title: string;
  completed: boolean;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
}

interface ClientEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  type: 'meeting' | 'deadline' | 'review';
}

interface ClientPortalData {
  id: string;
  name: string;
  company: string;
  email: string;
  tasks: ClientTask[];
  events: ClientEvent[];
}

interface AggregatedTask extends ClientTask {
  clientId: string;
  clientName: string;
}

interface AggregatedEvent extends ClientEvent {
  clientId: string;
  clientName: string;
}

interface DashboardOverviewProps {
  onNavigate?: (view: ViewState) => void;
}

const DashboardOverview: React.FC<DashboardOverviewProps> = ({ onNavigate }) => {
  // Toast notifications
  const { showToast } = useToast();

  // View customization
  const { isVisible, toggleVisibility, getHiddenCount, resetView, getWidgetOrder, moveWidgetUp, moveWidgetDown, resetWidgetOrder } = useViewCustomization();
  const [customizeMode, setCustomizeMode] = useState(false);
  const hiddenCount = getHiddenCount('dashboard');
  const widgetOrder = getWidgetOrder();

  // User settings for greeting
  const [userSettings, setUserSettings] = useState<UserSettings | null>(() => {
    const saved = localStorage.getItem('tawfeeq_settings');
    return saved ? JSON.parse(saved) : null;
  });

  // Listen for settings changes
  useEffect(() => {
    const handleStorage = () => {
      const saved = localStorage.getItem('tawfeeq_settings');
      setUserSettings(saved ? JSON.parse(saved) : null);
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // State
  const [clients, setClients] = useState<LocalClient[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [clientWork, setClientWork] = useState<ClientPortalData[]>([]);
  const [calendarView, setCalendarView] = useState<'month' | 'week'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', clientId: '', dueDate: new Date().toISOString().split('T')[0], priority: 'medium' as const });
  const [newEvent, setNewEvent] = useState({ title: '', clientId: '', date: new Date().toISOString().split('T')[0], time: '09:00', type: 'meeting' as const });

  // Form validation errors
  const [taskErrors, setTaskErrors] = useState<Record<string, string>>({});
  const [eventErrors, setEventErrors] = useState<Record<string, string>>({});

  // Dashboard Goals
  const defaultGoals: DashboardGoals = {
    monthlyRevenue: 10000,
    yearlyRevenue: 120000,
    totalClients: 20,
    pipelineValue: 50000,
  };

  const [goals, setGoals] = useState<DashboardGoals>(() => {
    const saved = localStorage.getItem('tawfeeq_dashboard_goals');
    return saved ? JSON.parse(saved) : defaultGoals;
  });
  const [showEditGoals, setShowEditGoals] = useState(false);
  const [editingGoals, setEditingGoals] = useState<DashboardGoals>(goals);

  // Persist goals
  useEffect(() => {
    localStorage.setItem('tawfeeq_dashboard_goals', JSON.stringify(goals));
  }, [goals]);

  // Load data from localStorage
  useEffect(() => {
    const loadData = () => {
      const savedClients = localStorage.getItem('tawfeeq_clients');
      const parsedClients = savedClients ? JSON.parse(savedClients) : [];
      setClients(parsedClients);

      const savedPipelines = localStorage.getItem('tawfeeq_pipelines');
      if (savedPipelines) setPipelines(JSON.parse(savedPipelines));

      // Filter client work to only include existing clients (remove orphaned data)
      const savedClientWork = localStorage.getItem('tawfeeq_clientwork');
      if (savedClientWork) {
        const allClientWork = JSON.parse(savedClientWork);
        const clientIds = new Set(parsedClients.map((c: LocalClient) => c.id));
        const validClientWork = allClientWork.filter((cw: ClientPortalData) => clientIds.has(cw.id));
        setClientWork(validClientWork);
        // Clean up orphaned data in localStorage
        if (validClientWork.length !== allClientWork.length) {
          localStorage.setItem('tawfeeq_clientwork', JSON.stringify(validClientWork));
        }
      }
    };

    loadData();

    const handleStorageChange = () => loadData();
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Today's date string
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Aggregate all tasks and events
  const { allTasks, allEvents, overdueTasks, todaysTasks, todaysEvents, highPriorityTasks } = useMemo(() => {
    const tasks: AggregatedTask[] = [];
    const events: AggregatedEvent[] = [];

    clientWork.forEach(client => {
      client.tasks?.forEach(task => {
        tasks.push({ ...task, clientId: client.id, clientName: client.company || client.name });
      });
      client.events?.forEach(event => {
        events.push({ ...event, clientId: client.id, clientName: client.company || client.name });
      });
    });

    return {
      allTasks: tasks,
      allEvents: events,
      overdueTasks: tasks.filter(t => !t.completed && t.dueDate < today),
      todaysTasks: tasks.filter(t => t.dueDate === today),
      todaysEvents: events.filter(e => e.date === today).sort((a, b) => a.time.localeCompare(b.time)),
      highPriorityTasks: tasks.filter(t => t.priority === 'high' && !t.completed && t.dueDate >= today),
    };
  }, [clientWork, today]);

  // Calculate stats with goal progress
  const stats = useMemo(() => {
    const totalClients = clients.length;
    const activeClients = clients.filter(c => c.status === 'active');
    const monthlyRevenue = activeClients.reduce((sum, c) => sum + c.payment, 0);
    const yearlyRevenue = monthlyRevenue * 12;
    const pipelineValue = pipelines.reduce((total, pipeline) => {
      return total + pipeline.contacts.reduce((sum, contact) => sum + contact.value, 0);
    }, 0);
    const uniqueTemplates = new Set(clients.map(c => c.template)).size;

    // Calculate progress percentages
    const clientProgress = goals.totalClients > 0 ? Math.min((totalClients / goals.totalClients) * 100, 100) : 0;
    const revenueProgress = goals.monthlyRevenue > 0 ? Math.min((monthlyRevenue / goals.monthlyRevenue) * 100, 100) : 0;
    const pipelineProgress = goals.pipelineValue > 0 ? Math.min((pipelineValue / goals.pipelineValue) * 100, 100) : 0;

    return {
      items: [
        {
          id: 'stat-clients',
          label: "Total Clients",
          value: totalClients.toString(),
          icon: <Users size={20} className="text-gray-600 dark:text-gray-400" />,
          goal: goals.totalClients,
          progress: clientProgress,
          showProgress: true,
          viewTarget: 'clients' as ViewState,
        },
        {
          id: 'stat-templates',
          label: "Active Templates",
          value: uniqueTemplates.toString(),
          icon: <Layout size={20} className="text-gray-600 dark:text-gray-400" />,
          goal: null,
          progress: 0,
          showProgress: false,
          viewTarget: 'templates' as ViewState,
        },
        {
          id: 'stat-pipeline',
          label: "Pipeline Value",
          value: `£${pipelineValue.toLocaleString()}`,
          icon: <TrendingUp size={20} className="text-gray-600 dark:text-gray-400" />,
          goal: goals.pipelineValue,
          progress: pipelineProgress,
          showProgress: true,
          viewTarget: 'crm' as ViewState,
        },
        {
          id: 'stat-revenue',
          label: "Monthly Revenue",
          value: `£${monthlyRevenue.toLocaleString()}`,
          icon: <DollarSign size={20} className="text-gray-600 dark:text-gray-400" />,
          goal: goals.monthlyRevenue,
          progress: revenueProgress,
          showProgress: true,
          viewTarget: 'analytics' as ViewState,
        },
      ],
      raw: {
        totalClients,
        monthlyRevenue,
        yearlyRevenue,
        pipelineValue,
      },
    };
  }, [clients, pipelines, goals]);

  // Handle save goals
  const handleSaveGoals = () => {
    setGoals(editingGoals);
    setShowEditGoals(false);
    showToast('success', 'Goals updated successfully');
  };

  // Open edit goals modal
  const openEditGoals = () => {
    setEditingGoals(goals);
    setShowEditGoals(true);
  };

  // Recent clients
  const recentClients = useMemo(() => {
    return clients.slice().reverse().slice(0, 5).map(client => ({
      id: client.id,
      name: client.name, // Contact/person name
      company: client.company, // Company name
      template: client.template,
      status: client.status,
      amount: `£${client.payment}/mo`
    }));
  }, [clients]);

  // Pipeline preview
  const pipelinePreview = useMemo(() => {
    if (pipelines.length === 0) return [];
    const mainPipeline = pipelines[0];
    if (!mainPipeline?.stages) return [];
    const maxCount = Math.max(...mainPipeline.stages.map(stage =>
      mainPipeline.contacts.filter(c => c.stageId === stage.id).length
    ), 1);
    const colorMap: Record<string, string> = {
      'border-t-gray-400': 'bg-gray-400', 'border-t-blue-400': 'bg-blue-400',
      'border-t-gold-400': 'bg-gold-400', 'border-t-purple-400': 'bg-purple-400',
      'border-t-green-400': 'bg-green-400', 'border-t-red-400': 'bg-red-400',
    };
    return mainPipeline.stages.map(stage => ({
      stage: stage.label,
      count: mainPipeline.contacts.filter(c => c.stageId === stage.id).length,
      color: colorMap[stage.color] || 'bg-gray-400',
      maxCount
    }));
  }, [pipelines]);

  // Calendar helpers
  const getMonthDays = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: (Date | null)[] = [];

    // Add empty days for start of week
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }

    // Add month days
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d));
    }

    return days;
  };

  const getWeekDays = (date: Date) => {
    const days: Date[] = [];
    const dayOfWeek = date.getDay();
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - dayOfWeek);

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }

    return days;
  };

  const formatDateStr = (date: Date) => date.toISOString().split('T')[0];

  const getDayData = (dateStr: string) => {
    const tasks = allTasks.filter(t => t.dueDate === dateStr);
    const events = allEvents.filter(e => e.date === dateStr);
    const hasOverdue = tasks.some(t => !t.completed && dateStr < today);
    return { tasks, events, hasOverdue };
  };

  const navigateCalendar = (direction: number) => {
    const newDate = new Date(currentDate);
    if (calendarView === 'month') {
      newDate.setMonth(newDate.getMonth() + direction);
    } else {
      newDate.setDate(newDate.getDate() + (direction * 7));
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDay(today);
  };

  // Toggle task completion
  const toggleTaskComplete = (taskId: string, clientId: string) => {
    const updatedClientWork = clientWork.map(client => {
      if (client.id === clientId) {
        return {
          ...client,
          tasks: client.tasks.map(task =>
            task.id === taskId ? { ...task, completed: !task.completed } : task
          )
        };
      }
      return client;
    });
    setClientWork(updatedClientWork);
    localStorage.setItem('tawfeeq_clientwork', JSON.stringify(updatedClientWork));
  };

  // Validate task form
  const validateTaskForm = () => {
    const errors: Record<string, string> = {};
    if (!newTask.title.trim()) errors.title = 'Task title is required';
    if (!newTask.clientId) errors.clientId = 'Please select a client';
    if (!newTask.dueDate) errors.dueDate = 'Due date is required';
    setTaskErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Add new task
  const handleAddTask = () => {
    if (!validateTaskForm()) return;

    const task: ClientTask = {
      id: Date.now().toString(),
      title: newTask.title,
      completed: false,
      dueDate: newTask.dueDate,
      priority: newTask.priority,
    };

    const updatedClientWork = clientWork.map(client => {
      if (client.id === newTask.clientId) {
        return { ...client, tasks: [...(client.tasks || []), task] };
      }
      return client;
    });

    // If client doesn't exist in clientWork, add them
    if (!clientWork.find(c => c.id === newTask.clientId)) {
      const clientInfo = clients.find(c => c.id === newTask.clientId);
      if (clientInfo) {
        updatedClientWork.push({
          id: clientInfo.id,
          name: clientInfo.name,
          company: clientInfo.company,
          email: clientInfo.email,
          tasks: [task],
          events: [],
        });
      }
    }

    setClientWork(updatedClientWork);
    localStorage.setItem('tawfeeq_clientwork', JSON.stringify(updatedClientWork));
    setNewTask({ title: '', clientId: '', dueDate: new Date().toISOString().split('T')[0], priority: 'medium' });
    setTaskErrors({});
    setShowAddTask(false);
    showToast('success', 'Task added successfully');
  };

  // Validate event form
  const validateEventForm = () => {
    const errors: Record<string, string> = {};
    if (!newEvent.title.trim()) errors.title = 'Event title is required';
    if (!newEvent.clientId) errors.clientId = 'Please select a client';
    if (!newEvent.date) errors.date = 'Date is required';
    setEventErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Add new event
  const handleAddEvent = () => {
    if (!validateEventForm()) return;

    const event: ClientEvent = {
      id: Date.now().toString(),
      title: newEvent.title,
      date: newEvent.date,
      time: newEvent.time,
      type: newEvent.type,
    };

    const updatedClientWork = clientWork.map(client => {
      if (client.id === newEvent.clientId) {
        return { ...client, events: [...(client.events || []), event] };
      }
      return client;
    });

    // If client doesn't exist in clientWork, add them
    if (!clientWork.find(c => c.id === newEvent.clientId)) {
      const clientInfo = clients.find(c => c.id === newEvent.clientId);
      if (clientInfo) {
        updatedClientWork.push({
          id: clientInfo.id,
          name: clientInfo.name,
          company: clientInfo.company,
          email: clientInfo.email,
          tasks: [],
          events: [event],
        });
      }
    }

    setClientWork(updatedClientWork);
    localStorage.setItem('tawfeeq_clientwork', JSON.stringify(updatedClientWork));
    setNewEvent({ title: '', clientId: '', date: new Date().toISOString().split('T')[0], time: '09:00', type: 'meeting' });
    setEventErrors({});
    setShowAddEvent(false);
    showToast('success', 'Event added successfully');
  };

  // Format helpers
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  const getDaysOverdue = (dateStr: string) => {
    const due = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    let greeting = '';
    if (hour < 12) greeting = 'Good Morning';
    else if (hour < 17) greeting = 'Good Afternoon';
    else greeting = 'Good Evening';

    // Add user name if available
    const name = userSettings?.display?.greetingName || userSettings?.profile?.name;
    if (name) {
      const firstName = name.split(' ')[0];
      return `${greeting}, ${firstName}!`;
    }
    return `${greeting}!`;
  };

  return (
    <div className="space-y-8">
      {/* Header with Greeting and Quick Actions */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-dark-text">{getGreeting()}</h2>
          <p className="text-gray-500 dark:text-dark-muted mt-1">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-3">
          {/* Customize Button */}
          <button
            onClick={() => setCustomizeMode(!customizeMode)}
            className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl transition-all duration-150 text-sm font-medium ${
              customizeMode
                ? 'border-gray-400 dark:border-gray-600 bg-gray-100 dark:bg-dark-elevated text-gray-700 dark:text-gray-300'
                : 'border-gray-200 dark:border-dark-border bg-white dark:bg-dark-elevated text-gray-600 dark:text-dark-muted hover:bg-gray-50 dark:hover:bg-dark-hover'
            }`}
          >
            {customizeMode ? <Check size={16} /> : <SlidersHorizontal size={16} />}
            {customizeMode ? 'Done' : 'Customize'}
            {!customizeMode && hiddenCount > 0 && (
              <span className="bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 text-xs px-1.5 py-0.5 rounded-full">{hiddenCount}</span>
            )}
          </button>
          {customizeMode && (
            <button
              onClick={() => {
                resetView('dashboard');
                resetWidgetOrder();
              }}
              className="flex items-center gap-2 px-3 py-2.5 border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-elevated rounded-xl hover:bg-gray-50 dark:hover:bg-dark-hover text-sm font-medium text-gray-600 dark:text-dark-muted transition-all duration-150"
            >
              <RotateCcw size={14} />
              Reset All
            </button>
          )}
          <button
            onClick={openEditGoals}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-elevated rounded-xl hover:bg-gray-50 dark:hover:bg-dark-hover hover:border-gray-300 dark:hover:border-dark-border active:scale-[0.98] active:bg-gray-100 dark:active:bg-dark-card transition-all duration-150 text-sm font-medium text-gray-600 dark:text-dark-muted"
          >
            <Target size={16} />
            Goals
          </button>
          <button
            onClick={() => setShowAddTask(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gold-500 text-white rounded-xl hover:bg-gold-600 active:scale-[0.98] active:bg-gold-700 transition-all duration-150 text-sm font-semibold shadow-sm hover:shadow-md hover:shadow-gold-200/50 dark:hover:shadow-gold-900/20"
          >
            <Plus size={16} strokeWidth={2.5} />
            Add Task
          </button>
          <button
            onClick={() => setShowAddEvent(true)}
            className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-elevated rounded-xl hover:bg-gray-50 dark:hover:bg-dark-hover hover:border-gray-300 dark:hover:border-dark-border active:scale-[0.98] active:bg-gray-100 dark:active:bg-dark-card transition-all duration-150 text-sm font-semibold text-gray-700 dark:text-dark-text shadow-sm hover:shadow-md"
          >
            <CalendarIcon size={16} />
            Add Event
          </button>
        </div>
      </div>

      {/* Widget Order Panel - shown in customize mode */}
      {customizeMode && (
        <div className="bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <GripVertical size={16} className="text-gray-400 dark:text-dark-muted" />
              <h3 className="text-sm font-semibold text-gray-700 dark:text-dark-text">Widget Order</h3>
            </div>
            <p className="text-xs text-gray-400 dark:text-dark-muted">Use arrows to reorder sections</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {widgetOrder.map((widgetId, index) => (
              <div
                key={widgetId}
                className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-dark-elevated rounded-lg border border-gray-200 dark:border-dark-border"
              >
                <span className="text-xs font-medium text-gray-500 dark:text-dark-muted w-4">{index + 1}.</span>
                <span className="text-sm font-medium text-gray-700 dark:text-dark-text">{WIDGET_LABELS[widgetId]}</span>
                <div className="flex gap-1 ml-2">
                  <button
                    onClick={() => moveWidgetUp(widgetId)}
                    disabled={index === 0}
                    aria-label={`Move ${WIDGET_LABELS[widgetId]} up`}
                    className={`p-1 rounded transition-all ${
                      index === 0
                        ? 'text-gray-300 dark:text-dark-subtle cursor-not-allowed'
                        : 'text-gray-500 dark:text-dark-muted hover:text-gray-700 dark:hover:text-dark-text hover:bg-gray-200 dark:hover:bg-dark-hover'
                    }`}
                  >
                    <ArrowUp size={12} />
                  </button>
                  <button
                    onClick={() => moveWidgetDown(widgetId)}
                    disabled={index === widgetOrder.length - 1}
                    aria-label={`Move ${WIDGET_LABELS[widgetId]} down`}
                    className={`p-1 rounded transition-all ${
                      index === widgetOrder.length - 1
                        ? 'text-gray-300 dark:text-dark-subtle cursor-not-allowed'
                        : 'text-gray-500 dark:text-dark-muted hover:text-gray-700 dark:hover:text-dark-text hover:bg-gray-200 dark:hover:bg-dark-hover'
                    }`}
                  >
                    <ArrowDown size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.items.map((stat, idx) => {
          const statVisible = isVisible('dashboard', stat.id);
          if (!statVisible && !customizeMode) return null;

          return (
            <div
              key={stat.id}
              onClick={() => !customizeMode && onNavigate && stat.viewTarget && onNavigate(stat.viewTarget)}
              className={`relative group bg-white dark:bg-dark-card p-6 rounded-xl border border-gray-200 dark:border-dark-border hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-lg hover:shadow-gray-100/50 dark:hover:shadow-lg dark:hover:shadow-black/20 transition-all duration-300 ${
                !customizeMode && onNavigate ? 'cursor-pointer' : 'cursor-default'
              } ${!statVisible ? 'opacity-40' : ''}`}
            >
              {/* Customize Mode Overlay */}
              {customizeMode && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleVisibility('dashboard', stat.id);
                  }}
                  className={`absolute top-3 right-3 z-10 p-2 rounded-lg shadow-sm border transition-all ${
                    statVisible
                      ? 'bg-white dark:bg-dark-elevated border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-hover text-gray-500 dark:text-dark-muted hover:text-gray-700 dark:hover:text-dark-text'
                      : 'bg-gray-800 dark:bg-gray-200 border-gray-800 dark:border-gray-200 text-white dark:text-gray-800 hover:bg-gray-700 dark:hover:bg-gray-300'
                  }`}
                >
                  {statVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
              )}

              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-gray-100 dark:bg-dark-elevated rounded-xl border border-gray-200 dark:border-dark-border group-hover:bg-gray-200 dark:group-hover:bg-dark-hover group-hover:scale-110 transition-all duration-300">
                  {stat.icon}
                </div>
                {stat.showProgress && stat.goal && (
                  <span className="text-xs font-medium text-gray-400 dark:text-dark-muted">
                    Goal: {stat.label.includes('Revenue') || stat.label.includes('Pipeline') ? `£${stat.goal.toLocaleString()}` : stat.goal}
                  </span>
                )}
              </div>
              <h3 className="text-3xl font-bold text-gray-800 dark:text-dark-text mb-1 tracking-tight">{stat.value}</h3>
              <p className="text-sm text-gray-500 dark:text-dark-muted font-medium mb-3">{stat.label}</p>
              {stat.showProgress && stat.goal && (
                <div className="space-y-1.5">
                  <div className="h-2 bg-gray-100 dark:bg-dark-elevated rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        stat.progress >= 100 ? 'bg-green-600 dark:bg-green-500' : stat.progress >= 75 ? 'bg-green-500 dark:bg-green-400' : stat.progress >= 40 ? 'bg-amber-500 dark:bg-amber-400' : 'bg-red-500 dark:bg-red-400'
                      }`}
                      style={{ width: `${Math.min(stat.progress, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={`text-xs font-semibold ${
                      stat.progress >= 100 ? 'text-green-700 dark:text-green-400' : stat.progress >= 75 ? 'text-green-600 dark:text-green-400' : stat.progress >= 40 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {Math.round(stat.progress)}% of goal
                    </span>
                    {stat.progress >= 100 && (
                      <span className="text-xs font-medium text-gray-800 dark:text-gray-200 flex items-center gap-1">
                        <CheckSquare size={12} /> Achieved
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Productivity Sections - 3 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Overdue Tasks */}
        <div className="bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border p-6 hover:shadow-lg hover:shadow-gray-100/50 dark:hover:shadow-lg dark:hover:shadow-black/20 hover:border-gray-300 dark:hover:border-dark-border transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-red-400 dark:text-red-400" />
              <h3 className="font-semibold text-gray-700 dark:text-gray-300">Overdue ({overdueTasks.length})</h3>
            </div>
            {onNavigate && (
              <button
                onClick={() => onNavigate('tasks')}
                className="text-xs text-gray-400 dark:text-dark-muted hover:text-gray-600 dark:hover:text-gray-400 flex items-center gap-1"
              >
                View All <ArrowRight size={12} />
              </button>
            )}
          </div>
          {overdueTasks.length > 0 ? (
            <div className="space-y-3">
              {overdueTasks.slice(0, 4).map(task => (
                <div key={task.id} className="p-3 bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-lg">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => toggleTaskComplete(task.id, task.clientId)}
                      aria-label={`Mark "${task.title}" as complete`}
                      className="mt-0.5 text-gray-400 hover:text-green-500 dark:hover:text-green-400"
                    >
                      <Square size={18} />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 dark:text-dark-text truncate">{task.title}</p>
                      <p className="text-xs text-red-400 dark:text-red-400 mt-1">
                        {task.clientName} • {getDaysOverdue(task.dueDate)}d overdue
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-full mb-3">
                <CheckSquare size={24} className="text-green-500 dark:text-green-400" />
              </div>
              <p className="text-sm font-medium text-gray-600 dark:text-dark-text">All caught up!</p>
              <p className="text-xs text-gray-400 dark:text-dark-muted mt-1">No overdue tasks</p>
              {onNavigate && (
                <button
                  onClick={() => onNavigate('tasks')}
                  className="mt-3 text-xs text-gold-600 dark:text-gold-400 hover:text-gold-700 dark:hover:text-gold-300 font-medium flex items-center gap-1"
                >
                  <Plus size={14} />
                  Create a task
                </button>
              )}
            </div>
          )}
        </div>

        {/* Today's Agenda */}
        <div className="bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border p-6 hover:shadow-lg hover:shadow-gray-100/50 dark:hover:shadow-lg dark:hover:shadow-black/20 hover:border-gray-300 dark:hover:border-dark-border transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CalendarIcon size={18} className="text-gray-600 dark:text-gray-400" />
              <h3 className="font-semibold text-gray-800 dark:text-dark-text">Today's Agenda</h3>
            </div>
            {onNavigate && (
              <button
                onClick={() => onNavigate('calendar')}
                className="text-xs text-gray-400 dark:text-dark-muted hover:text-gray-600 dark:hover:text-gray-400 flex items-center gap-1"
              >
                View All <ArrowRight size={12} />
              </button>
            )}
          </div>

          {/* Today's Tasks */}
          {todaysTasks.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-medium text-gray-400 dark:text-dark-subtle uppercase tracking-wider mb-2">Tasks</p>
              <div className="space-y-2">
                {todaysTasks.slice(0, 3).map(task => (
                  <div key={task.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-elevated">
                    <button
                      onClick={() => toggleTaskComplete(task.id, task.clientId)}
                      aria-label={task.completed ? `Mark "${task.title}" as incomplete` : `Mark "${task.title}" as complete`}
                      className={task.completed ? 'text-green-500 dark:text-green-400' : 'text-gray-300 dark:text-dark-subtle hover:text-green-500 dark:hover:text-green-400'}
                    >
                      {task.completed ? <CheckSquare size={18} /> : <Square size={18} />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${task.completed ? 'line-through text-gray-400 dark:text-dark-subtle' : 'text-gray-700 dark:text-dark-text'}`}>
                        {task.title}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-dark-muted">{task.clientName}</p>
                    </div>
                    {task.priority === 'high' && (
                      <Star size={14} className="text-amber-500 fill-amber-500" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Today's Events */}
          {todaysEvents.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-400 dark:text-dark-subtle uppercase tracking-wider mb-2">Events</p>
              <div className="space-y-2">
                {todaysEvents.slice(0, 3).map(event => (
                  <div key={event.id} className={`p-3 rounded-lg border-l-4 ${
                    event.type === 'meeting' ? 'bg-gray-100 dark:bg-dark-elevated border-gray-800' :
                    event.type === 'deadline' ? 'bg-gray-50 dark:bg-dark-elevated border-gray-600' :
                    'bg-gray-50 dark:bg-dark-elevated border-gray-400'
                  }`}>
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-gray-400 dark:text-dark-muted" />
                      <span className="text-sm font-medium text-gray-600 dark:text-dark-text">{event.time}</span>
                      {event.type === 'meeting' && <Video size={14} className="text-gray-600 dark:text-gray-400" />}
                    </div>
                    <p className="font-medium text-gray-800 dark:text-dark-text mt-1 truncate">{event.title}</p>
                    <p className="text-xs text-gray-500 dark:text-dark-muted">{event.clientName}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {todaysTasks.length === 0 && todaysEvents.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="p-3 bg-gray-50 dark:bg-dark-elevated rounded-full mb-3">
                <CalendarIcon size={24} className="text-gray-400 dark:text-dark-muted" />
              </div>
              <p className="text-sm font-medium text-gray-600 dark:text-dark-text">Free day!</p>
              <p className="text-xs text-gray-400 dark:text-dark-muted mt-1">Nothing scheduled for today</p>
              {onNavigate && (
                <button
                  onClick={() => onNavigate('calendar')}
                  className="mt-3 text-xs text-gold-600 dark:text-gold-400 hover:text-gold-700 dark:hover:text-gold-300 font-medium flex items-center gap-1"
                >
                  <Plus size={14} />
                  Schedule something
                </button>
              )}
            </div>
          )}
        </div>

        {/* High Priority */}
        <div className="bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border p-6 hover:shadow-lg hover:shadow-gray-100/50 dark:hover:shadow-lg dark:hover:shadow-black/20 hover:border-gray-300 dark:hover:border-dark-border transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Star size={18} className="text-amber-500 fill-amber-500" />
              <h3 className="font-semibold text-gray-800 dark:text-dark-text">High Priority ({highPriorityTasks.length})</h3>
            </div>
            {onNavigate && (
              <button
                onClick={() => onNavigate('tasks')}
                className="text-xs text-gray-400 dark:text-dark-muted hover:text-gray-600 dark:hover:text-gray-400 flex items-center gap-1"
              >
                View All <ArrowRight size={12} />
              </button>
            )}
          </div>
          {highPriorityTasks.length > 0 ? (
            <div className="space-y-2">
              {highPriorityTasks.slice(0, 4).map(task => (
                <div key={task.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-elevated">
                  <button
                    onClick={() => toggleTaskComplete(task.id, task.clientId)}
                    aria-label={task.completed ? `Mark "${task.title}" as incomplete` : `Mark "${task.title}" as complete`}
                    className={task.completed ? 'text-green-500 dark:text-green-400' : 'text-gray-300 dark:text-dark-subtle hover:text-green-500 dark:hover:text-green-400'}
                  >
                    {task.completed ? <CheckSquare size={18} /> : <Square size={18} />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 dark:text-dark-text truncate">{task.title}</p>
                    <p className="text-xs text-gray-400 dark:text-dark-muted">{task.clientName} • {formatDate(task.dueDate)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-full mb-3">
                <Star size={24} className="text-green-500 dark:text-green-400" />
              </div>
              <p className="text-sm font-medium text-gray-600 dark:text-dark-text">No urgent tasks</p>
              <p className="text-xs text-gray-400 dark:text-dark-muted mt-1">No high priority items pending</p>
            </div>
          )}
        </div>
      </div>

      {/* Pipeline and Recent Clients */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border p-8 hover:shadow-lg hover:shadow-gray-100/50 dark:hover:shadow-lg dark:hover:shadow-black/20 hover:border-gray-300 dark:hover:border-dark-border transition-all duration-300">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-semibold text-gray-800 dark:text-dark-text">Pipeline Overview</h3>
            {onNavigate && (
              <button
                onClick={() => onNavigate('crm')}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1 font-medium"
              >
                Go to CRM <ArrowRight size={14} />
              </button>
            )}
          </div>
          {pipelinePreview.length > 0 ? (
            <div className="space-y-4">
              {pipelinePreview.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => onNavigate && onNavigate('crm')}
                  className="flex items-center gap-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-elevated -mx-2 px-2 py-1 rounded-lg transition-colors"
                >
                  <span className="text-sm text-gray-600 dark:text-dark-muted w-24">{item.stage}</span>
                  <div className="flex-1 bg-gray-100 dark:bg-dark-elevated rounded-full h-3">
                    <div
                      className={`h-3 rounded-full ${item.color}`}
                      style={{ width: `${(item.count / item.maxCount) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-dark-text w-8">{item.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="p-3 bg-gray-50 dark:bg-dark-elevated rounded-full mb-3">
                <Inbox size={24} className="text-gray-400 dark:text-dark-muted" />
              </div>
              <p className="text-sm font-medium text-gray-600 dark:text-dark-text">No pipeline data</p>
              <p className="text-xs text-gray-400 dark:text-dark-muted mt-1">Add contacts to your CRM to see progress</p>
              {onNavigate && (
                <button
                  onClick={() => onNavigate('crm')}
                  className="mt-3 text-xs text-gold-600 dark:text-gold-400 hover:text-gold-700 dark:hover:text-gold-300 font-medium flex items-center gap-1"
                >
                  Go to CRM <ArrowRight size={14} />
                </button>
              )}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border overflow-hidden hover:shadow-lg hover:shadow-gray-100/50 dark:hover:shadow-lg dark:hover:shadow-black/20 hover:border-gray-300 dark:hover:border-dark-border transition-all duration-300">
          <div className="px-8 py-5 border-b border-gray-100 dark:border-dark-border flex justify-between items-center">
            <h3 className="font-semibold text-gray-800 dark:text-dark-text">Recent Clients</h3>
            {onNavigate && (
              <button
                onClick={() => onNavigate('clients')}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1 font-medium"
              >
                View All <ArrowRight size={14} />
              </button>
            )}
          </div>
          {recentClients.length > 0 ? (
            <div className="divide-y divide-gray-100 dark:divide-dark-border">
              {recentClients.slice(0, 4).map((client) => (
                <div
                  key={client.id}
                  onClick={() => onNavigate && onNavigate('clients')}
                  className="px-8 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-dark-elevated transition-colors cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gray-100 dark:bg-dark-elevated border border-gray-200 dark:border-dark-border rounded-full flex items-center justify-center">
                      <span className="text-gray-700 dark:text-gray-400 font-medium text-sm">{client.name.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-800 dark:text-dark-text">{client.name}</p>
                      <p className="text-sm text-gray-400 dark:text-dark-muted">{client.company || client.template}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      client.status === 'active' ? 'bg-gray-100 dark:bg-dark-elevated text-gray-700 dark:text-gray-300 border border-gray-800 dark:border-gray-300' :
                      client.status === 'paused' ? 'bg-gray-50 dark:bg-dark-elevated text-gray-600 dark:text-gray-400 border border-gray-400 dark:border-gray-500' :
                      'bg-gray-50 dark:bg-dark-elevated text-gray-500 dark:text-gray-500 border border-gray-300 dark:border-gray-600'
                    }`}>
                      {client.status}
                    </span>
                    <span className="text-sm font-medium text-gray-700 dark:text-dark-text">{client.amount}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="p-3 bg-gray-100 dark:bg-dark-elevated rounded-full mb-3">
                <Users size={24} className="text-gray-500 dark:text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-600 dark:text-dark-text">No clients yet</p>
              <p className="text-xs text-gray-400 dark:text-dark-muted mt-1">Add your first client to get started</p>
            </div>
          )}
        </div>
      </div>

      {/* Calendar - Full Width at Bottom */}
      <div className="bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border p-6 hover:shadow-lg hover:shadow-gray-100/50 dark:hover:shadow-lg dark:hover:shadow-black/20 transition-all duration-300">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button onClick={() => navigateCalendar(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-dark-elevated rounded-lg transition-colors">
                <ChevronLeft size={20} className="text-gray-600 dark:text-dark-muted" />
              </button>
              <h3 className="font-semibold text-gray-800 dark:text-dark-text min-w-[180px] text-center">
                {calendarView === 'month'
                  ? currentDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
                  : `Week of ${getWeekDays(currentDate)[0].toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
                }
              </h3>
              <button onClick={() => navigateCalendar(1)} className="p-2 hover:bg-gray-100 dark:hover:bg-dark-elevated rounded-lg transition-colors">
                <ChevronRight size={20} className="text-gray-600 dark:text-dark-muted" />
              </button>
              <button
                onClick={goToToday}
                className="ml-2 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-elevated transition-colors"
              >
                Today
              </button>
            </div>
            <div className="flex gap-1 bg-gray-100 dark:bg-dark-elevated p-1 rounded-lg">
              <button
                onClick={() => setCalendarView('month')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  calendarView === 'month' ? 'bg-white dark:bg-dark-card text-gray-800 dark:text-dark-text shadow-sm' : 'text-gray-500 dark:text-dark-muted hover:text-gray-700 dark:hover:text-dark-text'
                }`}
              >
                Month
              </button>
              <button
                onClick={() => setCalendarView('week')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  calendarView === 'week' ? 'bg-white dark:bg-dark-card text-gray-800 dark:text-dark-text shadow-sm' : 'text-gray-500 dark:text-dark-muted hover:text-gray-700 dark:hover:text-dark-text'
                }`}
              >
                Week
              </button>
            </div>
          </div>

          {/* Month View */}
          {calendarView === 'month' && (
            <div>
              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center text-xs font-medium text-gray-400 dark:text-dark-muted py-2">
                    {day}
                  </div>
                ))}
              </div>
              {/* Day cells */}
              <div className="grid grid-cols-7 gap-1">
                {getMonthDays(currentDate).map((date, idx) => {
                  if (!date) {
                    return <div key={idx} className="h-20" />;
                  }
                  const dateStr = formatDateStr(date);
                  const { tasks, events, hasOverdue } = getDayData(dateStr);
                  const isToday = dateStr === today;
                  const isSelected = dateStr === selectedDay;

                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedDay(selectedDay === dateStr ? null : dateStr)}
                      className={`h-20 p-2 border rounded-lg cursor-pointer transition-all ${
                        isToday ? 'border-gray-800 dark:border-gray-300 bg-gray-100 dark:bg-dark-elevated' :
                        isSelected ? 'border-gray-400 dark:border-gray-500 bg-gray-50 dark:bg-dark-elevated' :
                        'border-gray-100 dark:border-dark-border hover:border-gray-200 dark:hover:border-dark-hover hover:bg-gray-50 dark:hover:bg-dark-elevated'
                      }`}
                    >
                      <span className={`text-sm ${isToday ? 'font-bold text-gray-800 dark:text-gray-200' : 'text-gray-700 dark:text-dark-text'}`}>
                        {date.getDate()}
                      </span>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {hasOverdue && <span className="w-2 h-2 rounded-full bg-red-400" />}
                        {tasks.filter(t => !t.completed && t.dueDate >= today).length > 0 && (
                          <span className="w-2 h-2 rounded-full bg-blue-400" />
                        )}
                        {events.length > 0 && <span className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500" />}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Selected Day Details */}
              {selectedDay && (
                <div className="mt-4 p-4 bg-gray-50 dark:bg-dark-elevated rounded-lg border border-gray-200 dark:border-dark-border">
                  <h4 className="font-medium text-gray-800 dark:text-dark-text mb-3">
                    {new Date(selectedDay).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </h4>
                  {(() => {
                    const { tasks, events } = getDayData(selectedDay);
                    if (tasks.length === 0 && events.length === 0) {
                      return <p className="text-sm text-gray-400 dark:text-dark-muted">No items scheduled</p>;
                    }
                    return (
                      <div className="space-y-2">
                        {tasks.map(task => (
                          <div key={task.id} className="flex items-center gap-2 text-sm">
                            <span className={`w-2 h-2 rounded-full ${task.completed ? 'bg-green-400' : task.dueDate < today ? 'bg-red-400' : 'bg-blue-400'}`} />
                            <span className={task.completed ? 'line-through text-gray-400 dark:text-dark-subtle' : 'text-gray-700 dark:text-dark-text'}>{task.title}</span>
                            <span className="text-gray-400 dark:text-dark-muted">({task.clientName})</span>
                          </div>
                        ))}
                        {events.map(event => (
                          <div key={event.id} className="flex items-center gap-2 text-sm text-gray-700 dark:text-dark-text">
                            <span className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500" />
                            <span>{event.time}</span>
                            <span>{event.title}</span>
                            <span className="text-gray-400 dark:text-dark-muted">({event.clientName})</span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* Week View */}
          {calendarView === 'week' && (
            <div>
              {/* Day columns */}
              <div className="grid grid-cols-7 gap-2">
                {getWeekDays(currentDate).map((date, idx) => {
                  const dateStr = formatDateStr(date);
                  const { tasks, events } = getDayData(dateStr);
                  const isToday = dateStr === today;

                  return (
                    <div key={idx} className={`min-h-[300px] border rounded-lg ${isToday ? 'border-gray-800 dark:border-gray-300 bg-gray-50 dark:bg-dark-elevated' : 'border-gray-200 dark:border-dark-border'}`}>
                      <div className={`text-center py-2 border-b ${isToday ? 'border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-dark-elevated' : 'border-gray-100 dark:border-dark-border bg-gray-50 dark:bg-dark-elevated'}`}>
                        <p className="text-xs text-gray-500 dark:text-dark-muted">{date.toLocaleDateString('en-GB', { weekday: 'short' })}</p>
                        <p className={`text-lg font-semibold ${isToday ? 'text-gray-800 dark:text-gray-200' : 'text-gray-700 dark:text-dark-text'}`}>{date.getDate()}</p>
                      </div>
                      <div className="p-2 space-y-1">
                        {/* Events with time */}
                        {events.sort((a, b) => a.time.localeCompare(b.time)).map(event => (
                          <div key={event.id} className={`p-1.5 rounded text-xs ${
                            event.type === 'meeting' ? 'bg-gray-100 dark:bg-dark-elevated border-l-2 border-gray-800 dark:border-gray-300' :
                            event.type === 'deadline' ? 'bg-gray-100 dark:bg-dark-elevated border-l-2 border-gray-600' :
                            'bg-gray-50 dark:bg-dark-elevated border-l-2 border-gray-400'
                          }`}>
                            <p className="font-medium text-gray-500 dark:text-dark-muted">{event.time}</p>
                            <p className="text-gray-700 dark:text-dark-text truncate">{event.title}</p>
                          </div>
                        ))}
                        {/* Tasks */}
                        {tasks.map(task => (
                          <div key={task.id} className={`p-1.5 rounded text-xs flex items-center gap-1 ${
                            task.completed ? 'bg-green-50/50 dark:bg-green-900/10' :
                            task.dueDate < today ? 'bg-red-50/50 dark:bg-red-900/10 border-l-2 border-red-400' :
                            task.priority === 'high' ? 'bg-amber-50/50 dark:bg-amber-900/10 border-l-2 border-amber-400' : 'bg-gray-50 dark:bg-dark-elevated'
                          }`}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleTaskComplete(task.id, task.clientId);
                              }}
                              aria-label={task.completed ? `Mark "${task.title}" as incomplete` : `Mark "${task.title}" as complete`}
                              className={task.completed ? 'text-green-500 dark:text-green-400' : 'text-gray-300 dark:text-dark-subtle hover:text-green-500'}
                            >
                              {task.completed ? <CheckSquare size={12} /> : <Square size={12} />}
                            </button>
                            <span className={`truncate ${task.completed ? 'line-through text-gray-400 dark:text-dark-subtle' : 'text-gray-700 dark:text-dark-text'}`}>
                              {task.title}
                            </span>
                          </div>
                        ))}
                        {tasks.length === 0 && events.length === 0 && (
                          <p className="text-xs text-gray-300 dark:text-dark-subtle text-center py-4">No items</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
      </div>

      {/* Add Task Side Panel */}
      {showAddTask && (
        <>
          <div className="fixed inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-sm z-50 animate-in fade-in duration-200" onClick={() => { setShowAddTask(false); setTaskErrors({}); }}>
            <div
              className="absolute top-0 right-0 bottom-0 w-full max-w-2xl bg-white dark:bg-dark-card shadow-2xl flex flex-col"
              style={{ animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-elevated">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-dark-text">New Task</h2>
                <button
                  onClick={() => { setShowAddTask(false); setTaskErrors({}); }}
                  className="p-2 text-gray-400 dark:text-dark-muted hover:text-gray-600 dark:hover:text-dark-text hover:bg-gray-100 dark:hover:bg-dark-hover rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto">
                {/* Title Section */}
                <div className="px-6 py-6 border-b border-gray-100 dark:border-dark-border">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-100 dark:bg-dark-elevated rounded-xl flex items-center justify-center">
                      <CheckSquare size={24} className="text-gray-600 dark:text-gray-400" />
                    </div>
                    <div className="flex-1">
                      <input
                        type="text"
                        value={newTask.title}
                        onChange={(e) => { setNewTask({ ...newTask, title: e.target.value }); setTaskErrors({ ...taskErrors, title: '' }); }}
                        className="w-full text-xl font-semibold border-none focus:outline-none focus:ring-0 placeholder-gray-300 dark:placeholder-dark-subtle text-gray-800 dark:text-dark-text bg-transparent"
                        placeholder="Task title..."
                        autoFocus
                      />
                      {taskErrors.title && <p className="text-xs text-red-500 mt-1">{taskErrors.title}</p>}
                    </div>
                  </div>
                </div>

                {/* Task Details Section */}
                <div className="px-6 py-5 border-b border-gray-100 dark:border-dark-border">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-dark-text mb-4">
                    <Briefcase size={16} />
                    Task Details
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-dark-muted uppercase tracking-wider mb-2">
                        Client <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={newTask.clientId}
                        onChange={(e) => { setNewTask({ ...newTask, clientId: e.target.value }); setTaskErrors({ ...taskErrors, clientId: '' }); }}
                        className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 bg-white dark:bg-dark-elevated dark:text-dark-text transition-colors ${taskErrors.clientId ? 'border-red-300 bg-red-50 dark:bg-red-900/20' : 'border-gray-200 dark:border-dark-border'}`}
                      >
                        <option value="">Select client</option>
                        {clients.map(client => (
                          <option key={client.id} value={client.id}>{client.company || client.name}</option>
                        ))}
                      </select>
                      {taskErrors.clientId && <p className="text-xs text-red-500 mt-1">{taskErrors.clientId}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-dark-muted uppercase tracking-wider mb-2">
                        Due Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={newTask.dueDate}
                        onChange={(e) => { setNewTask({ ...newTask, dueDate: e.target.value }); setTaskErrors({ ...taskErrors, dueDate: '' }); }}
                        className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 bg-white dark:bg-dark-elevated dark:text-dark-text transition-colors ${taskErrors.dueDate ? 'border-red-300 bg-red-50 dark:bg-red-900/20' : 'border-gray-200 dark:border-dark-border'}`}
                      />
                      {taskErrors.dueDate && <p className="text-xs text-red-500 mt-1">{taskErrors.dueDate}</p>}
                    </div>
                  </div>
                </div>

                {/* Priority Section */}
                <div className="px-6 py-5 border-b border-gray-100 dark:border-dark-border bg-gray-50/50 dark:bg-dark-elevated/50">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-dark-text mb-4">
                    <Star size={16} />
                    Priority
                  </h3>
                  <div className="flex gap-2">
                    {(['low', 'medium', 'high'] as const).map((p) => (
                      <button
                        key={p}
                        onClick={() => setNewTask({ ...newTask, priority: p })}
                        className={`flex-1 px-4 py-3 text-sm font-medium rounded-lg transition-colors capitalize border ${
                          newTask.priority === p
                            ? 'bg-gray-100 dark:bg-dark-elevated text-gray-800 dark:text-gray-200 border-gold-500'
                            : 'bg-gray-100 dark:bg-dark-hover text-gray-600 dark:text-dark-muted border-transparent hover:bg-gray-200 dark:hover:bg-dark-border'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Info Box */}
                <div className="px-6 py-5">
                  <div className="bg-gray-100 dark:bg-dark-elevated border border-gray-200 dark:border-dark-border rounded-xl p-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Tasks will appear in your calendar and can be tracked across the dashboard, tasks view, and client work sections.
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-elevated flex items-center justify-between">
                <button
                  onClick={() => { setShowAddTask(false); setTaskErrors({}); }}
                  className="px-5 py-2.5 text-gray-600 dark:text-dark-muted hover:text-gray-800 dark:hover:text-dark-text font-semibold transition-all duration-150 hover:bg-gray-100 dark:hover:bg-dark-hover rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddTask}
                  className="px-6 py-2.5 bg-gold-500 text-white rounded-xl font-semibold hover:bg-gold-600 active:scale-[0.98] transition-all duration-150 flex items-center gap-2 shadow-sm hover:shadow-md hover:shadow-gold-200/50 dark:hover:shadow-gold-900/20"
                >
                  <Plus size={18} strokeWidth={2.5} />
                  Add Task
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Add Event Side Panel */}
      {showAddEvent && (
        <>
          <div className="fixed inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-sm z-50 animate-in fade-in duration-200" onClick={() => { setShowAddEvent(false); setEventErrors({}); }}>
            <div
              className="absolute top-0 right-0 bottom-0 w-full max-w-2xl bg-white dark:bg-dark-card shadow-2xl flex flex-col"
              style={{ animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-elevated">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-dark-text">New Event</h2>
                <button
                  onClick={() => { setShowAddEvent(false); setEventErrors({}); }}
                  className="p-2 text-gray-400 dark:text-dark-muted hover:text-gray-600 dark:hover:text-dark-text hover:bg-gray-100 dark:hover:bg-dark-hover rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto">
                {/* Title Section */}
                <div className="px-6 py-6 border-b border-gray-100 dark:border-dark-border">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-100 dark:bg-dark-elevated rounded-xl flex items-center justify-center">
                      <CalendarIcon size={24} className="text-gray-600 dark:text-gray-400" />
                    </div>
                    <div className="flex-1">
                      <input
                        type="text"
                        value={newEvent.title}
                        onChange={(e) => { setNewEvent({ ...newEvent, title: e.target.value }); setEventErrors({ ...eventErrors, title: '' }); }}
                        className="w-full text-xl font-semibold border-none focus:outline-none focus:ring-0 placeholder-gray-300 dark:placeholder-dark-subtle text-gray-800 dark:text-dark-text bg-transparent"
                        placeholder="Event title..."
                        autoFocus
                      />
                      {eventErrors.title && <p className="text-xs text-red-500 mt-1">{eventErrors.title}</p>}
                    </div>
                  </div>
                </div>

                {/* Event Type Section */}
                <div className="px-6 py-5 border-b border-gray-100 dark:border-dark-border">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-dark-text mb-4">
                    <CalendarIcon size={16} />
                    Event Type
                  </h3>
                  <div className="flex gap-2">
                    {([
                      { value: 'meeting', label: 'Meeting', color: 'blue' },
                      { value: 'deadline', label: 'Deadline', color: 'red' },
                      { value: 'review', label: 'Review', color: 'purple' },
                    ] as const).map((t) => (
                      <button
                        key={t.value}
                        onClick={() => setNewEvent({ ...newEvent, type: t.value })}
                        className={`flex-1 px-4 py-3 text-sm font-medium rounded-lg transition-colors border ${
                          newEvent.type === t.value
                            ? 'bg-gray-100 dark:bg-dark-elevated text-gray-800 dark:text-gray-200 border-gold-500'
                            : 'bg-gray-100 dark:bg-dark-hover text-gray-600 dark:text-dark-muted border-transparent hover:bg-gray-200 dark:hover:bg-dark-border'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Client & Schedule Section */}
                <div className="px-6 py-5 border-b border-gray-100 dark:border-dark-border bg-gray-50/50 dark:bg-dark-elevated/50">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-dark-text mb-4">
                    <Briefcase size={16} />
                    Event Details
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-dark-muted uppercase tracking-wider mb-2">
                        Client <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={newEvent.clientId}
                        onChange={(e) => { setNewEvent({ ...newEvent, clientId: e.target.value }); setEventErrors({ ...eventErrors, clientId: '' }); }}
                        className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 bg-white dark:bg-dark-elevated dark:text-dark-text transition-colors ${eventErrors.clientId ? 'border-red-300 bg-red-50 dark:bg-red-900/20' : 'border-gray-200 dark:border-dark-border'}`}
                      >
                        <option value="">Select client</option>
                        {clients.map(client => (
                          <option key={client.id} value={client.id}>{client.company || client.name}</option>
                        ))}
                      </select>
                      {eventErrors.clientId && <p className="text-xs text-red-500 mt-1">{eventErrors.clientId}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-dark-muted uppercase tracking-wider mb-2">
                          Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={newEvent.date}
                          onChange={(e) => { setNewEvent({ ...newEvent, date: e.target.value }); setEventErrors({ ...eventErrors, date: '' }); }}
                          className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 bg-white dark:bg-dark-elevated dark:text-dark-text transition-colors ${eventErrors.date ? 'border-red-300 bg-red-50 dark:bg-red-900/20' : 'border-gray-200 dark:border-dark-border'}`}
                        />
                        {eventErrors.date && <p className="text-xs text-red-500 mt-1">{eventErrors.date}</p>}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-dark-muted uppercase tracking-wider mb-2">
                          Time
                        </label>
                        <input
                          type="time"
                          value={newEvent.time}
                          onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                          className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 bg-white dark:bg-dark-elevated dark:text-dark-text transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Info Box */}
                <div className="px-6 py-5">
                  <div className="bg-gray-100 dark:bg-dark-elevated border border-gray-200 dark:border-dark-border rounded-xl p-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Events will appear in your calendar and Today's Agenda on the dashboard.
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-elevated flex items-center justify-between">
                <button
                  onClick={() => { setShowAddEvent(false); setEventErrors({}); }}
                  className="px-5 py-2.5 text-gray-600 dark:text-dark-muted hover:text-gray-800 dark:hover:text-dark-text font-semibold transition-all duration-150 hover:bg-gray-100 dark:hover:bg-dark-hover rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddEvent}
                  className="px-6 py-2.5 bg-gold-500 text-white rounded-xl font-semibold hover:bg-gold-600 active:scale-[0.98] transition-all duration-150 flex items-center gap-2 shadow-sm hover:shadow-md hover:shadow-gold-200/50 dark:hover:shadow-gold-900/20"
                >
                  <Plus size={18} strokeWidth={2.5} />
                  Add Event
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Edit Goals Modal */}
      {showEditGoals && (
        <div className="fixed inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in duration-200" onClick={() => setShowEditGoals(false)}>
          <div
            className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl w-full max-w-lg mx-4 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-dark-border">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 dark:bg-dark-elevated rounded-xl">
                  <Target size={20} className="text-gray-600 dark:text-gray-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-dark-text">Dashboard Goals</h2>
                  <p className="text-sm text-gray-500 dark:text-dark-muted">Track your progress towards targets</p>
                </div>
              </div>
              <button
                onClick={() => setShowEditGoals(false)}
                className="p-2 text-gray-400 dark:text-dark-muted hover:text-gray-600 dark:hover:text-dark-text hover:bg-gray-100 dark:hover:bg-dark-hover rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5">
              {/* Total Clients Goal */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
                  <Users size={16} className="text-gray-500" />
                  Total Clients Goal
                </label>
                <input
                  type="number"
                  min="0"
                  value={editingGoals.totalClients}
                  onChange={(e) => setEditingGoals({ ...editingGoals, totalClients: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-dark-border rounded-xl bg-white dark:bg-dark-elevated text-gray-800 dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 transition-colors"
                  placeholder="e.g., 20"
                />
                <p className="text-xs text-gray-400 dark:text-dark-muted mt-1.5">Current: {stats.raw.totalClients} clients</p>
              </div>

              {/* Monthly Revenue Goal */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
                  <DollarSign size={16} className="text-gray-500" />
                  Monthly Revenue Goal
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-dark-muted font-medium">£</span>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={editingGoals.monthlyRevenue}
                    onChange={(e) => setEditingGoals({ ...editingGoals, monthlyRevenue: parseInt(e.target.value) || 0 })}
                    className="w-full pl-8 pr-4 py-3 border border-gray-200 dark:border-dark-border rounded-xl bg-white dark:bg-dark-elevated text-gray-800 dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 transition-colors"
                    placeholder="e.g., 10000"
                  />
                </div>
                <p className="text-xs text-gray-400 dark:text-dark-muted mt-1.5">Current: £{stats.raw.monthlyRevenue.toLocaleString()}/month</p>
              </div>

              {/* Yearly Revenue Goal */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
                  <TrendingUp size={16} className="text-gray-500" />
                  Yearly Revenue Goal
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-dark-muted font-medium">£</span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={editingGoals.yearlyRevenue}
                    onChange={(e) => setEditingGoals({ ...editingGoals, yearlyRevenue: parseInt(e.target.value) || 0 })}
                    className="w-full pl-8 pr-4 py-3 border border-gray-200 dark:border-dark-border rounded-xl bg-white dark:bg-dark-elevated text-gray-800 dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 transition-colors"
                    placeholder="e.g., 120000"
                  />
                </div>
                <p className="text-xs text-gray-400 dark:text-dark-muted mt-1.5">Current: £{stats.raw.yearlyRevenue.toLocaleString()}/year (projected)</p>
              </div>

              {/* Pipeline Value Goal */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
                  <Briefcase size={16} className="text-gray-500" />
                  Pipeline Value Goal
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-dark-muted font-medium">£</span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={editingGoals.pipelineValue}
                    onChange={(e) => setEditingGoals({ ...editingGoals, pipelineValue: parseInt(e.target.value) || 0 })}
                    className="w-full pl-8 pr-4 py-3 border border-gray-200 dark:border-dark-border rounded-xl bg-white dark:bg-dark-elevated text-gray-800 dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 transition-colors"
                    placeholder="e.g., 50000"
                  />
                </div>
                <p className="text-xs text-gray-400 dark:text-dark-muted mt-1.5">Current: £{stats.raw.pipelineValue.toLocaleString()} in pipeline</p>
              </div>

              {/* Tip */}
              <div className="bg-gray-100 dark:bg-dark-elevated border border-gray-200 dark:border-dark-border rounded-xl p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Goals help you track business growth. Progress bars on the dashboard will show how close you are to achieving each target.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-elevated rounded-b-2xl flex items-center justify-between">
              <button
                onClick={() => setEditingGoals(defaultGoals)}
                className="text-sm text-gray-500 dark:text-dark-muted hover:text-gray-700 dark:hover:text-dark-text transition-colors"
              >
                Reset to defaults
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowEditGoals(false)}
                  className="px-5 py-2.5 text-gray-600 dark:text-dark-muted hover:text-gray-800 dark:hover:text-dark-text font-semibold transition-all duration-150 hover:bg-gray-100 dark:hover:bg-dark-hover rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveGoals}
                  className="px-6 py-2.5 bg-gold-500 text-white rounded-xl font-semibold hover:bg-gold-600 active:scale-[0.98] transition-all duration-150 flex items-center gap-2 shadow-sm hover:shadow-md hover:shadow-gold-200/50 dark:hover:shadow-gold-900/20"
                >
                  <Target size={16} />
                  Save Goals
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardOverview;
