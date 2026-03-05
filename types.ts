export type ViewState = 'overview' | 'clients' | 'crm' | 'templates' | 'clientwork' | 'calendar' | 'tasks' | 'settings' | 'analytics' | 'websites' | 'leads' | 'catalog';

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

// View Customization - show/hide sections
export interface ViewCustomization {
  dashboard: {
    hiddenItems: string[]; // IDs of hidden sections
    widgetOrder?: string[]; // Order of dashboard widgets
  };
  crm: {
    hiddenItems: string[];
  };
  tasks: {
    hiddenItems: string[];
  };
  calendar: {
    hiddenItems: string[];
  };
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
  // New fields for enhanced filtering
  tier: WebsiteTier;
  websiteType: WebsiteType;
  style: WebsiteStyle;
  features: WebsiteFeature[];
  isFavorite?: boolean;
}

// Website Tier (Premium/Basic filter)
export type WebsiteTier = 'premium' | 'basic' | 'starter';

export const WEBSITE_TIERS = [
  { id: 'premium', name: 'Premium' },
  { id: 'basic', name: 'Basic' },
  { id: 'starter', name: 'Starter' },
] as const;

// Website Type (Website/Web App/Funnel)
export type WebsiteType = 'website' | 'webapp' | 'funnel';

export const WEBSITE_TYPES = [
  { id: 'website', name: 'Website' },
  { id: 'webapp', name: 'Web App' },
  { id: 'funnel', name: 'Funnel' },
] as const;

// Website Style Categories
export type WebsiteStyle = 'minimal' | 'modern' | 'corporate' | 'creative' | 'classic';

export const WEBSITE_STYLES = [
  { id: 'minimal', name: 'Minimal' },
  { id: 'modern', name: 'Modern' },
  { id: 'corporate', name: 'Corporate' },
  { id: 'creative', name: 'Creative' },
  { id: 'classic', name: 'Classic' },
] as const;

// Website Features (for feature-based filtering)
export type WebsiteFeature = 'animations' | 'forms' | 'ecommerce' | 'blog' | 'gallery' | 'video' | 'testimonials' | 'booking';

export const WEBSITE_FEATURES = [
  { id: 'animations', name: 'Animations' },
  { id: 'forms', name: 'Contact Forms' },
  { id: 'ecommerce', name: 'E-commerce' },
  { id: 'blog', name: 'Blog Section' },
  { id: 'gallery', name: 'Image Gallery' },
  { id: 'video', name: 'Video Content' },
  { id: 'testimonials', name: 'Testimonials' },
  { id: 'booking', name: 'Booking System' },
] as const;

// Page Count Range (for filtering)
export type PageCountRange = 'all' | '1-3' | '4-6' | '7+';

// ============================================
// LEADS SYSTEM TYPES
// ============================================

// Industry options for leads (reuses similar structure to snapshots)
export const LEAD_INDUSTRIES = [
  { id: 'plumbing', name: 'Plumbing', icon: '🔧', color: 'bg-blue-500' },
  { id: 'restaurant', name: 'Restaurant', icon: '🍽️', color: 'bg-orange-500' },
  { id: 'real-estate', name: 'Real Estate', icon: '🏠', color: 'bg-green-500' },
  { id: 'consultant', name: 'Consultant', icon: '💼', color: 'bg-purple-500' },
  { id: 'healthcare', name: 'Healthcare', icon: '🏥', color: 'bg-red-500' },
  { id: 'fitness', name: 'Fitness', icon: '💪', color: 'bg-pink-500' },
  { id: 'retail', name: 'Retail', icon: '🛍️', color: 'bg-amber-500' },
  { id: 'construction', name: 'Construction', icon: '🏗️', color: 'bg-yellow-500' },
  { id: 'automotive', name: 'Automotive', icon: '🚗', color: 'bg-slate-500' },
  { id: 'beauty', name: 'Beauty & Spa', icon: '💅', color: 'bg-rose-500' },
  { id: 'legal', name: 'Legal', icon: '⚖️', color: 'bg-indigo-500' },
  { id: 'other', name: 'Other', icon: '📦', color: 'bg-gray-500' },
] as const;

