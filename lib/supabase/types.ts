// Database types for Supabase
// These types match the database schema

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      user_settings: {
        Row: {
          id: string;
          profile_name: string | null;
          profile_email: string | null;
          profile_role: string | null;
          avatar_initials: string | null;
          notifications_email_alerts: boolean;
          notifications_in_app: boolean;
          notifications_task_reminders: boolean;
          notifications_client_updates: boolean;
          display_greeting_name: string | null;
          theme: string;
          notification_read_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['user_settings']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['user_settings']['Insert']>;
      };
      dashboard_goals: {
        Row: {
          id: string;
          user_id: string | null;
          monthly_revenue: number;
          yearly_revenue: number;
          total_clients: number;
          pipeline_value: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['dashboard_goals']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['dashboard_goals']['Insert']>;
      };
      tags: {
        Row: {
          id: string;
          name: string;
          color: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['tags']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['tags']['Insert']>;
      };
      custom_fields: {
        Row: {
          id: string;
          name: string;
          type: string;
          entity_type: string;
          options: Json | null;
          required: boolean;
          placeholder: string | null;
          default_value: Json | null;
          display_order: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['custom_fields']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['custom_fields']['Insert']>;
      };
      clients: {
        Row: {
          id: string;
          name: string;
          company: string | null;
          email: string | null;
          phone: string | null;
          website: string | null;
          payment: number;
          status: string;
          template: string | null;
          contract_type: string;
          start_date: string | null;
          source_contact_id: string | null;
          custom_fields: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['clients']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['clients']['Insert']>;
      };
      client_tags: {
        Row: {
          client_id: string;
          tag_id: string;
        };
        Insert: Database['public']['Tables']['client_tags']['Row'];
        Update: Partial<Database['public']['Tables']['client_tags']['Insert']>;
      };
      pipelines: {
        Row: {
          id: string;
          name: string;
          display_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['pipelines']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['pipelines']['Insert']>;
      };
      pipeline_stages: {
        Row: {
          id: string;
          pipeline_id: string;
          label: string;
          color: string | null;
          default_probability: number;
          display_order: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['pipeline_stages']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['pipeline_stages']['Insert']>;
      };
      crm_contacts: {
        Row: {
          id: string;
          pipeline_id: string;
          stage_id: string | null;
          name: string;
          email: string | null;
          company: string | null;
          phone: string | null;
          value: number;
          contract_type: string;
          notes: string | null;
          last_contact: string | null;
          probability: number;
          expected_close_date: string | null;
          source: string | null;
          outcome: string;
          closed_at: string | null;
          loss_reason: string | null;
          loss_notes: string | null;
          converted_to_client_id: string | null;
          converted_at: string | null;
          custom_fields: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['crm_contacts']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['crm_contacts']['Insert']>;
      };
      contact_tags: {
        Row: {
          contact_id: string;
          tag_id: string;
        };
        Insert: Database['public']['Tables']['contact_tags']['Row'];
        Update: Partial<Database['public']['Tables']['contact_tags']['Insert']>;
      };
      crm_saved_views: {
        Row: {
          id: string;
          name: string;
          pipeline_id: string;
          outcome_filter: string;
          stage_filter: string | null;
          search_query: string | null;
          contract_type_filter: string | null;
          source_filter: string | null;
          is_default: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['crm_saved_views']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['crm_saved_views']['Insert']>;
      };
      projects: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          color: string | null;
          client_id: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['projects']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['projects']['Insert']>;
      };
      tasks: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          due_date: string | null;
          due_time: string | null;
          priority: string;
          status: string;
          completed: boolean;
          completed_at: string | null;
          project_id: string | null;
          client_id: string | null;
          recurring_pattern: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['tasks']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['tasks']['Insert']>;
      };
      activities: {
        Row: {
          id: string;
          type: string;
          entity_type: string;
          entity_id: string;
          title: string;
          description: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['activities']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['activities']['Insert']>;
      };
      snapshots: {
        Row: {
          id: string;
          name: string;
          industry: string | null;
          description: string | null;
          thumbnail_url: string | null;
          version: string;
          created_from_client_id: string | null;
          times_applied: number;
          guidelines: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['snapshots']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['snapshots']['Insert']>;
      };
      snapshot_logos: {
        Row: {
          id: string;
          snapshot_id: string;
          name: string | null;
          type: string | null;
          url: string;
          width: number | null;
          height: number | null;
          display_order: number;
        };
        Insert: Omit<Database['public']['Tables']['snapshot_logos']['Row'], 'id'> & {
          id?: string;
        };
        Update: Partial<Database['public']['Tables']['snapshot_logos']['Insert']>;
      };
      snapshot_brand_colors: {
        Row: {
          id: string;
          snapshot_id: string;
          name: string | null;
          hex: string;
          hex2: string | null;
          gradient_stops: Json | null;
          gradient_angle: number | null;
          is_gradient: boolean;
          role: string | null;
          shape: string | null;
          display_order: number;
        };
        Insert: Omit<Database['public']['Tables']['snapshot_brand_colors']['Row'], 'id'> & {
          id?: string;
        };
        Update: Partial<Database['public']['Tables']['snapshot_brand_colors']['Insert']>;
      };
      snapshot_typography: {
        Row: {
          id: string;
          snapshot_id: string;
          heading_font: string | null;
          heading_weight: string | null;
          body_font: string | null;
          body_weight: string | null;
          base_font_size: number | null;
        };
        Insert: Omit<Database['public']['Tables']['snapshot_typography']['Row'], 'id'> & {
          id?: string;
        };
        Update: Partial<Database['public']['Tables']['snapshot_typography']['Insert']>;
      };
      snapshot_brand_assets: {
        Row: {
          id: string;
          snapshot_id: string;
          name: string | null;
          type: string | null;
          url: string;
          tags: Json | null;
          display_order: number;
        };
        Insert: Omit<Database['public']['Tables']['snapshot_brand_assets']['Row'], 'id'> & {
          id?: string;
        };
        Update: Partial<Database['public']['Tables']['snapshot_brand_assets']['Insert']>;
      };
      snapshot_email_sequences: {
        Row: {
          id: string;
          snapshot_id: string;
          name: string | null;
          trigger: string | null;
          display_order: number;
        };
        Insert: Omit<Database['public']['Tables']['snapshot_email_sequences']['Row'], 'id'> & {
          id?: string;
        };
        Update: Partial<Database['public']['Tables']['snapshot_email_sequences']['Insert']>;
      };
      snapshot_emails: {
        Row: {
          id: string;
          sequence_id: string;
          subject: string | null;
          preview_text: string | null;
          body: string | null;
          delay_days: number;
          delay_hours: number;
          rotation_method: string | null;
          display_order: number;
        };
        Insert: Omit<Database['public']['Tables']['snapshot_emails']['Row'], 'id'> & {
          id?: string;
        };
        Update: Partial<Database['public']['Tables']['snapshot_emails']['Insert']>;
      };
      snapshot_forms: {
        Row: {
          id: string;
          snapshot_id: string;
          name: string | null;
          fields: Json | null;
          type: string | null;
          embed_url: string | null;
          platform: string | null;
          description: string | null;
          display_order: number;
        };
        Insert: Omit<Database['public']['Tables']['snapshot_forms']['Row'], 'id'> & {
          id?: string;
        };
        Update: Partial<Database['public']['Tables']['snapshot_forms']['Insert']>;
      };
      snapshot_automations: {
        Row: {
          id: string;
          snapshot_id: string;
          name: string | null;
          trigger: string | null;
          actions: Json | null;
          platform: string | null;
          workflow_url: string | null;
          description: string | null;
          display_order: number;
        };
        Insert: Omit<Database['public']['Tables']['snapshot_automations']['Row'], 'id'> & {
          id?: string;
        };
        Update: Partial<Database['public']['Tables']['snapshot_automations']['Insert']>;
      };
      snapshot_pipelines: {
        Row: {
          id: string;
          snapshot_id: string;
          name: string | null;
          stages: Json | null;
          description: string | null;
          display_order: number;
        };
        Insert: Omit<Database['public']['Tables']['snapshot_pipelines']['Row'], 'id'> & {
          id?: string;
        };
        Update: Partial<Database['public']['Tables']['snapshot_pipelines']['Insert']>;
      };
      snapshot_copy_blocks: {
        Row: {
          id: string;
          snapshot_id: string;
          name: string | null;
          type: string | null;
          content: string | null;
          display_order: number;
        };
        Insert: Omit<Database['public']['Tables']['snapshot_copy_blocks']['Row'], 'id'> & {
          id?: string;
        };
        Update: Partial<Database['public']['Tables']['snapshot_copy_blocks']['Insert']>;
      };
      leads: {
        Row: {
          id: string;
          name: string;
          email: string | null;
          phone: string | null;
          company: string | null;
          website: string | null;
          website_rating: number | null;
          industry: string;
          status: string;
          notes: string | null;
          source: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['leads']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['leads']['Insert']>;
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
}

// Convenience types for common operations
export type UserSettings = Database['public']['Tables']['user_settings']['Row'];
export type DashboardGoals = Database['public']['Tables']['dashboard_goals']['Row'];
export type Tag = Database['public']['Tables']['tags']['Row'];
export type CustomField = Database['public']['Tables']['custom_fields']['Row'];
export type Client = Database['public']['Tables']['clients']['Row'];
export type Pipeline = Database['public']['Tables']['pipelines']['Row'];
export type PipelineStage = Database['public']['Tables']['pipeline_stages']['Row'];
export type CrmContact = Database['public']['Tables']['crm_contacts']['Row'];
export type CrmSavedView = Database['public']['Tables']['crm_saved_views']['Row'];
export type Project = Database['public']['Tables']['projects']['Row'];
export type Task = Database['public']['Tables']['tasks']['Row'];
export type Activity = Database['public']['Tables']['activities']['Row'];
export type Snapshot = Database['public']['Tables']['snapshots']['Row'];
export type SnapshotLogo = Database['public']['Tables']['snapshot_logos']['Row'];
export type SnapshotBrandColor = Database['public']['Tables']['snapshot_brand_colors']['Row'];
export type SnapshotTypography = Database['public']['Tables']['snapshot_typography']['Row'];
export type SnapshotBrandAsset = Database['public']['Tables']['snapshot_brand_assets']['Row'];
export type SnapshotEmailSequence = Database['public']['Tables']['snapshot_email_sequences']['Row'];
export type SnapshotEmail = Database['public']['Tables']['snapshot_emails']['Row'];
export type SnapshotForm = Database['public']['Tables']['snapshot_forms']['Row'];
export type SnapshotAutomation = Database['public']['Tables']['snapshot_automations']['Row'];
export type SnapshotPipeline = Database['public']['Tables']['snapshot_pipelines']['Row'];
export type SnapshotCopyBlock = Database['public']['Tables']['snapshot_copy_blocks']['Row'];
export type Lead = Database['public']['Tables']['leads']['Row'];

// Extended types with relations
export interface ClientWithTags extends Client {
  tags?: Tag[];
}

export interface PipelineWithStages extends Pipeline {
  stages: PipelineStage[];
}

export interface PipelineWithContacts extends PipelineWithStages {
  contacts: CrmContactWithTags[];
}

export interface CrmContactWithTags extends CrmContact {
  tags?: Tag[];
}

export interface SnapshotWithBranding extends Snapshot {
  logos?: SnapshotLogo[];
  colors?: SnapshotBrandColor[];
  typography?: SnapshotTypography;
  assets?: SnapshotBrandAsset[];
  emailSequences?: SnapshotEmailSequence[];
  forms?: SnapshotForm[];
  automations?: SnapshotAutomation[];
  pipelines?: SnapshotPipeline[];
  copyBlocks?: SnapshotCopyBlock[];
}
