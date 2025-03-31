import { describe, test, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { Command } from 'commander';
import { ServiceManager } from '../../src/services';
// import fs from 'fs'; // Remove direct fs import if not needed after mock removal
import { ConfigManager } from '../../src/configManager';
import { ConfigurationError, DirectoryNotFoundError, FileSystemError } from '../../src/errors';

// Mock file system - REMOVE THIS BLOCK
/*
vi.mock('fs', () => ({
  readFileSync: vi.fn().mockImplementation((path) => {
    if (path.includes('package.json')) {
      return '{"version": "0.1.0"}';
    }
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
*/

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

// Define mock functions globally, they will be used by vi.doMock
const mockGetConfig = vi.fn();
const mockConfigManagerValidate = vi.fn();

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

// Mock console output
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const mockConsoleLog = vi.fn();
const mockConsoleError = vi.fn();

// Mock readFileSync specifically for package.json required by CLI version command
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal() as typeof import('fs');
  const path = await import('path');
  const projectRoot = path.resolve(__dirname, '../../..');
  const packageJsonPath = path.join(projectRoot, 'package.json');

  return {
    ...actual,
    readFileSync: vi.fn().mockImplementation((filePath, options) => {
      const resolvedPath = path.resolve(filePath as string);
      if (resolvedPath === packageJsonPath) {
        return '{"version": "0.1.0"}';
      }
      // IMPORTANT: If cli.ts or dependencies expect other sync file reads,
      // they will fail here. Delegate to actual if needed:
      // return actual.readFileSync(filePath, options);
      throw new Error(`fs.readFileSync mock called unexpectedly for ${filePath} (resolved: ${resolvedPath})`);
    }),
    // existsSync is NOT mocked here anymore, allowing original behavior or other mocks
  };
});

// Helper to run the CLI script
async function runCli() {
    // Reset modules potentially needed if mocks change between tests
    vi.resetModules(); 
    // Ensure dynamic mocks are cleared before re-importing cli
    vi.unmock('../../src/configManager'); // Make sure we unmock before potential doMock
    await import('../../src/cli');
}

