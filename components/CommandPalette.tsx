import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Search, X, Users, Briefcase, Calendar, CheckSquare, Layout, ArrowRight, Clock, LayoutGrid, FileText, TrendingUp } from 'lucide-react';
import { ViewState, CrmContact, Pipeline, SearchResult } from '../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: ViewState) => void;
}

interface LocalClient {
  id: string;
  name: string;
  company: string;
  email: string;
  status: 'active' | 'paused' | 'cancelled';
  payment: number;
}

interface RecentSearch {
  id: string;
  query: string;
  timestamp: number;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onNavigate }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Load data from localStorage
  const clients = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('tawfeeq_clients') || '[]') as LocalClient[];
    } catch {
      return [];
    }
  }, [isOpen]);

  const pipelines = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('tawfeeq_pipelines') || '[]') as Pipeline[];
    } catch {
      return [];
    }
  }, [isOpen]);

  const contacts = useMemo(() => {
    return pipelines.flatMap(p => p.contacts);
  }, [pipelines]);

  // Load recent searches
  useEffect(() => {
    try {
      const saved = localStorage.getItem('tawfeeq_recent_searches');
      if (saved) {
        setRecentSearches(JSON.parse(saved));
      }
    } catch {
      setRecentSearches([]);
    }
  }, [isOpen]);

  // Navigation options
  const navigationItems: SearchResult[] = [
    { id: 'nav-dashboard', type: 'view', title: 'Dashboard', subtitle: 'Go to Dashboard', icon: 'Layout' },
    { id: 'nav-clients', type: 'view', title: 'Clients', subtitle: 'Go to Clients', icon: 'Users' },
    { id: 'nav-crm', type: 'view', title: 'CRM Pipeline', subtitle: 'Go to CRM Pipeline', icon: 'TrendingUp' },
    { id: 'nav-templates', type: 'view', title: 'Packages', subtitle: 'Go to Packages', icon: 'FileText' },
    { id: 'nav-clientwork', type: 'view', title: 'Client Work', subtitle: 'Go to Client Work', icon: 'Briefcase' },
    { id: 'nav-calendar', type: 'view', title: 'Calendar', subtitle: 'Go to Calendar', icon: 'Calendar' },
    { id: 'nav-tasks', type: 'view', title: 'Tasks', subtitle: 'Go to Tasks', icon: 'CheckSquare' },
  ];

  // Generate search results
  const searchResults = useMemo((): SearchResult[] => {
    const q = query.toLowerCase().trim();

    if (!q) {
      // Show navigation options when no query
      return navigationItems;
    }

    const results: SearchResult[] = [];

    // Search clients
    clients.forEach(client => {
      if (
        client.name.toLowerCase().includes(q) ||
        client.company.toLowerCase().includes(q) ||
        client.email.toLowerCase().includes(q)
      ) {
        results.push({
          id: `client-${client.id}`,
          type: 'client',
          title: client.name,
          subtitle: `${client.company} • ${client.status}`,
          icon: 'Users',
        });
      }
    });

    // Search CRM contacts
    contacts.forEach(contact => {
      if (
        contact.name.toLowerCase().includes(q) ||
        contact.company.toLowerCase().includes(q) ||
        contact.email.toLowerCase().includes(q)
      ) {
        results.push({
          id: `contact-${contact.id}`,
          type: 'contact',
          title: contact.name,
          subtitle: `${contact.company} • £${contact.value.toLocaleString()}`,
          icon: 'Briefcase',
        });
      }
    });

    // Search navigation items
    navigationItems.forEach(nav => {
      if (nav.title.toLowerCase().includes(q)) {
        results.push(nav);
      }
    });

    return results;
  }, [query, clients, contacts]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchResults]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Scroll selected item into view
  useEffect(() => {
    if (resultsRef.current) {
      const selectedElement = resultsRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  const handleSelect = useCallback((result: SearchResult) => {
    // Save to recent searches if it's a query
    if (query.trim()) {
      const newRecent: RecentSearch = {
        id: Date.now().toString(),
        query: query.trim(),
        timestamp: Date.now(),
      };
      const updated = [newRecent, ...recentSearches.filter(r => r.query !== query.trim())].slice(0, 5);
      setRecentSearches(updated);
      localStorage.setItem('tawfeeq_recent_searches', JSON.stringify(updated));
    }

    // Handle selection based on type
    switch (result.type) {
      case 'view':
        const viewMap: Record<string, ViewState> = {
          'nav-dashboard': 'overview',
          'nav-clients': 'clients',
          'nav-crm': 'crm',
          'nav-templates': 'templates',
          'nav-clientwork': 'clientwork',
          'nav-calendar': 'calendar',
          'nav-tasks': 'tasks',
        };
        const view = viewMap[result.id];
        if (view) {
          onNavigate(view);
        }
        break;
      case 'client':
        onNavigate('clients');
        break;
      case 'contact':
        onNavigate('crm');
        break;
      default:
        break;
    }

    onClose();
  }, [query, recentSearches, onNavigate, onClose]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, searchResults.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (searchResults[selectedIndex]) {
          handleSelect(searchResults[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  }, [searchResults, selectedIndex, handleSelect, onClose]);

  const getIcon = (iconName: string) => {
    const icons: Record<string, React.ReactNode> = {
      Users: <Users size={18} />,
      Briefcase: <Briefcase size={18} />,
      Calendar: <Calendar size={18} />,
      CheckSquare: <CheckSquare size={18} />,
      Layout: <Layout size={18} />,
      LayoutGrid: <LayoutGrid size={18} />,
      FileText: <FileText size={18} />,
      TrendingUp: <TrendingUp size={18} />,
      Clock: <Clock size={18} />,
    };
    return icons[iconName] || <Layout size={18} />;
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      client: 'Client',
      contact: 'CRM Contact',
      task: 'Task',
      event: 'Event',
      view: 'Navigation',
    };
    return labels[type] || type;
  };

  if (!isOpen) return null;

  return (
    <>
      <style>{`
        @keyframes cmdFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes cmdSlideDown {
          from { opacity: 0; transform: translateY(-20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-[15vh]"
        style={{ animation: 'cmdFadeIn 0.15s ease-out' }}
        onClick={onClose}
      >
        <div
          className="w-full max-w-2xl bg-white dark:bg-dark-card rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-dark-border"
          style={{ animation: 'cmdSlideDown 0.2s cubic-bezier(0.16, 1, 0.3, 1)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Search Input */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-dark-border bg-gray-50/50 dark:bg-dark-hover/50">
            <Search size={20} className="text-gold-500" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search clients, contacts, or navigate..."
              className="flex-1 text-lg outline-none placeholder-gray-400 dark:placeholder-dark-muted bg-transparent font-medium text-gray-800 dark:text-dark-text"
            />
            <div className="flex items-center gap-2">
              <kbd className="hidden sm:inline-flex px-2 py-1 text-xs font-semibold text-gray-500 dark:text-dark-muted bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-md shadow-sm">
                ESC
              </kbd>
              <button
                onClick={onClose}
                className="p-1.5 text-gray-400 dark:text-dark-muted hover:text-gray-600 dark:hover:text-dark-text hover:bg-gray-100 dark:hover:bg-dark-hover rounded-lg transition-all duration-150 group"
              >
                <X size={18} className="group-hover:scale-110 transition-transform" />
              </button>
            </div>
          </div>

          {/* Results */}
          <div
            ref={resultsRef}
            className="max-h-[50vh] overflow-y-auto"
          >
            {searchResults.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <Search size={40} className="mx-auto text-gray-300 dark:text-dark-muted mb-3" />
                <p className="text-gray-500 dark:text-dark-muted font-medium">No results found</p>
                <p className="text-sm text-gray-400 dark:text-dark-muted/70 mt-1">Try a different search term</p>
              </div>
            ) : (
              <>
                {/* Group by type */}
                {!query && (
                  <div className="px-4 py-2 text-xs font-semibold text-gray-400 dark:text-dark-muted uppercase tracking-wider bg-gray-50 dark:bg-dark-hover">
                    Quick Navigation
                  </div>
                )}
                {query && searchResults.some(r => r.type === 'client') && (
                  <div className="px-4 py-2 text-xs font-semibold text-gray-400 dark:text-dark-muted uppercase tracking-wider bg-gray-50 dark:bg-dark-hover">
                    Clients
                  </div>
                )}
                {searchResults.filter(r => r.type === 'client').map((result, index) => {
                  const actualIndex = searchResults.findIndex(r => r.id === result.id);
                  return (
                    <button
                      key={result.id}
                      onClick={() => handleSelect(result)}
                      className={`w-full px-5 py-3 flex items-center gap-4 text-left transition-colors ${
                        actualIndex === selectedIndex
                          ? 'bg-gold-50 dark:bg-gold-900/20 border-l-4 border-gold-500'
                          : 'hover:bg-gray-50 dark:hover:bg-dark-hover border-l-4 border-transparent'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        actualIndex === selectedIndex ? 'bg-gold-100 dark:bg-gold-800/40 text-gold-600 dark:text-gold-400' : 'bg-gray-100 dark:bg-dark-hover text-gray-500 dark:text-dark-muted'
                      }`}>
                        {getIcon(result.icon || 'Layout')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 dark:text-dark-text truncate">{result.title}</p>
                        {result.subtitle && (
                          <p className="text-sm text-gray-500 dark:text-dark-muted truncate">{result.subtitle}</p>
                        )}
                      </div>
                      <ArrowRight size={16} className={`${
                        actualIndex === selectedIndex ? 'text-gold-500' : 'text-gray-300 dark:text-dark-muted'
                      }`} />
                    </button>
                  );
                })}

                {query && searchResults.some(r => r.type === 'contact') && (
                  <div className="px-4 py-2 text-xs font-semibold text-gray-400 dark:text-dark-muted uppercase tracking-wider bg-gray-50 dark:bg-dark-hover">
                    CRM Contacts
                  </div>
                )}
                {searchResults.filter(r => r.type === 'contact').map((result) => {
                  const actualIndex = searchResults.findIndex(r => r.id === result.id);
                  return (
                    <button
                      key={result.id}
                      onClick={() => handleSelect(result)}
                      className={`w-full px-5 py-3 flex items-center gap-4 text-left transition-colors ${
                        actualIndex === selectedIndex
                          ? 'bg-gold-50 dark:bg-gold-900/20 border-l-4 border-gold-500'
                          : 'hover:bg-gray-50 dark:hover:bg-dark-hover border-l-4 border-transparent'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        actualIndex === selectedIndex ? 'bg-gold-100 dark:bg-gold-800/40 text-gold-600 dark:text-gold-400' : 'bg-gray-100 dark:bg-dark-hover text-gray-500 dark:text-dark-muted'
                      }`}>
                        {getIcon(result.icon || 'Layout')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 dark:text-dark-text truncate">{result.title}</p>
                        {result.subtitle && (
                          <p className="text-sm text-gray-500 dark:text-dark-muted truncate">{result.subtitle}</p>
                        )}
                      </div>
                      <ArrowRight size={16} className={`${
                        actualIndex === selectedIndex ? 'text-gold-500' : 'text-gray-300 dark:text-dark-muted'
                      }`} />
                    </button>
                  );
                })}

                {searchResults.filter(r => r.type === 'view').map((result) => {
                  const actualIndex = searchResults.findIndex(r => r.id === result.id);
                  return (
                    <button
                      key={result.id}
                      onClick={() => handleSelect(result)}
                      className={`w-full px-5 py-3 flex items-center gap-4 text-left transition-colors ${
                        actualIndex === selectedIndex
                          ? 'bg-gold-50 dark:bg-gold-900/20 border-l-4 border-gold-500'
                          : 'hover:bg-gray-50 dark:hover:bg-dark-hover border-l-4 border-transparent'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        actualIndex === selectedIndex ? 'bg-gold-100 dark:bg-gold-800/40 text-gold-600 dark:text-gold-400' : 'bg-gray-100 dark:bg-dark-hover text-gray-500 dark:text-dark-muted'
                      }`}>
                        {getIcon(result.icon || 'Layout')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 dark:text-dark-text truncate">{result.title}</p>
                        {result.subtitle && (
                          <p className="text-sm text-gray-500 dark:text-dark-muted truncate">{result.subtitle}</p>
                        )}
                      </div>
                      <ArrowRight size={16} className={`${
                        actualIndex === selectedIndex ? 'text-gold-500' : 'text-gray-300 dark:text-dark-muted'
                      }`} />
                    </button>
                  );
                })}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-gray-100 dark:border-dark-border bg-gray-50 dark:bg-dark-hover flex items-center justify-between text-xs text-gray-400 dark:text-dark-muted">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded text-gray-500 dark:text-dark-muted">↑</kbd>
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded text-gray-500 dark:text-dark-muted">↓</kbd>
                <span className="ml-1">to navigate</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded text-gray-500 dark:text-dark-muted">↵</kbd>
                <span className="ml-1">to select</span>
              </span>
            </div>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded text-gray-500 dark:text-dark-muted">⌘</kbd>
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded text-gray-500 dark:text-dark-muted">K</kbd>
              <span className="ml-1">to toggle</span>
            </span>
          </div>
        </div>
      </div>
    </>
  );
};

export default CommandPalette;
