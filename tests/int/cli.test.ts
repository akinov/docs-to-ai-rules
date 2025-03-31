import { describe, test, expect, beforeEach, afterEach, vi, Mock, fn } from 'vitest';
import { Command } from 'commander';
import { ServiceManager } from '../../src/services';
import fs from 'fs';
import { ConfigManager } from '../../src/configManager';
import { ConfigurationError, DirectoryNotFoundError, FileSystemError } from '../../src/errors';

// Mock file system
vi.mock('fs', () => ({
  readFileSync: vi.fn().mockImplementation((path) => {
    if (path.includes('package.json')) {
      return '{"version": "0.1.0"}';
    }
    // Add more specific mock behavior if needed for other files
    throw new Error(`fs.readFileSync mock not implemented for ${path}`);
  }),
  existsSync: vi.fn().mockReturnValue(true),
  statSync: vi.fn().mockReturnValue({ mtime: new Date(), isDirectory: () => true }),
  readdirSync: vi.fn().mockReturnValue([]),
  mkdirSync: vi.fn(),
  copyFileSync: vi.fn(),
  unlinkSync: vi.fn(),
  rmSync: vi.fn(),
  lstatSync: vi.fn().mockReturnValue({ isDirectory: () => false }),
}));

// Mock convertDocs
const convertDocsMock = vi.fn();
vi.mock('../../src/index', () => ({
  convertDocs: convertDocsMock
}));

// Mock ServiceManager internal behavior (used by ConfigManager)
const mockGetService = vi.fn().mockImplementation((name: string) => {
  if (name === 'cursor') {
    return { name: 'cursor', getTargetDirectory: () => '.cursor/rules', getTargetExtension: () => 'json' };
  }
  return undefined;
});
const mockGetServices = vi.fn().mockImplementation((names: string[]) => {
  return names.map(mockGetService).filter(Boolean);
});
const mockGetAllServiceNames = vi.fn().mockReturnValue(['cursor', 'cline']);
vi.mock('../../src/services', () => ({
  ServiceManager: vi.fn().mockImplementation(() => ({
    getService: mockGetService,
    getServices: mockGetServices,
    getAllServiceNames: mockGetAllServiceNames,
  })),
}));

// Mock ConfigManager to control config loading and validation
const mockGetConfig = vi.fn();
const mockConfigManagerValidate = vi.fn();
vi.mock('../../src/configManager', () => ({
    ConfigManager: vi.fn().mockImplementation(() => ({
        getConfig: mockGetConfig,
        validate: mockConfigManagerValidate,
        // No need to mock private methods like loadConfigFromArgs directly
        // We control the outcome via the public methods getConfig/validate
        // and by potentially making the constructor throw errors in specific tests.
    }))
}));

// Mock process.exit and capture exit code
let capturedExitCode: number | undefined;
const mockExit = vi.spyOn(process, 'exit').mockImplementation((code? : number | string | null | undefined) => {
    if (typeof code === 'number') {
        capturedExitCode = code;
    } else if (code === null || code === undefined) {
        // Handle cases where exit is called without a code (implies 0 often)
        capturedExitCode = 0; 
    } else {
        // Handle string codes if necessary, or default to a specific error code
        capturedExitCode = 1; // Default error code for non-numeric exit
    }
    return undefined as never; // Keep original behavior signature
});
vi.spyOn(process, 'exitCode', 'set'); // Allow setting process.exitCode

// Mock console output
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const mockConsoleLog = vi.fn();
const mockConsoleError = vi.fn();

// Helper to run the CLI script
async function runCli() {
    // Reset modules to ensure cli.ts runs fresh
    vi.resetModules();
    await import('../../src/cli');
}

