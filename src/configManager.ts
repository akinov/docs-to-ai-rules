import { Command } from 'commander';
import path from 'path';
import { ServiceManager } from './services';
import { expandTilde } from './services/base';
import type { Config } from './interfaces/configManager';
import type { OutputService } from './services';
import { ConfigurationError, ValidationError } from './errors'; // Import custom errors

export class ConfigManager {
  private config: Config;

  constructor() {
    this.config = this.loadConfigFromArgs();
    this.validate(); // Validate config upon instantiation
  }

  private loadConfigFromArgs(): Config {
    const program = new Command();
    const serviceManager = new ServiceManager();

    // Define options separately for clarity
    program
      .option('-s, --source <directory>', 'Source directory', './docs/rules')
      .option(
        '--services <services>',
        'Target services (comma-separated)',
        'cursor'
      )
      .option('-x, --exclude <files>', 'Files to exclude (comma-separated)', 'README.md')
      .option('-d, --dry-run', 'Check for updates without modifying files')
      .option('--sync', 'Format output directory and sync files completely');

    // Parse arguments without exiting on error, allowing us to handle errors
    program.exitOverride(); // Prevent commander from calling process.exit
    try {
        program.parse(process.argv);
    } catch (err: any) {
        // Catch errors from commander (like missing required options)
        throw new ConfigurationError(`Failed to parse command line arguments: ${err.message}`);
    }

    const options = program.opts();

    const sourceDir = path.resolve(process.cwd(), expandTilde(options.source));
    const excludeFiles = options.exclude.split(',').map((file: string) => file.trim());
    const dryRun = !!options.dryRun;
    const sync = !!options.sync;

    const serviceNames = options.services.split(',').map((s: string) => s.trim().toLowerCase());
    const availableServices = serviceManager.getAllServiceNames();

    // Check for invalid service names
    const invalidServices = serviceNames.filter((name: string) => !availableServices.includes(name));
    if (invalidServices.length > 0) {
      throw new ConfigurationError(
        `Unknown service(s): ${invalidServices.join(', ')}. Available: ${availableServices.join(', ')}`
      );
    }

    const services = serviceManager.getServices(serviceNames);

    // Check if any valid services were actually found/specified
    if (services.length === 0 && serviceNames.length > 0) {
      // This case should ideally be caught by the invalidServices check above,
      // but added as a safeguard.
      throw new ConfigurationError(
        `No valid services found for names: ${serviceNames.join(', ')}. Available: ${availableServices.join(', ')}`
      );
    }
    // If no services were specified at all
    if (services.length === 0) {
        throw new ConfigurationError(
          `No services specified. Available: ${availableServices.join(', ')}`
        );
    }


    return {
      sourceDir,
      services,
      excludeFiles,
      dryRun,
      sync
    };
  }

  public getConfig(): Config {
    return this.config;
  }

  // Validate the loaded configuration
  public validate(): void {
    if (!this.config.sourceDir) {
      throw new ValidationError('Source directory (--source) is required.');
    }
    if (this.config.services.length === 0) {
        // This check might be redundant due to loadConfigFromArgs, but good practice
      throw new ValidationError('At least one valid service (--services) must be specified.');
    }
    // Add more validation rules here (e.g., check if sourceDir exists and is a directory)
    // Note: Checking sourceDir existence might be better suited for the FileSystemManager
    // or the main execution flow in index.ts to provide context.
  }
} 
