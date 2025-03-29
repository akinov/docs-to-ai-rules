#!/usr/bin/env node

import { Command } from 'commander';
import path from 'path';
import { convertDocs } from './index';
import { ServiceManager } from './services';
import { expandTilde } from './services/base';
import { readFileSync } from 'fs';

const program = new Command();
const serviceManager = new ServiceManager();

// Load version info from package.json
const packageJson = JSON.parse(
  readFileSync(path.join(__dirname, '../../package.json'), 'utf8')
);

program
  .name('docs-to-ai-rules')
  .description('Generate rule files for AI agents from Markdown documents')
  .version(packageJson.version);

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

// Convert to absolute path with tilde expansion
const sourceDir = path.resolve(process.cwd(), expandTilde(options.source));
const excludeFiles = options.exclude.split(',').map((file: string) => file.trim());
const dryRun = !!options.dryRun;
const sync = !!options.sync;

// Get list of services
const serviceNames = options.services.split(',').map((s: string) => s.trim().toLowerCase());
const availableServices = serviceManager.getAllServiceNames();
const services = serviceManager.getServices(serviceNames);

// Check for non-existent services
const invalidServices = serviceNames.filter((name: string) => !availableServices.includes(name));
if (invalidServices.length > 0) {
  console.error(`Error: Unknown service(s): ${invalidServices.join(', ')}`);
  console.log(`Available services: ${availableServices.join(', ')}`);
  process.exit(1);
}

// Verify that services are specified
if (services.length === 0) {
  console.error('Error: No valid services specified');
  console.log(`Available services: ${availableServices.join(', ')}`);
  process.exit(1);
}

// Execute conversion
convertDocs({
  sourceDir,
  services,
  excludeFiles,
  dryRun,
  sync
}); 
