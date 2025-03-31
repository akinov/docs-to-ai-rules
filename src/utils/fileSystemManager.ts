import fs from 'fs';
import { promises as fsPromises } from 'fs';
import path from 'path';
import type { FileSystemManager, FileStats } from '../interfaces/fileSystemManager';
import { FileSystemError, FileAccessError, DirectoryNotFoundError } from '../errors'; // Import custom errors
import logger from '../logger'; // Import logger

export class NodeFileSystemManager implements FileSystemManager {
  async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fsPromises.mkdir(dirPath, { recursive: true });
      logger.debug(`Ensured directory exists (or created): ${dirPath}`);
    } catch (err: any) {
      if (err.code === 'EEXIST') {
        logger.debug(`Directory already exists: ${dirPath}`);
        return;
      } else if (err.code === 'EACCES') {
        logger.error({ err, path: dirPath }, 'Permission denied creating directory');
        throw new FileAccessError(dirPath, 'create');
      } else {
        logger.error({ err, path: dirPath }, 'Failed to ensure directory exists');
        throw new FileSystemError(`Failed to ensure directory exists`, dirPath);
      }
    }
  }

  async removeDirectoryIfExists(dirPath: string): Promise<void> {
    try {
      await fsPromises.stat(dirPath);
      logger.debug(`Clearing contents of directory ${dirPath}`);
      await fsPromises.rm(dirPath, { recursive: true, force: true });
      logger.debug(`Removed directory: ${dirPath}`);
      await this.ensureDirectoryExists(dirPath);
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        logger.debug(`Directory not found, nothing to remove: ${dirPath}`);
        return;
      } else if (err instanceof FileSystemError) {
        throw err;
      } else if (err.code === 'EACCES') {
        logger.error({ err, path: dirPath }, 'Permission denied accessing directory for cleanup');
        throw new FileAccessError(dirPath, 'remove/access');
      } else {
        logger.error({ err, path: dirPath }, 'Failed to clear/remove directory contents');
        throw new FileSystemError('Failed to clear/remove directory contents', dirPath);
      }
    }
  }

  async fileExists(filePath: string): Promise<boolean> {
    try {
      await fsPromises.access(filePath, fs.constants.F_OK);
      return true;
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        return false;
      } else if (err.code === 'EACCES') {
        logger.warn({ err, path: filePath }, 'Permission denied checking file existence');
        throw new FileAccessError(filePath, 'check existence of');
      }
      logger.error({ err, path: filePath }, 'Failed to check file existence');
      throw new FileSystemError('Failed to check file existence', filePath);
    }
  }

  async getFileStats(filePath: string): Promise<FileStats | null> {
    try {
      const stats = await fsPromises.stat(filePath);
      return { mtime: stats.mtime, size: stats.size };
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return null;
      } else if (error.code === 'EACCES') {
        logger.error({ err: error, path: filePath }, 'Permission denied reading file stats');
        throw new FileAccessError(filePath, 'read stats of');
      }
      logger.error({ err: error, path: filePath }, 'Error getting file stats');
      throw new FileSystemError(`Failed to get file stats`, filePath);
    }
  }

  async copyFile(sourcePath: string, targetPath: string): Promise<void> {
    try {
      const targetDir = path.dirname(targetPath);
      await this.ensureDirectoryExists(targetDir);
      await fsPromises.copyFile(sourcePath, targetPath);
      logger.debug({ sourcePath, targetPath }, 'Copied file');
    } catch (err: any) {
      if (err instanceof FileSystemError) throw err;
      if (err.code === 'ENOENT' && err.path === sourcePath) {
        logger.error({ err, sourcePath }, 'Source file not found for copy');
        throw new FileSystemError('Source file not found for copy', sourcePath);
      } else if (err.code === 'EACCES') {
        try {
          await fsPromises.access(path.dirname(targetPath), fs.constants.W_OK);
          logger.error({ err, path: targetPath }, 'Permission denied writing target file');
          throw new FileAccessError(targetPath, 'write to');
        } catch {
          logger.error({ err, path: sourcePath }, 'Permission denied reading source file or writing target directory');
          throw new FileAccessError(sourcePath, 'read from or write to target dir');
        }
      }
      logger.error({ err, sourcePath, targetPath }, 'Failed to copy file');
      throw new FileSystemError(`Failed to copy file from ${sourcePath} to ${targetPath}`, err.message);
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      await fsPromises.unlink(filePath);
      logger.debug(`Deleted file: ${filePath}`);
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        logger.debug(`File not found, assumed already deleted: ${filePath}`);
        return;
      } else if (err.code === 'EACCES') {
        logger.error({ err, path: filePath }, 'Permission denied deleting file');
        throw new FileAccessError(filePath, 'delete');
      } else if (err.code === 'EISDIR') {
        logger.error({ err, path: filePath }, 'Attempted to delete a directory as a file');
        throw new FileSystemError('Attempted to delete a directory as a file', filePath);
      }
      logger.error({ err, path: filePath }, 'Failed to delete file');
      throw new FileSystemError(`Failed to delete file`, filePath);
    }
  }

  async needsUpdate(sourcePath: string, targetPath: string): Promise<boolean> {
    if (!(await this.fileExists(targetPath))) {
      return true;
    }
    let sourceStats: FileStats | null = null;
    let targetStats: FileStats | null = null;
    try {
      [sourceStats, targetStats] = await Promise.all([
        this.getFileStats(sourcePath),
        this.getFileStats(targetPath)
      ]);
    } catch (err) {
      throw err;
    }

    if (!sourceStats) {
      logger.error({ path: sourcePath }, 'Cannot compare update time: Source file stats unavailable');
      throw new FileSystemError('Cannot compare update time: Source file stats unavailable', sourcePath);
    }
    if (!targetStats) {
      logger.error({ path: targetPath }, 'Cannot compare update time: Target file stats unavailable despite existence');
      throw new FileSystemError('Cannot compare update time: Target file stats unavailable', targetPath);
    }

    return sourceStats.mtime.getTime() > targetStats.mtime.getTime();
  }

  async readFile(filePath: string): Promise<string> {
    try {
      return await fsPromises.readFile(filePath, 'utf-8');
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        logger.error({ err, path: filePath }, 'File not found for reading');
        throw new DirectoryNotFoundError(filePath);
      } else if (err.code === 'EACCES') {
        logger.error({ err, path: filePath }, 'Permission denied reading file');
        throw new FileAccessError(filePath, 'read');
      } else if (err.code === 'EISDIR') {
        logger.error({ err, path: filePath }, 'Attempted to read a directory as a file');
        throw new FileSystemError('Attempted to read a directory as a file', filePath);
      }
      logger.error({ err, path: filePath }, 'Failed to read file');
      throw new FileSystemError(`Failed to read file`, filePath);
    }
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    try {
      const targetDir = path.dirname(filePath);
      await this.ensureDirectoryExists(targetDir);
      await fsPromises.writeFile(filePath, content, 'utf-8');
      logger.debug({ path: filePath }, 'Wrote file');
    } catch (err: any) {
      if (err instanceof FileSystemError) throw err;
      if (err.code === 'EACCES') {
        logger.error({ err, path: filePath }, 'Permission denied writing file');
        throw new FileAccessError(filePath, 'write');
      } else if (err.code === 'EISDIR') {
        logger.error({ err, path: filePath }, 'Attempted to write to a directory path');
        throw new FileSystemError('Attempted to write to a path that is a directory', filePath);
      }
      logger.error({ err, path: filePath }, 'Failed to write file');
      throw new FileSystemError(`Failed to write file`, filePath);
    }
  }

  async readDir(dirPath: string): Promise<string[]> {
    try {
      return await fsPromises.readdir(dirPath);
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        logger.error({ err, path: dirPath }, 'Directory not found for reading');
        throw new DirectoryNotFoundError(dirPath);
      } else if (err.code === 'EACCES') {
        logger.error({ err, path: dirPath }, 'Permission denied reading directory');
        throw new FileAccessError(dirPath, 'read directory');
      } else if (err.code === 'ENOTDIR') {
        logger.error({ err, path: dirPath }, 'Path is not a directory');
        throw new FileSystemError('Path is not a directory', dirPath);
      }
      logger.error({ err, path: dirPath }, 'Failed to read directory');
      throw new FileSystemError(`Failed to read directory`, dirPath);
    }
  }
}

// Optional: Export a default instance
// export const fileSystemManager = new NodeFileSystemManager(); 
