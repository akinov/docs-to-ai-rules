#!/usr/bin/env node

import { Command } from 'commander';
import path from 'path';
import { convertDocs } from './index';
import { ServiceManager } from './services';

const program = new Command();
const serviceManager = new ServiceManager();

program
  .name('docs-to-ai-rules')
  .description('Generate rule files for AI agents from Markdown documents')
  .version('1.0.0');

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

// 絶対パスに変換
const sourceDir = path.resolve(process.cwd(), options.source);
const excludeFiles = options.exclude.split(',').map((file: string) => file.trim());

// サービスのリストを取得
const serviceNames = options.services.split(',').map((s: string) => s.trim().toLowerCase());
const availableServices = serviceManager.getAllServiceNames();
const services = serviceManager.getServices(serviceNames);

// 存在しないサービスをチェック
const invalidServices = serviceNames.filter((name: string) => !availableServices.includes(name));
if (invalidServices.length > 0) {
  console.error(`Error: Unknown service(s): ${invalidServices.join(', ')}`);
  console.log(`Available services: ${availableServices.join(', ')}`);
  process.exit(1);
}

// サービスが指定されているか確認
if (services.length === 0) {
  console.error('Error: No valid services specified');
  console.log(`Available services: ${availableServices.join(', ')}`);
  process.exit(1);
}

// カスタム拡張子の設定
if (options.ext && options.ext !== 'mdc') {
  services.forEach(service => {
    // 拡張子を設定（サービスクラスにsetTargetExtensionメソッドがあると仮定）
    if (typeof service.setTargetExtension === 'function') {
      service.setTargetExtension(options.ext);
    }
  });
}

// 変換の実行
convertDocs({
  sourceDir,
  services,
  excludeFiles
}); 
