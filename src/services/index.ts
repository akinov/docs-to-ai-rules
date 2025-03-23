// サービスのインターフェース定義
export interface OutputService {
  name: string;
  getTargetDirectory(): string;
  getTargetExtension(): string;
  setTargetExtension(extension: string): void;
}

// 基本サービスクラス
export abstract class BaseService implements OutputService {
  constructor(
    public readonly name: string,
    protected readonly targetDirectory: string,
    protected targetExtension: string = 'mdc'
  ) {}

  getTargetDirectory(): string {
    return this.targetDirectory;
  }

  getTargetExtension(): string {
    return this.targetExtension;
  }

  setTargetExtension(extension: string): void {
    this.targetExtension = extension;
  }
}

// 全サービスをまとめて管理するクラス
export class ServiceManager {
  private services: Map<string, OutputService> = new Map();

  constructor() {
    // デフォルトで利用可能なサービスを登録
    this.registerDefaultServices();
  }

  private registerDefaultServices(): void {
    // 各サービスをインポートして登録
    const { CursorService } = require('./cursor');
    const { ClineService } = require('./cline');

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
