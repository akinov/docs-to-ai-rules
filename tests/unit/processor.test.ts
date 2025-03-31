import path from 'path';
import { describe, test, expect, beforeEach, vi, MockInstance } from 'vitest';
import { processDirectory, type ProcessResult } from '../../src/processor';
import { BaseService } from '../../src/services';
import { NodeFileSystemManager } from '../../src/utils/fileSystemManager';
import type { Config } from '../../src/interfaces/configManager';
import { DirectoryNotFoundError } from '../../src/errors';

// Mock the NodeFileSystemManager class directly
const mockFileSystemManagerInstance = {
  ensureDirectoryExists: vi.fn().mockResolvedValue(undefined),
  removeDirectoryIfExists: vi.fn().mockResolvedValue(undefined),
  fileExists: vi.fn().mockResolvedValue(true), // Default to true
  getFileStats: vi.fn().mockResolvedValue({ mtime: new Date(), size: 100 }),
  copyFile: vi.fn().mockResolvedValue(undefined),
  deleteFile: vi.fn().mockResolvedValue(undefined),
  needsUpdate: vi.fn().mockResolvedValue(true), // Default to true
  readFile: vi.fn().mockResolvedValue(''),
  writeFile: vi.fn().mockResolvedValue(undefined),
  readDir: vi.fn().mockResolvedValue([]), // Default to empty
};
vi.mock('../../src/utils/fileSystemManager', () => ({
  NodeFileSystemManager: vi.fn(() => mockFileSystemManagerInstance),
}));

class MockService extends BaseService {
  constructor() {
    super('mock', '/tmp/mock', 'test');
  }
}

