#!/usr/bin/env node

import { Command } from 'commander';
import path from 'path';
import { convertDocs } from './index';
import { ConfigManager } from './configManager';
import { readFileSync } from 'fs';

const program = new Command();

// Load version info from package.json
const packageJson = JSON.parse(
  readFileSync(path.join(__dirname, '../../package.json'), 'utf8')
);

program
  .name('docs-to-ai-rules')
  .description('Generate rule files for AI agents from Markdown documents')
  .version(packageJson.version);

// Options are now handled by ConfigManager
// program
//   .option('-s, --source <directory>', 'Source directory', './docs/rules')
//   .option(
//     '--services <services>', 
//     'Target services (comma-separated)', 
//     'cursor'
//   )
//   .option('-x, --exclude <files>', 'Files to exclude (comma-separated)', 'README.md')
//   .option('-d, --dry-run', 'Check for updates without modifying files')
//   .option('--sync', 'Format output directory and sync files completely');

// program.parse(); // Parsing happens inside ConfigManager

// Instantiate ConfigManager to load and validate config
const configManager = new ConfigManager();

// // Validation logic moved to ConfigManager
// const options = program.opts();
// const sourceDir = path.resolve(process.cwd(), expandTilde(options.source));
// const excludeFiles = options.exclude.split(',').map((file: string) => file.trim());
// const dryRun = !!options.dryRun;
// const sync = !!options.sync;
// const serviceNames = options.services.split(',').map((s: string) => s.trim().toLowerCase());
// const availableServices = serviceManager.getAllServiceNames();
// const services = serviceManager.getServices(serviceNames);
// const invalidServices = serviceNames.filter((name: string) => !availableServices.includes(name));
// if (invalidServices.length > 0) {
//   console.error(`Error: Unknown service(s): ${invalidServices.join(', ')}`);
//   console.log(`Available services: ${availableServices.join(', ')}`);
//   process.exit(1);
// }
// if (services.length === 0) {
//   console.error('Error: No valid services specified');
//   console.log(`Available services: ${availableServices.join(', ')}`);
//   process.exit(1);
// }

// Basic validation example (will be replaced by custom error throwing)
if (!configManager.validate()) {
    process.exit(1);
}

// Get the validated config object
const config = configManager.getConfig();

// Execute conversion with the config object
convertDocs(config); 
