import fs from 'fs';
import path from 'path';
import type { FileSystemManager, FileStats } from '../interfaces/fileSystemManager';
import { FileSystemError, FileAccessError, DirectoryNotFoundError } from '../errors'; // Import custom errors

export class NodeFileSystemManager implements FileSystemManager {
  ensureDirectoryExists(dirPath: string): void {
    try {
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        // console.log(`Created directory: ${dirPath}`); // Logging will be handled elsewhere
      }
    } catch (err: any) {
        // Improve error context
        if (err.code === 'EACCES') {
            throw new FileAccessError(dirPath, 'create');
        } else {
            throw new FileSystemError(`Failed to ensure directory exists`, dirPath);
        }
    }
  }

  removeDirectoryIfExists(dirPath: string): void {
    try {
        if (fs.existsSync(dirPath)) {
            // console.log(`Formatting directory ${dirPath}`); // Logging
            // Clear contents instead of removing the directory itself
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
                // console.log(`Removed ${itemPath}`); // Logging
            } catch (err: any) {
                // More specific error handling for removal
                 if (err.code === 'EACCES') {
                    throw new FileAccessError(itemPath, 'remove');
                 } else {
                    throw new FileSystemError(`Error removing item during directory cleanup`, itemPath);
                 }
            }
            }
        }
    } catch (err: any) {
        // Catch errors from readdirSync or initial existsSync
        if (err instanceof FileSystemError) throw err; // Don't wrap our own errors
        if (err.code === 'EACCES') {
            throw new FileAccessError(dirPath, 'read/access');
        } else {
            throw new FileSystemError('Failed to clear directory contents', dirPath);
        }
    }
  }

  fileExists(filePath: string): boolean {
    try {
        return fs.existsSync(filePath);
    } catch (err: any) {
        // existsSync can technically throw EACCES, though less common
        if (err.code === 'EACCES') {
             throw new FileAccessError(filePath, 'check existence of');
        }
        throw new FileSystemError('Failed to check file existence', filePath);
    }
  }

  getFileStats(filePath: string): FileStats | null {
    try {
      const stats = fs.statSync(filePath);
      return { mtime: stats.mtime, size: stats.size };
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return null; // File does not exist - not an error in this context
      } else if (error.code === 'EACCES') {
          throw new FileAccessError(filePath, 'read stats of');
      }
      // console.error(`Error getting stats for ${filePath}`, error); // Logging
      throw new FileSystemError(`Failed to get file stats`, filePath);
    }
  }

  copyFile(sourcePath: string, targetPath: string): void {
    try {
      const targetDir = path.dirname(targetPath);
      this.ensureDirectoryExists(targetDir); // This can throw FileSystemError
      fs.copyFileSync(sourcePath, targetPath);
    } catch (err: any) {
        if (err instanceof FileSystemError) throw err; // Don't wrap our own errors
        // Handle potential errors from copyFileSync
        if (err.code === 'ENOENT' && err.path === sourcePath) {
            throw new FileSystemError('Source file not found for copy', sourcePath);
        } else if (err.code === 'EACCES') {
            // Determine if it was source read or target write permission issue
            try {
                fs.accessSync(sourcePath, fs.constants.R_OK);
                // If source access is okay, it must be target write issue
                 throw new FileAccessError(targetPath, 'write to');
            } catch {
                // Source read access failed
                throw new FileAccessError(sourcePath, 'read from');
            }
        }
      // console.error(`Error copying file from ${sourcePath} to ${targetPath}`, err); // Logging
      throw new FileSystemError(`Failed to copy file from ${sourcePath} to ${targetPath}`, err.message); // Include original message if helpful
    }
  }

  deleteFile(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) { // Avoid ENOENT from unlinkSync
        fs.unlinkSync(filePath);
        // console.log(`Deleted file: ${filePath}`); // Logging
      }
    } catch (err: any) {
        if (err.code === 'EACCES') {
            throw new FileAccessError(filePath, 'delete');
        } else if (err.code === 'EISDIR') {
            // Optionally handle trying to delete a directory as a file
             throw new FileSystemError('Attempted to delete a directory as a file', filePath);
        }
      // console.error(`Error deleting file ${filePath}`, err); // Logging
      throw new FileSystemError(`Failed to delete file`, filePath);
    }
  }

  needsUpdate(sourcePath: string, targetPath: string): boolean {
    // fileExists and getFileStats now throw specific errors if needed
    if (!this.fileExists(targetPath)) {
      return true;
    }
    const sourceStats = this.getFileStats(sourcePath);
    const targetStats = this.getFileStats(targetPath);

    if (!sourceStats) {
        // Source file doesn't exist or cannot be accessed
        throw new FileSystemError('Cannot compare update time: Source file stats unavailable', sourcePath);
    }
    if (!targetStats) {
        // Target exists but stats couldn't be read (e.g., permissions changed)
        // Treat this as needing an update or throw?
        // Let's consider it needs an update to be safe, or re-throw FileAccessError from getFileStats
        // Rethrowing seems more accurate.
         this.getFileStats(targetPath); // This will likely re-throw the specific error
         return true; // Fallback, though should not be reached if getFileStats throws
    }

    return sourceStats.mtime > targetStats.mtime;
  }

  readFile(filePath: string): string {
     try {
       return fs.readFileSync(filePath, 'utf-8');
     } catch (err: any) {
         if (err.code === 'ENOENT') {
             throw new DirectoryNotFoundError(filePath); // Or a more specific FileNotFoundError
         } else if (err.code === 'EACCES') {
            throw new FileAccessError(filePath, 'read');
         } else if (err.code === 'EISDIR') {
             throw new FileSystemError('Attempted to read a directory as a file', filePath);
         }
       // console.error(`Error reading file ${filePath}`, err); // Logging
       throw new FileSystemError(`Failed to read file`, filePath);
     }
  }

  writeFile(filePath: string, content: string): void {
    try {
      const targetDir = path.dirname(filePath);
      this.ensureDirectoryExists(targetDir);
      fs.writeFileSync(filePath, content, 'utf-8');
    } catch (err: any) {
        if (err instanceof FileSystemError) throw err; // Don't wrap
        if (err.code === 'EACCES') {
            throw new FileAccessError(filePath, 'write');
        } else if (err.code === 'EISDIR') {
            throw new FileSystemError('Attempted to write to a path that is a directory', filePath);
        }
      // console.error(`Error writing file ${filePath}`, err); // Logging
      throw new FileSystemError(`Failed to write file`, filePath);
    }
  }

  readDir(dirPath: string): string[] {
    try {
      return fs.readdirSync(dirPath);
    } catch (err: any) {
        if (err.code === 'ENOENT') {
            throw new DirectoryNotFoundError(dirPath);
        } else if (err.code === 'EACCES') {
            throw new FileAccessError(dirPath, 'read directory');
        } else if (err.code === 'ENOTDIR') {
            throw new FileSystemError('Path is not a directory', dirPath);
        }
      // console.error(`Error reading directory ${dirPath}`, err); // Logging
      throw new FileSystemError(`Failed to read directory`, dirPath);
    }
  }
}

// Optional: Export a default instance
// export const fileSystemManager = new NodeFileSystemManager(); 
