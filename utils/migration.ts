import { supabase, isSupabaseConfigured, STORAGE_BUCKETS } from '../lib/supabase/client';
import { storageService } from '../services/storage.service';

// Type definitions for localStorage data
interface LocalStorageData {
  clients: any[];
  pipelines: any[];
  contacts: any[];
  snapshots: any[];
  tasks: any[];
  projects: any[];
  tags: any[];
  customFields: any[];
  userSettings: any;
  dashboardGoals: any;
}

interface MigrationResult {
  success: boolean;
  message: string;
  migrated: {
    clients: number;
    pipelines: number;
    stages: number;
    contacts: number;
    snapshots: number;
    tasks: number;
    projects: number;
    tags: number;
    customFields: number;
  };
  errors: string[];
}

// ID mapping for maintaining relationships
type IdMap = Map<string, string>;

// Check if migration has been completed
export async function isMigrationComplete(): Promise<boolean> {
  const migrationFlag = localStorage.getItem('supabase_migration_complete');
  return migrationFlag === 'true';
}

// Mark migration as complete
export function markMigrationComplete(): void {
  localStorage.setItem('supabase_migration_complete', 'true');
  localStorage.setItem('supabase_migration_date', new Date().toISOString());
}

// Get data from localStorage
export function getLocalStorageData(): LocalStorageData {
  const get = (key: string) => {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  };

  return {
    clients: get('tawfeeq_clients') || [],
    pipelines: get('tawfeeq_pipelines') || [],
    contacts: get('tawfeeq_crm_contacts') || [],
    snapshots: get('tawfeeq_snapshots') || [],
    tasks: get('tawfeeq_tasks') || [],
    projects: get('tawfeeq_projects') || [],
    tags: get('tawfeeq_tags') || [],
    customFields: get('tawfeeq_custom_fields') || [],
    userSettings: get('tawfeeq_user_settings'),
    dashboardGoals: get('tawfeeq_dashboard_goals'),
  };
}

// Export localStorage data as JSON backup
export function exportLocalStorageBackup(): string {
  const data = getLocalStorageData();
  return JSON.stringify(data, null, 2);
}

