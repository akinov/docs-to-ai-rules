import fs from 'fs';
import { convertDocs } from '../../src/index';
import { BaseService } from '../../src/services';

jest.mock('fs');
jest.mock('../../src/processor', () => ({
  processDirectory: jest.fn().mockReturnValue({
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
  let exitSpy: jest.SpyInstance;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // process.exitをモック化
    exitSpy = jest.spyOn(process, 'exit').mockImplementation((code?: string | number | null) => {
      return undefined as never;
    });
    
    // コンソール出力をモック化
    console.log = jest.fn();
    console.error = jest.fn();
    
    mockService = new MockService();
    
    // fs.existsSyncのモック
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.mkdirSync as jest.Mock).mockImplementation(() => {});
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
    (fs.existsSync as jest.Mock).mockReturnValueOnce(false);
    
    const config = {
      sourceDir: '/nonexistent',
      services: [mockService]
    };
    
    convertDocs(config);
    
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('does not exist'));
    expect(process.exit).toHaveBeenCalledWith(1);
  });
}); 
