import type { Config } from './types.js';

export const defaultConfig: Config = {
  port: 4000,
  timer: { intervalMinutes: 10 },
  git: { defaultBranch: 'main' },
  ci: { maxRetries: 5 },
  claude: { timeout: 300_000 },
};

export function defineConfig(config: Partial<Config>): Config {
  return {
    ...defaultConfig,
    ...config,
    timer: { ...defaultConfig.timer, ...config.timer },
    git: { ...defaultConfig.git, ...config.git },
    ci: { ...defaultConfig.ci, ...config.ci },
    claude: { ...defaultConfig.claude, ...config.claude },
  };
}
