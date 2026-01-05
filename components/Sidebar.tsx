import React, { useState, useRef, useEffect } from 'react';
import { LayoutDashboard, Users, UserCircle, Settings, LogOut, ChevronLeft, ChevronRight, Layers, Briefcase, Calendar, ClipboardList, BarChart3, Globe } from 'lucide-react';
import { ViewState } from '../types';
import { ConfirmDialog } from './ConfirmDialog';
import { useToast } from './Toast';

// Tooltip component for collapsed sidebar
const Tooltip: React.FC<{ children: React.ReactNode; label: string; show: boolean }> = ({ children, label, show }) => {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const handleMouseEnter = () => {
    if (!show) return;
    timeoutRef.current = setTimeout(() => setIsVisible(true), 200);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div className="relative" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      {children}
      {show && isVisible && (
        <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 pointer-events-none">
          <div className="bg-gray-900 text-white text-sm font-medium px-3 py-1.5 rounded-lg whitespace-nowrap shadow-lg">
            {label}
            <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
          </div>
        </div>
      )}
    </div>
  );
};

interface SidebarProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, collapsed, setCollapsed }) => {
  const { showToast } = useToast();
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  const menuItems = [
    { id: 'overview', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { id: 'calendar', label: 'Calendar', icon: <Calendar size={20} /> },
    { id: 'tasks', label: 'Tasks', icon: <ClipboardList size={20} /> },
    { id: 'clients', label: 'Clients', icon: <UserCircle size={20} /> },
    { id: 'crm', label: 'CRM Pipeline', icon: <Users size={20} /> },
    { id: 'websites', label: 'Website Library', icon: <Globe size={20} /> },
    { id: 'templates', label: 'Snapshots', icon: <Layers size={20} /> },
    { id: 'clientwork', label: 'Client Work', icon: <Briefcase size={20} /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={20} /> },
  ];

  const handleSignOut = () => {
    showToast('success', 'Signed out successfully');
    setShowSignOutConfirm(false);
  };

  return (
    <>
      <aside className={`fixed left-0 top-0 h-screen bg-white dark:bg-dark-card border-r border-gray-200 dark:border-dark-border flex flex-col z-20 transition-all duration-300 ${collapsed ? 'w-20' : 'w-72'}`}>
        <div className={`h-20 flex items-center border-b border-gray-200 dark:border-dark-border ${collapsed ? 'px-4 justify-center' : 'px-8'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gold-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-lg">T</span>
            </div>
            {!collapsed && (
              <div>
                <h1 className="font-semibold text-lg text-gray-800 dark:text-dark-text tracking-tight">Tawfeeq</h1>
                <p className="text-xs text-gray-400 dark:text-dark-muted">Internal Tools</p>
              </div>
            )}
          </div>
        </div>

        <nav className={`flex-1 py-8 ${collapsed ? 'px-3' : 'px-5'}`}>
          {!collapsed && <p className="text-xs font-semibold text-gray-400 dark:text-dark-muted uppercase tracking-wider mb-5 px-3">Main Menu</p>}
          <div className="space-y-1.5">
            {menuItems.map((item) => (
              <Tooltip key={item.id} label={item.label} show={collapsed}>
                <button
                  onClick={() => setView(item.id as ViewState)}
                  className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group relative ${
                    currentView === item.id
                      ? 'bg-gold-50 dark:bg-gold-900/20 text-gold-700 dark:text-gold-400 border border-gold-200 dark:border-gold-800 shadow-sm'
                      : 'text-gray-600 dark:text-dark-muted hover:bg-gray-50 dark:hover:bg-dark-hover hover:text-gray-800 dark:hover:text-dark-text'
                  } ${collapsed ? 'justify-center' : ''}`}
                >
                  {currentView === item.id && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gold-500 rounded-r-full" />
                  )}
                  <span className={`transition-transform duration-200 group-hover:scale-110 ${currentView === item.id ? 'text-gold-600 dark:text-gold-400' : 'text-gray-500 dark:text-dark-muted group-hover:text-gray-700 dark:group-hover:text-dark-text'}`}>
                    {item.icon}
                  </span>
                  {!collapsed && <span className="font-medium text-sm">{item.label}</span>}
                </button>
              </Tooltip>
            ))}
          </div>
        </nav>

        <div className={`pb-6 ${collapsed ? 'px-3' : 'px-5'}`}>
          <div className="border-t border-gray-200 dark:border-dark-border pt-6 space-y-1.5">
            <Tooltip label="Settings" show={collapsed}>
              <button
                onClick={() => setView('settings')}
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group relative ${collapsed ? 'justify-center' : ''} ${
                  currentView === 'settings'
                    ? 'bg-gold-50 dark:bg-gold-900/20 text-gold-700 dark:text-gold-400 border border-gold-200 dark:border-gold-800 shadow-sm'
                    : 'text-gray-600 dark:text-dark-muted hover:bg-gray-50 dark:hover:bg-dark-hover hover:text-gray-800 dark:hover:text-dark-text'
                }`}
              >
                {currentView === 'settings' && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gold-500 rounded-r-full" />
                )}
                <Settings size={20} className={`transition-transform duration-200 group-hover:scale-110 group-hover:rotate-45 ${currentView === 'settings' ? 'text-gold-600 dark:text-gold-400' : 'text-gray-500 dark:text-dark-muted group-hover:text-gray-700 dark:group-hover:text-dark-text'}`} />
                {!collapsed && <span className="font-medium text-sm">Settings</span>}
              </button>
            </Tooltip>
            <Tooltip label="Sign Out" show={collapsed}>
              <button
                onClick={() => setShowSignOutConfirm(true)}
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl text-gray-500 dark:text-dark-muted hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-all duration-200 group ${collapsed ? 'justify-center' : ''}`}
              >
                <LogOut size={20} className="transition-transform duration-200 group-hover:scale-110 group-hover:-translate-x-0.5" />
                {!collapsed && <span className="font-medium text-sm">Sign Out</span>}
              </button>
            </Tooltip>
          </div>
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-24 w-7 h-7 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-full flex items-center justify-center text-gray-400 dark:text-dark-muted hover:text-gold-600 hover:border-gold-300 hover:bg-gold-50 dark:hover:bg-gold-900/20 transition-all duration-200 shadow-sm hover:shadow-md group"
        >
          <span className="transition-transform duration-200 group-hover:scale-110">
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </span>
        </button>
      </aside>

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
    </>
  );
};

export default Sidebar;
