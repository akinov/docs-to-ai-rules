import fs from 'fs';
import path from 'path';
import { Config } from './index';
import { OutputService } from './services';

export interface ProcessResult {
  processedCount: number;
  processedFiles: string[];
  services: string[];
  updatedCount: number;
  updatedFiles: string[];
}

/**
 * Check if target file needs update by comparing modification times
 */
function needsUpdate(sourcePath: string, targetPath: string): boolean {
  if (!fs.existsSync(targetPath)) {
    return true;
  }

  const sourceStats = fs.statSync(sourcePath);
  const targetStats = fs.statSync(targetPath);

  return sourceStats.mtimeMs > targetStats.mtimeMs;
}

/**
 * Process Markdown files in a directory
 */
export function processDirectory(config: Config): ProcessResult {
  const { sourceDir, services, excludeFiles = [], dryRun = false } = config;
  const files = fs.readdirSync(sourceDir);
  let processedCount = 0;
  let updatedCount = 0;
  const processedFiles: string[] = [];
  const updatedFiles: string[] = [];
  
  for (const file of files) {
    if (file.endsWith('.md') && !excludeFiles.includes(file)) {
      const sourcePath = path.join(sourceDir, file);
      let fileNeedsUpdate = false;
      
      // Process file for each service
      for (const service of services) {
        const targetDir = service.getTargetDirectory();
        const targetExt = service.getTargetExtension();
        const targetFile = file.replace('.md', `.${targetExt}`);
        const targetPath = path.join(targetDir, targetFile);
        
        // Check if file needs update
        if (needsUpdate(sourcePath, targetPath)) {
          fileNeedsUpdate = true;
          
          // Create directory if it doesn't exist and not in dry run
          if (!fs.existsSync(targetDir) && !dryRun) {
            fs.mkdirSync(targetDir, { recursive: true });
          }
          
          // Copy file if not in dry run
          if (!dryRun) {
            fs.copyFileSync(sourcePath, targetPath);
            console.log(`[${service.name}] Converted ${file} to ${targetFile}`);
          }
        }
      }
      
      processedCount++;
      processedFiles.push(file);
      
      if (fileNeedsUpdate) {
        updatedCount++;
        updatedFiles.push(file);
      }
    }
  }
  
  return {
    processedCount,
    processedFiles,
    services: services.map(s => s.name),
    updatedCount,
    updatedFiles
  };
} 
