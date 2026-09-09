import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: 'node',
    root: './',
    setupFiles: ['./test/setup-e2e.ts'],
    include: ['**/*.e2e-spec.ts'],
  },
});
