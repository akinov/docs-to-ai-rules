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
}); 
