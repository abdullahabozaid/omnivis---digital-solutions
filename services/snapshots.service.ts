import { supabase, isSupabaseConfigured } from '../lib/supabase/client';
import { BaseService, ServiceResult, ServiceListResult, ListOptions } from './base.service';
import type {
  Snapshot,
  SnapshotLogo,
  SnapshotBrandColor,
  SnapshotTypography,
  SnapshotBrandAsset,
  SnapshotEmailSequence,
  SnapshotEmail,
  SnapshotForm,
  SnapshotAutomation,
  SnapshotPipeline,
  SnapshotCopyBlock,
  SnapshotWithBranding,
} from '../lib/supabase/types';
import { offlineQueue, isOnline } from '../utils/offline-queue';
import { storageService } from './storage.service';

// Snapshots Service
class SnapshotsService extends BaseService<Snapshot> {
  constructor() {
    super('snapshots', 'id');
  }

  // Get snapshot with all branding data
  async getByIdWithBranding(id: string): Promise<ServiceResult<SnapshotWithBranding>> {
    if (!this.canUseSupabase()) {
      const snapshot = await this.getById(id);
      if (!snapshot.data) {
        return { data: null, error: snapshot.error, offline: true };
      }

      // Try to get related data from cache
      const logos = ((await offlineQueue.getCachedData('snapshot_logos')) as SnapshotLogo[] || [])
        .filter(l => l.snapshot_id === id);
      const colors = ((await offlineQueue.getCachedData('snapshot_brand_colors')) as SnapshotBrandColor[] || [])
        .filter(c => c.snapshot_id === id);
      const typographyData = ((await offlineQueue.getCachedData('snapshot_typography')) as SnapshotTypography[] || [])
        .find(t => t.snapshot_id === id);
      const assets = ((await offlineQueue.getCachedData('snapshot_brand_assets')) as SnapshotBrandAsset[] || [])
        .filter(a => a.snapshot_id === id);
      const emailSequences = ((await offlineQueue.getCachedData('snapshot_email_sequences')) as SnapshotEmailSequence[] || [])
        .filter(e => e.snapshot_id === id);
      const forms = ((await offlineQueue.getCachedData('snapshot_forms')) as SnapshotForm[] || [])
        .filter(f => f.snapshot_id === id);
      const automations = ((await offlineQueue.getCachedData('snapshot_automations')) as SnapshotAutomation[] || [])
        .filter(a => a.snapshot_id === id);
      const pipelines = ((await offlineQueue.getCachedData('snapshot_pipelines')) as SnapshotPipeline[] || [])
        .filter(p => p.snapshot_id === id);
      const copyBlocks = ((await offlineQueue.getCachedData('snapshot_copy_blocks')) as SnapshotCopyBlock[] || [])
        .filter(c => c.snapshot_id === id);

      return {
        data: {
          ...snapshot.data,
          logos,
          colors,
          typography: typographyData,
          assets,
          emailSequences,
          forms,
          automations,
          pipelines,
          copyBlocks,
        },
        error: null,
        offline: true,
      };
    }

    // Fetch all related data in parallel
    const [
      snapshotResult,
      logosResult,
      colorsResult,
      typographyResult,
      assetsResult,
      emailSequencesResult,
      formsResult,
      automationsResult,
      pipelinesResult,
      copyBlocksResult,
    ] = await Promise.all([
      supabase.from('snapshots').select('*').eq('id', id).single(),
      supabase.from('snapshot_logos').select('*').eq('snapshot_id', id).order('display_order'),
      supabase.from('snapshot_brand_colors').select('*').eq('snapshot_id', id).order('display_order'),
      supabase.from('snapshot_typography').select('*').eq('snapshot_id', id).single(),
      supabase.from('snapshot_brand_assets').select('*').eq('snapshot_id', id).order('display_order'),
      supabase.from('snapshot_email_sequences').select('*').eq('snapshot_id', id).order('display_order'),
      supabase.from('snapshot_forms').select('*').eq('snapshot_id', id).order('display_order'),
      supabase.from('snapshot_automations').select('*').eq('snapshot_id', id).order('display_order'),
      supabase.from('snapshot_pipelines').select('*').eq('snapshot_id', id).order('display_order'),
      supabase.from('snapshot_copy_blocks').select('*').eq('snapshot_id', id).order('display_order'),
    ]);

    if (snapshotResult.error) {
      return { data: null, error: snapshotResult.error.message };
    }

    return {
      data: {
        ...(snapshotResult.data as any),
        logos: logosResult.data || [],
        colors: colorsResult.data || [],
        typography: typographyResult.data || undefined,
        assets: assetsResult.data || [],
        emailSequences: emailSequencesResult.data || [],
        forms: formsResult.data || [],
        automations: automationsResult.data || [],
        pipelines: pipelinesResult.data || [],
        copyBlocks: copyBlocksResult.data || [],
      } as SnapshotWithBranding,
      error: null,
    };
  }

