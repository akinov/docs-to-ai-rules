import path from 'path';
import type { OutputService } from '../services';
import type { FileSystemManager } from '../interfaces/fileSystemManager';
import type { FileConverter } from '../interfaces/processorComponents';
import logger from '../logger'; // Import logger

export class FileConverterImpl implements FileConverter {
  constructor(private fileSystemManager: FileSystemManager) {}

  async convertFile(
    sourcePath: string,
    file: string,
    service: OutputService,
    dryRun: boolean
  ): Promise<boolean> {
    const targetDir = service.getTargetDirectory();
    const targetExt = service.getTargetExtension();
    const targetFile = file.replace(/\.md$/, `.${targetExt}`); // Ensure only .md extension is replaced
    const targetPath = path.join(targetDir, targetFile);

    let needsUpdate = false;
    try {
      needsUpdate = await this.fileSystemManager.needsUpdate(sourcePath, targetPath);
    } catch (err) {
      logger.error({ err, sourcePath, targetPath }, `Error checking update status for ${file}`); // Use logger
      throw err; // Re-throw original error or custom error
    }

    if (needsUpdate) {
      if (!dryRun) {
        try {
          // Ensure target directory exists before copying
          // Fix: Use ensureDirectoryExists which exists in NodeFileSystemManager
          await this.fileSystemManager.ensureDirectoryExists(targetDir);
          await this.fileSystemManager.copyFile(sourcePath, targetPath);
          logger.info(`[${service.name}] Converted ${file} to ${targetFile}`); // Use logger
        } catch (err) {
          logger.error({ err, sourcePath, targetPath }, `Error copying file ${file} for service ${service.name}`); // Use logger
          throw err; // Re-throw original error or custom error
        }
      } else {
         logger.info(`[${service.name}] [Dry Run] Would convert ${file} to ${targetFile}`); // Use logger
      }
    }
    return needsUpdate;
  }
} 
