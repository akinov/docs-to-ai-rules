import fs from 'fs';
import type { MockInstance } from 'vitest';
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { convertDocs } from '../../src/index';
import type { Config } from '../../src/interfaces/configManager';
import { BaseService } from '../../src/services';
import { processDirectory, type ProcessResult } from '../../src/processor';
import { NodeFileSystemManager } from '../../src/utils/fileSystemManager';
import type { FileStats } from '../../src/interfaces/fileSystemManager';

// Keep fs mock for other potential direct uses or deep dependencies
vi.mock('fs');

// Mock the FileSystemManager module - Vitest replaces the export with a mock constructor
vi.mock('../../src/utils/fileSystemManager');

// Mock the processor module
vi.mock('../../src/processor');

// Mock console output
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

describe('index', () => {
  // Create mock service
  class MockService extends BaseService {
    constructor() {
      super('mock', '/tmp/mock');
    }
  }

  let mockService: MockService;
  // Correct type for process.exit spy using function signature
  let exitSpy: MockInstance<(code?: number | undefined) => never>; 
  // Type the instance and then cast it to Mocked<T> after assignment
  let mockFileSystemManagerInstance: vi.Mocked<NodeFileSystemManager>;

  // Get the properly typed mocked function for processDirectory
  const mockedProcessDirectory = vi.mocked(processDirectory);

  beforeEach(() => {
    vi.clearAllMocks(); // Clears fs, processor mocks too
    
    // Reset the mocked constructor calls if needed (usually vi.clearAllMocks is sufficient)
    vi.mocked(NodeFileSystemManager).mockClear(); 
    mockedProcessDirectory.mockClear();

    // Create an instance using the mocked constructor
    const instance = new NodeFileSystemManager();
    // Cast the instance to tell TypeScript its methods are mocks
    mockFileSystemManagerInstance = instance as vi.Mocked<NodeFileSystemManager>;

    // --- Set default behaviors on the mocked methods ---
    mockFileSystemManagerInstance.fileExists.mockReturnValue(true);
    mockFileSystemManagerInstance.ensureDirectoryExists.mockClear(); // Use mockClear for spies
    mockFileSystemManagerInstance.removeDirectoryIfExists.mockClear();
    mockFileSystemManagerInstance.copyFile.mockClear();
    mockFileSystemManagerInstance.deleteFile.mockClear();
    mockFileSystemManagerInstance.needsUpdate.mockReturnValue(false);
    mockFileSystemManagerInstance.getFileStats.mockReturnValue({ mtime: new Date(0), size: 0 });
    mockFileSystemManagerInstance.readFile.mockReturnValue('');
    mockFileSystemManagerInstance.writeFile.mockClear();
    mockFileSystemManagerInstance.readDir.mockReturnValue([]);
    // --- End of default behavior assignments ---

    // Set default mock result for processDirectory
    const defaultProcessResult: ProcessResult = {
      processedCount: 2,
      processedFiles: ['file1.md', 'file2.md'],
      services: ['mock'],
      updatedCount: 1,
      updatedFiles: ['file1.md'],
      deletedCount: 0,
      deletedFiles: []
    };
    mockedProcessDirectory.mockReturnValue(defaultProcessResult);

    // Mock process.exit
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((code): never => {
      throw new Error(`process.exit called with code ${code ?? 'unknown'}`);
    });

    // Mock console output
    console.log = vi.fn();
    console.error = vi.fn();

    mockService = new MockService();
  });

  afterEach(() => {
    // Restore originals
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    exitSpy.mockRestore();
  });

  test('convertDocs executes correctly', () => {
    const config: Config = {
      sourceDir: '/tmp/source',
      services: [mockService],
      excludeFiles: ['README.md']
    };

    convertDocs(config);

    // Check FileSystemManager methods were called
    expect(mockFileSystemManagerInstance.fileExists).toHaveBeenCalledWith('/tmp/source');
    expect(mockFileSystemManagerInstance.fileExists).toHaveBeenCalledWith('/tmp/mock');
    expect(mockFileSystemManagerInstance.ensureDirectoryExists).not.toHaveBeenCalled();

    // Check processDirectory was called
    expect(mockedProcessDirectory).toHaveBeenCalledWith(expect.objectContaining({ sourceDir: '/tmp/source' }));

    // Check completion log
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Processing complete'));
  });

  test('creates target directory if it does not exist', () => {
    // Setup: only source directory exists
    // Access mock implementation directly on the mocked instance method
    mockFileSystemManagerInstance.fileExists.mockImplementation((path) => path === '/tmp/source');

    const config: Config = {
      sourceDir: '/tmp/source',
      services: [mockService],
    };

    convertDocs(config);

    expect(mockFileSystemManagerInstance.fileExists).toHaveBeenCalledWith('/tmp/mock');
    expect(mockFileSystemManagerInstance.ensureDirectoryExists).toHaveBeenCalledWith('/tmp/mock');
  });

  test('error occurs when source directory does not exist', () => {
    // Setup: source directory does not exist
    mockFileSystemManagerInstance.fileExists.mockImplementation((path) => path !== '/nonexistent');

    const config: Config = {
      sourceDir: '/nonexistent',
      services: [mockService]
    };

    expect(() => convertDocs(config)).toThrow('process.exit called with code 1');
    expect(mockFileSystemManagerInstance.fileExists).toHaveBeenCalledWith('/nonexistent');
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('does not exist'));
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  test('dry run mode works correctly', () => {
    const config: Config = {
      sourceDir: '/tmp/source',
      services: [mockService],
      dryRun: true
    };

    convertDocs(config);

    expect(mockFileSystemManagerInstance.ensureDirectoryExists).not.toHaveBeenCalled();
    expect(mockFileSystemManagerInstance.removeDirectoryIfExists).not.toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('[Dry Run] 1 files need updates'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('[Dry Run] File needs update: file1.md'));
  });

  test('dry run mode when target directory does not exist', () => {
    mockFileSystemManagerInstance.fileExists.mockImplementation((path) => path === '/tmp/source');

    const config: Config = {
      sourceDir: '/tmp/source',
      services: [mockService],
      dryRun: true
    };

    convertDocs(config);

    expect(mockFileSystemManagerInstance.fileExists).toHaveBeenCalledWith('/tmp/mock');
    expect(mockFileSystemManagerInstance.ensureDirectoryExists).not.toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith('[Dry Run] Would create directory /tmp/mock');
  });

  test('dry run mode when no files need updates', () => {
    // Setup: processDirectory returns 0 updated files
    const noUpdatesResult: ProcessResult = {
      processedCount: 2,
      processedFiles: ['file1.md', 'file2.md'],
      services: ['mock'],
      updatedCount: 0, // Key change for this test
      updatedFiles: [],
      deletedCount: 0,
      deletedFiles: []
    };
    mockedProcessDirectory.mockReturnValueOnce(noUpdatesResult);

    const config: Config = {
      sourceDir: '/tmp/source',
      services: [mockService],
      dryRun: true
    };

    convertDocs(config);

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('[Dry Run] No files need updates'));
  });

  test('sync mode clears target directories', () => {
    // Setup: processDirectory returns deletion info
    const syncResult: ProcessResult = {
      processedCount: 2,
      processedFiles: ['file1.md', 'file2.md'],
      services: ['mock'],
      updatedCount: 2,
      updatedFiles: ['file1.md', 'file2.md'],
      deletedCount: 3, // Key change for this test
      deletedFiles: ['old1.md', 'old2.md', 'old3.md']
    };
    mockedProcessDirectory.mockReturnValueOnce(syncResult);

    const config: Config = {
      sourceDir: '/tmp/source',
      services: [mockService],
      sync: true
    };

    convertDocs(config);

    expect(mockFileSystemManagerInstance.removeDirectoryIfExists).toHaveBeenCalledWith('/tmp/mock');
    expect(mockFileSystemManagerInstance.ensureDirectoryExists).toHaveBeenCalledWith('/tmp/mock');
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Sync mode: Deleted 3 outdated files'));
  });

  test('sync mode with dry run does not clear directories', () => {
    const config: Config = {
      sourceDir: '/tmp/source',
      services: [mockService],
      sync: true,
      dryRun: true
    };

    convertDocs(config);

    expect(mockFileSystemManagerInstance.removeDirectoryIfExists).not.toHaveBeenCalled();
    expect(mockFileSystemManagerInstance.ensureDirectoryExists).not.toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('[Dry Run] Would format directory'));
  });
}); 
