import { Hono } from 'hono';
import type { ServerContext } from '../server.js';

const app = new Hono<{ Variables: { ctx: ServerContext } }>();

// GET /status
app.get('/status', async (c) => {
  const { runner } = c.get('ctx');
  return c.json(runner.getStatus());
});

// POST /trigger
app.post('/trigger', async (c) => {
  const { runner } = c.get('ctx');
  try {
    await runner.triggerManually();
    return c.json({ ok: true });
  } catch (err) {
    return c.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      400,
    );
  }
});

// POST /pause
app.post('/pause', async (c) => {
  const { runner } = c.get('ctx');
  const paused = runner.togglePause();
  return c.json({ paused });
});

export { app as systemRoutes };
