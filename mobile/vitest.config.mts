import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      // 资源目录在 src 外，优先匹配更具体的别名，并与 tsconfig.json 保持一致。
      '@/assets': fileURLToPath(new URL('./assets', import.meta.url)),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
