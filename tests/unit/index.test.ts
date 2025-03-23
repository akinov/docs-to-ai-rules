import fs from 'fs';
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { convertDocs } from '../../src/index';
import { BaseService } from '../../src/services';

vi.mock('fs');
vi.mock('../../src/processor', () => ({
  processDirectory: vi.fn().mockReturnValue({
    processedCount: 2,
    processedFiles: ['file1.md', 'file2.md'],
    services: ['mock']
  })
}));

// コンソール出力をモック化
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

describe('index', () => {
  // モックサービスを作成
  class MockService extends BaseService {
    constructor() {
      super('mock', '/tmp/mock');
    }
  }

  let mockService: MockService;
  let exitSpy: any;
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // process.exitをモック化
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      return undefined as never;
    });
    
    // コンソール出力をモック化
    console.log = vi.fn();
    console.error = vi.fn();
    
    mockService = new MockService();
    
    // fs.existsSyncのモック
    (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (fs.mkdirSync as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => {});
  });
  
  afterEach(() => {
    // 元に戻す
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    exitSpy.mockRestore();
  });
  
  test('convertDocsが正しく実行される', () => {
    const config = {
      sourceDir: '/tmp/source',
      services: [mockService],
      excludeFiles: ['README.md']
    };
    
    convertDocs(config);
    
    // ターゲットディレクトリの存在確認
    expect(fs.existsSync).toHaveBeenCalled();
    
    // 処理完了のログが出力されたか
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Processing complete'));
  });
  
  test('ソースディレクトリが存在しない場合はエラーになる', () => {
    (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce(false);
    
    const config = {
      sourceDir: '/nonexistent',
      services: [mockService]
    };
    
    convertDocs(config);
    
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('does not exist'));
    expect(process.exit).toHaveBeenCalledWith(1);
  });
}); 
