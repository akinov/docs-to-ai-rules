import fs from 'fs';

export interface FileStats {
  mtime: Date;
  size: number;
}

export interface FileSystemManager {
  ensureDirectoryExists(dirPath: string): Promise<void>;
  removeDirectoryIfExists(dirPath: string): Promise<void>;
  fileExists(filePath: string): Promise<boolean>;
  getFileStats(filePath: string): Promise<FileStats | null>;
  copyFile(sourcePath: string, targetPath: string): Promise<void>;
  deleteFile(filePath: string): Promise<void>;
  needsUpdate(sourcePath: string, targetPath: string): Promise<boolean>;
  readFile(filePath: string): Promise<string>;
  writeFile(filePath: string, content: string): Promise<void>;
  readDir(dirPath: string): Promise<string[]>;
} 
