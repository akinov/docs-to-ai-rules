#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { Command, Option } from 'commander';
import { ConfigManager } from './configManager';
import { convertDocs } from './index';
import { ConfigurationError, DirectoryNotFoundError, FileSystemError } from './errors';
import { ServiceManager } from './services';
import logger from './logger'; // Import logger

/**
 * Asynchronous main function for the CLI.
 */
async function main(): Promise<void> {
  const program = new Command();

  // Dynamically read version from package.json
  let packageVersion = 'unknown';
  try {
    // Navigate up correctly from src to the project root
    const packageJsonPath = path.resolve(__dirname, '../package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    packageVersion = packageJson.version;
  } catch (error) {
    // Use logger.warn instead of console.error for non-critical issue
    logger.warn('Warning: Could not read package.json for version info.', error);
  }

  program
    .version(packageVersion)
    .description('Convert documentation files to AI rules format for specified services.')
    .addOption(new Option('-s, --source <dir>', 'Source directory containing Markdown files').env('DOCS_TO_AI_SOURCE_DIR'))
    .addOption(new Option('--service <names...>', 'Service names to generate rules for (e.g., cursor)').env('DOCS_TO_AI_SERVICES'))
    .option('--exclude <files...>', 'Files or patterns to exclude', [])
    .option('-d, --dry-run', 'Perform a dry run without actual changes')
    .option('--sync', 'Synchronize target directories (delete outdated files)')
    .parse(process.argv);

  const options = program.opts();

  try {
    // ConfigManager constructor loads and validates config from process.argv internally
    const configManager = new ConfigManager(); // No arguments needed
    const config = configManager.getConfig(); // No arguments needed

    logger.info('Configuration loaded successfully.');
    logger.debug({ config: { ...config, services: config.services.map(s => s.name) } }, 'Running with configuration');

    // convertDocs expects the config object
    await convertDocs(config);

    logger.info('Operation completed successfully.');

  } catch (error: any) {
    // Log the error using the logger
    logger.error({ err: error }, 'An unexpected error occurred');

    // Provide user-friendly messages based on error type
    if (error instanceof ConfigurationError) {
      // Use logger.error for user-facing configuration issues
      logger.error(` Configuration Error: ${error.message}`);
      process.exit(1);
    } else if (error instanceof DirectoryNotFoundError) {
      logger.error(` File System Error: ${error.message}`);
      process.exit(2);
    } else if (error instanceof FileSystemError) {
      logger.error(` File System Error: ${error.message}`);
      process.exit(3);
    } else {
      // Use logger.error for generic unexpected errors
      logger.error(` An unexpected error occurred: ${error.message || error}`);
      process.exit(4);
    }
    // It seems the original code had duplicate console.error calls, consolidating to logger
  }
}

// Execute the main function
main().catch((error) => {
  // Final catch for any unhandled promise rejections from main()
  logger.fatal({ err: error }, 'Unhandled error in CLI main function.'); // Use logger.fatal
  process.exit(1); // Exit with a generic error code
}); 
