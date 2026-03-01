import { describe, it, expect } from 'vitest';
import { ClaudeCli } from './claude';
import { defaultConfig } from '@solitary-coding/shared';

describe('ClaudeCli', () => {
  it('can be instantiated with config', () => {
    const cli = new ClaudeCli(defaultConfig, '/tmp');
    expect(cli).toBeDefined();
  });

  it('isInstalled returns a boolean', async () => {
    const result = await ClaudeCli.isInstalled();
    expect(typeof result).toBe('boolean');
  });
});
