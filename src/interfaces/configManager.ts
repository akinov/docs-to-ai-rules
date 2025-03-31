import type { OutputService } from '../services'; // Adjust path as needed

export interface Config {
  sourceDir: string;
  services: OutputService[];
  excludeFiles?: string[];
  dryRun?: boolean;
  sync?: boolean;
}

export interface ConfigManager {
  /**
   * Loads and validates the configuration.
   * May throw ConfigurationError or ValidationError.
   */
  loadConfig(configPath?: string, cliOptions?: Partial<Config>): Promise<Config>;

  /**
   * Provides access to the currently loaded configuration.
   * Should only be called after loadConfig has successfully completed.
   */
  getConfig(): Config;

  /**
   * Validates a given configuration object.
   * Returns true if valid, otherwise throws ValidationError.
   */
  validateConfig(config: Partial<Config>): boolean;
} 
