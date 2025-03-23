import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { Command } from 'commander';
import { ServiceManager } from '../../src/services';

// convertDocsをモック化
const convertDocsMock = vi.fn();
vi.mock('../../src/index', () => ({
  convertDocs: convertDocsMock
}));

// ServiceManagerのmockedインスタンスを作成
vi.mock('../../src/services', () => {
  const mockGetService = vi.fn().mockImplementation((name: string) => {
    if (name === 'cursor') {
      return { name: 'cursor', getTargetDirectory: () => '.cursor/rules' };
    }
    return undefined;
  });
  
  const mockGetServices = vi.fn().mockImplementation((names: string[]) => {
    return names
      .map((name: string) => mockGetService(name))
      .filter((service: any) => service !== undefined);
  });
  
  const mockGetAllServiceNames = vi.fn().mockReturnValue(['cursor', 'cline']);
  
  return {
    ServiceManager: vi.fn().mockImplementation(() => ({
      getService: mockGetService,
      getServices: mockGetServices,
      getAllServiceNames: mockGetAllServiceNames,
      registerService: vi.fn()
    })),
    BaseService: class {}
  };
});

// CLIモジュールをモック化
vi.mock('../../src/cli');

// process.exitをモック化
const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
  return undefined as never;
});

// コンソール出力をモック化
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

describe('CLI', () => {
  beforeEach(() => {
    // コンソール出力をモック化
    console.log = vi.fn();
    console.error = vi.fn();
    
    // モックをクリア
    convertDocsMock.mockClear();
  });
  
  afterEach(() => {
    // 元に戻す
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    vi.clearAllMocks();
  });
  
  test('CLIが正しく動作する', async () => {
    // CLIを実行する前にprocess.argvをセット
    process.argv = ['node', 'cli.js', '--services', 'cursor'];
    
    // CLIモジュールを読み込む（これによってCLIが実行される）
    await import('../../src/cli');
    
    // convertDocsが呼ばれたことを確認
    expect(convertDocsMock).toHaveBeenCalled();
  });
  
  test('存在しないサービスを指定するとエラーになる', async () => {
    // CLIを実行する前にprocess.argvをセット
    process.argv = ['node', 'cli.js', '--services', 'unknown'];
    
    // CLIモジュールを読み込む
    await import('../../src/cli');
    
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Unknown service'));
    expect(process.exit).toHaveBeenCalledWith(1);
  });
}); 
