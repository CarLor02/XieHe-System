import { defineConfig } from 'eslint/config';
import expo from 'eslint-config-expo/flat.js';

export default defineConfig([
  expo,
  { ignores: ['ui-prototype/**', 'dist/**', '.expo/**', 'expo-env.d.ts'] },
  {
    files: ['src/shared/ui/**/index.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'Program > :not(ExportNamedDeclaration):not(ExportAllDeclaration)',
          message: '公共 UI 的 index.ts 只负责导出，实现请放在组件文件中。',
        },
        {
          selector: 'ExportNamedDeclaration[declaration!=null]',
          message: '请从组件文件重新导出，不要在 index.ts 中定义组件或类型。',
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
            '..',
            '../',
            '../index',
            '../index.ts',
            '../index.tsx',
            '@/shared/ui',
            '@/shared/ui/index',
          ].map(name => ({
            name,
            message:
              '公共组件之间请通过同级组件的目录入口导入，避免依赖根入口形成循环。',
          })),
        },
      ],
    },
  },
]);
