import fs from 'fs';
import path from 'path';
import { processDirectory } from './processor';
import { OutputService } from './services';

export interface Config {
  sourceDir: string;
  services: OutputService[];
  targetExt?: string;
  excludeFiles?: string[];
}

export function convertDocs(config: Config): void {
  const { sourceDir, services, excludeFiles = ['README.md'] } = config;

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
        fs.mkdirSync(targetDir, { recursive: true });
        console.log(`Created directory ${targetDir}`);
      }
    } catch (err) {
      console.error(`Error: Could not create directory ${targetDir}`, err);
      process.exit(1);
    }
  }

  // Execute conversion
  try {
    const result = processDirectory(config);
    console.log(`Processing complete: Converted ${result.processedCount} files to ${result.services.length} services`);
  } catch (err) {
    console.error('Error during file conversion:', err);
    process.exit(1);
  }
}

// Default export
export default {
  convertDocs
}; 
