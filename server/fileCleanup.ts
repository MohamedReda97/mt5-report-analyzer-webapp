import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { log } from './vite';

// Get directory paths for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration for file cleanup
export interface CleanupConfig {
  // Maximum age of files in days before they're eligible for deletion
  maxAgeInDays: number;
  // Maximum number of files to keep in the uploads directory
  maxFiles: number;
  // Whether to perform cleanup on server startup
  cleanupOnStartup: boolean;
  // Whether to enable scheduled cleanup
  enableScheduledCleanup: boolean;
  // Interval in hours for scheduled cleanup
  cleanupIntervalHours: number;
}

// Default configuration
export const defaultCleanupConfig: CleanupConfig = {
  maxAgeInDays: 30,
  maxFiles: 100,
  cleanupOnStartup: true,
  enableScheduledCleanup: true,
  cleanupIntervalHours: 24,
};

// Get the uploads directory path
export function getUploadsDir(): string {
  return path.join(__dirname, '..', 'uploads');
}

// Get file stats with additional metadata
interface FileInfo {
  name: string;
  path: string;
  createdAt: Date;
  size: number;
}

// List all files in the uploads directory with their stats
export function listFiles(): FileInfo[] {
  const uploadsDir = getUploadsDir();
  
  if (!fs.existsSync(uploadsDir)) {
    return [];
  }
  
  try {
    return fs.readdirSync(uploadsDir)
      .filter(file => file.endsWith('.html'))
      .map(file => {
        const filePath = path.join(uploadsDir, file);
        const stats = fs.statSync(filePath);
        
        return {
          name: file,
          path: filePath,
          createdAt: stats.birthtime,
          size: stats.size,
        };
      });
  } catch (error) {
    console.error('Error listing files:', error);
    return [];
  }
}

// Delete a single file
export function deleteFile(filePath: string): boolean {
  try {
    fs.unlinkSync(filePath);
    return true;
  } catch (error) {
    console.error(`Error deleting file ${filePath}:`, error);
    return false;
  }
}

// Delete files older than the specified number of days
export function deleteOldFiles(maxAgeInDays: number): number {
  const files = listFiles();
  const now = new Date();
  const maxAgeMs = maxAgeInDays * 24 * 60 * 60 * 1000;
  let deletedCount = 0;
  
  files.forEach(file => {
    const fileAge = now.getTime() - file.createdAt.getTime();
    
    if (fileAge > maxAgeMs) {
      if (deleteFile(file.path)) {
        deletedCount++;
      }
    }
  });
  
  return deletedCount;
}

// Limit the total number of files by deleting the oldest ones
export function limitFileCount(maxFiles: number): number {
  const files = listFiles();
  
  if (files.length <= maxFiles) {
    return 0;
  }
  
  // Sort files by creation date (oldest first)
  files.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  
  // Calculate how many files to delete
  const filesToDelete = files.slice(0, files.length - maxFiles);
  let deletedCount = 0;
  
  filesToDelete.forEach(file => {
    if (deleteFile(file.path)) {
      deletedCount++;
    }
  });
  
  return deletedCount;
}

// Get total size of all files in the uploads directory
export function getTotalSize(): number {
  const files = listFiles();
  return files.reduce((total, file) => total + file.size, 0);
}

// Perform a full cleanup based on the provided configuration
export function performCleanup(config: CleanupConfig = defaultCleanupConfig): { 
  oldFilesDeleted: number; 
  excessFilesDeleted: number; 
  totalFilesRemaining: number;
  totalSizeRemaining: number;
} {
  // First delete old files
  const oldFilesDeleted = deleteOldFiles(config.maxAgeInDays);
  
  // Then limit the total number of files
  const excessFilesDeleted = limitFileCount(config.maxFiles);
  
  // Get remaining files count and size
  const remainingFiles = listFiles();
  const totalSizeRemaining = remainingFiles.reduce((total, file) => total + file.size, 0);
  
  log(`Cleanup completed: ${oldFilesDeleted} old files and ${excessFilesDeleted} excess files deleted. ${remainingFiles.length} files remaining (${(totalSizeRemaining / 1024 / 1024).toFixed(2)} MB)`, 'file-cleanup');
  
  return {
    oldFilesDeleted,
    excessFilesDeleted,
    totalFilesRemaining: remainingFiles.length,
    totalSizeRemaining,
  };
}

// Set up scheduled cleanup
export function setupScheduledCleanup(config: CleanupConfig = defaultCleanupConfig): NodeJS.Timeout | null {
  if (!config.enableScheduledCleanup) {
    return null;
  }
  
  const intervalMs = config.cleanupIntervalHours * 60 * 60 * 1000;
  
  log(`Scheduled file cleanup enabled. Will run every ${config.cleanupIntervalHours} hours`, 'file-cleanup');
  
  return setInterval(() => {
    log('Running scheduled file cleanup', 'file-cleanup');
    performCleanup(config);
  }, intervalMs);
}
