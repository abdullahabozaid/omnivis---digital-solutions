export type ViewState = 'overview' | 'clients' | 'crm' | 'templates' | 'clientwork' | 'calendar' | 'tasks' | 'settings' | 'analytics' | 'websites';

// User Settings
export interface UserSettings {
  profile: {
    name: string;
    email: string;
    role: string;
    avatarInitials: string;
  };
  notifications: {
    emailAlerts: boolean;
    inAppNotifications: boolean;
    taskReminders: boolean;
    clientUpdates: boolean;
  };
  display: {
    greetingName: string;
  };
}

export type ContractType = 'monthly' | 'annual';

export interface PipelineStage {
  id: string;
  label: string;
  color: string;
  defaultProbability?: number; // Auto-set probability when contact enters stage
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  website: string;
  plan: 'starter' | 'growth' | 'enterprise';
  monthlyPayment: number;
  status: 'active' | 'paused' | 'cancelled';
  startDate: string;
  templateId: string;
  tagIds?: string[]; // Tags for categorization
  sourceContactId?: string; // Link to original CRM contact if converted
  customFields?: { [fieldId: string]: string | number | boolean | null }; // Custom field values
}

// Deal outcome types
export type DealOutcome = 'open' | 'won' | 'lost';

// Loss reason options
export const LOSS_REASONS = [
  'Price too high',
  'Went with competitor',
  'No budget',
  'Project cancelled',
  'No response',
  'Bad timing',
  'Not a good fit',
  'Other',
] as const;

export type LossReason = typeof LOSS_REASONS[number];

export interface CrmContact {
  id: string;
  name: string;
  email: string;
  company: string;
  phone: string;
  stageId: string;
  value: number;
  contractType: ContractType;
  notes: string;
  lastContact: string;
  createdAt: string;
  // Forecasting fields
  probability?: number; // 0-100, win probability
  expectedCloseDate?: string; // ISO date string
  // Tags and conversion
  tagIds?: string[]; // Tags for categorization
  convertedToClientId?: string; // Link to client if converted
  convertedAt?: string; // Timestamp of conversion
  source?: string; // Lead source (Website, Referral, LinkedIn, etc.)
  // Deal outcome tracking
  outcome?: DealOutcome; // open, won, or lost
  closedAt?: string; // ISO date when deal was closed (won or lost)
  lossReason?: LossReason; // Why the deal was lost
  lossNotes?: string; // Additional notes about the loss
  // Custom fields
  customFields?: { [fieldId: string]: string | number | boolean | null };
}

export interface Pipeline {
  id: string;
  name: string;
  stages: PipelineStage[];
  contacts: CrmContact[];
}

export interface WebsiteTemplate {
  id: string;
  name: string;
  category: string;
  thumbnail: string;
  usedBy: number;
}

// Tags System
export interface Tag {
  id: string;
  name: string;
  color: string; // Tailwind color class e.g., 'bg-blue-500'
}

// Activity Timeline
export interface Activity {
  id: string;
  type: 'note' | 'call' | 'email' | 'meeting' | 'stage_change' | 'status_change' | 'created' | 'converted';
  entityType: 'client' | 'contact';
  entityId: string;
  title: string;
  description?: string;
  timestamp: string;
  metadata?: {
    oldStage?: string;
    newStage?: string;
    oldStatus?: string;
    newStatus?: string;
    duration?: number; // For calls (minutes)
    outcome?: string; // For calls/meetings
  };
}

// Saved Views/Filters for CRM
export interface CrmSavedView {
  id: string;
  name: string;
  pipelineId: string;
  outcomeFilter: 'all' | 'open' | 'won' | 'lost';
  stageFilter?: string; // stage ID or 'all'
  searchQuery?: string;
  contractTypeFilter?: 'all' | 'monthly' | 'annual';
  sourceFilter?: string;
  createdAt: string;
  isDefault?: boolean;
}

// Search/Command Palette
export interface SearchResult {
  id: string;
  type: 'client' | 'contact' | 'task' | 'event' | 'view';
  title: string;
  subtitle?: string;
  icon?: string;
  action?: () => void;
}

// Custom Fields System
export type CustomFieldType = 'text' | 'number' | 'dropdown' | 'date' | 'checkbox' | 'url' | 'email' | 'phone' | 'currency';

export interface CustomFieldOption {
  id: string;
  label: string;
  color?: string; // Optional color for dropdown options
}

export interface CustomField {
  id: string;
  name: string;
  type: CustomFieldType;
  entityType: 'contact' | 'client' | 'both'; // Which entity this field applies to
  options?: CustomFieldOption[]; // For dropdown type
  required?: boolean;
  placeholder?: string;
  defaultValue?: string | number | boolean;
  order: number; // Display order
  createdAt: string;
}

export interface CustomFieldValue {
  fieldId: string;
  value: string | number | boolean | null;
}

// Brand Guidelines - Reusable for both Clients and Templates
export interface BrandColor {
  hex: string;
  name: string;
  role: 'primary' | 'secondary' | 'accent' | 'optional';
}

