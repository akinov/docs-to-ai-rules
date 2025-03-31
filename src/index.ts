import fs from 'fs';
import path from 'path';
import { processDirectory } from './processor';
import type { OutputService } from './services';
import type { Config } from './interfaces/configManager';
import { NodeFileSystemManager } from './utils/fileSystemManager';
import { DirectoryNotFoundError, FileSystemError } from './errors';

export function convertDocs(config: Config): void {
  const { sourceDir, services, dryRun = false, sync = false } = config;
  const fileSystemManager = new NodeFileSystemManager();

  try {
    // Check if source directory exists using FileSystemManager
    if (!fileSystemManager.fileExists(sourceDir)) {
      throw new DirectoryNotFoundError(sourceDir);
    }

    // Process target directories using FileSystemManager
    for (const service of services) {
      const targetDir = service.getTargetDirectory();
      const targetExists = fileSystemManager.fileExists(targetDir);

      if (!targetExists) {
        if (!dryRun) {
          fileSystemManager.ensureDirectoryExists(targetDir);
        } else {
          console.log(`[Dry Run] Would create directory ${targetDir}`);
        }
      } else if (sync) {
        if (!dryRun) {
          fileSystemManager.removeDirectoryIfExists(targetDir);
          fileSystemManager.ensureDirectoryExists(targetDir);
        } else {
          console.log(`[Dry Run] Would format directory ${targetDir}`);
        }
      }
    }

    // Execute conversion
    const result = processDirectory(config);
    
    if (dryRun) {
      if (result.updatedCount > 0) {
        console.log(`[Dry Run] ${result.updatedCount} files need updates`);
        for (const file of result.updatedFiles) {
          console.log(`[Dry Run] File needs update: ${file}`);
        }
      } else {
        console.log(`[Dry Run] No files need updates`);
      }
    } else {
      console.log(`Processing complete: Converted ${result.processedCount} files to ${result.services.length} services`);
      if (sync && result.deletedCount && result.deletedCount > 0) {
        console.log(`Sync mode: Deleted ${result.deletedCount} outdated files`);
      }
    }
  } catch (err) {
    throw err;
  }
}

// Default export
export default {
  convertDocs
}; 
