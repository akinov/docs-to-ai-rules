import fs from 'fs';
import path from 'path';
import { Config } from './index';
import { OutputService } from './services';

export interface ProcessResult {
  processedCount: number;
  processedFiles: string[];
  services: string[];
}

/**
 * Process Markdown files in a directory
 */
export function processDirectory(config: Config): ProcessResult {
  const { sourceDir, services, excludeFiles = [] } = config;
  const files = fs.readdirSync(sourceDir);
  let processedCount = 0;
  const processedFiles: string[] = [];
  
  for (const file of files) {
    if (file.endsWith('.md') && !excludeFiles.includes(file)) {
      const sourcePath = path.join(sourceDir, file);
      
      // 各サービスに対してファイルを処理
      for (const service of services) {
        const targetDir = service.getTargetDirectory();
        const targetExt = service.getTargetExtension();
        const targetFile = file.replace('.md', `.${targetExt}`);
        const targetPath = path.join(targetDir, targetFile);
        
        // ディレクトリが存在しない場合は作成
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }
        
        // Copy file
        fs.copyFileSync(sourcePath, targetPath);
        console.log(`[${service.name}] Converted ${file} to ${targetFile}`);
      }
      
      processedCount++;
      processedFiles.push(file);
    }
  }
  
  return {
    processedCount,
    processedFiles,
    services: services.map(s => s.name)
  };
} 
