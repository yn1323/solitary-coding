import { describe, it, expect } from 'vitest';
import net from 'node:net';
import { findAvailablePort } from './port';

describe('findAvailablePort', () => {
  it('returns the requested port when available', async () => {
    const port = await findAvailablePort(19876);
    expect(port).toBe(19876);
  });

  it('finds next available port when requested is in use', async () => {
    // Occupy a port
    const server = net.createServer();
    await new Promise<void>((resolve) => {
      server.listen(19877, () => resolve());
    });

    try {
      const port = await findAvailablePort(19877);
      expect(port).toBeGreaterThan(19877);
    } finally {
      server.close();
    }
  });
});
