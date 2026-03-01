import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'packages/shared/src/**/*.test.ts',
      'packages/server/src/**/*.test.ts',
      'packages/cli/src/**/*.test.ts',
    ],
    alias: {
      '@solitary-coding/shared/db/schema': './packages/shared/src/db/schema.ts',
      '@solitary-coding/shared': './packages/shared/src/index.ts',
      '@solitary-coding/server/runner/claude': './packages/server/src/runner/claude.ts',
      '@solitary-coding/server/port': './packages/server/src/port.ts',
      '@solitary-coding/server': './packages/server/src/index.ts',
    },
  },
});
