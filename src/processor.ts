import fs from 'fs';
import path from 'path';
import type { Config } from './interfaces/configManager';
import type { OutputService } from './services';
import { NodeFileSystemManager } from './utils/fileSystemManager';
import { FileSystemError, DirectoryNotFoundError } from './errors';
import { FileConverterImpl } from './processor/fileConverter';
import { DirectorySynchronizerImpl } from './processor/directorySynchronizer';
import logger from './logger';

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
 * Process Markdown files in a directory using FileSystemManager and component classes.
 */
export async function processDirectory(config: Config): Promise<ProcessResult> {
  const { sourceDir, services, excludeFiles = [], dryRun = false, sync = false } = config;

  // Dependencies
  const fileSystemManager = new NodeFileSystemManager();
  const fileConverter = new FileConverterImpl(fileSystemManager);
  const directorySynchronizer = new DirectorySynchronizerImpl(fileSystemManager);

  // Result accumulator
  const result: ProcessResult = {
    processedCount: 0,
    processedFiles: [],
    services: services.map(s => s.name), // Get service names early
    updatedCount: 0,
    updatedFiles: [],
    deletedCount: 0,
    deletedFiles: [],
  };

  let files: string[];
  try {
    if (!(await fileSystemManager.fileExists(sourceDir))) {
        logger.error(`Source directory not found: ${sourceDir}`); // Use logger
        throw new DirectoryNotFoundError(sourceDir);
    }
    files = await fileSystemManager.readDir(sourceDir);
    logger.info(`Processing ${files.length} files/directories in ${sourceDir}`); // Use logger
  } catch (err: any) {
     logger.error({ err, sourceDir }, `Failed to read source directory`); // Use logger
    if (err instanceof FileSystemError) {
        throw err;
    }
    throw new FileSystemError(`Failed to read source directory ${sourceDir}: ${err.message || err}`);
  }

  const sourceFilesBaseNames = new Set<string>();
   if (sync) {
    for (const file of files) {
      if (file.endsWith('.md') && !excludeFiles.includes(file)) {
         const baseName = file.substring(0, file.length - 3);
         sourceFilesBaseNames.add(baseName);
      }
    }
    logger.debug({ count: sourceFilesBaseNames.size }, 'Collected source file base names for sync'); // Use logger
   }

  // Process each file - Use Promise.all for parallel processing
  const processPromises = files.map(async (file) => {
    if (file.endsWith('.md') && !excludeFiles.includes(file)) {
      const sourcePath = path.join(sourceDir, file);
      let fileNeedsUpdateOverall = false;

      // Process services sequentially for a single file for simplicity,
      // or use Promise.all if services can be processed independently.
      for (const service of services) {
        try {
          const updated = await fileConverter.convertFile(sourcePath, file, service, dryRun);
          if (updated) {
            fileNeedsUpdateOverall = true;
          }
        } catch (err) {
           logger.error({ err, file, service: service.name }, `Error processing file for service`); // Use logger
           // throw err; // Consider collecting errors instead of stopping
        }
      }

      // Return information about the processed file
      return { file, updated: fileNeedsUpdateOverall };
    }
    return null; // Return null for non-markdown files or excluded files
  });

  // Wait for all file processing to complete
  const processedFilesInfo = (await Promise.all(processPromises)).filter(info => info !== null) as { file: string, updated: boolean }[];

  // Update results based on processed files info
  result.processedCount = processedFilesInfo.length;
  result.processedFiles = processedFilesInfo.map(info => info.file);
  result.updatedCount = processedFilesInfo.filter(info => info.updated).length;
  result.updatedFiles = processedFilesInfo.filter(info => info.updated).map(info => info.file);


  if (sync) {
    logger.info('Starting directory synchronization'); // Use logger
    // Synchronize directories - Use Promise.all for parallel sync
    const syncPromises = services.map(async (service) => {
      try {
        const syncResult = await directorySynchronizer.syncTargetDirectory(
          sourceFilesBaseNames,
          service,
          dryRun
        );
        return syncResult;
      } catch (err) {
         logger.error({ err, service: service.name }, `Error syncing target directory for service`); // Use logger
         // Return an empty result or rethrow depending on desired error handling
         return { deletedCount: 0, deletedFiles: [] };
      }
    });

    // Wait for all sync operations
    const syncResults = await Promise.all(syncPromises);

    // Aggregate sync results
    for (const syncResult of syncResults) {
        result.deletedCount += syncResult.deletedCount;
        result.deletedFiles.push(...syncResult.deletedFiles);
    }
  }

   logger.info({ result }, 'Processing complete'); // Use logger
  return result;
} 
