// Interface definition for services
import path from 'path';
import os from 'os';

// Function to expand tilde to home directory
export const expandTilde = (filePath: string): string => {
  if (filePath.startsWith('~/') || filePath === '~') {
    return filePath.replace(/^~(?=$|\/|\\)/, os.homedir());
  }
  return filePath;
};

export interface OutputService {
  name: string;
  getTargetDirectory(): string;
  getTargetExtension(): string;
  setTargetExtension(extension: string): void;
}

// Base service class
export abstract class BaseService implements OutputService {
  constructor(
    public readonly name: string,
    protected readonly targetDirectory: string,
    protected targetExtension: string = 'mdc'
  ) {}

  getTargetDirectory(): string {
    return this.targetDirectory;
  }

  getTargetExtension(): string {
    return this.targetExtension;
  }

  setTargetExtension(extension: string): void {
    this.targetExtension = extension;
  }
} 
