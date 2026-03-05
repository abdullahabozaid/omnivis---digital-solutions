import { supabase, isSupabaseConfigured, STORAGE_BUCKETS } from '../lib/supabase/client';
import { storageService } from '../services/storage.service';

// Helper to get typed table for inserts (bypasses strict typing for migration)
const table = (name: string) => supabase.from(name) as any;

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

export interface MigrationResult {
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
  imageErrors: string[]; // Track image migration failures separately
  checkpoint: MigrationCheckpoint | null;
}

// Checkpoint for resume capability
interface MigrationCheckpoint {
  step: string;
  completedSteps: string[];
  idMaps: {
    tags: Record<string, string>;
    clients: Record<string, string>;
    pipelines: Record<string, string>;
    stages: Record<string, string>;
    projects: Record<string, string>;
    snapshots: Record<string, string>;
  };
  migrated: MigrationResult['migrated'];
  timestamp: string;
}

// ID mapping for maintaining relationships
type IdMap = Map<string, string>;

const CHECKPOINT_KEY = 'supabase_migration_checkpoint';

// Check if migration has been completed
export async function isMigrationComplete(): Promise<boolean> {
  const migrationFlag = localStorage.getItem('supabase_migration_complete');
  return migrationFlag === 'true';
}

// Mark migration as complete
export function markMigrationComplete(): void {
  localStorage.setItem('supabase_migration_complete', 'true');
  localStorage.setItem('supabase_migration_date', new Date().toISOString());
  // Clear checkpoint on completion
  localStorage.removeItem(CHECKPOINT_KEY);
}

// Save checkpoint for resume capability
function saveCheckpoint(checkpoint: MigrationCheckpoint): void {
  localStorage.setItem(CHECKPOINT_KEY, JSON.stringify(checkpoint));
}

// Load checkpoint if exists
function loadCheckpoint(): MigrationCheckpoint | null {
  try {
    const data = localStorage.getItem(CHECKPOINT_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

// Clear checkpoint
export function clearCheckpoint(): void {
  localStorage.removeItem(CHECKPOINT_KEY);
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

// Convert base64 image to file and upload - returns result with error tracking
interface ImageMigrationResult {
  url: string | null;
  error: string | null;
  originalPath: string;
}

async function migrateBase64Image(
  base64: string,
  bucket: string,
  folder: string,
  entityName: string
): Promise<ImageMigrationResult> {
  const originalPath = `${bucket}/${folder}/${entityName}`;

  if (!base64 || !base64.startsWith('data:')) {
    // Already a URL or null - not an error
    return { url: base64 || null, error: null, originalPath };
  }

  try {
    const result = await storageService.uploadBase64(
      bucket,
      base64,
      `migrated-${Date.now()}.png`,
      folder
    );

    if (!result.data) {
      return {
        url: null,
        error: `Failed to upload image for ${entityName}: No URL returned`,
        originalPath
      };
    }

    return { url: result.data, error: null, originalPath };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      url: null,
      error: `Failed to upload image for ${entityName}: ${errorMessage}`,
      originalPath
    };
  }
}

// Check if entity already exists (for idempotency)
async function entityExists(
  tableName: string,
  uniqueField: string,
  value: string
): Promise<string | null> {
  try {
    const { data, error } = await table(tableName)
      .select('id')
      .eq(uniqueField, value)
      .maybeSingle();

    if (error || !data) return null;
    return (data as any).id;
  } catch {
    return null;
  }
}

// Check if entity exists by multiple fields
async function entityExistsByFields(
  tableName: string,
  fields: Record<string, any>
): Promise<string | null> {
  try {
    let query = table(tableName).select('id');

    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value);
      }
    }

    const { data, error } = await query.maybeSingle();

    if (error || !data) return null;
    return (data as any).id;
  } catch {
    return null;
  }
}

