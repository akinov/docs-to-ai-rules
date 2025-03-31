import type { OutputService } from '../services';
import type { FileSystemManager } from '../interfaces/fileSystemManager'; // Assuming this interface exists

/**
 * Interface for converting a single source file for a specific service.
 */
export interface FileConverter {
  /**
   * Checks if the file needs an update and converts it if necessary.
   * @param sourcePath Full path to the source file.
   * @param file Base name of the file (e.g., 'document.md').
   * @param service The output service instance.
   * @param dryRun If true, performs checks but doesn't write files.
   * @returns True if the file was updated (or would be updated in dry run), false otherwise.
   * @throws FileSystemError if file operations fail.
   */
  convertFile(
    sourcePath: string,
    file: string,
    service: OutputService,
    dryRun: boolean
  ): boolean;
}

/**
 * Interface for synchronizing a target directory by deleting stale files.
 */
export interface DirectorySynchronizer {
  /**
   * Deletes files in the target directory that do not have a corresponding source file.
   * @param sourceFilesBaseNames A set of source file base names (without .md extension).
   * @param service The output service instance.
   * @param dryRun If true, performs checks but doesn't delete files.
   * @returns An object containing the count and names of deleted files.
   * @throws FileSystemError if file operations fail.
   */
  syncTargetDirectory(
    sourceFilesBaseNames: Set<string>,
    service: OutputService,
    dryRun: boolean
  ): { deletedCount: number; deletedFiles: string[] };
} 