  // Get all snapshots with basic branding info
  async getAllWithBranding(options: ListOptions = {}): Promise<ServiceListResult<SnapshotWithBranding>> {
    const result = await this.getAll(options);
    if (result.error || !result.data.length) {
      return { data: [], error: result.error, count: 0, offline: result.offline };
    }

    if (!this.canUseSupabase()) {
      // Get cached branding data
      const logos = (await offlineQueue.getCachedData('snapshot_logos')) as SnapshotLogo[] || [];
      const colors = (await offlineQueue.getCachedData('snapshot_brand_colors')) as SnapshotBrandColor[] || [];
      const typography = (await offlineQueue.getCachedData('snapshot_typography')) as SnapshotTypography[] || [];

      const data = result.data.map(snapshot => ({
        ...snapshot,
        logos: logos.filter(l => l.snapshot_id === snapshot.id),
        colors: colors.filter(c => c.snapshot_id === snapshot.id),
        typography: typography.find(t => t.snapshot_id === snapshot.id),
      })) as SnapshotWithBranding[];

      return { data, error: null, count: result.count, offline: true };
    }

    const snapshotIds = result.data.map(s => s.id);

    const [logosResult, colorsResult, typographyResult] = await Promise.all([
      supabase.from('snapshot_logos').select('*').in('snapshot_id', snapshotIds),
      supabase.from('snapshot_brand_colors').select('*').in('snapshot_id', snapshotIds),
      supabase.from('snapshot_typography').select('*').in('snapshot_id', snapshotIds),
    ]);

    const logosMap = new Map<string, SnapshotLogo[]>();
    const colorsMap = new Map<string, SnapshotBrandColor[]>();
    const typographyMap = new Map<string, SnapshotTypography>();

    (logosResult.data || []).forEach(logo => {
      const existing = logosMap.get(logo.snapshot_id) || [];
      existing.push(logo as SnapshotLogo);
      logosMap.set(logo.snapshot_id, existing);
    });

    (colorsResult.data || []).forEach(color => {
      const existing = colorsMap.get(color.snapshot_id) || [];
      existing.push(color as SnapshotBrandColor);
      colorsMap.set(color.snapshot_id, existing);
    });

    (typographyResult.data || []).forEach(typo => {
      typographyMap.set(typo.snapshot_id, typo as SnapshotTypography);
    });

    const data = result.data.map(snapshot => ({
      ...snapshot,
      logos: logosMap.get(snapshot.id) || [],
      colors: colorsMap.get(snapshot.id) || [],
      typography: typographyMap.get(snapshot.id),
    })) as SnapshotWithBranding[];

    return { data, error: null, count: result.count };
  }

  // Create snapshot with branding data
  async createWithBranding(
    snapshot: Partial<Snapshot>,
    branding?: {
      logos?: Array<Partial<SnapshotLogo>>;
      colors?: Array<Partial<SnapshotBrandColor>>;
      typography?: Partial<SnapshotTypography>;
      assets?: Array<Partial<SnapshotBrandAsset>>;
    }
  ): Promise<ServiceResult<SnapshotWithBranding>> {
    const snapshotResult = await this.create(snapshot);
    if (!snapshotResult.data) {
      return { data: null, error: snapshotResult.error };
    }

    const snapshotId = snapshotResult.data.id;
    const createdBranding: Partial<SnapshotWithBranding> = {
      logos: [],
      colors: [],
      assets: [],
    };

    // Create logos
    if (branding?.logos?.length) {
      const logosService = new SnapshotLogosService();
      for (let i = 0; i < branding.logos.length; i++) {
        const result = await logosService.create({
          ...branding.logos[i],
          snapshot_id: snapshotId,
          display_order: i,
        });
        if (result.data) createdBranding.logos!.push(result.data);
      }
    }

    // Create colors
    if (branding?.colors?.length) {
      const colorsService = new SnapshotColorsService();
      for (let i = 0; i < branding.colors.length; i++) {
        const result = await colorsService.create({
          ...branding.colors[i],
          snapshot_id: snapshotId,
          display_order: i,
        });
        if (result.data) createdBranding.colors!.push(result.data);
      }
    }

    // Create typography
    if (branding?.typography) {
      const typographyService = new SnapshotTypographyService();
      const result = await typographyService.create({
        ...branding.typography,
        snapshot_id: snapshotId,
      });
      if (result.data) createdBranding.typography = result.data;
    }

    // Create assets
    if (branding?.assets?.length) {
      const assetsService = new SnapshotAssetsService();
      for (let i = 0; i < branding.assets.length; i++) {
        const result = await assetsService.create({
          ...branding.assets[i],
          snapshot_id: snapshotId,
          display_order: i,
        });
        if (result.data) createdBranding.assets!.push(result.data);
      }
    }

    return {
      data: { ...snapshotResult.data, ...createdBranding } as SnapshotWithBranding,
      error: null,
      offline: snapshotResult.offline,
    };
  }

