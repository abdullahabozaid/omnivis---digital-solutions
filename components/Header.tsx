import React, { useState, useRef, useEffect } from 'react';
import { Search, Bell, ChevronDown, Clock, User, Settings, LogOut, Check, X, Sun, Moon, Monitor } from 'lucide-react';
import { ViewState, Activity, UserSettings } from '../types';
import { ConfirmDialog } from './ConfirmDialog';
import { useToast } from './Toast';
import { useTheme } from './ThemeContext';

interface HeaderProps {
  title: string;
  onOpenCommandPalette?: () => void;
  onNavigate?: (view: ViewState) => void;
}

const Header: React.FC<HeaderProps> = ({ title, onOpenCommandPalette, onNavigate }) => {
  const { showToast } = useToast();
  const { theme, setTheme, resolvedTheme, toggleTheme } = useTheme();
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const themeRef = useRef<HTMLDivElement>(null);

  // Get user settings
  const [settings, setSettings] = useState<UserSettings | null>(() => {
    const saved = localStorage.getItem('tawfeeq_settings');
    return saved ? JSON.parse(saved) : null;
  });

  // Listen for settings changes
  useEffect(() => {
    const handleStorage = () => {
      const saved = localStorage.getItem('tawfeeq_settings');
      setSettings(saved ? JSON.parse(saved) : null);
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Get activities for notifications
  const [activities, setActivities] = useState<Activity[]>(() => {
    const saved = localStorage.getItem('tawfeeq_activities');
    return saved ? JSON.parse(saved) : [];
  });

  // Track when notifications were last read
  const [lastReadAt, setLastReadAt] = useState<string>(() => {
    return localStorage.getItem('tawfeeq_notification_read_at') || '';
  });

  // Listen for activity changes
  useEffect(() => {
    const handleStorage = () => {
      const saved = localStorage.getItem('tawfeeq_activities');
      setActivities(saved ? JSON.parse(saved) : []);
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Calculate unread count
  const unreadCount = activities.filter(a => !lastReadAt || new Date(a.timestamp) > new Date(lastReadAt)).length;

  // Mark all as read
  const markAllRead = () => {
    const now = new Date().toISOString();
    setLastReadAt(now);
    localStorage.setItem('tawfeeq_notification_read_at', now);
  };

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
        setNotificationOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
      if (themeRef.current && !themeRef.current.contains(e.target as Node)) {
        setThemeMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'call': return '📞';
      case 'email': return '✉️';
      case 'meeting': return '📅';
      case 'note': return '📝';
      case 'stage_change': return '➡️';
      case 'status_change': return '🔄';
      case 'created': return '✨';
      case 'converted': return '🎉';
      default: return '📌';
    }
  };

  const handleSignOut = () => {
    showToast('success', 'Signed out successfully');
    setShowSignOutConfirm(false);
    setProfileOpen(false);
  };

  const userName = settings?.profile?.name || 'Tawfeeq Admin';
  const userRole = settings?.profile?.role || 'Administrator';
  const userInitials = settings?.profile?.avatarInitials || 'TA';

  return (
    <header className="h-20 bg-white dark:bg-dark-card border-b border-gray-200 dark:border-dark-border flex items-center justify-between px-10 transition-colors duration-200">
      <div>
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-dark-text">{title}</h1>
      </div>

      <div className="flex items-center gap-8">
        <button
          onClick={onOpenCommandPalette}
          className="relative w-72 flex items-center gap-3 pl-4 pr-3 py-2.5 bg-gray-50 dark:bg-dark-elevated border border-gray-200 dark:border-dark-border rounded-xl text-sm text-gray-400 dark:text-dark-muted hover:bg-white dark:hover:bg-dark-card hover:border-gray-300 dark:hover:border-gold-700 hover:shadow-md transition-all duration-200 text-left group"
        >
          <Search size={18} className="group-hover:text-gold-500 transition-colors" />
          <span className="flex-1">Search...</span>
          <kbd className="hidden sm:inline-flex px-2 py-1 text-xs font-semibold text-gray-400 bg-white dark:bg-dark-card dark:border-dark-border dark:text-dark-muted border border-gray-200 rounded-md shadow-sm group-hover:border-gold-200 group-hover:text-gold-600 transition-all">
            ⌘K
          </kbd>
        </button>

        {/* Theme Toggle */}
        <div className="relative" ref={themeRef}>
          <button
            onClick={() => {
              setThemeMenuOpen(!themeMenuOpen);
              setNotificationOpen(false);
              setProfileOpen(false);
            }}
            className="relative p-2.5 text-gray-500 dark:text-dark-muted hover:text-gray-700 dark:hover:text-dark-text hover:bg-gray-100 dark:hover:bg-dark-hover rounded-xl transition-all duration-200 group"
            title={`Current: ${theme === 'system' ? 'System' : resolvedTheme === 'dark' ? 'Dark' : 'Light'}`}
          >
            {resolvedTheme === 'dark' ? (
              <Moon size={20} className="transition-transform duration-200 group-hover:scale-110" />
            ) : (
              <Sun size={20} className="transition-transform duration-200 group-hover:scale-110" />
            )}
          </button>

          {/* Theme Dropdown */}
          {themeMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-40 bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border shadow-xl z-50 py-1 animate-in fade-in slide-in-from-top-2 duration-200">
              <button
                onClick={() => {
                  setTheme('light');
                  setThemeMenuOpen(false);
                  showToast('success', 'Switched to light mode');
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all duration-150 ${
                  theme === 'light'
                    ? 'bg-gold-50 dark:bg-gold-900/20 text-gold-700 dark:text-gold-400'
                    : 'text-gray-700 dark:text-dark-text hover:bg-gray-50 dark:hover:bg-dark-hover'
                }`}
              >
                <Sun size={16} />
                Light
                {theme === 'light' && <Check size={14} className="ml-auto" />}
              </button>
              <button
                onClick={() => {
                  setTheme('dark');
                  setThemeMenuOpen(false);
                  showToast('success', 'Switched to dark mode');
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all duration-150 ${
                  theme === 'dark'
                    ? 'bg-gold-50 dark:bg-gold-900/20 text-gold-700 dark:text-gold-400'
                    : 'text-gray-700 dark:text-dark-text hover:bg-gray-50 dark:hover:bg-dark-hover'
                }`}
              >
                <Moon size={16} />
                Dark
                {theme === 'dark' && <Check size={14} className="ml-auto" />}
              </button>
              <button
                onClick={() => {
                  setTheme('system');
                  setThemeMenuOpen(false);
                  showToast('success', 'Using system preference');
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all duration-150 ${
                  theme === 'system'
                    ? 'bg-gold-50 dark:bg-gold-900/20 text-gold-700 dark:text-gold-400'
                    : 'text-gray-700 dark:text-dark-text hover:bg-gray-50 dark:hover:bg-dark-hover'
                }`}
              >
                <Monitor size={16} />
                System
                {theme === 'system' && <Check size={14} className="ml-auto" />}
              </button>
            </div>
          )}
        </div>

        {/* Notification Bell */}
        <div className="relative" ref={notificationRef}>
          <button
            onClick={() => {
              setNotificationOpen(!notificationOpen);
              setProfileOpen(false);
            }}
            className="relative p-2.5 text-gray-500 dark:text-dark-muted hover:text-gray-700 dark:hover:text-dark-text hover:bg-gray-100 dark:hover:bg-dark-elevated rounded-xl transition-all duration-200 group"
          >
            <Bell size={20} className="transition-transform duration-200 group-hover:scale-110" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-gold-500 rounded-full animate-pulse ring-2 ring-white dark:ring-dark-card"></span>
            )}
          </button>

          {/* Notification Dropdown */}
          {notificationOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-dark-card rounded-2xl border border-gray-200 dark:border-dark-border shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-dark-border">
                <h3 className="font-semibold text-gray-800 dark:text-dark-text">Notifications</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs text-gold-600 dark:text-gold-400 hover:text-gold-700 dark:hover:text-gold-300 font-medium flex items-center gap-1"
                  >
                    <Check size={14} />
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto">
                {activities.length === 0 ? (
                  <div className="py-8 text-center">
                    <Bell size={32} className="mx-auto text-gray-300 dark:text-dark-subtle mb-2" />
                    <p className="text-sm text-gray-400 dark:text-dark-muted">No notifications yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-dark-border">
                    {activities.slice(0, 10).map((activity) => {
                      const isUnread = !lastReadAt || new Date(activity.timestamp) > new Date(lastReadAt);
                      return (
                        <div
                          key={activity.id}
                          className={`p-4 hover:bg-gray-50 dark:hover:bg-dark-elevated transition-colors ${isUnread ? 'bg-gold-50/30 dark:bg-gold-900/20' : ''}`}
                        >
                          <div className="flex gap-3">
                            <span className="text-lg">{getActivityIcon(activity.type)}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800 dark:text-dark-text truncate">{activity.title}</p>
                              {activity.description && (
                                <p className="text-xs text-gray-500 dark:text-dark-muted truncate mt-0.5">{activity.description}</p>
                              )}
                              <p className="text-xs text-gray-400 dark:text-dark-subtle mt-1 flex items-center gap-1">
                                <Clock size={12} />
                                {formatTimeAgo(activity.timestamp)}
                              </p>
                            </div>
                            {isUnread && (
                              <span className="w-2 h-2 bg-gold-500 rounded-full flex-shrink-0 mt-2"></span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {activities.length > 0 && (
                <div className="p-3 border-t border-gray-100 dark:border-dark-border">
                  <button className="w-full text-center text-sm text-gold-600 dark:text-gold-400 hover:text-gold-700 dark:hover:text-gold-300 font-medium py-1">
                    View All Activity
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Profile Section */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => {
              setProfileOpen(!profileOpen);
              setNotificationOpen(false);
            }}
            className="flex items-center gap-3 pl-6 border-l border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-elevated -mr-4 pr-4 py-2 rounded-r-xl transition-all duration-200 group"
          >
            <div className="w-10 h-10 rounded-full bg-gold-100 dark:bg-gold-900/40 border-2 border-gold-300 dark:border-gold-700 flex items-center justify-center group-hover:border-gold-400 dark:group-hover:border-gold-500 group-hover:shadow-md transition-all duration-200">
              <span className="text-sm font-semibold text-gold-700 dark:text-gold-300">{userInitials}</span>
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium text-gray-800 dark:text-dark-text">{userName}</p>
              <p className="text-xs text-gray-500 dark:text-dark-muted">{userRole}</p>
            </div>
            <ChevronDown size={16} className={`text-gray-400 dark:text-dark-muted transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Profile Dropdown */}
          {profileOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-dark-card rounded-2xl border border-gray-200 dark:border-dark-border shadow-xl z-50 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-dark-border">
                <p className="font-medium text-gray-800 dark:text-dark-text">{userName}</p>
                <p className="text-xs text-gray-500 dark:text-dark-muted">{userRole}</p>
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    onNavigate?.('settings');
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-dark-text hover:bg-gray-50 dark:hover:bg-dark-elevated transition-all duration-150 group"
                >
                  <User size={16} className="text-gray-400 dark:text-dark-muted group-hover:text-gold-500 dark:group-hover:text-gold-400 transition-colors" />
                  View Profile
                </button>
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    onNavigate?.('settings');
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-dark-text hover:bg-gray-50 dark:hover:bg-dark-elevated transition-all duration-150 group"
                >
                  <Settings size={16} className="text-gray-400 dark:text-dark-muted group-hover:text-gold-500 dark:group-hover:text-gold-400 group-hover:rotate-45 transition-all duration-200" />
                  Settings
                </button>
              </div>

              <div className="border-t border-gray-100 dark:border-dark-border py-1">
                <button
                  onClick={() => setShowSignOutConfirm(true)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-150 group"
                >
                  <LogOut size={16} className="group-hover:-translate-x-0.5 transition-transform duration-200" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sign Out Confirmation */}
      <ConfirmDialog
        isOpen={showSignOutConfirm}
        onCancel={() => setShowSignOutConfirm(false)}
        onConfirm={handleSignOut}
        title="Sign Out"
        message="Are you sure you want to sign out"
        confirmLabel="Sign Out"
        confirmVariant="warning"
      />
    </header>
  );
};

export default Header;
