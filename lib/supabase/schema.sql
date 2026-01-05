-- Supabase Database Schema for Tawfeeq Dashboard
-- Run this in the Supabase SQL Editor to create all tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USER SETTINGS & GOALS
-- ============================================

CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_name TEXT,
  profile_email TEXT,
  profile_role TEXT,
  avatar_initials TEXT,
  notifications_email_alerts BOOLEAN DEFAULT true,
  notifications_in_app BOOLEAN DEFAULT true,
  notifications_task_reminders BOOLEAN DEFAULT true,
  notifications_client_updates BOOLEAN DEFAULT true,
  display_greeting_name TEXT,
  theme TEXT DEFAULT 'system',
  notification_read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE dashboard_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES user_settings(id) ON DELETE CASCADE,
  monthly_revenue DECIMAL(12,2) DEFAULT 0,
  yearly_revenue DECIMAL(12,2) DEFAULT 0,
  total_clients INTEGER DEFAULT 0,
  pipeline_value DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TAGS & CUSTOM FIELDS
-- ============================================

CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6B7280',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE custom_fields (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'text', 'number', 'date', 'select', 'multiselect', 'checkbox'
  entity_type TEXT NOT NULL, -- 'client', 'contact', 'project', 'task'
  options JSONB, -- For select/multiselect types
  required BOOLEAN DEFAULT false,
  placeholder TEXT,
  default_value JSONB,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CLIENTS
-- ============================================

CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  company TEXT,
  email TEXT,
  phone TEXT,
  website TEXT,
  payment DECIMAL(12,2) DEFAULT 0,
  status TEXT DEFAULT 'active', -- 'active', 'inactive', 'pending'
  template TEXT,
  contract_type TEXT DEFAULT 'one-time', -- 'one-time', 'monthly', 'yearly'
  start_date DATE,
  source_contact_id UUID,
  custom_fields JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE client_tags (
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (client_id, tag_id)
);

-- ============================================
-- CRM PIPELINES
-- ============================================

CREATE TABLE pipelines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE pipeline_stages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pipeline_id UUID REFERENCES pipelines(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  color TEXT,
  default_probability INTEGER DEFAULT 50,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE crm_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pipeline_id UUID REFERENCES pipelines(id) ON DELETE CASCADE,
  stage_id UUID REFERENCES pipeline_stages(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  company TEXT,
  phone TEXT,
  value DECIMAL(12,2) DEFAULT 0,
  contract_type TEXT DEFAULT 'one-time',
  notes TEXT,
  last_contact TIMESTAMPTZ,
  probability INTEGER DEFAULT 50,
  expected_close_date DATE,
  source TEXT,
  outcome TEXT DEFAULT 'open', -- 'open', 'won', 'lost'
  closed_at TIMESTAMPTZ,
  loss_reason TEXT,
  loss_notes TEXT,
  converted_to_client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  converted_at TIMESTAMPTZ,
  custom_fields JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE contact_tags (
  contact_id UUID REFERENCES crm_contacts(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (contact_id, tag_id)
);

CREATE TABLE crm_saved_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  pipeline_id UUID REFERENCES pipelines(id) ON DELETE CASCADE,
  outcome_filter TEXT DEFAULT 'all',
  stage_filter TEXT,
  search_query TEXT,
  contract_type_filter TEXT,
  source_filter TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PROJECTS & TASKS
-- ============================================

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'active', -- 'active', 'completed', 'on-hold', 'archived'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  due_time TIME,
  priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  status TEXT DEFAULT 'pending', -- 'pending', 'in-progress', 'completed', 'cancelled'
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  recurring_pattern TEXT, -- 'daily', 'weekly', 'monthly', 'yearly'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ACTIVITIES
-- ============================================

CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL, -- 'created', 'updated', 'deleted', 'status_change', 'note', 'email', 'call', 'meeting'
  entity_type TEXT NOT NULL, -- 'client', 'contact', 'project', 'task', 'snapshot'
  entity_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SNAPSHOTS (Branding & Templates)
-- ============================================

CREATE TABLE snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  industry TEXT,
  description TEXT,
  thumbnail_url TEXT,
  version TEXT DEFAULT '1.0',
  created_from_client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  times_applied INTEGER DEFAULT 0,
  guidelines TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE snapshot_logos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  snapshot_id UUID REFERENCES snapshots(id) ON DELETE CASCADE,
  name TEXT,
  type TEXT, -- 'horizontal', 'vertical', 'icon', 'wordmark'
  url TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  display_order INTEGER DEFAULT 0
);

CREATE TABLE snapshot_brand_colors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  snapshot_id UUID REFERENCES snapshots(id) ON DELETE CASCADE,
  name TEXT,
  hex TEXT NOT NULL,
  hex2 TEXT, -- For simple two-color gradients
  gradient_stops JSONB, -- Array of {color, position} for multi-stop gradients
  gradient_angle INTEGER DEFAULT 90,
  is_gradient BOOLEAN DEFAULT false,
  role TEXT, -- 'primary', 'secondary', 'accent', 'background', etc.
  shape TEXT DEFAULT 'circle', -- 'circle', 'square'
  display_order INTEGER DEFAULT 0
);

CREATE TABLE snapshot_typography (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  snapshot_id UUID REFERENCES snapshots(id) ON DELETE CASCADE,
  heading_font TEXT,
  heading_weight TEXT,
  body_font TEXT,
  body_weight TEXT,
  base_font_size INTEGER DEFAULT 16
);

CREATE TABLE snapshot_brand_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  snapshot_id UUID REFERENCES snapshots(id) ON DELETE CASCADE,
  name TEXT,
  type TEXT, -- 'image', 'icon', 'pattern', 'illustration'
  url TEXT NOT NULL,
  tags JSONB,
  display_order INTEGER DEFAULT 0
);