  // Duplicate snapshot
  async duplicate(id: string, newName?: string): Promise<ServiceResult<SnapshotWithBranding>> {
    const original = await this.getByIdWithBranding(id);
    if (!original.data) {
      return { data: null, error: original.error };
    }

    const { id: _, created_at, updated_at, ...snapshotData } = original.data;

    return this.createWithBranding(
      { ...snapshotData, name: newName || `${snapshotData.name} (Copy)` },
      {
        logos: original.data.logos?.map(({ id, snapshot_id, ...l }) => l),
        colors: original.data.colors?.map(({ id, snapshot_id, ...c }) => c),
        typography: original.data.typography
          ? (({ id, snapshot_id, ...t }) => t)(original.data.typography)
          : undefined,
        assets: original.data.assets?.map(({ id, snapshot_id, ...a }) => a),
      }
    );
  }

  // Search snapshots
  async search(query: string): Promise<ServiceListResult<SnapshotWithBranding>> {
    return this.getAllWithBranding({
      search: { column: 'name', query },
      pageSize: 20,
    });
  }

  // Get by industry
  async getByIndustry(industry: string): Promise<ServiceListResult<SnapshotWithBranding>> {
    return this.getAllWithBranding({
      filters: { industry },
    });
  }

  // Increment times applied
  async incrementTimesApplied(id: string): Promise<ServiceResult<Snapshot>> {
    const snapshot = await this.getById(id);
    if (!snapshot.data) {
      return { data: null, error: snapshot.error };
    }

    return this.update(id, {
      times_applied: (snapshot.data.times_applied || 0) + 1,
    } as Partial<Snapshot>);
  }
}

// Snapshot Logos Service
class SnapshotLogosService extends BaseService<SnapshotLogo> {
  constructor() {
    super('snapshot_logos', 'id');
  }

  async getBySnapshot(snapshotId: string): Promise<ServiceListResult<SnapshotLogo>> {
    return this.getAll({
      filters: { snapshot_id: snapshotId },
      orderBy: 'display_order',
      orderDirection: 'asc',
    });
  }

  // Upload logo and create record
  async uploadAndCreate(
    snapshotId: string,
    file: File,
    data: Partial<SnapshotLogo>
  ): Promise<ServiceResult<SnapshotLogo>> {
    const uploadResult = await storageService.uploadBrandAsset(file, snapshotId);
    if (!uploadResult.data) {
      return { data: null, error: uploadResult.error };
    }

    return this.create({
      ...data,
      snapshot_id: snapshotId,
      url: uploadResult.data,
    });
  }
}

// Snapshot Colors Service
class SnapshotColorsService extends BaseService<SnapshotBrandColor> {
  constructor() {
    super('snapshot_brand_colors', 'id');
  }

  async getBySnapshot(snapshotId: string): Promise<ServiceListResult<SnapshotBrandColor>> {
    return this.getAll({
      filters: { snapshot_id: snapshotId },
      orderBy: 'display_order',
      orderDirection: 'asc',
    });
  }

  // Reorder colors
  async reorder(colorIds: string[]): Promise<ServiceResult<boolean>> {
    if (!this.canUseSupabase()) {
      for (let i = 0; i < colorIds.length; i++) {
        await this.update(colorIds[i], { display_order: i } as Partial<SnapshotBrandColor>);
      }
      return { data: true, error: null, offline: true };
    }

    const updates = colorIds.map((id, index) =>
      (supabase.from('snapshot_brand_colors') as any).update({ display_order: index }).eq('id', id)
    );

    await Promise.all(updates);
    return { data: true, error: null };
  }
}

// Snapshot Typography Service
class SnapshotTypographyService extends BaseService<SnapshotTypography> {
  constructor() {
    super('snapshot_typography', 'id');
  }

  async getBySnapshot(snapshotId: string): Promise<ServiceResult<SnapshotTypography>> {
    const result = await this.getAll({
      filters: { snapshot_id: snapshotId },
      pageSize: 1,
    });

    if (result.data.length > 0) {
      return { data: result.data[0], error: null, offline: result.offline };
    }

    return { data: null, error: 'Typography not found' };
  }
}

