import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { X, Keyboard } from 'lucide-react';
import { ViewState } from '../types';

interface ShortcutsContextType {
  showHelp: () => void;
  hideHelp: () => void;
}

const ShortcutsContext = createContext<ShortcutsContextType | null>(null);

export const useShortcuts = () => {
  const context = useContext(ShortcutsContext);
  if (!context) {
    throw new Error('useShortcuts must be used within a KeyboardShortcutsProvider');
  }
  return context;
};

interface KeyboardShortcutsProviderProps {
  children: ReactNode;
  onNavigate: (view: ViewState) => void;
  onOpenCommandPalette: () => void;
}

export const KeyboardShortcutsProvider: React.FC<KeyboardShortcutsProviderProps> = ({
  children,
  onNavigate,
  onOpenCommandPalette,
}) => {
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [pendingGoKey, setPendingGoKey] = useState(false);

  const showHelp = useCallback(() => setShowHelpModal(true), []);
  const hideHelp = useCallback(() => setShowHelpModal(false), []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable;

      if (isTyping) return;

      // Command palette is handled in App.tsx (Cmd+K)

      // Show help with ?
      if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setShowHelpModal(prev => !prev);
        return;
      }

      // Close help with Escape
      if (e.key === 'Escape') {
        if (showHelpModal) {
          e.preventDefault();
          setShowHelpModal(false);
          return;
        }
        setPendingGoKey(false);
        return;
      }

      // Handle "G then X" navigation shortcuts
      if (e.key === 'g' && !e.metaKey && !e.ctrlKey) {
        setPendingGoKey(true);
        // Reset after 1.5 seconds if no follow-up key
        setTimeout(() => setPendingGoKey(false), 1500);
        return;
      }

      if (pendingGoKey) {
        setPendingGoKey(false);
        switch (e.key) {
          case 'd':
            e.preventDefault();
            onNavigate('overview');
            break;
          case 'c':
            e.preventDefault();
            onNavigate('clients');
            break;
          case 'r':
            e.preventDefault();
            onNavigate('crm');
            break;
          case 't':
            e.preventDefault();
            onNavigate('tasks');
            break;
          case 'a':
            e.preventDefault();
            onNavigate('calendar');
            break;
          case 'p':
            e.preventDefault();
            onNavigate('templates');
            break;
          case 'w':
            e.preventDefault();
            onNavigate('clientwork');
            break;
        }
        return;
      }

      // Quick search with /
      if (e.key === '/' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        onOpenCommandPalette();
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [pendingGoKey, showHelpModal, onNavigate, onOpenCommandPalette]);

  return (
    <ShortcutsContext.Provider value={{ showHelp, hideHelp }}>
      {children}

      {/* Shortcuts Help Modal */}
      {showHelpModal && (
        <>
          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes scaleIn {
              from { opacity: 0; transform: scale(0.95); }
              to { opacity: 1; transform: scale(1); }
            }
          `}</style>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            style={{ animation: 'fadeIn 0.15s ease-out' }}
            onClick={() => setShowHelpModal(false)}
          >
            <div
              className="w-full max-w-2xl bg-white dark:bg-dark-card rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-dark-border"
              style={{ animation: 'scaleIn 0.2s ease-out' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-hover">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gold-100 dark:bg-gold-900/30 rounded-lg">
                    <Keyboard size={20} className="text-gold-600 dark:text-gold-400" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-dark-text">Keyboard Shortcuts</h2>
                </div>
                <button
                  onClick={() => setShowHelpModal(false)}
                  className="p-2 text-gray-400 dark:text-dark-muted hover:text-gray-600 dark:hover:text-dark-text hover:bg-gray-100 dark:hover:bg-dark-hover rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 grid grid-cols-2 gap-6 max-h-[60vh] overflow-y-auto">
                {/* Navigation */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-dark-text uppercase tracking-wider mb-3">
                    Navigation
                  </h3>
                  <div className="space-y-2">
                    <ShortcutRow keys={['G', 'D']} description="Go to Dashboard" />
                    <ShortcutRow keys={['G', 'C']} description="Go to Clients" />
                    <ShortcutRow keys={['G', 'R']} description="Go to CRM" />
                    <ShortcutRow keys={['G', 'T']} description="Go to Tasks" />
                    <ShortcutRow keys={['G', 'A']} description="Go to Calendar" />
                    <ShortcutRow keys={['G', 'P']} description="Go to Packages" />
                    <ShortcutRow keys={['G', 'W']} description="Go to Client Work" />
                  </div>
                </div>

                {/* Search & Actions */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-dark-text uppercase tracking-wider mb-3">
                    Search & Actions
                  </h3>
                  <div className="space-y-2">
                    <ShortcutRow keys={['⌘', 'K']} description="Open command palette" />
                    <ShortcutRow keys={['/']} description="Quick search" />
                    <ShortcutRow keys={['?']} description="Show this help" />
                    <ShortcutRow keys={['Esc']} description="Close modal / Clear" />
                  </div>
                </div>

                {/* Command Palette */}
                <div className="col-span-2 mt-4 p-4 bg-gray-50 dark:bg-dark-hover rounded-xl">
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-dark-text uppercase tracking-wider mb-2">
                    Tips
                  </h3>
                  <ul className="text-sm text-gray-600 dark:text-dark-muted space-y-1.5">
                    <li className="flex items-start gap-2">
                      <span className="text-gold-500 mt-0.5">-</span>
                      <span>Press <kbd className="px-1.5 py-0.5 bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded text-xs font-medium">G</kbd> then a letter to navigate (e.g., <kbd className="px-1.5 py-0.5 bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded text-xs font-medium">G</kbd> <kbd className="px-1.5 py-0.5 bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded text-xs font-medium">C</kbd> for Clients)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-gold-500 mt-0.5">-</span>
                      <span>Use the command palette (<kbd className="px-1.5 py-0.5 bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded text-xs font-medium">⌘K</kbd>) to quickly search and navigate</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-gold-500 mt-0.5">-</span>
                      <span>Shortcuts are disabled when typing in input fields</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-3 border-t border-gray-100 dark:border-dark-border bg-gray-50 dark:bg-dark-hover text-center">
                <span className="text-xs text-gray-400 dark:text-dark-muted">
                  Press <kbd className="px-1.5 py-0.5 bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded text-[10px] font-medium mx-0.5">?</kbd> anytime to show this help
                </span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Go key pending indicator */}
      {pendingGoKey && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-gray-900 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm">
            <kbd className="px-2 py-0.5 bg-gray-700 rounded text-xs font-medium">G</kbd>
            <span className="text-gray-300">then...</span>
            <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-[10px]">D</kbd>
            <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-[10px]">C</kbd>
            <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-[10px]">R</kbd>
            <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-[10px]">T</kbd>
          </div>
        </div>
      )}
    </ShortcutsContext.Provider>
  );
};

// Helper component for shortcut rows
const ShortcutRow: React.FC<{ keys: string[]; description: string }> = ({ keys, description }) => (
  <div className="flex items-center justify-between py-1.5">
    <span className="text-sm text-gray-600 dark:text-dark-muted">{description}</span>
    <div className="flex items-center gap-1">
      {keys.map((key, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="text-gray-400 dark:text-dark-muted text-xs mx-0.5">then</span>}
          <kbd className="px-2 py-1 bg-gray-100 dark:bg-dark-hover border border-gray-200 dark:border-dark-border rounded text-xs font-medium text-gray-700 dark:text-dark-text min-w-[24px] text-center">
            {key}
          </kbd>
        </React.Fragment>
      ))}
    </div>
  </div>
);

export default KeyboardShortcutsProvider;
