import fs from 'fs';
import path from 'path';
import { Config } from './index';

export interface ProcessResult {
  processedCount: number;
  processedFiles: string[];
}

/**
 * Process Markdown files in a directory
 */
export function processDirectory(config: Config): ProcessResult {
  const { sourceDir, targetDir, targetExt, excludeFiles = [] } = config;
  const files = fs.readdirSync(sourceDir);
  let processedCount = 0;
  const processedFiles: string[] = [];
  
  for (const file of files) {
    if (file.endsWith('.md') && !excludeFiles.includes(file)) {
      const sourcePath = path.join(sourceDir, file);
      const targetFile = file.replace('.md', `.${targetExt}`);
      const targetPath = path.join(targetDir, targetFile);
      
      // Copy file
      fs.copyFileSync(sourcePath, targetPath);
      processedCount++;
      processedFiles.push(file);
      console.log(`Converted ${file} to ${targetFile}`);
    }
  }
  
  return {
    processedCount,
    processedFiles
  };
} 
