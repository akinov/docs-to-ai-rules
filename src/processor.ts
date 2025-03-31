import fs from 'fs';
import path from 'path';
import type { Config } from './interfaces/configManager';
import type { OutputService } from './services';
import { NodeFileSystemManager } from './utils/fileSystemManager';
import { FileSystemError } from './errors';

export interface ProcessResult {
  processedCount: number;
  processedFiles: string[];
  services: string[];
  updatedCount: number;
  updatedFiles: string[];
  deletedCount: number;
  deletedFiles: string[];
}

/**
 * Process Markdown files in a directory using FileSystemManager
 */
export function processDirectory(config: Config): ProcessResult {
  const { sourceDir, services, excludeFiles = [], dryRun = false, sync = false } = config;
  const fileSystemManager = new NodeFileSystemManager();

  let files: string[];
  try {
    files = fileSystemManager.readDir(sourceDir);
  } catch (err: any) {
    throw err;
  }

  let processedCount = 0;
  let updatedCount = 0;
  let deletedCount = 0;
  const processedFiles: string[] = [];
  const updatedFiles: string[] = [];
  const deletedFiles: string[] = [];
  
  const sourceFiles = new Set<string>();
  if (sync) {
    for (const file of files) {
      if (file.endsWith('.md') && !excludeFiles.includes(file)) {
        sourceFiles.add(file.replace('.md', ''));
      }
    }
  }
  
  for (const file of files) {
    if (file.endsWith('.md') && !excludeFiles.includes(file)) {
      const sourcePath = path.join(sourceDir, file);
      let fileNeedsUpdateOverall = false;
      
      for (const service of services) {
        const targetDir = service.getTargetDirectory();
        const targetExt = service.getTargetExtension();
        const targetFile = file.replace('.md', `.${targetExt}`);
        const targetPath = path.join(targetDir, targetFile);
        
        let currentFileNeedsUpdate = false;
        try {
          currentFileNeedsUpdate = fileSystemManager.needsUpdate(sourcePath, targetPath);
        } catch (err) {
          console.error(`Error checking update status for ${sourcePath} -> ${targetPath}`, err);
          throw err;
        }
        
        if (currentFileNeedsUpdate) {
          fileNeedsUpdateOverall = true;
          
          if (!dryRun) {
            try {
              fileSystemManager.copyFile(sourcePath, targetPath);
              console.log(`[${service.name}] Converted ${file} to ${targetFile}`);
            } catch (err) {
              console.error(`Error copying ${sourcePath} to ${targetPath}`, err);
              throw err;
            }
          }
        }
      }
      
      processedCount++;
      processedFiles.push(file);
      
      if (fileNeedsUpdateOverall) {
        updatedCount++;
        updatedFiles.push(file);
      }
    }
  }
  
  if (sync && !dryRun) {
    for (const service of services) {
      const targetDir = service.getTargetDirectory();
      const targetExt = service.getTargetExtension();
      
      if (fileSystemManager.fileExists(targetDir)) {
        let targetFiles: string[];
        try {
          targetFiles = fileSystemManager.readDir(targetDir);
        } catch (err) {
          console.error(`Error reading target directory ${targetDir} for sync`, err);
          throw err;
        }
        
        for (const targetFile of targetFiles) {
          if (targetFile.endsWith(`.${targetExt}`)) {
            const baseName = targetFile.substring(0, targetFile.length - targetExt.length - 1);
            
            if (!sourceFiles.has(baseName)) {
              const targetPath = path.join(targetDir, targetFile);
              try {
                fileSystemManager.deleteFile(targetPath);
                console.log(`[${service.name}] Deleted outdated file ${targetFile}`);
                deletedCount++;
                deletedFiles.push(targetFile);
              } catch (err) {
                console.error(`Error deleting ${targetPath}`, err);
                throw err;
              }
            }
          }
        }
      }
    }
  }
  
  return {
    processedCount,
    processedFiles,
    services: services.map(s => s.name),
    updatedCount,
    updatedFiles,
    deletedCount,
    deletedFiles
  };
} 
