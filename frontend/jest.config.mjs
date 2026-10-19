import nextJest from 'next/jest.js';
import { fileURLToPath } from 'node:url';

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    // Jest 仍运行 CommonJS；通过公开 import 入口解析仅发布 ESM 的 SDK，再交给 SWC 转换。
    '^@stellarmesh/sdk$': fileURLToPath(
      import.meta.resolve('@stellarmesh/sdk')
    ),
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testEnvironment: 'jsdom',
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/out/',
    '<rootDir>/node_modules/',
  ],
};

export default createJestConfig(customJestConfig);