export interface BrandTypography {
  primaryFont: string;
  secondaryFont?: string;
  headingFont?: string;
}

export interface BrandGuidelines {
  colors: BrandColor[];
  typography: BrandTypography;
  logoUrl?: string;
}

// Dashboard Goals
export interface DashboardGoals {
  monthlyRevenue: number;
  yearlyRevenue: number;
  totalClients: number;
  pipelineValue: number;
}

// Projects System
export interface Project {
  id: string;
  name: string;
  description?: string;
  color: string; // Tailwind color class e.g., 'bg-blue-500'
  clientId?: string; // Optional link to a client
  clientName?: string;
  status: 'active' | 'completed' | 'on_hold' | 'archived';
  taskIds: string[]; // Array of task IDs in this project
  createdAt: string;
  updatedAt: string;
}

// Project colors for selection
export const PROJECT_COLORS = [
  'bg-red-500',
  'bg-orange-500',
  'bg-amber-500',
  'bg-yellow-500',
  'bg-lime-500',
  'bg-green-500',
  'bg-emerald-500',
  'bg-teal-500',
  'bg-cyan-500',
  'bg-sky-500',
  'bg-blue-500',
  'bg-indigo-500',
  'bg-violet-500',
  'bg-purple-500',
  'bg-fuchsia-500',
  'bg-pink-500',
  'bg-rose-500',
] as const;

// ============================================
// SNAPSHOT ENGINE TYPES
// ============================================

// Industry constants for snapshots
export const SNAPSHOT_INDUSTRIES = [
  { id: 'plumbing', name: 'Plumbing', icon: '🔧', color: 'bg-blue-500' },
  { id: 'restaurant', name: 'Restaurant', icon: '🍽️', color: 'bg-orange-500' },
  { id: 'real-estate', name: 'Real Estate', icon: '🏠', color: 'bg-green-500' },
  { id: 'consultant', name: 'Consultant', icon: '💼', color: 'bg-purple-500' },
  { id: 'healthcare', name: 'Healthcare', icon: '🏥', color: 'bg-red-500' },
  { id: 'fitness', name: 'Fitness', icon: '💪', color: 'bg-pink-500' },
  { id: 'retail', name: 'Retail', icon: '🛍️', color: 'bg-amber-500' },
  { id: 'other', name: 'Other', icon: '📦', color: 'bg-gray-500' },
] as const;

export type SnapshotIndustry = typeof SNAPSHOT_INDUSTRIES[number]['id'];

// Snapshot asset types
export interface SnapshotWebsitePage {
  id: string;
  name: string;
  url: string;
  thumbnail?: string;
}

export interface SnapshotWebsiteTemplate {
  id: string;
  name: string;
  pages: SnapshotWebsitePage[]; // Rich page objects with URLs and thumbnails
  baseUrl?: string; // Base URL for the template (e.g., "https://plumber-pro.webflow.io")
  thumbnail?: string;
}

// Email variant for A/B testing
export interface SnapshotEmailVariant {
  id: string;
  label: string; // A, B, C, etc.
  subject: string;
  previewText: string;
  body?: string;
  weight?: number; // For weighted rotation (percentage, 0-100)
}

// Rotation method for email variants
export type EmailVariantRotation = 'random' | 'sequential' | 'weighted';

// Individual email within a sequence
export interface SnapshotEmail {
  subject: string;
  previewText: string;
  body?: string; // Full email HTML/text content
  delayDays?: number; // Days after previous email (0 = immediately)
  delayHours?: number; // Hours after previous email
  // A/B testing variants
  variants?: SnapshotEmailVariant[]; // If present, use variants instead of subject/body
  rotationMethod?: EmailVariantRotation; // How to rotate between variants
}

export interface SnapshotEmailSequence {
  id: string;
  name: string;
  emails: SnapshotEmail[];
  trigger: string; // e.g., 'welcome', 'follow-up', 'review-request'
}

export type FormPlatform = 'typeform' | 'jotform' | 'google-forms' | 'tally' | 'fillout' | 'custom';

export interface SnapshotForm {
  id: string;
  name: string;
  fields: string[];
  type: 'contact' | 'booking' | 'quote' | 'feedback';
  embedUrl?: string; // URL to the form
  platform?: FormPlatform;
  description?: string;
}

export type AutomationPlatform = 'n8n' | 'zapier' | 'make' | 'gohighlevel' | 'pabbly' | 'custom';

export interface SnapshotAutomation {
  id: string;
  name: string;
  trigger: string;
  actions: string[];
  platform: AutomationPlatform; // Where the automation is hosted
  workflowUrl?: string; // Link to the workflow
  description?: string;
}

export interface SnapshotPipeline {
  id: string;
  name: string;
  stages: { name: string; color: string; probability: number; }[];
  description?: string;
}

export interface SnapshotCopyBlock {
  id: string;
  name: string;
  type: 'headline' | 'cta' | 'description' | 'testimonial';
  content: string;
}