CREATE TABLE snapshot_email_sequences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  snapshot_id UUID REFERENCES snapshots(id) ON DELETE CASCADE,
  name TEXT,
  trigger TEXT, -- 'signup', 'purchase', 'abandoned_cart', 'manual'
  display_order INTEGER DEFAULT 0
);

CREATE TABLE snapshot_emails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sequence_id UUID REFERENCES snapshot_email_sequences(id) ON DELETE CASCADE,
  subject TEXT,
  preview_text TEXT,
  body TEXT,
  delay_days INTEGER DEFAULT 0,
  delay_hours INTEGER DEFAULT 0,
  rotation_method TEXT, -- 'random', 'sequential', null for single
  display_order INTEGER DEFAULT 0
);

CREATE TABLE snapshot_forms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  snapshot_id UUID REFERENCES snapshots(id) ON DELETE CASCADE,
  name TEXT,
  fields JSONB,
  type TEXT, -- 'contact', 'lead', 'survey', 'booking'
  embed_url TEXT,
  platform TEXT,
  description TEXT,
  display_order INTEGER DEFAULT 0
);

CREATE TABLE snapshot_automations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  snapshot_id UUID REFERENCES snapshots(id) ON DELETE CASCADE,
  name TEXT,
  trigger TEXT,
  actions JSONB,
  platform TEXT, -- 'zapier', 'make', 'n8n', 'custom'
  workflow_url TEXT,
  description TEXT,
  display_order INTEGER DEFAULT 0
);

CREATE TABLE snapshot_pipelines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  snapshot_id UUID REFERENCES snapshots(id) ON DELETE CASCADE,
  name TEXT,
  stages JSONB,
  description TEXT,
  display_order INTEGER DEFAULT 0
);

CREATE TABLE snapshot_copy_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  snapshot_id UUID REFERENCES snapshots(id) ON DELETE CASCADE,
  name TEXT,
  type TEXT, -- 'headline', 'tagline', 'cta', 'description', 'value_prop'
  content TEXT,
  display_order INTEGER DEFAULT 0
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_clients_created_at ON clients(created_at);
CREATE INDEX idx_crm_contacts_pipeline ON crm_contacts(pipeline_id);
CREATE INDEX idx_crm_contacts_stage ON crm_contacts(stage_id);
CREATE INDEX idx_crm_contacts_outcome ON crm_contacts(outcome);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_completed ON tasks(completed);
CREATE INDEX idx_activities_entity ON activities(entity_type, entity_id);
CREATE INDEX idx_activities_created_at ON activities(created_at);
CREATE INDEX idx_snapshots_industry ON snapshots(industry);
CREATE INDEX idx_snapshot_colors_snapshot ON snapshot_brand_colors(snapshot_id);
CREATE INDEX idx_snapshot_logos_snapshot ON snapshot_logos(snapshot_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_saved_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE snapshot_logos ENABLE ROW LEVEL SECURITY;
ALTER TABLE snapshot_brand_colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE snapshot_typography ENABLE ROW LEVEL SECURITY;
ALTER TABLE snapshot_brand_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE snapshot_email_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE snapshot_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE snapshot_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE snapshot_automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE snapshot_pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE snapshot_copy_blocks ENABLE ROW LEVEL SECURITY;

-- For now, allow all authenticated users full access
-- You can customize these policies based on your auth setup
CREATE POLICY "Allow all for authenticated users" ON user_settings FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON dashboard_goals FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON tags FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON custom_fields FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON clients FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON client_tags FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON pipelines FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON pipeline_stages FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON crm_contacts FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON contact_tags FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON crm_saved_views FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON projects FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON tasks FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON activities FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON snapshots FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON snapshot_logos FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON snapshot_brand_colors FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON snapshot_typography FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON snapshot_brand_assets FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON snapshot_email_sequences FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON snapshot_emails FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON snapshot_forms FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON snapshot_automations FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON snapshot_pipelines FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON snapshot_copy_blocks FOR ALL USING (true);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to tables with that column
CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_dashboard_goals_updated_at BEFORE UPDATE ON dashboard_goals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pipelines_updated_at BEFORE UPDATE ON pipelines FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_crm_contacts_updated_at BEFORE UPDATE ON crm_contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_snapshots_updated_at BEFORE UPDATE ON snapshots FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
