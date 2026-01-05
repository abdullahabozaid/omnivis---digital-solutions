import { supabase, isSupabaseConfigured, STORAGE_BUCKETS, getPublicUrl } from '../lib/supabase/client';
import { isOnline } from '../utils/offline-queue';

export interface UploadResult {
  data: string | null;
  error: string | null;
  offline?: boolean;
}

export interface FileInfo {
  name: string;
  size: number;
  type: string;
  lastModified: number;
  url: string;
}

class StorageService {
  // Check if we can use storage
  private canUseStorage(): boolean {
    return isSupabaseConfigured() && isOnline();
  }

  // Generate unique file path
  private generatePath(folder: string, fileName: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const extension = fileName.split('.').pop();
    const baseName = fileName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9-_]/g, '-');
    return `${folder}/${timestamp}-${random}-${baseName}.${extension}`;
  }

  // Convert File to base64 for offline storage
  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Upload file to a bucket
  async upload(
    bucket: string,
    file: File,
    folder: string = ''
  ): Promise<UploadResult> {
    if (!this.canUseStorage()) {
      // When offline, convert to base64 and return that
      try {
        const base64 = await this.fileToBase64(file);
        return { data: base64, error: null, offline: true };
      } catch (error) {
        return { data: null, error: 'Failed to process file offline' };
      }
    }

    const path = this.generatePath(folder, file.name);

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      return { data: null, error: error.message };
    }

    const publicUrl = getPublicUrl(bucket, data.path);
    return { data: publicUrl, error: null };
  }

  // Upload brand asset (logo, image, etc.)
  async uploadBrandAsset(file: File, snapshotId: string): Promise<UploadResult> {
    return this.upload(STORAGE_BUCKETS.BRAND_ASSETS, file, snapshotId);
  }

  // Upload snapshot thumbnail
  async uploadSnapshotThumbnail(file: File, snapshotId: string): Promise<UploadResult> {
    return this.upload(STORAGE_BUCKETS.SNAPSHOTS, file, snapshotId);
  }

  // Upload website screenshot
  async uploadWebsiteScreenshot(file: File, folder: string = 'screenshots'): Promise<UploadResult> {
    return this.upload(STORAGE_BUCKETS.WEBSITES, file, folder);
  }

  // Delete file from bucket
  async delete(bucket: string, path: string): Promise<{ success: boolean; error: string | null }> {
    if (!this.canUseStorage()) {
      return { success: false, error: 'Cannot delete while offline' };
    }

    const { error } = await supabase.storage.from(bucket).remove([path]);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  }

  // Delete multiple files
  async deleteMany(bucket: string, paths: string[]): Promise<{ success: boolean; error: string | null }> {
    if (!this.canUseStorage()) {
      return { success: false, error: 'Cannot delete while offline' };
    }

    const { error } = await supabase.storage.from(bucket).remove(paths);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  }

  // List files in a folder
  async list(bucket: string, folder: string = ''): Promise<{
    data: FileInfo[];
    error: string | null;
  }> {
    if (!this.canUseStorage()) {
      return { data: [], error: 'Cannot list files while offline' };
    }

    const { data, error } = await supabase.storage.from(bucket).list(folder);

    if (error) {
      return { data: [], error: error.message };
    }

    const files: FileInfo[] = (data || [])
      .filter(item => item.name !== '.emptyFolderPlaceholder')
      .map(item => ({
        name: item.name,
        size: item.metadata?.size || 0,
        type: item.metadata?.mimetype || '',
        lastModified: new Date(item.updated_at || item.created_at).getTime(),
        url: getPublicUrl(bucket, `${folder}/${item.name}`),
      }));

    return { data: files, error: null };
  }

  // Get signed URL for private file (if needed)
  async getSignedUrl(
    bucket: string,
    path: string,
    expiresIn: number = 3600
  ): Promise<{ url: string | null; error: string | null }> {
    if (!this.canUseStorage()) {
      return { url: null, error: 'Cannot get signed URL while offline' };
    }

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) {
      return { url: null, error: error.message };
    }

    return { url: data.signedUrl, error: null };
  }

  // Download file
  async download(bucket: string, path: string): Promise<{
    data: Blob | null;
    error: string | null;
  }> {
    if (!this.canUseStorage()) {
      return { data: null, error: 'Cannot download while offline' };
    }

    const { data, error } = await supabase.storage.from(bucket).download(path);

    if (error) {
      return { data: null, error: error.message };
    }

    return { data, error: null };
  }

  // Upload base64 image (common for canvas/editor exports)
  async uploadBase64(
    bucket: string,
    base64Data: string,
    fileName: string,
    folder: string = ''
  ): Promise<UploadResult> {
    if (!this.canUseStorage()) {
      // When offline, just return the base64 data
      return { data: base64Data, error: null, offline: true };
    }

    try {
      // Convert base64 to blob
      const [header, data] = base64Data.split(',');
      const mimeType = header.match(/:(.*?);/)?.[1] || 'image/png';
      const byteString = atob(data);
      const arrayBuffer = new ArrayBuffer(byteString.length);
      const uint8Array = new Uint8Array(arrayBuffer);

      for (let i = 0; i < byteString.length; i++) {
        uint8Array[i] = byteString.charCodeAt(i);
      }

      const blob = new Blob([uint8Array], { type: mimeType });
      const file = new File([blob], fileName, { type: mimeType });

      return this.upload(bucket, file, folder);
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Failed to process base64 image',
      };
    }
  }

  // Copy file within the same bucket
  async copy(
    bucket: string,
    fromPath: string,
    toPath: string
  ): Promise<{ success: boolean; error: string | null }> {
    if (!this.canUseStorage()) {
      return { success: false, error: 'Cannot copy while offline' };
    }

    const { error } = await supabase.storage.from(bucket).copy(fromPath, toPath);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  }

  // Move file (copy then delete)
  async move(
    bucket: string,
    fromPath: string,
    toPath: string
  ): Promise<{ success: boolean; error: string | null }> {
    if (!this.canUseStorage()) {
      return { success: false, error: 'Cannot move while offline' };
    }

    const { error: moveError } = await supabase.storage.from(bucket).move(fromPath, toPath);

    if (moveError) {
      return { success: false, error: moveError.message };
    }

    return { success: true, error: null };
  }

  // Get storage usage for a bucket/folder
  async getUsage(bucket: string, folder: string = ''): Promise<{
    totalFiles: number;
    totalSize: number;
    error: string | null;
  }> {
    const listResult = await this.list(bucket, folder);

    if (listResult.error) {
      return { totalFiles: 0, totalSize: 0, error: listResult.error };
    }

    const totalSize = listResult.data.reduce((sum, file) => sum + file.size, 0);

    return {
      totalFiles: listResult.data.length,
      totalSize,
      error: null,
    };
  }
}

export const storageService = new StorageService();
export { StorageService };
