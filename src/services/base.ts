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
