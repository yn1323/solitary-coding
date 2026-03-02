export default {
  port: 4000,
  timer: {
    intervalMinutes: 10,
  },
  git: {
    defaultBranch: 'claude/ai-dev-helper-tool-bzRK5',
  },
  ci: {
    maxRetries: 3,
    steps: [
      { name: 'typecheck', command: 'pnpm run type-check' },
      { name: 'test', command: 'pnpm run test' },
      { name: 'build', command: 'pnpm run build' },
    ],
  },
  claude: {
    timeout: 600_000,
  },
};