export type LeadIndustry = typeof LEAD_INDUSTRIES[number]['id'];

// Lead status for kanban stages
export type LeadStatus = 'new' | 'contacted' | 'converted' | 'lost';

// Lead status configuration for UI
export const LEAD_STATUSES = [
  { id: 'new', name: 'New', color: 'bg-blue-400' },
  { id: 'contacted', name: 'Contacted', color: 'bg-amber-400' },
  { id: 'converted', name: 'Converted', color: 'bg-green-500' },
  { id: 'lost', name: 'Lost', color: 'bg-red-400' },
] as const;

// Website rating (1-5 stars)
export type WebsiteRating = 1 | 2 | 3 | 4 | 5;

// Lead interface
export interface Lead {
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
  source?: string; // Where the lead came from (e.g., 'google-sheets', 'referral', 'website')
  createdAt: string;
  updatedAt: string;
}

// ============================================
// WEBSITE CATALOG TYPES
// ============================================

// Website Catalog Item for AI-generated mockups
// Task item for website catalog checklists
export interface CatalogTask {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
}

// Prompt history item for tracking AI generation prompts
export interface CatalogPromptHistory {
  id: string;
  title: string; // Short title like "Prompt 1" or custom name
  prompt: string; // The actual prompt text
  createdAt: string;
}

// Preview type for catalog items
export type CatalogPreviewType = 'iframe' | 'image' | 'none';

export interface WebsiteCatalogItem {
  id: string;
  websiteName: string;
  businessType: string;
  totalPages: number;
  pageList: string; // Comma-separated list: "Home, About, Services, Contact"
  designStyle: string;
  primaryColors: string;
  typography: string;
  targetAudience: string;
  keyFeatures: string;
  ctas: string; // Call to Action elements
  functionalityNeeds: string;
  specialNotes: string;
  linkToSite: string; // URL for iframe preview
  previewType: CatalogPreviewType; // Type of preview: iframe (live link), image (screenshot/upload), or none
  previewImage: string; // URL or base64 data for image preview
  isCompleted: boolean; // Tracking if added to library
  isFavorite: boolean;
  tasks: CatalogTask[]; // Checklist tasks for tracking progress
  promptHistory: CatalogPromptHistory[]; // History of AI generation prompts
  createdAt: string;
  updatedAt: string;
}

// Completion status filter for catalog
export type CatalogCompletionStatus = 'all' | 'completed' | 'not-completed';

// Sort options for catalog
export type CatalogSortField = 'websiteName' | 'businessType' | 'totalPages' | 'createdAt';

// Industry categories for filtering
export type CatalogIndustryCategory =
  | 'all'
  | 'professional-services'
  | 'hospitality-food'
  | 'wellness-fitness'
  | 'retail-ecommerce'
  | 'creative-design'
  | 'technology-saas'
  | 'education'
  | 'travel-adventure'
  | 'specialized-services';

// Color theme categories for filtering
export type CatalogColorTheme =
  | 'all'
  | 'dark-modern'
  | 'warm-earthy'
  | 'luxury-gold'
  | 'soft-pastel'
  | 'vibrant-bold'
  | 'professional-neutral';

// Design style categories for filtering
export type CatalogDesignStyle =
  | 'all'
  | 'minimalist'
  | 'luxury-elegant'
  | 'rustic-artisan'
  | 'tech-futuristic'
  | 'wellness-organic'
  | 'bold-energetic';

// Page count categories for filtering
export type CatalogPageCategory = 'all' | 'single-page' | 'standard' | 'full-featured';

