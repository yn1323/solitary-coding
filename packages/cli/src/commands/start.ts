import fs from 'node:fs';
import path from 'node:path';
import { createJiti } from 'jiti';
import { serve } from '@hono/node-server';
import { createServer } from '@solitary-coding/server';
import { defaultConfig, type Config } from '@solitary-coding/shared';
import { ClaudeCli } from '@solitary-coding/server/runner/claude';
import { findAvailablePort } from '@solitary-coding/server/port';

async function loadConfig(projectRoot: string): Promise<Config> {
  const configPath = path.join(projectRoot, 'solitary-coding.config.ts');

  if (!fs.existsSync(configPath)) {
    return defaultConfig;
  }

  try {
    const jiti = createJiti(projectRoot);
    const mod = (await jiti.import(configPath)) as { default?: Partial<Config> };
    const userConfig = mod.default ?? {};
    return {
      ...defaultConfig,
      ...userConfig,
      timer: { ...defaultConfig.timer, ...userConfig.timer },
      git: { ...defaultConfig.git, ...userConfig.git },
      ci: { ...defaultConfig.ci, ...userConfig.ci },
      claude: { ...defaultConfig.claude, ...userConfig.claude },
    };
  } catch {
    console.warn('Warning: Failed to load config, using defaults');
    return defaultConfig;
  }
}

export async function startCommand(targetDir?: string) {
  const cwd = targetDir ?? process.cwd();

  // Check prerequisites
  const scDir = path.join(cwd, '.solitary-coding');
  if (!fs.existsSync(scDir)) {
    console.error(
      'Error: .solitary-coding/ directory not found. Run `solitary-coding init` first.',
    );
    process.exit(1);
  }

  const claudeInstalled = await ClaudeCli.isInstalled();
  if (!claudeInstalled) {
    console.error(
      'Error: Claude Code CLI is not installed or not in PATH.',
    );
    console.error(
      'Install it with: npm install -g @anthropic-ai/claude-code',
    );
    process.exit(1);
  }

  // Load config
  const config = await loadConfig(cwd);

  // Find available port
  const port = await findAvailablePort(config.port);
  if (port !== config.port) {
    console.log(`Port ${config.port} is in use, using port ${port}`);
  }

  // Create and start server
  const { app, runner } = createServer(config, cwd);

  runner.startTimer();

  const server = serve({
    fetch: app.fetch,
    port,
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log('\nShutting down...');
    runner.stopTimer();
    server.close(() => {
      console.log('Server stopped.');
      process.exit(0);
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  console.log('');
  console.log('Solitary Coding is running!');
  console.log(`Dashboard: http://localhost:${port}`);
  console.log(
    `Timer: checking every ${config.timer.intervalMinutes} minutes`,
  );
  console.log('');
  console.log('Press Ctrl+C to stop');
}
