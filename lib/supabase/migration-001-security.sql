-- Migration 001: Add user_id columns and secure RLS policies
-- This migration adds multi-tenant support and fixes critical security vulnerabilities
-- Run this AFTER schema.sql if you have an existing database

-- ============================================
-- STEP 1: Add user_id columns to all data tables
-- ============================================

-- Tags (shared per user)
ALTER TABLE tags ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Custom Fields (per user)
ALTER TABLE custom_fields ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Pipelines
ALTER TABLE pipelines ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- CRM Contacts (inherits from pipeline, but adding for direct queries)
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- CRM Saved Views
ALTER TABLE crm_saved_views ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Activities
ALTER TABLE activities ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Snapshots
ALTER TABLE snapshots ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- ============================================
-- STEP 2: Create indexes for user_id columns
-- ============================================

CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_fields_user_id ON custom_fields(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_pipelines_user_id ON pipelines(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_user_id ON crm_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_saved_views_user_id ON crm_saved_views(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_user_id ON snapshots(user_id);

-- ============================================
-- STEP 3: Drop insecure "allow all" policies
-- ============================================

DROP POLICY IF EXISTS "Allow all for authenticated users" ON user_settings;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON dashboard_goals;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON tags;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON custom_fields;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON clients;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON client_tags;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON pipelines;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON pipeline_stages;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON crm_contacts;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON contact_tags;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON crm_saved_views;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON projects;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON tasks;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON activities;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON snapshots;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON snapshot_logos;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON snapshot_brand_colors;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON snapshot_typography;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON snapshot_brand_assets;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON snapshot_email_sequences;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON snapshot_emails;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON snapshot_forms;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON snapshot_automations;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON snapshot_pipelines;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON snapshot_copy_blocks;

-- ============================================
-- STEP 4: Create secure user_id-based RLS policies
-- ============================================

-- User Settings: Users can only access their own settings
CREATE POLICY "Users can manage own settings" ON user_settings
  FOR ALL USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Dashboard Goals: Users can only access their own goals
CREATE POLICY "Users can manage own goals" ON dashboard_goals
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Tags: Users can only access their own tags
CREATE POLICY "Users can manage own tags" ON tags
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Custom Fields: Users can only access their own custom fields
CREATE POLICY "Users can manage own custom_fields" ON custom_fields
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Clients: Users can only access their own clients
CREATE POLICY "Users can manage own clients" ON clients
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Client Tags: Users can manage tags for their own clients
CREATE POLICY "Users can manage own client_tags" ON client_tags
  FOR ALL USING (
    EXISTS (SELECT 1 FROM clients WHERE clients.id = client_tags.client_id AND clients.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM clients WHERE clients.id = client_tags.client_id AND clients.user_id = auth.uid())
  );

-- Pipelines: Users can only access their own pipelines
CREATE POLICY "Users can manage own pipelines" ON pipelines
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Pipeline Stages: Users can manage stages for their own pipelines
CREATE POLICY "Users can manage own pipeline_stages" ON pipeline_stages
  FOR ALL USING (
    EXISTS (SELECT 1 FROM pipelines WHERE pipelines.id = pipeline_stages.pipeline_id AND pipelines.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM pipelines WHERE pipelines.id = pipeline_stages.pipeline_id AND pipelines.user_id = auth.uid())
  );

-- CRM Contacts: Users can only access their own contacts
CREATE POLICY "Users can manage own crm_contacts" ON crm_contacts
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Contact Tags: Users can manage tags for their own contacts
CREATE POLICY "Users can manage own contact_tags" ON contact_tags
  FOR ALL USING (
    EXISTS (SELECT 1 FROM crm_contacts WHERE crm_contacts.id = contact_tags.contact_id AND crm_contacts.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM crm_contacts WHERE crm_contacts.id = contact_tags.contact_id AND crm_contacts.user_id = auth.uid())
  );

-- CRM Saved Views: Users can only access their own views
CREATE POLICY "Users can manage own crm_saved_views" ON crm_saved_views
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Projects: Users can only access their own projects
CREATE POLICY "Users can manage own projects" ON projects
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Tasks: Users can only access their own tasks
CREATE POLICY "Users can manage own tasks" ON tasks
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Activities: Users can only see their own activities
CREATE POLICY "Users can manage own activities" ON activities
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Snapshots: Users can only access their own snapshots
CREATE POLICY "Users can manage own snapshots" ON snapshots
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Snapshot child tables: Access through parent snapshot ownership
CREATE POLICY "Users can manage own snapshot_logos" ON snapshot_logos
  FOR ALL USING (
    EXISTS (SELECT 1 FROM snapshots WHERE snapshots.id = snapshot_logos.snapshot_id AND snapshots.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM snapshots WHERE snapshots.id = snapshot_logos.snapshot_id AND snapshots.user_id = auth.uid())
  );

CREATE POLICY "Users can manage own snapshot_brand_colors" ON snapshot_brand_colors
  FOR ALL USING (
    EXISTS (SELECT 1 FROM snapshots WHERE snapshots.id = snapshot_brand_colors.snapshot_id AND snapshots.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM snapshots WHERE snapshots.id = snapshot_brand_colors.snapshot_id AND snapshots.user_id = auth.uid())
  );

CREATE POLICY "Users can manage own snapshot_typography" ON snapshot_typography
  FOR ALL USING (
    EXISTS (SELECT 1 FROM snapshots WHERE snapshots.id = snapshot_typography.snapshot_id AND snapshots.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM snapshots WHERE snapshots.id = snapshot_typography.snapshot_id AND snapshots.user_id = auth.uid())
  );

CREATE POLICY "Users can manage own snapshot_brand_assets" ON snapshot_brand_assets
  FOR ALL USING (
    EXISTS (SELECT 1 FROM snapshots WHERE snapshots.id = snapshot_brand_assets.snapshot_id AND snapshots.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM snapshots WHERE snapshots.id = snapshot_brand_assets.snapshot_id AND snapshots.user_id = auth.uid())
  );

CREATE POLICY "Users can manage own snapshot_email_sequences" ON snapshot_email_sequences
  FOR ALL USING (
    EXISTS (SELECT 1 FROM snapshots WHERE snapshots.id = snapshot_email_sequences.snapshot_id AND snapshots.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM snapshots WHERE snapshots.id = snapshot_email_sequences.snapshot_id AND snapshots.user_id = auth.uid())
  );

CREATE POLICY "Users can manage own snapshot_emails" ON snapshot_emails
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM snapshot_email_sequences seq
      JOIN snapshots s ON s.id = seq.snapshot_id
      WHERE seq.id = snapshot_emails.sequence_id AND s.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM snapshot_email_sequences seq
      JOIN snapshots s ON s.id = seq.snapshot_id
      WHERE seq.id = snapshot_emails.sequence_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own snapshot_forms" ON snapshot_forms
  FOR ALL USING (
    EXISTS (SELECT 1 FROM snapshots WHERE snapshots.id = snapshot_forms.snapshot_id AND snapshots.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM snapshots WHERE snapshots.id = snapshot_forms.snapshot_id AND snapshots.user_id = auth.uid())
  );

CREATE POLICY "Users can manage own snapshot_automations" ON snapshot_automations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM snapshots WHERE snapshots.id = snapshot_automations.snapshot_id AND snapshots.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM snapshots WHERE snapshots.id = snapshot_automations.snapshot_id AND snapshots.user_id = auth.uid())
  );

CREATE POLICY "Users can manage own snapshot_pipelines" ON snapshot_pipelines
  FOR ALL USING (
    EXISTS (SELECT 1 FROM snapshots WHERE snapshots.id = snapshot_pipelines.snapshot_id AND snapshots.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM snapshots WHERE snapshots.id = snapshot_pipelines.snapshot_id AND snapshots.user_id = auth.uid())
  );

CREATE POLICY "Users can manage own snapshot_copy_blocks" ON snapshot_copy_blocks
  FOR ALL USING (
    EXISTS (SELECT 1 FROM snapshots WHERE snapshots.id = snapshot_copy_blocks.snapshot_id AND snapshots.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM snapshots WHERE snapshots.id = snapshot_copy_blocks.snapshot_id AND snapshots.user_id = auth.uid())
  );

-- ============================================
-- STEP 5: Update storage policies for path-based isolation
-- ============================================

-- Drop old storage policies if they exist
DROP POLICY IF EXISTS "Authenticated users can upload to brand-assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read brand-assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete own brand-assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to snapshots" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read snapshots" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete own snapshots" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to websites" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read websites" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete own websites" ON storage.objects;

-- Create user-isolated storage policies
-- Users can only upload to their own folder (folder name = user_id)
CREATE POLICY "Users can upload to own folder in brand-assets" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'brand-assets' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can read own files in brand-assets" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'brand-assets' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own files in brand-assets" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'brand-assets' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can upload to own folder in snapshots" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'snapshots' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can read own files in snapshots" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'snapshots' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own files in snapshots" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'snapshots' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can upload to own folder in websites" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'websites' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can read own files in websites" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'websites' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own files in websites" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'websites' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================
-- STEP 6: Add version column for optimistic locking
-- ============================================

ALTER TABLE clients ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE pipelines ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE snapshots ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Create function to increment version on update
CREATE OR REPLACE FUNCTION increment_version()
RETURNS TRIGGER AS $$
BEGIN
  NEW.version = COALESCE(OLD.version, 0) + 1;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply version increment triggers
CREATE TRIGGER increment_clients_version BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION increment_version();
CREATE TRIGGER increment_crm_contacts_version BEFORE UPDATE ON crm_contacts FOR EACH ROW EXECUTE FUNCTION increment_version();
CREATE TRIGGER increment_pipelines_version BEFORE UPDATE ON pipelines FOR EACH ROW EXECUTE FUNCTION increment_version();
CREATE TRIGGER increment_tasks_version BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION increment_version();
CREATE TRIGGER increment_projects_version BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION increment_version();
CREATE TRIGGER increment_snapshots_version BEFORE UPDATE ON snapshots FOR EACH ROW EXECUTE FUNCTION increment_version();

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- After running this migration:
-- 1. Rotate your Supabase anon key in the Supabase dashboard
-- 2. Update your .env file with the new key
-- 3. Run the application to verify RLS policies work correctly