// Industry category mapping
export const CATALOG_INDUSTRY_CATEGORIES: { value: CatalogIndustryCategory; label: string; keywords: string[] }[] = [
  { value: 'all', label: 'All Industries', keywords: [] },
  { value: 'professional-services', label: 'Professional Services', keywords: ['consulting', 'law', 'financial', 'advisory', 'coaching', 'agency'] },
  { value: 'hospitality-food', label: 'Hospitality & Food', keywords: ['restaurant', 'café', 'coffee', 'bakery', 'brewery', 'dining', 'bistro', 'steakhouse', 'hotel'] },
  { value: 'wellness-fitness', label: 'Wellness & Fitness', keywords: ['spa', 'wellness', 'fitness', 'gym', 'yoga', 'meditation', 'dance', 'mindfulness'] },
  { value: 'retail-ecommerce', label: 'Retail & E-commerce', keywords: ['e-commerce', 'shop', 'store', 'retail', 'fashion', 'jewelry', 'florist', 'plant', 'nursery', 'eyewear', 'leather', 'home goods'] },
  { value: 'creative-design', label: 'Creative & Design', keywords: ['design', 'architecture', 'photography', 'creative', 'studio', 'portfolio', 'interior'] },
  { value: 'technology-saas', label: 'Technology & SaaS', keywords: ['saas', 'tech', 'software', 'platform', 'ai', 'app', 'cloud', 'fintech', 'banking', 'analytics', 'streaming'] },
  { value: 'education', label: 'Education & Learning', keywords: ['education', 'learning', 'academy', 'conservatory', 'school', 'training'] },
  { value: 'travel-adventure', label: 'Travel & Adventure', keywords: ['travel', 'tourism', 'adventure', 'expedition', 'vacation', 'escape'] },
  { value: 'specialized-services', label: 'Specialized Services', keywords: ['tattoo', 'pet', 'dental', 'hvac', 'auto', 'repair', 'moving', 'landscaping', 'cleaning', 'real estate', 'salon', 'barbershop', 'publishing'] },
];

// Color theme mapping
export const CATALOG_COLOR_THEMES: { value: CatalogColorTheme; label: string; keywords: string[] }[] = [
  { value: 'all', label: 'All Colors', keywords: [] },
  { value: 'dark-modern', label: 'Dark & Modern', keywords: ['black', 'dark', 'navy', 'charcoal', 'deep', '#0', '#1', 'midnight'] },
  { value: 'warm-earthy', label: 'Warm & Earthy', keywords: ['brown', 'cream', 'beige', 'terracotta', 'copper', 'espresso', 'amber', 'wood', 'warm'] },
  { value: 'luxury-gold', label: 'Luxury & Gold', keywords: ['gold', 'champagne', 'bronze', 'metallic', 'antique'] },
  { value: 'soft-pastel', label: 'Soft & Pastel', keywords: ['blush', 'pink', 'sage', 'mint', 'soft', 'pastel', 'rose', 'cream', 'ivory'] },
  { value: 'vibrant-bold', label: 'Vibrant & Bold', keywords: ['electric', 'vibrant', 'bright', 'neon', 'lime', 'orange', 'coral', 'purple', 'magenta'] },
  { value: 'professional-neutral', label: 'Professional & Neutral', keywords: ['white', 'gray', 'slate', 'professional', 'clean', 'neutral'] },
];

// Design style mapping
export const CATALOG_DESIGN_STYLES: { value: CatalogDesignStyle; label: string; keywords: string[] }[] = [
  { value: 'all', label: 'All Styles', keywords: [] },
  { value: 'minimalist', label: 'Minimalist', keywords: ['minimal', 'clean', 'simple', 'gallery', 'photography'] },
  { value: 'luxury-elegant', label: 'Luxury & Elegant', keywords: ['luxury', 'elegant', 'sophisticated', 'premium', 'refined', 'prestige', 'upscale'] },
  { value: 'rustic-artisan', label: 'Rustic & Artisan', keywords: ['rustic', 'artisan', 'handcrafted', 'vintage', 'industrial', 'heritage', 'craft'] },
  { value: 'tech-futuristic', label: 'Tech & Futuristic', keywords: ['tech', 'modern', 'futuristic', 'cosmic', 'glassmorphism', 'digital', 'dark'] },
  { value: 'wellness-organic', label: 'Wellness & Organic', keywords: ['organic', 'natural', 'zen', 'serene', 'calm', 'nature', 'botanical', 'peaceful'] },
  { value: 'bold-energetic', label: 'Bold & Energetic', keywords: ['bold', 'energetic', 'powerful', 'dynamic', 'motivational', 'vibrant'] },
];
