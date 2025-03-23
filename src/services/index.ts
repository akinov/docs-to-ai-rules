// 各サービスをインポート
import { CursorService } from './cursor';
import { ClineService } from './cline';
import { OutputService, BaseService } from './base';

// 全サービスをまとめて管理するクラス
export class ServiceManager {
  private services: Map<string, OutputService> = new Map();

  constructor() {
    // デフォルトで利用可能なサービスを登録
    this.registerDefaultServices();
  }

  private registerDefaultServices(): void {
    // 各サービスを登録
    this.registerService(new CursorService());
    this.registerService(new ClineService());
  }

  registerService(service: OutputService): void {
    this.services.set(service.name.toLowerCase(), service);
  }

  getService(name: string): OutputService | undefined {
    return this.services.get(name.toLowerCase());
  }

  getServices(names: string[]): OutputService[] {
    return names
      .map(name => this.getService(name))
      .filter((service): service is OutputService => service !== undefined);
  }

  getAllServiceNames(): string[] {
    return Array.from(this.services.keys());
  }
}

export { OutputService, BaseService } from './base';
export { CursorService } from './cursor';
export { ClineService } from './cline'; 
