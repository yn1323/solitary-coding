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

export async function startCommand(projectDir?: string, portOverride?: number) {
  const cwd = projectDir ? path.resolve(projectDir) : process.cwd();

  if (projectDir) {
    console.log(`Target project: ${cwd}`);
  }

  // Auto-init if .solitary-coding/ doesn't exist
  const scDir = path.join(cwd, '.solitary-coding');
  if (!fs.existsSync(scDir)) {
    console.log('.solitary-coding/ directory not found. Running init...');
    const { initCommand } = await import('./init.js');
    await initCommand(cwd);
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

  // Apply port override if specified
  const requestedPort = portOverride ?? config.port;

  // Find available port
  const port = await findAvailablePort(requestedPort);
  if (port !== requestedPort) {
    console.log(`Port ${requestedPort} is in use, using port ${port}`);
  }

  // Create and start server
  const { app, runner } = createServer(config, cwd);

  runner.startTimer();

  serve({
    fetch: app.fetch,
    port,
  });

  console.log('');
  console.log('Solitary Coding is running!');
  console.log(`  Project:   ${cwd}`);
  console.log(`  Dashboard: http://localhost:${port}`);
  console.log(`  Timer:     checking every ${config.timer.intervalMinutes} minutes`);
  console.log('');
  console.log('Press Ctrl+C to stop');
}
