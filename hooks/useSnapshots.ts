import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  snapshotsService,
  snapshotLogosService,
  snapshotColorsService,
  snapshotTypographyService,
  snapshotAssetsService,
} from '../services/snapshots.service';
import type {
  Snapshot,
  SnapshotLogo,
  SnapshotBrandColor,
  SnapshotTypography,
  SnapshotBrandAsset,
  SnapshotWithBranding,
} from '../lib/supabase/types';
import type { ServiceResult, ListOptions } from '../services/base.service';

interface UseSnapshotsOptions extends ListOptions {
  autoFetch?: boolean;
  withBranding?: boolean;
}

// Hook for all snapshots
export function useSnapshots(options: UseSnapshotsOptions = {}) {
  const { autoFetch = true, withBranding = true, ...listOptions } = options;

  const [snapshots, setSnapshots] = useState<SnapshotWithBranding[]>([]);
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = withBranding
        ? await snapshotsService.getAllWithBranding(listOptions)
        : await snapshotsService.getAll(listOptions);

      if (result.error) {
        setError(result.error);
      } else {
        setSnapshots(result.data as SnapshotWithBranding[]);
        setTotalCount(result.count);
        setIsOffline(result.offline || false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch snapshots');
    } finally {
      setLoading(false);
    }
  }, [withBranding, JSON.stringify(listOptions)]);

  useEffect(() => {
    if (autoFetch) {
      refresh();
    }
  }, [autoFetch, refresh]);

  const create = useCallback(async (
    data: Partial<Snapshot>,
    branding?: {
      logos?: Array<Partial<SnapshotLogo>>;
      colors?: Array<Partial<SnapshotBrandColor>>;
      typography?: Partial<SnapshotTypography>;
      assets?: Array<Partial<SnapshotBrandAsset>>;
    }
  ): Promise<ServiceResult<SnapshotWithBranding>> => {
    const result = await snapshotsService.createWithBranding(data, branding);
    if (result.data) {
      setSnapshots(prev => [result.data!, ...prev]);
      setTotalCount(prev => prev + 1);
    }
    return result;
  }, []);

  const update = useCallback(async (id: string, data: Partial<Snapshot>): Promise<ServiceResult<Snapshot>> => {
    const result = await snapshotsService.update(id, data);
    if (result.data) {
      setSnapshots(prev =>
        prev.map(s => (s.id === id ? { ...s, ...result.data! } : s))
      );
    }
    return result;
  }, []);

  const remove = useCallback(async (id: string): Promise<ServiceResult<boolean>> => {
    const result = await snapshotsService.delete(id);
    if (result.data) {
      setSnapshots(prev => prev.filter(s => s.id !== id));
      setTotalCount(prev => prev - 1);
    }
    return result;
  }, []);

  const duplicate = useCallback(async (id: string, newName?: string): Promise<ServiceResult<SnapshotWithBranding>> => {
    const result = await snapshotsService.duplicate(id, newName);
    if (result.data) {
      setSnapshots(prev => [result.data!, ...prev]);
      setTotalCount(prev => prev + 1);
    }
    return result;
  }, []);

  // Group snapshots by industry
  const byIndustry = useMemo(() => {
    const grouped: Record<string, SnapshotWithBranding[]> = {};
    snapshots.forEach(s => {
      const industry = s.industry || 'Other';
      if (!grouped[industry]) {
        grouped[industry] = [];
      }
      grouped[industry].push(s);
    });
    return grouped;
  }, [snapshots]);

  return {
    snapshots,
    loading,
    error,
    isOffline,
    totalCount,
    refresh,
    create,
    update,
    remove,
    duplicate,
    byIndustry,
  };
}

