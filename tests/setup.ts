// グローバルにJestの型を追加する
import 'jest';

// setup.tsは設定のみを行うため、ダミーのテストを追加
test('setup', () => {
  expect(true).toBe(true);
}); 
