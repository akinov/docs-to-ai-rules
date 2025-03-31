import { Command } from 'commander';
import path from 'path';
import { ServiceManager } from './services';
import { expandTilde } from './services/base';
import type { Config } from './interfaces/configManager';
import type { OutputService } from './services';

export class ConfigManager {
  private config: Config;

  constructor() {
    // This is a simple implementation for now.
    // In a real scenario, this might load from a file, env vars, etc.
    // and perform more robust validation.
    this.config = this.loadConfigFromArgs();
  }

  private loadConfigFromArgs(): Config {
    const program = new Command();
    const serviceManager = new ServiceManager();

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

    program.parse();
    const options = program.opts();

    const sourceDir = path.resolve(process.cwd(), expandTilde(options.source));
    const excludeFiles = options.exclude.split(',').map((file: string) => file.trim());
    const dryRun = !!options.dryRun;
    const sync = !!options.sync;

    const serviceNames = options.services.split(',').map((s: string) => s.trim().toLowerCase());
    const availableServices = serviceManager.getAllServiceNames();
    const services = serviceManager.getServices(serviceNames);

    // Check for non-existent services (Consider moving this validation elsewhere or making it part of ConfigManager)
    const invalidServices = serviceNames.filter((name: string) => !availableServices.includes(name));
    if (invalidServices.length > 0) {
      // Ideally, throw a specific ConfigurationError here
      console.error(`Error: Unknown service(s): ${invalidServices.join(', ')}`);
      console.log(`Available services: ${availableServices.join(', ')}`);
      process.exit(1); // Replace with error throwing later
    }

    if (services.length === 0) {
        // Ideally, throw a specific ConfigurationError here
      console.error('Error: No valid services specified');
      console.log(`Available services: ${availableServices.join(', ')}`);
      process.exit(1); // Replace with error throwing later
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
  
  // Add methods for validation if needed
  public validate(): boolean {
      // Basic validation example
      if (!this.config.sourceDir) {
          console.error("Source directory is required.");
          return false;
      }
      if (this.config.services.length === 0) {
          console.error("At least one service must be specified.");
          return false;
      }
      // Add more validation rules as needed
      return true;
  }
} 
