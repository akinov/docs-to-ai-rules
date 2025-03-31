import path from 'path';
import { describe, test, expect, beforeEach, afterEach, vi, type MockInstance, type Mocked } from 'vitest';
import { convertDocs, type Config } from '../../src/index';
import type { BaseService } from '../../src/services/base';
import { NodeFileSystemManager } from '../../src/utils/fileSystemManager';
import { DirectoryNotFoundError } from '../../src/errors';
import type { FileStats } from '../../src/interfaces/fileSystemManager';
import { processDirectory, type ProcessResult } from '../processor';

// Define the mock function *before* vi.mock
const processDirectoryMock = vi.fn();

vi.mock('../processor', () => ({
  processDirectory: processDirectoryMock,
}));

// Mock FileSystemManager using vi.hoisted for proper mocking
vi.mock('../utils/fileSystemManager'); // NodeFileSystemManager をモック

// Mock console output
vi.mock('console', () => ({
  log: vi.fn(),
  error: vi.fn(),
}));

// Define MockService
class MockService extends BaseService {
  targetExtension = '.test';
  targetDir = '/tmp/mock';
  async convertFile(sourcePath: string, targetPath: string): Promise<void> {
    // No-op for testing convertDocs focus
  }
}

describe('convertDocs', () => {
  let mockService: MockService;
  // NodeFileSystemManager の型付けされたモックインスタンス
  let mockFSM: Mocked<NodeFileSystemManager>;
  let mockConsoleLog: MockInstance;
  let mockConsoleError: MockInstance;

  beforeEach(async () => {
    // NodeFileSystemManager のモックインスタンスを取得
    // new する必要があるので、コンストラクタもモックする
    const MockFSM = vi.mocked(NodeFileSystemManager);
    MockFSM.mockClear(); // コンストラクタの呼び出し履歴もクリア
    // モックされたコンストラクタからインスタンスを作成 (実際の実装は使われない)
    // 各メソッドはインスタンスごとにモックする必要がある
    mockFSM = new MockFSM() as Mocked<NodeFileSystemManager>;

    // モックメソッドのデフォルト実装を設定 (Promise を返すように)
    mockFSM.ensureDirectoryExists = vi.fn().mockResolvedValue(undefined);
    mockFSM.removeDirectoryIfExists = vi.fn().mockResolvedValue(undefined);
    mockFSM.fileExists = vi.fn().mockResolvedValue(true);
    mockFSM.readDir = vi.fn().mockResolvedValue([]);
    mockFSM.copyFile = vi.fn().mockResolvedValue(undefined);
    mockFSM.needsUpdate = vi.fn().mockResolvedValue(false);
    mockFSM.deleteFile = vi.fn().mockResolvedValue(undefined);
    mockFSM.findFiles = vi.fn().mockResolvedValue([]); // findFiles も追加

    // processDirectory モックのリセットとデフォルトの戻り値設定
    processDirectoryMock.mockClear();
    const defaultProcessResult: ProcessResult = {
      processedCount: 0,
      updatedCount: 0,
      updatedFiles: [],
      deletedCount: 0,
      deletedFiles: []
    };
    processDirectoryMock.mockResolvedValue(defaultProcessResult); // mockResolvedValue を使用

    // Mock console
    mockConsoleLog = vi.mocked(console.log);
    mockConsoleError = vi.mocked(console.error);
    mockConsoleLog.mockClear();
    mockConsoleError.mockClear();

    mockService = new MockService(mockFSM); // モックインスタンスを渡す

    // FileSystemManager のインスタンス生成をモック
    // convertDocs 内で new NodeFileSystemManager() が呼ばれたときに mockFSM を返す
    MockFSM.mockImplementation(() => mockFSM);

  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('should process directory and log completion', async () => {
    const config: Config = { sourceDir: '/tmp/source', services: [mockService], excludeFiles: [], dryRun: false, sync: false };
    await convertDocs(config);
    expect(mockFSM.fileExists).toHaveBeenCalledWith('/tmp/source'); // モックインスタンスのメソッドをチェック
    expect(mockFSM.ensureDirectoryExists).toHaveBeenCalledWith('/tmp/mock'); // モックインスタンスのメソッドをチェック
    expect(mockFSM.removeDirectoryIfExists).not.toHaveBeenCalled(); // sync: false なので呼ばれない
    // convertDocs は内部で FSM を new するので、そのインスタンスが渡される
    expect(processDirectoryMock).toHaveBeenCalledWith(config, mockService, expect.any(NodeFileSystemManager));
    expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Processing complete'));
  });

  test('should skip processing if dryRun is true', async () => {
    const config: Config = { sourceDir: '/tmp/source', services: [mockService], excludeFiles: [], dryRun: true, sync: false };
    await convertDocs(config);
    expect(mockFSM.fileExists).toHaveBeenCalledWith('/tmp/source');
    expect(mockFSM.ensureDirectoryExists).toHaveBeenCalledWith('/tmp/mock');
    expect(processDirectoryMock).not.toHaveBeenCalled(); // dryRun なので呼ばれない
    expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Dry run complete'));
  });

  test('should clean target directory and delete files if sync is true', async () => {
    // モックの設定: findFiles が返すファイルリスト
    mockFSM.findFiles.mockResolvedValueOnce(['/tmp/mock/old1.test', '/tmp/mock/old2.test']);
    // processDirectory が返す結果（同期で更新されたファイル）
    const syncResult: ProcessResult = {
      processedCount: 1, updatedCount: 1, updatedFiles: ['new.md'], // 元ファイル名
      deletedCount: 0, deletedFiles: [] // processDirectory は削除ファイルを返さない想定
    };
    processDirectoryMock.mockResolvedValueOnce(syncResult); // mockResolvedValue を使用

    const config: Config = { sourceDir: '/tmp/source', services: [mockService], excludeFiles: [], dryRun: false, sync: true };
    await convertDocs(config);

    expect(mockFSM.fileExists).toHaveBeenCalledWith('/tmp/source');
    expect(mockFSM.ensureDirectoryExists).toHaveBeenCalledWith('/tmp/mock');
    expect(processDirectoryMock).toHaveBeenCalledWith(config, mockService, expect.any(NodeFileSystemManager));

    // findFiles が呼ばれ、ターゲットディレクトリ内のファイルを検索する
    expect(mockFSM.findFiles).toHaveBeenCalledWith('/tmp/mock', ['.test']);

    // processDirectory が返した updatedFiles に基づいて、削除すべきファイルを計算
    // syncResult.updatedFiles は ['new.md'] なので、対応するターゲットファイルは '/tmp/mock/new.test'
    // findFiles が返した ['/tmp/mock/old1.test', '/tmp/mock/old2.test'] のうち、'/tmp/mock/new.test' に含まれないものが削除対象
    expect(mockFSM.deleteFile).toHaveBeenCalledTimes(2);
    expect(mockFSM.deleteFile).toHaveBeenCalledWith('/tmp/mock/old1.test');
    expect(mockFSM.deleteFile).toHaveBeenCalledWith('/tmp/mock/old2.test');

    expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Deleted 2 orphaned file(s)'));
    expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Processing complete'));
  });

  test('should throw DirectoryNotFoundError if source directory does not exist', async () => {
    // Mock fileExists specifically for the source directory check
    mockFSM.fileExists.mockImplementation(async (filePath) => filePath !== '/nonexistent');
    const config: Config = { sourceDir: '/nonexistent', services: [mockService], excludeFiles: [], dryRun: false, sync: false };
    await expect(convertDocs(config)).rejects.toThrow(DirectoryNotFoundError);
    expect(processDirectoryMock).not.toHaveBeenCalled();
    // Use template literal for string containing single quotes
    expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining(`Source directory '/nonexistent' not found.`));
  });

  test('should handle errors during file processing', async () => {
    const processingError = new Error('Processing failed');
    processDirectoryMock.mockRejectedValueOnce(processingError); // processDirectory でエラー発生
    const config: Config = { sourceDir: '/tmp/source', services: [mockService], excludeFiles: [], dryRun: false, sync: false };

    await expect(convertDocs(config)).rejects.toThrow(processingError); // エラーが再スローされることを確認
    expect(mockConsoleError).toHaveBeenCalledWith('Error during processing:', processingError);
  });

  test('should handle errors during sync cleanup', async () => {
    const cleanupError = new Error('Cleanup failed');
    mockFSM.findFiles.mockResolvedValueOnce(['/tmp/mock/old.test']); // 存在するファイル
    mockFSM.deleteFile.mockRejectedValueOnce(cleanupError); // deleteFile でエラー発生
    processDirectoryMock.mockResolvedValueOnce({ // processDirectory は成功
      processedCount: 0, updatedCount: 0, updatedFiles: [], deletedCount: 0, deletedFiles: []
    });

    const config: Config = { sourceDir: '/tmp/source', services: [mockService], excludeFiles: [], dryRun: false, sync: true };

    await expect(convertDocs(config)).rejects.toThrow(cleanupError); // エラーが再スローされることを確認
    expect(mockConsoleError).toHaveBeenCalledWith('Error during sync cleanup:', cleanupError);
  });

}); 
