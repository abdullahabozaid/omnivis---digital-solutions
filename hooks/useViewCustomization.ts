import { useState, useCallback, useEffect } from 'react';
import { ViewCustomization } from '../types';

const STORAGE_KEY = 'tawfeeq_view_customization';

// Default widget order for dashboard
export const DEFAULT_WIDGET_ORDER = [
  'stats',
  'productivity',
  'pipeline-clients',
  'calendar',
];

const defaultCustomization: ViewCustomization = {
  dashboard: { hiddenItems: [], widgetOrder: DEFAULT_WIDGET_ORDER },
  crm: { hiddenItems: [] },
  tasks: { hiddenItems: [] },
  calendar: { hiddenItems: [] },
};

// Safe parse helper
const safeParseStorage = <T>(key: string, fallback: T): T => {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return fallback;
    return JSON.parse(stored) as T;
  } catch {
    return fallback;
  }
};

export type ViewType = keyof ViewCustomization;

export function useViewCustomization() {
  const [customization, setCustomization] = useState<ViewCustomization>(() =>
    safeParseStorage(STORAGE_KEY, defaultCustomization)
  );

  // Persist to localStorage whenever customization changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customization));
  }, [customization]);

  // Check if an item is visible (not in hiddenItems)
  const isVisible = useCallback((view: ViewType, itemId: string): boolean => {
    const viewConfig = customization[view];
    if (!viewConfig) return true;
    return !viewConfig.hiddenItems.includes(itemId);
  }, [customization]);

  // Toggle visibility of an item
  const toggleVisibility = useCallback((view: ViewType, itemId: string) => {
    setCustomization(prev => {
      const viewConfig = prev[view];
      const isCurrentlyHidden = viewConfig.hiddenItems.includes(itemId);

      return {
        ...prev,
        [view]: {
          ...viewConfig,
          hiddenItems: isCurrentlyHidden
            ? viewConfig.hiddenItems.filter(id => id !== itemId)
            : [...viewConfig.hiddenItems, itemId],
        },
      };
    });
  }, []);

  // Hide an item
  const hideItem = useCallback((view: ViewType, itemId: string) => {
    setCustomization(prev => {
      const viewConfig = prev[view];
      if (viewConfig.hiddenItems.includes(itemId)) return prev;

      return {
        ...prev,
        [view]: {
          ...viewConfig,
          hiddenItems: [...viewConfig.hiddenItems, itemId],
        },
      };
    });
  }, []);

  // Show an item
  const showItem = useCallback((view: ViewType, itemId: string) => {
    setCustomization(prev => {
      const viewConfig = prev[view];

      return {
        ...prev,
        [view]: {
          ...viewConfig,
          hiddenItems: viewConfig.hiddenItems.filter(id => id !== itemId),
        },
      };
    });
  }, []);

  // Reset a specific view to show all items
  const resetView = useCallback((view: ViewType) => {
    setCustomization(prev => ({
      ...prev,
      [view]: { hiddenItems: [] },
    }));
  }, []);

  // Reset all views
  const resetAll = useCallback(() => {
    setCustomization(defaultCustomization);
  }, []);

  // Get count of hidden items for a view
  const getHiddenCount = useCallback((view: ViewType): number => {
    return customization[view]?.hiddenItems.length ?? 0;
  }, [customization]);

  // Get all hidden item IDs for a view
  const getHiddenItems = useCallback((view: ViewType): string[] => {
    return customization[view]?.hiddenItems ?? [];
  }, [customization]);

  // Get widget order for dashboard
  const getWidgetOrder = useCallback((): string[] => {
    return customization.dashboard?.widgetOrder ?? DEFAULT_WIDGET_ORDER;
  }, [customization]);

  // Set widget order for dashboard
  const setWidgetOrder = useCallback((newOrder: string[]) => {
    setCustomization(prev => ({
      ...prev,
      dashboard: {
        ...prev.dashboard,
        widgetOrder: newOrder,
      },
    }));
  }, []);

  // Move widget up in order
  const moveWidgetUp = useCallback((widgetId: string) => {
    setCustomization(prev => {
      const order = prev.dashboard?.widgetOrder ?? DEFAULT_WIDGET_ORDER;
      const index = order.indexOf(widgetId);
      if (index <= 0) return prev;

      const newOrder = [...order];
      [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];

      return {
        ...prev,
        dashboard: {
          ...prev.dashboard,
          widgetOrder: newOrder,
        },
      };
    });
  }, []);

  // Move widget down in order
  const moveWidgetDown = useCallback((widgetId: string) => {
    setCustomization(prev => {
      const order = prev.dashboard?.widgetOrder ?? DEFAULT_WIDGET_ORDER;
      const index = order.indexOf(widgetId);
      if (index < 0 || index >= order.length - 1) return prev;

      const newOrder = [...order];
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];

      return {
        ...prev,
        dashboard: {
          ...prev.dashboard,
          widgetOrder: newOrder,
        },
      };
    });
  }, []);

  // Reset widget order to default
  const resetWidgetOrder = useCallback(() => {
    setCustomization(prev => ({
      ...prev,
      dashboard: {
        ...prev.dashboard,
        widgetOrder: DEFAULT_WIDGET_ORDER,
      },
    }));
  }, []);

  return {
    customization,
    isVisible,
    toggleVisibility,
    hideItem,
    showItem,
    resetView,
    resetAll,
    getHiddenCount,
    getHiddenItems,
    getWidgetOrder,
    setWidgetOrder,
    moveWidgetUp,
    moveWidgetDown,
    resetWidgetOrder,
  };
}

// Export a simple hook for components that just need visibility checking
export function useItemVisibility(view: ViewType) {
  const { isVisible, toggleVisibility, getHiddenCount, resetView } = useViewCustomization();

  return {
    isVisible: (itemId: string) => isVisible(view, itemId),
    toggleVisibility: (itemId: string) => toggleVisibility(view, itemId),
    hiddenCount: getHiddenCount(view),
    resetView: () => resetView(view),
  };
}
