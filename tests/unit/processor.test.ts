import fs from 'fs';
import path from 'path';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { processDirectory } from '../../src/processor';
import { BaseService } from '../../src/services';

vi.mock('fs');

class MockService extends BaseService {
  constructor() {
    super('mock', '/tmp/mock', 'test');
  }
}

describe('processor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('processDirectory functions correctly', () => {
    // Setup mock data
    const mockFiles = ['test.md', 'README.md', 'other.txt'];
    (fs.readdirSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockFiles);
    (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (fs.mkdirSync as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => {});
    (fs.copyFileSync as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => {});
    (fs.statSync as unknown as ReturnType<typeof vi.fn>).mockImplementation((path) => ({
      mtimeMs: path.includes('source') ? 200 : 100 // Source file is newer
    }));

    const mockService = new MockService();
    const config = {
      sourceDir: '/tmp/source',
      services: [mockService],
      excludeFiles: ['README.md']
    };

    // Execute function
    const result = processDirectory(config);

    // Assertions
    expect(result.processedCount).toBe(1);
    expect(result.processedFiles).toEqual(['test.md']);
    expect(result.services).toEqual(['mock']);

    // Check if file was copied
    expect(fs.copyFileSync).toHaveBeenCalledWith(
      path.join('/tmp/source', 'test.md'),
      path.join('/tmp/mock', 'test.test')
    );
  });

  test('excluded files are properly processed', () => {
    // Setup mock data
    const mockFiles = ['test1.md', 'test2.md', 'README.md'];
    (fs.readdirSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockFiles);
    (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (fs.statSync as unknown as ReturnType<typeof vi.fn>).mockImplementation((path) => ({
      mtimeMs: path.includes('source') ? 200 : 100 // Source file is newer
    }));

    const mockService = new MockService();
    const config = {
      sourceDir: '/tmp/source',
      services: [mockService],
      excludeFiles: ['test1.md', 'README.md']
    };

    // Execute function
    const result = processDirectory(config);

    // Assertions
    expect(result.processedCount).toBe(1);
    expect(result.processedFiles).toEqual(['test2.md']);
  });

  test('files are not copied in dry run mode', () => {
    // Setup mock data
    const mockFiles = ['test.md', 'README.md'];
    (fs.readdirSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockFiles);
    (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(false);
    (fs.mkdirSync as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => {});
    (fs.copyFileSync as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => {});
    (fs.statSync as unknown as ReturnType<typeof vi.fn>).mockImplementation((path) => ({
      mtimeMs: path.includes('source') ? 200 : 100 // Source file is newer
    }));

    const mockService = new MockService();
    const config = {
      sourceDir: '/tmp/source',
      services: [mockService],
      excludeFiles: ['README.md'],
      dryRun: true
    };

    // Execute function
    const result = processDirectory(config);

    // Assertions
    expect(result.processedCount).toBe(1);
    expect(result.processedFiles).toEqual(['test.md']);
    expect(result.updatedCount).toBe(1);
    expect(result.updatedFiles).toEqual(['test.md']);

    // In dry run mode, files are not copied and directories are not created
    expect(fs.copyFileSync).not.toHaveBeenCalled();
    expect(fs.mkdirSync).not.toHaveBeenCalled();
  });

  test('only detects files that need updates', () => {
    // Setup mock data
    const mockFiles = ['updated.md', 'not-updated.md'];
    (fs.readdirSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockFiles);
    (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
    
    // Mock file modification times
    (fs.statSync as unknown as ReturnType<typeof vi.fn>).mockImplementation((path) => {
      if (path.includes('updated.md')) {
        return { mtimeMs: 200 }; // Source file is newer
      } else if (path.includes('/tmp/mock/updated.test')) {
        return { mtimeMs: 100 }; // Target file is older
      } else if (path.includes('not-updated.md')) {
        return { mtimeMs: 100 }; // Source file is older
      } else if (path.includes('/tmp/mock/not-updated.test')) {
        return { mtimeMs: 200 }; // Target file is newer
      }
      return { mtimeMs: 0 };
    });

    const mockService = new MockService();
    const config = {
      sourceDir: '/tmp/source',
      services: [mockService],
      dryRun: true
    };

    // Execute function
    const result = processDirectory(config);

    // Assertions
    expect(result.processedCount).toBe(2);
    expect(result.updatedCount).toBe(1);
    expect(result.updatedFiles).toEqual(['updated.md']);
  });

  test('sync mode deletes outdated files', () => {
    // Setup mock data
    const mockSourceFiles = ['current.md'];
    const mockTargetFiles = ['current.test', 'outdated.test', 'another.txt'];
    
    (fs.readdirSync as unknown as ReturnType<typeof vi.fn>).mockImplementation((dir) => {
      if (dir === '/tmp/source') {
        return mockSourceFiles;
      } else if (dir === '/tmp/mock') {
        return mockTargetFiles;
      }
      return [];
    });
    
    (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (fs.unlinkSync as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => {});
    (fs.statSync as unknown as ReturnType<typeof vi.fn>).mockImplementation((path) => ({
      mtimeMs: path.includes('source') ? 100 : 100 // Files have same time
    }));

    const mockService = new MockService();
    const config = {
      sourceDir: '/tmp/source',
      services: [mockService],
      sync: true
    };

    // Execute function
    const result = processDirectory(config);

    // Assertions
    expect(result.processedCount).toBe(1);
    expect(result.processedFiles).toEqual(['current.md']);
    expect(result.deletedCount).toBe(1);
    expect(result.deletedFiles).toEqual(['outdated.test']);
    
    // Check if outdated file was deleted
    expect(fs.unlinkSync).toHaveBeenCalledWith(
      path.join('/tmp/mock', 'outdated.test')
    );
    
    // Check that non-target extension files were not deleted
    expect(fs.unlinkSync).not.toHaveBeenCalledWith(
      path.join('/tmp/mock', 'another.txt')
    );
  });

  test('sync mode does not delete files in dry run mode', () => {
    // Setup mock data
    const mockSourceFiles = ['current.md'];
    const mockTargetFiles = ['current.test', 'outdated.test'];
    
    (fs.readdirSync as unknown as ReturnType<typeof vi.fn>).mockImplementation((dir) => {
      if (dir === '/tmp/source') {
        return mockSourceFiles;
      } else if (dir === '/tmp/mock') {
        return mockTargetFiles;
      }
      return [];
    });
    
    (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (fs.unlinkSync as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => {});
    (fs.statSync as unknown as ReturnType<typeof vi.fn>).mockImplementation((path) => ({
      mtimeMs: path.includes('source') ? 100 : 100 // Files have same time
    }));

    const mockService = new MockService();
    const config = {
      sourceDir: '/tmp/source',
      services: [mockService],
      sync: true,
      dryRun: true
    };

    // Execute function
    const result = processDirectory(config);

    // Assertions
    expect(result.processedCount).toBe(1);
    expect(result.processedFiles).toEqual(['current.md']);
    expect(result.deletedCount).toBe(0);
    expect(result.deletedFiles).toEqual([]);
    
    // Files should not be deleted in dry run mode
    expect(fs.unlinkSync).not.toHaveBeenCalled();
  });
}); 
