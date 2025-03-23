import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { Command } from 'commander';
import { ServiceManager } from '../../src/services';

// Mock convertDocs
const convertDocsMock = vi.fn();
vi.mock('../../src/index', () => ({
  convertDocs: convertDocsMock
}));

// Create mocked instance of ServiceManager
vi.mock('../../src/services', () => {
  const mockGetService = vi.fn().mockImplementation((name: string) => {
    if (name === 'cursor') {
      return { name: 'cursor', getTargetDirectory: () => '.cursor/rules' };
    }
    return undefined;
  });
  
  const mockGetServices = vi.fn().mockImplementation((names: string[]) => {
    return names
      .map((name: string) => mockGetService(name))
      .filter((service: any) => service !== undefined);
  });
  
  const mockGetAllServiceNames = vi.fn().mockReturnValue(['cursor', 'cline']);
  
  return {
    ServiceManager: vi.fn().mockImplementation(() => ({
      getService: mockGetService,
      getServices: mockGetServices,
      getAllServiceNames: mockGetAllServiceNames,
      registerService: vi.fn()
    })),
    BaseService: class {}
  };
});

// Mock process.exit
const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
  return undefined as never;
});

// Mock console output
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

describe('CLI', () => {
  beforeEach(() => {
    // Mock console output
    console.log = vi.fn();
    console.error = vi.fn();
    
    // Clear mocks
    convertDocsMock.mockClear();

    // Clear importCache
    vi.resetModules();
  });
  
  afterEach(() => {
    // Restore originals
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    vi.clearAllMocks();
  });
  
  test('CLI works correctly', async () => {
    // Set process.argv before executing CLI
    process.argv = ['node', 'cli.js', '--services', 'cursor'];
    
    // Load CLI module (this causes CLI to execute)
    await import('../../src/cli');
    
    // Verify that convertDocs was called
    expect(convertDocsMock).toHaveBeenCalled();
  });
  
  test('Error when specifying non-existent service', async () => {
    // Set process.argv before executing CLI
    process.argv = ['node', 'cli.js', '--services', 'unknown'];
    
    // Load CLI module
    await import('../../src/cli');
    
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Unknown service'));
    expect(process.exit).toHaveBeenCalledWith(1);
  });
}); 
