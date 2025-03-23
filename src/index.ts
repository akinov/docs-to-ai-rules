import fs from 'fs';
import path from 'path';
import { processDirectory } from './processor';

export interface Config {
  sourceDir: string;
  targetDir: string;
  targetExt: string;
  excludeFiles?: string[];
}

export function convertDocs(config: Config): void {
  const { sourceDir, targetDir, excludeFiles = ['README.md'] } = config;

  // Check if target directory exists, create if not
  try {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
      console.log(`Created directory ${targetDir}`);
    }
  } catch (err) {
    console.error(`Error: Could not create directory ${targetDir}`, err);
    process.exit(1);
  }

  // Execute conversion
  try {
    const result = processDirectory(config);
    console.log(`Processing complete: Converted ${result.processedCount} files`);
  } catch (err) {
    console.error('Error during file conversion:', err);
    process.exit(1);
  }
}

// Default export
export default {
  convertDocs
}; 
