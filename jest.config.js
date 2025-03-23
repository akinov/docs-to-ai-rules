module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/tests/unit/**/*.ts',
    '**/tests/int/**/*.ts',
  ],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
      isolatedModules: true
    }]
  },
  // テスト種類ごとに実行するスクリプト
  projects: [
    {
      displayName: 'unit',
      testMatch: ['**/tests/unit/**/*.ts'],
      preset: 'ts-jest',
      testEnvironment: 'node',
    },
    {
      displayName: 'int',
      testMatch: ['**/tests/int/**/*.ts'],
      preset: 'ts-jest',
      testEnvironment: 'node',
    },
  ],
}; 
