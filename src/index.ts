import fs from 'fs';
import path from 'path';
import { processDirectory } from './processor';
import type { OutputService } from './services';
import type { Config } from './interfaces/configManager';
import { NodeFileSystemManager } from './utils/fileSystemManager';
import { DirectoryNotFoundError, FileSystemError } from './errors';
import logger from './logger';

export type { Config } from './interfaces/configManager';

/**
 * Main function to convert documentation based on configuration.
 */
export async function convertDocs(config: Config): Promise<void> {
  const { sourceDir, services, excludeFiles = [], dryRun = false, sync = false } = config;
  logger.info({ config: { ...config, services: config.services.map(s => s.name) } }, 'Starting documentation conversion');

  const fileSystemManager = new NodeFileSystemManager();

  try {
    // Check source directory existence first
    if (!(await fileSystemManager.fileExists(sourceDir))) {
      logger.error(`Source directory '${sourceDir}' not found.`);
      throw new DirectoryNotFoundError(sourceDir);
    }

    // Prepare target directories (ensure they exist)
    const targetDirPromises = services.map(async (service) => {
      const targetDir = service.getTargetDirectory();
      await fileSystemManager.ensureDirectoryExists(targetDir);
      logger.debug(`Ensured target directory exists: ${targetDir}`);
    });
    await Promise.all(targetDirPromises);

    if (dryRun) {
      logger.info('[Dry Run] Skipping actual file processing and sync.');
      logger.info('[Dry Run] Complete. No changes were made.');
      return;
    }

    // Process the directory
    const result = await processDirectory(config);

    logger.info(
      `Processing complete. Processed: ${result.processedCount}, Updated: ${result.updatedCount}, Deleted: ${result.deletedCount} (Sync)`
    );
    if (result.updatedFiles.length > 0) {
      logger.info(`Updated files: ${result.updatedFiles.join(', ')}`);
    }
    if (result.deletedFiles.length > 0) {
      logger.info(`Deleted files (Sync): ${result.deletedFiles.join(', ')}`);
    }

  } catch (error: any) {
    if (error instanceof DirectoryNotFoundError) {
      throw error;
    } else if (error instanceof FileSystemError) {
       logger.error({ err: error }, `File system error during conversion: ${error.message}`);
      throw error;
    } else {
      logger.error({ err: error }, `An unexpected error occurred during conversion: ${error.message || error}`);
      throw new Error(`Conversion failed: ${error.message || error}`);
    }
  }
}

// Default export
export default {
  convertDocs
}; 