// Main migration function with checkpoint support
export async function migrateToSupabase(
  onProgress?: (step: string, progress: number) => void,
  resumeFromCheckpoint: boolean = true
): Promise<MigrationResult> {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      message: 'Supabase is not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.',
      migrated: { clients: 0, pipelines: 0, stages: 0, contacts: 0, snapshots: 0, tasks: 0, projects: 0, tags: 0, customFields: 0 },
      errors: ['Supabase not configured'],
      imageErrors: [],
      checkpoint: null,
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
    imageErrors: [],
    checkpoint: null,
  };

  const data = getLocalStorageData();

  // Load or initialize ID maps
  let checkpoint = resumeFromCheckpoint ? loadCheckpoint() : null;
  const completedSteps = new Set<string>(checkpoint?.completedSteps || []);

  const tagIdMap: IdMap = new Map(Object.entries(checkpoint?.idMaps.tags || {}));
  const clientIdMap: IdMap = new Map(Object.entries(checkpoint?.idMaps.clients || {}));
  const pipelineIdMap: IdMap = new Map(Object.entries(checkpoint?.idMaps.pipelines || {}));
  const stageIdMap: IdMap = new Map(Object.entries(checkpoint?.idMaps.stages || {}));
  const projectIdMap: IdMap = new Map(Object.entries(checkpoint?.idMaps.projects || {}));
  const snapshotIdMap: IdMap = new Map(Object.entries(checkpoint?.idMaps.snapshots || {}));

  // Restore migrated counts from checkpoint
  if (checkpoint) {
    result.migrated = { ...checkpoint.migrated };
    onProgress?.(`Resuming from checkpoint (step: ${checkpoint.step})...`, 0);
  }

  // Helper to save checkpoint
  const updateCheckpoint = (step: string) => {
    const checkpointData: MigrationCheckpoint = {
      step,
      completedSteps: Array.from(completedSteps),
      idMaps: {
        tags: Object.fromEntries(tagIdMap),
        clients: Object.fromEntries(clientIdMap),
        pipelines: Object.fromEntries(pipelineIdMap),
        stages: Object.fromEntries(stageIdMap),
        projects: Object.fromEntries(projectIdMap),
        snapshots: Object.fromEntries(snapshotIdMap),
      },
      migrated: result.migrated,
      timestamp: new Date().toISOString(),
    };
    saveCheckpoint(checkpointData);
    result.checkpoint = checkpointData;
  };

  try {
    // Step 1: Migrate Tags (idempotent by name)
    if (!completedSteps.has('tags')) {
      onProgress?.('Migrating tags...', 5);
      if (data.tags.length > 0) {
        for (const tag of data.tags) {
          // Check if tag already exists
          const existingId = await entityExists('tags', 'name', tag.name);

          if (existingId) {
            tagIdMap.set(tag.id, existingId);
            continue; // Skip, already migrated
          }

          const { data: newTag, error } = await table('tags')
            .insert({
              name: tag.name,
              color: tag.color || '#6B7280',
            })
            .select()
            .single();

          if (error) {
            if (error.message.includes('duplicate')) {
              // Race condition - fetch the existing one
              const existingId = await entityExists('tags', 'name', tag.name);
              if (existingId) {
                tagIdMap.set(tag.id, existingId);
              }
            } else {
              result.errors.push(`Tag "${tag.name}": ${error.message}`);
            }
          } else if (newTag) {
            tagIdMap.set(tag.id, (newTag as any).id);
            result.migrated.tags++;
          }
        }
      }
      completedSteps.add('tags');
      updateCheckpoint('tags');
    }

    // Step 2: Migrate Custom Fields (idempotent by name + entity_type)
    if (!completedSteps.has('customFields')) {
      onProgress?.('Migrating custom fields...', 10);
      if (data.customFields.length > 0) {
        for (const field of data.customFields) {
          const entityType = field.entityType || 'client';

          // Check if field already exists
          const existingId = await entityExistsByFields('custom_fields', {
            name: field.name,
            entity_type: entityType,
          });

          if (existingId) continue; // Skip, already migrated

          const { error } = await table('custom_fields').insert({
            name: field.name,
            type: field.type,
            entity_type: entityType,
            options: field.options,
            required: field.required || false,
            placeholder: field.placeholder,
            default_value: field.defaultValue,
            display_order: field.order || 0,
          });

          if (error && !error.message.includes('duplicate')) {
            result.errors.push(`Custom field "${field.name}": ${error.message}`);
          } else if (!error) {
            result.migrated.customFields++;
          }
        }
      }
      completedSteps.add('customFields');
      updateCheckpoint('customFields');
    }

    // Step 3: Migrate Clients (idempotent by name + email)
    if (!completedSteps.has('clients')) {
      onProgress?.('Migrating clients...', 20);
      if (data.clients.length > 0) {
        for (const client of data.clients) {
          // Check if client already exists
          const existingId = await entityExistsByFields('clients', {
            name: client.name,
            email: client.email,
          });

          if (existingId) {
            clientIdMap.set(client.id, existingId);
            continue; // Skip, already migrated
          }

          const { data: newClient, error } = await table('clients')
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
            if (error.message.includes('duplicate')) {
              const existingId = await entityExistsByFields('clients', {
                name: client.name,
                email: client.email,
              });
              if (existingId) {
                clientIdMap.set(client.id, existingId);
              }
            } else {
              result.errors.push(`Client "${client.name}": ${error.message}`);
            }
          } else if (newClient) {
            clientIdMap.set(client.id, (newClient as any).id);
            result.migrated.clients++;

            // Migrate client tags
            if (client.tags?.length > 0) {
              for (const tagId of client.tags) {
                const newTagId = tagIdMap.get(tagId);
                if (newTagId) {
                  // Check if tag relationship exists
                  const existingRelation = await entityExistsByFields('client_tags', {
                    client_id: (newClient as any).id,
                    tag_id: newTagId,
                  });

                  if (!existingRelation) {
                    await table('client_tags').insert({
                      client_id: (newClient as any).id,
                      tag_id: newTagId,
                    });
                  }
                }
              }
            }
          }
        }
      }
      completedSteps.add('clients');
      updateCheckpoint('clients');
    }

    // Step 4: Migrate Pipelines (idempotent by name)
    if (!completedSteps.has('pipelines')) {
      onProgress?.('Migrating pipelines...', 35);
      if (data.pipelines.length > 0) {
        for (let i = 0; i < data.pipelines.length; i++) {
          const pipeline = data.pipelines[i];

          // Check if pipeline already exists
          const existingId = await entityExists('pipelines', 'name', pipeline.name);

          if (existingId) {
            pipelineIdMap.set(pipeline.id, existingId);

            // Still need to check stages for this pipeline
            if (pipeline.stages?.length > 0) {
              for (let j = 0; j < pipeline.stages.length; j++) {
                const stage = pipeline.stages[j];
                const existingStageId = await entityExistsByFields('pipeline_stages', {
                  pipeline_id: existingId,
                  label: stage.label,
                });
                if (existingStageId) {
                  stageIdMap.set(stage.id, existingStageId);
                }
              }
            }
            continue;
          }

          const { data: newPipeline, error: pipelineError } = await table('pipelines')
            .insert({
              name: pipeline.name,
              display_order: i,
            })
            .select()
            .single();

          if (pipelineError) {
            if (pipelineError.message.includes('duplicate')) {
              const existingId = await entityExists('pipelines', 'name', pipeline.name);
              if (existingId) {
                pipelineIdMap.set(pipeline.id, existingId);
              }
            } else {
              result.errors.push(`Pipeline "${pipeline.name}": ${pipelineError.message}`);
            }
            continue;
          }

          if (newPipeline) {
            pipelineIdMap.set(pipeline.id, (newPipeline as any).id);
            result.migrated.pipelines++;

            // Migrate stages
            if (pipeline.stages?.length > 0) {
              for (let j = 0; j < pipeline.stages.length; j++) {
                const stage = pipeline.stages[j];

                // Check if stage exists
                const existingStageId = await entityExistsByFields('pipeline_stages', {
                  pipeline_id: (newPipeline as any).id,
                  label: stage.label,
                });

                if (existingStageId) {
                  stageIdMap.set(stage.id, existingStageId);
                  continue;
                }

                const { data: newStage, error: stageError } = await table('pipeline_stages')
                  .insert({
                    pipeline_id: (newPipeline as any).id,
                    label: stage.label,
                    color: stage.color,
                    default_probability: stage.probability || 50,
                    display_order: j,
                  })
                  .select()
                  .single();

                if (stageError && !stageError.message.includes('duplicate')) {
                  result.errors.push(`Stage "${stage.label}": ${stageError.message}`);
                } else if (newStage) {
                  stageIdMap.set(stage.id, (newStage as any).id);
                  result.migrated.stages++;
                }
              }
            }
          }
        }
      }
      completedSteps.add('pipelines');
      updateCheckpoint('pipelines');
    }

    // Step 5: Migrate CRM Contacts (idempotent by name + email + pipeline_id)
    if (!completedSteps.has('contacts')) {
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

          // Check if contact exists
          const existingId = await entityExistsByFields('crm_contacts', {
            name: contact.name,
            email: contact.email,
            pipeline_id: newPipelineId,
          });

          if (existingId) continue; // Skip, already migrated

          const { data: newContact, error } = await table('crm_contacts')
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

          if (error && !error.message.includes('duplicate')) {
            result.errors.push(`Contact "${contact.name}": ${error.message}`);
          } else if (newContact) {
            result.migrated.contacts++;

            // Migrate contact tags
            if (contact.tags?.length > 0) {
              for (const tagId of contact.tags) {
                const newTagId = tagIdMap.get(tagId);
                if (newTagId) {
                  const existingRelation = await entityExistsByFields('contact_tags', {
                    contact_id: (newContact as any).id,
                    tag_id: newTagId,
                  });

                  if (!existingRelation) {
                    await table('contact_tags').insert({
                      contact_id: (newContact as any).id,
                      tag_id: newTagId,
                    });
                  }
                }
              }
            }
          }
        }
      }
      completedSteps.add('contacts');
      updateCheckpoint('contacts');
    }

    // Step 6: Migrate Projects (idempotent by name)
    if (!completedSteps.has('projects')) {
      onProgress?.('Migrating projects...', 65);
      if (data.projects.length > 0) {
        for (const project of data.projects) {
          const newClientId = project.clientId ? clientIdMap.get(project.clientId) : null;

          // Check if project exists
          const existingId = await entityExists('projects', 'name', project.name);

          if (existingId) {
            projectIdMap.set(project.id, existingId);
            continue;
          }

          const { data: newProject, error } = await table('projects')
            .insert({
              name: project.name,
              description: project.description,
              color: project.color,
              client_id: newClientId,
              status: project.status || 'active',
            })
            .select()
            .single();

          if (error && !error.message.includes('duplicate')) {
            result.errors.push(`Project "${project.name}": ${error.message}`);
          } else if (newProject) {
            projectIdMap.set(project.id, (newProject as any).id);
            result.migrated.projects++;
          }
        }
      }
      completedSteps.add('projects');
      updateCheckpoint('projects');
    }

    // Step 7: Migrate Tasks (idempotent by title + due_date)
    if (!completedSteps.has('tasks')) {
      onProgress?.('Migrating tasks...', 75);
      if (data.tasks.length > 0) {
        for (const task of data.tasks) {
          const newProjectId = task.projectId ? projectIdMap.get(task.projectId) : null;
          const newClientId = task.clientId ? clientIdMap.get(task.clientId) : null;

          // Check if task exists
          const existingId = await entityExistsByFields('tasks', {
            title: task.title,
            due_date: task.dueDate,
          });

          if (existingId) continue;

          const { error } = await table('tasks').insert({
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

          if (error && !error.message.includes('duplicate')) {
            result.errors.push(`Task "${task.title}": ${error.message}`);
          } else if (!error) {
            result.migrated.tasks++;
          }
        }
      }
      completedSteps.add('tasks');
      updateCheckpoint('tasks');
    }

    // Step 8: Migrate Snapshots (idempotent by name + industry)
    if (!completedSteps.has('snapshots')) {
      onProgress?.('Migrating snapshots...', 85);
      if (data.snapshots.length > 0) {
        for (const snapshot of data.snapshots) {
          // Check if snapshot exists
          const existingId = await entityExistsByFields('snapshots', {
            name: snapshot.name,
            industry: snapshot.industry,
          });

          if (existingId) {
            snapshotIdMap.set(snapshot.id, existingId);
            continue;
          }

          // Migrate thumbnail with proper error tracking
          let thumbnailUrl: string | null = null;
          if (snapshot.thumbnail) {
            const thumbnailResult = await migrateBase64Image(
              snapshot.thumbnail,
              STORAGE_BUCKETS.SNAPSHOTS,
              snapshot.id,
              `snapshot "${snapshot.name}" thumbnail`
            );

            if (thumbnailResult.error) {
              result.imageErrors.push(thumbnailResult.error);
              // Continue migration but without thumbnail
            } else {
              thumbnailUrl = thumbnailResult.url;
            }
          }

          const { data: newSnapshot, error } = await table('snapshots')
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
            if (error.message.includes('duplicate')) {
              const existingId = await entityExistsByFields('snapshots', {
                name: snapshot.name,
                industry: snapshot.industry,
              });
              if (existingId) {
                snapshotIdMap.set(snapshot.id, existingId);
              }
            } else {
              result.errors.push(`Snapshot "${snapshot.name}": ${error.message}`);
            }
            continue;
          }

          if (newSnapshot) {
            snapshotIdMap.set(snapshot.id, (newSnapshot as any).id);
            result.migrated.snapshots++;

            // Migrate logos with error tracking
            if (snapshot.logos?.length > 0) {
              for (let i = 0; i < snapshot.logos.length; i++) {
                const logo = snapshot.logos[i];

                // Check if logo already exists
                const existingLogo = await entityExistsByFields('snapshot_logos', {
                  snapshot_id: (newSnapshot as any).id,
                  name: logo.name,
                });

                if (existingLogo) continue;

                const logoResult = await migrateBase64Image(
                  logo.url,
                  STORAGE_BUCKETS.BRAND_ASSETS,
                  (newSnapshot as any).id,
                  `snapshot "${snapshot.name}" logo "${logo.name}"`
                );

                if (logoResult.error) {
                  result.imageErrors.push(logoResult.error);
                  continue; // Skip this logo but continue with others
                }

                if (logoResult.url) {
                  await table('snapshot_logos').insert({
                    snapshot_id: (newSnapshot as any).id,
                    name: logo.name,
                    type: logo.type,
                    url: logoResult.url,
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

                // Check if color exists
                const existingColor = await entityExistsByFields('snapshot_brand_colors', {
                  snapshot_id: (newSnapshot as any).id,
                  name: color.name,
                });

                if (existingColor) continue;

                await table('snapshot_brand_colors').insert({
                  snapshot_id: (newSnapshot as any).id,
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
              const existingTypography = await entityExistsByFields('snapshot_typography', {
                snapshot_id: (newSnapshot as any).id,
              });

              if (!existingTypography) {
                await table('snapshot_typography').insert({
                  snapshot_id: (newSnapshot as any).id,
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
      }
      completedSteps.add('snapshots');
      updateCheckpoint('snapshots');
    }

    // Step 9: Migrate User Settings
    if (!completedSteps.has('userSettings')) {
      onProgress?.('Migrating user settings...', 95);
      if (data.userSettings) {
        const { data: session } = await supabase.auth.getSession();
        if (session?.session?.user) {
          await table('user_settings').upsert({
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
      completedSteps.add('userSettings');
      updateCheckpoint('userSettings');
    }

    // Step 10: Migrate Dashboard Goals
    if (!completedSteps.has('dashboardGoals')) {
      if (data.dashboardGoals) {
        const { data: session } = await supabase.auth.getSession();
        if (session?.session?.user) {
          await table('dashboard_goals').upsert({
            user_id: session.session.user.id,
            monthly_revenue: data.dashboardGoals.monthlyRevenue || 10000,
            yearly_revenue: data.dashboardGoals.yearlyRevenue || 120000,
            total_clients: data.dashboardGoals.totalClients || 50,
            pipeline_value: data.dashboardGoals.pipelineValue || 50000,
          });
        }
      }
      completedSteps.add('dashboardGoals');
    }

    onProgress?.('Migration complete!', 100);

    // Mark migration as complete
    if (result.errors.length === 0 && result.imageErrors.length === 0) {
      markMigrationComplete();
      result.message = 'Migration completed successfully!';
    } else if (result.errors.length === 0 && result.imageErrors.length > 0) {
      markMigrationComplete();
      result.message = `Migration completed with ${result.imageErrors.length} image upload warnings. Data was migrated successfully.`;
    } else {
      result.success = false;
      result.message = `Migration completed with ${result.errors.length} errors`;
    }

  } catch (error) {
    result.success = false;
    result.message = error instanceof Error ? error.message : 'Migration failed';
    result.errors.push(result.message);

    // Save checkpoint so we can resume
    updateCheckpoint('error');
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
  clearCheckpoint,
};