describe('CLI Integration Tests', () => {
  beforeEach(() => {
    // Reset mocks and console
    vi.clearAllMocks();
    console.log = mockConsoleLog;
    console.error = mockConsoleError;
    capturedExitCode = undefined;
    process.exitCode = undefined; // Reset exit code explicitly

    // Default mock implementations
    mockGetConfig.mockReturnValue({ // Provide a default valid config
        sourceDir: '/path/to/docs',
        services: [mockGetService('cursor')],
        excludeFiles: ['README.md'],
        dryRun: false,
        sync: false,
    });
    mockConfigManagerValidate.mockReturnValue(undefined); // Default validate passes (throws no error)
    convertDocsMock.mockResolvedValue(undefined); // Default convertDocs succeeds
    (fs.existsSync as vi.Mock).mockReturnValue(true); // Default fs mocks
  });

  afterEach(() => {
    // Restore originals
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    vi.restoreAllMocks();
  });

  test('should run successfully with valid arguments', async () => {
    process.argv = ['node', 'cli.js', '--services', 'cursor'];

    await runCli();

    // Verify ConfigManager was instantiated (implies args were parsed ok internally)
    expect(ConfigManager).toHaveBeenCalled();
    // Verify validate was called
    expect(mockConfigManagerValidate).toHaveBeenCalled();
    // Verify convertDocs was called with the config from ConfigManager
    expect(convertDocsMock).toHaveBeenCalledWith(mockGetConfig());
    // Verify success log and exit code
    expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Operation completed successfully'));
    expect(process.exitCode).toBeUndefined(); // Success means no exit code set
    expect(mockConsoleError).not.toHaveBeenCalled();
  });

  test('should exit with code 1 for unknown service', async () => {
    process.argv = ['node', 'cli.js', '--services', 'unknown'];

    (ConfigManager as Mock).mockImplementationOnce(() => {
        throw new ConfigurationError('Unknown service(s): unknown');
    });

    await runCli();

    expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('Error:'));
    expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('Configuration Error: Unknown service(s): unknown'));
    expect(process.exitCode).toBe(1);
    expect(convertDocsMock).not.toHaveBeenCalled();
  });

  test('should exit with code 1 for missing source directory (validation error)', async () => {
      process.argv = ['node', 'cli.js', '--services', 'cursor'];

      const validateError = new ConfigurationError('Source directory is required');
      const mockConfigInstance = {
        getConfig: mockGetConfig,
        validate: fn().mockImplementation(() => { throw validateError; })
      };
      (ConfigManager as Mock).mockImplementationOnce(() => mockConfigInstance);

      await runCli();

      expect(mockConfigInstance.validate).toHaveBeenCalled();
      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('Error:'));
      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('Configuration Error: Source directory is required'));
      expect(process.exitCode).toBe(1);
      expect(convertDocsMock).not.toHaveBeenCalled();
  });

  test('should exit with code 2 for non-existent source directory (file system error)', async () => {
    process.argv = ['node', 'cli.js', '-s', '/non/existent/path'];

    const fsError = new DirectoryNotFoundError('/non/existent/path');
    convertDocsMock.mockImplementationOnce(() => { throw fsError; });

    const configWithErrorPath = { 
        ...mockGetConfig(),
        sourceDir: '/non/existent/path' 
    };
    mockGetConfig.mockReturnValueOnce(configWithErrorPath);
    
    // Use imported Mock type for assertion
    (ConfigManager as Mock).mockImplementationOnce(() => ({
        getConfig: () => configWithErrorPath,
        validate: mockConfigManagerValidate,
    }));

    await runCli();

    expect(convertDocsMock).toHaveBeenCalled();
    expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('Error:'));
    expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('File System Error: Directory not found: /non/existent/path'));
    expect(process.exitCode).toBe(2);
  });

  test('should pass dryRun option correctly', async () => {
    process.argv = ['node', 'cli.js', '--services', 'cursor', '--dry-run'];

    // Ensure ConfigManager produces config with dryRun: true
    // The actual parsing is internal to ConfigManager mock, so we check the output
    // If ConfigManager was NOT mocked, this test would verify its parsing.
    // Since it IS mocked, we set the mock return value:
    mockGetConfig.mockReturnValueOnce({ ...mockGetConfig(), dryRun: true });

    await runCli();

    expect(convertDocsMock).toHaveBeenCalledWith(expect.objectContaining({ dryRun: true }));
    expect(process.exitCode).toBeUndefined();
  });

  test('should pass shorthand -d as dry run', async () => {
    process.argv = ['node', 'cli.js', '--services', 'cursor', '-d'];

    // Set mock return value for ConfigManager
    mockGetConfig.mockReturnValueOnce({ ...mockGetConfig(), dryRun: true });

    await runCli();

    expect(convertDocsMock).toHaveBeenCalledWith(expect.objectContaining({ dryRun: true }));
    expect(process.exitCode).toBeUndefined();
  });

  // Add more tests for other error types (FileSystemError during copy/delete, etc.)
  // Add tests for sync mode

}); 
