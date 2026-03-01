import { describe, it, expect } from 'vitest';
import { defineConfig, defaultConfig } from './config';

describe('defineConfig', () => {
  it('returns default config when no overrides provided', () => {
    const config = defineConfig({});
    expect(config).toEqual(defaultConfig);
  });

  it('overrides top-level properties', () => {
    const config = defineConfig({ port: 5000 });
    expect(config.port).toBe(5000);
    expect(config.timer).toEqual(defaultConfig.timer);
  });

  it('deep merges nested properties', () => {
    const config = defineConfig({
      timer: { intervalMinutes: 5 },
      ci: { maxRetries: 3 },
    });
    expect(config.timer.intervalMinutes).toBe(5);
    expect(config.ci.maxRetries).toBe(3);
    expect(config.git.defaultBranch).toBe('main');
  });

  it('preserves ci.steps when provided', () => {
    const steps = [{ name: 'lint', command: 'npm run lint' }];
    const config = defineConfig({ ci: { maxRetries: 2, steps } });
    expect(config.ci.steps).toEqual(steps);
    expect(config.ci.maxRetries).toBe(2);
  });
});

describe('defaultConfig', () => {
  it('has expected default values', () => {
    expect(defaultConfig.port).toBe(4000);
    expect(defaultConfig.timer.intervalMinutes).toBe(10);
    expect(defaultConfig.git.defaultBranch).toBe('main');
    expect(defaultConfig.ci.maxRetries).toBe(5);
    expect(defaultConfig.claude.timeout).toBe(300_000);
  });
});
