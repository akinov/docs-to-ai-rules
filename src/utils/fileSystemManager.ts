import fs from 'fs';
import path from 'path';
import type { FileSystemManager, FileStats } from '../interfaces/fileSystemManager';

export class NodeFileSystemManager implements FileSystemManager {
  ensureDirectoryExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      // Consider adding logging here in the future
      console.log(`Created directory: ${dirPath}`);
    }
  }

  removeDirectoryIfExists(dirPath: string): void {
    if (fs.existsSync(dirPath)) {
      console.log(`Formatting directory ${dirPath}`);
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
          console.log(`Removed ${itemPath}`);
        } catch (err) {
          console.error(`Error removing ${itemPath}`, err);
          // Consider throwing a custom error
          throw err; // Rethrow for now
        }
      }
    }
  }

  fileExists(filePath: string): boolean {
    return fs.existsSync(filePath);
  }

  getFileStats(filePath: string): FileStats | null {
    try {
      const stats = fs.statSync(filePath);
      return { mtime: stats.mtime, size: stats.size };
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return null; // File does not exist
      }
      console.error(`Error getting stats for ${filePath}`, error);
      throw error; // Rethrow other errors
    }
  }

  copyFile(sourcePath: string, targetPath: string): void {
    try {
      // Ensure target directory exists
      const targetDir = path.dirname(targetPath);
      this.ensureDirectoryExists(targetDir);
      fs.copyFileSync(sourcePath, targetPath);
    } catch (err) {
      console.error(`Error copying file from ${sourcePath} to ${targetPath}`, err);
      throw err;
    }
  }

  deleteFile(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`Deleted file: ${filePath}`);
      }
    } catch (err) {
      console.error(`Error deleting file ${filePath}`, err);
      throw err;
    }
  }

  needsUpdate(sourcePath: string, targetPath: string): boolean {
    if (!this.fileExists(targetPath)) {
      return true; // Target doesn't exist, needs update
    }
    const sourceStats = this.getFileStats(sourcePath);
    const targetStats = this.getFileStats(targetPath);

    // If stats couldn't be read for source, it's an error state, but arguably doesn't *need* update?
    // If stats couldn't be read for target (shouldn't happen due to fileExists check), needs update.
    if (!sourceStats || !targetStats) {
      // Log or handle this inconsistency? For now, assume update needed if target stats missing.
      return targetStats === null;
    }

    // Compare modification times
    return sourceStats.mtime > targetStats.mtime;
  }

  readFile(filePath: string): string {
     try {
       return fs.readFileSync(filePath, 'utf-8');
     } catch (err) {
       console.error(`Error reading file ${filePath}`, err);
       throw err;
     }
  }

  writeFile(filePath: string, content: string): void {
    try {
      // Ensure target directory exists
      const targetDir = path.dirname(filePath);
      this.ensureDirectoryExists(targetDir);
      fs.writeFileSync(filePath, content, 'utf-8');
    } catch (err) {
      console.error(`Error writing file ${filePath}`, err);
      throw err;
    }
  }

  readDir(dirPath: string): string[] {
    try {
      return fs.readdirSync(dirPath);
    } catch (err) {
      console.error(`Error reading directory ${dirPath}`, err);
      throw err;
    }
  }
}

// Optional: Export a default instance
// export const fileSystemManager = new NodeFileSystemManager(); 
