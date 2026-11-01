import { defineConfig } from 'eslint/config';
import expo from 'eslint-config-expo/flat.js';

const parentImportRestriction = {
  group: ['..', '../**'],
  message: '跨目录引用请使用 @/ 别名；目录内部引用保留 ./ 相对路径。',
};

export default defineConfig([
  expo,
  { ignores: ['ui-prototype/**', 'dist/**', '.expo/**', 'expo-env.d.ts'] },
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [parentImportRestriction] },
      ],
    },
  },
  {
    files: ['src/shared/ui/**/index.{ts,tsx}', 'src/shared/theme/index.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'Program > :not(ExportNamedDeclaration):not(ExportAllDeclaration)',
          message: '公共 UI 和主题的 index.ts 只负责导出，实现请放在各自文件中。',
        },
        {
          selector: 'ExportNamedDeclaration[declaration!=null]',
          message: '请从实现文件重新导出，不要在 index.ts 中定义组件、常量或类型。',
        },
      ],
    },
  },
  {
    files: ['src/shared/ui/*/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            '@/shared/ui',
            '@/shared/ui/',
            '@/shared/ui/index',
            '@/shared/ui/index.ts',
            '@/shared/ui/index.tsx',
          ].map(name => ({
            name,
            message:
              '公共组件之间请通过同级组件的目录入口导入，避免依赖根入口形成循环。',
          })),
          patterns: [parentImportRestriction],
        },
      ],
    },
  },
]);