// Hook for single snapshot with full branding
export function useSnapshot(id: string | null) {
  const [snapshot, setSnapshot] = useState<SnapshotWithBranding | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!id) {
      setSnapshot(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await snapshotsService.getByIdWithBranding(id);
      if (result.error) {
        setError(result.error);
      } else {
        setSnapshot(result.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch snapshot');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Update snapshot
  const update = useCallback(async (data: Partial<Snapshot>) => {
    if (!id) return { data: null, error: 'No snapshot ID' };

    const result = await snapshotsService.update(id, data);
    if (result.data) {
      setSnapshot(prev => prev ? { ...prev, ...result.data! } : null);
    }
    return result;
  }, [id]);

  // Logo operations
  const addLogo = useCallback(async (data: Partial<SnapshotLogo>) => {
    if (!id) return { data: null, error: 'No snapshot ID' };

    const result = await snapshotLogosService.create({
      ...data,
      snapshot_id: id,
      display_order: snapshot?.logos?.length || 0,
    });
    if (result.data) {
      setSnapshot(prev => prev ? {
        ...prev,
        logos: [...(prev.logos || []), result.data!],
      } : null);
    }
    return result;
  }, [id, snapshot]);

  const updateLogo = useCallback(async (logoId: string, data: Partial<SnapshotLogo>) => {
    const result = await snapshotLogosService.update(logoId, data);
    if (result.data) {
      setSnapshot(prev => prev ? {
        ...prev,
        logos: prev.logos?.map(l => l.id === logoId ? { ...l, ...result.data! } : l),
      } : null);
    }
    return result;
  }, []);

  const removeLogo = useCallback(async (logoId: string) => {
    const result = await snapshotLogosService.delete(logoId);
    if (result.data) {
      setSnapshot(prev => prev ? {
        ...prev,
        logos: prev.logos?.filter(l => l.id !== logoId),
      } : null);
    }
    return result;
  }, []);

  // Color operations
  const addColor = useCallback(async (data: Partial<SnapshotBrandColor>) => {
    if (!id) return { data: null, error: 'No snapshot ID' };

    const result = await snapshotColorsService.create({
      ...data,
      snapshot_id: id,
      display_order: snapshot?.colors?.length || 0,
    });
    if (result.data) {
      setSnapshot(prev => prev ? {
        ...prev,
        colors: [...(prev.colors || []), result.data!],
      } : null);
    }
    return result;
  }, [id, snapshot]);

  const updateColor = useCallback(async (colorId: string, data: Partial<SnapshotBrandColor>) => {
    const result = await snapshotColorsService.update(colorId, data);
    if (result.data) {
      setSnapshot(prev => prev ? {
        ...prev,
        colors: prev.colors?.map(c => c.id === colorId ? { ...c, ...result.data! } : c),
      } : null);
    }
    return result;
  }, []);

  const removeColor = useCallback(async (colorId: string) => {
    const result = await snapshotColorsService.delete(colorId);
    if (result.data) {
      setSnapshot(prev => prev ? {
        ...prev,
        colors: prev.colors?.filter(c => c.id !== colorId),
      } : null);
    }
    return result;
  }, []);

  const reorderColors = useCallback(async (colorIds: string[]) => {
    await snapshotColorsService.reorder(colorIds);
    await refresh();
  }, [refresh]);

  // Typography operations
  const updateTypography = useCallback(async (data: Partial<SnapshotTypography>) => {
    if (!id) return { data: null, error: 'No snapshot ID' };

    if (snapshot?.typography) {
      const result = await snapshotTypographyService.update(snapshot.typography.id, data);
      if (result.data) {
        setSnapshot(prev => prev ? { ...prev, typography: result.data! } : null);
      }
      return result;
    } else {
      const result = await snapshotTypographyService.create({
        ...data,
        snapshot_id: id,
      });
      if (result.data) {
        setSnapshot(prev => prev ? { ...prev, typography: result.data! } : null);
      }
      return result;
    }
  }, [id, snapshot]);

  // Asset operations
  const addAsset = useCallback(async (data: Partial<SnapshotBrandAsset>) => {
    if (!id) return { data: null, error: 'No snapshot ID' };

    const result = await snapshotAssetsService.create({
      ...data,
      snapshot_id: id,
      display_order: snapshot?.assets?.length || 0,
    });
    if (result.data) {
      setSnapshot(prev => prev ? {
        ...prev,
        assets: [...(prev.assets || []), result.data!],
      } : null);
    }
    return result;
  }, [id, snapshot]);

  const updateAsset = useCallback(async (assetId: string, data: Partial<SnapshotBrandAsset>) => {
    const result = await snapshotAssetsService.update(assetId, data);
    if (result.data) {
      setSnapshot(prev => prev ? {
        ...prev,
        assets: prev.assets?.map(a => a.id === assetId ? { ...a, ...result.data! } : a),
      } : null);
    }
    return result;
  }, []);

  const removeAsset = useCallback(async (assetId: string) => {
    const result = await snapshotAssetsService.delete(assetId);
    if (result.data) {
      setSnapshot(prev => prev ? {
        ...prev,
        assets: prev.assets?.filter(a => a.id !== assetId),
      } : null);
    }
    return result;
  }, []);

  return {
    snapshot,
    loading,
    error,
    refresh,
    update,
    // Logos
    addLogo,
    updateLogo,
    removeLogo,
    // Colors
    addColor,
    updateColor,
    removeColor,
    reorderColors,
    // Typography
    updateTypography,
    // Assets
    addAsset,
    updateAsset,
    removeAsset,
  };
}

// Hook for snapshot search
export function useSnapshotSearch() {
  const [results, setResults] = useState<SnapshotWithBranding[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await snapshotsService.search(query);
      if (result.error) {
        setError(result.error);
      } else {
        setResults(result.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setResults([]);
  }, []);

  return { results, loading, error, search, clear };
}

export default useSnapshots;
