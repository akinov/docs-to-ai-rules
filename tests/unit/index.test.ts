import fs from 'fs';
import { describe, test, expect, beforeEach, afterEach, vi, MockInstance } from 'vitest';
import { convertDocs } from '../../src/index';
import { BaseService } from '../../src/services';
import { processDirectory } from '../../src/processor';

vi.mock('fs');
vi.mock('../../src/processor', () => ({
  processDirectory: vi.fn().mockReturnValue({
    processedCount: 2,
    processedFiles: ['file1.md', 'file2.md'],
    services: ['mock'],
    updatedCount: 1,
    updatedFiles: ['file1.md'],
    deletedCount: 0,
    deletedFiles: []
  })
}));

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
  let exitSpy: any;
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock process.exit
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      return undefined as never;
    });
    
    // Mock console output
    console.log = vi.fn();
    console.error = vi.fn();
    
    mockService = new MockService();
    
    // Mock fs.existsSync
    (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (fs.mkdirSync as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => {});
  });
  
  afterEach(() => {
    // Restore originals
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    exitSpy.mockRestore();
  });
  
  test('convertDocs executes correctly', () => {
    const config = {
      sourceDir: '/tmp/source',
      services: [mockService],
      excludeFiles: ['README.md']
    };
    
    convertDocs(config);
    
    // Check target directory existence
    expect(fs.existsSync).toHaveBeenCalled();
    
    // Check if completion log was output
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Processing complete'));
  });
  
  test('error occurs when source directory does not exist', () => {
    (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce(false);
    
    const config = {
      sourceDir: '/nonexistent',
      services: [mockService]
    };
    
    convertDocs(config);
    
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('does not exist'));
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  test('dry run mode works correctly', () => {
    const config = {
      sourceDir: '/tmp/source',
      services: [mockService],
      excludeFiles: ['README.md'],
      dryRun: true
    };
    
    convertDocs(config);
    
    // Check directories are not created
    expect(fs.mkdirSync).not.toHaveBeenCalled();
    
    // Check dry run logs are output
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('[Dry Run] 1 files need updates'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('[Dry Run] File needs update: file1.md'));
  });

  test('dry run mode when no files need updates', () => {
    // Mock for case where no files need updates
    (processDirectory as unknown as MockInstance).mockReturnValueOnce({
      processedCount: 2,
      processedFiles: ['file1.md', 'file2.md'],
      services: ['mock'],
      updatedCount: 0,
      updatedFiles: []
    });

    const config = {
      sourceDir: '/tmp/source',
      services: [mockService],
      dryRun: true
    };
    
    convertDocs(config);
    
    // Check dry run logs are output
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('[Dry Run] No files need updates'));
  });

  test('sync mode clears target directories', () => {
    // Mock directory contents
    const mockDirContents = ['file1.md', 'file2.md', 'subdir'];
    (fs.readdirSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockDirContents);
    (fs.lstatSync as unknown as ReturnType<typeof vi.fn>).mockImplementation((path) => ({
      isDirectory: () => path.includes('subdir')
    }));
    (fs.rmSync as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => {});
    (fs.unlinkSync as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => {});
    
    // Mock processDirectory to return deleted file info
    (processDirectory as unknown as MockInstance).mockReturnValueOnce({
      processedCount: 2,
      processedFiles: ['file1.md', 'file2.md'],
      services: ['mock'],
      updatedCount: 2,
      updatedFiles: ['file1.md', 'file2.md'],
      deletedCount: 3,
      deletedFiles: ['old1.md', 'old2.md', 'old3.md']
    });

    const config = {
      sourceDir: '/tmp/source',
      services: [mockService],
      sync: true
    };
    
    convertDocs(config);
    
    // Check if files and directories were removed
    expect(fs.unlinkSync).toHaveBeenCalledTimes(2); // for the non-directory items
    expect(fs.rmSync).toHaveBeenCalledWith(
      expect.stringContaining('subdir'),
      expect.objectContaining({ recursive: true })
    );
    
    // Check for sync mode log
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Formatting directory'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Sync mode: Deleted 3 outdated files'));
  });

  test('sync mode with dry run does not clear directories', () => {
    const config = {
      sourceDir: '/tmp/source',
      services: [mockService],
      sync: true,
      dryRun: true
    };
    
    convertDocs(config);
    
    // Files should not be deleted
    expect(fs.unlinkSync).not.toHaveBeenCalled();
    expect(fs.rmSync).not.toHaveBeenCalled();
    
    // Check for dry run log
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('[Dry Run] Would format directory'));
  });
}); 