describe('processor', () => {
  let mockService: MockService;
  // Type assertion for the mocked methods
  let typedMockFSMInstance = mockFileSystemManagerInstance as {
      [K in keyof typeof mockFileSystemManagerInstance]: MockInstance
  };

  beforeEach(() => {
    // Clear mock calls before each test
    vi.clearAllMocks();

    // Reset specific mocks to default behavior if needed (optional, clearAllMocks might suffice)
    typedMockFSMInstance.fileExists.mockResolvedValue(true);
    typedMockFSMInstance.readDir.mockResolvedValue([]);
    typedMockFSMInstance.needsUpdate.mockResolvedValue(true);

    mockService = new MockService();
  });

  test('processDirectory functions correctly', async () => {
    const mockFiles = ['test.md', 'README.md', 'other.txt'];
    typedMockFSMInstance.readDir.mockResolvedValueOnce(mockFiles); // Use typed instance
    typedMockFSMInstance.needsUpdate.mockImplementation(async (src, tgt) => src.includes('test.md')); // Needs update only for test.md

    const config: Config = {
      sourceDir: '/tmp/source',
      services: [mockService],
      excludeFiles: ['README.md'],
      dryRun: false,
      sync: false,
    };
    const result = await processDirectory(config);
    expect(result.processedCount).toBe(1);
    expect(result.updatedCount).toBe(1);
    expect(typedMockFSMInstance.readDir).toHaveBeenCalledWith('/tmp/source');
    expect(typedMockFSMInstance.needsUpdate).toHaveBeenCalledWith(path.join('/tmp/source', 'test.md'), path.join('/tmp/mock', 'test.test'));
    expect(typedMockFSMInstance.copyFile).toHaveBeenCalledWith(path.join('/tmp/source', 'test.md'), path.join('/tmp/mock', 'test.test'));
  });

  test('excluded files are properly processed', async () => {
    const mockFiles = ['test1.md', 'test2.md', 'README.md'];
    typedMockFSMInstance.readDir.mockResolvedValueOnce(mockFiles);
    const config: Config = {
      sourceDir: '/tmp/source',
      services: [mockService],
      excludeFiles: ['test1.md', 'README.md'],
      dryRun: false,
      sync: false,
    };
    const result = await processDirectory(config);
    expect(result.processedCount).toBe(1);
    expect(result.processedFiles).toEqual(['test2.md']);
    expect(typedMockFSMInstance.copyFile).toHaveBeenCalledWith(path.join('/tmp/source', 'test2.md'), path.join('/tmp/mock', 'test2.test'));
  });

  test('files are not copied in dry run mode', async () => {
    const mockFiles = ['test.md'];
    typedMockFSMInstance.readDir.mockResolvedValueOnce(mockFiles);
    typedMockFSMInstance.needsUpdate.mockResolvedValueOnce(true);
    const config: Config = {
      sourceDir: '/tmp/source',
      services: [mockService],
      excludeFiles: [],
      dryRun: true,
      sync: false,
    };
    const result = await processDirectory(config);
    expect(result.processedCount).toBe(1);
    expect(result.updatedCount).toBe(1);
    expect(typedMockFSMInstance.copyFile).not.toHaveBeenCalled();
  });

  test('only detects files that need updates', async () => {
    const sourceDir = '/tmp/source';
    const targetDir = '/tmp/mock';
    const mockFiles = ['updated.md', 'not-updated.md'];
    const updatedSourcePath = path.join(sourceDir, 'updated.md');
    const notUpdatedSourcePath = path.join(sourceDir, 'not-updated.md');
    const updatedTargetPath = path.join(targetDir, 'updated.test');
    const notUpdatedTargetPath = path.join(targetDir, 'not-updated.test');

    typedMockFSMInstance.readDir.mockResolvedValueOnce(mockFiles);
    typedMockFSMInstance.fileExists.mockResolvedValue(true); // Assume all relevant files exist for simplicity here

    // Simplify needsUpdate mock: only return true for the exact updated source path
    typedMockFSMInstance.needsUpdate.mockImplementation(async (sourcePath, targetPath) => {
      return sourcePath === updatedSourcePath;
    });
    // Remove getFileStats mock if needsUpdate doesn't rely on it anymore with this simplification
    // typedMockFSMInstance.getFileStats.mockImplementation(...);

    const config: Config = {
      sourceDir: sourceDir,
      services: [mockService],
      excludeFiles: [],
      dryRun: false,
      sync: false,
    };
    const result = await processDirectory(config);

    expect(result.processedCount).toBe(2);
    expect(result.updatedCount).toBe(1);
    expect(result.updatedFiles).toEqual(['updated.md']);
    expect(typedMockFSMInstance.copyFile).toHaveBeenCalledTimes(1);
    expect(typedMockFSMInstance.copyFile).toHaveBeenCalledWith(updatedSourcePath, updatedTargetPath);
  });

 test('sync mode deletes outdated files', async () => {
    const mockSourceFiles = ['current.md'];
    const mockTargetFiles = ['current.test', 'outdated.test', 'another.txt'];
    typedMockFSMInstance.readDir.mockImplementation(async (dir) => {
        if (dir === '/tmp/source') return mockSourceFiles;
        if (dir === '/tmp/mock') return mockTargetFiles;
        return [];
    });
    typedMockFSMInstance.needsUpdate.mockResolvedValue(false);
    typedMockFSMInstance.fileExists.mockImplementation(async (p) => p === '/tmp/source' || p === '/tmp/mock'); // Target dir exists

    const config: Config = {
      sourceDir: '/tmp/source',
      services: [mockService],
      sync: true,
      excludeFiles: [],
      dryRun: false,
    };
    const result = await processDirectory(config);
    expect(result.processedCount).toBe(1);
    expect(result.deletedCount).toBe(1);
    expect(result.deletedFiles).toEqual(['outdated.test']);
    expect(typedMockFSMInstance.deleteFile).toHaveBeenCalledWith(path.join('/tmp/mock', 'outdated.test'));
    expect(typedMockFSMInstance.deleteFile).not.toHaveBeenCalledWith(path.join('/tmp/mock', 'another.txt'));
    expect(typedMockFSMInstance.deleteFile).not.toHaveBeenCalledWith(path.join('/tmp/mock', 'current.test'));
  });

  test('sync mode does not delete files in dry run mode', async () => {
    const mockSourceFiles = ['current.md'];
    const mockTargetFiles = ['current.test', 'outdated.test'];
    typedMockFSMInstance.readDir.mockImplementation(async (dir) => {
        if (dir === '/tmp/source') return mockSourceFiles;
        if (dir === '/tmp/mock') return mockTargetFiles;
        return [];
    });
    typedMockFSMInstance.fileExists.mockImplementation(async (p) => p === '/tmp/source' || p === '/tmp/mock');

    const config: Config = {
      sourceDir: '/tmp/source',
      services: [mockService],
      sync: true,
      dryRun: true,
      excludeFiles: [],
    };
    const result = await processDirectory(config);
    expect(result.processedCount).toBe(1);
    expect(result.deletedCount).toBe(0);
    expect(typedMockFSMInstance.deleteFile).not.toHaveBeenCalled();
  });

  test('throws error if source directory does not exist', async () => {
    typedMockFSMInstance.fileExists.mockResolvedValueOnce(false); // Source dir does not exist
    const config: Config = {
      sourceDir: '/nonexistent',
      services: [mockService],
      excludeFiles: [],
      dryRun: false,
      sync: false,
    };
    // Use rejects.toThrow for async functions
    await expect(processDirectory(config)).rejects.toThrow(DirectoryNotFoundError);
    // Verify fileExists was called for the source directory
    expect(typedMockFSMInstance.fileExists).toHaveBeenCalledWith('/nonexistent');
  });

}); 