describe('CLI Integration Tests', () => {
  beforeEach(() => {
    // Reset mocks and console
    vi.clearAllMocks();
    mockGetConfig.mockReset();
    mockConfigManagerValidate.mockReset();
    console.log = mockConsoleLog;
    console.error = mockConsoleError;
    capturedExitCode = undefined;

    // --- Default Mock Behaviors (used by test-specific doMocks) ---
    mockGetConfig.mockReturnValue({ // Default config if needed
        sourceDir: '/path/to/docs',
        services: [mockGetService('cursor')],
        excludeFiles: ['README.md'],
        dryRun: false,
        sync: false,
    });
    mockConfigManagerValidate.mockReturnValue(undefined); // Default validate passes

    // convertDocs mock setup
    convertDocsMock.mockResolvedValue(undefined); // Default convertDocs succeeds

    process.argv = ['node', 'cli.js'];
  });

  afterEach(() => {
    // Restore originals
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    // Clean up dynamic mocks if vi.doUnmock is preferred (or rely on vi.resetModules)
    vi.unmock('../../src/configManager'); 
    vi.restoreAllMocks();
    mockExit.mockRestore();
  });

  test('should run successfully with valid arguments', async () => {
    process.argv = ['node', 'cli.js', '--service', 'cursor', '-s', '/path/to/docs'];
    const expectedConfig = {
        sourceDir: '/path/to/docs',
        services: [mockGetService('cursor')],
        excludeFiles: ['README.md'],
        dryRun: false,
        sync: false,
    };
    mockGetConfig.mockReturnValueOnce(expectedConfig);
    mockConfigManagerValidate.mockReturnValueOnce(undefined); // Explicitly set for this test

    // Dynamically mock *before* runCli
    vi.doMock('../../src/configManager', () => ({
        ConfigManager: vi.fn().mockImplementation(() => ({
            getConfig: mockGetConfig,
            validate: mockConfigManagerValidate,
        }))
    }));

    await runCli(); // runCli will now import the dynamically mocked module

    // Need to import ConfigManager *after* the mock is applied if checking constructor call
    const { ConfigManager: MockedConfigManager } = await import('../../src/configManager');
    expect(MockedConfigManager).toHaveBeenCalled();
    expect(mockConfigManagerValidate).toHaveBeenCalled();
    expect(mockGetConfig).toHaveBeenCalled();
    expect(convertDocsMock).toHaveBeenCalledWith(expectedConfig);
    expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Operation completed successfully'));
    expect(capturedExitCode).toBeUndefined();
    expect(mockConsoleError).not.toHaveBeenCalled();
  });

  test('should exit with code 1 for unknown service', async () => {
    process.argv = ['node', 'cli.js', '--service', 'unknown', '-s', '/path/to/source'];
    const configError = new ConfigurationError('Service "unknown" not found.');
    mockConfigManagerValidate.mockImplementationOnce(() => { throw configError; });
    mockGetConfig.mockImplementationOnce(() => { throw new Error('getConfig should not be called'); }); // Safeguard

    // Dynamically mock *before* runCli
    vi.doMock('../../src/configManager', () => ({
        ConfigManager: vi.fn().mockImplementation(() => ({
            getConfig: mockGetConfig,
            validate: mockConfigManagerValidate, // This instance's validate will throw
        }))
    }));

    await runCli();

    const { ConfigManager: MockedConfigManager } = await import('../../src/configManager');
    expect(MockedConfigManager).toHaveBeenCalled();
    expect(mockConfigManagerValidate).toHaveBeenCalled();
    expect(mockGetConfig).not.toHaveBeenCalled();
    expect(convertDocsMock).not.toHaveBeenCalled();
    expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('Configuration Error: Service "unknown" not found.'));
    expect(capturedExitCode).toBe(1);
  });

  test('should exit with code 1 for missing source directory (validation error)', async () => {
      process.argv = ['node', 'cli.js', '--service', 'cursor']; // Missing -s argument
      const validateError = new ConfigurationError('Source directory is required');
      mockConfigManagerValidate.mockImplementationOnce(() => { throw validateError; });
      mockGetConfig.mockImplementationOnce(() => { throw new Error('getConfig should not be called'); });

      // Dynamically mock *before* runCli
      vi.doMock('../../src/configManager', () => ({
          ConfigManager: vi.fn().mockImplementation(() => ({
              getConfig: mockGetConfig,
              validate: mockConfigManagerValidate, // This instance's validate will throw
          }))
      }));

      await runCli();

      const { ConfigManager: MockedConfigManager } = await import('../../src/configManager');
      expect(MockedConfigManager).toHaveBeenCalled();
      expect(mockConfigManagerValidate).toHaveBeenCalled();
      expect(mockGetConfig).not.toHaveBeenCalled();
      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('Configuration Error: Source directory is required'));
      expect(capturedExitCode).toBe(1);
      expect(convertDocsMock).not.toHaveBeenCalled();
  });

  test('should exit with code 2 for non-existent source directory', async () => {
    process.argv = ['node', 'cli.js', '--service', 'cursor', '-s', '/nonexistent'];
    const configForNonExistent = {
      sourceDir: '/nonexistent',
      services: [mockGetService('cursor')],
      excludeFiles: [],
      dryRun: false,
      sync: false,
    };
    mockGetConfig.mockReturnValueOnce(configForNonExistent);
    mockConfigManagerValidate.mockReturnValueOnce(undefined);
    const error = new DirectoryNotFoundError('/nonexistent');
    convertDocsMock.mockRejectedValueOnce(error);

    // Dynamically mock *before* runCli
    vi.doMock('../../src/configManager', () => ({
        ConfigManager: vi.fn().mockImplementation(() => ({
            getConfig: mockGetConfig,
            validate: mockConfigManagerValidate,
        }))
    }));

    await runCli();

    const { ConfigManager: MockedConfigManager } = await import('../../src/configManager');
    expect(MockedConfigManager).toHaveBeenCalled();
    expect(mockConfigManagerValidate).toHaveBeenCalled();
    expect(mockGetConfig).toHaveBeenCalled();
    expect(convertDocsMock).toHaveBeenCalledWith(configForNonExistent);
    expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining(`File System Error: ${error.message}`));
    expect(capturedExitCode).toBe(2);
  });

  test('should pass dryRun option correctly', async () => {
    process.argv = ['node', 'cli.js', '--service', 'cursor', '-s', '/path/to/source', '--dry-run'];
    const configWithDryRun = {
      sourceDir: '/path/to/source',
      services: [mockGetService('cursor')],
      excludeFiles: [],
      dryRun: true,
      sync: false,
    };
    mockGetConfig.mockReturnValueOnce(configWithDryRun);
    mockConfigManagerValidate.mockReturnValueOnce(undefined);
    convertDocsMock.mockResolvedValueOnce(undefined);

    // Dynamically mock *before* runCli
    vi.doMock('../../src/configManager', () => ({
        ConfigManager: vi.fn().mockImplementation(() => ({
            getConfig: mockGetConfig,
            validate: mockConfigManagerValidate,
        }))
    }));

    await runCli();

    const { ConfigManager: MockedConfigManager } = await import('../../src/configManager');
    expect(MockedConfigManager).toHaveBeenCalled();
    expect(mockConfigManagerValidate).toHaveBeenCalled();
    expect(mockGetConfig).toHaveBeenCalled();
    expect(convertDocsMock).toHaveBeenCalledWith(expect.objectContaining({ dryRun: true }));
    expect(mockConsoleError).not.toHaveBeenCalled();
    expect(capturedExitCode).toBeUndefined();
  });

  test('should pass shorthand -d as dry run', async () => {
    process.argv = ['node', 'cli.js', '--service', 'cursor', '-s', '/path/to/source', '-d'];
    const configWithDryRun = {
      sourceDir: '/path/to/source',
      services: [mockGetService('cursor')],
      excludeFiles: [],
      dryRun: true,
      sync: false,
    };
    mockGetConfig.mockReturnValueOnce(configWithDryRun);
    mockConfigManagerValidate.mockReturnValueOnce(undefined);
    convertDocsMock.mockResolvedValueOnce(undefined);

    // Dynamically mock *before* runCli
    vi.doMock('../../src/configManager', () => ({
        ConfigManager: vi.fn().mockImplementation(() => ({
            getConfig: mockGetConfig,
            validate: mockConfigManagerValidate,
        }))
    }));

    await runCli();

    const { ConfigManager: MockedConfigManager } = await import('../../src/configManager');
    expect(MockedConfigManager).toHaveBeenCalled();
    expect(mockConfigManagerValidate).toHaveBeenCalled();
    expect(mockGetConfig).toHaveBeenCalled();
    expect(convertDocsMock).toHaveBeenCalledWith(expect.objectContaining({ dryRun: true }));
    expect(mockConsoleError).not.toHaveBeenCalled();
    expect(capturedExitCode).toBeUndefined();
  });

}); 
