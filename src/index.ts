import fs from 'fs';
import path from 'path';
import { processDirectory } from './processor';
import { OutputService } from './services';

export interface Config {
  sourceDir: string;
  services: OutputService[];
  excludeFiles?: string[];
  dryRun?: boolean;
  sync?: boolean;
}

export function convertDocs(config: Config): void {
  const { sourceDir, services, excludeFiles = ['README.md'], dryRun = false, sync = false } = config;

  // Check if source directory exists
  if (!fs.existsSync(sourceDir)) {
    console.error(`Error: Source directory ${sourceDir} does not exist`);
    process.exit(1);
  }

  // Create target directories if not exist
  for (const service of services) {
    const targetDir = service.getTargetDirectory();
    try {
      if (!fs.existsSync(targetDir)) {
        if (!dryRun) {
          fs.mkdirSync(targetDir, { recursive: true });
          console.log(`Created directory ${targetDir}`);
        } else {
          console.log(`[Dry Run] Would create directory ${targetDir}`);
        }
      } else if (sync && !dryRun) {
        // In sync mode, clear out target directory first
        console.log(`Formatting directory ${targetDir}`);
        // We don't delete the directory itself to avoid permissions issues
        // Just clear its contents for each service
        const dirContents = fs.readdirSync(targetDir);
        for (const item of dirContents) {
          const itemPath = path.join(targetDir, item);
          try {
            if (fs.lstatSync(itemPath).isDirectory()) {
              fs.rmSync(itemPath, { recursive: true, force: true });
            } else {
              fs.unlinkSync(itemPath);
            }
            console.log(`Removed ${itemPath}`);
          } catch (err) {
            console.error(`Error removing ${itemPath}`, err);
          }
        }
      } else if (sync && dryRun) {
        console.log(`[Dry Run] Would format directory ${targetDir}`);
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
