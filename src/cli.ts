#!/usr/bin/env node

import { Command } from 'commander';
import path from 'path';
import { convertDocs } from './index';
import { ServiceManager } from './services';
import { readFileSync } from 'fs';

const program = new Command();
const serviceManager = new ServiceManager();

// package.jsonからバージョン情報を読み込む
const packageJson = JSON.parse(
  readFileSync(path.join(__dirname, '../package.json'), 'utf8')
);

program
  .name('docs-to-ai-rules')
  .description('Generate rule files for AI agents from Markdown documents')
  .version(packageJson.version);

program
  .option('-s, --source <directory>', 'Source directory', './doc/rules')
  .option(
    '--services <services>', 
    'Target services (comma-separated)', 
    'cursor'
  )
  .option('-e, --ext <extension>', 'Extension of generated files', 'mdc')
  .option('-x, --exclude <files>', 'Files to exclude (comma-separated)', 'README.md');

program.parse();

const options = program.opts();

// Convert to absolute path
const sourceDir = path.resolve(process.cwd(), options.source);
const excludeFiles = options.exclude.split(',').map((file: string) => file.trim());

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

// Set custom extension
if (options.ext && options.ext !== 'mdc') {
  services.forEach(service => {
    // Assuming the service class has a setTargetExtension method
    if (typeof service.setTargetExtension === 'function') {
      service.setTargetExtension(options.ext);
    }
  });
}

// Execute conversion
convertDocs({
  sourceDir,
  services,
  excludeFiles
}); 
