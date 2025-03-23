import fs from 'fs';
import path from 'path';
import { processDirectory } from '../../src/processor';
import { BaseService } from '../../src/services';

jest.mock('fs');

class MockService extends BaseService {
  constructor() {
    super('mock', '/tmp/mock', 'test');
  }
}

describe('processor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('processDirectory が正しく機能する', () => {
    // モックデータをセットアップ
    const mockFiles = ['test.md', 'README.md', 'other.txt'];
    (fs.readdirSync as jest.Mock).mockReturnValue(mockFiles);
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.mkdirSync as jest.Mock).mockImplementation(() => {});
    (fs.copyFileSync as jest.Mock).mockImplementation(() => {});

    const mockService = new MockService();
    const config = {
      sourceDir: '/tmp/source',
      services: [mockService],
      excludeFiles: ['README.md']
    };

    // 関数を実行
    const result = processDirectory(config);

    // アサーション
    expect(result.processedCount).toBe(1);
    expect(result.processedFiles).toEqual(['test.md']);
    expect(result.services).toEqual(['mock']);

    // ファイルがコピーされたかを確認
    expect(fs.copyFileSync).toHaveBeenCalledWith(
      path.join('/tmp/source', 'test.md'),
      path.join('/tmp/mock', 'test.test')
    );
  });

  test('除外ファイルが正しく処理される', () => {
    // モックデータをセットアップ
    const mockFiles = ['test1.md', 'test2.md', 'README.md'];
    (fs.readdirSync as jest.Mock).mockReturnValue(mockFiles);
    (fs.existsSync as jest.Mock).mockReturnValue(true);

    const mockService = new MockService();
    const config = {
      sourceDir: '/tmp/source',
      services: [mockService],
      excludeFiles: ['test1.md', 'README.md']
    };

    // 関数を実行
    const result = processDirectory(config);

    // アサーション
    expect(result.processedCount).toBe(1);
    expect(result.processedFiles).toEqual(['test2.md']);
  });
}); 
