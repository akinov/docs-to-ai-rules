import fs from 'fs';

export interface FileStats {
  mtime: Date;
  size: number;
}

export interface FileSystemManager {
  ensureDirectoryExists(dirPath: string): void;
  removeDirectoryIfExists(dirPath: string): void;
  fileExists(filePath: string): boolean;
  getFileStats(filePath: string): FileStats | null;
  copyFile(sourcePath: string, targetPath: string): void;
  deleteFile(filePath: string): void;
  needsUpdate(sourcePath: string, targetPath: string): boolean;
  readFile(filePath: string): string;
  writeFile(filePath: string, content: string): void;
  readDir(dirPath: string): string[];
} 
