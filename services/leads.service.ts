import { BaseService, ServiceResult, ServiceListResult, ListOptions } from './base.service';
import type { Lead } from '../lib/supabase/types';
import type { LeadIndustry, LeadStatus, WebsiteRating } from '../types';
import { offlineQueue } from '../utils/offline-queue';

// Extended Lead type for application use
export interface AppLead {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  website: string;
  websiteRating: WebsiteRating | null;
  industry: LeadIndustry;
  status: LeadStatus;
  notes: string;
  source?: string;
  createdAt: string;
  updatedAt: string;
}

// Transform database row to app format
function dbToApp(lead: Lead): AppLead {
  return {
    id: lead.id,
    name: lead.name,
    email: lead.email || '',
    phone: lead.phone || '',
    company: lead.company || '',
    website: lead.website || '',
    websiteRating: lead.website_rating as WebsiteRating | null,
    industry: lead.industry as LeadIndustry,
    status: lead.status as LeadStatus,
    notes: lead.notes || '',
    source: lead.source || undefined,
    createdAt: lead.created_at,
    updatedAt: lead.updated_at,
  };
}

// Transform app format to database row
function appToDb(lead: Partial<AppLead>): Partial<Lead> {
  const db: Partial<Lead> = {};

  if (lead.id !== undefined) db.id = lead.id;
  if (lead.name !== undefined) db.name = lead.name;
  if (lead.email !== undefined) db.email = lead.email || null;
  if (lead.phone !== undefined) db.phone = lead.phone || null;
  if (lead.company !== undefined) db.company = lead.company || null;
  if (lead.website !== undefined) db.website = lead.website || null;
  if (lead.websiteRating !== undefined) db.website_rating = lead.websiteRating;
  if (lead.industry !== undefined) db.industry = lead.industry;
  if (lead.status !== undefined) db.status = lead.status;
  if (lead.notes !== undefined) db.notes = lead.notes || null;
  if (lead.source !== undefined) db.source = lead.source || null;

  return db;
}

export class LeadsService extends BaseService<Lead> {
  constructor() {
    super('leads', 'id');
  }

  // Get lead by ID (app format)
  async getLeadById(id: string): Promise<ServiceResult<AppLead>> {
    const result = await this.getById(id);
    if (result.data) {
      return {
        data: dbToApp(result.data),
        error: null,
        offline: result.offline,
      };
    }
    return { data: null, error: result.error, offline: result.offline };
  }

  // Get all leads (app format)
  async getAllLeads(options: ListOptions = {}): Promise<ServiceListResult<AppLead>> {
    const result = await this.getAll(options);
    return {
      data: result.data.map(dbToApp),
      error: result.error,
      count: result.count,
      offline: result.offline,
    };
  }

  // Get leads by industry
  async getByIndustry(industry: LeadIndustry, options: ListOptions = {}): Promise<ServiceListResult<AppLead>> {
    const result = await this.getAll({
      ...options,
      filters: { ...options.filters, industry },
    });
    return {
      data: result.data.map(dbToApp),
      error: result.error,
      count: result.count,
      offline: result.offline,
    };
  }

  // Get leads by status
  async getByStatus(status: LeadStatus, options: ListOptions = {}): Promise<ServiceListResult<AppLead>> {
    const result = await this.getAll({
      ...options,
      filters: { ...options.filters, status },
    });
    return {
      data: result.data.map(dbToApp),
      error: result.error,
      count: result.count,
      offline: result.offline,
    };
  }

  // Get leads by industry and status
  async getByIndustryAndStatus(
    industry: LeadIndustry,
    status: LeadStatus,
    options: ListOptions = {}
  ): Promise<ServiceListResult<AppLead>> {
    const result = await this.getAll({
      ...options,
      filters: { ...options.filters, industry, status },
    });
    return {
      data: result.data.map(dbToApp),
      error: result.error,
      count: result.count,
      offline: result.offline,
    };
  }

  // Create a new lead
  async createLead(lead: Omit<AppLead, 'id' | 'createdAt' | 'updatedAt'>): Promise<ServiceResult<AppLead>> {
    const dbLead = appToDb(lead);
    const result = await this.create(dbLead);
    if (result.data) {
      return {
        data: dbToApp(result.data),
        error: null,
        offline: result.offline,
      };
    }
    return { data: null, error: result.error, offline: result.offline };
  }

  // Update a lead
  async updateLead(id: string, lead: Partial<AppLead>): Promise<ServiceResult<AppLead>> {
    const dbLead = appToDb(lead);
    const result = await this.update(id, dbLead);
    if (result.data) {
      return {
        data: dbToApp(result.data),
        error: null,
        offline: result.offline,
      };
    }
    return { data: null, error: result.error, offline: result.offline };
  }

  // Update lead status (for drag and drop)
  async updateStatus(id: string, status: LeadStatus): Promise<ServiceResult<AppLead>> {
    return this.updateLead(id, { status });
  }

  // Search leads
  async searchLeads(query: string, industry?: LeadIndustry): Promise<ServiceListResult<AppLead>> {
    const options: ListOptions = {
      search: { column: 'name', query },
      pageSize: 50,
    };

    if (industry) {
      options.filters = { industry };
    }

    const result = await this.getAll(options);
    return {
      data: result.data.map(dbToApp),
      error: result.error,
      count: result.count,
      offline: result.offline,
    };
  }

  // Bulk create leads (for CSV import)
  async bulkCreateLeads(leads: Omit<AppLead, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<ServiceListResult<AppLead>> {
    const dbLeads = leads.map(appToDb);
    const result = await this.createMany(dbLeads);
    return {
      data: result.data.map(dbToApp),
      error: result.error,
      count: result.count,
      offline: result.offline,
    };
  }

  // Get count by industry
  async getCountByIndustry(): Promise<Record<LeadIndustry, number>> {
    const result = await this.getAll({ pageSize: 1000 });
    const counts: Record<string, number> = {};

    result.data.forEach(lead => {
      const industry = lead.industry;
      counts[industry] = (counts[industry] || 0) + 1;
    });

    return counts as Record<LeadIndustry, number>;
  }

  // Get count by status for an industry
  async getStatusCountsForIndustry(industry: LeadIndustry): Promise<Record<LeadStatus, number>> {
    const result = await this.getByIndustry(industry, { pageSize: 1000 });
    const counts: Record<string, number> = {
      new: 0,
      contacted: 0,
      converted: 0,
      lost: 0,
    };

    result.data.forEach(lead => {
      counts[lead.status] = (counts[lead.status] || 0) + 1;
    });

    return counts as Record<LeadStatus, number>;
  }
}

export const leadsService = new LeadsService();
export default leadsService;
