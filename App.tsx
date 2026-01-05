import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardOverview from './components/DashboardOverview';
import { ClientsView, CrmView, TemplatesView, ClientWorkView, CalendarView, TasksView, SettingsView, AnalyticsView, WebsiteLibraryView } from './components/ModuleViews';
import { ToastProvider } from './components/Toast';
import CommandPalette from './components/CommandPalette';
import { KeyboardShortcutsProvider } from './components/KeyboardShortcuts';
import { ThemeProvider } from './components/ThemeContext';
import { SupabaseProvider } from './context/SupabaseContext';
import { SyncProvider } from './context/SyncContext';
import { MigrationWizard } from './components/MigrationWizard';
import { isMigrationComplete } from './utils/migration';
import { isSupabaseConfigured } from './lib/supabase/client';
import { ViewState } from './types';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [showMigration, setShowMigration] = useState(false);
  const [migrationChecked, setMigrationChecked] = useState(false);

  // Check if migration is needed
  useEffect(() => {
    const checkMigration = async () => {
      if (isSupabaseConfigured()) {
        const complete = await isMigrationComplete();
        if (!complete) {
          setShowMigration(true);
        }
      }
      setMigrationChecked(true);
    };
    checkMigration();
  }, []);

  // Global keyboard shortcut for Command Palette (Cmd+K or Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleOpenCommandPalette = useCallback(() => {
    setCommandPaletteOpen(true);
  }, []);

  const getPageTitle = () => {
    switch (currentView) {
      case 'overview': return 'Dashboard';
      case 'calendar': return 'Calendar';
      case 'tasks': return 'Tasks';
      case 'clients': return 'Clients';
      case 'crm': return 'CRM Pipeline';
      case 'websites': return 'Website Library';
      case 'templates': return 'Snapshots';
      case 'clientwork': return 'Client Work';
      case 'settings': return 'Settings';
      case 'analytics': return 'Analytics';
      default: return 'Dashboard';
    }
  };

  const renderContent = () => {
    switch (currentView) {
      case 'overview': return <DashboardOverview onNavigate={setCurrentView} />;
      case 'calendar': return <CalendarView />;
      case 'tasks': return <TasksView />;
      case 'clients': return <ClientsView />;
      case 'crm': return <CrmView />;
      case 'websites': return <WebsiteLibraryView />;
      case 'templates': return <TemplatesView />;
      case 'clientwork': return <ClientWorkView />;
      case 'settings': return <SettingsView />;
      case 'analytics': return <AnalyticsView />;
      default: return <DashboardOverview />;
    }
  };

  return (
    <ThemeProvider>
      <SupabaseProvider>
        <SyncProvider>
          <ToastProvider>
            <KeyboardShortcutsProvider
              onNavigate={setCurrentView}
              onOpenCommandPalette={handleOpenCommandPalette}
            >
              <div className="min-h-screen bg-gray-50 dark:bg-dark-bg transition-colors duration-200">
                <Sidebar
                  currentView={currentView}
                  setView={setCurrentView}
                  collapsed={sidebarCollapsed}
                  setCollapsed={setSidebarCollapsed}
                />

                <div className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-20' : 'ml-72'}`}>
                  <Header title={getPageTitle()} onOpenCommandPalette={handleOpenCommandPalette} onNavigate={setCurrentView} />

                  <main className="p-10">
                    <div className="max-w-7xl mx-auto">
                      {renderContent()}
                    </div>
                  </main>
                </div>

                {/* Command Palette */}
                <CommandPalette
                  isOpen={commandPaletteOpen}
                  onClose={() => setCommandPaletteOpen(false)}
                  onNavigate={setCurrentView}
                />

                {/* Migration Wizard */}
                {migrationChecked && showMigration && (
                  <MigrationWizard
                    onComplete={() => setShowMigration(false)}
                    onSkip={() => setShowMigration(false)}
                  />
                )}
              </div>
            </KeyboardShortcutsProvider>
          </ToastProvider>
        </SyncProvider>
      </SupabaseProvider>
    </ThemeProvider>
  );
};

export default App;
