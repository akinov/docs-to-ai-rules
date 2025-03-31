import fs from 'fs';
import path from 'path';
import { processDirectory } from './processor';
import type { OutputService } from './services';
import type { Config } from './interfaces/configManager';
import { NodeFileSystemManager } from './utils/fileSystemManager';

export function convertDocs(config: Config): void {
  const { sourceDir, services, dryRun = false, sync = false } = config;
  const fileSystemManager = new NodeFileSystemManager();

  // Check if source directory exists using FileSystemManager
  if (!fileSystemManager.fileExists(sourceDir)) {
    console.error(`Error: Source directory ${sourceDir} does not exist`);
    process.exit(1);
  }

  // Process target directories using FileSystemManager
  for (const service of services) {
    const targetDir = service.getTargetDirectory();
    try {
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
    } catch (err) {
      console.error(`Error: Could not process directory ${targetDir}`, err);
      process.exit(1);
    }
  }

  // Execute conversion
  try {
    const result = processDirectory({...config, sync});
    
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
    console.error('Error during file conversion:', err);
    process.exit(1);
  }
}

// Default export
export default {
  convertDocs
}; 
