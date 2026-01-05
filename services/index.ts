// Export all services
export { BaseService } from './base.service';
export type { ListOptions, ListResult, ServiceResult, ServiceListResult } from './base.service';

export { clientsService } from './clients.service';
export { ClientsService } from './clients.service';

export { pipelinesService, pipelineStagesService, crmContactsService } from './pipelines.service';
export { PipelinesService, PipelineStagesService, CrmContactsService } from './pipelines.service';

export {
  snapshotsService,
  snapshotLogosService,
  snapshotColorsService,
  snapshotTypographyService,
  snapshotAssetsService,
  snapshotEmailSequencesService,
  snapshotEmailsService,
  snapshotFormsService,
  snapshotAutomationsService,
  snapshotPipelinesService,
  snapshotCopyBlocksService,
} from './snapshots.service';
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
} from './snapshots.service';

export { tasksService, projectsService } from './tasks.service';
export { TasksService, ProjectsService } from './tasks.service';

export { activitiesService } from './activities.service';
export { ActivitiesService } from './activities.service';
export type { ActivityType, EntityType } from './activities.service';

export { storageService } from './storage.service';
export { StorageService } from './storage.service';
export type { UploadResult, FileInfo } from './storage.service';
