import { Command } from 'commander';
import { ServiceManager } from '../../src/services';

// convertDocsをモック化
const convertDocsMock = jest.fn();
jest.mock('../../src/index', () => ({
  convertDocs: convertDocsMock
}));

// ServiceManagerのmockedインスタンスを作成
jest.mock('../../src/services', () => {
  const mockGetService = jest.fn().mockImplementation((name: string) => {
    if (name === 'cursor') {
      return { name: 'cursor', getTargetDirectory: () => '.cursor/rules' };
    }
    return undefined;
  });
  
  const mockGetServices = jest.fn().mockImplementation((names: string[]) => {
    return names
      .map((name: string) => mockGetService(name))
      .filter((service: any) => service !== undefined);
  });
  
  const mockGetAllServiceNames = jest.fn().mockReturnValue(['cursor', 'cline']);
  
  return {
    ServiceManager: jest.fn().mockImplementation(() => ({
      getService: mockGetService,
      getServices: mockGetServices,
      getAllServiceNames: mockGetAllServiceNames,
      registerService: jest.fn()
    })),
    BaseService: class {}
  };
});

// process.exitをモック化
const mockExit = jest.spyOn(process, 'exit').mockImplementation((code?: string | number | null | undefined) => {
  return undefined as never;
});

// コンソール出力をモック化
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

describe('CLI', () => {
  beforeEach(() => {
    // CLIモジュールをリセット
    jest.resetModules();
    
    // コンソール出力をモック化
    console.log = jest.fn();
    console.error = jest.fn();
    
    // process.argvをバックアップ
    process.argv = ['node', 'cli.js'];
    
    // モックをクリア
    convertDocsMock.mockClear();
  });
  
  afterEach(() => {
    // 元に戻す
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    jest.clearAllMocks();
  });
  
  test('CLIが正しく動作する', () => {
    // CLIを実行する前にprocess.argvをセット
    process.argv = ['node', 'cli.js', '--services', 'cursor'];
    
    // CLIモジュールをインポート
    jest.isolateModules(() => {
      require('../../src/cli');
    });
    
    // convertDocsが呼ばれたことを確認
    expect(convertDocsMock).toHaveBeenCalled();
  });
  
  test('存在しないサービスを指定するとエラーになる', () => {
    // CLIを実行する前にprocess.argvをセット
    process.argv = ['node', 'cli.js', '--services', 'unknown'];
    
    // CLIモジュールをインポート
    jest.isolateModules(() => {
      require('../../src/cli');
    });
    
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Unknown service'));
    expect(process.exit).toHaveBeenCalledWith(1);
  });
}); 