// Download backup as file
export function downloadBackup(): void {
  const data = exportLocalStorageBackup();
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tawfeeq-backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Convert base64 image to file and upload
async function migrateBase64Image(
  base64: string,
  bucket: string,
  folder: string
): Promise<string | null> {
  if (!base64 || !base64.startsWith('data:')) {
    return base64; // Already a URL or null
  }

  try {
    const result = await storageService.uploadBase64(
      bucket,
      base64,
      `migrated-${Date.now()}.png`,
      folder
    );
    return result.data;
  } catch (error) {
    console.error('Failed to migrate image:', error);
    return null;
  }
}

// Main migration function
export async function migrateToSupabase(
  onProgress?: (step: string, progress: number) => void
): Promise<MigrationResult> {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      message: 'Supabase is not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.',
      migrated: { clients: 0, pipelines: 0, stages: 0, contacts: 0, snapshots: 0, tasks: 0, projects: 0, tags: 0, customFields: 0 },
      errors: ['Supabase not configured'],
    };
  }

  const result: MigrationResult = {
    success: true,
    message: '',
    migrated: {
      clients: 0,
      pipelines: 0,
      stages: 0,
      contacts: 0,
      snapshots: 0,
      tasks: 0,
      projects: 0,
      tags: 0,
      customFields: 0,
    },
    errors: [],
  };

  const data = getLocalStorageData();
  const tagIdMap: IdMap = new Map();
  const clientIdMap: IdMap = new Map();
  const pipelineIdMap: IdMap = new Map();
  const stageIdMap: IdMap = new Map();
  const projectIdMap: IdMap = new Map();
  const snapshotIdMap: IdMap = new Map();

  try {
    // Step 1: Migrate Tags
    onProgress?.('Migrating tags...', 5);
    if (data.tags.length > 0) {
      for (const tag of data.tags) {
        const { data: newTag, error } = await supabase
          .from('tags')
          .insert({
            name: tag.name,
            color: tag.color || '#6B7280',
          })
          .select()
          .single();

        if (error) {
          result.errors.push(`Tag "${tag.name}": ${error.message}`);
        } else if (newTag) {
          tagIdMap.set(tag.id, newTag.id);
          result.migrated.tags++;
        }
      }
    }

    // Step 2: Migrate Custom Fields
    onProgress?.('Migrating custom fields...', 10);
    if (data.customFields.length > 0) {
      for (const field of data.customFields) {
        const { error } = await supabase.from('custom_fields').insert({
          name: field.name,
          type: field.type,
          entity_type: field.entityType || 'client',
          options: field.options,
          required: field.required || false,
          placeholder: field.placeholder,
          default_value: field.defaultValue,
          display_order: field.order || 0,
        });

        if (error) {
          result.errors.push(`Custom field "${field.name}": ${error.message}`);
        } else {
          result.migrated.customFields++;
        }
      }
    }

    // Step 3: Migrate Clients
    onProgress?.('Migrating clients...', 20);
    if (data.clients.length > 0) {
      for (const client of data.clients) {
        const { data: newClient, error } = await supabase
          .from('clients')
          .insert({
            name: client.name,
            company: client.company,
            email: client.email,
            phone: client.phone,
            website: client.website,
            payment: client.payment || 0,
            status: client.status || 'active',
            template: client.template,
            contract_type: client.contractType || 'one-time',
            start_date: client.startDate,
            custom_fields: client.customFields,
          })
          .select()
          .single();

        if (error) {
          result.errors.push(`Client "${client.name}": ${error.message}`);
        } else if (newClient) {
          clientIdMap.set(client.id, newClient.id);
          result.migrated.clients++;

          // Migrate client tags
          if (client.tags?.length > 0) {
            for (const tagId of client.tags) {
              const newTagId = tagIdMap.get(tagId);
              if (newTagId) {
                await supabase.from('client_tags').insert({
                  client_id: newClient.id,
                  tag_id: newTagId,
                });
              }
            }
          }
        }
      }
    }

    // Step 4: Migrate Pipelines
    onProgress?.('Migrating pipelines...', 35);
    if (data.pipelines.length > 0) {
      for (let i = 0; i < data.pipelines.length; i++) {
        const pipeline = data.pipelines[i];

        const { data: newPipeline, error: pipelineError } = await supabase
          .from('pipelines')
          .insert({
            name: pipeline.name,
            display_order: i,
          })
          .select()
          .single();

        if (pipelineError) {
          result.errors.push(`Pipeline "${pipeline.name}": ${pipelineError.message}`);
          continue;
        }

        if (newPipeline) {
          pipelineIdMap.set(pipeline.id, newPipeline.id);
          result.migrated.pipelines++;

          // Migrate stages
          if (pipeline.stages?.length > 0) {
            for (let j = 0; j < pipeline.stages.length; j++) {
              const stage = pipeline.stages[j];

              const { data: newStage, error: stageError } = await supabase
                .from('pipeline_stages')
                .insert({
                  pipeline_id: newPipeline.id,
                  label: stage.label,
                  color: stage.color,
                  default_probability: stage.probability || 50,
                  display_order: j,
                })
                .select()
                .single();

              if (stageError) {
                result.errors.push(`Stage "${stage.label}": ${stageError.message}`);
              } else if (newStage) {
                stageIdMap.set(stage.id, newStage.id);
                result.migrated.stages++;
              }
            }
          }
        }
      }
    }

    // Step 5: Migrate CRM Contacts
    onProgress?.('Migrating CRM contacts...', 50);
    if (data.contacts.length > 0) {
      for (const contact of data.contacts) {
        const newPipelineId = pipelineIdMap.get(contact.pipelineId);
        const newStageId = contact.stageId ? stageIdMap.get(contact.stageId) : null;
        const newClientId = contact.convertedToClientId
          ? clientIdMap.get(contact.convertedToClientId)
          : null;

        if (!newPipelineId) {
          result.errors.push(`Contact "${contact.name}": Pipeline not found`);
          continue;
        }

        const { data: newContact, error } = await supabase
          .from('crm_contacts')
          .insert({
            pipeline_id: newPipelineId,
            stage_id: newStageId,
            name: contact.name,
            email: contact.email,
            company: contact.company,
            phone: contact.phone,
            value: contact.value || 0,
            contract_type: contact.contractType || 'one-time',
            notes: contact.notes,
            last_contact: contact.lastContact,
            probability: contact.probability || 50,
            expected_close_date: contact.expectedCloseDate,
            source: contact.source,
            outcome: contact.outcome || 'open',
            closed_at: contact.closedAt,
            loss_reason: contact.lossReason,
            loss_notes: contact.lossNotes,
            converted_to_client_id: newClientId,
            converted_at: contact.convertedAt,
            custom_fields: contact.customFields,
          })
          .select()
          .single();

        if (error) {
          result.errors.push(`Contact "${contact.name}": ${error.message}`);
        } else if (newContact) {
          result.migrated.contacts++;

          // Migrate contact tags
          if (contact.tags?.length > 0) {
            for (const tagId of contact.tags) {
              const newTagId = tagIdMap.get(tagId);
              if (newTagId) {
                await supabase.from('contact_tags').insert({
                  contact_id: newContact.id,
                  tag_id: newTagId,
                });
              }
            }
          }
        }
      }
    }

    // Step 6: Migrate Projects
    onProgress?.('Migrating projects...', 65);
    if (data.projects.length > 0) {
      for (const project of data.projects) {
        const newClientId = project.clientId ? clientIdMap.get(project.clientId) : null;

        const { data: newProject, error } = await supabase
          .from('projects')
          .insert({
            name: project.name,
            description: project.description,
            color: project.color,
            client_id: newClientId,
            status: project.status || 'active',
          })
          .select()
          .single();

        if (error) {
          result.errors.push(`Project "${project.name}": ${error.message}`);
        } else if (newProject) {
          projectIdMap.set(project.id, newProject.id);
          result.migrated.projects++;
        }
      }
    }

    // Step 7: Migrate Tasks
    onProgress?.('Migrating tasks...', 75);
    if (data.tasks.length > 0) {
      for (const task of data.tasks) {
        const newProjectId = task.projectId ? projectIdMap.get(task.projectId) : null;
        const newClientId = task.clientId ? clientIdMap.get(task.clientId) : null;

        const { error } = await supabase.from('tasks').insert({
          title: task.title,
          description: task.description,
          due_date: task.dueDate,
          due_time: task.dueTime,
          priority: task.priority || 'medium',
          status: task.status || 'pending',
          completed: task.completed || false,
          completed_at: task.completedAt,
          project_id: newProjectId,
          client_id: newClientId,
          recurring_pattern: task.recurringPattern,
        });

        if (error) {
          result.errors.push(`Task "${task.title}": ${error.message}`);
        } else {
          result.migrated.tasks++;
        }
      }
    }

    // Step 8: Migrate Snapshots
    onProgress?.('Migrating snapshots...', 85);
    if (data.snapshots.length > 0) {
      for (const snapshot of data.snapshots) {
        // Migrate thumbnail
        const thumbnailUrl = snapshot.thumbnail
          ? await migrateBase64Image(snapshot.thumbnail, STORAGE_BUCKETS.SNAPSHOTS, snapshot.id)
          : null;

        const { data: newSnapshot, error } = await supabase
          .from('snapshots')
          .insert({
            name: snapshot.name,
            industry: snapshot.industry,
            description: snapshot.description,
            thumbnail_url: thumbnailUrl,
            version: snapshot.version || '1.0',
            times_applied: snapshot.timesApplied || 0,
            guidelines: snapshot.guidelines,
          })
          .select()
          .single();

        if (error) {
          result.errors.push(`Snapshot "${snapshot.name}": ${error.message}`);
          continue;
        }

        if (newSnapshot) {
          snapshotIdMap.set(snapshot.id, newSnapshot.id);
          result.migrated.snapshots++;

          // Migrate logos
          if (snapshot.logos?.length > 0) {
            for (let i = 0; i < snapshot.logos.length; i++) {
              const logo = snapshot.logos[i];
              const logoUrl = await migrateBase64Image(
                logo.url,
                STORAGE_BUCKETS.BRAND_ASSETS,
                newSnapshot.id
              );

              if (logoUrl) {
                await supabase.from('snapshot_logos').insert({
                  snapshot_id: newSnapshot.id,
                  name: logo.name,
                  type: logo.type,
                  url: logoUrl,
                  width: logo.width,
                  height: logo.height,
                  display_order: i,
                });
              }
            }
          }

          // Migrate colors
          if (snapshot.brandColors?.length > 0) {
            for (let i = 0; i < snapshot.brandColors.length; i++) {
              const color = snapshot.brandColors[i];
              await supabase.from('snapshot_brand_colors').insert({
                snapshot_id: newSnapshot.id,
                name: color.name,
                hex: color.hex,
                hex2: color.hex2,
                gradient_stops: color.gradientStops,
                gradient_angle: color.gradientAngle || 90,
                is_gradient: color.isGradient || false,
                role: color.role,
                shape: color.shape || 'circle',
                display_order: i,
              });
            }
          }

          // Migrate typography
          if (snapshot.typography) {
            await supabase.from('snapshot_typography').insert({
              snapshot_id: newSnapshot.id,
              heading_font: snapshot.typography.headingFont,
              heading_weight: snapshot.typography.headingWeight,
              body_font: snapshot.typography.bodyFont,
              body_weight: snapshot.typography.bodyWeight,
              base_font_size: snapshot.typography.baseFontSize,
            });
          }
        }
      }
    }

    // Step 9: Migrate User Settings
    onProgress?.('Migrating user settings...', 95);
    if (data.userSettings) {
      const { data: session } = await supabase.auth.getSession();
      if (session?.session?.user) {
        await supabase.from('user_settings').upsert({
          id: session.session.user.id,
          profile_name: data.userSettings.profileName,
          profile_email: data.userSettings.profileEmail,
          profile_role: data.userSettings.profileRole,
          avatar_initials: data.userSettings.avatarInitials,
          notifications_email_alerts: data.userSettings.notifications?.emailAlerts ?? true,
          notifications_in_app: data.userSettings.notifications?.inApp ?? true,
          notifications_task_reminders: data.userSettings.notifications?.taskReminders ?? true,
          notifications_client_updates: data.userSettings.notifications?.clientUpdates ?? true,
          display_greeting_name: data.userSettings.displayGreetingName,
          theme: data.userSettings.theme || 'system',
        });
      }
    }

    // Step 10: Migrate Dashboard Goals
    if (data.dashboardGoals) {
      const { data: session } = await supabase.auth.getSession();
      if (session?.session?.user) {
        await supabase.from('dashboard_goals').upsert({
          user_id: session.session.user.id,
          monthly_revenue: data.dashboardGoals.monthlyRevenue || 10000,
          yearly_revenue: data.dashboardGoals.yearlyRevenue || 120000,
          total_clients: data.dashboardGoals.totalClients || 50,
          pipeline_value: data.dashboardGoals.pipelineValue || 50000,
        });
      }
    }

    onProgress?.('Migration complete!', 100);

    // Mark migration as complete
    if (result.errors.length === 0) {
      markMigrationComplete();
      result.message = 'Migration completed successfully!';
    } else {
      result.success = false;
      result.message = `Migration completed with ${result.errors.length} errors`;
    }

  } catch (error) {
    result.success = false;
    result.message = error instanceof Error ? error.message : 'Migration failed';
    result.errors.push(result.message);
  }

  return result;
}

// Clear localStorage after successful migration (optional)
export function clearLocalStorageData(): void {
  const keysToRemove = [
    'tawfeeq_clients',
    'tawfeeq_pipelines',
    'tawfeeq_crm_contacts',
    'tawfeeq_snapshots',
    'tawfeeq_tasks',
    'tawfeeq_projects',
    'tawfeeq_tags',
    'tawfeeq_custom_fields',
    'tawfeeq_user_settings',
    'tawfeeq_dashboard_goals',
  ];

  keysToRemove.forEach((key) => localStorage.removeItem(key));
}

export default {
  isMigrationComplete,
  markMigrationComplete,
  getLocalStorageData,
  exportLocalStorageBackup,
  downloadBackup,
  migrateToSupabase,
  clearLocalStorageData,
};
