import { Hono } from 'hono';
import { eq, desc } from 'drizzle-orm';
import { executionLogs } from '@solitary-coding/shared/db/schema';
import type { ServerContext } from '../server.js';

const app = new Hono<{ Variables: { ctx: ServerContext } }>();

// GET /logs/:taskId — lightweight list (excludes input/output)
app.get('/logs/:taskId', async (c) => {
  const { db } = c.get('ctx');
  const taskId = Number(c.req.param('taskId'));
  const logs = await db
    .select({
      id: executionLogs.id,
      taskId: executionLogs.taskId,
      phase: executionLogs.phase,
      exitCode: executionLogs.exitCode,
      durationMs: executionLogs.durationMs,
      createdAt: executionLogs.createdAt,
    })
    .from(executionLogs)
    .where(eq(executionLogs.taskId, taskId))
    .orderBy(desc(executionLogs.createdAt));
  return c.json(logs);
});

// GET /logs/:taskId/:logId — single log with full input/output
app.get('/logs/:taskId/:logId', async (c) => {
  const { db } = c.get('ctx');
  const logId = Number(c.req.param('logId'));
  const [log] = await db
    .select()
    .from(executionLogs)
    .where(eq(executionLogs.id, logId));
  if (!log) return c.json({ error: 'Not found' }, 404);
  return c.json(log);
});

export { app as logRoutes };