// Snapshot Assets Service
class SnapshotAssetsService extends BaseService<SnapshotBrandAsset> {
  constructor() {
    super('snapshot_brand_assets', 'id');
  }

  async getBySnapshot(snapshotId: string): Promise<ServiceListResult<SnapshotBrandAsset>> {
    return this.getAll({
      filters: { snapshot_id: snapshotId },
      orderBy: 'display_order',
      orderDirection: 'asc',
    });
  }

  // Upload asset and create record
  async uploadAndCreate(
    snapshotId: string,
    file: File,
    data: Partial<SnapshotBrandAsset>
  ): Promise<ServiceResult<SnapshotBrandAsset>> {
    const uploadResult = await storageService.uploadBrandAsset(file, snapshotId);
    if (!uploadResult.data) {
      return { data: null, error: uploadResult.error };
    }

    return this.create({
      ...data,
      snapshot_id: snapshotId,
      url: uploadResult.data,
    });
  }
}

// Snapshot Email Sequences Service
class SnapshotEmailSequencesService extends BaseService<SnapshotEmailSequence> {
  constructor() {
    super('snapshot_email_sequences', 'id');
  }

  async getBySnapshot(snapshotId: string): Promise<ServiceListResult<SnapshotEmailSequence>> {
    return this.getAll({
      filters: { snapshot_id: snapshotId },
      orderBy: 'display_order',
      orderDirection: 'asc',
    });
  }
}

// Snapshot Emails Service
class SnapshotEmailsService extends BaseService<SnapshotEmail> {
  constructor() {
    super('snapshot_emails', 'id');
  }

  async getBySequence(sequenceId: string): Promise<ServiceListResult<SnapshotEmail>> {
    return this.getAll({
      filters: { sequence_id: sequenceId },
      orderBy: 'display_order',
      orderDirection: 'asc',
    });
  }
}

// Snapshot Forms Service
class SnapshotFormsService extends BaseService<SnapshotForm> {
  constructor() {
    super('snapshot_forms', 'id');
  }

  async getBySnapshot(snapshotId: string): Promise<ServiceListResult<SnapshotForm>> {
    return this.getAll({
      filters: { snapshot_id: snapshotId },
      orderBy: 'display_order',
      orderDirection: 'asc',
    });
  }
}

// Snapshot Automations Service
class SnapshotAutomationsService extends BaseService<SnapshotAutomation> {
  constructor() {
    super('snapshot_automations', 'id');
  }

  async getBySnapshot(snapshotId: string): Promise<ServiceListResult<SnapshotAutomation>> {
    return this.getAll({
      filters: { snapshot_id: snapshotId },
      orderBy: 'display_order',
      orderDirection: 'asc',
    });
  }
}

// Snapshot Pipelines Service
class SnapshotPipelinesService extends BaseService<SnapshotPipeline> {
  constructor() {
    super('snapshot_pipelines', 'id');
  }

  async getBySnapshot(snapshotId: string): Promise<ServiceListResult<SnapshotPipeline>> {
    return this.getAll({
      filters: { snapshot_id: snapshotId },
      orderBy: 'display_order',
      orderDirection: 'asc',
    });
  }
}

// Snapshot Copy Blocks Service
class SnapshotCopyBlocksService extends BaseService<SnapshotCopyBlock> {
  constructor() {
    super('snapshot_copy_blocks', 'id');
  }

  async getBySnapshot(snapshotId: string): Promise<ServiceListResult<SnapshotCopyBlock>> {
    return this.getAll({
      filters: { snapshot_id: snapshotId },
      orderBy: 'display_order',
      orderDirection: 'asc',
    });
  }
}

// Export instances
export const snapshotsService = new SnapshotsService();
export const snapshotLogosService = new SnapshotLogosService();
export const snapshotColorsService = new SnapshotColorsService();
export const snapshotTypographyService = new SnapshotTypographyService();
export const snapshotAssetsService = new SnapshotAssetsService();
export const snapshotEmailSequencesService = new SnapshotEmailSequencesService();
export const snapshotEmailsService = new SnapshotEmailsService();
export const snapshotFormsService = new SnapshotFormsService();
export const snapshotAutomationsService = new SnapshotAutomationsService();
export const snapshotPipelinesService = new SnapshotPipelinesService();
export const snapshotCopyBlocksService = new SnapshotCopyBlocksService();

// Export classes for extension
export {
  SnapshotsService,
  SnapshotLogosService,
  SnapshotColorsService,
  SnapshotTypographyService,
  SnapshotAssetsService,
  SnapshotEmailSequencesService,
  SnapshotEmailsService,
  SnapshotFormsService,
  SnapshotAutomationsService,
  SnapshotPipelinesService,
  SnapshotCopyBlocksService,
};
