import React, { useState, useEffect } from 'react';
import { MessageSquare, Phone, Mail, Calendar, ArrowRight, Plus, X, Clock, User, Send, ChevronDown, FileText, UserPlus } from 'lucide-react';
import { Activity } from '../types';

interface ActivityTimelineProps {
  entityType: 'client' | 'contact';
  entityId: string;
  entityName?: string;
}

// Activity type configurations
const ACTIVITY_TYPES = [
  { type: 'note' as const, label: 'Note', icon: MessageSquare, color: 'text-gray-500 bg-gray-100' },
  { type: 'call' as const, label: 'Call', icon: Phone, color: 'text-green-500 bg-green-100' },
  { type: 'email' as const, label: 'Email', icon: Mail, color: 'text-blue-500 bg-blue-100' },
  { type: 'meeting' as const, label: 'Meeting', icon: Calendar, color: 'text-purple-500 bg-purple-100' },
];

// Get icon component for activity type
const getActivityIcon = (type: Activity['type']) => {
  switch (type) {
    case 'note': return MessageSquare;
    case 'call': return Phone;
    case 'email': return Mail;
    case 'meeting': return Calendar;
    case 'stage_change': return ArrowRight;
    case 'status_change': return ArrowRight;
    case 'created': return UserPlus;
    case 'converted': return User;
    default: return FileText;
  }
};

// Get color classes for activity type
const getActivityColor = (type: Activity['type']) => {
  switch (type) {
    case 'note': return 'text-gray-500 bg-gray-100';
    case 'call': return 'text-green-500 bg-green-100';
    case 'email': return 'text-blue-500 bg-blue-100';
    case 'meeting': return 'text-purple-500 bg-purple-100';
    case 'stage_change': return 'text-orange-500 bg-orange-100';
    case 'status_change': return 'text-yellow-500 bg-yellow-100';
    case 'created': return 'text-gold-500 bg-gold-100';
    case 'converted': return 'text-emerald-500 bg-emerald-100';
    default: return 'text-gray-500 bg-gray-100';
  }
};

