import fs from 'fs';
import path from 'path';
import { processDirectory } from './processor';
import { OutputService } from './services';

export interface Config {
  sourceDir: string;
  services: OutputService[];
  excludeFiles?: string[];
  dryRun?: boolean;
}

export function convertDocs(config: Config): void {
  const { sourceDir, services, excludeFiles = ['README.md'], dryRun = false } = config;

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
      }
    } catch (err) {
      console.error(`Error: Could not create directory ${targetDir}`, err);
      process.exit(1);
    }
  }

  // Execute conversion
  try {
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
