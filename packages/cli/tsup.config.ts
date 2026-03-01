import { defineConfig } from 'tsup';

export default defineConfig([
  // CLI binary (with shebang)
  {
    entry: ['src/index.ts'],
    format: ['esm'],
    dts: false,
    splitting: false,
    clean: true,
    banner: {
      js: '#!/usr/bin/env node',
    },
    noExternal: [
      '@solitary-coding/server',
      '@solitary-coding/shared',
    ],
  },
  // Library entry (for `import { defineConfig } from 'solitary-coding'`)
  {
    entry: ['src/lib.ts'],
    format: ['esm'],
    dts: true,
    splitting: false,
    clean: false,
    noExternal: [
      '@solitary-coding/shared',
    ],
  },
]);
