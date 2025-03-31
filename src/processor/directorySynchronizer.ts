import path from 'path';
import type { OutputService } from '../services';
import type { FileSystemManager } from '../interfaces/fileSystemManager';
import type { DirectorySynchronizer } from '../interfaces/processorComponents';
import logger from '../logger'; // Import logger

export class DirectorySynchronizerImpl implements DirectorySynchronizer {
  constructor(private fileSystemManager: FileSystemManager) {}

  async syncTargetDirectory(
    sourceFilesBaseNames: Set<string>,
    service: OutputService,
    dryRun: boolean
  ): Promise<{ deletedCount: number; deletedFiles: string[] }> {
    const targetDir = service.getTargetDirectory();
    const targetExt = service.getTargetExtension();
    const deletedFiles: string[] = [];
    let deletedCount = 0;

    if (dryRun) {
      logger.info(`[${service.name}] [Dry Run] Skipping sync for target directory ${targetDir}`); // Use logger
      return { deletedCount: 0, deletedFiles: [] };
    }

    try {
      if (!(await this.fileSystemManager.fileExists(targetDir))) {
        logger.debug(`Target directory ${targetDir} does not exist, skipping sync.`); // Use logger
        return { deletedCount: 0, deletedFiles: [] };
      }

      const targetFiles = await this.fileSystemManager.readDir(targetDir);

      await Promise.all(targetFiles.map(async (targetFile) => {
        if (targetFile.endsWith(`.${targetExt}`)) {
          const baseName = targetFile.substring(0, targetFile.length - targetExt.length - 1);

          if (!sourceFilesBaseNames.has(baseName)) {
            const targetPath = path.join(targetDir, targetFile);
            try {
              await this.fileSystemManager.deleteFile(targetPath);
              logger.info(`[${service.name}] Deleted outdated file ${targetFile}`); // Use logger
              deletedFiles.push(targetFile);
            } catch (deleteErr) {
              logger.error({ err: deleteErr, targetPath }, `Error deleting outdated file ${targetFile}`); // Use logger
              throw deleteErr;
            }
          }
        }
      }));

      deletedCount = deletedFiles.length;

    } catch (readErr) {
      logger.error({ err: readErr, targetDir }, `Error reading target directory ${targetDir} for sync`); // Use logger
      throw readErr;
    }

    return { deletedCount, deletedFiles };
  }
} 
