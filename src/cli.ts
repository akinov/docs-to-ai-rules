#!/usr/bin/env node

import { Command } from 'commander';
import path from 'path';
import { convertDocs } from './index';

const program = new Command();

program
  .name('docs-to-ai-rules')
  .description('Generate rule files for AI agents from Markdown documents')
  .version('1.0.0');

program
  .option('-s, --source <directory>', 'Source directory', './docs/rules')
  .option('-t, --target <directory>', 'Target directory', './.cursor/rules')
  .option('-e, --ext <extension>', 'Extension of generated files', 'mdc')
  .option('-x, --exclude <files>', 'Files to exclude (comma-separated)', 'README.md');

program.parse();

const options = program.opts();

// 絶対パスに変換
const sourceDir = path.resolve(process.cwd(), options.source);
const targetDir = path.resolve(process.cwd(), options.target);
const excludeFiles = options.exclude.split(',').map((file: string) => file.trim());

// 変換の実行
convertDocs({
  sourceDir,
  targetDir,
  targetExt: options.ext,
  excludeFiles
}); 
