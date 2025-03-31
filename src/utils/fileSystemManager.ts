import fs from 'fs';
import path from 'path';
import type { FileSystemManager, FileStats } from '../interfaces/fileSystemManager';
import { FileSystemError, FileAccessError, DirectoryNotFoundError } from '../errors'; // Import custom errors
import logger from '../logger'; // Import logger

export class NodeFileSystemManager implements FileSystemManager {
  ensureDirectoryExists(dirPath: string): void {
    try {
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        logger.debug(`Created directory: ${dirPath}`); // Use logger
      }
    } catch (err: any) {
        if (err.code === 'EACCES') {
            logger.error({ err, path: dirPath }, 'Permission denied creating directory'); // Use logger
            throw new FileAccessError(dirPath, 'create');
        } else {
            logger.error({ err, path: dirPath }, 'Failed to ensure directory exists'); // Use logger
            throw new FileSystemError(`Failed to ensure directory exists`, dirPath);
        }
    }
  }

  removeDirectoryIfExists(dirPath: string): void {
    try {
        if (fs.existsSync(dirPath)) {
            logger.debug(`Clearing contents of directory ${dirPath}`); // Use logger
            const dirContents = fs.readdirSync(dirPath);
            for (const item of dirContents) {
            const itemPath = path.join(dirPath, item);
            try {
                const stats = fs.lstatSync(itemPath);
                if (stats.isDirectory()) {
                fs.rmSync(itemPath, { recursive: true, force: true });
                } else {
                fs.unlinkSync(itemPath);
                }
                logger.debug(`Removed ${itemPath}`); // Use logger
            } catch (err: any) {
                 if (err.code === 'EACCES') {
                    logger.error({ err, path: itemPath }, 'Permission denied removing item during cleanup'); // Use logger
                    throw new FileAccessError(itemPath, 'remove');
                 } else {
                    logger.error({ err, path: itemPath }, 'Error removing item during directory cleanup'); // Use logger
                    throw new FileSystemError(`Error removing item during directory cleanup`, itemPath);
                 }
            }
            }
        }
    } catch (err: any) {
        if (err instanceof FileSystemError) throw err;
        if (err.code === 'EACCES') {
            logger.error({ err, path: dirPath }, 'Permission denied accessing directory for cleanup'); // Use logger
            throw new FileAccessError(dirPath, 'read/access');
        } else {
            logger.error({ err, path: dirPath }, 'Failed to clear directory contents'); // Use logger
            throw new FileSystemError('Failed to clear directory contents', dirPath);
        }
    }
  }

  fileExists(filePath: string): boolean {
    try {
        return fs.existsSync(filePath);
    } catch (err: any) {
        if (err.code === 'EACCES') {
             logger.warn({ err, path: filePath }, 'Permission denied checking file existence'); // Use logger (warn, as it might be recoverable)
             throw new FileAccessError(filePath, 'check existence of');
        }
        logger.error({ err, path: filePath }, 'Failed to check file existence'); // Use logger
        throw new FileSystemError('Failed to check file existence', filePath);
    }
  }

  getFileStats(filePath: string): FileStats | null {
    try {
      const stats = fs.statSync(filePath);
      return { mtime: stats.mtime, size: stats.size };
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return null;
      } else if (error.code === 'EACCES') {
          logger.error({ err: error, path: filePath }, 'Permission denied reading file stats'); // Use logger
          throw new FileAccessError(filePath, 'read stats of');
      }
      logger.error({ err: error, path: filePath }, 'Error getting file stats'); // Use logger
      throw new FileSystemError(`Failed to get file stats`, filePath);
    }
  }

  copyFile(sourcePath: string, targetPath: string): void {
    try {
      const targetDir = path.dirname(targetPath);
      this.ensureDirectoryExists(targetDir);
      fs.copyFileSync(sourcePath, targetPath);
      logger.debug({ sourcePath, targetPath }, 'Copied file'); // Use logger
    } catch (err: any) {
        if (err instanceof FileSystemError) throw err;
        if (err.code === 'ENOENT' && err.path === sourcePath) {
            logger.error({ err, sourcePath }, 'Source file not found for copy'); // Use logger
            throw new FileSystemError('Source file not found for copy', sourcePath);
        } else if (err.code === 'EACCES') {
            try {
                fs.accessSync(sourcePath, fs.constants.R_OK);
                 logger.error({ err, path: targetPath }, 'Permission denied writing target file'); // Use logger
                 throw new FileAccessError(targetPath, 'write to');
            } catch {
                logger.error({ err, path: sourcePath }, 'Permission denied reading source file'); // Use logger
                throw new FileAccessError(sourcePath, 'read from');
            }
        }
      logger.error({ err, sourcePath, targetPath }, 'Failed to copy file'); // Use logger
      throw new FileSystemError(`Failed to copy file from ${sourcePath} to ${targetPath}`, err.message);
    }
  }

  deleteFile(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.debug(`Deleted file: ${filePath}`); // Use logger
      }
    } catch (err: any) {
        if (err.code === 'EACCES') {
            logger.error({ err, path: filePath }, 'Permission denied deleting file'); // Use logger
            throw new FileAccessError(filePath, 'delete');
        } else if (err.code === 'EISDIR') {
             logger.error({ err, path: filePath }, 'Attempted to delete a directory as a file'); // Use logger
             throw new FileSystemError('Attempted to delete a directory as a file', filePath);
        }
      logger.error({ err, path: filePath }, 'Failed to delete file'); // Use logger
      throw new FileSystemError(`Failed to delete file`, filePath);
    }
  }

  needsUpdate(sourcePath: string, targetPath: string): boolean {
    if (!this.fileExists(targetPath)) {
      return true;
    }
    let sourceStats: FileStats | null = null;
    let targetStats: FileStats | null = null;
    try {
      sourceStats = this.getFileStats(sourcePath);
      targetStats = this.getFileStats(targetPath);
    } catch (err) {
        // Errors are already logged in getFileStats, just rethrow
        throw err;
    }

    if (!sourceStats) {
        // This case might be handled by getFileStats throwing ENOENT/EACCESS, but check just in case
        logger.error({ path: sourcePath }, 'Cannot compare update time: Source file stats unavailable'); // Use logger
        throw new FileSystemError('Cannot compare update time: Source file stats unavailable', sourcePath);
    }
    if (!targetStats) {
         // Should be handled by getFileStats if file exists but stats cannot be read
         logger.error({ path: targetPath }, 'Cannot compare update time: Target file stats unavailable despite existence'); // Use logger
         throw new FileSystemError('Cannot compare update time: Target file stats unavailable', targetPath);
    }

    return sourceStats.mtime > targetStats.mtime;
  }

  readFile(filePath: string): string {
     try {
       return fs.readFileSync(filePath, 'utf-8');
     } catch (err: any) {
         if (err.code === 'ENOENT') {
             logger.error({ err, path: filePath }, 'File not found for reading'); // Use logger
             throw new DirectoryNotFoundError(filePath); // Or a more specific FileNotFoundError
         } else if (err.code === 'EACCES') {
            logger.error({ err, path: filePath }, 'Permission denied reading file'); // Use logger
            throw new FileAccessError(filePath, 'read');
         } else if (err.code === 'EISDIR') {
             logger.error({ err, path: filePath }, 'Attempted to read a directory as a file'); // Use logger
             throw new FileSystemError('Attempted to read a directory as a file', filePath);
         }
       logger.error({ err, path: filePath }, 'Failed to read file'); // Use logger
       throw new FileSystemError(`Failed to read file`, filePath);
     }
  }

  writeFile(filePath: string, content: string): void {
    try {
      const targetDir = path.dirname(filePath);
      this.ensureDirectoryExists(targetDir);
      fs.writeFileSync(filePath, content, 'utf-8');
      logger.debug({ path: filePath }, 'Wrote file'); // Use logger
    } catch (err: any) {
        if (err instanceof FileSystemError) throw err;
        if (err.code === 'EACCES') {
            logger.error({ err, path: filePath }, 'Permission denied writing file'); // Use logger
            throw new FileAccessError(filePath, 'write');
        } else if (err.code === 'EISDIR') {
            logger.error({ err, path: filePath }, 'Attempted to write to a directory path'); // Use logger
            throw new FileSystemError('Attempted to write to a path that is a directory', filePath);
        }
      logger.error({ err, path: filePath }, 'Failed to write file'); // Use logger
      throw new FileSystemError(`Failed to write file`, filePath);
    }
  }

  readDir(dirPath: string): string[] {
    try {
      return fs.readdirSync(dirPath);
    } catch (err: any) {
        if (err.code === 'ENOENT') {
            logger.error({ err, path: dirPath }, 'Directory not found for reading'); // Use logger
            throw new DirectoryNotFoundError(dirPath);
        } else if (err.code === 'EACCES') {
            logger.error({ err, path: dirPath }, 'Permission denied reading directory'); // Use logger
            throw new FileAccessError(dirPath, 'read directory');
        } else if (err.code === 'ENOTDIR') {
            logger.error({ err, path: dirPath }, 'Path is not a directory'); // Use logger
            throw new FileSystemError('Path is not a directory', dirPath);
        }
      logger.error({ err, path: dirPath }, 'Failed to read directory'); // Use logger
      throw new FileSystemError(`Failed to read directory`, dirPath);
    }
  }
}

// Optional: Export a default instance
// export const fileSystemManager = new NodeFileSystemManager(); 