// Format relative time
const formatRelativeTime = (timestamp: string) => {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

// Format full date/time
const formatFullDate = (timestamp: string) => {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Utility functions to manage activities in localStorage
export const getActivities = (entityType?: 'client' | 'contact', entityId?: string): Activity[] => {
  try {
    const saved = localStorage.getItem('tawfeeq_activities');
    const activities: Activity[] = saved ? JSON.parse(saved) : [];

    if (entityType && entityId) {
      return activities.filter(a => a.entityType === entityType && a.entityId === entityId);
    }
    return activities;
  } catch {
    return [];
  }
};

export const addActivity = (activity: Omit<Activity, 'id' | 'timestamp'>): Activity => {
  const newActivity: Activity = {
    ...activity,
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
  };

  const activities = getActivities();
  const updated = [newActivity, ...activities];
  localStorage.setItem('tawfeeq_activities', JSON.stringify(updated));

  return newActivity;
};

export const deleteActivity = (activityId: string): void => {
  const activities = getActivities();
  const updated = activities.filter(a => a.id !== activityId);
  localStorage.setItem('tawfeeq_activities', JSON.stringify(updated));
};

// Auto-log helper functions
export const logStageChange = (
  entityType: 'contact',
  entityId: string,
  entityName: string,
  oldStage: string,
  newStage: string
) => {
  addActivity({
    type: 'stage_change',
    entityType,
    entityId,
    title: `Moved to ${newStage}`,
    description: `Stage changed from "${oldStage}" to "${newStage}"`,
    metadata: { oldStage, newStage },
  });
};

export const logStatusChange = (
  entityType: 'client' | 'contact',
  entityId: string,
  entityName: string,
  oldStatus: string,
  newStatus: string
) => {
  addActivity({
    type: 'status_change',
    entityType,
    entityId,
    title: `Status changed to ${newStatus}`,
    description: `Status changed from "${oldStatus}" to "${newStatus}"`,
    metadata: { oldStatus, newStatus },
  });
};

export const logCreated = (
  entityType: 'client' | 'contact',
  entityId: string,
  entityName: string
) => {
  addActivity({
    type: 'created',
    entityType,
    entityId,
    title: `${entityType === 'client' ? 'Client' : 'Contact'} created`,
    description: `${entityName} was added to the system`,
  });
};

export const logConversion = (
  contactId: string,
  contactName: string,
  clientId: string
) => {
  addActivity({
    type: 'converted',
    entityType: 'contact',
    entityId: contactId,
    title: 'Converted to client',
    description: `${contactName} was converted to an active client`,
    metadata: { newStatus: 'converted' },
  });
};

// Main ActivityTimeline component
const ActivityTimeline: React.FC<ActivityTimelineProps> = ({
  entityType,
  entityId,
  entityName,
}) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newActivityType, setNewActivityType] = useState<'note' | 'call' | 'email' | 'meeting'>('note');
  const [newActivityTitle, setNewActivityTitle] = useState('');
  const [newActivityDescription, setNewActivityDescription] = useState('');
  const [callDuration, setCallDuration] = useState('');
  const [callOutcome, setCallOutcome] = useState('');

  // Load activities on mount and when entityId changes
  useEffect(() => {
    const loadedActivities = getActivities(entityType, entityId);
    setActivities(loadedActivities.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    ));
  }, [entityType, entityId]);

  // Refresh activities periodically (for auto-logged activities)
  useEffect(() => {
    const interval = setInterval(() => {
      const loadedActivities = getActivities(entityType, entityId);
      setActivities(loadedActivities.sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ));
    }, 2000);
    return () => clearInterval(interval);
  }, [entityType, entityId]);

  const handleAddActivity = () => {
    if (!newActivityTitle.trim()) return;

    const activity = addActivity({
      type: newActivityType,
      entityType,
      entityId,
      title: newActivityTitle,
      description: newActivityDescription || undefined,
      metadata: newActivityType === 'call' ? {
        duration: callDuration ? parseInt(callDuration) : undefined,
        outcome: callOutcome || undefined,
      } : undefined,
    });

    setActivities([activity, ...activities]);
    setShowAddForm(false);
    setNewActivityTitle('');
    setNewActivityDescription('');
    setCallDuration('');
    setCallOutcome('');
  };

  const handleDeleteActivity = (activityId: string) => {
    deleteActivity(activityId);
    setActivities(activities.filter(a => a.id !== activityId));
  };

  return (
    <div className="space-y-4">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Clock size={16} className="text-gray-400" />
          Activity Timeline
        </h4>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gold-600 hover:bg-gold-50 rounded-lg transition-colors"
        >
          {showAddForm ? <X size={14} /> : <Plus size={14} />}
          {showAddForm ? 'Cancel' : 'Log Activity'}
        </button>
      </div>

      {/* Add Activity Form */}
      {showAddForm && (
        <div className="p-4 bg-gray-50 rounded-xl space-y-3">
          {/* Activity Type Pills */}
          <div className="flex flex-wrap gap-2">
            {ACTIVITY_TYPES.map(({ type, label, icon: Icon, color }) => (
              <button
                key={type}
                onClick={() => setNewActivityType(type)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  newActivityType === type
                    ? `${color} ring-2 ring-offset-1 ring-gray-300`
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon size={12} />
                {label}
              </button>
            ))}
          </div>

          {/* Title Input */}
          <input
            type="text"
            value={newActivityTitle}
            onChange={(e) => setNewActivityTitle(e.target.value)}
            placeholder={`${newActivityType.charAt(0).toUpperCase() + newActivityType.slice(1)} title...`}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400"
          />

          {/* Description Textarea */}
          <textarea
            value={newActivityDescription}
            onChange={(e) => setNewActivityDescription(e.target.value)}
            placeholder="Add details (optional)..."
            rows={2}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400 resize-none"
          />

          {/* Call-specific fields */}
          {newActivityType === 'call' && (
            <div className="flex gap-3">
              <input
                type="number"
                value={callDuration}
                onChange={(e) => setCallDuration(e.target.value)}
                placeholder="Duration (mins)"
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400"
              />
              <select
                value={callOutcome}
                onChange={(e) => setCallOutcome(e.target.value)}
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400"
              >
                <option value="">Outcome...</option>
                <option value="Connected">Connected</option>
                <option value="No Answer">No Answer</option>
                <option value="Left Voicemail">Left Voicemail</option>
                <option value="Busy">Busy</option>
                <option value="Scheduled Callback">Scheduled Callback</option>
              </select>
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleAddActivity}
            disabled={!newActivityTitle.trim()}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gold-500 hover:bg-gold-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={14} />
            Log {newActivityType.charAt(0).toUpperCase() + newActivityType.slice(1)}
          </button>
        </div>
      )}

      {/* Timeline */}
      <div className="relative">
        {activities.length === 0 ? (
          <div className="py-8 text-center">
            <Clock size={32} className="mx-auto text-gray-300 dark:text-dark-subtle mb-2" />
            <p className="text-sm text-gray-500 dark:text-dark-muted">No activity yet</p>
            <p className="text-xs text-gray-400 dark:text-dark-muted mt-1">Log your first interaction</p>
          </div>
        ) : (
          <div className="space-y-0">
            {activities.map((activity, index) => {
              const Icon = getActivityIcon(activity.type);
              const colorClass = getActivityColor(activity.type);
              const isLast = index === activities.length - 1;
              const isAutoLogged = ['stage_change', 'status_change', 'created', 'converted'].includes(activity.type);

              return (
                <div key={activity.id} className="relative flex gap-3 group">
                  {/* Timeline line */}
                  {!isLast && (
                    <div className="absolute left-[15px] top-8 w-0.5 h-[calc(100%-8px)] bg-gray-200" />
                  )}

                  {/* Icon */}
                  <div className={`relative z-10 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${colorClass}`}>
                    <Icon size={14} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{activity.title}</p>
                        {activity.description && (
                          <p className="text-xs text-gray-500 mt-0.5">{activity.description}</p>
                        )}
                        {activity.metadata?.duration && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            Duration: {activity.metadata.duration} mins
                            {activity.metadata.outcome && ` · ${activity.metadata.outcome}`}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-400 whitespace-nowrap" title={formatFullDate(activity.timestamp)}>
                          {formatRelativeTime(activity.timestamp)}
                        </span>
                        {!isAutoLogged && (
                          <button
                            onClick={() => handleDeleteActivity(activity.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityTimeline;