// Branding types for snapshots
export interface SnapshotLogo {
  id: string;
  name: string;
  type: 'primary' | 'secondary' | 'favicon' | 'light' | 'dark' | 'icon';
  url: string; // Data URL or external URL
  width?: number;
  height?: number;
}

export interface GradientStop {
  color: string;
  position: number; // 0-100 percentage
}

export interface SnapshotBrandColor {
  id: string;
  name: string;
  hex: string; // For solid colors, or first color of gradient
  hex2?: string; // Second color for gradient (legacy, use gradientStops for multi-stop)
  gradientStops?: GradientStop[]; // Multi-stop gradient colors
  gradientAngle?: number; // Gradient angle in degrees (0-360)
  isGradient?: boolean;
  role: string; // Custom role name like 'primary', 'background', 'accent', etc.
  shape?: 'circle' | 'square'; // Display shape
}

export interface SnapshotTypography {
  headingFont: string;
  headingWeight: string;
  bodyFont: string;
  bodyWeight: string;
  baseFontSize?: number;
}

export interface SnapshotBrandAsset {
  id: string;
  name: string;
  type: 'image' | 'icon' | 'pattern' | 'illustration' | 'photo';
  url: string; // Data URL or external URL
  tags?: string[];
}

export interface SnapshotBranding {
  logos: SnapshotLogo[];
  colors: SnapshotBrandColor[];
  typography: SnapshotTypography;
  assets: SnapshotBrandAsset[];
  guidelines?: string; // Voice/tone notes and usage rules
}

// Main Snapshot interface
export interface Snapshot {
  id: string;
  name: string;
  industry: SnapshotIndustry;
  description: string;
  thumbnail?: string;
  version: string;
  createdAt: string;
  updatedAt: string;
  createdFrom?: string; // clientId if saved from client

  // Assets
  websiteTemplates: SnapshotWebsiteTemplate[];
  emailSequences: SnapshotEmailSequence[];
  forms: SnapshotForm[];
  automations: SnapshotAutomation[];
  pipelines: SnapshotPipeline[];
  copyBlocks: SnapshotCopyBlock[];
  branding?: SnapshotBranding; // Brand assets and guidelines

  // Stats
  timesApplied: number;
}

// For partial apply
export interface SnapshotApplyOptions {
  websiteTemplates: boolean;
  emailSequences: boolean;
  forms: boolean;
  automations: boolean;
  pipelines: boolean;
  copyBlocks: boolean;
  branding: boolean;
  selectedIds?: {
    websiteTemplates?: string[];
    emailSequences?: string[];
    forms?: string[];
    automations?: string[];
    pipelines?: string[];
    copyBlocks?: string[];
  };
}

// ============================================
// WEBSITE LIBRARY TYPES
// ============================================

// Industry options for websites
export const WEBSITE_INDUSTRIES = [
  { id: 'home-services', name: 'Home Services', icon: '🔧', color: 'bg-blue-500' },
  { id: 'restaurant', name: 'Restaurant', icon: '🍽️', color: 'bg-orange-500' },
  { id: 'healthcare', name: 'Healthcare', icon: '🏥', color: 'bg-red-500' },
  { id: 'real-estate', name: 'Real Estate', icon: '🏠', color: 'bg-green-500' },
  { id: 'professional', name: 'Professional Services', icon: '💼', color: 'bg-purple-500' },
  { id: 'fitness', name: 'Fitness & Wellness', icon: '💪', color: 'bg-pink-500' },
  { id: 'retail', name: 'Retail & E-commerce', icon: '🛍️', color: 'bg-amber-500' },
  { id: 'education', name: 'Education', icon: '📚', color: 'bg-indigo-500' },
  { id: 'creative', name: 'Creative & Design', icon: '🎨', color: 'bg-fuchsia-500' },
  { id: 'technology', name: 'Technology', icon: '💻', color: 'bg-cyan-500' },
  { id: 'other', name: 'Other', icon: '📦', color: 'bg-gray-500' },
] as const;

export type WebsiteIndustry = typeof WEBSITE_INDUSTRIES[number]['id'];

// Individual page within a website
export interface WebsitePage {
  id: string;
  name: string; // Internal label for display in CRM (e.g., "About Us", "Services")
  url: string; // Full URL to the page (e.g., "https://site.com/about")
  thumbnail?: string;
  order: number;
  isHomePage?: boolean; // True for auto-generated first page
}

// Preview mode for website cards
export type WebsitePreviewMode = 'thumbnail' | 'live';

// Website template in the library
export interface LibraryWebsite {
  id: string;
  name: string;
  industry: WebsiteIndustry;
  liveUrl: string; // Full URL like "https://plumber-pro.webflow.io"
  thumbnail?: string; // Homepage screenshot (used when previewMode is 'thumbnail')
  previewMode: WebsitePreviewMode; // 'thumbnail' for uploaded image, 'live' for iframe embed
  pages: WebsitePage[];
  linkedSnapshotIds: string[]; // Snapshots this website is linked to
  createdAt: string;
  updatedAt: string;
  notes?: string;
}
